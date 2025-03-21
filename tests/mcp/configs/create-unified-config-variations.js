#!/usr/bin/env node

/**
 * Unified Configuration Workflow with Multiple Approaches
 *
 * This script creates a single workflow with four disconnected flows,
 * each demonstrating a different approach to handle reading from a config file.
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
 * Create a unified workflow with all variations
 */
async function createUnifiedWorkflow() {
	try {
		// Get the full path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`Creating unified workflow with multiple approaches`);

		// Define all nodes with unique IDs
		const nodes = [
			// VARIATION 1: Function Node Approach
			// -----------------------------------
			{
				id: 'v1-trigger',
				name: 'Approach 1: Function Node - Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			},
			{
				id: 'v1-read-config',
				name: 'Approach 1: Read Configuration',
				type: 'n8n-nodes-base.readBinaryFile',
				typeVersion: 1,
				position: [300, 100],
				parameters: {
					filePath: configFilePath,
					options: {
						encoding: 'utf8',
					},
				},
			},
			{
				id: 'v1-parse-config',
				name: 'Approach 1: Parse Config (Function)',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [500, 100],
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
			{
				id: 'v1-http-request',
				name: 'Approach 1: Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [700, 100],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
				},
			},

			// VARIATION 2: Direct Expression Approach
			// --------------------------------------
			{
				id: 'v2-trigger',
				name: 'Approach 2: Direct Expression - Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [100, 300],
				parameters: {},
			},
			{
				id: 'v2-read-config',
				name: 'Approach 2: Read Configuration',
				type: 'n8n-nodes-base.readBinaryFile',
				typeVersion: 1,
				position: [300, 300],
				parameters: {
					filePath: configFilePath,
					options: {
						encoding: 'utf8',
					},
				},
			},
			{
				id: 'v2-http-request',
				name: 'Approach 2: Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [500, 300],
				parameters: {
					url: '={{ JSON.parse($binary.data.toString()).apiEndpoint }}',
					method: '={{ JSON.parse($binary.data.toString()).requestMethod }}',
					options: {
						timeout: '={{ JSON.parse($binary.data.toString()).requestTimeout }}',
					},
				},
			},

			// VARIATION 3: Code Node Approach
			// ------------------------------
			{
				id: 'v3-trigger',
				name: 'Approach 3: Code Node - Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [100, 500],
				parameters: {},
			},
			{
				id: 'v3-read-config',
				name: 'Approach 3: Read Configuration',
				type: 'n8n-nodes-base.readBinaryFile',
				typeVersion: 1,
				position: [300, 500],
				parameters: {
					filePath: configFilePath,
					options: {
						encoding: 'utf8',
					},
				},
			},
			{
				id: 'v3-parse-config',
				name: 'Approach 3: Parse Config (Code)',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [500, 500],
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
			{
				id: 'v3-http-request',
				name: 'Approach 3: Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [700, 500],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
				},
			},

			// VARIATION 4: Move Binary Data Approach
			// ------------------------------------
			{
				id: 'v4-trigger',
				name: 'Approach 4: JSON Node - Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [100, 700],
				parameters: {},
			},
			{
				id: 'v4-read-config',
				name: 'Approach 4: Read Configuration',
				type: 'n8n-nodes-base.readBinaryFile',
				typeVersion: 1,
				position: [300, 700],
				parameters: {
					filePath: configFilePath,
					options: {
						encoding: 'utf8',
					},
				},
			},
			{
				id: 'v4-convert',
				name: 'Approach 4: Convert to JSON',
				type: 'n8n-nodes-base.moveBinaryData',
				typeVersion: 1,
				position: [500, 700],
				parameters: {
					mode: 'binaryToJson',
					sourceKey: 'data',
					options: {
						jsonParse: true,
					},
				},
			},
			{
				id: 'v4-http-request',
				name: 'Approach 4: Make API Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [700, 700],
				parameters: {
					url: '={{ $json.apiEndpoint }}',
					method: '={{ $json.requestMethod }}',
					options: {
						timeout: '={{ $json.requestTimeout }}',
					},
				},
			},
		];

		// Define connections for each flow independently
		const connections = {
			// Variation 1 connections
			'v1-trigger': {
				main: [
					[
						{
							node: 'v1-read-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'v1-read-config': {
				main: [
					[
						{
							node: 'v1-parse-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'v1-parse-config': {
				main: [
					[
						{
							node: 'v1-http-request',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Variation 2 connections
			'v2-trigger': {
				main: [
					[
						{
							node: 'v2-read-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'v2-read-config': {
				main: [
					[
						{
							node: 'v2-http-request',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Variation 3 connections
			'v3-trigger': {
				main: [
					[
						{
							node: 'v3-read-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'v3-read-config': {
				main: [
					[
						{
							node: 'v3-parse-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'v3-parse-config': {
				main: [
					[
						{
							node: 'v3-http-request',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Variation 4 connections
			'v4-trigger': {
				main: [
					[
						{
							node: 'v4-read-config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'v4-read-config': {
				main: [
					[
						{
							node: 'v4-convert',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'v4-convert': {
				main: [
					[
						{
							node: 'v4-http-request',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Name-based connections for better compatibility
			'Approach 1: Function Node - Start': {
				main: [
					[
						{
							node: 'Approach 1: Read Configuration',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 1: Read Configuration': {
				main: [
					[
						{
							node: 'Approach 1: Parse Config (Function)',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 1: Parse Config (Function)': {
				main: [
					[
						{
							node: 'Approach 1: Make API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 2: Direct Expression - Start': {
				main: [
					[
						{
							node: 'Approach 2: Read Configuration',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 2: Read Configuration': {
				main: [
					[
						{
							node: 'Approach 2: Make API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 3: Code Node - Start': {
				main: [
					[
						{
							node: 'Approach 3: Read Configuration',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 3: Read Configuration': {
				main: [
					[
						{
							node: 'Approach 3: Parse Config (Code)',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 3: Parse Config (Code)': {
				main: [
					[
						{
							node: 'Approach 3: Make API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 4: JSON Node - Start': {
				main: [
					[
						{
							node: 'Approach 4: Read Configuration',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 4: Read Configuration': {
				main: [
					[
						{
							node: 'Approach 4: Convert to JSON',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Approach 4: Convert to JSON': {
				main: [
					[
						{
							node: 'Approach 4: Make API Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		const workflowName = 'Config Approaches - All in One';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		// Save workflow structure to file for inspection
		const outputPath = path.join(__dirname, `unified-config-workflow-${createdWorkflow.id}.json`);
		fs.writeFileSync(outputPath, JSON.stringify(createdWorkflow, null, 2));

		console.log(
			`Created unified workflow: "${createdWorkflow.name}" with ID: ${createdWorkflow.id}`,
		);
		console.log(`Workflow contains ${nodes.length} nodes`);
		console.log(`Workflow structure saved to: ${outputPath}`);

		return createdWorkflow;
	} catch (error) {
		console.error('Error creating unified workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script to create the unified workflow
 */
async function run() {
	try {
		console.log('Starting creation of configurable workflow with multiple approaches...');

		// First try to delete existing workflows with similar names
		try {
			await manager.deleteWorkflowsByPartialName('Config Variation');
			await manager.deleteWorkflowsByPartialName('Config Approaches');
			console.log('Deleted existing similar workflows.');
		} catch (err) {
			console.log('No existing workflows found or could not delete: ', err.message);
		}

		// Create the unified workflow
		const workflow = await createUnifiedWorkflow();

		if (workflow) {
			console.log('\nCreated unified workflow with multiple approaches');
			console.log(`- Name: ${workflow.name}`);
			console.log(`- ID: ${workflow.id}`);

			console.log('\nTo test the workflow approaches:');
			console.log('1. Go to the n8n UI and open the unified workflow');
			console.log('2. Test each approach by running the workflow from each trigger node');
			console.log('3. Determine which approach works best for your needs');

			showRefreshNotification();
		} else {
			console.error('Failed to create the unified workflow');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
