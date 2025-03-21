#!/usr/bin/env node

/**
 * N8N Add End Node Example
 *
 * This script demonstrates how to update an existing workflow
 * by adding a new node at the end of the flow.
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
 * Adds a new node to the end of the existing workflow
 */
async function addEndNode() {
	try {
		console.log(`Fetching workflow with ID: ${WORKFLOW_ID}`);

		// First, get the current workflow
		const workflow = await manager.getWorkflow(WORKFLOW_ID);
		console.log(`Found workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Current nodes: ${workflow.nodes.length}`);

		// Map of the current nodes by name for easier reference
		const nodeMap = workflow.nodes.reduce((map, node) => {
			map[node.name] = node;
			return map;
		}, {});

		// Find the last node in the workflow (Set Status)
		const lastNode = nodeMap['Set Status'];
		console.log(`Current last node: ${lastNode.name} (ID: ${lastNode.id})`);

		// Define our new end node (using a Code node for example)
		const codeNode = {
			id: 'code-' + Date.now().toString(), // Use timestamp for unique ID
			name: 'Process Data',
			type: 'n8n-nodes-base.code',
			typeVersion: 1,
			position: [850, 300], // Position it to the right of the Set Status node
			parameters: {
				mode: 'runOnceForAllItems',
				jsCode: `
// Example code that processes data from the previous node
const items = $input.all();
const results = items.map(item => {
  // Add a new field to each item
  return {
    ...item.json,
    processed: true,
    timestamp: new Date().toISOString()
  };
});

return results.map(json => ({ json }));`,
			},
		};

		// Create a new nodes array with our new node added
		const updatedNodes = [...workflow.nodes, codeNode];

		// Create the updated connections object
		// We need to add a connection from the Set Status node to our new Code node
		// Remember to include both ID-based and name-based connections
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
			node: codeNode.id,
			type: 'main',
			index: 0,
		});

		// Add name-based connection
		if (!updatedConnections[lastNode.name]) {
			updatedConnections[lastNode.name] = { main: [[]] };
		} else if (!updatedConnections[lastNode.name].main) {
			updatedConnections[lastNode.name].main = [[]];
		} else if (!updatedConnections[lastNode.name].main[0]) {
			updatedConnections[lastNode.name].main[0] = [];
		}

		updatedConnections[lastNode.name].main[0].push({
			node: codeNode.name,
			type: 'main',
			index: 0,
		});

		// Update the workflow with our changes
		console.log('Updating workflow with the new end node...');
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
		console.error('Error adding end node:', error.message);
		throw error;
	}
}

/**
 * Run the update
 */
async function run() {
	try {
		console.log('Starting workflow update - adding node at the end...');

		const workflow = await addEndNode();

		console.log('\nWorkflow updated successfully!');
		console.log(`Added "Process Data" Code node to the end of "${workflow.name}"`);
		console.log('IMPORTANT: Verify the connections in the UI after refreshing!');

		showRefreshNotification();
	} catch (error) {
		console.error('Update failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
