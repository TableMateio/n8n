#!/usr/bin/env node

/**
 * Fix All Configuration Paths
 *
 * This script updates all Read Configuration nodes in the unified workflow
 * to use the correct absolute path to the configuration file.
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
 * Fix all configuration file paths in the workflow
 */
async function fixWorkflowPaths() {
	try {
		// Get the workflow ID - replace with your actual workflow ID
		const workflowId = 'y9BQAYsDKnnBJ6A5';

		// Get the current workflow
		const workflow = await manager.getWorkflow(workflowId);

		if (!workflow) {
			console.error(`Workflow with ID ${workflowId} not found.`);
			return null;
		}

		console.log(`Fixing paths in workflow: "${workflow.name}" (ID: ${workflowId})`);

		// Get the absolute path to the configuration file
		const configFilePath = path.resolve(__dirname, 'workflow-config.json');
		console.log(`Config file absolute path: ${configFilePath}`);

		// Update all Read Binary File nodes to use the absolute path
		let readFileNodesCount = 0;
		const updatedNodes = workflow.nodes.map((node) => {
			if (node.type === 'n8n-nodes-base.readBinaryFile') {
				readFileNodesCount++;
				console.log(`Updating path for node: "${node.name}"`);
				console.log(`  - Original path: ${node.parameters.filePath}`);

				// Update the node with the absolute path
				const updatedNode = {
					...node,
					parameters: {
						...node.parameters,
						filePath: configFilePath,
					},
				};

				console.log(`  - New path: ${updatedNode.parameters.filePath}`);
				return updatedNode;
			}

			return node;
		});

		// Update the workflow
		const updatedWorkflow = {
			...workflow,
			nodes: updatedNodes,
		};

		// Save the updated workflow
		const result = await manager.updateWorkflow(workflowId, updatedWorkflow);

		console.log(`\nUpdated workflow: "${result.name}"`);
		console.log(`Updated ${readFileNodesCount} Read Configuration nodes`);

		return result;
	} catch (error) {
		console.error('Error fixing workflow paths:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting workflow path fix...');

		// Fix all paths in the workflow
		const workflow = await fixWorkflowPaths();

		if (workflow) {
			console.log('\nSuccessfully fixed all configuration file paths');
			console.log('\nTo test the workflow:');
			console.log('1. Go to the n8n UI and open the unified workflow');
			console.log('2. Test each approach by running the workflow from each trigger node');
			console.log('3. All approaches should now work correctly');

			showRefreshNotification();
		} else {
			console.error('Failed to fix the workflow paths');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
