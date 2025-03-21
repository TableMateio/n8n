/**
 * WorkflowModifier
 *
 * A utility for modifying n8n workflows programmatically with
 * operations like adding, removing, and connecting nodes.
 */

const WorkflowManager = require('../../tests/mcp/utilities/workflow-manager');

class WorkflowModifier {
	/**
	 * Create a new WorkflowModifier
	 *
	 * @param {string} n8nUrl The URL of the n8n instance (defaults to environment variable)
	 * @param {string} apiKey The API key for the n8n instance (defaults to environment variable)
	 */
	constructor(n8nUrl, apiKey) {
		this.n8nUrl = n8nUrl || process.env.N8N_URL || 'http://localhost:5678';
		this.apiKey = apiKey || process.env.N8N_API_KEY;

		if (!this.apiKey) {
			console.warn('No API key provided. Set N8N_API_KEY in your environment or .env file.');
		}

		this.manager = new WorkflowManager(this.n8nUrl, this.apiKey);
	}

	/**
	 * Add a node at the end of a workflow
	 *
	 * @param {string} workflowId ID of the workflow to modify
	 * @param {string} lastNodeName Name of the current last node
	 * @param {Object} nodeConfig Configuration for the new node
	 * @returns {Promise<Object>} The updated workflow
	 */
	async addNodeAtEnd(workflowId, lastNodeName, nodeConfig) {
		try {
			// Get the current workflow
			const workflow = await this.manager.getWorkflow(workflowId);

			// Map nodes by name
			const nodeMap = workflow.nodes.reduce((map, node) => {
				map[node.name] = node;
				return map;
			}, {});

			// Find the last node
			const lastNode = nodeMap[lastNodeName];
			if (!lastNode) {
				throw new Error(`Node "${lastNodeName}" not found in workflow`);
			}

			// Create a new nodes array with our new node added
			const updatedNodes = [...workflow.nodes, nodeConfig];

			// Create the updated connections
			const updatedConnections = { ...workflow.connections };

			// Add ID-based connection
			if (!updatedConnections[lastNode.id]) {
				updatedConnections[lastNode.id] = { main: [[]] };
			} else if (!updatedConnections[lastNode.id].main) {
				updatedConnections[lastNode.id].main = [[]];
			} else if (!updatedConnections[lastNode.id].main[0]) {
				updatedConnections[lastNode.id].main[0] = [];
			}

			updatedConnections[lastNode.id].main[0].push({
				node: nodeConfig.id,
				type: 'main',
				index: 0,
			});

			// Update the workflow
			return await this.manager.updateWorkflow(workflow.id, {
				name: workflow.name,
				nodes: updatedNodes,
				connections: updatedConnections,
			});
		} catch (error) {
			console.error('Error adding node at end:', error.message);
			throw error;
		}
	}

	/**
	 * Insert a node between two existing nodes
	 *
	 * @param {string} workflowId ID of the workflow to modify
	 * @param {string} sourceNodeName Name of the source node
	 * @param {string} targetNodeName Name of the target node
	 * @param {Object} nodeConfig Configuration for the new node
	 * @returns {Promise<Object>} The updated workflow
	 */
	async insertNodeBetween(workflowId, sourceNodeName, targetNodeName, nodeConfig) {
		try {
			// Get the current workflow
			const workflow = await this.manager.getWorkflow(workflowId);

			// Map nodes by name
			const nodeMap = workflow.nodes.reduce((map, node) => {
				map[node.name] = node;
				return map;
			}, {});

			// Find the source and target nodes
			const sourceNode = nodeMap[sourceNodeName];
			const targetNode = nodeMap[targetNodeName];

			if (!sourceNode) {
				throw new Error(`Source node "${sourceNodeName}" not found in workflow`);
			}
			if (!targetNode) {
				throw new Error(`Target node "${targetNodeName}" not found in workflow`);
			}

			// Create the updated nodes array
			const updatedNodes = [...workflow.nodes, nodeConfig];

			// Create the updated connections
			const updatedConnections = { ...workflow.connections };

			// Remove the direct connection from source to target
			if (updatedConnections[sourceNode.id]?.main?.[0]) {
				updatedConnections[sourceNode.id].main[0] = updatedConnections[
					sourceNode.id
				].main[0].filter((conn) => conn.node !== targetNode.id && conn.node !== targetNode.name);
			}

			// Add connection from source to new node
			if (!updatedConnections[sourceNode.id]) {
				updatedConnections[sourceNode.id] = { main: [[]] };
			} else if (!updatedConnections[sourceNode.id].main) {
				updatedConnections[sourceNode.id].main = [[]];
			} else if (!updatedConnections[sourceNode.id].main[0]) {
				updatedConnections[sourceNode.id].main[0] = [];
			}

			updatedConnections[sourceNode.id].main[0].push({
				node: nodeConfig.id,
				type: 'main',
				index: 0,
			});

			// Add connection from new node to target
			updatedConnections[nodeConfig.id] = {
				main: [
					[
						{
							node: targetNode.id,
							type: 'main',
							index: 0,
						},
					],
				],
			};

			// Update the workflow
			return await this.manager.updateWorkflow(workflow.id, {
				name: workflow.name,
				nodes: updatedNodes,
				connections: updatedConnections,
			});
		} catch (error) {
			console.error('Error inserting node between:', error.message);
			throw error;
		}
	}

