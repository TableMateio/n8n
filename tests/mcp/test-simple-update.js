#!/usr/bin/env node

/**
 * Simple workflow update test
 *
 * This script attempts to create a workflow and then update just its name,
 * to isolate and understand what properties the n8n API expects.
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

async function testSimpleUpdate() {
	try {
		console.log('=== Starting Simple Update Test ===\n');

		// Step 1: Create a basic workflow with just a manual trigger
		console.log('Step 1: Creating a basic workflow');

		const triggerNodeId = `trigger_${Date.now()}`;

		const triggerNode = {
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
			id: triggerNodeId,
			name: 'Start Workflow',
		};

		const workflow = await manager.createWorkflow('Simple Update Test', [triggerNode], {});

		console.log(`Created workflow: ${workflow.name} (ID: ${workflow.id})`);

		// Let's examine what properties are in the workflow object
		console.log('\nWorkflow object keys:', Object.keys(workflow));

		// Step 2: Try to update just the name
		console.log('\nStep 2: Updating workflow name');

		// Log what we're about to send
		const updateData = {
			name: `${workflow.name} - Updated`,
		};
		console.log('Update data:', updateData);

		// Try the update
		const updatedWorkflow = await manager.updateWorkflow(workflow.id, updateData);

		console.log(`Updated workflow name to: ${updatedWorkflow.name}`);

		console.log('\n=== Test completed successfully ===');
	} catch (error) {
		console.error('Test failed:', error.message);
		console.error(error.stack);
	}
}

// Run the test
testSimpleUpdate();
