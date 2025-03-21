/**
 * Fixes the Dynamic Airtable Configuration workflow by removing the problematic API Request node
 * and replacing it with a reliable Function node
 */
const fs = require('fs');
const path = require('path');
const WorkflowManager = require('./workflow-manager');

async function fixApiRequestNode() {
	console.log('Fixing the Dynamic Airtable Configuration workflow...');

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
	const originalFilePath = path.join(__dirname, 'original-workflow-before-fix.json');
	fs.writeFileSync(originalFilePath, JSON.stringify(workflowDetails, null, 2));
	console.log(`Original workflow saved to: ${originalFilePath}`);

	// Create a copy of the workflow to modify
	const fixedWorkflow = JSON.parse(JSON.stringify(workflowDetails));

	// 1. Find and remove the problematic "Example API Request" node
	const apiRequestNode = fixedWorkflow.nodes.find((n) => n.name === 'Example API Request');
	const apiRequestIndex = apiRequestNode ? fixedWorkflow.nodes.indexOf(apiRequestNode) : -1;

	if (apiRequestIndex !== -1) {
		console.log(`Removing problematic node: ${apiRequestNode.name}`);
		fixedWorkflow.nodes.splice(apiRequestIndex, 1);

		// Also remove from connections
		if (fixedWorkflow.connections['Example API Request']) {
			delete fixedWorkflow.connections['Example API Request'];
		}

		// Remove node ID connection too
		if (apiRequestNode.id && fixedWorkflow.connections[apiRequestNode.id]) {
			delete fixedWorkflow.connections[apiRequestNode.id];
		}
	} else {
		console.log('Could not find "Example API Request" node to remove.');
		// List all nodes for debugging
		console.log('Available nodes:');
		fixedWorkflow.nodes.forEach((node) => {
			console.log(`- ${node.name} (type: ${node.type})`);
		});
	}

	// 2. Find the Format Configuration node to connect to our new node
	const formatConfigNode = fixedWorkflow.nodes.find((n) => n.name === 'Format Configuration');

	if (!formatConfigNode) {
		console.log('Could not find "Format Configuration" node.');
		return;
	}

	// 3. Create a new Display Config function node as a replacement
	const newPosition = [
		apiRequestNode && apiRequestNode.position ? apiRequestNode.position[0] : 1450,
		apiRequestNode && apiRequestNode.position ? apiRequestNode.position[1] : 300,
	];

	const displayConfigNode = {
		id: `display-config-${Date.now()}`,
		name: 'Display Config',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: newPosition,
		parameters: {
			functionCode: `
// This node shows the formatted configuration without trying to make external API calls
const config = $input.item.json;

// Add a timestamp to show this is the new version
config._timestamp = new Date().toISOString();
config._info = "Configuration is ready to use";

return {
  json: config
};
`,
		},
	};

	// 4. Add the new node to the workflow
	fixedWorkflow.nodes.push(displayConfigNode);
	console.log(`Added new "Display Config" function node to replace API Request node`);

	// 5. Update connections to point Format Configuration to our new Display Config node
	if (formatConfigNode) {
		// Connect Format Configuration to Display Config
		if (!fixedWorkflow.connections[formatConfigNode.id]) {
			fixedWorkflow.connections[formatConfigNode.id] = { main: [[]] };
		} else if (!fixedWorkflow.connections[formatConfigNode.id].main) {
			fixedWorkflow.connections[formatConfigNode.id].main = [[]];
		}

		fixedWorkflow.connections[formatConfigNode.id].main[0] = [
			{
				node: displayConfigNode.id,
				type: 'main',
				index: 0,
			},
		];

		// Also add name-based connection
		if (!fixedWorkflow.connections['Format Configuration']) {
			fixedWorkflow.connections['Format Configuration'] = { main: [[]] };
		} else if (!fixedWorkflow.connections['Format Configuration'].main) {
			fixedWorkflow.connections['Format Configuration'].main = [[]];
		}

		fixedWorkflow.connections['Format Configuration'].main[0] = [
			{
				node: 'Display Config',
				type: 'main',
				index: 0,
			},
		];
		console.log(`Updated connections from "Format Configuration" to "Display Config"`);
	}

	// 6. Find Final Result node and connect our Display Config to it
	const finalResultNode = fixedWorkflow.nodes.find((n) => n.name === 'Final Result');

	if (finalResultNode) {
		// Connect Display Config to Final Result
		if (!fixedWorkflow.connections[displayConfigNode.id]) {
			fixedWorkflow.connections[displayConfigNode.id] = { main: [[]] };
		} else if (!fixedWorkflow.connections[displayConfigNode.id].main) {
			fixedWorkflow.connections[displayConfigNode.id].main = [[]];
		}

		fixedWorkflow.connections[displayConfigNode.id].main[0] = [
			{
				node: finalResultNode.id,
				type: 'main',
				index: 0,
			},
		];

		// Also add name-based connection
		if (!fixedWorkflow.connections['Display Config']) {
			fixedWorkflow.connections['Display Config'] = { main: [[]] };
		} else if (!fixedWorkflow.connections['Display Config'].main) {
			fixedWorkflow.connections['Display Config'].main = [[]];
		}

		fixedWorkflow.connections['Display Config'].main[0] = [
			{
				node: 'Final Result',
				type: 'main',
				index: 0,
			},
		];
		console.log(`Updated connections from "Display Config" to "Final Result"`);
	} else {
		console.log('Could not find "Final Result" node');
	}

	// Save fixed workflow to file for reference
	const fixedFilePath = path.join(__dirname, 'fixed-dynamic-airtable-workflow.json');
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
fixApiRequestNode()
	.then(() => console.log('Workflow fix completed successfully'))
	.catch((err) => console.error('Error fixing workflow:', err));
