#!/usr/bin/env node

/**
 * N8N Diagnostic Tool
 *
 * This script checks the status of your n8n server and helps diagnose connection issues.
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

// Print a header
console.log(`${colors.blue}╔═════════════════════════════════╗${colors.reset}`);
console.log(`${colors.blue}║    ${colors.cyan}N8N Diagnostic Tool${colors.blue}       ║${colors.reset}`);
console.log(`${colors.blue}╚═════════════════════════════════╝${colors.reset}`);
console.log();

// Get workspace path
const workspacePath = process.cwd();
console.log(`${colors.cyan}Workspace:${colors.reset} ${workspacePath}`);

// Check for key environment variables
async function checkEnvironment() {
  console.log(`\n${colors.bright}Checking Environment Variables:${colors.reset}`);

  let envFile;
  try {
    envFile = fs.readFileSync(path.join(workspacePath, '.env'), 'utf8');
    console.log(`${colors.green}✓ .env file found${colors.reset}`);
  } catch (err) {
    console.log(`${colors.red}✗ .env file not found${colors.reset}`);
    return;
  }

  const envVars = {
    'N8N_PROTOCOL': null,
    'N8N_SSL_KEY': null,
    'N8N_SSL_CERT': null,
    'N8N_HOST': null,
    'N8N_PORT': null,
    'N8N_SECURE_COOKIE': null,
    'N8N_EDITOR_BASE_URL': null
  };

  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue;

    const [key, value] = line.split('=');
    if (key && value && envVars.hasOwnProperty(key)) {
      envVars[key] = value.trim();
    }
  }

  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      console.log(`${colors.green}✓ ${key}=${value}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}! ${key} not set${colors.reset}`);
    }
  }

  // Check for inconsistencies
  if (envVars['N8N_PROTOCOL'] === 'https' && !envVars['N8N_SSL_KEY']) {
    console.log(`${colors.red}✗ HTTPS protocol specified but N8N_SSL_KEY not set${colors.reset}`);
  }
  if (envVars['N8N_PROTOCOL'] === 'https' && !envVars['N8N_SSL_CERT']) {
    console.log(`${colors.red}✗ HTTPS protocol specified but N8N_SSL_CERT not set${colors.reset}`);
  }
  if (envVars['N8N_EDITOR_BASE_URL'] && !envVars['N8N_EDITOR_BASE_URL'].startsWith(envVars['N8N_PROTOCOL'])) {
    console.log(`${colors.red}✗ Protocol mismatch: N8N_PROTOCOL=${envVars['N8N_PROTOCOL']} but N8N_EDITOR_BASE_URL=${envVars['N8N_EDITOR_BASE_URL']}${colors.reset}`);
  }

  return envVars;
}

// Check if the SSL certificate files exist
async function checkCertificates(envVars) {
  if (!envVars) return;

  console.log(`\n${colors.bright}Checking SSL Certificates:${colors.reset}`);

  if (envVars['N8N_PROTOCOL'] !== 'https') {
    console.log(`${colors.yellow}! Not using HTTPS protocol${colors.reset}`);
    return;
  }

  const keyPath = envVars['N8N_SSL_KEY'];
  const certPath = envVars['N8N_SSL_CERT'];

  if (!keyPath) {
    console.log(`${colors.red}✗ N8N_SSL_KEY not specified${colors.reset}`);
  } else {
    try {
      const keyStats = fs.statSync(keyPath);
      console.log(`${colors.green}✓ SSL key file exists (${keyPath})${colors.reset}`);
      console.log(`${colors.gray}  - Size: ${keyStats.size} bytes${colors.reset}`);
      console.log(`${colors.gray}  - Modified: ${keyStats.mtime}${colors.reset}`);
    } catch (err) {
      console.log(`${colors.red}✗ SSL key file not found at ${keyPath}${colors.reset}`);
    }
  }

  if (!certPath) {
    console.log(`${colors.red}✗ N8N_SSL_CERT not specified${colors.reset}`);
  } else {
    try {
      const certStats = fs.statSync(certPath);
      console.log(`${colors.green}✓ SSL certificate file exists (${certPath})${colors.reset}`);
      console.log(`${colors.gray}  - Size: ${certStats.size} bytes${colors.reset}`);
      console.log(`${colors.gray}  - Modified: ${certStats.mtime}${colors.reset}`);
    } catch (err) {
      console.log(`${colors.red}✗ SSL certificate file not found at ${certPath}${colors.reset}`);
    }
  }
}

// Check if the certificate is installed in the keychain
async function checkKeychainCert(envVars) {
  if (!envVars || !envVars['N8N_SSL_CERT']) return;

  console.log(`\n${colors.bright}Checking Keychain Certificate:${colors.reset}`);

  try {
    // Extract certificate info
    const { stdout: certInfo } = await exec(`openssl x509 -in "${envVars['N8N_SSL_CERT']}" -noout -subject -issuer`);
    console.log(`${colors.green}Certificate info:${colors.reset}`);
    console.log(`${colors.gray}${certInfo}${colors.reset}`);

    // Check if it's in the keychain
    try {
      const { stdout: keychainCheck } = await exec(`security find-certificate -c localhost -a`);
      if (keychainCheck.includes('localhost')) {
        console.log(`${colors.green}✓ Certificate appears to be in the keychain${colors.reset}`);
      } else {
        console.log(`${colors.yellow}! Certificate might not be in the keychain${colors.reset}`);
      }
    } catch (err) {
      console.log(`${colors.red}✗ Certificate not found in keychain${colors.reset}`);
      console.log(`${colors.yellow}! Run this command to add it:${colors.reset}`);
      console.log(`${colors.gray}  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${envVars['N8N_SSL_CERT']}"${colors.reset}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ Could not check certificate: ${err.message}${colors.reset}`);
  }
}

// Check if n8n server is running
async function checkServer(envVars) {
  if (!envVars) return;

  console.log(`\n${colors.bright}Checking Server Status:${colors.reset}`);

  const protocol = envVars['N8N_PROTOCOL'] || 'http';
  const host = envVars['N8N_HOST'] || 'localhost';
  const port = envVars['N8N_PORT'] || '5678';

  const url = `${protocol}://${host}:${port}`;
  console.log(`${colors.cyan}Checking server at ${url}${colors.reset}`);

  try {
    await new Promise((resolve, reject) => {
      const client = protocol === 'https' ? https : http;
      const options = {
        rejectUnauthorized: false, // Allow self-signed certs for testing
        timeout: 3000,
        headers: {
          'User-Agent': 'n8n-diagnose-tool'
        }
      };

      console.log(`${colors.gray}Making request to ${url}...${colors.reset}`);
      const req = client.get(url, options, (res) => {
        console.log(`${colors.green}✓ Server responded with status code: ${res.statusCode}${colors.reset}`);
        console.log(`${colors.gray}  - Headers: ${JSON.stringify(res.headers)}${colors.reset}`);

        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
          if (rawData.length > 500) {
            // Only keep the first 500 characters for analysis
            rawData = rawData.substring(0, 500) + '...';
          }
        });

        res.on('end', () => {
          if (rawData.includes('secure cookie') && rawData.includes('Safari')) {
            console.log(`${colors.red}✗ Server returned the secure cookie error page${colors.reset}`);
          } else if (rawData.includes('<!DOCTYPE html>')) {
            console.log(`${colors.green}✓ Server returned HTML content${colors.reset}`);
          }
          resolve();
        });
      });

      req.on('error', (err) => {
        console.log(`${colors.red}✗ Server check failed: ${err.message}${colors.reset}`);
        // Try localhost by IP instead of by name
        if (host === 'localhost') {
          console.log(`${colors.yellow}! Trying with IP address instead of hostname...${colors.reset}`);
          const ipUrl = url.replace('localhost', '127.0.0.1');
          const ipReq = client.get(ipUrl, options, () => {
            console.log(`${colors.green}✓ Server accessible via IP address: ${ipUrl}${colors.reset}`);
            resolve();
          }).on('error', () => reject(err));
        } else {
          reject(err);
        }
      });

      req.end();
    });
  } catch (err) {
    // Error already logged in the promise
  }

  // Also check the alternative URL (if using HTTPS, also check HTTP and vice versa)
  const altProtocol = protocol === 'https' ? 'http' : 'https';
  const altUrl = `${altProtocol}://${host}:${port}`;
  console.log(`${colors.cyan}Checking alternative URL: ${altUrl}${colors.reset}`);

  try {
    await new Promise((resolve, reject) => {
      const client = altProtocol === 'https' ? https : http;
      const req = client.get(altUrl, {
        rejectUnauthorized: false,
        timeout: 3000
      }, (res) => {
        console.log(`${colors.green}✓ Alternative URL responded with status code: ${res.statusCode}${colors.reset}`);
        resolve();
      });

      req.on('error', (err) => {
        console.log(`${colors.red}✗ Alternative URL check failed: ${err.message}${colors.reset}`);
        reject(err);
      });

      req.end();
    });
  } catch (err) {
    // Error already logged
  }

  // One more check: see if n8n binary reports as running
  try {
    const { stdout } = await exec('pgrep -f "n8n" | wc -l');
    const processCount = parseInt(stdout.trim(), 10);
    if (processCount > 0) {
      console.log(`${colors.green}✓ Found ${processCount} n8n processes running${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ No n8n processes found running${colors.reset}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ Error checking for n8n processes: ${err.message}${colors.reset}`);
  }
}

// Check running processes
async function checkProcesses() {
  console.log(`\n${colors.bright}Checking Running Processes:${colors.reset}`);

  try {
    const { stdout: processes } = await exec(`ps aux | grep -i 'n8n\\|pnpm' | grep -v grep`);

    if (processes.trim()) {
      console.log(`${colors.green}✓ Found running n8n processes:${colors.reset}`);
      const processList = processes.split('\n').filter(p => p.trim());
      processList.forEach(p => {
        console.log(`${colors.gray}  ${p}${colors.reset}`);
      });
    } else {
      console.log(`${colors.yellow}! No n8n processes found running${colors.reset}`);
    }
  } catch (err) {
    console.log(`${colors.yellow}! No n8n processes found running${colors.reset}`);
  }
}

// Provide recommendations
function showRecommendations(envVars) {
  console.log(`\n${colors.bright}Recommendations:${colors.reset}`);

  if (!envVars) {
    console.log(`${colors.yellow}! Fix your .env file first${colors.reset}`);
    return;
  }

  if (envVars['N8N_PROTOCOL'] === 'https') {
    console.log(`${colors.cyan}For HTTPS configuration:${colors.reset}`);
    console.log(`1. Ensure your certificate is properly installed in the system keychain`);
    console.log(`   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${envVars['N8N_SSL_CERT']}"`);
    console.log(`2. Try accessing n8n with Safari at ${colors.bright}https://localhost:${envVars['N8N_PORT']}${colors.reset}`);
    console.log(`3. If you see a certificate warning, click "Show Details" then "Visit this website"`);
    console.log(`4. If still having issues, try with Chrome or Firefox as they handle self-signed certs differently`);

    console.log(`\n${colors.cyan}Alternative option:${colors.reset}`);
    console.log(`1. Disable secure cookies in .env by setting N8N_SECURE_COOKIE=false`);
    console.log(`2. Restart n8n`);
  } else {
    console.log(`${colors.cyan}For HTTP configuration:${colors.reset}`);
    console.log(`1. Try accessing n8n with Chrome or Firefox at ${colors.bright}http://localhost:${envVars['N8N_PORT']}${colors.reset}`);
    console.log(`2. Safari may have stricter cookie policies, so using another browser could help`);
  }

  console.log(`\n${colors.cyan}Additional troubleshooting:${colors.reset}`);
  console.log(`1. Clear browser cache and cookies for localhost`);
  console.log(`2. Try using a private/incognito window`);
  console.log(`3. Check system firewall settings`);
}

// Run all checks
async function runDiagnostics() {
  const envVars = await checkEnvironment();
  await checkCertificates(envVars);
  await checkKeychainCert(envVars);
  await checkProcesses();
  await checkServer(envVars);
  showRecommendations(envVars);
}

runDiagnostics().catch(err => {
  console.error(`${colors.red}Error running diagnostics: ${err.message}${colors.reset}`);
});
