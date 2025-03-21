/**
 * This script checks if the Dynamic Airtable Configuration workflow is working
 * by running it with a test auction ID
 */

const WorkflowManager = require('./workflow-manager');

async function checkAirtableWorkflow() {
	try {
		console.log('Checking if the Dynamic Airtable Configuration workflow is working...');

		// Initialize workflow manager
		const workflowManager = new WorkflowManager(
			'https://127.0.0.1:5678',
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzY2E5MjMwZi1hMDVkLTQ4NjQtOGI5ZS03OWU5NDI3YWUzN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDIxNjk5fQ.tfUSCT54tNBRfHhQnse-uYHhO7qaGx25JAaUD_22sRU',
		);

		// Get the workflow ID (hard-coded based on previous runs)
		const workflowId = 'SlR4PULINjXn4p11';

		// Get the workflow
		console.log(`Getting workflow with ID ${workflowId}...`);
		const workflow = await workflowManager.getWorkflow(workflowId);
		console.log(`Found workflow: ${workflow.name}`);

		// Execute the workflow with test data
		console.log('\nExecuting workflow with test auction ID...');
		const testData = {
			data: {
				auction_id: '24-10-onondaga-ny',
			},
		};

		const execution = await workflowManager.executeWorkflow(workflowId, testData);
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
		if (executionData.data.resultData.error) {
			console.error('Execution completed with errors:');
			console.error(executionData.data.resultData.error);
			return;
		}

		// Check the results from each node
		const runData = executionData.data.resultData.runData;

		console.log('\n=== Workflow Execution Results ===');

		// Check Auction Details node
		if (
			runData['Get Auction Details'] &&
			runData['Get Auction Details'][0] &&
			runData['Get Auction Details'][0].data
		) {
			const auctionData = runData['Get Auction Details'][0].data;
			console.log('\n✅ Get Auction Details node succeeded!');
			console.log(`Found ${auctionData.length} auction records`);
			if (auctionData.length > 0) {
				console.log('First record fields:', auctionData[0].fields);
			}
		} else {
			console.log('❌ Get Auction Details node failed or returned no data');
		}

		// Check County Information node
		if (
			runData['Get County Information'] &&
			runData['Get County Information'][0] &&
			runData['Get County Information'][0].data
		) {
			const countyData = runData['Get County Information'][0].data;
			console.log('\n✅ Get County Information node succeeded!');
			console.log(`Found ${countyData.length} county records`);
			if (countyData.length > 0) {
				console.log('First record fields:', countyData[0].fields);
			}
		} else {
			console.log('❌ Get County Information node failed or returned no data');
		}

		// Check Auction System node
		if (
			runData['Get Auction System'] &&
			runData['Get Auction System'][0] &&
			runData['Get Auction System'][0].data
		) {
			const systemData = runData['Get Auction System'][0].data;
			console.log('\n✅ Get Auction System node succeeded!');
			console.log(`Found ${systemData.length} system records`);
			if (systemData.length > 0) {
				console.log('First record fields:', systemData[0].fields);
			}
		} else {
			console.log('❌ Get Auction System node failed or returned no data');
		}

		// Check Configuration Values node
		if (
			runData['Get Configuration Values'] &&
			runData['Get Configuration Values'][0] &&
			runData['Get Configuration Values'][0].data
		) {
			const configData = runData['Get Configuration Values'][0].data;
			console.log('\n✅ Get Configuration Values node succeeded!');
			console.log(`Found ${configData.length} configuration records`);
			if (configData.length > 0) {
				console.log('First record fields:', configData[0].fields);
			}
		} else {
			console.log('❌ Get Configuration Values node failed or returned no data');
		}

		console.log('\n=== Overall Workflow Status ===');
		if (
			!runData['Get Auction Details'] ||
			!runData['Get County Information'] ||
			!runData['Get Auction System'] ||
			!runData['Get Configuration Values']
		) {
			console.log('❌ Workflow execution failed at one or more nodes');
		} else {
			console.log('✅ Workflow executed successfully!');
		}
	} catch (error) {
		console.error('Error checking Airtable workflow:', error);
	}
}

// Execute the function
checkAirtableWorkflow().catch((error) => {
	console.error('Error running the script:', error);
});
