/**
 * Workflow Manager for n8n
 *
 * A JavaScript class for managing n8n workflows programmatically.
 */

// Disable certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');
const http = require('http');

class WorkflowManager {
	/**
	 * Create a new WorkflowManager
	 *
	 * @param {string} n8nUrl The URL of the n8n instance (e.g., 'https://localhost:5678')
	 * @param {string} apiKey The API key for the n8n instance
	 */
	constructor(n8nUrl, apiKey) {
		this.n8nUrl = n8nUrl;
		this.apiKey = apiKey;
	}

	/**
	 * List all workflows
	 *
	 * @returns {Promise<Array>} Promise that resolves to an array of workflows
	 */
	async listWorkflows() {
		const response = await this.makeN8nRequest('/workflows');
		return response.data;
	}

	/**
	 * Get a workflow by ID
	 *
	 * @param {string} id The ID of the workflow to get
	 * @returns {Promise<Object>} Promise that resolves to the workflow
	 */
	async getWorkflow(id) {
		return await this.makeN8nRequest(`/workflows/${id}`);
	}

	/**
	 * Create a new workflow
	 *
	 * @param {string} name The name of the workflow
	 * @param {Array} nodes Optional array of nodes to add to the workflow
	 * @param {Object} connections Optional connections between nodes
	 * @returns {Promise<Object>} Promise that resolves to the created workflow
	 */
	async createWorkflow(name, nodes = [], connections = {}) {
		const workflowData = {
			name,
			nodes,
			connections,
			settings: {
				executionOrder: 'v1',
			},
		};

		return await this.makeN8nRequest('/workflows', 'POST', workflowData);
	}

	/**
	 * Update an existing workflow
	 *
	 * @param {string} id The ID of the workflow to update
	 * @param {Object} updates The updates to apply to the workflow
	 * @returns {Promise<Object>} Promise that resolves to the updated workflow
	 */
	async updateWorkflow(id, updates) {
		const currentWorkflow = await this.getWorkflow(id);

		// Only include the properties that n8n API accepts for updates
		// Based on API error, 'active' is read-only, so we exclude it
		const allowedProperties = ['name', 'nodes', 'connections', 'settings', 'staticData'];

		const updateData = {};

		// Include only allowed properties from the current workflow
		allowedProperties.forEach((prop) => {
			// Only include properties that exist in the current workflow
			if (currentWorkflow[prop] !== undefined) {
				updateData[prop] = currentWorkflow[prop];
			}
		});

		// Apply updates, but only for allowed properties
		Object.keys(updates).forEach((key) => {
			if (allowedProperties.includes(key)) {
				updateData[key] = updates[key];
			} else {
				console.warn(
					`Warning: Property '${key}' is not allowed for workflow updates and will be ignored.`,
				);
			}
		});

		// Log what we're sending to help debug
		console.log(`Updating workflow ${id} with these properties:`, Object.keys(updateData));

		return await this.makeN8nRequest(`/workflows/${id}`, 'PUT', updateData);
	}

	/**
	 * Delete a workflow by ID
	 *
	 * @param {string} id The ID of the workflow to delete
	 * @returns {Promise<Object>} Promise that resolves to a success indicator
	 */
	async deleteWorkflow(id) {
		await this.makeN8nRequest(`/workflows/${id}`, 'DELETE');
		return { success: true };
	}

	/**
	 * Activate a workflow by ID
	 *
	 * @param {string} id The ID of the workflow to activate
	 * @returns {Promise<Object>} Promise that resolves to the activated workflow
	 */
	async activateWorkflow(id) {
		return await this.makeN8nRequest(`/workflows/${id}/activate`, 'POST');
	}

	/**
	 * Deactivate a workflow by ID
	 *
	 * @param {string} id The ID of the workflow to deactivate
	 * @returns {Promise<Object>} Promise that resolves to the deactivated workflow
	 */
	async deactivateWorkflow(id) {
		return await this.makeN8nRequest(`/workflows/${id}/deactivate`, 'POST');
	}

	/**
	 * Helper method to add a node to a workflow
	 *
	 * @param {Object} workflow The workflow to add the node to
	 * @param {Object} node The node to add
	 * @returns {Object} The updated workflow
	 */
	addNode(workflow, node) {
		return {
			...workflow,
			nodes: [...workflow.nodes, node],
		};
	}

	/**
	 * Helper method to remove a node from a workflow
	 *
	 * @param {Object} workflow The workflow to remove the node from
	 * @param {string} nodeId The ID of the node to remove
	 * @returns {Object} The updated workflow
	 */
	removeNode(workflow, nodeId) {
		const updatedNodes = workflow.nodes.filter((node) => node.id !== nodeId);

		// Also remove connections involving this node
		const updatedConnections = {};

		for (const [sourceNode, sourceConnections] of Object.entries(workflow.connections)) {
			if (sourceNode === nodeId) {
				// Skip this source node as it's being removed
				continue;
			}

			updatedConnections[sourceNode] = {};

			for (const [sourceOutput, targets] of Object.entries(sourceConnections)) {
				updatedConnections[sourceNode][sourceOutput] = targets.filter(
					(target) => target.node !== nodeId,
				);

				// Remove empty arrays
				if (updatedConnections[sourceNode][sourceOutput].length === 0) {
					delete updatedConnections[sourceNode][sourceOutput];
				}
			}

			// Remove empty objects
			if (Object.keys(updatedConnections[sourceNode]).length === 0) {
				delete updatedConnections[sourceNode];
			}
		}

		return {
			...workflow,
			nodes: updatedNodes,
			connections: updatedConnections,
		};
	}

