/**
 * Airtable Test Credentials Operation
 *
 * This operation tests if Airtable credentials are working properly by
 * attempting to retrieve data from a specified table.
 */

const AIRTABLE_REFERENCE = require('../../../utils/airtable/reference');

/**
 * Builds the test credentials operation workflow
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

	// Function to prepare test parameters
	const prepareParamsNode = {
		id: 'prepare_params',
		name: 'Prepare Test Parameters',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [450, 300],
		parameters: {
			functionCode: `
        // Get input parameters
        const input = $input.item.json;

        // Set up defaults
        const baseId = input.baseId || '{{ $env.AIRTABLE_BASE_ID }}';

        // Use the auctions table by default, or any specified table
        const table = input.table || '${AIRTABLE_REFERENCE.TABLES.AUCTIONS}';

        // Limit to just 1 record by default
        const maxRecords = input.maxRecords || 1;

        // Return the parameters
        return {
          json: {
            baseId,
            table,
            maxRecords,
            originalInput: input
          }
        };
      `,
		},
	};

	// Node to test the Airtable connection
	const testConnectionNode = {
		id: 'test_connection',
		name: 'Test Airtable Connection',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2,
		position: [650, 300],
		credentials: {
			airtableTokenApi: {
				id: '1',
				name: 'Airtable account',
			},
		},
		parameters: {
			application: '={{ $json.baseId }}',
			table: '={{ $json.table }}',
			operation: 'list',
			resource: 'record',
			maxRecords: '={{ $json.maxRecords }}',
			returnAll: false,
			options: {},
		},
	};

	// Function to evaluate the results
	const evaluateResultsNode = {
		id: 'evaluate_results',
		name: 'Evaluate Results',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [850, 300],
		parameters: {
			functionCode: `
        // Get the results
        const results = $input.item.json;

        // Check if we have valid results
        const success = Array.isArray(results) && results.length > 0;

        // Prepare the response
        const response = {
          success,
          credentials: {
            valid: success,
            baseId: $node["prepare_params"].json.baseId,
            table: $node["prepare_params"].json.table
          },
          recordCount: Array.isArray(results) ? results.length : 0,
          message: success
            ? \`Successfully retrieved \${results.length} record(s) from Airtable\`
            : 'Failed to retrieve records from Airtable'
        };

        // If successful, include a sample record (with sensitive data redacted)
        if (success && results[0]) {
          const sample = { ...results[0] };

          // Redact potentially sensitive information
          if (sample.fields) {
            // Create a safe copy with potentially sensitive fields removed or masked
            const safeFields = {};

            for (const [key, value] of Object.entries(sample.fields)) {
              // Skip empty values
              if (value === null || value === undefined) continue;

              // Skip fields that might contain sensitive information
              const lowerKey = key.toLowerCase();
              if (
                lowerKey.includes('key') ||
                lowerKey.includes('token') ||
                lowerKey.includes('password') ||
                lowerKey.includes('secret')
              ) {
                safeFields[key] = '***REDACTED***';
              }
              // Include other fields
              else {
                safeFields[key] = value;
              }
            }

            sample.fields = safeFields;
          }

          response.sampleRecord = sample;
        }

        // Return the evaluation results
        return {
          json: response
        };
      `,
		},
	};

	// Create connections
	const connections = {
		[triggerNode.id]: {
			main: [[{ node: prepareParamsNode.id, type: 'main', index: 0 }]],
		},
		[prepareParamsNode.id]: {
			main: [[{ node: testConnectionNode.id, type: 'main', index: 0 }]],
		},
		[testConnectionNode.id]: {
			main: [[{ node: evaluateResultsNode.id, type: 'main', index: 0 }]],
		},
	};

	// Return the workflow definition
	return {
		name: 'Test Airtable Credentials',
		nodes: [triggerNode, prepareParamsNode, testConnectionNode, evaluateResultsNode],
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
