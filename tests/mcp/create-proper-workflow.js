#!/usr/bin/env node

/**
 * Create Proper N8N Workflow Example
 *
 * This script creates a new workflow from scratch with proper connection structure,
 * based on the Proper_N8N_Connections.json example.
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
 * Creates a new proper workflow with correct connection structure
 */
async function createProperWorkflow() {
	try {
		// Define a basic workflow with 3 nodes
		// Based on the structure from Proper_N8N_Connections.json
		const workflow = {
			name: 'Proper Connection Workflow',
			nodes: [
				{
					parameters: {},
					id: 'start_node',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [250, 300],
				},
				{
					parameters: {
						url: 'https://jsonplaceholder.typicode.com/todos/1',
						options: {},
					},
					id: 'http_node',
					name: 'Get Todo',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [450, 300],
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
					id: 'set_node',
					name: 'Set Status',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [650, 300],
				},
			],
			connections: {
				// ID-based connections
				start_node: {
					main: [
						[
							{
								node: 'http_node',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				http_node: {
					main: [
						[
							{
								node: 'set_node',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				// Name-based connections
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
			},
			active: false,
			settings: {
				executionOrder: 'v1',
			},
		};

		// Create the workflow
		console.log('Creating new workflow with proper connection structure...');
		const createdWorkflow = await manager.createWorkflow(
			workflow.name,
			workflow.nodes,
			workflow.connections,
		);

		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		console.log(`Node count: ${createdWorkflow.nodes.length}`);

		// Now add a conditional branch to this new workflow
		const workflowId = createdWorkflow.id;

		// Create a timestamp for unique IDs
		const timestamp = Date.now();

		// Define our Switch node
		const switchNode = {
			id: 'switch_node',
			name: 'Route by Status',
			type: 'n8n-nodes-base.switch',
			typeVersion: 1,
			position: [850, 300],
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
						{
							operation: 'equal',
							value1: '={{$json["status"]}}',
							value2: 'incomplete',
						},
					],
				},
				fallbackOutput: '2',
				options: {},
			},
		};

		// Define the "Completed" path node
		const completedNode = {
			id: 'completed_node',
			name: 'Handle Completed',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [1050, 200],
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
		};

		// Define the "Incomplete" path node
		const incompleteNode = {
			id: 'incomplete_node',
			name: 'Handle Incomplete',
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			position: [1050, 400],
			parameters: {
				functionCode: `// Process incomplete status
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
		};

		// Define the merge node
		const mergeNode = {
			id: 'merge_node',
			name: 'Merge Results',
			type: 'n8n-nodes-base.merge',
			typeVersion: 2,
			position: [1250, 300],
			parameters: {
				mode: 'append',
			},
		};

		// Update connections to include the switch branch
		const updatedNodes = [
			...createdWorkflow.nodes,
			switchNode,
			completedNode,
			incompleteNode,
			mergeNode,
		];

		// Set node should now connect to Switch node instead of being an endpoint
		const updatedConnections = {
			...createdWorkflow.connections,
			// Update Set Status to connect to the Switch node
			// ID-based
			set_node: {
				main: [
					[
						{
							node: 'switch_node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Name-based
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
			// Connect Switch node to the conditional paths
			// ID-based
			switch_node: {
				main: [
					[
						// Output 0 (completed)
						{
							node: 'completed_node',
							type: 'main',
							index: 0,
						},
					],
					[
						// Output 1 (incomplete)
						{
							node: 'incomplete_node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Name-based
			'Route by Status': {
				main: [
					[
						// Output 0 (completed)
						{
							node: 'Handle Completed',
							type: 'main',
							index: 0,
						},
					],
					[
						// Output 1 (incomplete)
						{
							node: 'Handle Incomplete',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect path nodes to Merge node
			// ID-based
			completed_node: {
				main: [
					[
						{
							node: 'merge_node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			incomplete_node: {
				main: [
					[
						{
							node: 'merge_node',
							type: 'main',
							index: 1,
						},
					],
				],
			},
			// Name-based
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
			'Handle Incomplete': {
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

		// Update the workflow with our conditional branch
		console.log('Adding conditional branch to the workflow...');
		const updatedWorkflow = await manager.updateWorkflow(workflowId, {
			name: workflow.name,
			nodes: updatedNodes,
			connections: updatedConnections,
		});

		console.log(`Updated workflow: "${updatedWorkflow.name}" (ID: ${updatedWorkflow.id})`);
		console.log(`New node count: ${updatedWorkflow.nodes.length}`);

		showRefreshNotification();

		return updatedWorkflow;
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
		console.log('Starting to create a new workflow with proper connections...');

		const workflow = await createProperWorkflow();

		console.log('\nWorkflow created successfully!');
		console.log('The workflow includes a proper conditional branch using a Switch node.');
		console.log('The workflow structure follows the recommended n8n connection format.');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
