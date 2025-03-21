#!/usr/bin/env node

/**
 * Create Simple Working N8N Workflow
 *
 * This script creates a workflow with several nodes in a simple linear path,
 * using the exact structure of the working Basic Test workflow.
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');
const fs = require('fs');

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
 * Creates a simple working workflow with several nodes in a linear path
 */
async function createSimpleWorkflow() {
	try {
		// Create node IDs following the pattern from the working workflow
		// Using UUIDs to match the pattern in the working workflow
		const triggerNodeId = 'e45f0f99-9973-43bd-b197-7b1de37e6d63';
		const httpNodeId = 'f12fcb30-1e83-4f97-ab21-2dacf9c8e2e8';
		const setNodeId = 'c2101b1a-c958-4afe-b6c0-e7f624e243bb';
		const functionNodeId = '8b31e3ff-6a40-4f1c-a750-e7315625c1dc';
		const codeNodeId = 'aad36490-99bc-47f9-bf79-c39e33c27b16';

		// Define the workflow
		const workflow = {
			name: 'Simple Linear Workflow',
			nodes: [
				{
					parameters: {},
					id: triggerNodeId,
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					parameters: {
						url: 'https://jsonplaceholder.typicode.com/todos/1',
						options: {},
					},
					id: httpNodeId,
					name: 'Get Todo',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [440, 300],
				},
				{
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
					id: setNodeId,
					name: 'Set Status',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [640, 300],
				},
				{
					parameters: {
						functionCode: `// Process data
const data = items[0].json;

return [
  {
    json: {
      ...data,
      processed: true,
      timestamp: new Date().toISOString()
    }
  }
];`,
					},
					id: functionNodeId,
					name: 'Process Data',
					type: 'n8n-nodes-base.function',
					typeVersion: 1,
					position: [840, 300],
				},
				{
					parameters: {
						mode: 'runOnceForAllItems',
						jsCode: `// Final code processing
const item = $input.item;
return {
  result: "success",
  data: item,
  summary: "Processed todo item: " + item.title
};`,
					},
					id: codeNodeId,
					name: 'Format Result',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [1040, 300],
				},
			],
			connections: {
				// ID-based connections
				[triggerNodeId]: {
					main: [
						[
							{
								node: httpNodeId,
								type: 'main',
								index: 0,
							},
						],
					],
				},
				[httpNodeId]: {
					main: [
						[
							{
								node: setNodeId,
								type: 'main',
								index: 0,
							},
						],
					],
				},
				[setNodeId]: {
					main: [
						[
							{
								node: functionNodeId,
								type: 'main',
								index: 0,
							},
						],
					],
				},
				[functionNodeId]: {
					main: [
						[
							{
								node: codeNodeId,
								type: 'main',
								index: 0,
							},
						],
					],
				},
				// Name-based connections (matching the pattern in the working workflow)
				Start: {
					main: [
						[
							{
								node: 'Get Todo',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Get Todo': {
					main: [
						[
							{
								node: 'Set Status',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Set Status': {
					main: [
						[
							{
								node: 'Process Data',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Process Data': {
					main: [
						[
							{
								node: 'Format Result',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
			active: false,
			settings: {
				executionOrder: 'v1',
			},
			tags: [],
		};

		// Create the workflow
		console.log('Creating a simple linear workflow...');
		const createdWorkflow = await manager.createWorkflow(
			workflow.name,
			workflow.nodes,
			workflow.connections,
		);

		// Log key information about the created workflow
		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		console.log(`Node count: ${createdWorkflow.nodes.length}`);

		// Save the created workflow structure for inspection
		const filename = `created-workflow-${createdWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(createdWorkflow, null, 2));
		console.log(`\nSaved workflow structure to: ${filename}`);

		// Verify node connections
		console.log('\nVerifying node connections:');
		Object.entries(createdWorkflow.connections).forEach(([sourceId, connections]) => {
			if (connections.main) {
				connections.main.forEach((outputs, outputIndex) => {
					outputs.forEach((connection) => {
						const sourceNode = createdWorkflow.nodes.find((n) => n.id === sourceId) || {
							name: sourceId,
						};
						const targetNode = createdWorkflow.nodes.find((n) => n.id === connection.node) || {
							name: connection.node,
						};

						console.log(
							`- ${sourceNode.name || sourceId} -> ${targetNode.name || connection.node}`,
						);
					});
				});
			}
		});

		showRefreshNotification();

		return createdWorkflow;
	} catch (error) {
		console.error('Error creating workflow:', error.message);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting creation of a simple linear workflow...');

		const workflow = await createSimpleWorkflow();

		console.log('\nWorkflow created successfully!');
		console.log('This workflow has a simple linear structure with 5 nodes.');
		console.log('Please check the n8n UI to verify it appears correctly.');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
