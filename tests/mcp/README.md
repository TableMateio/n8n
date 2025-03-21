# n8n MCP Tests

This directory contains tests and utilities for working with n8n workflows using the MCP bridge.

## Directory Structure

- **connection/**: Tests for connectivity and communication with n8n
- **workflow-creation/**: Scripts for creating different types of workflows
- **workflow-modification/**: Scripts for modifying existing workflows
- **airtable/**: Tests specific to Airtable node functionality
- **node-operations/**: Tests for specific node operations (binary data, connections, etc.)
- **configs/**: Configuration-based workflow tests
- **utilities/**: Core utilities like WorkflowManager and CLI tools
- **json/**: JSON workflow definitions
- **general/**: General tests and utilities

## Running Tests

Most tests can be run directly with Node.js:

```
node tests/mcp/utilities/workflow-manager.js
```

## Development

When adding new tests, please place them in the appropriate directory based on their functionality.
