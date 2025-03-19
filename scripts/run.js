#!/usr/bin/env node

/**
 * N8N Runner - A user-friendly way to start n8n
 *
 * Usage:
 *   node scripts/run.js                  # Interactive mode with arrow key selection
 *   node scripts/run.js prod             # Start in production mode
 *   node scripts/run.js test             # Start in test mode (safe for testing integrations)
 *   node scripts/run.js dev              # Start in development mode (hot reloading)
 *   node scripts/run.js safari           # Start in Safari-compatible HTTPS mode
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

// Environment configurations
const environments = {
  "safari": {
    name: 'Safari HTTPS',
    description: 'HTTPS mode with secure cookies for Safari',
    env: {
      NODE_ENV: 'development',
      N8N_ENVIRONMENT: 'test',
      N8N_PROTOCOL: 'https',
      N8N_SECURE_COOKIE: 'true',
      N8N_PORT: '5678',
      N8N_HOST: 'localhost',
      N8N_EDITOR_BASE_URL: 'https://localhost:5678/',
      N8N_BROWSER_OPEN_URL: 'true',
      N8N_SSL_KEY: sslKey,
      N8N_SSL_CERT: sslCert,
      N8N_RUNNERS_ENABLED: 'true'
    },
    command: 'pnpm dev',
    port: 5678,
    protocol: 'https'
  },
  "dev-test": {
    name: 'Dev + Test',
    description: 'Hot reloading with test data',
    env: {
      NODE_ENV: 'development',
      N8N_BROWSER_OPEN_URL: 'true',
      N8N_ENVIRONMENT: 'test',
      N8N_RUNNERS_ENABLED: 'true'
    },
    command: 'pnpm dev',
    port: 5678,
    protocol: 'http'
  },
  dev: {
    name: 'Development',
    description: 'Hot reloading with real data',
    env: {
      NODE_ENV: 'development',
      N8N_BROWSER_OPEN_URL: 'true',
      N8N_RUNNERS_ENABLED: 'true'
    },
    command: 'pnpm dev',
    port: 5678,
    protocol: 'http'
  },
  test: {
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
    protocol: 'http'
  },
  prod: {
    name: 'Production',
    description: 'Stable server with real data',
    env: {
      NODE_ENV: 'production',
      N8N_BROWSER_OPEN_URL: 'true',
      N8N_RUNNERS_ENABLED: 'true'
    },
    command: 'pnpm start',
    port: 5678,
    protocol: 'http'
  }
};

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
  const choices = Object.entries(environments).map(([key, env]) => ({
    name: `${colors.green}${key}${colors.reset} - ${env.name} ${colors.gray}(${env.description})${colors.reset}`,
    value: key,
    short: key
  }));

  const { envChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'envChoice',
      message: 'Select environment:',
      default: 'safari',
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

// Open browser to n8n URL
async function openBrowser(environment) {
  // Try the configured port/protocol first
  const primaryUrl = await waitForServer(environment.protocol, environment.port);

  if (primaryUrl) {
    console.log(`${colors.green}Opening ${primaryUrl} in your browser...${colors.reset}`);
    await open(primaryUrl);
    return true;
  }

  // If that fails, try alternative configurations
  console.log(`${colors.yellow}Trying alternative configurations...${colors.reset}`);

  // Always try HTTPS first for port 5678 (common n8n port)
  if (environment.port === 5678 && environment.protocol !== 'https') {
    const httpsUrl = await waitForServer('https', 5678, 5);
    if (httpsUrl) {
      console.log(`${colors.green}Opening ${httpsUrl} in your browser...${colors.reset}`);
      await open(httpsUrl);
      return true;
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
      await open(url);
      return true;
    }
  }

  console.log(`${colors.red}Couldn't find a running n8n server. Please check the console for errors.${colors.reset}`);
  return false;
}

// Run n8n with the specified environment
function runN8N(envKey) {
  const envConfig = environments[envKey];

  if (!envConfig) {
    console.log(`${colors.red}Error: Unknown environment "${envKey}"${colors.reset}`);
    console.log(`${colors.yellow}Available options: ${Object.keys(environments).join(', ')}${colors.reset}`);
    process.exit(1);
  }

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
  if (envConfig.protocol === 'https') {
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

  // Based on environment, run either regular way or directly (Safari mode)
  let childProcess;

  if (envKey === 'safari' && fs.existsSync(path.join(projectRoot, 'packages/cli/bin/n8n'))) {
    console.log(`${colors.yellow}Using direct n8n executable for Safari mode${colors.reset}`);
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
    // If we found an explicit n8n URL, use that
    if (n8nServerUrl) {
      console.log(`${colors.green}Opening n8n URL: ${n8nServerUrl}${colors.reset}`);
      await open(n8nServerUrl);
      return;
    }

    // If we found any URLs, open the first one
    if (detectedUrls.length > 0) {
      console.log(`${colors.green}Opening UI URL: ${detectedUrls[0]}${colors.reset}`);
      await open(detectedUrls[0]);
      return;
    }

    // Otherwise, try to detect the server automatically
    await openBrowser(envConfig);
  }, 5000);
}

async function main() {
  // Show the header
  showHeader();

  // Check command line argument
  let envKey = process.argv[2];

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
