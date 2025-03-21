# Airtable Operations

This directory contains reusable operations for interacting with Airtable.

## Available Operations

- `create-record.js` - Create records in Airtable tables
- `get-config-values.js` - Retrieve configuration values from Airtable
- `get-linked-record.js` - Retrieve records linked to another record
- `search-records.js` - Search for records with advanced filtering
- `test-credentials.js` - Test Airtable credentials and permissions

## Using These Operations

You can call these operations from other workflows by using the Execute Workflow node:

```javascript
const getConfigNode = NodeBuilder.createExecuteWorkflowNode({
  id: 'get_config',
  name: 'Get Configuration',
  parameters: {
    workflowId: '={{ $getWorkflowByName("operations/airtable/get-config-values") }}',
    inputData: {
      configType: 'system',
      countyName: 'Example County'
    }
  }
});
```

## Common Patterns

### Error Handling

All operations include standardized error handling and will return error information in a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Table not found: InvalidTable",
    "code": "NOT_FOUND",
    "details": { ... }
  }
}
```

### Response Format

Successful responses follow a consistent pattern:

```json
{
  "success": true,
  "data": [ ... ],
  "count": 5,
  "source": "workflows/operations/airtable/search-records"
}
```

## Input Documentation

Each operation has specific input requirements, documented at the top of each file and in this README.

### create-record.js

**Required Inputs:**
- `table` (string): The name of the Airtable table
- `fields` (object): The fields to set on the new record

**Optional Inputs:**
- `typecast` (boolean): Whether to typecast field values (default: true)

### get-config-values.js

**Required Inputs:**
- `configType` (string): The type of configuration to retrieve

**Optional Inputs:**
- `countyName` (string): Filter configuration by county

### get-linked-record.js

**Required Inputs:**
- `table` (string): The Airtable table containing the linked record
- `recordId` (string): The ID of the linked record to retrieve

**Optional Inputs:**
- `fields` (array): Specific fields to retrieve

### search-records.js

**Required Inputs:**
- `table` (string): The Airtable table to search

**Optional Inputs:**
- `filterByFormula` (string): Airtable formula for filtering
- `view` (string): Specific view to use
- `maxRecords` (number): Maximum records to return
- `fields` (array): Specific fields to retrieve

### test-credentials.js

**Required Inputs:**
- `table` (string): The table to check permissions on

**Optional Inputs:**
- `testWrite` (boolean): Whether to test write permissions (creates and deletes a test record)
