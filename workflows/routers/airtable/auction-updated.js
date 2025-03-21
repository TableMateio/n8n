/**
 * Auction Updated Router
 *
 * This router workflow detects when records in the Auctions table are updated
 * and routes to appropriate processes based on the update.
 *
 * It follows the standard router pattern and the naming convention:
 * ROUTER: Auction
 */

const { v4: uuidv4 } = require('uuid');
const NodeFactory = require('../../../utils/generators/node-factory');
const WorkflowBuilder = require('../../../utils/generators/workflow-builder');
const AirtableRef = require('../../../utils/airtable/reference');

/**
 * Build the Auction Updated Router workflow
 */
function buildWorkflow() {
	// Create a workflow builder
	const builder = new WorkflowBuilder();

	// Set workflow name and tags
	builder.setName('ROUTER: Auction');
	builder.addTags(['router', 'airtable', 'auction']);

	// 1. Create Airtable trigger node
	const triggerId = builder.addNode({
		name: 'Airtable Trigger',
		type: 'n8n-nodes-base.airtableTrigger',
		typeVersion: 1,
		position: [250, 300],
		parameters: {
			application: AirtableRef.BASE_ID,
			table: AirtableRef.TABLES.AUCTIONS,
			operation: 'update',
			typeOperation: 'recordUpdated',
		},
	});

	// 2. Create a Function node to analyze the update and determine routing
	const routingLogicId = builder.addNode({
		name: 'Determine Route',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [450, 300],
		parameters: {
			functionCode: `
// Get the updated record
const record = $input.item.json;
const fields = record.fields || {};

// Initialize routing information
const routingInfo = {
  recordId: record.id,
  tableName: "Auctions",
  auctionName: fields["Auction Name"] || "Unknown Auction",
  county: fields["County"] || null,
  updatedFields: {},
  routing: {
    shouldProcessSurplusList: false,
    shouldEnrichAuction: false,
    shouldUpdateCounty: false,
    process: null
  }
};

// Analyze which fields were updated
if (fields["Surplus List"] && fields["Surplus List"].length > 0) {
  routingInfo.updatedFields.surplusList = true;
  routingInfo.routing.shouldProcessSurplusList = true;
  routingInfo.routing.process = "processes/auction/process-surplus-list";
}

if (fields["Status"] === "New") {
  routingInfo.updatedFields.status = true;
  routingInfo.routing.shouldEnrichAuction = true;
  routingInfo.routing.process = "processes/auction/enrich-auction";
}

if (fields["County"] && !routingInfo.routing.process) {
  routingInfo.updatedFields.county = true;
  routingInfo.routing.shouldUpdateCounty = true;
  routingInfo.routing.process = "processes/auction/update-county";
}

// If no specific process was determined, use a default
if (!routingInfo.routing.process) {
  routingInfo.routing.process = "operations/airtable/update-record";
}

// Return the routing information
return { json: routingInfo };
      `,
		},
	});

	// 3. Add a Switch node to route based on the determined process
	const switchNodeId = builder.addNode({
		name: 'Route Request',
		type: 'n8n-nodes-base.switch',
		typeVersion: 3.2,
		position: [650, 300],
		parameters: {
			rules: {
				values: [
					{
						outputKey: 'Process Surplus List',
						conditions: {
							options: {
								version: 2,
								caseSensitive: true,
								typeValidation: 'strict',
							},
							combinator: 'and',
							conditions: [
								{
									operator: {
										type: 'string',
										operation: 'equals',
									},
									leftValue: '={{ $json.routing.process }}',
									rightValue: 'processes/auction/process-surplus-list',
								},
							],
						},
						renameOutput: true,
					},
					{
						outputKey: 'Enrich Auction',
						conditions: {
							options: {
								version: 2,
								caseSensitive: true,
							},
							combinator: 'and',
							conditions: [
								{
									operator: {
										type: 'string',
										operation: 'equals',
									},
									leftValue: '={{ $json.routing.process }}',
									rightValue: 'processes/auction/enrich-auction',
								},
							],
						},
						renameOutput: true,
					},
					{
						outputKey: 'Other Updates',
						conditions: {
							options: {
								version: 2,
								caseSensitive: true,
							},
							combinator: 'and',
							conditions: [], // Default case
						},
						renameOutput: true,
					},
				],
			},
			options: {},
		},
	});

	// 4. Add placeholder execution nodes (would be replaced with actual workflow calls in production)
	// These would use the executeWorkflow node type in a real implementation

	// For surplus list processing
	const processSurplusListId = builder.addNode({
		name: 'Execute Process Surplus List',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [850, 200],
		parameters: {
			noticeMessage: 'Would execute process-surplus-list workflow here',
		},
	});

	// For auction enrichment
	const enrichAuctionId = builder.addNode({
		name: 'Execute Enrich Auction',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [850, 350],
		parameters: {
			noticeMessage: 'Would execute enrich-auction workflow here',
		},
	});

	// For other updates
	const otherUpdatesId = builder.addNode({
		name: 'Execute Other Updates',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [850, 500],
		parameters: {
			noticeMessage: 'Would execute other update workflows here',
		},
	});

	// Connect the nodes
	builder.connectNodes({ sourceNode: triggerId, targetNode: routingLogicId });
	builder.connectNodes({ sourceNode: routingLogicId, targetNode: switchNodeId });

	// Connect the switch node outputs to their respective execution nodes
	builder.connectNodes({
		sourceNode: switchNodeId,
		targetNode: processSurplusListId,
		sourceOutput: 0,
	});
	builder.connectNodes({ sourceNode: switchNodeId, targetNode: enrichAuctionId, sourceOutput: 1 });
	builder.connectNodes({ sourceNode: switchNodeId, targetNode: otherUpdatesId, sourceOutput: 2 });

	// Create and return the workflow
	return builder.createWorkflow();
}

/**
 * Create and deploy the workflow
 */
async function deployWorkflow() {
	try {
		console.log('Creating and deploying Auction Updated Router workflow...');
		const workflow = await buildWorkflow();
		console.log(`Created workflow: "${workflow.name}" (ID: ${workflow.id})`);
		return workflow;
	} catch (error) {
		console.error('Error creating Auction Updated Router workflow:', error.message);
		throw error;
	}
}

// Export the functions for use in other modules
module.exports = {
	buildWorkflow,
	deployWorkflow,
};

// If this file is run directly, create and deploy the workflow
if (require.main === module) {
	deployWorkflow()
		.then(() => console.log('Workflow deployment completed!'))
		.catch((error) => console.error('Deployment failed:', error));
}
