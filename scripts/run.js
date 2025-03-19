#!/usr/bin/env node

/**
 * N8N Runner - A user-friendly way to start n8n
 *
 * Usage:
 *   node scripts/run.js                  # Interactive mode with arrow key selection
 *   node scripts/run.js prod             # Start in production mode
 *   node scripts/run.js test             # Start in test mode (safe for testing integrations)
 *   node scripts/run.js dev              # Start in development mode (hot reloading)
 */

const { execSync, spawn } = require('child_process');
const readline = require('readline');
const { setTimeout } = require('timers/promises');
const http = require('http');
const https = require('https');

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

// Environment configurations
const environments = {
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
      default: 'dev-test',
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

  const childProcess = spawn(cmd, args, {
    env,
    stdio: ['inherit', 'pipe', 'inherit'], // Pipe stdout so we can detect URLs
    shell: true
  });

  // Listen for stdout to detect URLs
  childProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output); // Still show the output

    // Look for n8n ready message specifically
    if (output.includes('n8n ready on') || output.includes('Editor is now accessible via')) {
      const match = output.match(/https?:\/\/localhost:[0-9]+/);
      if (match) {
        n8nServerUrl = match[0];
        // If using prod mode, ensure we use https
        if (envConfig.protocol === 'https' && n8nServerUrl.startsWith('http:')) {
          n8nServerUrl = n8nServerUrl.replace('http:', 'https:');
        }
        console.log(`${colors.green}Detected n8n server URL: ${n8nServerUrl}${colors.reset}`);
      }
    }

    // Find any URLs in the output
    const matches = output.match(urlRegex);
    if (matches) {
      detectedUrls = [...detectedUrls, ...matches];
    }
  });

  childProcess.on('error', (err) => {
    console.error(`${colors.red}Failed to start n8n: ${err.message}${colors.reset}`);
  });

  // Set a timeout to open the browser after giving the server time to start
  setTimeout(5000).then(async () => {
    // Priority order based on environment
    // For dev environments, prioritize port 8080 (UI frontend)
    if (envConfig.command.includes('dev')) {
      const uiUrls = detectedUrls.filter(url => url.includes(':8080'));
      if (uiUrls.length > 0) {
        console.log(`${colors.green}Opening UI URL: ${uiUrls[0]}${colors.reset}`);
        await open(uiUrls[0]);
        return;
      }
    }

    // For other environments, check if we detected the n8n server URL
    if (n8nServerUrl) {
      console.log(`${colors.green}Opening n8n server URL: ${n8nServerUrl}${colors.reset}`);
      await open(n8nServerUrl);
      return;
    }

    // For production, prioritize the port 5678 URLs
    const n8nUrls = detectedUrls.filter(url => url.includes(':5678'));
    if (n8nUrls.length > 0) {
      let urlToOpen = n8nUrls[0];
      // If using prod mode, ensure we use https
      if (envConfig.protocol === 'https' && urlToOpen.startsWith('http:')) {
        urlToOpen = urlToOpen.replace('http:', 'https:');
      }
      console.log(`${colors.green}Opening n8n URL: ${urlToOpen}${colors.reset}`);
      await open(urlToOpen);
      return;
    }

    // If no specific URL matched the environment, try any detected URL
    if (detectedUrls.length > 0) {
      console.log(`${colors.cyan}URLs detected from console output:${colors.reset}`);
      detectedUrls.forEach((url, i) => {
        console.log(`${colors.cyan}  ${i+1}. ${url}${colors.reset}`);
      });

      // Skip Vite dev server (port 5173) as it's not useful for end users
      const filteredUrls = detectedUrls.filter(url => !url.includes(':5173'));
      const urlToOpen = filteredUrls.length > 0 ? filteredUrls[0] : detectedUrls[0];

      console.log(`${colors.green}Opening URL: ${urlToOpen}${colors.reset}`);
      await open(urlToOpen);
    } else {
      // Last resort: Fallback to checking ports
      openBrowser(envConfig);
    }
  });

  return childProcess;
}

// Main function
async function main() {
  showHeader();

  let envKey = process.argv[2]; // Get environment from command line args

  if (!envKey) {
    // No environment specified, show options and ask
    envKey = await askEnvironment();
  }

  // Validate environment
  if (!environments[envKey]) {
    console.log(`${colors.red}Error: Unknown environment "${envKey}"${colors.reset}`);
    envKey = await askEnvironment();
  }

  // Run n8n with the selected environment
  runN8N(envKey);
}

// Start the script
main().catch(err => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  process.exit(1);
});
