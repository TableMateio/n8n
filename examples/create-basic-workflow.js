#!/usr/bin/env node

/**
 * Basic Workflow Creation Example
 *
 * This script demonstrates how to use the WorkflowBuilder utility
 * to create a simple workflow with a trigger and HTTP request node.
 *
 * It showcases the proper creation of workflows with both ID and
 * name-based connections.
 */

require('dotenv').config({ path: '.env.mcp' });
const WorkflowBuilder = require('../utils/generators/workflow-builder');

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Utility to display a highly visible refresh notification
 */
function showRefreshNotification() {
	console.log('\n' + '='.repeat(50));
	console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
	console.log('='.repeat(50) + '\n');
}

/**
 * Creates a basic workflow using the WorkflowBuilder utility
 */
async function createBasicWorkflow() {
	try {
		console.log('Creating a basic workflow using WorkflowBuilder...');

		// Create a new workflow builder instance
		const builder = new WorkflowBuilder();

		// Method 1: Using the utility method for simple workflows
		const workflow = await builder.createBasicWorkflow({
			name: 'Basic Workflow (Builder Example)',
			triggerType: 'n8n-nodes-base.manualTrigger',
			triggerParameters: {},
			actionType: 'n8n-nodes-base.httpRequest',
			actionParameters: {
				url: 'https://jsonplaceholder.typicode.com/todos/1',
				method: 'GET',
				options: {},
			},
		});

		console.log(`Created workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Node count: ${workflow.nodes.length}`);

		// Log node details
		console.log('\nNode details:');
		workflow.nodes.forEach((node) => {
			console.log(`- Node: ${node.name} (${node.type}), ID: ${node.id}`);
		});

		// Log connection details
		console.log('\nConnection details:');
		Object.entries(workflow.connections).forEach(([sourceId, connections]) => {
			if (connections.main) {
				connections.main.forEach((outputs, outputIndex) => {
					outputs.forEach((connection) => {
						console.log(
							`- ${sourceId} -> ${connection.node} (output ${outputIndex} to input ${connection.index})`,
						);
					});
				});
			}
		});

		showRefreshNotification();
		return workflow;
	} catch (error) {
		console.error('Error creating workflow:', error.message);
		if (error.response && error.response.data) {
			console.error('Server response:', JSON.stringify(error.response.data, null, 2));
		}
		throw error;
	}
}

/**
 * Creates a more complex workflow using the builder interface
 */
async function createCustomWorkflow() {
	try {
		console.log('\nCreating a custom workflow using the builder interface...');

		// Create a new workflow builder instance
		const builder = new WorkflowBuilder();

		// Set workflow properties
		builder.setName('Custom Workflow (Builder Example)');
		builder.setActive(false);
		builder.addTags(['example', 'api']);

		// Add a trigger node
		const triggerId = builder.addNode({
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		});

		// Add a code node
		const codeId = builder.addNode({
			name: 'Process Data',
			type: 'n8n-nodes-base.code',
			typeVersion: 1,
			position: [450, 300],
			parameters: {
				mode: 'runOnceForAllItems',
				jsCode: `
// Add a timestamp to the data
const data = $input.all();
const now = new Date().toISOString();

return data.map(item => {
  item.json.processedAt = now;
  item.json.source = 'workflow-builder';
  return item;
});`,
			},
		});

		// Add an HTTP request node
		const httpId = builder.addNode({
			name: 'API Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [650, 300],
			parameters: {
				url: 'https://jsonplaceholder.typicode.com/posts',
				method: 'POST',
				options: {},
				bodyParametersJson:
					'={ "title": "WorkflowBuilder Test", "body": "This post was created by WorkflowBuilder", "userId": 1 }',
			},
		});

		// Connect the nodes
		builder.connectNodes({
			sourceNode: triggerId,
			targetNode: codeId,
		});

		builder.connectNodes({
			sourceNode: codeId,
			targetNode: httpId,
		});

		// Create the workflow
		const workflow = await builder.createWorkflow();

		console.log(`Created workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Node count: ${workflow.nodes.length}`);

		// Log node details
		console.log('\nNode details:');
		workflow.nodes.forEach((node) => {
			console.log(`- Node: ${node.name} (${node.type}), ID: ${node.id}`);
		});

		showRefreshNotification();
		return workflow;
	} catch (error) {
		console.error('Error creating custom workflow:', error.message);
		if (error.response && error.response.data) {
			console.error('Server response:', JSON.stringify(error.response.data, null, 2));
		}
		throw error;
	}
}

/**
 * Run the examples
 */
async function run() {
	try {
		console.log('Starting workflow creation examples...');

		// Create a basic workflow
		await createBasicWorkflow();

		// Create a custom workflow
		await createCustomWorkflow();

		console.log('\nWorkflow creation examples completed successfully!');
		console.log('Please check your n8n instance to see the created workflows.');

		showRefreshNotification();
	} catch (error) {
		console.error('Error running examples:', error.message);
		console.error(error.stack);
	}
}

// Run the examples
run();
