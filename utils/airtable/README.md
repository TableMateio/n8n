# Airtable Utilities

This directory contains utilities for working with Airtable in n8n workflows.

## Core Utilities

### [reference.js](./reference.js)

Central reference file containing Airtable metadata:
- Base IDs and names
- Table IDs and names
- Field IDs and names
- Helper methods for working with fields and formulas

```javascript
const AIRTABLE_REFERENCE = require('./reference');

// Get a table ID
const auctionsTableId = AIRTABLE_REFERENCE.TABLES.AUCTIONS;

// Create a filter formula
const filter = AIRTABLE_REFERENCE.equals('County Name', 'Fulton');
```

### [manager.js](./manager.js)

A utility class for common Airtable operations:
- Making API requests
- Formatting data for Airtable
- Creating node configurations

```javascript
const AirtableManager = require('./manager');

// Create a manager instance
const manager = new AirtableManager({
  apiKey: process.env.AIRTABLE_API_KEY
});

// Create request options for HTTP Request node
const options = manager.createRequestOptions('GET', {
  url: manager.getTableUrl('Auctions')
});

// Format record data
const recordData = manager.formatRecordData({
  'Name': 'New Record',
  'Status': 'Active'
});
```

### [field-mapper.js](./field-mapper.js)

A utility for mapping and transforming fields:
- Converting between field IDs and names
- Transforming field values
- Mapping between different field structures

```javascript
const AirtableFieldMapper = require('./field-mapper');

// Create a field mapper
const mapper = new AirtableFieldMapper();

// Convert a field ID to name
const fieldName = mapper.getFieldName('AUCTION', 'fld7zoOS3uQg4tiyh');

// Transform values
const dateValue = mapper.transformValue('2023-01-01', 'date');

// Map a record to use field names instead of IDs
const record = {
  'fld7zoOS3uQg4tiyh': 'Example Auction',
  'fldQM9eGzadxpJujs': 'Example County'
};
const mappedRecord = mapper.mapRecordToNames('AUCTION', record);
```

## Tools

### [tools/credential-tester.js](./tools/credential-tester.js)

Tool for testing Airtable API credentials and base access.

```javascript
const { testCredentials } = require('./tools/credential-tester');

// Test credentials
const result = await testCredentials({
  apiKey: 'your-api-key',
  baseId: 'your-base-id'
});

if (result.success) {
  console.log('Credentials are valid!');
} else {
  console.error(`Error: ${result.error}`);
}
```

### [tools/field-debugger.js](./tools/field-debugger.js)

Tool for debugging Airtable field issues:
- Identifying field name/ID mismatches
- Detecting field types
- Finding linked fields

```javascript
const AirtableFieldDebugger = require('./tools/field-debugger');

// Create a debugger
const debugger = new AirtableFieldDebugger({
  apiKey: process.env.AIRTABLE_API_KEY
});

// Analyze a table's fields
const metadata = await debugger.getTableMetadata('Auctions');
console.log(metadata.fields);

// Find mismatches between a workflow node and Airtable
const mismatches = await debugger.findFieldMismatches(
  workflowNode,
  'Auctions'
);
```

## Usage in Templates

These utilities can be imported in workflow templates to simplify interacting with Airtable:

```javascript
// In your template file
const AirtableManager = require('../../utils/airtable/manager');
const AIRTABLE_REFERENCE = require('../../utils/airtable/reference');

function createAirtableWorkflow() {
  const manager = new AirtableManager();

  // Create an Airtable node using the manager
  const airtableNode = {
    id: 'airtable_node',
    name: 'Get Auction',
    type: 'n8n-nodes-base.airtable',
    typeVersion: 1,
    position: [250, 300],
    parameters: manager.createAirtableNodeParams({
      operation: 'list',
      table: AIRTABLE_REFERENCE.TABLES.AUCTIONS,
      filterByFormula: AIRTABLE_REFERENCE.equals('Status', 'Active')
    })
  };

  // Use in your workflow
  // ...
}
```
