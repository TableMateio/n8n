#!/usr/bin/env node

// Set environment variables
process.env.N8N_HOST = 'https://127.0.0.1:5678';
process.env.N8N_API_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU';

// Disable certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Create a simple server to handle MCP protocol
const { spawn } = require('child_process');
const readline = require('readline');

console.log('Starting MCP server for n8n...');

// Path to the n8n-mcp-server executable
const mcpServerPath = '/Users/scottbergman/.nvm/versions/node/v18.19.0/bin/n8n-mcp-server';

// Spawn the MCP server process
try {
	console.log('Spawning n8n-mcp-server...');
	const mcpServer = spawn(mcpServerPath, [], {
		stdio: ['pipe', process.stdout, process.stderr],
		env: {
			...process.env,
			NODE_TLS_REJECT_UNAUTHORIZED: '0',
			N8N_HOST: process.env.N8N_HOST,
			N8N_API_KEY: process.env.N8N_API_KEY,
		},
	});

	// Handle input to the MCP server
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});

	// Forward lines from stdin to the MCP server
	rl.on('line', (line) => {
		console.log('Sending to MCP server:', line);
		mcpServer.stdin.write(line + '\n');
	});

	// Handle MCP server exit
	mcpServer.on('exit', (code, signal) => {
		console.log(`MCP server process exited with code ${code} and signal ${signal}`);
		process.exit(code);
	});

	// Handle errors
	mcpServer.on('error', (err) => {
		console.error('Failed to start MCP server:', err);
		process.exit(1);
	});

	console.log('MCP server started. Type JSON-RPC commands to interact:');
	console.log(
		'Example: {"jsonrpc":"2.0","id":1,"method":"init-n8n","params":{"url":"https://127.0.0.1:5678","apiKey":"YOUR_API_KEY"}}',
	);
	console.log('Press Ctrl+C to exit');
} catch (error) {
	console.error('Error starting MCP server:', error);
	process.exit(1);
}
