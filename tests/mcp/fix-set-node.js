/**
 * This script fixes the "Set Sample Auction ID" node in the Dynamic Airtable Configuration workflow
 * by updating its configuration to be compatible with the current n8n version.
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');

async function fixSetNode() {
	console.log('Fixing the Set node in the Dynamic Airtable Configuration workflow...');

	// Initialize workflow manager with proper parameters
	const workflowManager = new WorkflowManager(
		'https://127.0.0.1:5678',
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
	);

	// Target the specific workflow by ID
	const workflowId = 'SlR4PULINjXn4p11'; // Dynamic Airtable Configuration ID
	console.log(`Targeting workflow with ID: ${workflowId}`);

	// Get full workflow details
	const workflowDetails = await workflowManager.getWorkflow(workflowId);

	if (!workflowDetails) {
		console.error(`Could not find workflow with ID: ${workflowId}`);
		return;
	}

	console.log(`Found workflow: ${workflowDetails.name} (ID: ${workflowDetails.id})`);

	// Save original workflow for reference
	const originalFilePath = path.join(__dirname, 'original-workflow-before-set-fix.json');
	fs.writeFileSync(originalFilePath, JSON.stringify(workflowDetails, null, 2));
	console.log(`Original workflow saved to: ${originalFilePath}`);

	// Create a copy of the workflow to modify
	const fixedWorkflow = JSON.parse(JSON.stringify(workflowDetails));

	// Find the Set node
	const setNode = fixedWorkflow.nodes.find((n) => n.name === 'Set Sample Auction ID');

	if (!setNode) {
		console.error('Could not find "Set Sample Auction ID" node.');
		return;
	}

	console.log(`Found Set node: ${setNode.name} (ID: ${setNode.id})`);

	// Modern format for the Set node (typeVersion 3.4)
	// Update the node with improved configuration
	setNode.typeVersion = 3.4; // Use the latest version

	// Use the assignments collection format for newer versions
	setNode.parameters = {
		mode: 'manual',
		includeOtherFields: true,
		include: 'all',
		assignments: {
			assignments: [
				{
					name: 'auction_id',
					type: 'string',
					value: '24-10-onondaga-ny',
				},
			],
		},
	};

	console.log('Updated Set node configuration to typeVersion 3.4');

	// Save fixed workflow to file for reference
	const fixedFilePath = path.join(__dirname, 'fixed-workflow-with-set-node-update.json');
	fs.writeFileSync(fixedFilePath, JSON.stringify(fixedWorkflow, null, 2));
	console.log(`Fixed workflow saved to: ${fixedFilePath}`);

	// Update the workflow in n8n
	try {
		const result = await workflowManager.updateWorkflow(workflowId, fixedWorkflow);
		console.log(`Successfully updated workflow with ID: ${result.id}`);
		console.log('Please refresh your n8n browser tab to see the changes');
	} catch (error) {
		console.error('Error updating workflow:', error);
		console.log('You can manually import the fixed workflow from the JSON file');
	}

	return fixedWorkflow;
}

// Execute the function
fixSetNode().catch((error) => {
	console.error('Error running the script:', error);
});
