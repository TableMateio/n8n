#!/usr/bin/env node

/**
 * Fix Configuration Workflow
 *
 * This script updates the unified configuration workflow to use the absolute path
 * to the workflow-config.json file and adds debug outputs to help troubleshoot.
 *
 * NOTE: This is a legacy script kept for reference. For new applications,
 * consider implementing similar functionality using the WorkflowFixer utility
 * in utils/generators/workflow-fixer.js, which provides a more general and
 * maintainable approach to fixing workflows.
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
 * Fix the unified workflow
 */
async function fixWorkflow() {
	try {
		// Get the workflow ID - replace with your actual workflow ID
		const workflowId = 'y9BQAYsDKnnBJ6A5';

		// Get the current workflow
		const workflow = await manager.getWorkflow(workflowId);

		if (!workflow) {
			console.error(`Workflow with ID ${workflowId} not found.`);
			return null;
		}

		console.log(`Fixing workflow: "${workflow.name}" (ID: ${workflowId})`);

		// Get the absolute path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`Config file absolute path: ${configFilePath}`);

		// Create a debug node that we'll add to each flow
		const debugNodeTemplate = {
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			parameters: {
				functionCode:
					'// Add the input data to the output\n' +
					'const newItem = {...$input.item};\n\n' +
					'// Add debug information\n' +
					'newItem.json.debug = {\n' +
					'  binary: $input.item.binary ? Object.keys($input.item.binary) : "No binary data",\n' +
					'  binaryContent: $input.item.binary && $input.item.binary.data ? $input.item.binary.data.toString("utf8").substring(0, 100) + "..." : "No content"\n' +
					'};\n\n' +
					'return newItem;',
			},
		};

		// Update all Read Binary File nodes to use the absolute path
		const updatedNodes = workflow.nodes.map((node) => {
			if (node.type === 'n8n-nodes-base.readBinaryFile') {
				return {
					...node,
					parameters: {
						...node.parameters,
						filePath: configFilePath,
					},
				};
			}

			return node;
		});

		// Add debug outputs to each flow
		let nodesToAdd = [];
		let connectionsToAdd = {};

		// Add debug outputs for Function Node Approach (Flow 1)
		const flow1DebugNode = {
			...debugNodeTemplate,
			id: 'v1-debug',
			name: 'Approach 1: Debug Output',
			position: [400, 200],
		};

		nodesToAdd.push(flow1DebugNode);
		connectionsToAdd['v1-read-config'] = {
			main: [
				[
					{
						node: 'v1-debug',
						type: 'main',
						index: 0,
					},
				],
			],
		};
		connectionsToAdd['v1-debug'] = {
			main: [
				[
					{
						node: 'v1-parse-config',
						type: 'main',
						index: 0,
					},
				],
			],
		};
		connectionsToAdd['Approach 1: Read Configuration'] = {
			main: [
				[
					{
						node: 'Approach 1: Debug Output',
						type: 'main',
						index: 0,
					},
				],
			],
		};
		connectionsToAdd['Approach 1: Debug Output'] = {
			main: [
				[
					{
						node: 'Approach 1: Parse Config (Function)',
						type: 'main',
						index: 0,
					},
				],
			],
		};

		// Update the workflow
		const updatedWorkflow = {
			...workflow,
			nodes: [...updatedNodes, ...nodesToAdd],
			connections: {
				...workflow.connections,
				...connectionsToAdd,
			},
		};

		// Save the updated workflow
		const result = await manager.updateWorkflow(workflowId, updatedWorkflow);

		console.log(`Updated workflow: "${result.name}"`);
		console.log(`Workflow now contains ${result.nodes.length} nodes`);

		return result;
	} catch (error) {
		console.error('Error fixing workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting workflow fix...');

		// Fix the workflow
		const workflow = await fixWorkflow();

		if (workflow) {
			console.log('\nSuccessfully fixed the workflow');
			console.log('\nTo test the workflow:');
			console.log('1. Go to the n8n UI and open the unified workflow');
			console.log('2. Test each approach');
			console.log('3. Check the debug output to see the binary data');

			showRefreshNotification();
		} else {
			console.error('Failed to fix the workflow');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
