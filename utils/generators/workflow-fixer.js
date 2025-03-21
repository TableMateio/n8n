/**
 * WorkflowFixer
 *
 * A utility for fixing common issues in n8n workflows programmatically.
 * This consolidates functionality from various specific fix scripts.
 */

const WorkflowManager = require('../../tests/mcp/utilities/workflow-manager');
const path = require('path');
const os = require('os');

class WorkflowFixer {
	/**
	 * Create a new WorkflowFixer
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
	 * Fix binary data expression issues in a workflow
	 *
	 * @param {string} workflowId ID of the workflow to fix
	 * @param {Object} options Configuration options
	 * @returns {Promise<Object>} The updated workflow
	 */
	async fixBinaryExpressions(workflowId, options = {}) {
		try {
			console.log(`Fixing binary expressions in workflow: ${workflowId}`);

			// Get the current workflow
			const workflow = await this.manager.getWorkflow(workflowId);

			// Create a copy of the workflow nodes
			const updatedNodes = [...workflow.nodes];
			let fixCount = 0;

			// Process each node to find and fix binary expressions
			for (let i = 0; i < updatedNodes.length; i++) {
				const node = updatedNodes[i];

				// Skip nodes that don't have parameters
				if (!node.parameters) continue;

				// Check for Set nodes which often have binary expression issues
				if (node.type === 'n8n-nodes-base.set') {
					const fixedNode = this.fixSetNodeBinaryExpressions(node, options);
					if (fixedNode !== node) {
						updatedNodes[i] = fixedNode;
						fixCount++;
					}
				}

				// Check for HTTP Request nodes with binary attachments
				if (node.type === 'n8n-nodes-base.httpRequest') {
					const fixedNode = this.fixHttpNodeBinaryExpressions(node, options);
					if (fixedNode !== node) {
						updatedNodes[i] = fixedNode;
						fixCount++;
					}
				}
			}

			console.log(`Fixed binary expressions in ${fixCount} nodes`);

			// Update the workflow with the fixed nodes
			if (fixCount > 0) {
				return await this.manager.updateWorkflow(workflow.id, {
					name: workflow.name,
					nodes: updatedNodes,
					connections: workflow.connections,
				});
			}

			return workflow;
		} catch (error) {
			console.error('Error fixing binary expressions:', error.message);
			throw error;
		}
	}

	/**
	 * Fix binary expressions in a Set node
	 *
	 * @private
	 * @param {Object} node The node to fix
	 * @param {Object} options Configuration options
	 * @returns {Object} The fixed node
	 */
	fixSetNodeBinaryExpressions(node, options) {
		// Make a deep copy of the node to avoid mutating the original
		const fixedNode = JSON.parse(JSON.stringify(node));
		let modified = false;

		// Handle different Set node versions
		if (node.typeVersion >= 3) {
			// New Set node format (v3+)
			if (fixedNode.parameters?.assignments?.assignments) {
				const assignments = fixedNode.parameters.assignments.assignments;

				for (let i = 0; i < assignments.length; i++) {
					const assignment = assignments[i];

					// Check for binary expressions
					if (typeof assignment.value === 'string' && assignment.value.includes('$binary')) {
						// Fix the expression format
						const fixedExpr = this.fixBinaryExpression(assignment.value);
						if (fixedExpr !== assignment.value) {
							assignments[i].value = fixedExpr;
							modified = true;
						}
					}
				}
			}
		} else {
			// Legacy Set node format (v1)
			if (fixedNode.parameters?.values) {
				Object.keys(fixedNode.parameters.values).forEach((key) => {
					const value = fixedNode.parameters.values[key];

					// Check for binary expressions
					if (typeof value === 'string' && value.includes('$binary')) {
						// Fix the expression format
						const fixedExpr = this.fixBinaryExpression(value);
						if (fixedExpr !== value) {
							fixedNode.parameters.values[key] = fixedExpr;
							modified = true;
						}
					}
				});
			}
		}

		return modified ? fixedNode : node;
	}

