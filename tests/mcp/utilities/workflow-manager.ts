/**
 * Workflow Manager for n8n
 *
 * A TypeScript class for managing n8n workflows programmatically.
 */

import { IWorkflowBase, INodeBase, IConnections } from 'n8n-workflow';
import * as https from 'https';
import * as http from 'http';

// Disable certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Interface for the n8n API workflow response
interface IN8nWorkflow extends IWorkflowBase {
	id: string;
	createdAt: string;
	updatedAt: string;
	active: boolean;
}

export class WorkflowManager {
	private n8nUrl: string;
	private apiKey: string;

	/**
	 * Create a new WorkflowManager
	 *
	 * @param n8nUrl The URL of the n8n instance (e.g., 'https://localhost:5678')
	 * @param apiKey The API key for the n8n instance
	 */
	constructor(n8nUrl: string, apiKey: string) {
		this.n8nUrl = n8nUrl;
		this.apiKey = apiKey;
	}

	/**
	 * List all workflows
	 *
	 * @returns Promise that resolves to an array of workflows
	 */
	async listWorkflows(): Promise<IN8nWorkflow[]> {
		const response = await this.makeN8nRequest('/workflows');
		return response.data;
	}

	/**
	 * Get a workflow by ID
	 *
	 * @param id The ID of the workflow to get
	 * @returns Promise that resolves to the workflow
	 */
	async getWorkflow(id: string): Promise<IN8nWorkflow> {
		return await this.makeN8nRequest(`/workflows/${id}`);
	}

	/**
	 * Create a new workflow
	 *
	 * @param name The name of the workflow
	 * @param nodes Optional array of nodes to add to the workflow
	 * @param connections Optional connections between nodes
	 * @returns Promise that resolves to the created workflow
	 */
	async createWorkflow(
		name: string,
		nodes: INodeBase[] = [],
		connections: IConnections = {},
	): Promise<IN8nWorkflow> {
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
	 * @param id The ID of the workflow to update
	 * @param updates The updates to apply to the workflow
	 * @returns Promise that resolves to the updated workflow
	 */
	async updateWorkflow(id: string, updates: Partial<IWorkflowBase>): Promise<IN8nWorkflow> {
		const currentWorkflow = await this.getWorkflow(id);

		const updatedWorkflow = {
			...currentWorkflow,
			...updates,
		};

		return await this.makeN8nRequest(`/workflows/${id}`, 'PUT', updatedWorkflow);
	}

	/**
	 * Delete a workflow by ID
	 *
	 * @param id The ID of the workflow to delete
	 * @returns Promise that resolves to a success indicator
	 */
	async deleteWorkflow(id: string): Promise<{ success: boolean }> {
		await this.makeN8nRequest(`/workflows/${id}`, 'DELETE');
		return { success: true };
	}

	/**
	 * Activate a workflow by ID
	 *
	 * @param id The ID of the workflow to activate
	 * @returns Promise that resolves to the activated workflow
	 */
	async activateWorkflow(id: string): Promise<IN8nWorkflow> {
		return await this.makeN8nRequest(`/workflows/${id}/activate`, 'POST');
	}

	/**
	 * Deactivate a workflow by ID
	 *
	 * @param id The ID of the workflow to deactivate
	 * @returns Promise that resolves to the deactivated workflow
	 */
	async deactivateWorkflow(id: string): Promise<IN8nWorkflow> {
		return await this.makeN8nRequest(`/workflows/${id}/deactivate`, 'POST');
	}

	/**
	 * Helper method to add a node to a workflow
	 *
	 * @param workflow The workflow to add the node to
	 * @param node The node to add
	 * @returns The updated workflow
	 */
	addNode(workflow: IWorkflowBase, node: INodeBase): IWorkflowBase {
		return {
			...workflow,
			nodes: [...workflow.nodes, node],
		};
	}

	/**
	 * Helper method to remove a node from a workflow
	 *
	 * @param workflow The workflow to remove the node from
	 * @param nodeId The ID of the node to remove
	 * @returns The updated workflow
	 */
	removeNode(workflow: IWorkflowBase, nodeId: string): IWorkflowBase {
		const updatedNodes = workflow.nodes.filter((node) => node.id !== nodeId);

		// Also remove connections involving this node
		const updatedConnections: IConnections = {};

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
	 * @param workflow The workflow to connect nodes in
	 * @param sourceNodeId The ID of the source node
	 * @param targetNodeId The ID of the target node
	 * @param sourceOutput The output index of the source node (default: 0)
	 * @param targetInput The input index of the target node (default: 0)
	 * @returns The updated workflow
	 */
	connectNodes(
		workflow: IWorkflowBase,
		sourceNodeId: string,
		targetNodeId: string,
		sourceOutput = 0,
		targetInput = 0,
	): IWorkflowBase {
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
	 * Make requests to the n8n API
	 *
	 * @param path The API path
	 * @param method The HTTP method
	 * @param body Optional request body
	 * @returns Promise that resolves to the response data
	 */
	private makeN8nRequest<T>(path: string, method = 'GET', body: any = null): Promise<T> {
		return new Promise((resolve, reject) => {
			try {
				// Ensure valid URL
				const baseUrl = this.n8nUrl.endsWith('/') ? this.n8nUrl.slice(0, -1) : this.n8nUrl;
				const apiPath = path.startsWith('/') ? path : `/${path}`;
				const fullUrl = baseUrl + '/api/v1' + apiPath;

				// Parse URL
				const parsedUrl = new URL(fullUrl);

				// Request options
				const options: https.RequestOptions = {
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
					requestCert: true,
					agent: false,
				};

				// Add body if provided
				if (body) {
					const bodyData = JSON.stringify(body);
					options.headers!['Content-Type'] = 'application/json';
					options.headers!['Content-Length'] = Buffer.byteLength(bodyData);
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
						if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
							try {
								if (data && data.trim()) {
									resolve(JSON.parse(data) as T);
								} else {
									resolve({} as T);
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

			console.log('Test completed successfully!');
		} catch (error) {
			console.error('Test failed:', error);
		}
	};

	testWorkflowManager();
}
