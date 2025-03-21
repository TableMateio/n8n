# Airtable Node Tests

This directory contains tests specifically focused on the Airtable node functionality in n8n.

## Contents

- **check-airtable-workflow.js**: Inspects Airtable workflows
- **debug-airtable-field-names.js**: Debug scripts for field name issues
- **debug-airtable-linked-fields.js**: Debug scripts for linked record fields
- **debug-airtable-nodes.js**: General Airtable node debugging
- **fix-airtable-filtering.js**: Scripts to fix filtering in Airtable nodes
- **fix-airtable-workflow-trigger.js**: Scripts to fix Airtable trigger issues
- **recreate-airtable-workflow.js**: Recreate Airtable workflows
- **test-airtable-credentials.js**: Test Airtable API credentials

## JSON Files

The associated JSON files for these tests are stored in the `../json/` directory.

## Usage

```
node tests/mcp/airtable/debug-airtable-nodes.js
```

## Common Issues

These scripts help diagnose and fix common issues with Airtable nodes:

1. Field name mismatches
2. Linked record references
3. Trigger configuration problems
4. Filtering complexities
5. API credential issues
