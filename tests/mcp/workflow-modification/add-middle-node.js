#!/usr/bin/env node

/**
 * N8N Add Middle Node Example
 *
 * This script demonstrates how to update an existing workflow
 * by inserting a new node in the middle of the flow.
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

// Workflow ID to update
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
 * Adds a new node in the middle of the existing workflow
 * between the HTTP Request and Set Status nodes
 */
async function addMiddleNode() {
	try {
		console.log(`Fetching workflow with ID: ${WORKFLOW_ID}`);

		// First, get the current workflow
		const workflow = await manager.getWorkflow(WORKFLOW_ID);
		console.log(`Found workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Current nodes: ${workflow.nodes.length}`);

		// Map of the current nodes by name and ID for easier reference
		const nodeMapByName = workflow.nodes.reduce((map, node) => {
			map[node.name] = node;
			return map;
		}, {});

		const nodeMapById = workflow.nodes.reduce((map, node) => {
			map[node.id] = node;
			return map;
		}, {});

		// Find the source node (HTTP Request) and target node (Set Status)
		const sourceNode = nodeMapByName['Get Todo'];
		const targetNode = nodeMapByName['Set Status'];

		console.log(`Will insert new node between: "${sourceNode.name}" and "${targetNode.name}"`);

		// Define our new middle node (using a Function node for example)
		const functionNode = {
			id: 'function-' + Date.now().toString(), // Use timestamp for unique ID
			name: 'Transform Data',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [550, 300], // Position it between HTTP Request and Set Status
			parameters: {
				functionCode: `// This function transforms data from the HTTP request
const data = items[0].json;

// Add some transformed fields
return [
  {
    json: {
      ...data,
      transformedAt: new Date().toISOString(),
      userId: data.userId * 10, // Multiply the user ID by 10
      completed: !data.completed, // Flip the completion status
      custom: "This item was processed by Transform Data node"
    }
  }
];
`,
			},
		};

		// Adjust the position of the Set Status node to make room
		const updatedTargetNode = {
			...targetNode,
			position: [750, 300], // Move it further to the right
		};

		// Get the current Process Data node (if it exists)
		const processDataNode = workflow.nodes.find((node) => node.name === 'Process Data');

		// Create the updated nodes array
		let updatedNodes = [
			...workflow.nodes.filter((node) => node.id !== targetNode.id && node.name !== 'Process Data'),
			functionNode,
			updatedTargetNode,
		];

		// Add the Process Data node back if it exists
		if (processDataNode) {
			const updatedProcessNode = {
				...processDataNode,
				position: [950, 300], // Move it further to the right
			};
			updatedNodes.push(updatedProcessNode);
		}

		// Create the updated connections object
		// We need to:
		// 1. Remove the connection from sourceNode to targetNode
		// 2. Add a connection from sourceNode to functionNode
		// 3. Add a connection from functionNode to targetNode
		const updatedConnections = { ...workflow.connections };

		// 1. Remove the connection from HTTP Request to Set Status
		if (updatedConnections[sourceNode.id]?.main?.[0]) {
			updatedConnections[sourceNode.id].main[0] = updatedConnections[sourceNode.id].main[0].filter(
				(conn) => conn.node !== targetNode.id,
			);
		}

		if (updatedConnections[sourceNode.name]?.main?.[0]) {
			updatedConnections[sourceNode.name].main[0] = updatedConnections[
				sourceNode.name
			].main[0].filter((conn) => conn.node !== targetNode.name);
		}

		// 2. Add connection from HTTP Request to the Function node
		// ID-based
		if (!updatedConnections[sourceNode.id]) {
			updatedConnections[sourceNode.id] = { main: [[]] };
		} else if (!updatedConnections[sourceNode.id].main) {
			updatedConnections[sourceNode.id].main = [[]];
		} else if (!updatedConnections[sourceNode.id].main[0]) {
			updatedConnections[sourceNode.id].main[0] = [];
		}

		updatedConnections[sourceNode.id].main[0].push({
			node: functionNode.id,
			type: 'main',
			index: 0,
		});

		// Name-based
		if (!updatedConnections[sourceNode.name]) {
			updatedConnections[sourceNode.name] = { main: [[]] };
		} else if (!updatedConnections[sourceNode.name].main) {
			updatedConnections[sourceNode.name].main = [[]];
		} else if (!updatedConnections[sourceNode.name].main[0]) {
			updatedConnections[sourceNode.name].main[0] = [];
		}

		updatedConnections[sourceNode.name].main[0].push({
			node: functionNode.name,
			type: 'main',
			index: 0,
		});

		// 3. Add connection from Function node to Set Status
		// ID-based
		updatedConnections[functionNode.id] = {
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

		// Name-based
		updatedConnections[functionNode.name] = {
			main: [
				[
					{
						node: targetNode.name,
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Update the workflow with our changes
		console.log('Updating workflow with the new middle node...');
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, {
			name: workflow.name,
			nodes: updatedNodes,
			connections: updatedConnections,
		});

		console.log(`Updated workflow: "${updatedWorkflow.name}" (ID: ${updatedWorkflow.id})`);
		console.log(`New node count: ${updatedWorkflow.nodes.length}`);

		// Log detailed info about the updated connections
		console.log('\nUpdated connections:');
		console.log(JSON.stringify(updatedWorkflow.connections, null, 2));

		showRefreshNotification();

		return updatedWorkflow;
	} catch (error) {
		console.error('Error adding middle node:', error.message);
		throw error;
	}
}

/**
 * Run the update
 */
async function run() {
	try {
		console.log('Starting workflow update - adding node in the middle...');

		const workflow = await addMiddleNode();

		console.log('\nWorkflow updated successfully!');
		console.log(`Added "Transform Data" Function node in the middle of "${workflow.name}"`);
		console.log('IMPORTANT: Verify the connections in the UI after refreshing!');

		showRefreshNotification();
	} catch (error) {
		console.error('Update failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
