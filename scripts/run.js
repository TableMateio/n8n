#!/usr/bin/env node

/**
 * N8N Runner - A user-friendly way to start n8n
 *
 * Usage:
 *   node scripts/run.js                  # Interactive mode with arrow key selection
 *   node scripts/run.js prod             # Start in production mode
 *   node scripts/run.js test             # Start in test mode (safe for testing integrations)
 *   node scripts/run.js dev              # Start in development mode (hot reloading)
 *   node scripts/run.js dev-test         # Start in development mode with test data
 *   node scripts/run.js --http           # Use HTTP instead of HTTPS (not recommended)
 *   node scripts/run.js --help           # Show this help message
 */

const { execSync, spawn } = require('child_process');
const readline = require('readline');
const { setTimeout } = require('timers/promises');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Check if required packages are installed, if not, install them
try {
  require.resolve('inquirer');
  require.resolve('open');
} catch (e) {
  console.log('Installing required packages...');
  execSync('npm install --no-save inquirer@^8.0.0 open@^8.4.0', { stdio: 'inherit' });
  console.log('Packages installed successfully!\n');
}

const inquirer = require('inquirer');
const open = require('open');

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
const projectRoot = path.resolve(__dirname, '..');

// Certificate paths
const sslKey = path.join(projectRoot, 'localhost.key');
const sslCert = path.join(projectRoot, 'localhost.crt');

// Check command line args for --http flag
const useHttp = process.argv.includes('--http');
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');

// Environment configurations - all with HTTPS by default
const environments = {
  "dev-test": {
    name: 'Development + Test',
    description: 'Hot reloading with test data',
    env: {
      NODE_ENV: 'development',
      N8N_BROWSER_OPEN_URL: 'true',
      N8N_ENVIRONMENT: 'test',
      N8N_RUNNERS_ENABLED: 'true'
    },
    command: 'pnpm dev',
    port: 5678,
    protocol: useHttp ? 'http' : 'https'
  },
  "dev": {
    name: 'Development',
    description: 'Hot reloading with real data',
    env: {
      NODE_ENV: 'development',
      N8N_BROWSER_OPEN_URL: 'true',
      N8N_RUNNERS_ENABLED: 'true'
    },
    command: 'pnpm dev',
    port: 5678,
    protocol: useHttp ? 'http' : 'https'
  },
  "test": {
    name: 'Test',
    description: 'Stable server with test data',
    env: {
      NODE_ENV: 'production',
      N8N_BROWSER_OPEN_URL: 'true',
      N8N_ENVIRONMENT: 'test',
      N8N_RUNNERS_ENABLED: 'true'
    },
    command: 'pnpm start',
    port: 5678,
    protocol: useHttp ? 'http' : 'https'
  },
  "prod": {
    name: 'Production',
    description: 'Stable server with real data',
    env: {
      NODE_ENV: 'production',
      N8N_BROWSER_OPEN_URL: 'true',
      N8N_RUNNERS_ENABLED: 'true'
    },
    command: 'pnpm start',
    port: 5678,
    protocol: useHttp ? 'http' : 'https'
  },
  // Keep safari and https as aliases that users can still select
  "https": {
    name: 'HTTPS Only',
    description: 'Same as Dev-Test but with HTTPS explicitly enabled',
    aliasFor: 'dev-test',
    forceHttps: true
  },
  "safari": {
    name: 'Safari Compatible',
    description: 'Legacy mode for Safari browser (same as HTTPS)',
    aliasFor: 'https'
  }
};

