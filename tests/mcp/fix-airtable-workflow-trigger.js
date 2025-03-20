/**
 * This script adds a manual trigger node to the Dynamic Airtable Configuration workflow
 * to make it executable via the API
 */

const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');

async function addTriggerToWorkflow() {
	try {
		console.log('Adding a manual trigger node to the Dynamic Airtable Configuration workflow...');

		// Initialize workflow manager
		const workflowManager = new WorkflowManager(
			'https://127.0.0.1:5678',
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
		);

		// Get the workflow ID
		const workflowId = 'SlR4PULINjXn4p11';

		// Get the workflow
		console.log(`Getting workflow with ID ${workflowId}...`);
		const workflow = await workflowManager.getWorkflow(workflowId);
		console.log(`Found workflow: ${workflow.name}`);

		// Save the original workflow for reference
		const originalWorkflowPath = path.join(__dirname, 'original-workflow-before-trigger-fix.json');
		fs.writeFileSync(originalWorkflowPath, JSON.stringify(workflow, null, 2));
		console.log(`Original workflow saved to ${originalWorkflowPath}`);

		// Create a manual trigger node
		const triggerNode = {
			parameters: {},
			id: 'manual-trigger',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
		};

		// Add the trigger node to the beginning of the nodes array
		const updatedNodes = [triggerNode, ...workflow.nodes];

		// Update the connections to connect the trigger to the "Set Sample Auction ID" node
		const updatedConnections = {
			...workflow.connections,
			'Manual Trigger': {
				main: [
					[
						{
							node: 'Set Sample Auction ID',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the updated workflow object
		const updatedWorkflow = {
			...workflow,
			nodes: updatedNodes,
			connections: updatedConnections,
		};

		// Save the updated workflow for reference
		const fixedWorkflowPath = path.join(__dirname, 'fixed-workflow-with-trigger.json');
		fs.writeFileSync(fixedWorkflowPath, JSON.stringify(updatedWorkflow, null, 2));
		console.log(`Fixed workflow saved to ${fixedWorkflowPath}`);

		// Update the workflow in n8n
		console.log('Updating workflow in n8n...');
		await workflowManager.updateWorkflow(workflowId, updatedWorkflow);
		console.log('Workflow updated successfully!');

		// Now try to activate the workflow
		console.log('Activating the workflow...');
		try {
			await workflowManager.activateWorkflow(workflowId);
			console.log('Workflow activated successfully!');
		} catch (activateError) {
			console.error('Error activating workflow:', activateError.message);
			console.log('Workflow could not be activated, but the trigger node was added.');
		}

		console.log('Done! Please refresh your n8n browser tab to see the changes.');
	} catch (error) {
		console.error('Error adding trigger to workflow:', error);
	}
}

// Execute the function
addTriggerToWorkflow().catch((error) => {
	console.error('Error running the script:', error);
});
