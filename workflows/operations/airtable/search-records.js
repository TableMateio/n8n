/**
 * Airtable Search Records Operation
 *
 * This operation provides a standardized way to search for records in Airtable,
 * handling field names vs. field IDs correctly to ensure formulas work properly.
 */

const AIRTABLE_REFERENCE = require('../../../utils/airtable/reference');
const AirtableManager = require('../../../utils/airtable/manager');

/**
 * Builds the search operation workflow
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

	// Function to validate and prepare search parameters
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
        if (!input.table) {
          throw new Error('Missing required parameter: table');
        }

        // Get table reference
        const table = input.table;
        const baseId = input.baseId || '{{ $env.AIRTABLE_BASE_ID }}';

        // Handle search parameters
        let searchParams = {};

        // If fieldId and value are provided, create a formula using field name
        if (input.fieldId && input.value !== undefined) {
          const entity = input.entity || AirtableManager.getEntityFromTable(table);

          if (!entity) {
            throw new Error(\`Cannot determine entity type for table: \${table}\`);
          }

          searchParams.filterByFormula = AirtableManager.createFilterFormula(
            entity,
            input.fieldId,
            input.value
          );
        }
        // If a custom formula is provided, use it directly
        else if (input.filterByFormula) {
          searchParams.filterByFormula = input.filterByFormula;
        }
        else {
          throw new Error('Either fieldId+value or filterByFormula must be provided');
        }

        // Add sort if provided
        if (input.sort) {
          searchParams.sort = input.sort;
        }

        // Add maxRecords if provided
        if (input.maxRecords) {
          searchParams.maxRecords = input.maxRecords;
        }

        // Return the prepared parameters
        return {
          json: {
            baseId,
            table,
            searchParams,
            returnFields: input.returnFields || [],
            originalInput: input
          }
        };
      `,
		},
	};

	// Node to execute the Airtable search
	const searchNode = {
		id: 'search_records',
		name: 'Search Airtable Records',
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
			operation: 'search',
			resource: 'record',
			filterByFormula: '={{ $json.searchParams.filterByFormula }}',
			options: {
				returnFieldIds: false,
			},
		},
	};

	// Function to process the results
	const processResultsNode = {
		id: 'process_results',
		name: 'Process Search Results',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [850, 300],
		parameters: {
			functionCode: `
        // Get the search results
        const results = $input.item.json || [];

        // Log the results count
        console.log(\`Found \${results.length} records in Airtable search\`);

        // If specific fields were requested, filter the results
        const returnFields = $node["prepare_params"].json.returnFields;

        let processedResults = results;

        if (returnFields && returnFields.length > 0) {
          processedResults = results.map(record => {
            const filteredFields = {};
            returnFields.forEach(field => {
              if (record.fields && record.fields[field] !== undefined) {
                filteredFields[field] = record.fields[field];
              }
            });

            return {
              id: record.id,
              fields: filteredFields
            };
          });
        }

        // Return the processed results
        return {
          json: {
            results: processedResults,
            count: processedResults.length,
            query: $node["prepare_params"].json.searchParams
          }
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
			main: [[{ node: searchNode.id, type: 'main', index: 0 }]],
		},
		[searchNode.id]: {
			main: [[{ node: processResultsNode.id, type: 'main', index: 0 }]],
		},
	};

	// Return the workflow definition
	return {
		name: 'Search Airtable Records',
		nodes: [triggerNode, prepareParamsNode, searchNode, processResultsNode],
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
