#!/usr/bin/env node

/**
 * N8N Workflow Cleanup Script
 *
 * This script deletes all workflows except the Test HTTP Workflow.
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

// ID of the workflow to keep
const KEEP_WORKFLOW_ID = 'f5jNVRgWdDjTl3O0'; // Test HTTP Workflow

// Create a workflow manager instance
const manager = new WorkflowManager(config.url, config.apiKey);

/**
 * Delete all workflows except for the Test HTTP Workflow
 */
async function cleanupWorkflows() {
	try {
		console.log('Listing all workflows...');
		const workflows = await manager.listWorkflows();
		console.log(`Found ${workflows.length} workflows total`);

		// Filter out the workflow to keep
		const workflowsToDelete = workflows.filter((workflow) => workflow.id !== KEEP_WORKFLOW_ID);
		console.log(
			`Will delete ${workflowsToDelete.length} workflows, keeping "${workflows.find((w) => w.id === KEEP_WORKFLOW_ID)?.name}"`,
		);

		// Confirm before deleting
		console.log('\nWorkflows to be deleted:');
		workflowsToDelete.forEach((workflow, index) => {
			console.log(`${index + 1}. ${workflow.name} (ID: ${workflow.id})`);
		});

		console.log('\nStarting deletion...');

		// Delete each workflow
		for (const workflow of workflowsToDelete) {
			console.log(`Deleting "${workflow.name}" (ID: ${workflow.id})...`);
			await manager.deleteWorkflow(workflow.id);
			console.log(`✓ "${workflow.name}" deleted`);
		}

		console.log('\nCleanup completed successfully!');
		console.log(`Deleted ${workflowsToDelete.length} workflows`);
		console.log(`Kept 1 workflow: "${workflows.find((w) => w.id === KEEP_WORKFLOW_ID)?.name}"`);

		return workflowsToDelete.length;
	} catch (error) {
		console.error('Error during cleanup:', error.message);
		throw error;
	}
}

/**
 * Run the cleanup
 */
async function run() {
	try {
		console.log('Starting workflow cleanup...');

		const deletedCount = await cleanupWorkflows();

		console.log(`\nDeleted ${deletedCount} workflows successfully!`);
		console.log('Only the Test HTTP Workflow (ID: f5jNVRgWdDjTl3O0) remains');
	} catch (error) {
		console.error('Cleanup failed:', error.message);
		console.error(error.stack);
	}
}

// Run the cleanup
run();
