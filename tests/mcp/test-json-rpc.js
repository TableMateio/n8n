#!/usr/bin/env node

// Set environment variables
process.env.N8N_HOST = 'https://127.0.0.1:5678';
process.env.N8N_API_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU';

// Disable certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Using https module
const https = require('https');
const readline = require('readline');

// Simple JSON-RPC handler
class N8nJsonRpcHandler {
	constructor() {
		this.clientId = null;
		this.n8nUrl = null;
		this.apiKey = null;
	}

	// Handle JSON-RPC requests
	async handleRequest(request) {
		console.log('Received request:', request);

		try {
			const { jsonrpc, id, method, params } = request;

			if (jsonrpc !== '2.0') {
				return this.createErrorResponse(id, -32600, 'Invalid Request');
			}

			switch (method) {
				case 'init-n8n':
					return await this.initN8n(id, params);
				case 'list-workflows':
					return await this.listWorkflows(id, params);
				case 'get-workflow':
					return await this.getWorkflow(id, params);
				default:
					return this.createErrorResponse(id, -32601, `Method ${method} not supported`);
			}
		} catch (error) {
			console.error('Error handling request:', error);
			return this.createErrorResponse(
				request.id || null,
				-32603,
				`Internal error: ${error.message}`,
			);
		}
	}

	// Initialize n8n connection
	async initN8n(id, params) {
		try {
			const { url, apiKey } = params;

			if (!url || !apiKey) {
				return this.createErrorResponse(id, -32602, 'Invalid params: url and apiKey are required');
			}

			this.n8nUrl = url;
			this.apiKey = apiKey;
			this.clientId = `n8n-${Date.now()}`;

			// Test connection
			const testResult = await this.makeN8nRequest('/workflows');

			if (!testResult) {
				return this.createErrorResponse(id, -32603, 'Failed to connect to n8n');
			}

			return {
				jsonrpc: '2.0',
				id,
				result: { clientId: this.clientId },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to connect to n8n: ${error.message}`);
		}
	}

	// List workflows
	async listWorkflows(id, params) {
		if (!this.clientId) {
			return this.createErrorResponse(id, -32001, 'Client not initialized');
		}

		if (params.clientId !== this.clientId) {
			return this.createErrorResponse(id, -32002, 'Invalid client ID');
		}

		try {
			const data = await this.makeN8nRequest('/workflows');

			return {
				jsonrpc: '2.0',
				id,
				result: { workflows: data.data },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to list workflows: ${error.message}`);
		}
	}

	// Get workflow
	async getWorkflow(id, params) {
		if (!this.clientId) {
			return this.createErrorResponse(id, -32001, 'Client not initialized');
		}

		if (params.clientId !== this.clientId) {
			return this.createErrorResponse(id, -32002, 'Invalid client ID');
		}

		if (!params.id) {
			return this.createErrorResponse(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const data = await this.makeN8nRequest(`/workflows/${params.id}`);

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow: data },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to get workflow: ${error.message}`);
		}
	}

	// Helper method to make n8n API requests
	makeN8nRequest(path) {
		return new Promise((resolve, reject) => {
			const url = new URL(path, this.n8nUrl);
			const hostname = url.hostname;
			const port = url.port || (url.protocol === 'https:' ? 443 : 80);

			const options = {
				hostname,
				port,
				path: url.pathname + url.search,
				method: 'GET',
				headers: {
					'X-N8N-API-KEY': this.apiKey,
					Accept: 'application/json',
				},
			};

			const req = (url.protocol === 'https:' ? https : require('http')).request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode >= 200 && res.statusCode < 300) {
						try {
							resolve(JSON.parse(data));
						} catch (error) {
							reject(new Error(`Failed to parse response: ${error.message}`));
						}
					} else {
						reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
					}
				});
			});

			req.on('error', (error) => {
				reject(error);
			});

			req.end();
		});
	}

	// Create error response
	createErrorResponse(id, code, message) {
		return {
			jsonrpc: '2.0',
			id,
			error: { code, message },
		};
	}
}

// Create JSON-RPC handler
const handler = new N8nJsonRpcHandler();

// Setup readline interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

console.log('JSON-RPC server started. Type JSON-RPC commands:');
console.log('Example commands:');
console.log(
	`1. Initialize: {"jsonrpc":"2.0","id":1,"method":"init-n8n","params":{"url":"https://127.0.0.1:5678","apiKey":"${process.env.N8N_API_KEY}"}}`,
);
console.log(
	'2. List workflows: {"jsonrpc":"2.0","id":2,"method":"list-workflows","params":{"clientId":"CLIENT_ID"}',
);
console.log(
	'3. Get workflow: {"jsonrpc":"2.0","id":3,"method":"get-workflow","params":{"clientId":"CLIENT_ID","id":"WORKFLOW_ID"}}',
);
console.log('Press Ctrl+C to exit');

// Handle each line as a JSON-RPC request
rl.on('line', async (line) => {
	try {
		const request = JSON.parse(line);
		const response = await handler.handleRequest(request);
		console.log(JSON.stringify(response));
	} catch (error) {
		console.error('Error parsing request:', error.message);
		console.log(
			JSON.stringify({
				jsonrpc: '2.0',
				id: null,
				error: { code: -32700, message: 'Parse error' },
			}),
		);
	}
});
