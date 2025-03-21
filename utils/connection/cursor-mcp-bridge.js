#!/usr/bin/env node

/**
 * Cursor MCP Bridge for n8n
 *
 * This script provides a bridge between Cursor and n8n using the Machine-to-Machine
 * Communication Protocol (MCP). It allows Cursor to interact with n8n workflows
 * programmatically.
 *
 * Usage:
 * 1. Run this script with Node.js
 * 2. In Cursor, configure the MCP bridge to use this script
 * 3. Use Claude to create and manage n8n workflows
 */

const { spawn } = require('child_process');
const readline = require('readline');
const N8nConnectionManager = require('./n8n-connection');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration from environment or defaults
const config = {
	n8nUrl: process.env.N8N_URL || 'https://localhost:5678',
	apiKey: process.env.N8N_API_KEY,
	allowSelfSigned: process.env.ALLOW_SELF_SIGNED !== 'false',
	debug: process.env.DEBUG === 'true',
};

// Create a connection manager
const n8n = new N8nConnectionManager({
	url: config.n8nUrl,
	apiKey: config.apiKey,
	allowSelfSigned: config.allowSelfSigned,
});

// Debug logging
function debugLog(...args) {
	if (config.debug) {
		console.error('[DEBUG]', ...args);
	}
}

// Setup readline interface for stdin/stdout
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
});

/**
 * Send a JSON-RPC response to Cursor
 *
 * @param {Object} response JSON-RPC response
 */
function sendResponse(response) {
	const responseJson = JSON.stringify(response);
	console.log(responseJson);
	debugLog('Response:', responseJson);
}

/**
 * Handle a JSON-RPC request from Cursor
 *
 * @param {Object} request JSON-RPC request
 */
async function handleRequest(request) {
	try {
		debugLog('Request:', JSON.stringify(request));

		// Basic validation
		if (!request || typeof request !== 'object') {
			return sendResponse({
				jsonrpc: '2.0',
				id: null,
				error: { code: -32700, message: 'Parse error: Invalid JSON' },
			});
		}

		// Handle request
		const { method, params } = request;

		// Special methods for the bridge
		if (method === 'ping') {
			return sendResponse({
				jsonrpc: '2.0',
				id: request.id,
				result: { pong: Date.now() },
			});
		}

		if (method === 'test-connection') {
			try {
				const connected = await n8n.testConnection();
				return sendResponse({
					jsonrpc: '2.0',
					id: request.id,
					result: { connected, url: config.n8nUrl },
				});
			} catch (error) {
				return sendResponse({
					jsonrpc: '2.0',
					id: request.id,
					result: { connected: false, error: error.message },
				});
			}
		}

		if (method === 'set-config') {
			if (!params || typeof params !== 'object') {
				return sendResponse({
					jsonrpc: '2.0',
					id: request.id,
					error: { code: -32602, message: 'Invalid params' },
				});
			}

			if (params.n8nUrl) {
				config.n8nUrl = params.n8nUrl;
				n8n.url = params.n8nUrl;
			}

			if (params.apiKey) {
				config.apiKey = params.apiKey;
				n8n.apiKey = params.apiKey;
			}

			if (params.allowSelfSigned !== undefined) {
				config.allowSelfSigned = params.allowSelfSigned;
				n8n.allowSelfSigned = params.allowSelfSigned;
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = config.allowSelfSigned ? '0' : '1';
			}

			if (params.debug !== undefined) {
				config.debug = params.debug;
			}

			return sendResponse({
				jsonrpc: '2.0',
				id: request.id,
				result: {
					config: {
						n8nUrl: config.n8nUrl,
						apiKey: config.apiKey ? '***' : undefined,
						allowSelfSigned: config.allowSelfSigned,
						debug: config.debug,
					},
				},
			});
		}

		if (method === 'save-config') {
			try {
				const configPath = params.path || path.join(os.homedir(), '.n8n-cursor-bridge.json');
				const configData = {
					n8nUrl: config.n8nUrl,
					apiKey: config.apiKey,
					allowSelfSigned: config.allowSelfSigned,
					debug: config.debug,
				};

				fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

				return sendResponse({
					jsonrpc: '2.0',
					id: request.id,
					result: { path: configPath },
				});
			} catch (error) {
				return sendResponse({
					jsonrpc: '2.0',
					id: request.id,
					error: { code: -32603, message: `Failed to save config: ${error.message}` },
				});
			}
		}

		if (method === 'load-config') {
			try {
				const configPath = params?.path || path.join(os.homedir(), '.n8n-cursor-bridge.json');

				if (!fs.existsSync(configPath)) {
					return sendResponse({
						jsonrpc: '2.0',
						id: request.id,
						error: { code: -32602, message: `Config file not found: ${configPath}` },
					});
				}

				const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

				if (configData.n8nUrl) {
					config.n8nUrl = configData.n8nUrl;
					n8n.url = configData.n8nUrl;
				}

				if (configData.apiKey) {
					config.apiKey = configData.apiKey;
					n8n.apiKey = configData.apiKey;
				}

				if (configData.allowSelfSigned !== undefined) {
					config.allowSelfSigned = configData.allowSelfSigned;
					n8n.allowSelfSigned = configData.allowSelfSigned;
					process.env.NODE_TLS_REJECT_UNAUTHORIZED = config.allowSelfSigned ? '0' : '1';
				}

				if (configData.debug !== undefined) {
					config.debug = configData.debug;
				}

				return sendResponse({
					jsonrpc: '2.0',
					id: request.id,
					result: {
						config: {
							n8nUrl: config.n8nUrl,
							apiKey: config.apiKey ? '***' : undefined,
							allowSelfSigned: config.allowSelfSigned,
							debug: config.debug,
						},
					},
				});
			} catch (error) {
				return sendResponse({
					jsonrpc: '2.0',
					id: request.id,
					error: { code: -32603, message: `Failed to load config: ${error.message}` },
				});
			}
		}

		// Handle standard n8n methods via the connection manager
		const response = await n8n.handleJsonRpcRequest(request);
		return sendResponse(response);
	} catch (error) {
		debugLog('Error handling request:', error);
		return sendResponse({
			jsonrpc: '2.0',
			id: request?.id || null,
			error: { code: -32603, message: `Internal error: ${error.message}` },
		});
	}
}

// Process each line from stdin as a JSON-RPC request
rl.on('line', async (line) => {
	try {
		const request = JSON.parse(line);
		await handleRequest(request);
	} catch (error) {
		debugLog('Error parsing request:', error);
		sendResponse({
			jsonrpc: '2.0',
			id: null,
			error: { code: -32700, message: `Parse error: ${error.message}` },
		});
	}
});

// Handle events from the connection manager
n8n.on('mcpOutput', (output) => {
	debugLog('MCP output:', output);
});

n8n.on('mcpError', (error) => {
	debugLog('MCP error:', error);
});

n8n.on('mcpExit', (info) => {
	debugLog('MCP exit:', info);
});

// Print startup message to stderr (so it doesn't interfere with JSON-RPC communication)
console.error(`Cursor n8n MCP Bridge started`);
console.error(`URL: ${config.n8nUrl}`);
console.error(`API Key: ${config.apiKey ? '***' : 'Not configured'}`);
console.error(`Allow Self-Signed: ${config.allowSelfSigned}`);
console.error(`Debug: ${config.debug}`);
console.error(`Ready for requests on stdin...`);

// Check the connection and log the result
n8n
	.testConnection()
	.then((connected) => {
		console.error(`Connection test: ${connected ? 'Successful' : 'Failed'}`);
	})
	.catch((error) => {
		console.error(`Connection test error: ${error.message}`);
	});
