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
// Use global setTimeout instead of the Promise-based version
// const { setTimeout } = require('timers/promises');
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
	gray: '\x1b[90m',
};

// Project root - directory one level up from this script
const projectRoot = path.resolve(__dirname, '..');

// Certificate paths
const sslKey = path.join(projectRoot, 'secure-certs', 'localhost.key');
const sslCert = path.join(projectRoot, 'secure-certs', 'localhost.crt');

// Check command line args for --http flag
const useHttp = process.argv.includes('--http');
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
// Check for the new -c flag to prevent opening browser
const dontOpenBrowser = process.argv.includes('-c');

// Environment configurations - all with HTTPS by default
const environments = {
	'dev-test': {
		name: 'Development + Test',
		description: 'Hot reloading with test data',
		env: {
			NODE_ENV: 'development',
			N8N_BROWSER_OPEN_URL: 'true',
			N8N_ENVIRONMENT: 'test',
			N8N_RUNNERS_ENABLED: 'true',
		},
		command: 'pnpm dev',
		port: 5678,
		protocol: useHttp ? 'http' : 'https',
	},
	dev: {
		name: 'Development',
		description: 'Hot reloading with real data',
		env: {
			NODE_ENV: 'development',
			N8N_BROWSER_OPEN_URL: 'true',
			N8N_RUNNERS_ENABLED: 'true',
		},
		command: 'pnpm dev',
		port: 5678,
		protocol: useHttp ? 'http' : 'https',
	},
	test: {
		name: 'Test',
		description: 'Stable server with test data',
		env: {
			NODE_ENV: 'production',
			N8N_BROWSER_OPEN_URL: 'true',
			N8N_ENVIRONMENT: 'test',
			N8N_RUNNERS_ENABLED: 'true',
		},
		command: 'pnpm start',
		port: 5678,
		protocol: useHttp ? 'http' : 'https',
	},
	prod: {
		name: 'Production',
		description: 'Stable server with real data',
		env: {
			NODE_ENV: 'production',
			N8N_BROWSER_OPEN_URL: 'true',
			N8N_RUNNERS_ENABLED: 'true',
		},
		command: 'pnpm start',
		port: 5678,
		protocol: useHttp ? 'http' : 'https',
	},
	// Keep safari and https as aliases that users can still select
	https: {
		name: 'HTTPS Only',
		description: 'Same as Dev-Test but with HTTPS explicitly enabled',
		aliasFor: 'dev-test',
		forceHttps: true,
	},
	safari: {
		name: 'Safari Compatible',
		description: 'Legacy mode for Safari browser (same as HTTPS)',
		aliasFor: 'https',
	},
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

		const name = env.aliasFor ? `${key} (alias for ${env.aliasFor})` : key;

		console.log(`  ${colors.cyan}${name.padEnd(12)}${colors.reset} ${env.description}`);
	});

	console.log(`
${colors.green}OPTIONS:${colors.reset}
  ${colors.cyan}--http${colors.reset}      Use HTTP instead of HTTPS (not recommended)
  ${colors.cyan}--help, -h${colors.reset}  Show this help message
  ${colors.cyan}-c${colors.reset}          Prevent the browser from opening automatically

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
		console.log(
			`${colors.yellow}Certificates not found. Generating self-signed certificates...${colors.reset}`,
		);

		try {
			execSync(
				`
        openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \\
        -keyout ${sslKey} -out ${sslCert} \\
        -subj "/CN=localhost" \\
        -extensions v3_ca -config <(echo -e "[req]\\ndistinguished_name=req\\n[req]\\n[v3_ca]\\nsubjectAltName=DNS:localhost\\nbasicConstraints=critical,CA:true\\n")
      `,
				{ stdio: 'inherit', shell: '/bin/bash' },
			);

			console.log(
				`${colors.yellow}Adding certificate to keychain. You'll need to enter your password...${colors.reset}`,
			);
			execSync(
				`sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${sslCert}`,
				{ stdio: 'inherit' },
			);
		} catch (error) {
			console.error(
				`${colors.red}Failed to generate certificates: ${error.message}${colors.reset}`,
			);
			console.log(
				`${colors.yellow}You may need to generate certificates manually and place them in project root.${colors.reset}`,
			);
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
	const choices = Object.entries(environments)
		.map(([key, env]) => {
			// Skip immediate aliases from the primary list
			if (env.aliasFor === 'https') return null;

			return {
				name: `${colors.green}${key}${colors.reset} - ${env.name} ${colors.gray}(${env.description})${colors.reset}`,
				value: key,
				short: key,
			};
		})
		.filter(Boolean); // Remove null entries

	const { envChoice } = await inquirer.prompt([
		{
			type: 'list',
			name: 'envChoice',
			message: 'Select environment:',
			default: 'dev-test', // Default to dev-test
			choices: choices,
			pageSize: 10,
		},
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
				console.log(
					`${colors.yellow}Server not responding at ${url} after ${maxAttempts} attempts.${colors.reset}`,
				);
				return false;
			}
			// Shorter wait between attempts
			setTimeout(500);
		}
	}

	return false;
}