// Print help information
function printHelp() {
  console.log(`
${colors.bright}N8N Runner - A user-friendly way to start n8n${colors.reset}

${colors.green}USAGE:${colors.reset}
  pnpm n8n [environment] [options]
  node scripts/run.js [environment] [options]

${colors.green}ENVIRONMENTS:${colors.reset}`);

  Object.entries(environments).forEach(([key, env]) => {
    // Skip immediate aliases from the list
    if (env.aliasFor === 'https') return;

    const name = env.aliasFor
      ? `${key} (alias for ${env.aliasFor})`
      : key;

    console.log(`  ${colors.cyan}${name.padEnd(12)}${colors.reset} ${env.description}`);
  });

  console.log(`
${colors.green}OPTIONS:${colors.reset}
  ${colors.cyan}--http${colors.reset}      Use HTTP instead of HTTPS (not recommended)
  ${colors.cyan}--help, -h${colors.reset}  Show this help message

${colors.green}EXAMPLES:${colors.reset}
  ${colors.gray}# Interactive mode (select environment)${colors.reset}
  pnpm n8n

  ${colors.gray}# Start in development mode with test data${colors.reset}
  pnpm n8n dev-test

  ${colors.gray}# Start in HTTP mode${colors.reset}
  pnpm n8n dev-test --http

${colors.green}SHORTCUTS:${colors.reset}
  ${colors.gray}# Development with test data${colors.reset}
  pnpm n8n:dev-test

  ${colors.gray}# Production mode${colors.reset}
  pnpm n8n:prod

  ${colors.gray}# HTTP mode${colors.reset}
  pnpm n8n:http

${colors.green}DOCUMENTATION:${colors.reset}
  See HTTPS.md for more details on HTTPS configuration
`);
}

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

// Show a nice header
function showHeader() {
  console.log(`${colors.blue}╔═════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║    ${colors.cyan}N8N Environment${colors.blue}    ║${colors.reset}`);
  console.log(`${colors.blue}╚═════════════════════════╝${colors.reset}`);
}

// Ask the user which environment to use with arrow keys
async function askEnvironment() {
  const choices = Object.entries(environments).map(([key, env]) => {
    // Skip immediate aliases from the primary list
    if (env.aliasFor === 'https') return null;

    return {
      name: `${colors.green}${key}${colors.reset} - ${env.name} ${colors.gray}(${env.description})${colors.reset}`,
      value: key,
      short: key
    };
  }).filter(Boolean); // Remove null entries

  const { envChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'envChoice',
      message: 'Select environment:',
      default: 'dev-test', // Default to dev-test
      choices: choices,
      pageSize: 10
    }
  ]);

  return envChoice;
}

// Check if server is ready
async function waitForServer(protocol, port, maxAttempts = 15) {
  const client = protocol === 'https' ? https : http;
  const url = `${protocol}://localhost:${port}`;

  console.log(`${colors.gray}Waiting for server at ${url}...${colors.reset}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const req = client.get(url, { rejectUnauthorized: false, timeout: 1000 }, (res) => {
          if (res.statusCode === 200 || res.statusCode === 302) {
            resolve();
          } else {
            reject(new Error(`Status code: ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.setTimeout(1000, () => reject(new Error('Request timeout')));
        req.end();
      });

      console.log(`${colors.green}✓ Server ready at ${url}${colors.reset}`);
      return url;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.log(`${colors.yellow}Server not responding at ${url} after ${maxAttempts} attempts.${colors.reset}`);
        return false;
      }
      // Shorter wait between attempts
      await setTimeout(500);
    }
  }

  return false;
}

// Custom URL opener that tries multiple methods
async function openUrl(url) {
  console.log(`${colors.green}Attempting to open: ${url}${colors.reset}`);

  try {
    // Try the imported 'open' package first
    await open(url, {wait: false});
    return true;
  } catch (err) {
    console.log(`${colors.yellow}Failed to open with 'open' package: ${err.message}${colors.reset}`);

    // Try OS-specific commands as fallbacks
    try {
      if (process.platform === 'darwin') {
        // macOS
        execSync(`open "${url}"`, {stdio: 'ignore'});
      } else if (process.platform === 'win32') {
        // Windows
        execSync(`start "${url}"`, {stdio: 'ignore'});
      } else if (process.platform === 'linux') {
        // Linux
        execSync(`xdg-open "${url}"`, {stdio: 'ignore'});
      } else {
        return false;
      }
      return true;
    } catch (cmdErr) {
      console.log(`${colors.yellow}Failed to open with OS command: ${cmdErr.message}${colors.reset}`);
      console.log(`${colors.green}Please manually open: ${url}${colors.reset}`);
      return false;
    }
  }
}

