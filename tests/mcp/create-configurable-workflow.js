#!/usr/bin/env node

/**
 * Configurable Workflow Example
 *
 * This script creates a workflow that reads configuration from an external JSON file
 * and utilizes those variables to customize the workflow behavior.
 *
 * Key features:
 * - External configuration file
 * - File read node to load configuration
 * - Dynamic behavior based on configuration values
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');
const fs = require('fs');
const path = require('path');

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
 * Creates a workflow that uses external configuration
 */
async function createConfigurableWorkflow() {
	try {
		// Get the full path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`Using configuration from: ${configFilePath}`);

		// Ensure the config file exists
		if (!fs.existsSync(configFilePath)) {
			throw new Error(`Configuration file not found: ${configFilePath}`);
		}

		// Define stable node IDs in UUID format
		const triggerNodeId = 'aaaaaaaa-0000-0000-0000-000000000001';
		const readConfigNodeId = 'aaaaaaaa-0000-0000-0000-000000000002';
		const httpNodeId = 'aaaaaaaa-0000-0000-0000-000000000003';
		const processorNodeId = 'aaaaaaaa-0000-0000-0000-000000000004';
		const notifyNodeId = 'aaaaaaaa-0000-0000-0000-000000000005';

		// Create nodes for the workflow
		const nodes = [
			// Manual trigger
			{
				id: triggerNodeId,
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},
			// Read config file node
			{
				id: readConfigNodeId,
				name: 'Read Configuration',
				type: 'n8n-nodes-base.readBinaryFile',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					filePath: configFilePath,
					options: {
						encoding: 'utf8',
					},
				},
			},
			// HTTP Request node with dynamic configuration
			{
				id: httpNodeId,
				name: 'Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					url: '={{ JSON.parse($binary["data"]["toString"]("utf8")).apiEndpoint }}',
					method: '={{ JSON.parse($binary["data"]["toString"]("utf8")).requestMethod }}',
					options: {
						timeout: '={{ JSON.parse($binary["data"]["toString"]("utf8")).requestTimeout }}',
					},
				},
			},
			// Function node to apply configuration-based rules
			{
				id: processorNodeId,
				name: 'Apply Processing Rules',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [850, 300],
				parameters: {
					functionCode:
						'// Parse the configuration file content\n' +
						'const rawData = $items[0].binary.data.toString("utf8");\n' +
						'const config = JSON.parse(rawData);\n\n' +
						'// Get API data from the previous node\n' +
						'const apiData = $items[1].json;\n\n' +
						'// Apply processing rules from config\n' +
						'return {\n' +
						'  json: {\n' +
						'    ...apiData,\n' +
						'    assigned: config.processingRules.assignTo,\n' +
						'    priority: config.processingRules.priority,\n' +
						'    processed: true,\n' +
						'    processedAt: new Date().toISOString(),\n' +
						'    statusField: config.statusField,\n' +
						'    statusValue: config.statusValue\n' +
						'  }\n' +
						'}',
				},
			},
			// Conditional notification based on config
			{
				id: notifyNodeId,
				name: 'Send Notification',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [1050, 300],
				parameters: {
					customPropertyString: [
						{
							name: 'subject',
							value: 'Task processed successfully',
						},
						{
							name: 'recipient',
							value:
								'={{ JSON.parse($items[0].binary.data.toString("utf8")).processingRules.notifyEmail }}',
						},
						{
							name: 'message',
							value:
								'={{ `Task ${$items[1].json.id} has been processed with ${$items[1].json.priority} priority and assigned to ${$items[1].json.assigned}.` }}',
						},
					],
				},
			},
		];

		// Define connections
		const connections = {
			// Connect trigger to Read Config File node
			[triggerNodeId]: {
				main: [
					[
						{
							node: readConfigNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect Read Config File to HTTP Request node
			[readConfigNodeId]: {
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
			// Connect HTTP Request to Function node
			[httpNodeId]: {
				main: [
					[
						{
							node: processorNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect Function node to Notification node
			[processorNodeId]: {
				main: [
					[
						{
							node: notifyNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Name-based connections for better compatibility
			Start: {
				main: [
					[
						{
							node: 'Read Configuration',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Read Configuration': {
				main: [
					[
						{
							node: 'Make API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Make API Request': {
				main: [
					[
						{
							node: 'Apply Processing Rules',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Apply Processing Rules': {
				main: [
					[
						{
							node: 'Send Notification',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		console.log('Creating configurable workflow...');

		const workflowName = 'Configurable Workflow Example';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		console.log(`Node count: ${createdWorkflow.nodes.length}`);

		// Save the workflow structure for inspection
		const filename = `configurable-workflow-${createdWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(createdWorkflow, null, 2));
		console.log(`\nSaved workflow structure to: ${filename}`);

		return createdWorkflow;
	} catch (error) {
		console.error('Error creating configurable workflow:', error.message);
		console.error(error.stack);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting creation of configurable workflow...');

		const workflow = await createConfigurableWorkflow();

		console.log('\nWorkflow created successfully!');
		console.log('\nTo test the workflow:');
		console.log('1. Go to the n8n UI and open the "Configurable Workflow Example"');
		console.log('2. Click "Execute Workflow" to run it');
		console.log('3. The workflow will read configuration from the external file');
		console.log('4. Observe how the workflow behavior is determined by the configuration');
		console.log(
			'\nYou can modify the configuration file and re-run the workflow to see the changes',
		);
		console.log('Configuration file path: tests/mcp/workflow-config.json');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
