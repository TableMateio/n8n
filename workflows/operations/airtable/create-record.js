/**
 * Airtable Create Record Operation
 *
 * This operation creates a new record in Airtable with proper field handling.
 */

const AIRTABLE_REFERENCE = require('../../../utils/airtable/reference');
const AirtableManager = require('../../../utils/airtable/manager');

/**
 * Builds the create record operation workflow
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

	// Function to validate and prepare record data
	const prepareDataNode = {
		id: 'prepare_data',
		name: 'Validate & Prepare Data',
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

        if (!input.fields || typeof input.fields !== 'object' || Object.keys(input.fields).length === 0) {
          throw new Error('Missing or invalid fields data for the record');
        }

        // Get table reference
        const table = input.table;
        const baseId = input.baseId || '{{ $env.AIRTABLE_BASE_ID }}';

        // Determine if we need to convert field IDs to names
        const useFieldIds = input.useFieldIds === true;
        const entity = input.entity || AirtableManager.getEntityFromTable(table);

        // Process fields to ensure proper format
        let processedFields = {...input.fields};

        if (useFieldIds === false && entity) {
          // Convert field IDs to names for better compatibility with Airtable formulas
          try {
            processedFields = AirtableManager.convertFieldIdsToNames(entity, processedFields);
          } catch (error) {
            console.error('Error converting field IDs to names:', error.message);
            // Continue with original fields if conversion fails
          }
        }

        // Handle linked record fields (ensure they are in array format)
        Object.keys(processedFields).forEach(field => {
          const value = processedFields[field];
          if (input.linkedFields && input.linkedFields.includes(field)) {
            // If this is a linked field, ensure it's an array of record IDs
            if (!Array.isArray(value)) {
              processedFields[field] = value ? [value] : [];
            }
          }
        });

        // Return the prepared parameters
        return {
          json: {
            baseId,
            table,
            fields: processedFields,
            originalInput: input
          }
        };
      `,
		},
	};

	// Node to create the Airtable record
	const createRecordNode = {
		id: 'create_record',
		name: 'Create Airtable Record',
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
			operation: 'create',
			resource: 'record',
			fields: '={{ $json.fields }}',
		},
	};

	// Function to process the result
	const processResultNode = {
		id: 'process_result',
		name: 'Process Result',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [850, 300],
		parameters: {
			functionCode: `
        // Get the created record
        const record = $input.item.json;

        // Check if we have a valid record
        if (!record || !record.id) {
          throw new Error('Failed to create Airtable record');
        }

        // Return the processed result
        return {
          json: {
            success: true,
            record,
            recordId: record.id,
            createdFields: record.fields,
            message: 'Record created successfully'
          }
        };
      `,
		},
	};

	// Create connections
	const connections = {
		[triggerNode.id]: {
			main: [[{ node: prepareDataNode.id, type: 'main', index: 0 }]],
		},
		[prepareDataNode.id]: {
			main: [[{ node: createRecordNode.id, type: 'main', index: 0 }]],
		},
		[createRecordNode.id]: {
			main: [[{ node: processResultNode.id, type: 'main', index: 0 }]],
		},
	};

	// Return the workflow definition
	return {
		name: 'Create Airtable Record',
		nodes: [triggerNode, prepareDataNode, createRecordNode, processResultNode],
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
