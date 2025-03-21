#!/usr/bin/env node

/**
 * n8n Connection Example
 *
 * This script demonstrates how to use the N8nConnectionManager to interact with an n8n instance.
 * It covers basic operations like listing workflows, retrieving workflow details, and executing workflows.
 *
 * Usage:
 *   node examples/n8n-connection-example.js [command] [options]
 *
 * Commands:
 *   list                 List all workflows
 *   get [workflowId]     Get a specific workflow by ID
 *   execute [workflowId] Execute a workflow with optional data
 *   test-connection      Test connection to n8n
 *
 * Environment Variables:
 *   N8N_URL              URL of the n8n instance (default: http://localhost:5678)
 *   N8N_API_KEY          API key for authentication
 *   ALLOW_SELF_SIGNED    Allow self-signed certificates (default: false)
 */

const { N8nConnectionManager } = require('../utils/connection/n8n-connection');
const dotenv = require('dotenv');
const path = require('path');

// Try to load environment variables from .env.mcp file
try {
	dotenv.config({ path: path.resolve(process.cwd(), '.env.mcp') });
} catch (error) {
	console.log('No .env.mcp file found or error loading it. Using environment variables.');
}

// Configuration
const config = {
	url: process.env.N8N_URL || 'http://localhost:5678',
	apiKey: process.env.N8N_API_KEY,
	allowSelfSigned: process.env.ALLOW_SELF_SIGNED === 'true',
};

// Create connection manager
const n8n = new N8nConnectionManager(config);

/**
 * List all workflows
 */
async function listWorkflows() {
	try {
		console.log(`Listing workflows from ${config.url}...`);
		const workflows = await n8n.listWorkflows();

		console.log(`Found ${workflows.length} workflows:`);
		workflows.forEach((workflow) => {
			console.log(`- ${workflow.id}: ${workflow.name}`);
		});

		return workflows;
	} catch (error) {
		console.error('Error listing workflows:', error.message);
		process.exit(1);
	}
}

/**
 * Get a specific workflow by ID
 *
 * @param {string} workflowId - ID of the workflow to retrieve
 */
async function getWorkflow(workflowId) {
	if (!workflowId) {
		console.error('Error: Workflow ID is required');
		process.exit(1);
	}

	try {
		console.log(`Retrieving workflow ${workflowId}...`);
		const workflow = await n8n.getWorkflow(workflowId);

		console.log('Workflow details:');
		console.log(`- ID: ${workflow.id}`);
		console.log(`- Name: ${workflow.name}`);
		console.log(`- Active: ${workflow.active}`);
		console.log(`- Created: ${new Date(workflow.createdAt).toLocaleString()}`);
		console.log(`- Updated: ${new Date(workflow.updatedAt).toLocaleString()}`);
		console.log(`- Nodes: ${workflow.nodes.length}`);

		return workflow;
	} catch (error) {
		console.error(`Error retrieving workflow ${workflowId}:`, error.message);
		process.exit(1);
	}
}

/**
 * Execute a workflow
 *
 * @param {string} workflowId - ID of the workflow to execute
 * @param {object} data - Optional data to pass to the workflow
 */
async function executeWorkflow(workflowId, data = {}) {
	if (!workflowId) {
		console.error('Error: Workflow ID is required');
		process.exit(1);
	}

	try {
		console.log(`Executing workflow ${workflowId}...`);

		// Parse data from command line if provided
		let workflowData = data;
		if (typeof data === 'string') {
			try {
				workflowData = JSON.parse(data);
			} catch (e) {
				console.error('Error parsing workflow data JSON:', e.message);
				process.exit(1);
			}
		}

		const execution = await n8n.executeWorkflow(workflowId, { data: workflowData });

		console.log('Workflow execution started:');
		console.log(`- Execution ID: ${execution.id}`);
		console.log(`- Status: ${execution.status}`);

		return execution;
	} catch (error) {
		console.error(`Error executing workflow ${workflowId}:`, error.message);
		process.exit(1);
	}
}

/**
 * Test the connection to n8n
 */
async function testConnection() {
	try {
		console.log(`Testing connection to ${config.url}...`);
		const result = await n8n.testConnection();

		if (result.success) {
			console.log('✅ Connection successful!');
			if (result.version) {
				console.log(`n8n version: ${result.version}`);
			}
		} else {
			console.error('❌ Connection failed:', result.error);
			process.exit(1);
		}

		return result;
	} catch (error) {
		console.error('Error testing connection:', error.message);
		process.exit(1);
	}
}

/**
 * Main function
 */
async function main() {
	const command = process.argv[2] || 'test-connection';
	const arg = process.argv[3];
	const dataArg = process.argv[4];

	try {
		switch (command) {
			case 'list':
				await listWorkflows();
				break;

			case 'get':
				await getWorkflow(arg);
				break;

			case 'execute':
				await executeWorkflow(arg, dataArg);
				break;

			case 'test-connection':
				await testConnection();
				break;

			default:
				console.error(`Unknown command: ${command}`);
				console.log('Available commands: list, get, execute, test-connection');
				process.exit(1);
		}
	} catch (error) {
		console.error('Unexpected error:', error);
		process.exit(1);
	}
}

// Run the script
main().catch(console.error);