// Custom URL opener that tries multiple methods
async function openUrl(url) {
	console.log(`${colors.green}Attempting to open: ${url}${colors.reset}`);

	// For macOS, we'll try more approaches
	if (process.platform === 'darwin') {
		try {
			// Try macOS 'open' command first, specifically with Safari
			console.log(`${colors.gray}Trying to open with Safari specifically...${colors.reset}`);
			execSync(`open -a Safari "${url}"`, { stdio: 'inherit' });
			console.log(`${colors.green}Successfully opened URL with Safari${colors.reset}`);
			return true;
		} catch (err) {
			console.log(
				`${colors.yellow}Failed to open with Safari directly: ${err.message}${colors.reset}`,
			);

			try {
				// Try default browser
				console.log(`${colors.gray}Trying with default macOS browser...${colors.reset}`);
				execSync(`open "${url}"`, { stdio: 'inherit' });
				console.log(`${colors.green}Successfully opened URL with default browser${colors.reset}`);
				return true;
			} catch (defaultErr) {
				console.log(
					`${colors.yellow}Failed with default browser: ${defaultErr.message}${colors.reset}`,
				);
			}
		}
	}

	// Try the imported 'open' package as fallback
	try {
		console.log(`${colors.gray}Trying with npm 'open' package...${colors.reset}`);
		await open(url, { wait: false });
		console.log(`${colors.green}Successfully opened URL with 'open' package${colors.reset}`);
		return true;
	} catch (err) {
		console.log(
			`${colors.yellow}Failed to open with 'open' package: ${err.message}${colors.reset}`,
		);

		// Try OS-specific commands as fallbacks
		try {
			if (process.platform === 'win32') {
				// Windows
				console.log(`${colors.gray}Trying Windows command...${colors.reset}`);
				execSync(`start "${url}"`, { stdio: 'inherit' });
				return true;
			} else if (process.platform === 'linux') {
				// Linux
				console.log(`${colors.gray}Trying Linux command...${colors.reset}`);
				execSync(`xdg-open "${url}"`, { stdio: 'inherit' });
				return true;
			}
			return false;
		} catch (cmdErr) {
			console.log(`${colors.red}All browser opening methods failed${colors.reset}`);
			console.log(`${colors.green}Please manually open: ${url}${colors.reset}`);
			console.log(`${colors.gray}Copy and paste this URL into Safari:${colors.reset}`);
			console.log(`${colors.bright}${url}${colors.reset}`);
			return false;
		}
	}
}

// Open browser to n8n URL
async function openBrowser(environment) {
	try {
		// Wait a bit longer before trying to open the browser to ensure server is ready
		console.log(`${colors.gray}Waiting for server to be fully ready...${colors.reset}`);

		let url;
		if (typeof environment === 'string') {
			// If directly passed a URL string
			url = environment;
		} else if (environment && environment.protocol && environment.port) {
			// If passed an environment config object
			url = `${environment.protocol}://localhost:${environment.port}`;
		} else {
			// Default fallback
			url = 'https://localhost:5678';
		}

		console.log(`${colors.cyan}Attempting to open browser with URL: ${url}${colors.reset}`);
		const opened = await openUrl(url);
		if (!opened) {
			console.log(`${colors.red}Failed to open the browser automatically.${colors.reset}`);
			console.log(`${colors.yellow}Please open this URL manually: ${url}${colors.reset}`);
		}
		return opened;
	} catch (error) {
		console.log(`${colors.red}Error in openBrowser: ${error.message}${colors.reset}`);
		return false;
	}
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
			N8N_SSL_CERT: sslCert,
		};
	}
	return env;
}