	/**
	 * Helper method to connect two nodes in a workflow
	 *
	 * @param {Object} workflow The workflow to connect nodes in
	 * @param {string} sourceNodeId The ID of the source node
	 * @param {string} targetNodeId The ID of the target node
	 * @param {number} sourceOutput The output index of the source node (default: 0)
	 * @param {number} targetInput The input index of the target node (default: 0)
	 * @returns {Object} The updated workflow
	 */
	connectNodes(workflow, sourceNodeId, targetNodeId, sourceOutput = 0, targetInput = 0) {
		const updatedConnections = { ...workflow.connections };

		// Initialize if not exists
		if (!updatedConnections[sourceNodeId]) {
			updatedConnections[sourceNodeId] = {};
		}

		if (!updatedConnections[sourceNodeId].main) {
			updatedConnections[sourceNodeId].main = [];
		}

		// Ensure the array is long enough
		while (updatedConnections[sourceNodeId].main.length <= sourceOutput) {
			updatedConnections[sourceNodeId].main.push([]);
		}

		// Add the connection
		updatedConnections[sourceNodeId].main[sourceOutput].push({
			node: targetNodeId,
			type: 'main',
			index: targetInput,
		});

		return {
			...workflow,
			connections: updatedConnections,
		};
	}

	/**
	 * Create a simple HTTP request workflow
	 *
	 * @param {string} name Workflow name
	 * @param {string} url URL to request
	 * @param {string} method HTTP method (default: 'GET')
	 * @param {Object} headers Optional HTTP headers
	 * @param {Object} queryParameters Optional query parameters
	 * @returns {Promise<Object>} The created workflow
	 */
	async createHttpRequestWorkflow(name, url, method = 'GET', headers = {}, queryParameters = {}) {
		// Generate unique IDs for nodes
		const triggerNodeId = `trigger_${Date.now()}`;
		const httpNodeId = `http_${Date.now()}`;
		const setNodeId = `set_${Date.now()}`;

		// Create nodes
		const triggerNode = {
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			id: triggerNodeId,
			name: 'When clicking "Test workflow"',
		};

		const httpNode = {
			parameters: {
				url,
				method,
				headers: Object.entries(headers).map(([name, value]) => ({ name, value })),
				queryParameters: Object.entries(queryParameters).map(([name, value]) => ({ name, value })),
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [220, 0],
			id: httpNodeId,
			name: 'HTTP Request',
		};

		const setNode = {
			parameters: {
				values: {
					number: [
						{
							name: 'count',
							value: 1,
						},
					],
				},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [440, 0],
			id: setNodeId,
			name: 'Set variable "count" to 1',
		};

		// Create connections
		const connections = {
			[triggerNodeId]: {
				main: [
					[
						{
							node: httpNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			[httpNodeId]: {
				main: [
					[
						{
							node: setNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		return await this.createWorkflow(name, [triggerNode, httpNode, setNode], connections);
	}

	/**
	 * Make requests to the n8n API
	 *
	 * @param {string} path The API path
	 * @param {string} method The HTTP method
	 * @param {Object} body Optional request body
	 * @returns {Promise<Object>} Promise that resolves to the response data
	 */
	makeN8nRequest(path, method = 'GET', body = null) {
		return new Promise((resolve, reject) => {
			try {
				// Ensure valid URL
				const baseUrl = this.n8nUrl.endsWith('/') ? this.n8nUrl.slice(0, -1) : this.n8nUrl;
				const apiPath = path.startsWith('/') ? path : `/${path}`;
				const fullUrl = baseUrl + '/api/v1' + apiPath;

				// Parse URL
				const parsedUrl = new URL(fullUrl);

				// Request options
				const options = {
					hostname: parsedUrl.hostname,
					port: parsedUrl.port,
					path: parsedUrl.pathname + parsedUrl.search,
					method: method,
					headers: {
						'X-N8N-API-KEY': this.apiKey,
						Accept: 'application/json',
					},
					// For self-signed certificates
					rejectUnauthorized: false,
				};

				// Add body if provided
				if (body) {
					const bodyData = JSON.stringify(body);
					options.headers['Content-Type'] = 'application/json';
					options.headers['Content-Length'] = Buffer.byteLength(bodyData);
				}

				// Choose protocol
				const protocol = parsedUrl.protocol === 'https:' ? https : http;

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
								reject(new Error(`Failed to parse response: ${error}`));
							}
						} else {
							reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
						}
					});
				});

				req.on('error', (error) => {
					reject(error);
				});

				if (body) {
					req.write(JSON.stringify(body));
				}

				req.end();
			} catch (error) {
				reject(error);
			}
		});
	}
}

// Export the class
module.exports = WorkflowManager;

// Example usage
if (require.main === module) {
	// This will only run if the file is executed directly (for testing)
	const testWorkflowManager = async () => {
		try {
			const manager = new WorkflowManager(
				'https://127.0.0.1:5678',
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
			);

			console.log('Testing workflow manager...');

			// List workflows
			const workflows = await manager.listWorkflows();
			console.log(`Found ${workflows.length} workflows:`);
			workflows.forEach((workflow, index) => {
				console.log(
					`${index + 1}. ${workflow.name} (ID: ${workflow.id}, Active: ${workflow.active})`,
				);
			});

			// Create an example HTTP request workflow
			console.log('\nCreating example HTTP request workflow...');
			const newWorkflow = await manager.createHttpRequestWorkflow(
				'API Test - JSON Placeholder',
				'https://jsonplaceholder.typicode.com/posts/1',
			);

			console.log(`Created workflow: ${newWorkflow.name} (ID: ${newWorkflow.id})`);

			console.log('Test completed successfully!');
		} catch (error) {
			console.error('Test failed:', error);
		}
	};

	testWorkflowManager();
}
