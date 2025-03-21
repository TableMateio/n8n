/**
 * Operation: Get Record from Airtable
 *
 * This operation retrieves a single record from Airtable by its record ID.
 *
 * Required parameters:
 * - table: The name of the Airtable table to query
 * - recordId: The ID of the record to retrieve
 *
 * Optional parameters:
 * - fields: Array of field names to return (returns all fields if not specified)
 *
 * Returns:
 * - The record data if found
 * - Error if record not found or other issues occur
 */

import { NodeBuilder } from '@/utils/workflow/node-builder';
import { AIRTABLE_REFERENCE } from '@/utils/airtable/reference';
import { WorkflowManager } from '@/utils/workflow/manager';

export async function buildWorkflow() {
	const manager = new WorkflowManager('Get Airtable Record');

	// Define the nodes for this workflow
	const trigger = new NodeBuilder('manualTrigger')
		.setPosition([250, 300])
		.setName('Manual Trigger')
		.build();

	const validateInputNode = new NodeBuilder('function')
		.setPosition([450, 300])
		.setName('Validate Input')
		.setParameters({
			functionCode: `
        // Get the input parameters
        const table = $input.table;
        const recordId = $input.recordId;
        const fields = $input.fields || [];

        // Validate required parameters
        if (!table) {
          throw new Error('Table name is required');
        }

        if (!recordId) {
          throw new Error('Record ID is required');
        }

        // Prepare the output for the next node
        return {
          table,
          recordId,
          fields
        };
      `,
		})
		.build();

	const getRecordNode = new NodeBuilder('airtable')
		.setCredentials('airtableApi', {
			id: 'airtableCredentials',
			name: 'Default Airtable credentials',
		})
		.setPosition([650, 300])
		.setName('Get Airtable Record')
		.setParameters({
			application: '={{ $json.table }}',
			operation: 'read',
			id: '={{ $json.recordId }}',
			fields: '={{ $json.fields.length > 0 ? $json.fields : undefined }}',
		})
		.build();

	const processResultNode = new NodeBuilder('function')
		.setPosition([850, 300])
		.setName('Process Result')
		.setParameters({
			functionCode: `
        // Check if record was found
        if (!$input || Object.keys($input).length === 0) {
          throw new Error(\`Record with ID \${$prevNode.json.recordId} not found in table \${$prevNode.json.table}\`);
        }

        return {
          success: true,
          message: 'Record retrieved successfully',
          record: $input
        };
      `,
		})
		.build();

	// Connect the nodes
	manager.addNode(trigger);
	manager.addNode(validateInputNode);
	manager.addNode(getRecordNode);
	manager.addNode(processResultNode);

	manager.addConnection(trigger, validateInputNode);
	manager.addConnection(validateInputNode, getRecordNode);
	manager.addConnection(getRecordNode, processResultNode);

	// Configure workflow settings
	manager.addSettings({
		saveManualExecutions: true,
		callerPolicy: 'workflowsFromSameOwner',
	});

	// Tag the workflow with appropriate tags
	manager.addTags(['operation', 'airtable', 'get-record']);

	// By default, the workflow is inactive
	manager.setActive(false);

	return manager.workflow;
}
