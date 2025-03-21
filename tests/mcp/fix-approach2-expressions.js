#!/usr/bin/env node

/**
 * Fix Approach 2 Expressions
 *
 * This script updates the expressions in the HTTP Request node for Approach 2
 * to correctly access the binary data from the configuration file.
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
 * Fix the expressions in Approach 2's HTTP Request node
 */
async function fixApproach2Expressions() {
	try {
		// Get the workflow ID - replace with your actual workflow ID
		const workflowId = 'y9BQAYsDKnnBJ6A5';

		// Get the current workflow
		const workflow = await manager.getWorkflow(workflowId);

		if (!workflow) {
			console.error(`Workflow with ID ${workflowId} not found.`);
			return null;
		}

		console.log(`Fixing expressions in workflow: "${workflow.name}" (ID: ${workflowId})`);

		// Find the Approach 2 HTTP Request node
		const approach2HttpNode = workflow.nodes.find(
			(node) => node.name === 'Approach 2: Make API Request' || node.id === 'v2-http-request',
		);

		if (!approach2HttpNode) {
			console.error('Could not find the HTTP Request node for Approach 2');
			return null;
		}

		console.log(
			`Found HTTP Request node: "${approach2HttpNode.name}" (ID: ${approach2HttpNode.id})`,
		);
		console.log('Current expressions:');
		console.log(`  - URL: ${approach2HttpNode.parameters.url}`);
		console.log(`  - Method: ${approach2HttpNode.parameters.method}`);

		// Update the node with the fixed expressions
		const updatedNodes = workflow.nodes.map((node) => {
			if (node.id === approach2HttpNode.id) {
				// Try a simpler syntax that might work better
				const updatedNode = {
					...node,
					parameters: {
						...node.parameters,
						url: '={{ JSON.parse($input.item.binary.data.toString()).apiEndpoint }}',
						method: '={{ JSON.parse($input.item.binary.data.toString()).requestMethod }}',
						options: {
							...node.parameters.options,
							timeout: '={{ JSON.parse($input.item.binary.data.toString()).requestTimeout }}',
						},
					},
				};

				console.log('Updated expressions:');
				console.log(`  - URL: ${updatedNode.parameters.url}`);
				console.log(`  - Method: ${updatedNode.parameters.method}`);

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

		return result;
	} catch (error) {
		console.error('Error fixing expressions:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting expression fix...');

		// Fix expressions in Approach 2
		const workflow = await fixApproach2Expressions();

		if (workflow) {
			console.log('\nSuccessfully fixed expressions in Approach 2');
			console.log('\nTo test the workflow:');
			console.log('1. Go to the n8n UI and open the unified workflow');
			console.log(
				'2. Test Approach 2 by running the workflow from the "Approach 2: Direct Expression - Start" trigger',
			);
			console.log('3. It should now work correctly');

			showRefreshNotification();
		} else {
			console.error('Failed to fix expressions');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