	/**
	 * Add a branch with conditional logic
	 *
	 * @param {string} workflowId ID of the workflow to modify
	 * @param {string} sourceNodeName Name of the node to branch from
	 * @param {Object} switchConfig Configuration for the switch node
	 * @param {Array<Object>} branchNodes Array of nodes for branch paths
	 * @returns {Promise<Object>} The updated workflow
	 */
	async addBranch(workflowId, sourceNodeName, switchConfig, branchNodes) {
		try {
			// Get the current workflow
			const workflow = await this.manager.getWorkflow(workflowId);

			// Map nodes by name
			const nodeMap = workflow.nodes.reduce((map, node) => {
				map[node.name] = node;
				return map;
			}, {});

			// Find the source node
			const sourceNode = nodeMap[sourceNodeName];
			if (!sourceNode) {
				throw new Error(`Source node "${sourceNodeName}" not found in workflow`);
			}

			// Create the updated nodes array
			const updatedNodes = [...workflow.nodes, switchConfig, ...branchNodes];

			// Create the updated connections
			const updatedConnections = { ...workflow.connections };

			// Connect source node to switch node
			if (!updatedConnections[sourceNode.id]) {
				updatedConnections[sourceNode.id] = { main: [[]] };
			} else if (!updatedConnections[sourceNode.id].main) {
				updatedConnections[sourceNode.id].main = [[]];
			} else if (!updatedConnections[sourceNode.id].main[0]) {
				updatedConnections[sourceNode.id].main[0] = [];
			}

			updatedConnections[sourceNode.id].main[0].push({
				node: switchConfig.id,
				type: 'main',
				index: 0,
			});

			// Connect switch node to branch nodes
			updatedConnections[switchConfig.id] = { main: [] };

			// Create connections for each branch
			branchNodes.forEach((branchNode, index) => {
				// Ensure the main array is long enough
				while (updatedConnections[switchConfig.id].main.length <= index) {
					updatedConnections[switchConfig.id].main.push([]);
				}

				// Add connection to this branch
				updatedConnections[switchConfig.id].main[index] = [
					{
						node: branchNode.id,
						type: 'main',
						index: 0,
					},
				];
			});

			// Update the workflow
			return await this.manager.updateWorkflow(workflow.id, {
				name: workflow.name,
				nodes: updatedNodes,
				connections: updatedConnections,
			});
		} catch (error) {
			console.error('Error adding branch:', error.message);
			throw error;
		}
	}

