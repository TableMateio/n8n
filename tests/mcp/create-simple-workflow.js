#!/usr/bin/env node

/**
 * Create Very Simple Workflow
 *
 * This script creates an extremely simple n8n workflow with just
 * a manual trigger and a simple Code node - no fancy nodes or parameters.
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');

// Configuration
const config = {
	url: 'https://127.0.0.1:5678',
	apiKey:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
};

// Create a workflow manager instance
const manager = new WorkflowManager(config.url, config.apiKey);

/**
 * Create a very simple workflow
 */
async function createSimpleWorkflow() {
	try {
		const workflowName = 'Very Simple Config';
		console.log(`Creating very simple workflow: "${workflowName}"...`);

		// Define workflow nodes
		const nodes = [
			// Manual trigger node
			{
				id: 'start',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},

			// Code node - simpler than a Function node
			{
				id: 'code',
				name: 'Config',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					code: `
// Just return a simple object
return {
  json: {
    auction_id: "24-10-onondaga-ny",
    countyName: "Onondaga",
    countyState: "NY",
    API_ENDPOINT: "https://api.example.com",
    API_KEY: "sample-key"
  }
};`,
				},
			},
		];

		// Define connections between nodes
		const connections = {
			// Connections by ID
			start: {
				main: [
					[
						{
							node: 'code',
							type: 'main',
							index: 0,
						},
					],
				],
			},

			// Connections by name
			Start: {
				main: [
					[
						{
							node: 'Config',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow with simple settings
		const workflowSettings = {
			executionOrder: 'v1',
		};

		const workflow = await manager.createWorkflow(
			workflowName,
			nodes,
			connections,
			workflowSettings,
		);

		console.log(`Successfully created simple workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log('\nTo test the workflow:');
		console.log('1. Go to the n8n UI and refresh');
		console.log('2. Open the "Very Simple Config" workflow');
		console.log('3. Click the execute button on the Start node');

		console.log('\n' + '='.repeat(50));
		console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
		console.log('='.repeat(50) + '\n');

		return workflow;
	} catch (error) {
		console.error('Error creating simple workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting very simple workflow creation...');

		const workflow = await createSimpleWorkflow();

		if (workflow) {
			console.log('Very simple workflow created successfully!');
		} else {
			console.error('Failed to create very simple workflow');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
