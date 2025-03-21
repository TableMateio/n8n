#!/usr/bin/env node

/**
 * Create Basic Configuration Workflow
 *
 * This script creates a simplified n8n workflow with properly structured nodes
 * to demonstrate the Airtable configuration concept without any complex nodes
 * that might cause compatibility issues.
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
 * Create a basic workflow with simple n8n nodes
 */
async function createBasicWorkflow() {
	try {
		const workflowName = 'Basic Airtable Config';
		console.log(`Creating basic workflow: "${workflowName}"...`);

		// Define workflow nodes
		const nodes = [
			// Manual trigger node
			{
				id: 'start-node',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},

			// Set node for auction ID - using proper mode parameter
			{
				id: 'set-node',
				name: 'Set Auction ID',
				type: 'n8n-nodes-base.set',
				typeVersion: 2,
				position: [450, 300],
				parameters: {
					mode: 'manual', // Explicitly setting the mode to manual
					options: {},
					fields: {
						values: [
							{
								name: 'auction_id',
								type: 'string',
								value: '24-10-onondaga-ny',
							},
						],
					},
				},
			},

			// Function node to create configuration (safer than Code node)
			{
				id: 'function-node',
				name: 'Create Configuration',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					functionCode: `
// Simple function to create a configuration object
// This simulates what would come from Airtable
const data = $input.item.json || {};

// Add the configuration
return {
  json: {
    // Auction information
    auction_id: data.auction_id || "24-10-onondaga-ny",

    // County information
    countyName: "Onondaga",
    countyState: "NY",

    // System information
    systemName: "AARAuctions",
    systemWebsite: "https://aarauctions.com/auctions",

    // Configuration values
    API_ENDPOINT: "https://api.example.com/v1/auctions",
    API_KEY: "test-api-key-12345",
    INVESTABILITY_THRESHOLD: 5000
  }
};
                    `,
				},
			},

			// No Operation node to show final result
			{
				id: 'noop-node',
				name: 'Final Result',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [850, 300],
				parameters: {},
				notes: 'This is the final configuration that would be used for API requests',
			},
		];

		// Define connections between nodes - both by ID and name
		const connections = {
			// Connections by ID
			'start-node': {
				main: [
					[
						{
							node: 'set-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'set-node': {
				main: [
					[
						{
							node: 'function-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'function-node': {
				main: [
					[
						{
							node: 'noop-node',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Connections by name (this is important for n8n)
			'Manual Trigger': {
				main: [
					[
						{
							node: 'Set Auction ID',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Set Auction ID': {
				main: [
					[
						{
							node: 'Create Configuration',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Create Configuration': {
				main: [
					[
						{
							node: 'Final Result',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow with all needed settings
		const workflowSettings = {
			executionOrder: 'v1',
			saveManualExecutions: true,
			callerPolicy: 'workflowsFromSameOwner',
			errorWorkflow: '',
			timezone: 'America/New_York',
		};

		const workflow = await manager.createWorkflow(
			workflowName,
			nodes,
			connections,
			workflowSettings,
		);

		console.log(`Successfully created basic workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log('\nTo test the workflow:');
		console.log('1. Go to the n8n UI and refresh');
		console.log('2. Open the "Basic Airtable Config" workflow');
		console.log('3. Click the execute button on the Manual Trigger node');
		console.log('4. Check each node to ensure it runs correctly');

		console.log('\n' + '='.repeat(50));
		console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
		console.log('='.repeat(50) + '\n');

		return workflow;
	} catch (error) {
		console.error('Error creating basic workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting basic workflow creation...');

		const workflow = await createBasicWorkflow();

		if (workflow) {
			console.log('Basic workflow created successfully!');
			console.log(
				'\nThis workflow demonstrates a simplified version of the Airtable configuration concept:',
			);
			console.log('1. Start with a manual trigger');
			console.log('2. Set a sample auction ID');
			console.log('3. Create a configuration object (simulating what would come from Airtable)');
			console.log('4. Display the final configuration that would be used for API requests');

			console.log(
				'\nOnce this basic workflow is confirmed working, we can add Airtable integration.',
			);
		} else {
			console.error('Failed to create basic workflow');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
