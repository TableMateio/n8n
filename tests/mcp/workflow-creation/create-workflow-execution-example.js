#!/usr/bin/env node

/**
 * Workflow Execution Example
 *
 * This script creates two workflows:
 * 1. A "callee" workflow that performs a specific task
 * 2. A "caller" workflow that executes the callee workflow
 *
 * This demonstrates how to create modular, reusable workflows in n8n.
 */

// Disable SSL certificate validation for localhost development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const WorkflowManager = require('./workflow-manager');
const fs = require('fs');

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
 * Creates a simple callee workflow that will be executed by another workflow
 */
async function createCalleeWorkflow() {
	try {
		// Define stable node IDs in UUID format
		const triggerNodeId = 'cccccccc-0000-0000-0000-000000000001';
		const dataProcessorId = 'cccccccc-0000-0000-0000-000000000002';
		const formatterNodeId = 'cccccccc-0000-0000-0000-000000000003';

		// Create nodes for the workflow
		const nodes = [
			// Manual trigger
			{
				id: triggerNodeId,
				name: 'When Called',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},
			// Function node to process input data
			{
				id: dataProcessorId,
				name: 'Process Input',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					functionCode:
						'const inputData = $input.item.json;\n\n' +
						'// Add a timestamp and processing flag\n' +
						'return {\n' +
						'  json: {\n' +
						'    ...inputData,\n' +
						'    processed: true,\n' +
						'    processedAt: new Date().toISOString(),\n' +
						'    message: "Data processed by callee workflow"\n' +
						'  }\n' +
						'}',
				},
			},
			// Set node to format the response
			{
				id: formatterNodeId,
				name: 'Format Result',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					values: {
						string: [
							{
								name: 'status',
								value: 'success',
							},
						],
					},
					options: {},
				},
			},
		];

		// Define connections
		const connections = {
			// Connect trigger to function node
			[triggerNodeId]: {
				main: [
					[
						{
							node: dataProcessorId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect function node to set node
			[dataProcessorId]: {
				main: [
					[
						{
							node: formatterNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Name-based connections for better compatibility
			'When Called': {
				main: [
					[
						{
							node: 'Process Input',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Process Input': {
				main: [
					[
						{
							node: 'Format Result',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		console.log('Creating callee workflow...');

		const workflowName = 'Reusable Process Workflow';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created callee workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		console.log(`Node count: ${createdWorkflow.nodes.length}`);

		// Save the workflow structure for inspection
		const filename = `callee-workflow-${createdWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(createdWorkflow, null, 2));
		console.log(`\nSaved callee workflow structure to: ${filename}`);

		return createdWorkflow;
	} catch (error) {
		console.error('Error creating callee workflow:', error.message);
		console.error(error.stack);
		throw error;
	}
}

/**
 * Creates a caller workflow that executes another workflow
 */
async function createCallerWorkflow(calleeWorkflowId) {
	try {
		// Define stable node IDs in UUID format
		const triggerNodeId = 'eeeeeeee-0000-0000-0000-000000000001';
		const dataNodeId = 'eeeeeeee-0000-0000-0000-000000000002';
		const executeWorkflowId = 'eeeeeeee-0000-0000-0000-000000000003';
		const resultNodeId = 'eeeeeeee-0000-0000-0000-000000000004';

		// Create nodes for the workflow
		const nodes = [
			// Manual trigger
			{
				id: triggerNodeId,
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},
			// Set node to prepare data for the sub-workflow
			{
				id: dataNodeId,
				name: 'Prepare Data',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [450, 300],
				parameters: {
					values: {
						string: [
							{
								name: 'data',
								value: 'sample data',
							},
							{
								name: 'timestamp',
								value: '={{ $now }}',
							},
						],
						number: [
							{
								name: 'id',
								value: 12345,
							},
						],
					},
					options: {},
				},
			},
			// Execute Workflow node to call the other workflow
			{
				id: executeWorkflowId,
				name: 'Execute Process Workflow',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1,
				position: [650, 300],
				parameters: {
					workflowId: calleeWorkflowId,
					options: {},
				},
			},
			// Function node to process the result from the executed workflow
			{
				id: resultNodeId,
				name: 'Handle Result',
				type: 'n8n-nodes-base.function',
				typeVersion: 1,
				position: [850, 300],
				parameters: {
					functionCode:
						'// Get the result from the executed workflow\n' +
						'const result = $input.item.json;\n\n' +
						'// Add our own information\n' +
						'return {\n' +
						'  json: {\n' +
						'    ...result,\n' +
						'    handledBy: "caller workflow",\n' +
						'    finalTimestamp: new Date().toISOString(),\n' +
						'    summary: `Successfully processed data with ID ${result.id}`\n' +
						'  }\n' +
						'}',
				},
			},
		];

		// Define connections
		const connections = {
			// Connect trigger to set node
			[triggerNodeId]: {
				main: [
					[
						{
							node: dataNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect set node to execute workflow node
			[dataNodeId]: {
				main: [
					[
						{
							node: executeWorkflowId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Connect execute workflow node to function node
			[executeWorkflowId]: {
				main: [
					[
						{
							node: resultNodeId,
							type: 'main',
							index: 0,
						},
					],
				],
			},
			// Name-based connections for better compatibility
			Start: {
				main: [
					[
						{
							node: 'Prepare Data',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Prepare Data': {
				main: [
					[
						{
							node: 'Execute Process Workflow',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Execute Process Workflow': {
				main: [
					[
						{
							node: 'Handle Result',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the workflow
		console.log('\nCreating caller workflow...');

		const workflowName = 'Workflow Execution Example';
		const createdWorkflow = await manager.createWorkflow(workflowName, nodes, connections);

		console.log(`Created caller workflow: "${createdWorkflow.name}" (ID: ${createdWorkflow.id})`);
		console.log(`Node count: ${createdWorkflow.nodes.length}`);

		// Save the workflow structure for inspection
		const filename = `caller-workflow-${createdWorkflow.id}.json`;
		fs.writeFileSync(filename, JSON.stringify(createdWorkflow, null, 2));
		console.log(`\nSaved caller workflow structure to: ${filename}`);

		return createdWorkflow;
	} catch (error) {
		console.error('Error creating caller workflow:', error.message);
		console.error(error.stack);
		throw error;
	}
}

/**
 * Run the script
 */
async function run() {
	try {
		console.log('Starting creation of workflow execution example...');

		// First create the callee workflow
		const calleeWorkflow = await createCalleeWorkflow();

		// Then create the caller workflow that executes the callee
		const callerWorkflow = await createCallerWorkflow(calleeWorkflow.id);

		console.log('\nBoth workflows created successfully!');
		console.log(`Callee workflow ID: ${calleeWorkflow.id}`);
		console.log(`Caller workflow ID: ${callerWorkflow.id}`);

		console.log('\nTo test the workflow execution:');
		console.log('1. Go to the n8n UI and open the "Workflow Execution Example" workflow');
		console.log('2. Click on "Execute Workflow" to run it');
		console.log('3. The workflow will call the "Reusable Process Workflow"');
		console.log('4. Check the execution results to see the data passing between workflows');

		showRefreshNotification();
	} catch (error) {
		console.error('Creation failed:', error.message);
		console.error(error.stack);
	}
}

// Run the script
run();
