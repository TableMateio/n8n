#!/usr/bin/env node

/**
 * Configuration Workflow Variations
 *
 * This script creates multiple variations of a workflow that reads from a config file,
 * each using a different approach to handle the binary data conversion to JSON.
 * These variations will help determine which approach works best in n8n.
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
 * Variation 1: Using Function Node to parse JSON before HTTP Request
 */
async function createVariation1() {
	try {
		// Get the full path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`Variation 1: Using Function Node to parse JSON`);

		// Define stable node IDs in UUID format
		const triggerNodeId = 'v1-aaaaa-0000-0000-0000-000000000001';
		const readConfigNodeId = 'v1-aaaaa-0000-0000-0000-000000000002';
		const jsonParserNodeId = 'v1-aaaaa-0000-0000-0000-000000000003';
		const httpNodeId = 'v1-aaaaa-0000-0000-0000-000000000004';

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
			// Function node to parse JSON configuration
			{
				id: jsonParserNodeId,
				name: 'Parse Config',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					functionCode:
						'// Get the binary data and convert to JSON object\n' +
						'const configStr = $input.item.binary.data.toString("utf8");\n' +
						'const config = JSON.parse(configStr);\n\n' +
						'// Return the config as a JSON object\n' +
						'return {\n' +
						'  json: config\n' +
						'};',
				},
			},
			// HTTP Request node with simpler references
			{
				id: httpNodeId,
				name: 'Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [850, 300],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
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
			// Connect Read Config to Parse Config node
			[readConfigNodeId]: {
				main: [
					[
						{
							node: jsonParserNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect Parse Config to HTTP Request node
			[jsonParserNodeId]: {
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
							node: 'Parse Config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Parse Config': {
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
		};

		// Create the workflow
		const workflowName = 'Config Variation 1 - Function Node';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		return createdWorkflow;
	} catch (error) {
		console.error('Error creating variation 1:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Variation 2: Using simpler expression syntax
 */
async function createVariation2() {
	try {
		// Get the full path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`\nVariation 2: Using simpler expression syntax`);

		// Define stable node IDs in UUID format
		const triggerNodeId = 'v2-aaaaa-0000-0000-0000-000000000001';
		const readConfigNodeId = 'v2-aaaaa-0000-0000-0000-000000000002';
		const httpNodeId = 'v2-aaaaa-0000-0000-0000-000000000003';

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
			// HTTP Request node with simpler expression
			{
				id: httpNodeId,
				name: 'Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					url: '={{ JSON.parse($binary.data.toString()).apiEndpoint }}',
					method: '={{ JSON.parse($binary.data.toString()).requestMethod }}',
					options: {
						timeout: '={{ JSON.parse($binary.data.toString()).requestTimeout }}',
					},
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
			// Connect Read Config to HTTP Request node
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
		};

		// Create the workflow
		const workflowName = 'Config Variation 2 - Simple Expression';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		return createdWorkflow;
	} catch (error) {
		console.error('Error creating variation 2:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Variation 3: Using Code node (newer alternative to Function node)
 */
async function createVariation3() {
	try {
		// Get the full path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`\nVariation 3: Using Code node`);

		// Define stable node IDs in UUID format
		const triggerNodeId = 'v3-aaaaa-0000-0000-0000-000000000001';
		const readConfigNodeId = 'v3-aaaaa-0000-0000-0000-000000000002';
		const codeNodeId = 'v3-aaaaa-0000-0000-0000-000000000003';
		const httpNodeId = 'v3-aaaaa-0000-0000-0000-000000000004';

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
			// Code node (newer alternative to Function)
			{
				id: codeNodeId,
				name: 'Parse Config',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					mode: 'runOnceForAllItems',
					jsCode:
						'// Get the binary data and convert to JSON object\n' +
						'for (const item of $input.all()) {\n' +
						'  const binaryData = item.binary.data;\n' +
						'  const configStr = Buffer.from(binaryData, "base64").toString("utf8");\n' +
						'  const config = JSON.parse(configStr);\n\n' +
						'  // Return the config as a JSON object\n' +
						'  item.json = config;\n' +
						'}\n\n' +
						'return $input.all();',
				},
			},
			// HTTP Request node with simpler references
			{
				id: httpNodeId,
				name: 'Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [850, 300],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
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
			// Connect Read Config to Code node
			[readConfigNodeId]: {
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
			// Connect Code node to HTTP Request node
			[codeNodeId]: {
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
							node: 'Parse Config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Parse Config': {
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
		};

		// Create the workflow
		const workflowName = 'Config Variation 3 - Code Node';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		return createdWorkflow;
	} catch (error) {
		console.error('Error creating variation 3:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Variation 4: Using a JSON node to parse binary data directly
 */
async function createVariation4() {
	try {
		// Get the full path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`\nVariation 4: Using a JSON node`);

		// Define stable node IDs in UUID format
		const triggerNodeId = 'v4-aaaaa-0000-0000-0000-000000000001';
		const readConfigNodeId = 'v4-aaaaa-0000-0000-0000-000000000002';
		const jsonNodeId = 'v4-aaaaa-0000-0000-0000-000000000003';
		const httpNodeId = 'v4-aaaaa-0000-0000-0000-000000000004';

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
			// Move Binary Data node to convert to JSON
			{
				id: jsonNodeId,
				name: 'Convert to JSON',
				type: 'n8n-nodes-base.moveBinaryData',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					mode: 'jsonToBinary',
					sourceKey: '={{ $binary.data.toString("utf8") }}',
					options: {
						jsonParse: true,
					},
				},
			},
			// HTTP Request node with simpler references
			{
				id: httpNodeId,
				name: 'Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [850, 300],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
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
			// Connect Read Config to JSON node
			[readConfigNodeId]: {
				main: [
					[
						{
							node: jsonNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect JSON node to HTTP Request node
			[jsonNodeId]: {
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
							node: 'Convert to JSON',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Convert to JSON': {
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
		};

		// Create the workflow
		const workflowName = 'Config Variation 4 - JSON Node';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		return createdWorkflow;
	} catch (error) {
		console.error('Error creating variation 4:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script to create all workflow variations
 */
async function run() {
	try {
		console.log('Starting creation of configurable workflow variations...');

		// Create all variations
		const workflow1 = await createVariation1();
		const workflow2 = await createVariation2();
		const workflow3 = await createVariation3();
		const workflow4 = await createVariation4();

		// Show successful workflows
		console.log('\nCreated workflow variations:');
		if (workflow1) console.log(`- Variation 1: ${workflow1.name} (ID: ${workflow1.id})`);
		if (workflow2) console.log(`- Variation 2: ${workflow2.name} (ID: ${workflow2.id})`);
		if (workflow3) console.log(`- Variation 3: ${workflow3.name} (ID: ${workflow3.id})`);
		if (workflow4) console.log(`- Variation 4: ${workflow4.name} (ID: ${workflow4.id})`);

		console.log('\nTo test the workflow variations:');
		console.log('1. Go to the n8n UI and try each workflow');
		console.log('2. See which variation works correctly with the JSON configuration');
		console.log('3. Use that approach in your future workflows');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
