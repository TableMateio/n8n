#!/usr/bin/env node

/**
 * Create a Workflow with Disconnected Flows
 *
 * This script creates a workflow with multiple disconnected flows:
 * 1. A manual trigger flow that gets data from an API
 * 2. A webhook trigger flow that processes incoming webhook data
 *
 * This demonstrates how to create multiple independent processes in the same workflow.
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
 * Creates a workflow with multiple disconnected flows
 */
async function createDisconnectedFlows() {
	try {
		// Define stable node IDs in UUID format for manual trigger flow
		const manualTriggerId = '11111111-0000-0000-0000-000000000001';
		const httpRequestId = '11111111-0000-0000-0000-000000000002';
		const processorId = '11111111-0000-0000-0000-000000000003';

		// Define stable node IDs for webhook flow
		const webhookTriggerId = '22222222-0000-0000-0000-000000000001';
		const filterNodeId = '22222222-0000-0000-0000-000000000002';
		const notificationId = '22222222-0000-0000-0000-000000000003';

		// Create nodes for the Manual Trigger flow
		const manualFlowNodes = [
			// Manual Trigger
			{
				id: manualTriggerId,
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},
			// HTTP Request
			{
				id: httpRequestId,
				name: 'Get Sample Data',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					url: 'https://jsonplaceholder.typicode.com/users/1',
					options: {},
				},
			},
			// Function node to process data
			{
				id: processorId,
				name: 'Process Data',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					functionCode:
						'return {\n  json: {\n    processedData: $input.item.json,\n    processedAt: new Date().toISOString()\n  }\n}',
				},
			},
		];

		// Create nodes for the Webhook flow
		const webhookFlowNodes = [
			// Webhook Trigger
			{
				id: webhookTriggerId,
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [250, 500],
				parameters: {
					path: 'incoming-data',
					options: {
						responseMode: 'lastNode',
						responseCode: 200,
					},
				},
				webhookId: 'webhook-' + Date.now(),
			},
			// Filter node
			{
				id: filterNodeId,
				name: 'Filter Valid Data',
				type: 'n8n-nodes-base.filter',
				typeVersion: 1,
				position: [450, 500],
				parameters: {
					conditions: {
						string: [
							{
								value1: '={{ $json.hasOwnProperty("data") }}',
								operation: 'equal',
								value2: 'true',
							},
						],
					},
				},
			},
			// Notification
			{
				id: notificationId,
				name: 'Send Response',
				type: 'n8n-nodes-base.respondToWebhook',
				typeVersion: 1,
				position: [650, 500],
				parameters: {
					options: {
						responseBody: '={{ {"success": true, "message": "Data received", "timestamp": $now} }}',
					},
				},
			},
		];

		// Combine all nodes
		const allNodes = [...manualFlowNodes, ...webhookFlowNodes];

		// Define connections for the manual flow
		const manualFlowConnections = {
			// Connect Manual Trigger to HTTP Request
			[manualTriggerId]: {
				main: [
					[
						{
							node: httpRequestId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect HTTP Request to Function node
			[httpRequestId]: {
				main: [
					[
						{
							node: processorId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Also add name-based connections for better compatibility
			'Manual Trigger': {
				main: [
					[
						{
							node: 'Get Sample Data',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Sample Data': {
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
		};

		// Define connections for the webhook flow
		const webhookFlowConnections = {
			// Connect Webhook to Filter
			[webhookTriggerId]: {
				main: [
					[
						{
							node: filterNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect Filter to Response node
			[filterNodeId]: {
				main: [
					[
						{
							node: notificationId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Also add name-based connections for better compatibility
			Webhook: {
				main: [
					[
						{
							node: 'Filter Valid Data',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Filter Valid Data': {
				main: [
					[
						{
							node: 'Send Response',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Combine all connections
		const allConnections = { ...manualFlowConnections, ...webhookFlowConnections };

		// Create the workflow
		console.log('Creating workflow with disconnected flows...');

		const workflowName = 'Disconnected Flows Example';
		const createdWorkflow = await manager.createWorkflow(workflowName, allNodes, allConnections);

		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		console.log(`Node count: ${createdWorkflow.nodes.length}`);

		// Save the workflow structure for inspection
		const filename = `disconnected-flows-${createdWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(createdWorkflow, null, 2));
		console.log(`\nSaved workflow structure to: ${filename}`);

		// Log flow paths for verification
		console.log('\nVerifying flow paths:');

		console.log('\nManual Flow Path:');
		console.log('- Manual Trigger -> Get Sample Data -> Process Data');

		console.log('\nWebhook Flow Path:');
		console.log('- Webhook -> Filter Valid Data -> Send Response');

		showRefreshNotification();

		return createdWorkflow;
	} catch (error) {
		console.error('Error creating workflow with disconnected flows:', error.message);
		console.error(error.stack);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting creation of workflow with disconnected flows...');

		const workflow = await createDisconnectedFlows();

		console.log('\nWorkflow created successfully!');
		console.log('The workflow contains two disconnected flows:');
		console.log('1. A manual trigger flow for fetching and processing data');
		console.log('2. A webhook flow for handling incoming webhook requests');
		console.log('\nPlease check the n8n UI to verify it appears correctly.');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