	/**
	 * Fix binary expressions in an HTTP Request node
	 *
	 * @private
	 * @param {Object} node The node to fix
	 * @param {Object} options Configuration options
	 * @returns {Object} The fixed node
	 */
	fixHttpNodeBinaryExpressions(node, options) {
		// Make a deep copy of the node to avoid mutating the original
		const fixedNode = JSON.parse(JSON.stringify(node));
		let modified = false;

		// Check for binary data in form-data parameters
		if (fixedNode.parameters?.bodyParametersUi?.parameter) {
			const params = fixedNode.parameters.bodyParametersUi.parameter;

			for (let i = 0; i < params.length; i++) {
				const param = params[i];

				// Check for binary expressions
				if (typeof param.value === 'string' && param.value.includes('$binary')) {
					// Fix the expression format
					const fixedExpr = this.fixBinaryExpression(param.value);
					if (fixedExpr !== param.value) {
						params[i].value = fixedExpr;
						modified = true;
					}
				}
			}
		}

		return modified ? fixedNode : node;
	}

	/**
	 * Fix a binary expression string
	 *
	 * @private
	 * @param {string} expr The expression to fix
	 * @returns {string} The fixed expression
	 */
	fixBinaryExpression(expr) {
		// Common expression issues and their fixes
		const fixPatterns = [
			// Fix missing parentheses in $binary expressions
			{
				pattern: /\{\{\s*\$binary([^}]+)\}\}/g,
				replacement: (match, p1) => {
					// Check if the expression already has parentheses
					if (p1.trim().startsWith('.')) {
						return `{{ $binary${p1} }}`;
					}
					return `{{ $binary.${p1} }}`;
				},
			},
			// Fix incorrect indexing
			{
				pattern: /\$binary\.(data)\[(\d+)\]/g,
				replacement: (match, p1, p2) => `$binary[${p2}].${p1}`,
			},
			// Fix incorrect property access
			{
				pattern: /\$binary\[(\d+)\]\.data\.data/g,
				replacement: (match, p1) => `$binary[${p1}].data`,
			},
		];

		// Apply each fix pattern
		let fixedExpr = expr;
		fixPatterns.forEach(({ pattern, replacement }) => {
			fixedExpr = fixedExpr.replace(pattern, replacement);
		});

