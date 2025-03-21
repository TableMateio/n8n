#!/usr/bin/env node

/**
 * Create New Workflow Example
 *
 * This script demonstrates how to create a new workflow from scratch
 * using the workflow generator utilities.
 *
 * Run with:
 *   node examples/create-new-workflow.js
 */

// Try to load environment variables
try {
	require('dotenv').config({ path: '.env.mcp' });
} catch (error) {
	console.log('Note: dotenv not available, using default configuration');
}

// Import utilities
const WorkflowModifier = require('../utils/generators/workflow-modifier');
const NodeFactory = require('../utils/generators/node-factory');

// Create a modifier instance
const modifier = new WorkflowModifier();

/**
 * Creates a data processing workflow with the following steps:
 * 1. Schedule trigger - runs every hour
 * 2. HTTP Request - fetches data from an API
 * 3. Function - processes the data
 * 4. IF - checks if there are items to process
 * 5. Success path: Send to another API
 * 6. Error path: Send email notification
 */
async function createDataProcessingWorkflow() {
	console.log('Creating new data processing workflow...');

	// 1. Create the nodes

	// Schedule trigger node
	const scheduleNode = NodeFactory.createScheduleTriggerNode({
		name: 'Run Hourly',
		interval: 1,
		intervalUnit: 'hours',
	});

	// HTTP Request node
	const httpNode = NodeFactory.createHttpRequestNode({
		name: 'Fetch API Data',
		url: 'https://api.example.com/data',
		method: 'GET',
		authentication: 'none',
		responseFormat: 'json',
	});

	// Function node
	const functionNode = NodeFactory.createFunctionNode({
		name: 'Process Data',
		functionCode: `
// Get input items
const items = $input.all();

// Process each item
return items.map(item => {
  const data = item.json;

  // Add processing timestamp
  data.processedAt = new Date().toISOString();

  // Add a flag for records with high value
  data.isHighValue = data.value > 1000;

  return { json: data };
});`,
	});

	// IF node for conditional processing
	const ifNode = NodeFactory.createIfNode({
		name: 'Has Data?',
		condition: {
			leftValue: '={{ $json.length > 0 }}',
			rightValue: true,
			operator: 'equal',
		},
	});

	// HTTP Request for success path
	const successHttpNode = NodeFactory.createHttpRequestNode({
		name: 'Send To Processing API',
		url: 'https://process.example.com/submit',
		method: 'POST',
		authentication: 'none',
		sendBody: true,
		bodyParametersUi: {
			parameter: [
				{
					name: 'data',
					value: '={{ $json }}',
				},
			],
		},
		options: {
			response: {
				response: {
					fullResponse: true,
				},
			},
		},
	});

	// Email node for error path
	const emailNode = NodeFactory.createEmailSendNode({
		name: 'Send Error Email',
		fromEmail: 'alerts@example.com',
		toEmail: 'admin@example.com',
		subject: 'No Data Available - Processing Skipped',
		text: `
The scheduled data processing workflow ran at {{ $now }}, but no data was found to process.

Please check the API endpoint: https://api.example.com/data

This is an automated message.`,
	});

	// 2. Create the workflow
	const workflowData = {
		name: 'Scheduled Data Processing',
		nodes: [scheduleNode, httpNode, functionNode, ifNode, successHttpNode, emailNode],
		connections: {
			// Connect schedule to HTTP
			[scheduleNode.name]: {
				main: [
					[
						{
							node: httpNode.name,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect HTTP to Function
			[httpNode.name]: {
				main: [
					[
						{
							node: functionNode.name,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect Function to IF
			[functionNode.name]: {
				main: [
					[
						{
							node: ifNode.name,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect IF true output to success HTTP
			[ifNode.name]: {
				main: [
					[
						{
							node: successHttpNode.name,
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: emailNode.name,
							type: 'main',
							index: 0,
						},
					],
				],
			},
		},
		active: false,
		settings: {
			saveManualExecutions: true,
			callerPolicy: 'workflowsFromSameOwner',
			errorWorkflow: '',
			saveDataErrorExecution: 'all',
			saveDataSuccessExecution: 'all',
			timezone: 'America/New_York',
		},
		tags: ['automated', 'data-processing'],
	};

	// 3. Create the workflow in n8n
	const createdWorkflow = await modifier.createWorkflow(workflowData);

	console.log(`Workflow created successfully with ID: ${createdWorkflow.id}`);
	console.log(`Name: ${createdWorkflow.name}`);
	console.log(`Active: ${createdWorkflow.active}`);
	console.log(`Node count: ${createdWorkflow.nodes.length}`);

	return createdWorkflow;
}

/**
 * Activate the workflow if needed
 */
async function activateWorkflow(workflowId) {
	try {
		console.log(`Activating workflow ${workflowId}...`);
		const result = await modifier.activateWorkflow(workflowId);
		console.log('Workflow activated successfully!');
		return result;
	} catch (error) {
		console.error('Error activating workflow:', error.message);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting workflow creation process...');

		// Create the workflow
		const workflow = await createDataProcessingWorkflow();

		// Ask the user if they want to activate it
		console.log('\nWorkflow created but not active.');
		console.log('To activate it, run:');
		console.log(
			`node -e "require('./examples/create-new-workflow.js').activateWorkflow('${workflow.id}')"`,
		);

		console.log('\nView the workflow in the n8n interface:');
		console.log(`${process.env.N8N_URL || 'http://localhost:5678'}/workflow/${workflow.id}`);
	} catch (error) {
		console.error('Error creating workflow:', error.message);
		if (error.response && error.response.data) {
			console.error('Server response:', JSON.stringify(error.response.data, null, 2));
		}
	}
}

// Export the activateWorkflow function for direct calling
module.exports = { activateWorkflow };

// Run the script if called directly
if (require.main === module) {
	run();
}
