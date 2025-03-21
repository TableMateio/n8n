/**
 * Airtable Get Configuration Values Operation
 *
 * This operation retrieves configuration values from Airtable and formats them
 * into a usable configuration object.
 */

const AIRTABLE_REFERENCE = require('../../../utils/airtable/reference');

/**
 * Builds the get config values operation workflow
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

	// Function to prepare parameters
	const prepareParamsNode = {
		id: 'prepare_params',
		name: 'Prepare Parameters',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [450, 300],
		parameters: {
			functionCode: `
        // Get input parameters
        const input = $input.item.json;

        // Set up defaults
        const baseId = input.baseId || '{{ $env.AIRTABLE_BASE_ID }}';
        const table = input.table || '${AIRTABLE_REFERENCE.TABLES.CONFIG}';

        // Filter options
        let filterByFormula = '';

        // If a system ID is provided, filter by system
        if (input.systemId) {
          filterByFormula = \`{System}='\${input.systemId}'\`;
        }
        // If a system name is provided, filter by system name
        else if (input.systemName) {
          filterByFormula = \`{System}='\${input.systemName}'\`;
        }
        // If specific config names are provided
        else if (input.configNames && Array.isArray(input.configNames) && input.configNames.length > 0) {
          const nameFilters = input.configNames.map(name => \`{Name}='\${name}'\`);
          filterByFormula = \`OR(\${nameFilters.join(',')})\`;
        }

        // Get environment
        const environment = input.environment || 'Development';

        // Return parameters
        return {
          json: {
            baseId,
            table,
            filterByFormula,
            environment,
            originalInput: input
          }
        };
      `,
		},
	};

	// Get config values from Airtable
	const getConfigNode = {
		id: 'get_config',
		name: 'Get Configuration Values',
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
			resource: 'record',
			application: '={{ $json.baseId }}',
			table: '={{ $json.table }}',
			operation: 'list',
			returnAll: true,
			filterByFormula: '={{ $json.filterByFormula }}',
		},
	};

	// Function to format the configuration values
	const formatConfigNode = {
		id: 'format_config',
		name: 'Format Configuration',
		type: 'n8n-nodes-base.function',
		typeVersion: 1,
		position: [850, 300],
		parameters: {
			functionCode: `
        // Get the configuration records and environment
        const configRecords = $input.item.json || [];
        const environment = $node["prepare_params"].json.environment;

        // Initialize the formatted config object
        const formattedConfig = {};

        // Process each config record
        for (const record of configRecords) {
          // Skip if there are no fields
          if (!record.fields) continue;

          // Get key config values
          const name = record.fields.Name;
          const value = record.fields.Value;
          const type = record.fields.Type;
          const recordEnv = record.fields.Environment;

          // Skip if missing required fields
          if (!name || value === undefined) continue;

          // Skip configs that don't match our environment (if specified)
          // Options are typically: "Production", "Development", "Both"
          if (recordEnv && recordEnv !== environment && recordEnv !== "Both") {
            continue;
          }

          // Convert the value based on its type
          let convertedValue = value;

          if (type === "Number") {
            convertedValue = Number(value);
          } else if (type === "Boolean") {
            convertedValue = value.toLowerCase() === "true";
          } else if (type === "JSON" && typeof value === "string") {
            try {
              convertedValue = JSON.parse(value);
            } catch (e) {
              console.error(\`Error parsing JSON for config "\${name}": \${e.message}\`);
              // Keep as string if parsing fails
            }
          }

          // Add to the formatted config
          formattedConfig[name] = convertedValue;
        }

        // Return the formatted configuration
        return {
          json: {
            config: formattedConfig,
            count: Object.keys(formattedConfig).length,
            environment: environment
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
			main: [[{ node: getConfigNode.id, type: 'main', index: 0 }]],
		},
		[getConfigNode.id]: {
			main: [[{ node: formatConfigNode.id, type: 'main', index: 0 }]],
		},
	};

	// Return the workflow definition
	return {
		name: 'Get Configuration Values',
		nodes: [triggerNode, prepareParamsNode, getConfigNode, formatConfigNode],
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
