#!/usr/bin/env node

/**
 * N8N Workflow Connections Example
 *
 * This script demonstrates how to properly create and connect nodes in n8n
 * following the exact internal structure used by n8n.
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
 * Creates a workflow with properly connected nodes following n8n's internal structure
 */
async function createWorkflowWithConnections() {
	try {
		console.log('Creating a new workflow with properly connected nodes...');

		// First, define all our nodes with UUIDs as ids (n8n uses UUIDs internally)
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
				method: 'GET',
				authentication: 'none',
				responseFormat: 'json',
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

		// Create the workflow with all nodes and connections at once
		console.log('Creating workflow with all nodes and connections...');
		const workflow = await manager.createWorkflow('Proper N8N Connections', nodes, connections);

		console.log(`Created workflow: ${workflow.name} (ID: ${workflow.id})`);
		console.log(`Node count: ${workflow.nodes.length}`);

		// Detailed debug output
		console.log('\nNode details:');
		workflow.nodes.forEach((node) => {
			console.log(`- ${node.name} (ID: ${node.id})`);
		});

		console.log('\nConnection details:');
		console.log(JSON.stringify(workflow.connections, null, 2));

		// Let's try to activate the workflow
		try {
			const activatedWorkflow = await manager.activateWorkflow(workflow.id);
			console.log(`Workflow activated: ${activatedWorkflow.active}`);
		} catch (error) {
			console.log(`Note: Could not activate workflow: ${error.message}`);
		}

		showRefreshNotification();

		return workflow;
	} catch (error) {
		console.error('Error creating workflow:', error.message);
		throw error;
	}
}

/**
 * Run the test
 */
async function runTest() {
	try {
		console.log('Starting workflow connections test...');

		const workflow = await createWorkflowWithConnections();

		console.log('\nTest completed successfully!');
		console.log(`Created workflow "${workflow.name}" with ${workflow.nodes.length} nodes`);
		console.log('Please check in the UI if the nodes are properly connected.');

		showRefreshNotification();
		console.log('NOTE: You MUST refresh your browser to see the connections!');
	} catch (error) {
		console.error('Test failed:', error.message);
		console.error(error.stack);
	}
}

// Run the test
runTest();
