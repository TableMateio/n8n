/**
 * N8N Connection Manager
 *
 * A class to manage connections to an n8n instance, including:
 * - Direct HTTP/HTTPS API connections
 * - JSON-RPC communication
 * - MCP protocol support
 */

// Node.js modules
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const { URL } = require('url');
const { EventEmitter } = require('events');

class N8nConnectionManager extends EventEmitter {
	/**
	 * Create a new connection manager
	 *
	 * @param {Object} options Connection options
	 * @param {string} options.url The URL of the n8n instance
	 * @param {string} options.apiKey The API key for authentication
	 * @param {boolean} options.allowSelfSigned Whether to allow self-signed certificates
	 * @param {string} options.mcpServerPath Path to the n8n-mcp-server executable (if using MCP)
	 */
	constructor(options = {}) {
		super();

		this.url = options.url || process.env.N8N_HOST || 'https://localhost:5678';
		this.apiKey = options.apiKey || process.env.N8N_API_KEY;
		this.allowSelfSigned = options.allowSelfSigned !== false;
		this.mcpServerPath = options.mcpServerPath;
		this.mcpServer = null;
		this.clientId = null;

		if (this.allowSelfSigned) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
		}
	}

	/**
	 * Initialize the connection to n8n
	 *
	 * @param {Object} options Optional connection options to override defaults
	 * @returns {Promise<boolean>} Whether the connection was successful
	 */
	async initialize(options = {}) {
		// Update connection options if provided
		if (options.url) {
			this.url = options.url;
		}
		if (options.apiKey) {
			this.apiKey = options.apiKey;
		}
		if (options.allowSelfSigned !== undefined) {
			this.allowSelfSigned = options.allowSelfSigned;
			if (this.allowSelfSigned) {
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
			}
		}

		// Generate a client ID if we don't have one
		this.clientId = `n8n-${Date.now()}`;

		// Test the connection
		try {
			await this.testConnection();
			return true;
		} catch (error) {
			console.error('Failed to initialize n8n connection:', error.message);
			return false;
		}
	}

	/**
	 * Make a direct HTTP/HTTPS request to the n8n API
	 *
	 * @param {string} path The API path
	 * @param {string} method HTTP method (default: GET)
	 * @param {Object} body Request body (optional)
	 * @param {Object} headers Additional headers (optional)
	 * @returns {Promise<Object>} Response data
	 */
	async makeRequest(path, method = 'GET', body = null, headers = {}) {
		return new Promise((resolve, reject) => {
			try {
				// Format the URL properly
				const apiPath = path.startsWith('/') ? path : `/${path}`;
				const apiUrl = `${this.url}/api/v1${apiPath}`;
				const parsedUrl = new URL(apiUrl);

				// Determine protocol
				const protocol = parsedUrl.protocol === 'https:' ? https : http;

				// Setup request options
				const options = {
					hostname: parsedUrl.hostname,
					port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
					path: parsedUrl.pathname + parsedUrl.search,
					method: method,
					headers: {
						'X-N8N-API-KEY': this.apiKey,
						Accept: 'application/json',
						...headers,
					},
					rejectUnauthorized: !this.allowSelfSigned,
				};

				// Add body if provided
				let requestBody = null;
				if (body) {
					requestBody = JSON.stringify(body);
					options.headers['Content-Type'] = 'application/json';
					options.headers['Content-Length'] = Buffer.byteLength(requestBody);
				}

				// Make request
				const req = protocol.request(options, (res) => {
					let data = '';

					res.on('data', (chunk) => {
						data += chunk;
					});

					res.on('end', () => {
						if (res.statusCode >= 200 && res.statusCode < 300) {
							try {
								if (data && data.trim()) {
									resolve(JSON.parse(data));
								} else {
									resolve({});
								}
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

				if (requestBody) {
					req.write(requestBody);
				}

				req.end();
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * List all workflows
	 *
	 * @returns {Promise<Array>} Array of workflow objects
	 */
	async listWorkflows() {
		const response = await this.makeRequest('/workflows');
		return response.data || [];
	}

	/**
	 * Get a workflow by ID
	 *
	 * @param {string} id Workflow ID
	 * @returns {Promise<Object>} Workflow object
	 */
	async getWorkflow(id) {
		if (!id) {
			throw new Error('Workflow ID is required');
		}
		return await this.makeRequest(`/workflows/${id}`);
	}

	/**
	 * Create a new workflow
	 *
	 * @param {string} name Workflow name
	 * @param {Array} nodes Workflow nodes
	 * @param {Object} connections Node connections
	 * @param {Object} options Additional workflow options
	 * @returns {Promise<Object>} Created workflow
	 */
	async createWorkflow(name, nodes = [], connections = {}, options = {}) {
		const workflowData = {
			name,
			nodes,
			connections,
			active: options.active || false,
			settings: options.settings || {
				executionOrder: 'v1',
			},
			...options,
		};

		return await this.makeRequest('/workflows', 'POST', workflowData);
	}

	/**
	 * Update an existing workflow
	 *
	 * @param {string} id Workflow ID
	 * @param {Object} updates Workflow updates
	 * @returns {Promise<Object>} Updated workflow
	 */
	async updateWorkflow(id, updates) {
		if (!id) {
			throw new Error('Workflow ID is required');
		}

		// Get current workflow to merge with updates
		const currentWorkflow = await this.getWorkflow(id);

		// Apply updates
		const updatedWorkflow = {
			...currentWorkflow,
			...updates,
		};

		return await this.makeRequest(`/workflows/${id}`, 'PUT', updatedWorkflow);
	}

	/**
	 * Delete a workflow
	 *
	 * @param {string} id Workflow ID
	 * @returns {Promise<Object>} Response data
	 */
	async deleteWorkflow(id) {
		if (!id) {
			throw new Error('Workflow ID is required');
		}

		await this.makeRequest(`/workflows/${id}`, 'DELETE');
		return { success: true };
	}

	/**
	 * Activate a workflow
	 *
	 * @param {string} id Workflow ID
	 * @returns {Promise<Object>} Activated workflow
	 */
	async activateWorkflow(id) {
		if (!id) {
			throw new Error('Workflow ID is required');
		}

		return await this.makeRequest(`/workflows/${id}/activate`, 'POST');
	}

	/**
	 * Deactivate a workflow
	 *
	 * @param {string} id Workflow ID
	 * @returns {Promise<Object>} Deactivated workflow
	 */
	async deactivateWorkflow(id) {
		if (!id) {
			throw new Error('Workflow ID is required');
		}

		return await this.makeRequest(`/workflows/${id}/deactivate`, 'POST');
	}

	/**
	 * Execute a workflow
	 *
	 * @param {string} id Workflow ID
	 * @param {Object} data Input data
	 * @returns {Promise<Object>} Execution data
	 */
	async executeWorkflow(id, data = {}) {
		if (!id) {
			throw new Error('Workflow ID is required');
		}

		return await this.makeRequest(`/workflows/${id}/execute`, 'POST', data);
	}

	/**
	 * Create a new workflow with standardized naming convention
	 * Format: [COMPONENT]: [Entity] - [Optional component name]
	 *
	 * @param {string} componentType The component type (OPERATION, PROCESS, ROUTER)
	 * @param {string} entity The entity name
	 * @param {string} componentName Optional component name
	 * @param {Array} nodes Workflow nodes
	 * @param {Object} connections Node connections
	 * @param {Object} options Additional workflow options
	 * @returns {Promise<Object>} Created workflow
	 */
	async createNamedWorkflow(
		componentType,
		entity,
		componentName,
		nodes = [],
		connections = {},
		options = {},
	) {
		// Validate component type
		const validTypes = ['OPERATION', 'PROCESS', 'ROUTER'];
		if (!validTypes.includes(componentType.toUpperCase())) {
			throw new Error(
				`Invalid component type: ${componentType}. Must be one of: ${validTypes.join(', ')}`,
			);
		}

		// Format the workflow name according to the convention
		let name = `${componentType.toUpperCase()}: ${entity}`;
		if (componentName) {
			name += ` - ${componentName}`;
		}

		// Create the workflow with the formatted name
		return await this.createWorkflow(name, nodes, connections, options);
	}

	/**
	 * Handle a JSON-RPC request
	 *
	 * @param {Object} request JSON-RPC request object
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async handleJsonRpcRequest(request) {
		const { jsonrpc, id, method, params } = request;

		if (jsonrpc !== '2.0') {
			return this.createJsonRpcError(id, -32600, 'Invalid Request');
		}

		try {
			switch (method) {
				case 'init-n8n':
					return await this.jsonRpcInitN8n(id, params);
				case 'list-workflows':
					return await this.jsonRpcListWorkflows(id, params);
				case 'get-workflow':
					return await this.jsonRpcGetWorkflow(id, params);
				case 'create-workflow':
					return await this.jsonRpcCreateWorkflow(id, params);
				case 'create-named-workflow':
					return await this.jsonRpcCreateNamedWorkflow(id, params);
				case 'update-workflow':
					return await this.jsonRpcUpdateWorkflow(id, params);
				case 'delete-workflow':
					return await this.jsonRpcDeleteWorkflow(id, params);
				case 'activate-workflow':
					return await this.jsonRpcActivateWorkflow(id, params);
				case 'deactivate-workflow':
					return await this.jsonRpcDeactivateWorkflow(id, params);
				case 'execute-workflow':
					return await this.jsonRpcExecuteWorkflow(id, params);
				default:
					return this.createJsonRpcError(id, -32601, `Method ${method} not supported`);
			}
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Internal error: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC initialize n8n connection
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcInitN8n(id, params) {
		try {
			const { url, apiKey } = params;

			if (!url || !apiKey) {
				return this.createJsonRpcError(id, -32602, 'Invalid params: url and apiKey are required');
			}

			this.url = url;
			this.apiKey = apiKey;
			this.clientId = `n8n-${Date.now()}`;

			// Test connection
			await this.listWorkflows();

			return {
				jsonrpc: '2.0',
				id,
				result: { clientId: this.clientId },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to connect to n8n: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC list workflows
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcListWorkflows(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		try {
			const workflows = await this.listWorkflows();

			return {
				jsonrpc: '2.0',
				id,
				result: { workflows },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to list workflows: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC get workflow
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcGetWorkflow(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		if (!params.id) {
			return this.createJsonRpcError(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const workflow = await this.getWorkflow(params.id);

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to get workflow: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC create workflow
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcCreateWorkflow(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		if (!params.name) {
			return this.createJsonRpcError(id, -32602, 'Invalid params: workflow name is required');
		}

		try {
			const workflow = await this.createWorkflow(
				params.name,
				params.nodes || [],
				params.connections || {},
				params.options || {},
			);

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to create workflow: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC create named workflow
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcCreateNamedWorkflow(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		if (!params.componentType || !params.entity) {
			return this.createJsonRpcError(
				id,
				-32602,
				'Invalid params: componentType and entity are required',
			);
		}

		try {
			const workflow = await this.createNamedWorkflow(
				params.componentType,
				params.entity,
				params.componentName,
				params.nodes || [],
				params.connections || {},
				params.options || {},
			);

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow },
			};
		} catch (error) {
			return this.createJsonRpcError(
				id,
				-32603,
				`Failed to create named workflow: ${error.message}`,
			);
		}
	}

	/**
	 * JSON-RPC update workflow
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcUpdateWorkflow(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		if (!params.id) {
			return this.createJsonRpcError(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const workflow = await this.updateWorkflow(params.id, params.updates || {});

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to update workflow: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC delete workflow
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcDeleteWorkflow(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		if (!params.id) {
			return this.createJsonRpcError(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			await this.deleteWorkflow(params.id);

			return {
				jsonrpc: '2.0',
				id,
				result: { success: true },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to delete workflow: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC activate workflow
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcActivateWorkflow(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		if (!params.id) {
			return this.createJsonRpcError(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const workflow = await this.activateWorkflow(params.id);

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to activate workflow: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC deactivate workflow
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcDeactivateWorkflow(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		if (!params.id) {
			return this.createJsonRpcError(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const workflow = await this.deactivateWorkflow(params.id);

			return {
				jsonrpc: '2.0',
				id,
				result: { workflow },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to deactivate workflow: ${error.message}`);
		}
	}

	/**
	 * JSON-RPC execute workflow
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {Object} params Request parameters
	 * @returns {Promise<Object>} JSON-RPC response
	 */
	async jsonRpcExecuteWorkflow(id, params) {
		if (!this.validateClientId(params.clientId)) {
			return this.createJsonRpcError(id, -32002, 'Invalid client ID');
		}

		if (!params.id) {
			return this.createJsonRpcError(id, -32602, 'Invalid params: workflow id is required');
		}

		try {
			const execution = await this.executeWorkflow(params.id, params.data || {});

			return {
				jsonrpc: '2.0',
				id,
				result: { execution },
			};
		} catch (error) {
			return this.createJsonRpcError(id, -32603, `Failed to execute workflow: ${error.message}`);
		}
	}

	/**
	 * Create a JSON-RPC error response
	 *
	 * @private
	 * @param {string|number} id Request ID
	 * @param {number} code Error code
	 * @param {string} message Error message
	 * @returns {Object} JSON-RPC error response
	 */
	createJsonRpcError(id, code, message) {
		return {
			jsonrpc: '2.0',
			id,
			error: { code, message },
		};
	}

	/**
	 * Validate client ID for JSON-RPC requests
	 *
	 * @private
	 * @param {string} clientId Client ID to validate
	 * @returns {boolean} Whether the client ID is valid
	 */
	validateClientId(clientId) {
		if (!this.clientId) {
			return false;
		}

		return clientId === this.clientId;
	}

	/**
	 * Start an MCP server
	 *
	 * @param {Object} options MCP server options
	 * @param {Function} processRequest Custom function to process MCP requests
	 * @returns {Promise<Object>} MCP server process
	 */
	startMcpServer(options = {}, processRequest) {
		return new Promise((resolve, reject) => {
			if (!this.mcpServerPath) {
				reject(new Error('MCP server path not specified'));
				return;
			}

			try {
				// Spawn the MCP server process
				this.mcpServer = spawn(this.mcpServerPath, options.args || [], {
					stdio: ['pipe', 'pipe', 'pipe'],
					env: {
						...process.env,
						NODE_TLS_REJECT_UNAUTHORIZED: this.allowSelfSigned ? '0' : '1',
						N8N_HOST: this.url,
						N8N_API_KEY: this.apiKey,
						...options.env,
					},
				});

				// Handle server output
				this.mcpServer.stdout.on('data', (data) => {
					const output = data.toString().trim();
					this.emit('mcpOutput', output);

					// If custom processing function is provided, use it
					if (typeof processRequest === 'function') {
						try {
							const jsonData = JSON.parse(output);
							const response = processRequest(jsonData);

							if (response) {
								this.mcpServer.stdin.write(JSON.stringify(response) + '\n');
							}
						} catch (error) {
							this.emit('mcpError', error);
						}
					}
				});

				// Handle server errors
				this.mcpServer.stderr.on('data', (data) => {
					this.emit('mcpError', new Error(data.toString().trim()));
				});

				// Handle server exit
				this.mcpServer.on('exit', (code, signal) => {
					this.mcpServer = null;
					this.emit('mcpExit', { code, signal });
				});

				// Handle errors
				this.mcpServer.on('error', (error) => {
					this.mcpServer = null;
					this.emit('mcpError', error);
					reject(error);
				});

				resolve(this.mcpServer);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Stop the MCP server
	 *
	 * @returns {Promise<void>}
	 */
	stopMcpServer() {
		return new Promise((resolve, reject) => {
			if (!this.mcpServer) {
				resolve();
				return;
			}

			try {
				this.mcpServer.kill();
				this.mcpServer = null;
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Send a command to the MCP server
	 *
	 * @param {Object|string} command Command to send
	 * @returns {Promise<void>}
	 */
	sendMcpCommand(command) {
		return new Promise((resolve, reject) => {
			if (!this.mcpServer) {
				reject(new Error('MCP server not running'));
				return;
			}

			try {
				const commandStr =
					typeof command === 'object' ? JSON.stringify(command) : command.toString();

				this.mcpServer.stdin.write(commandStr + '\n');
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Test the connection to n8n
	 *
	 * @returns {Promise<boolean>} Whether the connection is successful
	 */
	async testConnection() {
		try {
			const workflows = await this.listWorkflows();
			return Array.isArray(workflows);
		} catch (error) {
			return false;
		}
	}
}

module.exports = N8nConnectionManager;
