/**
 * Operation: Update Record in Airtable
 *
 * This operation updates a single record in Airtable by its record ID.
 *
 * Required parameters:
 * - table: The name of the Airtable table to update
 * - recordId: The ID of the record to update
 * - fields: Object containing field names and their new values
 *
 * Returns:
 * - The updated record data if successful
 * - Error if record not found or other issues occur
 */

import { NodeBuilder } from '@/utils/workflow/node-builder';
import { AIRTABLE_REFERENCE } from '@/utils/airtable/reference';
import { WorkflowManager } from '@/utils/workflow/manager';

export async function buildWorkflow() {
	const manager = new WorkflowManager('Update Airtable Record');

	// Define the nodes for this workflow
	const trigger = new NodeBuilder('manualTrigger')
		.setPosition([250, 300])
		.setName('Manual Trigger')
		.build();

	const validateInputNode = new NodeBuilder('function')
		.setPosition([450, 300])
		.setName('Validate & Prepare Data')
		.setParameters({
			functionCode: `
        // Get the input parameters
        const table = $input.table;
        const recordId = $input.recordId;
        const fields = $input.fields || {};

        // Validate required parameters
        if (!table) {
          throw new Error('Table name is required');
        }

        if (!recordId) {
          throw new Error('Record ID is required');
        }

        if (!fields || Object.keys(fields).length === 0) {
          throw new Error('At least one field must be provided for update');
        }

        // Process fields for linked records
        const processedFields = {};

        for (const [key, value] of Object.entries(fields)) {
          // Handle linked record fields - ensure they're in array format
          if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
            // This is likely a linked field - ensure it's properly formatted
            processedFields[key] = value;
          } else if (typeof value === 'string' && value.includes(',')) {
            // This might be a comma-separated list of IDs
            processedFields[key] = value.split(',').map(id => id.trim());
          } else {
            // Regular field
            processedFields[key] = value;
          }
        }

        // Prepare the output for the next node
        return {
          table,
          recordId,
          fields: processedFields
        };
      `,
		})
		.build();

	const updateRecordNode = new NodeBuilder('airtable')
		.setCredentials('airtableApi', {
			id: 'airtableCredentials',
			name: 'Default Airtable credentials',
		})
		.setPosition([650, 300])
		.setName('Update Airtable Record')
		.setParameters({
			application: '={{ $json.table }}',
			operation: 'update',
			id: '={{ $json.recordId }}',
			fields: '={{ $json.fields }}',
		})
		.build();

	const processResultNode = new NodeBuilder('function')
		.setPosition([850, 300])
		.setName('Process Result')
		.setParameters({
			functionCode: `
        // Check if record was updated
        if (!$input || Object.keys($input).length === 0) {
          throw new Error(\`Failed to update record with ID \${$prevNode.json.recordId} in table \${$prevNode.json.table}\`);
        }

        return {
          success: true,
          message: 'Record updated successfully',
          record: $input
        };
      `,
		})
		.build();

	// Connect the nodes
	manager.addNode(trigger);
	manager.addNode(validateInputNode);
	manager.addNode(updateRecordNode);
	manager.addNode(processResultNode);

	manager.addConnection(trigger, validateInputNode);
	manager.addConnection(validateInputNode, updateRecordNode);
	manager.addConnection(updateRecordNode, processResultNode);

	// Configure workflow settings
	manager.addSettings({
		saveManualExecutions: true,
		callerPolicy: 'workflowsFromSameOwner',
	});

	// Tag the workflow with appropriate tags
	manager.addTags(['operation', 'airtable', 'update-record']);

	// By default, the workflow is inactive
	manager.setActive(false);

	return manager.workflow;
}
