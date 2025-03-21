#!/usr/bin/env node

/**
 * Export Auction Router Workflow
 *
 * This script exports the Auction router workflow to a JSON file that can be imported into n8n.
 * It creates the workflow programmatically using the WorkflowBuilder, then saves it as JSON.
 */

const fs = require('fs');
const path = require('path');
const { buildWorkflow } = require('../workflows/routers/airtable/auction-updated');

/**
 * Export the workflow to a JSON file
 */
async function exportWorkflow() {
	try {
		console.log('Building Auction Router workflow...');

		// Get the builder object
		const builder = buildWorkflow();

		// Create the workflow JSON definition
		const workflow = {
			name: builder.workflowName,
			nodes: builder.nodes,
			connections: builder.connections,
			active: builder.active,
			settings: {
				executionOrder: 'v1',
				saveExecutionProgress: true,
				callerPolicy: 'workflowsFromSameOwner',
			},
			tags: builder.tags,
		};

		// Create the output directory if it doesn't exist
		const outputDir = path.join(__dirname, '../exports');
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Write the workflow to a JSON file
		const outputPath = path.join(outputDir, 'auction-router.json');
		fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));

		console.log(`\nWorkflow exported successfully to: ${outputPath}`);
		console.log('You can now import this file into n8n using the Import from File option.');
	} catch (error) {
		console.error('Error exporting workflow:', error);
		process.exit(1);
	}
}

// Run the export
exportWorkflow();
