#!/usr/bin/env node

/**
 * N8N Safari Fix - Ensures n8n runs with secure cookies disabled
 *
 * This script directly overrides environment variables to ensure
 * Safari compatibility
 */

const { execSync, spawn } = require('child_process');
const { resolve } = require('path');

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

// Clear any running n8n processes
console.log(`${colors.cyan}Stopping any running n8n processes...${colors.reset}`);
try {
  execSync('pkill -f "n8n" || true');
  execSync('pkill -f "pnpm" || true');
} catch (error) {
  // Ignore errors
}

// Environment override to ensure Safari compatibility
const envOverrides = {
  // Must be HTTP for Safari compatibility
  N8N_PROTOCOL: 'http',
  // Must be false for Safari compatibility
  N8N_SECURE_COOKIE: 'false',
  // Rest of the config
  N8N_PORT: '5678',
  N8N_HOST: 'localhost',
  N8N_EDITOR_BASE_URL: 'http://localhost:5678/',
  N8N_BROWSER_OPEN_URL: 'true',
  // Add test environment if needed
  N8N_ENVIRONMENT: 'test',
  NODE_ENV: 'development',
  N8N_RUNNERS_ENABLED: 'true'
};

// Print environment settings
console.log(`${colors.green}Starting n8n with Safari-compatible settings:${colors.reset}`);
Object.entries(envOverrides).forEach(([key, value]) => {
  console.log(`${colors.gray}  ${key}=${value}${colors.reset}`);
});

// Create environment for the child process
const env = { ...process.env, ...envOverrides };

// Run n8n
console.log(`\n${colors.bright}Launching n8n...${colors.reset}`);
console.log(`${colors.yellow}IMPORTANT: Use ${colors.bright}http://localhost:5678${colors.reset}${colors.yellow} in Safari${colors.reset}\n`);

// Launch n8n using pnpm
const childProcess = spawn('pnpm', ['dev'], {
  cwd: resolve(__dirname, '..'),
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
