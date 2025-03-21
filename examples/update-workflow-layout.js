#!/usr/bin/env node

/**
 * Update Workflow Layout
 *
 * This script is an example of using the new workflow utilities to
 * update the visual layout of an existing workflow in n8n.
 */

// Load environment variables
try {
	require('dotenv').config();
} catch (error) {
	console.log('dotenv not available, using environment variables as is');
}

// Import utilities
const WorkflowModifier = require('../utils/generators/workflow-modifier');
const NodeFactory = require('../utils/generators/node-factory');

// Configuration
const WORKFLOW_ID = process.env.TARGET_WORKFLOW_ID || process.argv[2];

if (!WORKFLOW_ID) {
	console.error(
		'Please provide a workflow ID as an argument or set TARGET_WORKFLOW_ID in your .env file',
	);
	process.exit(1);
}

// Create a workflow modifier instance
const modifier = new WorkflowModifier();

/**
 * Update workflow layout with a more organized structure
 */
async function updateWorkflowLayout() {
	try {
		console.log(`Updating layout for workflow ID: ${WORKFLOW_ID}`);

		// Get the current workflow
		const workflow = await modifier.manager.getWorkflow(WORKFLOW_ID);
		console.log(`Found workflow: "${workflow.name}" (ID: ${workflow.id})`);
		console.log(`Current nodes: ${workflow.nodes.length}`);

		// Generate a visual layout based on the workflow structure
		const nodePositions = calculateOptimalLayout(workflow);

		// Define layout update operation
		const operations = [
			{
				type: 'updateLayout',
				adjustments: Object.entries(nodePositions).map(([nodeName, position]) => ({
					node: nodeName,
					position,
				})),
			},
		];

		// Apply layout updates
		const updatedWorkflow = await modifier.modifyWorkflow(WORKFLOW_ID, operations);

		console.log(`Updated layout of workflow: "${updatedWorkflow.name}"`);
		console.log('Please refresh your n8n browser tab to see the changes');

		return updatedWorkflow;
	} catch (error) {
		console.error('Error updating workflow layout:', error.message);
		throw error;
	}
}

/**
 * Calculate an optimal visual layout for the workflow nodes
 *
 * This function analyzes the workflow structure and creates
 * a visually appealing layout with proper spacing and alignment.
 */
function calculateOptimalLayout(workflow) {
	// Map nodes by ID for easier lookups
	const nodeMap = workflow.nodes.reduce((map, node) => {
		map[node.id] = node;
		return map;
	}, {});

	// Identify starting nodes (nodes with no incoming connections)
	const startNodes = workflow.nodes.filter((node) => {
		return !Object.values(workflow.connections).some((connections) => {
			return Object.values(connections).some((outputs) => {
				return outputs.some((output) =>
					output.some((conn) => conn.node === node.id || conn.node === node.name),
				);
			});
		});
	});

	// Calculate node levels (how far from start)
	const nodeLevels = {};
	const processedNodes = new Set();

	function assignLevel(nodeId, level) {
		if (processedNodes.has(nodeId)) return;

		const node = nodeMap[nodeId];
		nodeLevels[node.name] = level;
		processedNodes.add(nodeId);

		// Process outgoing connections
		const outgoing = workflow.connections[nodeId]?.main || [];
		outgoing.forEach((connections) => {
			connections.forEach((conn) => {
				assignLevel(conn.node, level + 1);
			});
		});
	}

	// Assign levels starting from each start node
	startNodes.forEach((node) => assignLevel(node.id, 0));

	// Calculate horizontal positions
	const HORIZONTAL_SPACING = 200;
	const VERTICAL_SPACING = 100;
	const nodePositions = {};

	// Count nodes at each level
	const nodesPerLevel = {};
	Object.entries(nodeLevels).forEach(([nodeName, level]) => {
		if (!nodesPerLevel[level]) nodesPerLevel[level] = [];
		nodesPerLevel[level].push(nodeName);
	});

	// Position nodes by level
	Object.entries(nodesPerLevel).forEach(([level, nodeNames]) => {
		const totalWidth = nodeNames.length * HORIZONTAL_SPACING;
		const startX = totalWidth / 2;

		nodeNames.forEach((nodeName, index) => {
			const x = parseInt(level) * HORIZONTAL_SPACING + 250;
			const y = index * VERTICAL_SPACING + 300 - ((nodeNames.length - 1) * VERTICAL_SPACING) / 2;
			nodePositions[nodeName] = [x, y];
		});
	});

	return nodePositions;
}

/**
 * Run the update workflow layout operation
 */
async function run() {
	try {
		await updateWorkflowLayout();
		console.log('Layout updated successfully!');
	} catch (error) {
		console.error('Failed to update workflow layout:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

// Execute the script
run();