		return fixedExpr;
	}

	/**
	 * Fix file paths in configuration nodes
	 *
	 * @param {string} workflowId ID of the workflow to fix
	 * @param {Object} options Configuration options
	 * @returns {Promise<Object>} The updated workflow
	 */
	async fixConfigPaths(workflowId, options = {}) {
		try {
			console.log(`Fixing configuration paths in workflow: ${workflowId}`);

			// Get the current workflow
			const workflow = await this.manager.getWorkflow(workflowId);

			// Create a copy of the workflow nodes
			const updatedNodes = [...workflow.nodes];
			let fixCount = 0;

			// Process each node to find and fix configuration paths
			for (let i = 0; i < updatedNodes.length; i++) {
				const node = updatedNodes[i];

				// Skip nodes that don't have parameters
				if (!node.parameters) continue;

				// Fix paths in Read Binary File nodes
				if (node.type === 'n8n-nodes-base.readBinaryFile' && node.parameters.filePath) {
					const fixedNode = { ...node };

					// Get the original file path
					const originalPath = fixedNode.parameters.filePath;

					// Fix the path if it's a relative path
					if (!path.isAbsolute(originalPath)) {
						// Determine the correct absolute path
						const basePath = options.basePath || process.cwd();
						const absolutePath = path.resolve(basePath, originalPath);

						// Update the path
						fixedNode.parameters.filePath = absolutePath;
						updatedNodes[i] = fixedNode;
						fixCount++;

						console.log(`Updated path in node "${node.name}": ${originalPath} -> ${absolutePath}`);
					}
				}

				// Fix paths in Read Binary Files node
				if (node.type === 'n8n-nodes-base.readBinaryFiles' && node.parameters.path) {
					const fixedNode = { ...node };

					// Get the original directory path
					const originalPath = fixedNode.parameters.path;

					// Fix the path if it's a relative path
					if (!path.isAbsolute(originalPath)) {
						// Determine the correct absolute path
						const basePath = options.basePath || process.cwd();
						const absolutePath = path.resolve(basePath, originalPath);

						// Update the path
						fixedNode.parameters.path = absolutePath;
						updatedNodes[i] = fixedNode;
						fixCount++;

						console.log(`Updated path in node "${node.name}": ${originalPath} -> ${absolutePath}`);
					}
				}

				// Fix paths in Read JSON/CSV/Text File nodes
				if (
					[
						'n8n-nodes-base.readJsonFile',
						'n8n-nodes-base.readCsv',
						'n8n-nodes-base.readTextFile',
					].includes(node.type) &&
					node.parameters.filePath
				) {
					const fixedNode = { ...node };

					// Get the original file path
					const originalPath = fixedNode.parameters.filePath;

					// Fix the path if it's a relative path
					if (!path.isAbsolute(originalPath)) {
						// Determine the correct absolute path
						const basePath = options.basePath || process.cwd();
						const absolutePath = path.resolve(basePath, originalPath);

						// Update the path
						fixedNode.parameters.filePath = absolutePath;
						updatedNodes[i] = fixedNode;
						fixCount++;

						console.log(`Updated path in node "${node.name}": ${originalPath} -> ${absolutePath}`);
					}
				}
			}

			console.log(`Fixed paths in ${fixCount} nodes`);

			// Update the workflow with the fixed nodes
			if (fixCount > 0) {
				return await this.manager.updateWorkflow(workflow.id, {
					name: workflow.name,
					nodes: updatedNodes,
					connections: workflow.connections,
				});
			}

			return workflow;
		} catch (error) {
			console.error('Error fixing configuration paths:', error.message);
			throw error;
		}
	}

	/**
	 * Fix Set nodes for compatibility with newer n8n versions
	 *
	 * @param {string} workflowId ID of the workflow to fix
	 * @param {Object} options Configuration options
	 * @returns {Promise<Object>} The updated workflow
	 */
	async fixSetNodes(workflowId, options = {}) {
		try {
			console.log(`Fixing Set nodes in workflow: ${workflowId}`);

			// Get the current workflow
			const workflow = await this.manager.getWorkflow(workflowId);

			// Create a copy of the workflow nodes
			const updatedNodes = [...workflow.nodes];
			let fixCount = 0;

			// Process each node to find and fix Set nodes
			for (let i = 0; i < updatedNodes.length; i++) {
				const node = updatedNodes[i];

				// Skip nodes that aren't Set nodes
				if (node.type !== 'n8n-nodes-base.set') continue;

				// Check for old version Set nodes that need updating
				if (node.typeVersion < 3.4) {
					// Convert old format to new format
					const fixedNode = this.convertSetNodeToNewFormat(node);
					updatedNodes[i] = fixedNode;
					fixCount++;

					console.log(`Updated Set node "${node.name}" from v${node.typeVersion} to v3.4`);
				}
			}

			console.log(`Fixed ${fixCount} Set nodes`);

			// Update the workflow with the fixed nodes
			if (fixCount > 0) {
				return await this.manager.updateWorkflow(workflow.id, {
					name: workflow.name,
					nodes: updatedNodes,
					connections: workflow.connections,
				});
			}

			return workflow;
		} catch (error) {
			console.error('Error fixing Set nodes:', error.message);
			throw error;
		}
	}

	/**
	 * Convert an old-format Set node to the new format
	 *
	 * @private
	 * @param {Object} node The Set node to convert
	 * @returns {Object} The updated Set node
	 */
	convertSetNodeToNewFormat(node) {
		// Create a new node based on the old one
		const newNode = {
			...node,
			typeVersion: 3.4, // Update to the latest version
			parameters: {
				mode: 'manual',
				includeOtherFields: true,
				include: 'all',
			},
		};

		// Convert the old values format to the new assignments format
		if (node.parameters && node.parameters.values) {
			const assignments = [];

			// Convert each key-value pair in the old format to an assignment
			Object.entries(node.parameters.values).forEach(([name, value]) => {
				// Determine the value type
				let type = 'string';
				if (typeof value === 'number') type = 'number';
				if (typeof value === 'boolean') type = 'boolean';
				if (value === null) type = 'string';

				// If it's an expression (starts with =), keep it as a string but mark as expression
				const isExpression = typeof value === 'string' && value.trim().startsWith('=');

				assignments.push({
					name,
					type,
					value: value,
					...(isExpression && {
						__rl: true,
						__dl: {
							mode: 'expression',
							value: value,
						},
					}),
				});
			});

			// Add the assignments to the new parameters
			newNode.parameters.assignments = {
				assignments,
			};
		}

		return newNode;
	}

	/**
	 * Fix connection issues in a workflow
	 *
	 * @param {string} workflowId ID of the workflow to fix
	 * @param {Object} options Configuration options
	 * @returns {Promise<Object>} The updated workflow
	 */
	async fixConnections(workflowId, options = {}) {
		try {
			console.log(`Fixing connections in workflow: ${workflowId}`);

			// Get the current workflow
			const workflow = await this.manager.getWorkflow(workflowId);

			// Create a deep copy to avoid modifying the original
			const updatedWorkflow = JSON.parse(JSON.stringify(workflow));
			let fixCount = 0;

			// Create a map of nodes by ID and name
			const nodeMap = {};
			updatedWorkflow.nodes.forEach((node) => {
				nodeMap[node.id] = node;
				nodeMap[node.name] = node;
			});

			// Create a new connections object
			const newConnections = {};

			// Process each connection
			Object.entries(updatedWorkflow.connections).forEach(([sourceId, sourceConnections]) => {
				// Find the corresponding node
				const sourceNode = nodeMap[sourceId];

				// Skip if the source node doesn't exist
				if (!sourceNode) return;

				// Initialize connection for this source
				newConnections[sourceId] = {};

				// Process each connection type (usually just 'main')
				Object.entries(sourceConnections).forEach(([type, outputs]) => {
					newConnections[sourceId][type] = [];

					// Process each output from this source
					outputs.forEach((connections, outputIndex) => {
						// Ensure the array is long enough
						while (newConnections[sourceId][type].length <= outputIndex) {
							newConnections[sourceId][type].push([]);
						}

						// Process each connection from this output
						connections.forEach((connection) => {
							// Find the target node
							const targetNode = nodeMap[connection.node];

							// Skip if the target node doesn't exist
							if (!targetNode) {
								console.log(`Skipping connection to missing node: ${connection.node}`);
								return;
							}

							// Add the connection
							newConnections[sourceId][type][outputIndex].push({
								node: targetNode.id, // Always use ID to ensure consistency
								type: connection.type,
								index: connection.index,
							});

							fixCount++;
						});
					});
				});
			});

			console.log(`Processed ${fixCount} connections`);

			// Update the workflow with the fixed connections
			updatedWorkflow.connections = newConnections;

			return await this.manager.updateWorkflow(workflow.id, {
				name: updatedWorkflow.name,
				nodes: updatedWorkflow.nodes,
				connections: updatedWorkflow.connections,
			});
		} catch (error) {
			console.error('Error fixing connections:', error.message);
			throw error;
		}
	}

	/**
	 * Apply multiple fixes to a workflow
	 *
	 * @param {string} workflowId ID of the workflow to fix
	 * @param {Array<string>} fixes Array of fix types to apply
	 * @param {Object} options Configuration options
	 * @returns {Promise<Object>} The updated workflow
	 */
	async applyFixes(workflowId, fixes = [], options = {}) {
		console.log(`Applying fixes to workflow: ${workflowId}`);
		console.log(`Fix types: ${fixes.join(', ')}`);

		let workflow = await this.manager.getWorkflow(workflowId);

		// Apply each requested fix type
		for (const fixType of fixes) {
			switch (fixType) {
				case 'binary':
					workflow = await this.fixBinaryExpressions(workflow.id, options);
					break;

				case 'paths':
					workflow = await this.fixConfigPaths(workflow.id, options);
					break;

				case 'set':
					workflow = await this.fixSetNodes(workflow.id, options);
					break;

				case 'connections':
					workflow = await this.fixConnections(workflow.id, options);
					break;

				default:
					console.warn(`Unknown fix type: ${fixType}`);
			}
		}

		console.log('All fixes applied successfully');
		return workflow;
	}
}

module.exports = WorkflowFixer;
