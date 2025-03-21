#!/usr/bin/env node

/**
 * Workflow Modifier Example
 *
 * This script demonstrates how to use the WorkflowModifier utility
 * along with the NodeFactory to modify n8n workflows programmatically.
 */

// Try to load environment variables from .env file if dotenv is available
try {
	require('dotenv').config();
} catch (error) {
	console.log('dotenv not available, using environment variables as is');
}

const WorkflowModifier = require('../generators/workflow-modifier');
const NodeFactory = require('../generators/node-factory');

// Set up the workflow modifier with environment variables
const modifier = new WorkflowModifier();

/**
 * Example 1: Add a node at the end of a workflow
 */
async function addNodeAtEndExample(workflowId, lastNodeName) {
	console.log('Example 1: Adding a node at the end of a workflow');

	// Create a code node using NodeFactory
	const codeNode = NodeFactory.createCodeNode({
		name: 'Process Data',
		position: [850, 300],
		jsCode: `
// Process data from the previous node
const items = $input.all();
const results = items.map(item => {
  return {
    ...item.json,
    processed: true,
    timestamp: new Date().toISOString()
  };
});

return results.map(json => ({ json }));
`,
	});

	// Add the node to the workflow
	const updatedWorkflow = await modifier.addNodeAtEnd(workflowId, lastNodeName, codeNode);

	console.log(`Added node "${codeNode.name}" to workflow "${updatedWorkflow.name}"`);

	return updatedWorkflow;
}

/**
 * Example 2: Insert a node between two existing nodes
 */
async function insertNodeBetweenExample(workflowId, sourceNodeName, targetNodeName) {
	console.log('Example 2: Inserting a node between two existing nodes');

	// Create a function node using NodeFactory
	const functionNode = NodeFactory.createFunctionNode({
		name: 'Transform Data',
		position: [550, 300],
		functionCode: `
// Transform data from the previous node
const data = items[0].json;

// Add transformed fields
return [{
  json: {
    ...data,
    transformedAt: new Date().toISOString(),
    modified: true,
    note: "This item was processed by the Transform Data node"
  }
}];
`,
	});

	// Insert the node between two existing nodes
	const updatedWorkflow = await modifier.insertNodeBetween(
		workflowId,
		sourceNodeName,
		targetNodeName,
		functionNode,
	);

	console.log(
		`Inserted node "${functionNode.name}" between "${sourceNodeName}" and "${targetNodeName}"`,
	);

	return updatedWorkflow;
}

/**
 * Example 3: Add a branch with conditional logic
 */
async function addBranchExample(workflowId, sourceNodeName) {
	console.log('Example 3: Adding a branch with conditional logic');

	// Create a switch node using NodeFactory
	const switchNode = NodeFactory.createSwitchNode({
		name: 'Route by Status',
		position: [550, 300],
		typeVersion: 3.2,
		rules: [
			{
				outputKey: 'Complete',
				conditions: {
					options: { version: 2, caseSensitive: true },
					combinator: 'and',
					conditions: [
						{
							operator: { type: 'boolean', operation: 'equals' },
							leftValue: '={{ $json.completed === true }}',
							rightValue: true,
						},
					],
				},
				renameOutput: true,
			},
			{
				outputKey: 'Incomplete',
				conditions: {
					options: { version: 2, caseSensitive: true },
					combinator: 'and',
					conditions: [],
				},
				renameOutput: true,
			},
		],
	});

	// Create branch nodes using NodeFactory
	const completeNode = NodeFactory.createSetNode({
		name: 'Process Complete Items',
		position: [750, 200],
		assignments: [
			{
				name: 'status',
				type: 'string',
				value: 'complete',
			},
		],
	});

	const incompleteNode = NodeFactory.createSetNode({
		name: 'Process Incomplete Items',
		position: [750, 400],
		assignments: [
			{
				name: 'status',
				type: 'string',
				value: 'incomplete',
			},
		],
	});

	// Add the branch to the workflow
	const updatedWorkflow = await modifier.addBranch(workflowId, sourceNodeName, switchNode, [
		completeNode,
		incompleteNode,
	]);

	console.log(`Added branch with switch node "${switchNode.name}" after "${sourceNodeName}"`);

	return updatedWorkflow;
}

/**
 * Example 4: Multiple operations in one call
 */
async function multipleOperationsExample(workflowId) {
	console.log('Example 4: Applying multiple operations in one call');

	// Define the operations
	const operations = [
		{
			type: 'updateLayout',
			adjustments: [
				{ node: 'Manual Trigger', position: [250, 300] },
				{ node: 'HTTP Request', position: [450, 300] },
				{ node: 'Set', position: [650, 300] },
			],
		},
		{
			type: 'insertNode',
			source: 'HTTP Request',
			target: 'Set',
			node: NodeFactory.createFunctionNode({
				name: 'Validate Data',
				position: [550, 300],
				functionCode: `
// Validate the data from the HTTP request
const data = items[0].json;

if (!data.id) {
  throw new Error('Missing required field: id');
}

return [{
  json: {
    ...data,
    valid: true,
    validatedAt: new Date().toISOString()
  }
}];
`,
			}),
		},
	];

	// Apply all operations
	const updatedWorkflow = await modifier.modifyWorkflow(workflowId, operations);

	console.log(`Applied multiple operations to workflow "${updatedWorkflow.name}"`);

	return updatedWorkflow;
}

/**
 * Run the examples
 */
async function run() {
	try {
		// Replace with your workflow ID and node names
		const workflowId = process.env.TEST_WORKFLOW_ID || 'f5jNVRgWdDjTl3O0';
		const lastNodeName = 'Set Status';
		const sourceNodeName = 'Get Todo';
		const targetNodeName = 'Set Status';

		console.log(`Using workflow ID: ${workflowId}`);

		// Choose which example to run by uncommenting one of these lines
		// await addNodeAtEndExample(workflowId, lastNodeName);
		// await insertNodeBetweenExample(workflowId, sourceNodeName, targetNodeName);
		// await addBranchExample(workflowId, sourceNodeName);
		// await multipleOperationsExample(workflowId);

		console.log('\nWorkflow modification completed successfully!');
		console.log('Please refresh your n8n browser tab to see the changes.');
	} catch (error) {
		console.error('Error modifying workflow:', error.message);
		console.error(error.stack);
	}
}

// Run the examples
run();
