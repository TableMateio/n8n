#!/usr/bin/env node

/**
 * N8N Single Workflow Update Example
 *
 * This script demonstrates how to update a single existing workflow
 * with properly connected nodes following the exact structure used by n8n.
 *
 * NOTE: This is a reference example kept for educational purposes.
 * For new applications, implement similar functionality using the
 * WorkflowModifier utility in utils/generators/workflow-modifier.js,
 * which provides a more consistent and maintainable API.
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

// Workflow ID to update - *** THIS IS THE KEY THING ***
// We always update this same workflow instead of creating new ones
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
 * Updates the "Test HTTP Workflow" with properly connected nodes
 */
async function updateWorkflowWithConnections() {
	try {
		console.log(`Updating workflow with ID: ${WORKFLOW_ID}`);

		// First, get the current workflow to ensure we're modifying the right one
		const existingWorkflow = await manager.getWorkflow(WORKFLOW_ID);
		console.log(`Found workflow: ${existingWorkflow.name} (ID: ${existingWorkflow.id})`);
		console.log(`Current nodes: ${existingWorkflow.nodes.length}`);

		// Define our nodes with proper UUIDs as IDs
		const triggerNode = {
			id: 'trigger-' + Date.now().toString(), // Use timestamp to ensure uniqueness
			name: 'Start',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		};

		const httpNode = {
			id: 'http-' + Date.now().toString(), // Use timestamp to ensure uniqueness
			name: 'Get Todo',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [450, 300],
			parameters: {
				url: 'https://jsonplaceholder.typicode.com/todos/1',
				method: 'GET',
				authentication: 'none',
				responseFormat: 'json',
			},
		};

		const setNode = {
			id: 'set-' + Date.now().toString(), // Use timestamp to ensure uniqueness
			name: 'Set Status',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [650, 300],
			parameters: {
				values: {
					string: [
						{
							name: 'status',
							value: 'completed',
						},
					],
				},
			},
		};

		// Define all nodes
		const nodes = [triggerNode, httpNode, setNode];

		// Define connections using the EXACT format n8n uses internally
		// Note the structure: sourceNode -> type -> output_index -> array of target connections
		const connections = {
			[triggerNode.id]: {
				// Source node ID
				main: [
					// Connection type (main is the standard type)
					[
						// Output index (0 is the standard output)
						{
							// Target connection
							node: httpNode.id, // Target node ID
							type: 'main', // Input type on target node
							index: 0, // Input index on target node
						},
					],
				],
			},
			[httpNode.id]: {
				// Source node ID
				main: [
					// Connection type
					[
						// Output index
						{
							// Target connection
							node: setNode.id, // Target node ID
							type: 'main', // Input type on target node
							index: 0, // Input index on target node
						},
					],
				],
			},
		};

		// Update the workflow with our nodes and connections
		console.log('Updating workflow with nodes and connections...');
		console.log('Node IDs:', {
			trigger: triggerNode.id,
			http: httpNode.id,
			set: setNode.id,
		});

		// Here's the critical part - update the workflow with all nodes and the proper connections structure
		const updatedWorkflow = await manager.updateWorkflow(WORKFLOW_ID, {
			name: existingWorkflow.name, // Keep the original name
			nodes: nodes,
			connections: connections,
		});

		console.log(`Updated workflow: ${updatedWorkflow.name} (ID: ${updatedWorkflow.id})`);
		console.log(`Node count: ${updatedWorkflow.nodes.length}`);

		// Detailed debug output
		console.log('\nNode details:');
		updatedWorkflow.nodes.forEach((node) => {
			console.log(`- ${node.name} (ID: ${node.id})`);
		});

		console.log('\nConnection details:');
		console.log(JSON.stringify(updatedWorkflow.connections, null, 2));

		showRefreshNotification();

		return updatedWorkflow;
	} catch (error) {
		console.error('Error updating workflow:', error.message);
		throw error;
	}
}

/**
 * Run the update
 */
async function runUpdate() {
	try {
		console.log('Starting workflow update...');

		const workflow = await updateWorkflowWithConnections();

		console.log('\nWorkflow updated successfully!');
		console.log(`PLEASE CHECK: ${workflow.name} (ID: ${workflow.id})`);
		console.log('PLEASE CHECK IN THE UI IF THE NODES ARE PROPERLY CONNECTED');

		showRefreshNotification();
	} catch (error) {
		console.error('Update failed:', error.message);
		console.error(error.stack);
	}
}

// Run the update
runUpdate();
