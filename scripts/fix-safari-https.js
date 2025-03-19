#!/usr/bin/env node

/**
 * N8N Safari HTTPS Fix - Runs n8n with HTTPS configuration for Safari
 *
 * This script enables HTTPS with self-signed certificates for Safari
 * and properly configures secure cookies
 */

const { execSync, spawn } = require('child_process');
const { resolve, join } = require('path');
const fs = require('fs');
const path = require('path');

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

// Project root - directory one level up from this script
const projectRoot = resolve(__dirname, '..');

// Certificate paths
const sslKey = join(projectRoot, 'localhost.key');
const sslCert = join(projectRoot, 'localhost.crt');

// Check if certificates exist, generate if not
function ensureCertificates() {
  console.log(`${colors.cyan}Checking SSL certificates...${colors.reset}`);

  if (!fs.existsSync(sslKey) || !fs.existsSync(sslCert)) {
    console.log(`${colors.yellow}Certificates not found. Generating self-signed certificates...${colors.reset}`);

    try {
      execSync(`
        openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \\
        -keyout ${sslKey} -out ${sslCert} \\
        -subj "/CN=localhost" \\
        -extensions v3_ca -config <(echo -e "[req]\\ndistinguished_name=req\\n[req]\\n[v3_ca]\\nsubjectAltName=DNS:localhost\\nbasicConstraints=critical,CA:true\\n")
      `, { stdio: 'inherit', shell: '/bin/bash' });

      console.log(`${colors.yellow}Adding certificate to keychain. You'll need to enter your password...${colors.reset}`);
      execSync(`sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${sslCert}`,
               { stdio: 'inherit' });
    } catch (error) {
      console.error(`${colors.red}Failed to generate certificates: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}You may need to generate certificates manually and place them in project root.${colors.reset}`);
    }
  } else {
    console.log(`${colors.green}Certificates already exist${colors.reset}`);
  }
}

// Clear any running n8n processes
console.log(`${colors.cyan}Stopping any running n8n processes...${colors.reset}`);
try {
  execSync('pkill -f "n8n" || true');
  execSync('pkill -f "pnpm" || true');
} catch (error) {
  // Ignore errors
}

// Ensure we have certificates
ensureCertificates();

// Environment override for HTTPS with Safari
const envOverrides = {
  // Enable HTTPS
  N8N_PROTOCOL: 'https',
  // Enable secure cookies since we're using HTTPS
  N8N_SECURE_COOKIE: 'true',
  // Rest of the config
  N8N_PORT: '5678',
  N8N_HOST: 'localhost',
  N8N_EDITOR_BASE_URL: 'https://localhost:5678/',
  N8N_BROWSER_OPEN_URL: 'true',
  // SSL certificate paths
  N8N_SSL_KEY: sslKey,
  N8N_SSL_CERT: sslCert,
  // Test environment
  N8N_ENVIRONMENT: 'test',
  NODE_ENV: 'development',
  N8N_RUNNERS_ENABLED: 'true'
};

// Print environment settings
console.log(`${colors.green}Starting n8n with HTTPS for Safari:${colors.reset}`);
Object.entries(envOverrides).forEach(([key, value]) => {
  console.log(`${colors.gray}  ${key}=${value}${colors.reset}`);
});

// Create environment for the child process
const env = { ...process.env, ...envOverrides };

// Run n8n
console.log(`\n${colors.bright}Launching n8n with HTTPS...${colors.reset}`);
console.log(`${colors.yellow}IMPORTANT: Use ${colors.bright}https://localhost:5678${colors.reset}${colors.yellow} in Safari${colors.reset}\n`);

// Launch n8n using pnpm
const childProcess = spawn('pnpm', ['dev'], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  shell: true
});

childProcess.on('error', (err) => {
  console.error(`${colors.red}Failed to start n8n: ${err.message}${colors.reset}`);
  process.exit(1);
});

childProcess.on('exit', (code) => {
  console.log(`${colors.cyan}n8n process exited with code ${code}${colors.reset}`);
  process.exit(code);
});
