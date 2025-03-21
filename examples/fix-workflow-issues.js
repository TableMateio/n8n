#!/usr/bin/env node

/**
 * Fix Workflow Issues Example
 *
 * This script demonstrates how to use the WorkflowFixer utility
 * to fix common issues in n8n workflows.
 *
 * Run with:
 *   node examples/fix-workflow-issues.js <workflow-id> [fix-types...]
 *
 * Example:
 *   node examples/fix-workflow-issues.js f5jNVRgWdDjTl3O0 set paths binary
 */

// Try to load environment variables
try {
	require('dotenv').config({ path: '.env.mcp' });
} catch (error) {
	console.log('Note: dotenv not available, using default configuration');
}

// Import utilities
const WorkflowFixer = require('../utils/generators/workflow-fixer');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
	console.error('Usage: node fix-workflow-issues.js <workflow-id> [fix-types...]');
	console.error('Available fix types: binary, paths, set, connections, all');
	process.exit(1);
}

const workflowId = args[0];
let fixTypes = args.slice(1);

// If no fix types specified or 'all' is specified, apply all fix types
if (fixTypes.length === 0 || fixTypes.includes('all')) {
	fixTypes = ['binary', 'paths', 'set', 'connections'];
	console.log('Applying all available fix types');
} else {
	console.log(`Applying specified fix types: ${fixTypes.join(', ')}`);
}

// Create a workflow fixer instance
const fixer = new WorkflowFixer();

/**
 * Fix the specified workflow with the requested fix types
 */
async function fixWorkflow() {
	try {
		console.log(`Starting to fix workflow with ID: ${workflowId}`);

		// Configure fix options - add any custom settings here
		const options = {
			basePath: process.cwd(), // Base path for resolving relative file paths
			verbose: true, // Enable detailed logging
		};

		// Apply the fixes
		const updatedWorkflow = await fixer.applyFixes(workflowId, fixTypes, options);

		console.log('\nWorkflow fix summary:');
		console.log(`- Workflow ID: ${updatedWorkflow.id}`);
		console.log(`- Workflow Name: ${updatedWorkflow.name}`);
		console.log(`- Node Count: ${updatedWorkflow.nodes.length}`);
		console.log(`- Connection Count: ${countConnections(updatedWorkflow.connections)}`);

		console.log('\n🔄 PLEASE REFRESH YOUR N8N BROWSER TAB TO SEE THE CHANGES 🔄');
		console.log(
			`View workflow at: ${process.env.N8N_URL || 'http://localhost:5678'}/workflow/${updatedWorkflow.id}`,
		);

		return updatedWorkflow;
	} catch (error) {
		console.error('Error fixing workflow:', error.message);
		if (error.response && error.response.data) {
			console.error('Server response:', JSON.stringify(error.response.data, null, 2));
		}
		process.exit(1);
	}
}

/**
 * Count the number of connections in a workflow
 */
function countConnections(connections) {
	let count = 0;

	Object.entries(connections).forEach(([sourceId, sourceConnections]) => {
		Object.entries(sourceConnections).forEach(([type, outputs]) => {
			outputs.forEach((connections) => {
				count += connections.length;
			});
		});
	});

	return count;
}

/**
 * Run individual fixes for demonstration purposes
 */
async function demonstrateIndividualFixes() {
	try {
		// Only run this if explicitly asked to demonstrate all fixes separately
		if (!fixTypes.includes('demo')) return;

		console.log('\n=== DEMONSTRATING INDIVIDUAL FIXES ===\n');

		// 1. Fix binary expressions
		console.log('1. Fixing binary expressions:');
		await fixer.fixBinaryExpressions(workflowId);

		// 2. Fix file paths
		console.log('\n2. Fixing file paths:');
		await fixer.fixConfigPaths(workflowId, { basePath: process.cwd() });

		// 3. Fix Set nodes
		console.log('\n3. Fixing Set nodes:');
		await fixer.fixSetNodes(workflowId);

		// 4. Fix connections
		console.log('\n4. Fixing connections:');
		await fixer.fixConnections(workflowId);

		console.log('\nAll individual fixes demonstrated');
	} catch (error) {
		console.error('Error in fix demonstration:', error.message);
	}
}

/**
 * Main function to run the script
 */
async function run() {
	await fixWorkflow();

	// Uncomment to run the demonstration
	// await demonstrateIndividualFixes();
}

// Run the script
run();
