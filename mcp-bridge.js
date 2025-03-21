#!/usr/bin/env node

/**
 * n8n MCP Bridge
 *
 * This script creates a bridge between Cursor's MCP (Mechanism for Controlling Programs)
 * protocol and the n8n API. It allows Claude to manage n8n workflows through the Cursor IDE.
 */

// Disable certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const readline = require('readline');
const https = require('https');
const http = require('http');

// Log startup information
console.error('N8N MCP Bridge starting...');
console.error(`NODE_TLS_REJECT_UNAUTHORIZED=${process.env.NODE_TLS_REJECT_UNAUTHORIZED}`);

class N8nMcpBridge {
	constructor() {
		this.clientId = null;
		this.n8nUrl = null;
		this.apiKey = null;

		// Set up stdin/stdout interface
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: false,
		});

		// Handle incoming JSON-RPC messages
		this.rl.on('line', this.handleLine.bind(this));

		console.error('N8N MCP Bridge started');
	}

	// Process each line as a JSON-RPC request
	async handleLine(line) {
		try {
			console.error(`Received: ${line}`);
			const request = JSON.parse(line);
			const response = await this.handleRequest(request);
			console.log(JSON.stringify(response));
			console.error(`Sent response for request ID: ${request.id}`);
		} catch (error) {
			console.error('Error handling request:', error);
			console.log(
				JSON.stringify({
					jsonrpc: '2.0',
					id: null,
					error: { code: -32700, message: 'Parse error' },
				}),
			);
		}
	}

	// Handle JSON-RPC requests
	async handleRequest(request) {
		try {
			const { jsonrpc, id, method, params } = request;

			if (jsonrpc !== '2.0') {
				return this.createErrorResponse(id, -32600, 'Invalid Request');
			}

			// Handle different methods
			switch (method) {
				case 'init-n8n':
					return await this.initN8n(id, params);
				case 'list-workflows':
					return await this.listWorkflows(id, params);
				case 'get-workflow':
					return await this.getWorkflow(id, params);
				case 'create-workflow':
					return await this.createWorkflow(id, params);
				case 'update-workflow':
					return await this.updateWorkflow(id, params);
				case 'delete-workflow':
					return await this.deleteWorkflow(id, params);
				case 'activate-workflow':
					return await this.activateWorkflow(id, params);
				case 'deactivate-workflow':
					return await this.deactivateWorkflow(id, params);
				default:
					return this.createErrorResponse(id, -32601, `Method ${method} not supported`);
			}
		} catch (error) {
			console.error('Error in request handler:', error);
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

			console.error(
				`Attempting to connect to n8n at ${url} with API key: ${apiKey.substring(0, 10)}...`,
			);

			// Test connection
			try {
				await this.makeN8nRequest('/workflows', 'GET');
				console.error(`Successfully connected to n8n at ${url}`);

				return {
					jsonrpc: '2.0',
					id,
					result: { clientId: this.clientId },
				};
			} catch (error) {
				console.error('Connection test failed:', error);
				return this.createErrorResponse(id, -32603, `Failed to connect to n8n: ${error.message}`);
			}
		} catch (error) {
			console.error('Error in initN8n:', error);
			return this.createErrorResponse(id, -32603, `Error initializing: ${error.message}`);
		}
	}

	// List all workflows
	async listWorkflows(id, params) {
		if (!this.validateClient(id, params)) {
			return this.createErrorResponse(id, -32001, 'Client not initialized or invalid client ID');
		}

		try {
			const data = await this.makeN8nRequest('/workflows', 'GET');

			return {
				jsonrpc: '2.0',
				id,
				result: { workflows: data.data },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to list workflows: ${error.message}`);
		}
	}

	// Get a specific workflow
	async getWorkflow(id, params) {
		if (!this.validateClient(id, params)) {
			return this.createErrorResponse(id, -32001, 'Client not initialized or invalid client ID');
		}

		if (!params.id) {
			return this.createErrorResponse(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const data = await this.makeN8nRequest(`/workflows/${params.id}`, 'GET');

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow: data },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to get workflow: ${error.message}`);
		}
	}

	// Create a new workflow
	async createWorkflow(id, params) {
		if (!this.validateClient(id, params)) {
			return this.createErrorResponse(id, -32001, 'Client not initialized or invalid client ID');
		}

		if (!params.name) {
			return this.createErrorResponse(id, -32602, 'Invalid params: workflow name is required');
		}

		try {
			const workflowData = {
				name: params.name,
				nodes: params.nodes || [],
				connections: params.connections || {},
				settings: {
					executionOrder: 'v1',
				},
			};

			const data = await this.makeN8nRequest('/workflows', 'POST', workflowData);

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow: data },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to create workflow: ${error.message}`);
		}
	}

	// Update an existing workflow
	async updateWorkflow(id, params) {
		if (!this.validateClient(id, params)) {
			return this.createErrorResponse(id, -32001, 'Client not initialized or invalid client ID');
		}

		if (!params.id || !params.workflow) {
			return this.createErrorResponse(
				id,
				-32602,
				'Invalid params: workflow id and workflow data are required',
			);
		}

		try {
			const data = await this.makeN8nRequest(`/workflows/${params.id}`, 'PUT', params.workflow);

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow: data },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to update workflow: ${error.message}`);
		}
	}

	// Delete a workflow
	async deleteWorkflow(id, params) {
		if (!this.validateClient(id, params)) {
			return this.createErrorResponse(id, -32001, 'Client not initialized or invalid client ID');
		}

		if (!params.id) {
			return this.createErrorResponse(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			await this.makeN8nRequest(`/workflows/${params.id}`, 'DELETE');

			return {
				jsonrpc: '2.0',
				id,
				result: { success: true },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to delete workflow: ${error.message}`);
		}
	}

	// Activate a workflow
	async activateWorkflow(id, params) {
		if (!this.validateClient(id, params)) {
			return this.createErrorResponse(id, -32001, 'Client not initialized or invalid client ID');
		}

		if (!params.id) {
			return this.createErrorResponse(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const data = await this.makeN8nRequest(`/workflows/${params.id}/activate`, 'POST');

			return {
				jsonrpc: '2.0',
				id,
				result: { success: true, workflow: data },
			};
		} catch (error) {
			return this.createErrorResponse(id, -32603, `Failed to activate workflow: ${error.message}`);
		}
	}

	// Deactivate a workflow
	async deactivateWorkflow(id, params) {
		if (!this.validateClient(id, params)) {
			return this.createErrorResponse(id, -32001, 'Client not initialized or invalid client ID');
		}

		if (!params.id) {
			return this.createErrorResponse(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const data = await this.makeN8nRequest(`/workflows/${params.id}/deactivate`, 'POST');

			return {
				jsonrpc: '2.0',
				id,
				result: { success: true, workflow: data },
			};
		} catch (error) {
			return this.createErrorResponse(
				id,
				-32603,
				`Failed to deactivate workflow: ${error.message}`,
			);
		}
	}

	// Validate client ID
	validateClient(id, params) {
		if (!this.clientId) {
			return false;
		}

		if (!params || params.clientId !== this.clientId) {
			return false;
		}

		return true;
	}

	// Make HTTP requests to n8n API
	makeN8nRequest(path, method = 'GET', body = null) {
		return new Promise((resolve, reject) => {
			try {
				// Ensure we have a valid URL by constructing it properly
				const baseUrl = this.n8nUrl.endsWith('/') ? this.n8nUrl.slice(0, -1) : this.n8nUrl;
				const apiPath = path.startsWith('/') ? path : `/${path}`;
				const fullUrl = baseUrl + '/api/v1' + apiPath;

				console.error(`Making request to: ${fullUrl}`);

				// Parse the URL for the request options
				const parsedUrl = new URL(fullUrl);

				// Set the request options
				const options = {
					hostname: parsedUrl.hostname,
					port: parsedUrl.port,
					path: parsedUrl.pathname + parsedUrl.search,
					method: method,
					headers: {
						'X-N8N-API-KEY': this.apiKey,
						Accept: 'application/json',
					},
					// These settings are needed for self-signed certificates
					rejectUnauthorized: false,
					requestCert: true,
					agent: false,
				};

				// Add the body if provided
				if (body) {
					const bodyData = JSON.stringify(body);
					options.headers['Content-Type'] = 'application/json';
					options.headers['Content-Length'] = Buffer.byteLength(bodyData);
				}

				console.error(`Request options: ${JSON.stringify(options, null, 2)}`);

				// Choose the right protocol module
				const protocol = parsedUrl.protocol === 'https:' ? https : http;

				// Make the request
				const req = protocol.request(options, (res) => {
					let data = '';

					res.on('data', (chunk) => {
						data += chunk;
					});

					res.on('end', () => {
						console.error(`Response status: ${res.statusCode}`);
						console.error(`Response headers: ${JSON.stringify(res.headers, null, 2)}`);

						if (res.statusCode >= 200 && res.statusCode < 300) {
							try {
								if (data && data.trim()) {
									const parsedData = JSON.parse(data);
									console.error(`Response data received (${data.length} bytes)`);
									resolve(parsedData);
								} else {
									console.error('Empty response received');
									resolve({});
								}
							} catch (error) {
								console.error('Error parsing response:', error);
								reject(new Error(`Failed to parse response: ${error.message}`));
							}
						} else {
							console.error(`HTTP error: ${res.statusCode}, data: ${data}`);
							reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
						}
					});
				});

				req.on('error', (error) => {
					console.error('Request error:', error);
					reject(error);
				});

				if (body) {
					const bodyData = JSON.stringify(body);
					console.error(`Sending body: ${bodyData.substring(0, 100)}...`);
					req.write(bodyData);
				}

				req.end();
			} catch (error) {
				console.error('Error in makeN8nRequest:', error);
				reject(error);
			}
		});
	}

	// Create a JSON-RPC error response
	createErrorResponse(id, code, message) {
		return {
			jsonrpc: '2.0',
			id,
			error: { code, message },
		};
	}
}

// Start the bridge
new N8nMcpBridge();
