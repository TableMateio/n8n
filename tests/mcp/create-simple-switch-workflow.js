#!/usr/bin/env node

/**
 * Create Simple Switch Workflow
 *
 * This script creates a workflow with a Switch node that handles conditional branching
 * using the structure we know works from our previous successful workflows.
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
 * Creates a simple workflow with a Switch node for conditional branching
 */
async function createSwitchWorkflow() {
	try {
		// Create stable node IDs (using UUID format but with simple memorable values)
		const triggerNodeId = 'aaaaaaaa-0000-1111-2222-333333333333';
		const httpNodeId = 'bbbbbbbb-0000-1111-2222-333333333333';
		const setNodeId = 'cccccccc-0000-1111-2222-333333333333';
		const switchNodeId = 'dddddddd-0000-1111-2222-333333333333';
		const pathANodeId = 'eeeeeeee-0000-1111-2222-333333333333';
		const pathBNodeId = 'ffffffff-0000-1111-2222-333333333333';
		const mergeNodeId = 'gggggggg-0000-1111-2222-333333333333';

		// Define the workflow
		const workflow = {
			name: 'Simple Switch Workflow',
			nodes: [
				// Start node (trigger)
				{
					parameters: {},
					id: triggerNodeId,
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [250, 300],
				},
				// HTTP Request node
				{
					parameters: {
						url: 'https://jsonplaceholder.typicode.com/todos/1',
						options: {},
					},
					id: httpNodeId,
					name: 'Get Todo',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [450, 300],
				},
				// Set node (adds status field)
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
					position: [650, 300],
				},
				// Switch node (for conditional branching)
				{
					parameters: {
						dataType: 'string',
						rules: {
							mode: 'single',
							rules: [
								{
									operation: 'equal',
									value1: '={{$json["status"]}}',
									value2: 'completed',
								},
							],
						},
						fallbackOutput: '1', // Default output if no rules match
						options: {},
					},
					id: switchNodeId,
					name: 'Route by Status',
					type: 'n8n-nodes-base.switch',
					typeVersion: 1,
					position: [850, 300],
				},
				// Path A - Function node for completed status
				{
					parameters: {
						functionCode: `// Process completed status
const data = items[0].json;

return [
  {
    json: {
      ...data,
      priorityLevel: "low",
      message: "This is already done"
    }
  }
];`,
					},
					id: pathANodeId,
					name: 'Process Completed',
					type: 'n8n-nodes-base.function',
					typeVersion: 1,
					position: [1050, 200],
				},
				// Path B - Function node for other status
				{
					parameters: {
						functionCode: `// Process other status
const data = items[0].json;

return [
  {
    json: {
      ...data,
      priorityLevel: "high",
      message: "This needs attention"
    }
  }
];`,
					},
					id: pathBNodeId,
					name: 'Process Other',
					type: 'n8n-nodes-base.function',
					typeVersion: 1,
					position: [1050, 400],
				},
				// Merge node to combine results
				{
					parameters: {
						mode: 'append',
					},
					id: mergeNodeId,
					name: 'Merge Results',
					type: 'n8n-nodes-base.merge',
					typeVersion: 2,
					position: [1250, 300],
				},
			],
			connections: {
				// ID-based connections (linear path until switch)
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
								node: switchNodeId,
								type: 'main',
								index: 0,
							},
						],
					],
				},
				// Switch node connections (branching)
				[switchNodeId]: {
					main: [
						[
							// Output 0 (completed status)
							{
								node: pathANodeId,
								type: 'main',
								index: 0,
							},
						],
						[
							// Output 1 (other status)
							{
								node: pathBNodeId,
								type: 'main',
								index: 0,
							},
						],
					],
				},
				// Function nodes connect to merge
				[pathANodeId]: {
					main: [
						[
							{
								node: mergeNodeId,
								type: 'main',
								index: 0,
							},
						],
					],
				},
				[pathBNodeId]: {
					main: [
						[
							{
								node: mergeNodeId,
								type: 'main',
								index: 1,
							},
						],
					],
				},
				// Name-based connections (redundant but included to match working pattern)
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
								node: 'Route by Status',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Route by Status': {
					main: [
						[
							// Output 0 (completed status)
							{
								node: 'Process Completed',
								type: 'main',
								index: 0,
							},
						],
						[
							// Output 1 (other status)
							{
								node: 'Process Other',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Process Completed': {
					main: [
						[
							{
								node: 'Merge Results',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Process Other': {
					main: [
						[
							{
								node: 'Merge Results',
								type: 'main',
								index: 1,
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
		console.log('Creating a workflow with switch-based conditional branching...');
		const createdWorkflow = await manager.createWorkflow(
			workflow.name,
			workflow.nodes,
			workflow.connections,
		);

		// Log key information about the created workflow
		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		console.log(`Node count: ${createdWorkflow.nodes.length}`);

		// Save the created workflow structure for inspection
		const filename = `switch-workflow-${createdWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(createdWorkflow, null, 2));
		console.log(`\nSaved workflow structure to: ${filename}`);

		// Verify connections - focusing on the branch structure
		console.log('\nVerifying branch connections:');

		// First find the switch node
		const switchNode = createdWorkflow.nodes.find((node) => node.type === 'n8n-nodes-base.switch');
		if (switchNode) {
			console.log(`Found switch node: ${switchNode.name} (ID: ${switchNode.id})`);

			// Check what it connects to
			const switchConnections = createdWorkflow.connections[switchNode.id]?.main || [];
			switchConnections.forEach((connections, outputIndex) => {
				connections.forEach((connection) => {
					const targetNode = createdWorkflow.nodes.find((n) => n.id === connection.node) || {
						name: connection.node,
					};
					console.log(`- Switch output ${outputIndex} -> ${targetNode.name}`);
				});
			});

			// Check name-based connections too
			const nameBasedConnections = createdWorkflow.connections[switchNode.name]?.main || [];
			nameBasedConnections.forEach((connections, outputIndex) => {
				connections.forEach((connection) => {
					console.log(`- Switch output ${outputIndex} -> ${connection.node} (name-based)`);
				});
			});
		} else {
			console.log('Switch node not found in created workflow!');
		}

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
		console.log('Starting creation of a workflow with conditional branching...');

		const workflow = await createSwitchWorkflow();

		console.log('\nWorkflow created successfully!');
		console.log('This workflow includes a Switch node that branches based on status.');
		console.log('The workflow should show two paths that merge back together at the end.');
		console.log('Please check the n8n UI to verify it appears correctly.');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
