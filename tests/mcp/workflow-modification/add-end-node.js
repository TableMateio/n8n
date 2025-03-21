#!/usr/bin/env node

/**
 * N8N Add End Node Example
 *
 * This script demonstrates how to update an existing workflow
 * by adding a new node at the end of the flow.
 *
 * This version uses the modern utilities from utils/generators.
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Import modern utilities
const WorkflowModifier = require('../../../utils/generators/workflow-modifier');
const NodeFactory = require('../../../utils/generators/node-factory');

// Try to load environment variables if dotenv is available
try {
	require('dotenv').config({ path: '.env.mcp' });
} catch (error) {
	console.log('Note: dotenv not available, using default configuration');
}

// Workflow ID to update (change this to your target workflow ID)
const WORKFLOW_ID = process.env.TARGET_WORKFLOW_ID || 'f5jNVRgWdDjTl3O0'; // Test HTTP Workflow

// Create a workflow modifier instance
const modifier = new WorkflowModifier();

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
		const workflow = await modifier.getWorkflow(WORKFLOW_ID);
		console.log(`Found workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Current nodes: ${workflow.nodes.length}`);

		// Find the last node in the workflow (Set Status)
		const lastNodeName = 'Set Status';
		console.log(`Current last node: ${lastNodeName}`);

		// Define our new end node using the NodeFactory
		const codeNode = NodeFactory.createCodeNode({
			name: 'Process Data',
			position: [850, 300], // Position it to the right of the Set Status node
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
		});

		// Add the new node to the end of the workflow
		console.log('Updating workflow with the new end node...');
		const updatedWorkflow = await modifier.addNodeAtEnd(WORKFLOW_ID, lastNodeName, codeNode);

		console.log(`Updated workflow: "${updatedWorkflow.name}" (ID: ${updatedWorkflow.id})`);
		console.log(`New node count: ${updatedWorkflow.nodes.length}`);

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
		if (error.response && error.response.data) {
			console.error('Server response:', JSON.stringify(error.response.data, null, 2));
		}
	}
}

// Run the script
run();
