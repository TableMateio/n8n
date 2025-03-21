#!/usr/bin/env node

/**
 * N8N Test Workflow Update - With Proper Connections
 *
 * This script updates the Test HTTP Workflow with properly connected nodes
 * using BOTH name-based and ID-based connections as required by n8n.
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

// The specific workflow ID we're updating
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
 * Updates the Test HTTP Workflow with properly connected nodes
 * based on the working example
 */
async function updateWorkflow() {
	try {
		console.log(`Updating workflow ID: ${WORKFLOW_ID}`);

		// First, get the current workflow to ensure we're modifying the right one
		const existingWorkflow = await manager.getWorkflow(WORKFLOW_ID);
		console.log(`Found workflow: "${existingWorkflow.name}" (ID: ${existingWorkflow.id})`);

		// Define the nodes with static UUIDs (important for consistent references)
		const triggerNode = {
			id: '3fa0917e-ae9c-4e6e-af8b-d24a4a125d0c',
			name: 'Start',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		};

		const httpNode = {
			id: '8f37a7d2-2424-4a30-b9d2-2cd448fa2299',
			name: 'Get Todo',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [450, 300],
			parameters: {
				url: 'https://jsonplaceholder.typicode.com/todos/1',
				options: {},
			},
		};

		const setNode = {
			id: 'd6e23cef-3cf6-4cae-9d4e-5d49a8234d79',
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
				options: {},
			},
		};

		// Define all nodes
		const nodes = [triggerNode, httpNode, setNode];

		// Define connections using BOTH ID and name formats as seen in the working example
		const connections = {
			// Connections by ID
			[triggerNode.id]: {
				main: [
					[
						{
							node: httpNode.id,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			[httpNode.id]: {
				main: [
					[
						{
							node: setNode.id,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// ALSO include connections by name (this appears to be necessary)
			[triggerNode.name]: {
				main: [
					[
						{
							node: httpNode.name,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			[httpNode.name]: {
				main: [
					[
						{
							node: setNode.name,
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Update the workflow with our nodes and connections
		console.log('Updating workflow with nodes and connections...');

		const updatedWorkflow = await manager.updateWorkflow(WORKFLOW_ID, {
			name: existingWorkflow.name, // Keep the original name
			nodes: nodes,
			connections: connections,
		});

		console.log(`Updated workflow: "${updatedWorkflow.name}" (ID: ${updatedWorkflow.id})`);
		console.log(`Node count: ${updatedWorkflow.nodes.length}`);

		// Log connection details for verification
		console.log('\nConnection details (should have both ID and name based connections):');
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
async function run() {
	try {
		console.log('Starting workflow update with proper connections...');

		const workflow = await updateWorkflow();

		console.log('\nWorkflow updated successfully!');
		console.log(`Please check: "${workflow.name}" (ID: ${workflow.id})`);
		console.log('IMPORTANT: Verify the connections in the UI after refreshing!');

		showRefreshNotification();
	} catch (error) {
		console.error('Update failed:', error.message);
		console.error(error.stack);
	}
}

// Run the update
run();
