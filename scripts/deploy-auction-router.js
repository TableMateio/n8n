#!/usr/bin/env node

/**
 * Deploy Auction Updated Router Workflow
 *
 * This script deploys the Auction Updated Router workflow to the n8n instance.
 * It creates a workflow that detects when records in the Auctions table are updated
 * and routes to appropriate processes based on the update.
 */

require('dotenv').config({ path: '.env.mcp' });

// Import the router workflow builder
const { deployWorkflow } = require('../workflows/routers/airtable/auction-updated');

/**
 * Utility to display a refresh notification
 */
function showRefreshNotification() {
	console.log('\n' + '='.repeat(50));
	console.log('🔄 PLEASE REFRESH YOUR N8N BROWSER TAB NOW 🔄');
	console.log('='.repeat(50) + '\n');
}

/**
 * Run the deployment
 */
async function run() {
	try {
		console.log('Starting deployment of Auction Updated Router workflow...');

		// Deploy the workflow
		const workflow = await deployWorkflow();

		console.log(`\nWorkflow "${workflow.name}" deployed successfully!`);
		console.log(`Workflow ID: ${workflow.id}`);
		console.log(`Node count: ${workflow.nodes.length}`);

		// Log node details
		console.log('\nNode details:');
		workflow.nodes.forEach((node) => {
			console.log(`- ${node.name} (${node.type})`);
		});

		showRefreshNotification();
	} catch (error) {
		console.error('Error deploying workflow:', error);
		process.exit(1);
	}
}

// Run the deployment
run();
