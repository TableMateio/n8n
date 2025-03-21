#!/usr/bin/env node

/**
 * Single Source Multiple Methods
 *
 * This script creates a workflow with a single Read Configuration node
 * that branches out to multiple different methods for processing the JSON data.
 * This approach avoids file locking issues by only reading the file once.
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
 * Create a workflow with single source and multiple methods
 */
async function createSingleSourceWorkflow() {
	try {
		// Get the full path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`Creating workflow with single read node and multiple methods`);
		console.log(`Config file path: ${configFilePath}`);

		// Define all nodes
		const nodes = [
			// Main trigger and read config
			{
				id: 'main-trigger',
				name: 'Start Here',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [300, 400],
				parameters: {},
			},
			{
				id: 'read-config',
				name: 'Read Configuration',
				type: 'n8n-nodes-base.readBinaryFile',
				typeVersion: 1,
				position: [500, 400],
				parameters: {
					filePath: configFilePath,
					options: {
						encoding: 'utf8',
					},
				},
			},

			// METHOD 1: Debug Node
			{
				id: 'debug-node',
				name: 'Method 1: Debug Output',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [700, 220],
				parameters: {
					functionCode:
						'const newItem = {...$input.item};\n\n' +
						'// Add debug info\n' +
						'newItem.json = {\n' +
						'  info: "Debug Node",\n' +
						'  binaryKeys: $input.item.binary ? Object.keys($input.item.binary) : "No binary data",\n' +
						'  binaryContent: $input.item.binary && $input.item.binary.data ? \n' +
						'    $input.item.binary.data.toString("utf8").substring(0, 100) + "..." : "No content"\n' +
						'};\n\n' +
						'return newItem;',
				},
			},

			// METHOD 2: Function Node - Standard Approach
			{
				id: 'function-node',
				name: 'Method 2: Function Node',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [700, 340],
				parameters: {
					functionCode:
						'// Get the binary data and convert to JSON\n' +
						'const binaryData = $input.item.binary.data;\n' +
						'const configStr = binaryData.toString("utf8");\n' +
						'const config = JSON.parse(configStr);\n\n' +
						'// Return the config and add source info\n' +
						'return {\n' +
						'  json: {\n' +
						'    ...config,\n' +
						'    _source: "Function Node"\n' +
						'  }\n' +
						'};',
				},
			},
			{
				id: 'http-request-2',
				name: 'Method 2: API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [900, 340],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
				},
			},

			// METHOD 3: Code Node approach
			{
				id: 'code-node',
				name: 'Method 3: Code Node',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [700, 460],
				parameters: {
					mode: 'runOnceForAllItems',
					jsCode:
						'// Process all items\n' +
						'for (const item of $input.all()) {\n' +
						'  if (item.binary && item.binary.data) {\n' +
						'    // Convert binary to string and parse as JSON\n' +
						'    const configStr = Buffer.from(item.binary.data, "base64").toString("utf8");\n' +
						'    try {\n' +
						'      const config = JSON.parse(configStr);\n' +
						'      // Set the result as JSON\n' +
						'      item.json = {\n' +
						'        ...config,\n' +
						'        _source: "Code Node"\n' +
						'      };\n' +
						'    } catch (error) {\n' +
						'      item.json = { error: error.message, preview: configStr.substring(0, 100) };\n' +
						'    }\n' +
						'  } else {\n' +
						'    item.json = { error: "No binary data found" };\n' +
						'  }\n' +
						'}\n\n' +
						'return $input.all();',
				},
			},
			{
				id: 'http-request-3',
				name: 'Method 3: API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [900, 460],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
				},
			},

			// METHOD 4: Set Node direct binary parsing
			{
				id: 'set-node',
				name: 'Method 4: Set Node',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [700, 580],
				parameters: {
					values: {
						string: [
							{
								name: 'configString',
								value: '={{ $binary.data.toString() }}',
							},
							{
								name: 'apiEndpoint',
								value: '={{ JSON.parse($binary.data.toString()).apiEndpoint }}',
							},
							{
								name: 'requestMethod',
								value: '={{ JSON.parse($binary.data.toString()).requestMethod }}',
							},
							{
								name: 'requestTimeout',
								value: '={{ JSON.parse($binary.data.toString()).requestTimeout }}',
							},
							{
								name: '_source',
								value: 'Set Node',
							},
						],
					},
					options: {},
				},
			},
			{
				id: 'http-request-4',
				name: 'Method 4: API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [900, 580],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
				},
			},

			// METHOD 5: Move Binary Data Node approach
			{
				id: 'binary-data-node',
				name: 'Method 5: Move Binary Data',
				type: 'n8n-nodes-base.moveBinaryData',
				typeVersion: 1,
				position: [700, 700],
				parameters: {
					mode: 'binaryToJson',
					sourceKey: 'data',
					options: {
						jsonParse: true,
					},
				},
			},
			{
				id: 'set-source-5',
				name: 'Method 5: Set Source',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [900, 700],
				parameters: {
					values: {
						string: [
							{
								name: '_source',
								value: 'Move Binary Data Node',
							},
						],
					},
					options: {
						dotNotation: true,
					},
				},
			},
			{
				id: 'http-request-5',
				name: 'Method 5: API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [1100, 700],
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
			// Main flow connections
			'main-trigger': {
				main: [
					[
						{
							node: 'read-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'read-config': {
				main: [
					[
						{
							node: 'debug-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'function-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'code-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'set-node',
							type: 'main',
							index: 0,
						},
						{
							node: 'binary-data-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Method 2 connections
			'function-node': {
				main: [
					[
						{
							node: 'http-request-2',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Method 3 connections
			'code-node': {
				main: [
					[
						{
							node: 'http-request-3',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Method 4 connections
			'set-node': {
				main: [
					[
						{
							node: 'http-request-4',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Method 5 connections
			'binary-data-node': {
				main: [
					[
						{
							node: 'set-source-5',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'set-source-5': {
				main: [
					[
						{
							node: 'http-request-5',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Name-based connections for better compatibility
			'Start Here': {
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
							node: 'Method 1: Debug Output',
							type: 'main',
							index: 0,
						},
						{
							node: 'Method 2: Function Node',
							type: 'main',
							index: 0,
						},
						{
							node: 'Method 3: Code Node',
							type: 'main',
							index: 0,
						},
						{
							node: 'Method 4: Set Node',
							type: 'main',
							index: 0,
						},
						{
							node: 'Method 5: Move Binary Data',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Method 2: Function Node': {
				main: [
					[
						{
							node: 'Method 2: API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Method 3: Code Node': {
				main: [
					[
						{
							node: 'Method 3: API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Method 4: Set Node': {
				main: [
					[
						{
							node: 'Method 4: API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Method 5: Move Binary Data': {
				main: [
					[
						{
							node: 'Method 5: Set Source',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Method 5: Set Source': {
				main: [
					[
						{
							node: 'Method 5: API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		const workflowName = '5 Methods, 1 Source';
		const result = await manager.createWorkflow(workflowName, nodes, connections);

		// Save workflow structure to file for inspection
		const outputPath = path.join(__dirname, `single-source-workflow-${result.id}.json`);
		fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

		console.log(`Created workflow: "${result.name}" with ID: ${result.id}`);
		console.log(`Workflow contains ${nodes.length} nodes`);
		console.log(`Workflow structure saved to: ${outputPath}`);

		return result;
	} catch (error) {
		console.error('Error creating workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting creation of single source workflow with multiple methods...');

		// First check if we already have a config file
		const configPath = path.resolve(__dirname, 'workflow-config.json');
		if (!fs.existsSync(configPath)) {
			console.log('Config file not found, creating it...');

			// Create a config file if it doesn't exist
			const configData = {
				apiEndpoint: 'https://jsonplaceholder.typicode.com/todos/1',
				requestMethod: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				requestTimeout: 5000,
				enableRetries: true,
				maxRetries: 3,
				processingRules: [
					{
						field: 'title',
						operation: 'uppercase',
					},
					{
						field: 'userId',
						operation: 'multiply',
						factor: 10,
					},
				],
			};

			fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
			console.log(`Created config file at: ${configPath}`);
		}

		// Create the workflow
		const workflow = await createSingleSourceWorkflow();

		if (workflow) {
			console.log('\nCreated workflow with 5 different methods to process configuration');
			console.log(`- Name: ${workflow.name}`);
			console.log(`- ID: ${workflow.id}`);

			console.log('\nInstructions:');
			console.log('1. Go to the n8n UI and open the workflow');
			console.log('2. Execute the workflow from the "Start Here" trigger');
			console.log('3. Observe which methods successfully process the configuration');
			console.log('4. From the ones that work, select the simplest/most reliable for your needs');

			showRefreshNotification();
		} else {
			console.error('Failed to create the workflow');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