// Run n8n with the specified environment
function runN8N(envKey) {
	console.log(
		`${colors.bright}${colors.red}💥 RUNNING UPDATED SCRIPT - VERSION 1.1 💥${colors.reset}`,
	);

	let envConfig = environments[envKey];

	if (!envConfig) {
		console.log(`${colors.red}Error: Unknown environment "${envKey}"${colors.reset}`);
		console.log(
			`${colors.yellow}Available options: ${Object.keys(environments).join(', ')}${colors.reset}`,
		);
		console.log(`${colors.yellow}Try 'pnpm n8n --help' for more information${colors.reset}`);
		process.exit(1);
	}

	// Handle aliases
	if (envConfig.aliasFor) {
		const originalKey = envKey;
		envKey = envConfig.aliasFor;
		envConfig = { ...environments[envKey], forceHttps: envConfig.forceHttps };
		console.log(
			`${colors.yellow}Note: '${originalKey}' is an alias for '${envKey}'${colors.reset}`,
		);
	}

	// Apply HTTPS settings to all environments if not using HTTP
	envConfig = applyHttpsSettings(envConfig);

	console.log(
		`${colors.green}Starting n8n in ${colors.bright}${envConfig.name}${colors.reset}${colors.green} mode...${colors.reset}\n`,
	);

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
	console.log(
		`${colors.gray}Environment: ${JSON.stringify(envConfig.env, null, 2)}${colors.reset}\n`,
	);

	// RegExp to detect URLs from the console output
	const urlRegex = /(https?:\/\/[a-zA-Z0-9.-]+:[0-9]+\/?)/g;
	let detectedUrls = [];
	let n8nServerUrl = null;

	// Run the command
	const cmd = envConfig.command.split(' ')[0];
	const args = envConfig.command.split(' ').slice(1);

	// Based on environment, run either regular way or directly (HTTPS mode)
	let childProcess;

	if (
		(envConfig.protocol === 'https' || envConfig.forceHttps) &&
		fs.existsSync(path.join(projectRoot, 'packages/cli/bin/n8n'))
	) {
		console.log(`${colors.yellow}Using direct n8n executable for HTTPS mode${colors.reset}`);
		childProcess = spawn('./packages/cli/bin/n8n', ['start'], {
			env,
			cwd: projectRoot,
			stdio: ['inherit', 'pipe', 'pipe'],
			shell: true,
		});
	} else {
		childProcess = spawn(cmd, args, {
			env,
			cwd: process.cwd(),
			stdio: ['inherit', 'pipe', 'pipe'],
			shell: true,
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

				// Create a temporary HTML file with auth cookie setting script
				const authCookieScript = path.join(projectRoot, 'temp_auth_cookie.html');

				// Basic HTML file that sets the auth cookie and redirects to n8n
				fs.writeFileSync(
					authCookieScript,
					`<!DOCTYPE html>
          <html>
          <head>
            <title>Setting n8n Auth Cookie...</title>
            <script>
              // This sets the auth cookie -
              // Note: This is only for development, not a real auth token
              document.cookie = "n8n-auth=dev-auto-login; path=/; domain=localhost; max-age=86400";

              // Redirect to n8n after setting cookie
              window.location.href = "${n8nServerUrl}";
            </script>
          </head>
          <body>
            <h3>Setting auth cookie and redirecting to n8n...</h3>
          </body>
          </html>`,
					{ encoding: 'utf8' },
				);

				// Open this HTML file in Safari instead of the direct URL, only if -c flag is NOT set
				if (!dontOpenBrowser) {
					const fileUrl = `file://${authCookieScript}`;
					console.log(`${colors.yellow}Opening auth helper page first: ${fileUrl}${colors.reset}`);
					try {
						execSync(`open -a Safari "${fileUrl}"`, { stdio: 'inherit' });
					} catch (openErr) {
						console.log(
							`${colors.red}Error opening auth helper page: ${openErr.message}${colors.reset}`,
						);
					}
				} else {
					console.log(
						`${colors.yellow}Skipping automatic browser open due to -c flag.${colors.reset}`,
					);
				}

				// Clean up the temp file after a delay
				setTimeout(() => {
					try {
						fs.unlinkSync(authCookieScript);
						console.log(`${colors.gray}Cleaned up temporary auth helper file${colors.reset}`);
					} catch (e) {
						// Ignore cleanup errors
					}
				}, 10000); // Clean up after 10 seconds
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

	// Try to open browser after giving n8n some time to start, unless -c flag is set
	if (!dontOpenBrowser) {
		setTimeout(() => {
			try {
				// Get the URL directly from detected URLs or construct it
				const url =
					n8nServerUrl ||
					(detectedUrls.length > 0
						? detectedUrls[0]
						: `${envConfig.protocol}://localhost:${envConfig.port}`);

				console.log(
					`\n${colors.bright}${colors.green}==================================${colors.reset}`,
				);
				console.log(`${colors.bright}${colors.green}🌐 BROWSER OPENING SECTION 🌐${colors.reset}`);
				console.log(
					`${colors.bright}${colors.green}==================================${colors.reset}`,
				);

				console.log(`\n${colors.cyan}URL detected: ${url}${colors.reset}`);

				// Use the dedicated Safari opener script
				const openerScript = path.join(projectRoot, 'scripts', 'open_safari.sh');

				// Ensure the script exists
				if (!fs.existsSync(openerScript)) {
					console.log(
						`${colors.red}Safari opener script not found at: ${openerScript}${colors.reset}`,
					);
					console.log(`${colors.yellow}Please open this URL manually:${colors.reset}`);
					console.log(`${colors.bright}${url}${colors.reset}\n`);
					return;
				}

				console.log(`${colors.yellow}Executing dedicated Safari opener script...${colors.reset}`);

				try {
					// Run with the detected URL as argument
					execSync(`${openerScript} "${url}"`, { stdio: 'inherit' });
					console.log(`${colors.green}✅ Browser opening script completed${colors.reset}`);
				} catch (err) {
					console.log(`${colors.red}Error running Safari opener: ${err.message}${colors.reset}`);

					// Last resort - try the direct command that works in terminal
					console.log(
						`${colors.yellow}Trying direct terminal command as last resort...${colors.reset}`,
					);
					try {
						execSync(`open -a Safari "${url}"`, { stdio: 'inherit' });
						console.log(`${colors.green}✅ Direct terminal command succeeded${colors.reset}`);
					} catch (directErr) {
						console.log(
							`${colors.red}Direct command also failed: ${directErr.message}${colors.reset}`,
						);
					}
				}

				// Always show manual URL
				console.log(
					`\n${colors.bright}${colors.cyan}===============================${colors.reset}`,
				);
				console.log(`${colors.bright}${colors.cyan}MANUAL URL OPENING INSTRUCTIONS${colors.reset}`);
				console.log(`${colors.bright}${colors.cyan}===============================${colors.reset}`);
				console.log(
					`\n${colors.yellow}If the browser didn't open automatically, copy and paste this URL:${colors.reset}`,
				);
				console.log(`${colors.bright}${url}${colors.reset}\n`);

				// Show URL info
				console.log(`Editor is now accessible via:\n${colors.bright}${url}${colors.reset}`);
			} catch (error) {
				console.log(`${colors.red}Error in browser opener: ${error.message}${colors.reset}`);
				console.log(`${colors.yellow}Please open this URL manually:${colors.reset}`);
				console.log(
					`${colors.bright}${envConfig.protocol}://localhost:${envConfig.port}${colors.reset}`,
				);
			}
		}, 5000);
	}
}

// Main control flow - this was missing!
(async function main() {
	// Show help if requested
	if (showHelp) {
		printHelp();
		process.exit(0);
	}

	// Get environment from command line args or interactive prompt
	let envKey;
	const envArg = process.argv.find((arg) => !arg.startsWith('-') && !arg.includes('/'));

	if (envArg && environments[envArg]) {
		envKey = envArg;
	} else if (envArg && !environments[envArg]) {
		console.log(`${colors.red}Unknown environment: ${envArg}${colors.reset}`);
		console.log(
			`${colors.yellow}Available environments: ${Object.keys(environments).join(', ')}${colors.reset}`,
		);
		process.exit(1);
	} else {
		// Show header for interactive mode
		showHeader();
		envKey = await askEnvironment();
	}

	// Run n8n with the selected environment
	runN8N(envKey);
})().catch((err) => {
	console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
	process.exit(1);
});
