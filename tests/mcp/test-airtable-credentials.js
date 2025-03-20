/**
 * This script tests if Airtable credentials are working correctly
 * and checks if we can retrieve data from a specific table
 */

const WorkflowManager = require('./workflow-manager');
const axios = require('axios');

// Reference the Airtable IDs
const AIRTABLE = {
	BASE_ID: 'appWxxzsTHMY0MZHu',
	TABLES: {
		AUCTIONS: 'tblteK8SeHqZ8xQxV',
	},
	FIELD_IDS: {
		AUCTION: {
			PRIMARY_FIELD: 'fld7zoOS3uQg4tiyh', // auction_id
		},
	},
};

/**
 * Tests if Airtable credentials are working correctly
 */
async function testAirtableCredentials() {
	console.log('Testing Airtable credentials...');

	try {
		// Initialize workflow manager
		const workflowManager = new WorkflowManager(
			'https://127.0.0.1:5678',
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
		);

		// First, check if we have the "Airtable" credential stored
		console.log('Checking if Airtable credential exists...');
		const credentials = await workflowManager.getCredentials();
		const airtableCredential = credentials.find((cred) => cred.name === 'Airtable');

		if (!airtableCredential) {
			console.error('Error: Airtable credential not found!');
			console.log(
				'Please create an Access Token credential named "Airtable" for the Airtable node to use.',
			);
			return;
		}

		console.log(`Found Airtable credential with ID: ${airtableCredential.id}`);

		// Test direct access to Airtable API using the base and table IDs
		console.log(`\nTesting direct data retrieval from Airtable...`);
		console.log(
			`Attempting to retrieve records from table ${AIRTABLE.TABLES.AUCTIONS} in base ${AIRTABLE.BASE_ID}`,
		);

		// Try to test the credential by creating a simple workflow
		console.log('\nCreating a test workflow to check Airtable access...');
		const testWorkflowName = 'Airtable Credential Test';

		// Create a simple workflow with a manual trigger and Airtable node
		const testNodes = [
			// Manual trigger
			{
				parameters: {},
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
			},
			// Airtable node to list records
			{
				parameters: {
					resource: 'record',
					operation: 'list',
					application: 'airtable',
					base: {
						__rl: true,
						value: AIRTABLE.BASE_ID,
						mode: 'list',
						cachedResultName: 'Tax Surplus',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}`,
					},
					table: {
						__rl: true,
						value: AIRTABLE.TABLES.AUCTIONS,
						mode: 'list',
						cachedResultName: 'Auctions',
						cachedResultUrl: `https://airtable.com/${AIRTABLE.BASE_ID}/${AIRTABLE.TABLES.AUCTIONS}`,
					},
					options: {},
				},
				name: 'Get Auctions',
				type: 'n8n-nodes-base.airtable',
				typeVersion: 2,
				position: [450, 300],
				credentials: {
					airtableTokenApi: {
						id: airtableCredential.id,
						name: 'Airtable',
					},
				},
			},
		];

		const testConnections = {
			'Manual Trigger': {
				main: [
					[
						{
							node: 'Get Auctions',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		};

		// Create the test workflow
		const createdWorkflow = await workflowManager.createWorkflow(
			testWorkflowName,
			testNodes,
			testConnections,
		);

		console.log(`Test workflow created with ID: ${createdWorkflow.id}`);

		// Try to execute the workflow to test the credential
		console.log('\nExecuting the test workflow...');
		try {
			const execution = await workflowManager.executeWorkflow(createdWorkflow.id);
			console.log(`Execution started with ID: ${execution.id}`);

			// Poll for execution results
			console.log('Waiting for execution to complete...');
			let executionData;
			let attempts = 0;
			const maxAttempts = 10;

			while (attempts < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
				try {
					executionData = await workflowManager.getExecutionData(execution.id);
					if (executionData.finished) {
						break;
					}
				} catch (err) {
					console.log('Execution still in progress...');
				}
				attempts++;
			}

			if (!executionData || !executionData.finished) {
				console.error('Execution timed out or failed to complete');
				return;
			}

			// Check if there were any errors in the execution
			const hasErrors = executionData.data.resultData.error !== undefined;
			if (hasErrors) {
				console.error('Execution completed with errors:');
				console.error(executionData.data.resultData.error);
				console.log('\nCredential test FAILED! The Airtable node is not functioning correctly.');
				return;
			}

			// Check if we got data back
			const airtableNodeOutput = executionData.data.resultData.runData['Get Auctions'][0].data;
			if (airtableNodeOutput && airtableNodeOutput.length > 0) {
				console.log(`\nCredential test SUCCESSFUL!`);
				console.log(`Retrieved ${airtableNodeOutput.length} records from Airtable.`);
				console.log(`Sample record: ${JSON.stringify(airtableNodeOutput[0], null, 2)}`);
			} else {
				console.log('\nCredential is working but no records were returned.');
			}

			// Clean up - delete the test workflow
			await workflowManager.deleteWorkflow(createdWorkflow.id);
			console.log(`\nTest workflow deleted.`);
		} catch (execError) {
			console.error('Error executing test workflow:', execError);
			console.log('\nCredential test FAILED! Check the error message above.');
		}
	} catch (error) {
		console.error('Error testing Airtable credentials:', error);
	}
}

// Execute the function
testAirtableCredentials().catch((error) => {
	console.error('Error running the script:', error);
});
