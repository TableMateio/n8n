#!/usr/bin/env node

/**
 * Create a Working Switch Workflow
 *
 * This script creates a new workflow with a properly configured Switch node
 * based on a working example provided by the user.
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
 * Creates a new workflow with a properly configured Switch node
 */
async function createSwitchWorkflow() {
	try {
		// Define stable node IDs in UUID format
		const startNodeId = '9dd89378-5acf-4ca6-8d84-e6e64254ed02';
		const httpNodeId = '8f37a7d2-2424-4a30-b9d2-2cd448fa2299';
		const setNodeId = 'd6e23cef-3cf6-4cae-9d4e-5d49a8234d79';
		const switchNodeId = '87cf9b41-66de-49a7-aeb0-c8809191b5a0';
		const pathANodeId = 'aaaaaaaa-1111-2222-3333-444444444444';
		const pathBNodeId = 'bbbbbbbb-1111-2222-3333-444444444444';
		const mergeNodeId = 'cccccccc-1111-2222-3333-444444444444';

		// Create node objects
		const nodes = [
			// Start node (Manual Trigger)
			{
				id: startNodeId,
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},
			// HTTP Request node
			{
				id: httpNodeId,
				name: 'Get Todo',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					url: 'https://jsonplaceholder.typicode.com/todos/1',
					options: {},
				},
			},
			// Set node to add status field
			{
				id: setNodeId,
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
			},
			// Switch node to branch based on status
			{
				id: switchNodeId,
				name: 'Status Switch',
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.2, // Note the newer typeVersion from the example
				position: [850, 300],
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Completed',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											operator: {
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["status"] }}',
											rightValue: 'completed',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Not Completed',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											operator: {
												type: 'string',
												operation: 'notEquals',
											},
											leftValue: '={{ $json["status"] }}',
											rightValue: 'completed',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
			},
			// Function node for Path A (Completed)
			{
				id: pathANodeId,
				name: 'Handle Completed',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [1050, 200],
				parameters: {
					functionCode:
						'return {\n  json: {\n    result: "This item is completed!",\n    input: $input.item.json\n  }\n}',
				},
			},
			// Function node for Path B (Not Completed)
			{
				id: pathBNodeId,
				name: 'Handle Not Completed',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [1050, 400],
				parameters: {
					functionCode:
						'return {\n  json: {\n    result: "This item is NOT completed!",\n    input: $input.item.json\n  }\n}',
				},
			},
			// Merge node to combine paths
			{
				id: mergeNodeId,
				name: 'Merge Results',
				type: 'n8n-nodes-base.merge',
				typeVersion: 2,
				position: [1250, 300],
				parameters: {
					mode: 'passThrough',
					joinMode: 'mergeByPosition',
					outputDataFrom: 'input1',
					options: {},
				},
			},
		];

		// Define connections
		const connections = {
			// Connect Start to HTTP Request
			[startNodeId]: {
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
			// Connect HTTP Request to Set Status
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
			// Connect Set Status to Switch
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
			// Connect Switch outputs to respective function nodes
			[switchNodeId]: {
				main: [
					[
						{
							node: pathANodeId,
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: pathBNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect both function nodes to Merge
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
			// Also add name-based connections for better compatibility
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
							node: 'Status Switch',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Status Switch': {
				main: [
					[
						{
							node: 'Handle Completed',
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: 'Handle Not Completed',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Handle Completed': {
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
			'Handle Not Completed': {
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
		};

		// Create the workflow
		console.log('Creating new workflow with Switch node...');

		// Use the createWorkflow method correctly by passing the name as a separate parameter
		const workflowName = 'Working Switch Workflow';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		console.log(`Node count: ${createdWorkflow.nodes.length}`);

		// Save the workflow structure for inspection
		const filename = `working-switch-workflow-${createdWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(createdWorkflow, null, 2));
		console.log(`\nSaved workflow structure to: ${filename}`);

		// Log connection structure of the Switch node
		console.log('\nVerifying Switch node connections:');
		Object.entries(createdWorkflow.connections).forEach(([sourceId, connections]) => {
			if (connections.main && (sourceId === switchNodeId || sourceId === 'Status Switch')) {
				connections.main.forEach((outputs, outputIndex) => {
					outputs.forEach((connection) => {
						let targetNode;
						if (connection.node === pathANodeId || connection.node === 'Handle Completed') {
							targetNode = 'Handle Completed';
						} else if (
							connection.node === pathBNodeId ||
							connection.node === 'Handle Not Completed'
						) {
							targetNode = 'Handle Not Completed';
						}

						if (targetNode) {
							console.log(
								`- Status Switch (output ${outputIndex}) -> ${targetNode} (input ${connection.index})`,
							);
						}
					});
				});
			}
		});

		showRefreshNotification();

		return createdWorkflow;
	} catch (error) {
		console.error('Error creating workflow with Switch node:', error.message);
		console.error(error.stack);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting creation of workflow with Switch node...');

		const workflow = await createSwitchWorkflow();

		console.log('\nWorkflow created successfully!');
		console.log('The workflow includes a Switch node with two paths based on status:');
		console.log('- If status = "completed" -> Handle Completed -> Merge');
		console.log('- If status != "completed" -> Handle Not Completed -> Merge');
		console.log('\nPlease check the n8n UI to verify it appears correctly.');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