	/**
	 * Remove a node from the workflow
	 *
	 * @param {string} workflowId ID of the workflow to modify
	 * @param {string} nodeNameToRemove Name of the node to remove
	 * @param {boolean} reconnect Whether to reconnect incoming connections to outgoing ones
	 * @returns {Promise<Object>} The updated workflow
	 */
	async removeNode(workflowId, nodeNameToRemove, reconnect = true) {
		try {
			// Get the current workflow
			const workflow = await this.manager.getWorkflow(workflowId);

			// Map nodes by name and ID
			const nodeMap = workflow.nodes.reduce((map, node) => {
				map[node.name] = node;
				return map;
			}, {});

			// Find the node to remove
			const nodeToRemove = nodeMap[nodeNameToRemove];
			if (!nodeToRemove) {
				throw new Error(`Node "${nodeNameToRemove}" not found in workflow`);
			}

			// Find incoming and outgoing connections
			const incomingConnections = [];
			const outgoingConnections = workflow.connections[nodeToRemove.id]?.main || [];

			// Find all nodes that connect to the node we're removing
			Object.entries(workflow.connections).forEach(([sourceId, sourceConnections]) => {
				if (sourceId === nodeToRemove.id) return;

				// Check each output of the source node
				Object.entries(sourceConnections).forEach(([type, outputs]) => {
					outputs.forEach((connections, outputIndex) => {
						connections.forEach((connection, connectionIndex) => {
							if (connection.node === nodeToRemove.id || connection.node === nodeToRemove.name) {
								incomingConnections.push({
									sourceId,
									type,
									outputIndex,
									connectionIndex,
								});
							}
						});
					});
				});
			});

			// Create the updated nodes array, removing the node
			const updatedNodes = workflow.nodes.filter((node) => node.id !== nodeToRemove.id);

			// Create the updated connections, removing those to/from the node
			const updatedConnections = { ...workflow.connections };

			// Remove the node's outgoing connections
			delete updatedConnections[nodeToRemove.id];
			delete updatedConnections[nodeToRemove.name];

			// Remove incoming connections to the node
			incomingConnections.forEach(({ sourceId, type, outputIndex, connectionIndex }) => {
				if (updatedConnections[sourceId]?.[type]?.[outputIndex]) {
					updatedConnections[sourceId][type][outputIndex] = updatedConnections[sourceId][type][
						outputIndex
					].filter((conn) => conn.node !== nodeToRemove.id && conn.node !== nodeToRemove.name);
				}
			});

			// If we need to reconnect, add connections from incoming to outgoing
			if (reconnect && incomingConnections.length > 0 && outgoingConnections.length > 0) {
				incomingConnections.forEach(({ sourceId, type, outputIndex }) => {
					// Add connections from each incoming source to all outgoing targets
					outgoingConnections.forEach((connections, outIndex) => {
						connections.forEach((outgoingConn) => {
							if (!updatedConnections[sourceId][type][outputIndex]) {
								updatedConnections[sourceId][type][outputIndex] = [];
							}

							updatedConnections[sourceId][type][outputIndex].push({
								node: outgoingConn.node,
								type: outgoingConn.type,
								index: outgoingConn.index,
							});
						});
					});
				});
			}

			// Update the workflow
			return await this.manager.updateWorkflow(workflow.id, {
				name: workflow.name,
				nodes: updatedNodes,
				connections: updatedConnections,
			});
		} catch (error) {
			console.error('Error removing node:', error.message);
			throw error;
		}
	}

	/**
	 * Modify multiple aspects of a workflow in one operation
	 *
	 * @param {string} workflowId ID of the workflow to modify
	 * @param {Array<Object>} operations Array of operations to perform
	 * @returns {Promise<Object>} The updated workflow
	 */
	async modifyWorkflow(workflowId, operations) {
		try {
			// Get the current workflow
			let workflow = await this.manager.getWorkflow(workflowId);

			// Apply each operation sequentially
			for (const operation of operations) {
				switch (operation.type) {
					case 'addNode':
						workflow = await this.addNodeAtEnd(workflow.id, operation.lastNodeName, operation.node);
						break;

					case 'insertNode':
						workflow = await this.insertNodeBetween(
							workflow.id,
							operation.source,
							operation.target,
							operation.node,
						);
						break;

					case 'addBranch':
						workflow = await this.addBranch(
							workflow.id,
							operation.source,
							operation.switchNode,
							operation.branchNodes,
						);
						break;

					case 'removeNode':
						workflow = await this.removeNode(workflow.id, operation.node, operation.reconnect);
						break;

					case 'updateLayout':
						// Update node positions
						const updatedNodes = workflow.nodes.map((node) => {
							const adjustment = operation.adjustments.find((adj) => adj.node === node.name);
							if (adjustment) {
								return { ...node, position: adjustment.position };
							}
							return node;
						});

						workflow = await this.manager.updateWorkflow(workflow.id, {
							name: workflow.name,
							nodes: updatedNodes,
							connections: workflow.connections,
						});
						break;

					default:
						console.warn(`Unknown operation type: ${operation.type}`);
				}
			}

			return workflow;
		} catch (error) {
			console.error('Error modifying workflow:', error.message);
			throw error;
		}
	}
}

module.exports = WorkflowModifier;
