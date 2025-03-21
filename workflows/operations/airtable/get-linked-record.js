/**
 * Airtable Get Linked Record Operation
 *
 * This operation retrieves a linked record from Airtable using the record ID.
 * It handles the common issue of incorrectly trying to search by field name
 * instead of properly using record IDs for linked fields.
 */

const AIRTABLE_REFERENCE = require('../../../utils/airtable/reference');

/**
 * Builds the get linked record operation workflow
 */
async function buildWorkflow() {
	// Define the manual trigger node (entry point)
	const triggerNode = {
		id: 'trigger',
		name: 'Manual Trigger',
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
		position: [250, 300],
	};

	// Function to validate and prepare parameters
	const prepareParamsNode = {
		id: 'prepare_params',
		name: 'Validate & Prepare Parameters',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [450, 300],
		parameters: {
			functionCode: `
        // Get input parameters
        const input = $input.item.json;

        // Required parameters
        if (!input.recordId) {
          throw new Error('Missing required parameter: recordId');
        }

        if (!input.table) {
          throw new Error('Missing required parameter: table');
        }

        // Get the record ID - handle both direct values and array values
        // (Airtable linked fields are always arrays, but sometimes we might only want the first item)
        let recordId = input.recordId;

        if (Array.isArray(recordId)) {
          if (recordId.length === 0) {
            throw new Error('Empty recordId array provided');
          }

          // By default, get the first linked record
          // If getAllRecords is true, we'll handle the array later
          if (!input.getAllRecords) {
            recordId = recordId[0];
          }
        }

        // Get table reference
        const table = input.table;
        const baseId = input.baseId || '{{ $env.AIRTABLE_BASE_ID }}';

        // Return the prepared parameters
        return {
          json: {
            recordId,
            table,
            baseId,
            getAllRecords: input.getAllRecords || false,
            originalInput: input
          }
        };
      `,
		},
	};

	// Branch based on whether to get single or multiple records
	const branchNode = {
		id: 'branch_process',
		name: 'Single or Multiple Records?',
		type: 'n8n-nodes-base.switch',
		typeVersion: 3.2,
		position: [650, 300],
		parameters: {
			rules: {
				values: [
					{
						outputKey: 'Single Record',
						conditions: {
							options: {
								version: 2,
								caseSensitive: true,
							},
							combinator: 'and',
							conditions: [
								{
									operator: {
										type: 'boolean',
										operation: 'equals',
									},
									leftValue: '={{ !$json.getAllRecords }}',
									rightValue: true,
								},
							],
						},
						renameOutput: true,
					},
					{
						outputKey: 'Multiple Records',
						conditions: {
							options: {
								version: 2,
								caseSensitive: true,
							},
							combinator: 'and',
							conditions: [],
						},
						renameOutput: true,
					},
				],
			},
			options: {},
		},
	};

	// Node to get a single record
	const getSingleRecordNode = {
		id: 'get_single_record',
		name: 'Get Single Record',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2,
		position: [850, 200],
		credentials: {
			airtableTokenApi: {
				id: '1',
				name: 'Airtable account',
			},
		},
		parameters: {
			application: '={{ $json.baseId }}',
			table: '={{ $json.table }}',
			operation: 'get',
			resource: 'record',
			id: '={{ $json.recordId }}',
			options: {
				returnFieldIds: false,
			},
		},
	};

	// Node to get multiple records using a loop
	const loopRecordsNode = {
		id: 'setup_records_loop',
		name: 'Set Up Records Loop',
		type: 'n8n-nodes-base.splitInBatches',
		typeVersion: 1,
		position: [850, 400],
		parameters: {
			batchSize: 1,
			options: {
				reset: true,
			},
		},
	};

	// Function to prepare the current record ID
	const prepareCurrentRecordNode = {
		id: 'prepare_current_record',
		name: 'Prepare Current Record ID',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1050, 400],
		parameters: {
			functionCode: `
        // Get the array of record IDs
        const allRecordIds = $node["prepare_params"].json.recordId;

        // Get the current index (zero-based)
        const index = $input.item.json.$index || 0;

        // Get the current record ID
        if (index >= allRecordIds.length) {
          throw new Error(\`Index out of bounds: \${index} >= \${allRecordIds.length}\`);
        }

        const currentRecordId = allRecordIds[index];

        // Return the current record ID
        return {
          json: {
            ...$input.item.json,
            currentRecordId,
            baseId: $node["prepare_params"].json.baseId,
            table: $node["prepare_params"].json.table
          }
        };
      `,
		},
	};

	// Node to get a record within the loop
	const getLoopRecordNode = {
		id: 'get_loop_record',
		name: 'Get Current Record',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2,
		position: [1250, 400],
		credentials: {
			airtableTokenApi: {
				id: '1',
				name: 'Airtable account',
			},
		},
		parameters: {
			application: '={{ $json.baseId }}',
			table: '={{ $json.table }}',
			operation: 'get',
			resource: 'record',
			id: '={{ $json.currentRecordId }}',
			options: {
				returnFieldIds: false,
			},
		},
	};

	// Function to process results from single record
	const processSingleResultNode = {
		id: 'process_single_result',
		name: 'Process Single Result',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1050, 200],
		parameters: {
			functionCode: `
        // Get the record
        const record = $input.item.json;

        // Check if we have a valid record
        if (!record || !record.id) {
          throw new Error('No valid record found');
        }

        // Return the processed record
        return {
          json: {
            record,
            success: true,
            isSingleRecord: true
          }
        };
      `,
		},
	};

	// Function to aggregate multiple records
	const aggregateResultsNode = {
		id: 'aggregate_results',
		name: 'Aggregate Results',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [1450, 400],
		parameters: {
			functionCode: `
        // Initialize records array if this is the first execution
        if (!$execution.variables.records) {
          $execution.variables.records = [];
        }

        // Add the current record
        $execution.variables.records.push($input.item.json);

        // Check if we're on the last item
        const allRecordIds = $node["prepare_params"].json.recordId;
        const isLastRecord = ($input.item.json.$index === allRecordIds.length - 1);

        if (isLastRecord) {
          // Return all records if this is the last one
          return {
            json: {
              records: $execution.variables.records,
              count: $execution.variables.records.length,
              success: true,
              isSingleRecord: false
            }
          };
        } else {
          // Just pass through the current item if not the last one
          return $input.item;
        }
      `,
		},
	};

	// Merge results node
	const mergeResultsNode = {
		id: 'merge_results',
		name: 'Merge Results',
		type: 'n8n-nodes-base.merge',
		typeVersion: 2.1,
		position: [1650, 300],
		parameters: {
			mode: 'passthrough',
		},
	};

	// Create connections
	const connections = {
		[triggerNode.id]: {
			main: [[{ node: prepareParamsNode.id, type: 'main', index: 0 }]],
		},
		[prepareParamsNode.id]: {
			main: [[{ node: branchNode.id, type: 'main', index: 0 }]],
		},
		[branchNode.id]: {
			main: [
				[{ node: getSingleRecordNode.id, type: 'main', index: 0 }], // Single Record branch
				[{ node: loopRecordsNode.id, type: 'main', index: 0 }], // Multiple Records branch
			],
		},
		[getSingleRecordNode.id]: {
			main: [[{ node: processSingleResultNode.id, type: 'main', index: 0 }]],
		},
		[processSingleResultNode.id]: {
			main: [[{ node: mergeResultsNode.id, type: 'main', index: 0 }]],
		},
		[loopRecordsNode.id]: {
			main: [[{ node: prepareCurrentRecordNode.id, type: 'main', index: 0 }]],
		},
		[prepareCurrentRecordNode.id]: {
			main: [[{ node: getLoopRecordNode.id, type: 'main', index: 0 }]],
		},
		[getLoopRecordNode.id]: {
			main: [[{ node: aggregateResultsNode.id, type: 'main', index: 0 }]],
		},
		[aggregateResultsNode.id]: {
			main: [
				[
					{ node: loopRecordsNode.id, type: 'main', index: 0 },
					{ node: mergeResultsNode.id, type: 'main', index: 1 },
				],
			],
		},
	};

	// Return the workflow definition
	return {
		name: 'Get Linked Record',
		nodes: [
			triggerNode,
			prepareParamsNode,
			branchNode,
			getSingleRecordNode,
			processSingleResultNode,
			loopRecordsNode,
			prepareCurrentRecordNode,
			getLoopRecordNode,
			aggregateResultsNode,
			mergeResultsNode,
		],
		connections,
		active: false,
		settings: {
			saveManualExecutions: true,
			callerPolicy: 'workflowsFromSameOwner',
		},
		tags: ['operation', 'airtable'],
	};
}

module.exports = { buildWorkflow };
