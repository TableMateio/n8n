#!/usr/bin/env node

/**
 * N8N Connection Test - Fixed Version
 *
 * This script implements workflow creation with properly connected nodes
 * and provides clear refresh notifications after each update.
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

// Utility to display a highly visible refresh notification
function showRefreshNotification() {
	console.log('\n' + '='.repeat(50));
	console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
	console.log('='.repeat(50) + '\n');
}

// Create a complete workflow with connected nodes in one go
async function createConnectedWorkflow() {
	try {
		console.log('Creating a new workflow with connected nodes...');

		// 1. Create a workflow with a trigger node
		const workflowWithTrigger = await manager.createWorkflow(
			'Complete Connected Workflow',
			[
				{
					id: 'triggerNode',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [250, 300],
					parameters: {},
				},
			],
			{}, // Empty connections
		);

		console.log(`Created workflow: ${workflowWithTrigger.name} (ID: ${workflowWithTrigger.id})`);

		// Extract the actual ID of the trigger node assigned by n8n
		const triggerNode = workflowWithTrigger.nodes.find((node) => node.name === 'Start');
		const triggerNodeId = triggerNode.id;
		console.log(`Actual trigger node ID: ${triggerNodeId}`);

		showRefreshNotification();

		// 2. Now add HTTP node and connect it to the trigger node
		const httpNode = {
			id: 'httpNode',
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

		// Update the workflow with both nodes and the connection
		const workflowWithHttp = await manager.updateWorkflow(workflowWithTrigger.id, {
			nodes: [...workflowWithTrigger.nodes, httpNode],
			connections: {
				[triggerNodeId]: {
					main: [
						[
							{
								node: 'httpNode', // Using the ID we assigned
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		});

		console.log('Added HTTP node and connected it to the trigger node');

		// Get the actual HTTP node ID
		const updatedHttpNode = workflowWithHttp.nodes.find((node) => node.name === 'Get Todo');
		const httpNodeId = updatedHttpNode.id;
		console.log(`Actual HTTP node ID: ${httpNodeId}`);

		// Log the actual connections for debugging
		console.log(
			'Connections after adding HTTP node:',
			JSON.stringify(workflowWithHttp.connections, null, 2),
		);

		showRefreshNotification();

		// 3. Finally, add a Set node and connect it to the HTTP node
		const setNode = {
			id: 'setNode',
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

		// Check if we need to recreate the connections entirely
		const finalConnections = { ...workflowWithHttp.connections };

		// Add the connection from HTTP to Set
		finalConnections[httpNodeId] = {
			main: [
				[
					{
						node: 'setNode',
						type: 'main',
						index: 0,
					},
				],
			],
		};

		const finalWorkflow = await manager.updateWorkflow(workflowWithHttp.id, {
			nodes: [...workflowWithHttp.nodes, setNode],
			connections: finalConnections,
		});

		console.log('Added Set node and connected it to the HTTP node');
		console.log(`Final workflow has ${finalWorkflow.nodes.length} nodes`);

		// Log the final connections for debugging
		console.log('Final connections:', JSON.stringify(finalWorkflow.connections, null, 2));

		// Let's try to activate the workflow since it has a valid trigger
		try {
			const activatedWorkflow = await manager.activateWorkflow(finalWorkflow.id);
			console.log(`Workflow activated: ${activatedWorkflow.active}`);
		} catch (error) {
			console.log(`Note: Could not activate workflow: ${error.message}`);
		}

		showRefreshNotification();

		return finalWorkflow;
	} catch (error) {
		console.error('Error creating connected workflow:', error.message);
		throw error;
	}
}

// Run the test
async function runTest() {
	try {
		console.log('Starting N8N connection fix test...');

		const workflow = await createConnectedWorkflow();

		console.log('\nWorkflow created successfully!');
		console.log(`Workflow name: ${workflow.name}`);
		console.log(`Workflow ID: ${workflow.id}`);
		console.log(`Node count: ${workflow.nodes.length}`);

		console.log('\nNode details:');
		workflow.nodes.forEach((node) => {
			console.log(`- ${node.name} (ID: ${node.id})`);
		});

		showRefreshNotification();
		console.log('Please check if the nodes are connected properly now!');
	} catch (error) {
		console.error('Test failed:', error.message);
		console.error(error.stack);
	}
}

// Run the test
runTest();
