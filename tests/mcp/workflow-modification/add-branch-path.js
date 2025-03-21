#!/usr/bin/env node

/**
 * N8N Add Branch Path Example
 *
 * This script demonstrates how to update an existing workflow
 * by adding a second branch path, creating a fork in the flow.
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
 * Adds a second branch path to the workflow
 * Creating a fork after the HTTP Request node
 */
async function addBranchPath() {
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

		// Find the fork point (HTTP Request node)
		const forkNode = nodeMapByName['Get Todo'];
		console.log(`Will create a branch from: "${forkNode.name}"`);

		// Define our new branch node (using a NoOp node as an example)
		const noopNode = {
			id: 'noop-' + Date.now().toString(), // Use timestamp for unique ID
			name: 'Alternative Path',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [490, 500], // Position it below the HTTP Request node
			parameters: {},
		};

		// Define a second node for the branch (using a Function node as an example)
		const functionNode = {
			id: 'func-branch-' + Date.now().toString(), // Use timestamp for unique ID
			name: 'Process Alternative',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [740, 500], // Position it to the right of the NoOp node
			parameters: {
				functionCode: `// This function handles the alternative path
const data = items[0].json;

// Process the data differently than the main path
return [
  {
    json: {
      original: data,
      path: "alternative",
      timestamp: new Date().toISOString(),
      processingNote: "This data was processed through the alternative path"
    }
  }
];
`,
			},
		};

		// Define a merge node to bring the two paths together
		const mergeNode = {
			id: 'merge-' + Date.now().toString(), // Use timestamp for unique ID
			name: 'Merge Paths',
			type: 'n8n-nodes-base.merge',
			typeVersion: 2,
			position: [1240, 400], // Position it to the right of Process Data node
			parameters: {
				mode: 'append', // Append mode combines all items from both inputs
			},
		};

		// Create the updated nodes array
		const updatedNodes = [...workflow.nodes, noopNode, functionNode, mergeNode];

		// Create the updated connections object
		// We need to:
		// 1. Add a connection from the HTTP Request to the NoOp node
		// 2. Add a connection from the NoOp to the Function node
		// 3. Add a connection from the Process Data node to the Merge node
		// 4. Add a connection from the Function node to the Merge node
		const updatedConnections = { ...workflow.connections };

		// 1. Add a connection from HTTP Request to NoOp node
		// ID-based
		if (!updatedConnections[forkNode.id]) {
			updatedConnections[forkNode.id] = { main: [[]] };
		} else if (!updatedConnections[forkNode.id].main) {
			updatedConnections[forkNode.id].main = [[]];
		} else if (!updatedConnections[forkNode.id].main[0]) {
			updatedConnections[forkNode.id].main[0] = [];
		}

		updatedConnections[forkNode.id].main[0].push({
			node: noopNode.id,
			type: 'main',
			index: 0,
		});

		// Name-based
		if (!updatedConnections[forkNode.name]) {
			updatedConnections[forkNode.name] = { main: [[]] };
		} else if (!updatedConnections[forkNode.name].main) {
			updatedConnections[forkNode.name].main = [[]];
		} else if (!updatedConnections[forkNode.name].main[0]) {
			updatedConnections[forkNode.name].main[0] = [];
		}

		updatedConnections[forkNode.name].main[0].push({
			node: noopNode.name,
			type: 'main',
			index: 0,
		});

		// 2. Add a connection from NoOp to Function node
		// ID-based
		updatedConnections[noopNode.id] = {
			main: [
				[
					{
						node: functionNode.id,
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Name-based
		updatedConnections[noopNode.name] = {
			main: [
				[
					{
						node: functionNode.name,
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Find the Process Data node (last node in the main path)
		const processDataNode = nodeMapByName['Process Data'];

		// 3. Add a connection from Process Data to Merge node
		// ID-based
		if (!updatedConnections[processDataNode.id]) {
			updatedConnections[processDataNode.id] = { main: [[]] };
		} else if (!updatedConnections[processDataNode.id].main) {
			updatedConnections[processDataNode.id].main = [[]];
		} else if (!updatedConnections[processDataNode.id].main[0]) {
			updatedConnections[processDataNode.id].main[0] = [];
		}

		updatedConnections[processDataNode.id].main[0].push({
			node: mergeNode.id,
			type: 'main',
			index: 0,
		});

		// Name-based
		if (!updatedConnections[processDataNode.name]) {
			updatedConnections[processDataNode.name] = { main: [[]] };
		} else if (!updatedConnections[processDataNode.name].main) {
			updatedConnections[processDataNode.name].main = [[]];
		} else if (!updatedConnections[processDataNode.name].main[0]) {
			updatedConnections[processDataNode.name].main[0] = [];
		}

		updatedConnections[processDataNode.name].main[0].push({
			node: mergeNode.name,
			type: 'main',
			index: 0,
		});

		// 4. Add a connection from Function node to Merge node
		// ID-based
		updatedConnections[functionNode.id] = {
			main: [
				[
					{
						node: mergeNode.id,
						type: 'main',
						index: 1, // Note: different index for second input
					},
				],
			],
		};

		// Name-based
		updatedConnections[functionNode.name] = {
			main: [
				[
					{
						node: mergeNode.name,
						type: 'main',
						index: 1, // Note: different index for second input
					},
				],
			],
		};

		// Update the workflow with our changes
		console.log('Updating workflow with branch path...');
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
		console.error('Error adding branch path:', error.message);
		throw error;
	}
}

/**
 * Run the update
 */
async function run() {
	try {
		console.log('Starting workflow update - adding branch path...');

		const workflow = await addBranchPath();

		console.log('\nWorkflow updated successfully!');
		console.log('A new branch path has been added to the workflow.');
		console.log('The path splits after the HTTP Request and rejoins at the end with a Merge node.');
		console.log('\nIMPORTANT: Please refresh your browser to see the updated workflow!');

		showRefreshNotification();
	} catch (error) {
		console.error('Update failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
