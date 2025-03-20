#!/usr/bin/env node

/**
 * N8N Add Conditional Branch Example
 *
 * This script demonstrates how to update an existing workflow
 * by adding a Switch node that routes execution based on a condition.
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');

// Configuration
const config = {
	url: 'https://127.0.0.1:5678',
	apiKey:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
};

// Workflow ID to update - using the Test HTTP Workflow
const WORKFLOW_ID = 'f5jNVRgWdDjTl3O0'; // Test HTTP Workflow

// Create a workflow manager instance
const manager = new WorkflowManager(config.url, config.apiKey);

/**
 * Utility to display a highly visible refresh notification
 */
function showRefreshNotification() {
	console.log('\n' + '='.repeat(50));
	console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
	console.log('='.repeat(50) + '\n');
}

/**
 * Adds a conditional branch with a Switch node to the workflow
 */
async function addConditionalBranch() {
	try {
		console.log(`Fetching workflow with ID: ${WORKFLOW_ID}`);

		// First, get the current workflow
		const workflow = await manager.getWorkflow(WORKFLOW_ID);
		console.log(`Found workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Current nodes: ${workflow.nodes.length}`);

		// Map of the current nodes by name for easier reference
		const nodeMapByName = workflow.nodes.reduce((map, node) => {
			map[node.name] = node;
			return map;
		}, {});

		// Find the HTTP Request node to add our condition after it
		const httpNode = nodeMapByName['Get Todo'];

		// Create a timestamp for unique IDs
		const timestamp = Date.now();

		// Define our Switch node
		const switchNode = {
			id: 'switch-' + timestamp,
			name: 'Route by Todo Status',
			type: 'n8n-nodes-base.switch',
			typeVersion: 1,
			position: [560, 300], // Position it after the HTTP Request node
			parameters: {
				dataType: 'string',
				rules: {
					mode: 'single',
					rules: [
						{
							operation: 'contains',
							value1: '={{$json["completed"]}}',
							value2: 'true',
						},
						{
							operation: 'contains',
							value1: '={{$json["completed"]}}',
							value2: 'false',
						},
					],
				},
				fallbackOutput: '3', // Output if no conditions match
				options: {},
			},
		};

		// Define the "Completed" path node
		const completedNode = {
			id: 'completed-' + timestamp,
			name: 'Process Completed Todo',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [780, 200], // Position it in the upper branch
			parameters: {
				functionCode: `// Process completed todo items
const data = items[0].json;

return [
  {
    json: {
      original: data,
      status: "completed",
      message: "This todo is already completed!",
      priority: "low",
      processed: new Date().toISOString()
    }
  }
];`,
			},
		};

		// Define the "Incomplete" path node
		const incompleteNode = {
			id: 'incomplete-' + timestamp,
			name: 'Process Incomplete Todo',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [780, 400], // Position it in the lower branch
			parameters: {
				functionCode: `// Process incomplete todo items
const data = items[0].json;

return [
  {
    json: {
      original: data,
      status: "incomplete",
      message: "This todo needs attention!",
      priority: "high",
      processed: new Date().toISOString()
    }
  }
];`,
			},
		};

		// Define the "Default" path node
		const defaultNode = {
			id: 'default-' + timestamp,
			name: 'Handle Unknown Status',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [780, 600], // Position it in the lowest branch
			parameters: {
				functionCode: `// Handle items with unknown status
const data = items[0].json;

return [
  {
    json: {
      original: data,
      status: "unknown",
      message: "This todo has an invalid status!",
      priority: "medium",
      processed: new Date().toISOString()
    }
  }
];`,
			},
		};

		// Define a Join node to merge all paths back together
		const joinNode = {
			id: 'join-' + timestamp,
			name: 'Join Paths',
			type: 'n8n-nodes-base.merge',
			typeVersion: 2,
			position: [1000, 400], // Position it to the right of all branches
			parameters: {
				mode: 'append', // Append mode combines all items from all inputs
			},
		};

		// Create the updated nodes array with our new nodes
		const updatedNodes = [
			...workflow.nodes,
			switchNode,
			completedNode,
			incompleteNode,
			defaultNode,
			joinNode,
		];

		// Find the position of the HTTP node in the connections
		// We need to modify its existing connections to redirect to our Switch node

		// Create a copy of the current connections
		const updatedConnections = { ...workflow.connections };

		// Redirect HTTP node to Switch node
		// We need to find all connections from HTTP node and redirect them to the Switch node

		// ID-based connections
		if (updatedConnections[httpNode.id]) {
			// Create new connection to Switch node
			updatedConnections[httpNode.id] = {
				main: [
					[
						{
							node: switchNode.id,
							type: 'main',
							index: 0,
						},
					],
				],
			};
		}

		// Name-based connections
		if (updatedConnections[httpNode.name]) {
			// Create new connection to Switch node
			updatedConnections[httpNode.name] = {
				main: [
					[
						{
							node: switchNode.name,
							type: 'main',
							index: 0,
						},
					],
				],
			};
		}

		// Connect Switch node outputs to the three function nodes
		// ID-based
		updatedConnections[switchNode.id] = {
			main: [
				// Output 0 (Completed) -> Completed node
				[
					{
						node: completedNode.id,
						type: 'main',
						index: 0,
					},
				],
				// Output 1 (Incomplete) -> Incomplete node
				[
					{
						node: incompleteNode.id,
						type: 'main',
						index: 0,
					},
				],
				// Output 2 (Default) -> Default node
				[
					{
						node: defaultNode.id,
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Name-based
		updatedConnections[switchNode.name] = {
			main: [
				// Output 0 (Completed) -> Completed node
				[
					{
						node: completedNode.name,
						type: 'main',
						index: 0,
					},
				],
				// Output 1 (Incomplete) -> Incomplete node
				[
					{
						node: incompleteNode.name,
						type: 'main',
						index: 0,
					},
				],
				// Output 2 (Default) -> Default node
				[
					{
						node: defaultNode.name,
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Connect all function nodes to the Join node
		// ID-based
		updatedConnections[completedNode.id] = {
			main: [
				[
					{
						node: joinNode.id,
						type: 'main',
						index: 0,
					},
				],
			],
		};

		updatedConnections[incompleteNode.id] = {
			main: [
				[
					{
						node: joinNode.id,
						type: 'main',
						index: 1,
					},
				],
			],
		};

		updatedConnections[defaultNode.id] = {
			main: [
				[
					{
						node: joinNode.id,
						type: 'main',
						index: 2,
					},
				],
			],
		};

		// Name-based
		updatedConnections[completedNode.name] = {
			main: [
				[
					{
						node: joinNode.name,
						type: 'main',
						index: 0,
					},
				],
			],
		};

		updatedConnections[incompleteNode.name] = {
			main: [
				[
					{
						node: joinNode.name,
						type: 'main',
						index: 1,
					},
				],
			],
		};

		updatedConnections[defaultNode.name] = {
			main: [
				[
					{
						node: joinNode.name,
						type: 'main',
						index: 2,
					},
				],
			],
		};

		// Find the node that was previously connected to the HTTP node
		// and connect it to our Join node
		const existingMainPath = [];
		let foundHttpNode = false;
		let nextNode = null;

		// Walk through the nodes to find what comes after HTTP node in the original flow
		for (const [sourceId, connections] of Object.entries(workflow.connections)) {
			// Skip if no main connections
			if (!connections.main) continue;

			// Check if this is our HTTP node
			if (sourceId === httpNode.id || sourceId === httpNode.name) {
				foundHttpNode = true;
				// Find what node the HTTP node was connected to
				if (connections.main[0] && connections.main[0][0]) {
					nextNode = connections.main[0][0].node;
				}
			}
		}

		// If we found the next node, connect our Join node to it
		if (nextNode) {
			console.log(`Connecting Join node to the existing flow at node: ${nextNode}`);

			// Connect Join node to the next node in the original flow
			// ID-based
			updatedConnections[joinNode.id] = {
				main: [
					[
						{
							node: nextNode,
							type: 'main',
							index: 0,
						},
					],
				],
			};

			// Name-based
			updatedConnections[joinNode.name] = {
				main: [
					[
						{
							node: nextNode,
							type: 'main',
							index: 0,
						},
					],
				],
			};
		} else {
			console.log('Could not find the next node after HTTP node in the original flow.');
		}

		// Update the workflow with our changes
		console.log('Updating workflow with conditional branch...');
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
			name: workflow.name,
			nodes: updatedNodes,
			connections: updatedConnections,
		});

		console.log(`Updated workflow: "${updatedWorkflow.name}" (ID: ${updatedWorkflow.id})`);
		console.log(`New node count: ${updatedWorkflow.nodes.length}`);

		showRefreshNotification();

		return updatedWorkflow;
	} catch (error) {
		console.error('Error adding conditional branch:', error.message);
		throw error;
	}
}

/**
 * Run the update
 */
async function run() {
	try {
		console.log('Starting workflow update - adding conditional branch...');

		const workflow = await addConditionalBranch();

		console.log('\nWorkflow updated successfully!');
		console.log('A conditional branch has been added using a Switch node.');
		console.log('The workflow now routes todos based on their completion status:');
		console.log('- Completed todos go through the top path');
		console.log('- Incomplete todos go through the middle path');
		console.log('- Unknown status todos go through the bottom path');
		console.log('All paths rejoin at the Join node before continuing the original flow.');

		showRefreshNotification();
	} catch (error) {
		console.error('Update failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
