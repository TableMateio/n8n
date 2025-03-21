# n8n Workflow Utility Examples

This directory contains examples of how to use the workflow utilities to automate common tasks with n8n.

## Available Examples

### workflow-modifier-example.js

Demonstrates using the `WorkflowModifier` and `NodeFactory` utilities to modify workflows. Examples include:

1. Adding a node at the end of a workflow
2. Inserting a node between two existing nodes
3. Adding a branch with conditional logic
4. Performing multiple operations in one API call

```bash
# Run the example (uncomment the desired operation in the file first)
./workflow-modifier-example.js

# Or specify a workflow ID as an environment variable
TEST_WORKFLOW_ID=your-workflow-id ./workflow-modifier-example.js
```

## Setting Up

Before running examples, make sure:

1. Your n8n instance is running
2. You've added your API key to the `.env` file in the project root
3. You've installed required dependencies

## Environment Variables

The examples use the following environment variables:

- `N8N_URL`: The URL of your n8n instance (defaults to `http://localhost:5678`)
- `N8N_API_KEY`: Your n8n API key
- `TEST_WORKFLOW_ID`: ID of the workflow to modify (optional, defaults per script)

These can be set in your `.env` file or passed directly when running the examples.