// Open browser to n8n URL
async function openBrowser(environment) {
  // Try the configured port/protocol first
  const primaryUrl = await waitForServer(environment.protocol, environment.port);

  if (primaryUrl) {
    console.log(`${colors.green}Opening ${primaryUrl} in your browser...${colors.reset}`);
    return await openUrl(primaryUrl);
  }

  // If that fails, try alternative configurations
  console.log(`${colors.yellow}Trying alternative configurations...${colors.reset}`);

  // Always try HTTPS first for port 5678 (common n8n port)
  if (environment.port === 5678 && environment.protocol !== 'https') {
    const httpsUrl = await waitForServer('https', 5678, 5);
    if (httpsUrl) {
      console.log(`${colors.green}Opening ${httpsUrl} in your browser...${colors.reset}`);
      return await openUrl(httpsUrl);
    }
  }

  // Try common fallback combinations
  const fallbacks = [
    { protocol: 'https', port: 5678 },
    { protocol: 'http', port: 8080 },
    { protocol: 'http', port: 5678 }
  ];

  for (const fallback of fallbacks) {
    // Skip the one we already tried
    if (fallback.protocol === environment.protocol && fallback.port === environment.port) {
      continue;
    }

    const url = await waitForServer(fallback.protocol, fallback.port, 5);
    if (url) {
      console.log(`${colors.green}Opening ${url} in your browser...${colors.reset}`);
      return await openUrl(url);
    }
  }

  console.log(`${colors.red}Couldn't find a running n8n server. Please check the console for errors.${colors.reset}`);
  return false;
}

// Apply HTTPS specific settings to an environment configuration
function applyHttpsSettings(env) {
  if (!useHttp && (env.protocol === 'https' || env.forceHttps)) {
    env.env = {
      ...env.env,
      N8N_PROTOCOL: 'https',
      N8N_SECURE_COOKIE: 'true',
      N8N_PORT: '5678',
      N8N_HOST: 'localhost',
      N8N_EDITOR_BASE_URL: 'https://localhost:5678/',
      N8N_SSL_KEY: sslKey,
      N8N_SSL_CERT: sslCert
    };
  }
  return env;
}

