#!/usr/bin/env node

/**
 * Create Test Manual Trigger Workflow
 *
 * This script creates a minimal n8n workflow with just a manual trigger
 * and a NoOp node to test if we can get the trigger working correctly.
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
 * Create a simple workflow with just a manual trigger
 */
async function createTestWorkflow() {
	try {
		const workflowName = 'Test Manual Trigger';
		console.log(`Creating test workflow: "${workflowName}"...`);

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

			// No operation node - just a placeholder
			{
				id: 'noop',
				name: 'NoOp',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [450, 300],
				parameters: {},
			},
		];

		// Define connections between nodes
		const connections = {
			// Connection from start node ID
			start: {
				main: [
					[
						{
							node: 'noop',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connection from start node name
			Start: {
				main: [
					[
						{
							node: 'NoOp',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		const workflow = await manager.createWorkflow(workflowName, nodes, connections);

		// Make sure workflow is active
		const activeWorkflow = {
			...workflow,
			active: true,
		};

		await manager.updateWorkflow(workflow.id, activeWorkflow);

		console.log(`Successfully created test workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log('\nTo test the workflow:');
		console.log('1. Go to the n8n UI and refresh');
		console.log('2. Open the "Test Manual Trigger" workflow');
		console.log('3. Try clicking the execute button on the manual trigger node');

		console.log('\n' + '='.repeat(50));
		console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
		console.log('='.repeat(50) + '\n');

		return workflow;
	} catch (error) {
		console.error('Error creating test workflow:', error.message);
		console.error(error.stack);
		return null;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting test manual trigger workflow creation...');

		const workflow = await createTestWorkflow();

		if (workflow) {
			console.log('Test workflow created successfully!');
		} else {
			console.error('Failed to create test workflow');
		}
	} catch (error) {
		console.error('Script execution failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
