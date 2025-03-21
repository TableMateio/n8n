#!/usr/bin/env node

/**
 * Create Matching Workflow
 *
 * This script creates an n8n workflow with exactly the same structure
 * as the manually created working workflow.
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
 * Create a workflow that matches the exact structure of the working manual one
 */
async function createMatchingWorkflow() {
	try {
		const workflowName = 'Exact Manual Structure Match';
		console.log(`Creating workflow: "${workflowName}"...`);

		// Define workflow nodes with EXACT same structure as manual workflow
		const nodes = [
			// Manual trigger node with exact same name as manual workflow
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				id: 'trigger-node',
				name: "When clicking 'Test workflow'",
			},

			// Set node with exact same parameters structure as manual workflow
			{
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'a1b2c3d4-1234-5678-9abc-123456789abc', // Random ID
								name: 'auction_id',
								value: '24-10-onondaga-ny',
								type: 'string',
							},
							{
								id: 'e5f6g7h8-9012-3456-7890-abcdefabcdef', // Random ID
								name: 'API_ENDPOINT',
								value: 'https://api.example.com',
								type: 'string',
							},
						],
					},
					options: {},
				},
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4, // Using the exact same typeVersion
				position: [220, 0],
				id: 'set-node',
				name: 'Set Config Values',
			},

			// Add a simple code node that uses the values from the set node
			{
				parameters: {
					mode: 'runOnceForAllItems',
					jsCode: `
// Access the variables set in the previous node
const auction_id = $input.item.json.auction_id;
const apiEndpoint = $input.item.json.API_ENDPOINT;

// Return data with some extra properties
return {
  json: {
    auction_id,
    API_ENDPOINT: apiEndpoint,
    formattedEndpoint: apiEndpoint + "/auctions/" + auction_id,
    timestamp: new Date().toISOString()
  }
};`,
				},
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [440, 0],
				id: 'code-node',
				name: 'Process Config',
			},
		];

		// Define connections exactly as in manual workflow - by node name only
		const connections = {
			"When clicking 'Test workflow'": {
				main: [
					[
						{
							node: 'Set Config Values',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Set Config Values': {
				main: [
					[
						{
							node: 'Process Config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow with minimum settings
		const workflowSettings = {
			executionOrder: 'v1',
		};

		const workflow = await manager.createWorkflow(
			workflowName,
			nodes,
			connections,
			workflowSettings,
		);

		console.log(`Successfully created workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log('\nTo test the workflow:');
		console.log('1. Go to the n8n UI and refresh');
		console.log('2. Open the "Exact Manual Structure Match" workflow');
		console.log('3. Click the execute button on the Manual Trigger node');

		console.log('\n' + '='.repeat(50));
		console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
		console.log('='.repeat(50) + '\n');

		return workflow;
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
		console.log('Starting workflow creation with exact manual structure...');

		const workflow = await createMatchingWorkflow();

		if (workflow) {
			console.log('Workflow created successfully!');
			console.log(
				'\nThis workflow exactly matches the structure of a manually created workflow that works',
			);
			console.log('If this works, we know exactly what structure n8n requires');
		} else {
			console.error('Failed to create workflow');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