// Run n8n with the specified environment
function runN8N(envKey) {
  let envConfig = environments[envKey];

  if (!envConfig) {
    console.log(`${colors.red}Error: Unknown environment "${envKey}"${colors.reset}`);
    console.log(`${colors.yellow}Available options: ${Object.keys(environments).join(', ')}${colors.reset}`);
    console.log(`${colors.yellow}Try 'pnpm n8n --help' for more information${colors.reset}`);
    process.exit(1);
  }

  // Handle aliases
  if (envConfig.aliasFor) {
    const originalKey = envKey;
    envKey = envConfig.aliasFor;
    envConfig = { ...environments[envKey], forceHttps: envConfig.forceHttps };
    console.log(`${colors.yellow}Note: '${originalKey}' is an alias for '${envKey}'${colors.reset}`);
  }

  // Apply HTTPS settings to all environments if not using HTTP
  envConfig = applyHttpsSettings(envConfig);

  console.log(`${colors.green}Starting n8n in ${colors.bright}${envConfig.name}${colors.reset}${colors.green} mode...${colors.reset}\n`);

  // Check if n8n is already running and kill it
  try {
    console.log(`${colors.gray}Stopping any running n8n processes...${colors.reset}`);
    execSync('pkill -f "n8n" || true');
    execSync('pkill -f "pnpm" || true');
  } catch (err) {
    // It's okay if nothing was running
  }

  // If we're using HTTPS, ensure certificates are available
  if (envConfig.protocol === 'https' || envConfig.forceHttps) {
    ensureCertificates();
  }

  // Prepare environment variables
  const env = { ...process.env, ...envConfig.env };

  // Show what we're doing
  console.log(`${colors.gray}Running command: ${envConfig.command}${colors.reset}`);
  console.log(`${colors.gray}Environment: ${JSON.stringify(envConfig.env, null, 2)}${colors.reset}\n`);

  // RegExp to detect URLs from the console output
  const urlRegex = /(https?:\/\/[a-zA-Z0-9.-]+:[0-9]+\/?)/g;
  let detectedUrls = [];
  let n8nServerUrl = null;

  // Run the command
  const cmd = envConfig.command.split(' ')[0];
  const args = envConfig.command.split(' ').slice(1);

  // Based on environment, run either regular way or directly (HTTPS mode)
  let childProcess;

  if ((envConfig.protocol === 'https' || envConfig.forceHttps) && fs.existsSync(path.join(projectRoot, 'packages/cli/bin/n8n'))) {
    console.log(`${colors.yellow}Using direct n8n executable for HTTPS mode${colors.reset}`);
    childProcess = spawn('./packages/cli/bin/n8n', ['start'], {
      env,
      cwd: projectRoot,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
  } else {
    childProcess = spawn(cmd, args, {
      env,
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
  }

  // Listen for data on stdout and stderr
  childProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    // Extract any URLs from the output
    const matches = output.match(urlRegex);
    if (matches) {
      console.log(`${colors.green}URLs detected from console output:${colors.reset}`);
      matches.forEach((url, i) => {
        if (!detectedUrls.includes(url)) {
          detectedUrls.push(url);
          console.log(`  ${i + 1}. ${url}`);
        }
      });
    }

    // Look for the n8n server URL
    if (output.includes('Editor is now accessible via')) {
      const match = output.match(/(https?:\/\/localhost:[0-9]+)/);
      if (match) {
        n8nServerUrl = match[1];
        console.log(`${colors.green}Detected n8n server URL: ${n8nServerUrl}${colors.reset}`);
      }
    }
  });

  childProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  // When the child process exits
  childProcess.on('exit', (code) => {
    if (code !== null) {
      console.log(`${colors.red}n8n process exited with code ${code}${colors.reset}`);
      process.exit(code);
    }
  });

  // Add event handlers for process signals
  process.on('SIGINT', () => {
    console.log(`${colors.yellow}Caught interrupt signal, stopping n8n...${colors.reset}`);
    childProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log(`${colors.yellow}Caught terminate signal, stopping n8n...${colors.reset}`);
    childProcess.kill('SIGTERM');
  });

  // Try to open browser after giving n8n some time to start
  setTimeout(async () => {
    try {
      // If we found an explicit n8n URL, use that
      if (n8nServerUrl) {
        console.log(`${colors.green}Opening n8n URL: ${n8nServerUrl}${colors.reset}`);
        await openUrl(n8nServerUrl);
        return;
      }

      // If we found any URLs, open the first one
      if (detectedUrls.length > 0) {
        console.log(`${colors.green}Opening UI URL: ${detectedUrls[0]}${colors.reset}`);
        await openUrl(detectedUrls[0]);
        return;
      }

      // Otherwise, try to detect the server automatically
      const success = await openBrowser(envConfig);
      if (!success) {
        console.log(`${colors.yellow}Unable to auto-open the browser.${colors.reset}`);
        console.log(`${colors.green}Please manually open: ${envConfig.protocol}://localhost:${envConfig.port}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}Error opening browser: ${error.message}${colors.reset}`);
      console.log(`${colors.green}Please manually open: ${envConfig.protocol}://localhost:${envConfig.port}${colors.reset}`);
    }
  }, 5000);
}

async function main() {
  // Show the header
  showHeader();

  // Handle help flag first
  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  // Check command line argument
  let envKey = process.argv[2];

  // Skip --http flag for environment selection
  if (envKey === '--http') {
    envKey = undefined;
  }

  // If no argument, ask the user
  if (!envKey) {
    envKey = await askEnvironment();
  }

  // Run n8n with the selected environment
  runN8N(envKey);
}

main().catch(err => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  process.exit(1);
});
