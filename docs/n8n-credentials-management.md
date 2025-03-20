# n8n Credentials Management

This document outlines best practices for managing credentials in n8n workflows, particularly when creating and updating workflows programmatically.

## Overview

Credentials in n8n are securely stored entities that contain authentication details for connecting to external services. When building workflows programmatically, proper credential management is essential for security and functionality.

## Credential Types

n8n has many credential types, including:

- Airtable API
- HTTP Basic Auth
- OAuth2
- API Key
- Database credentials
- ...and many more

## Referencing Credentials in Workflows

### Credential Reference Structure

When a node requires credentials, it uses the following structure in its node configuration:

```javascript
{
  "id": "my-node-id",
  "name": "My Node",
  "type": "n8n-nodes-base.someNodeType",
  "typeVersion": 1,
  "position": [100, 200],
  "credentials": {
    "credentialType": {  // e.g., "airtableApi"
      "id": "credentialName",  // Name you gave the credential in n8n UI
      "name": "Some descriptive name"  // Often "account" or similar
    }
  }
}
```

### Example: Airtable Credentials

```javascript
"credentials": {
  "airtableApi": {
    "id": "Airtable",
    "name": "Airtable account"
  }
}
```

## Creating Credentials Programmatically

### Using the n8n API

You can create credentials programmatically using the n8n API:

```javascript
const axios = require('axios');

async function createCredential(n8nUrl, apiKey, credentialType, name, data) {
  const response = await axios({
    method: 'POST',
    url: `${n8nUrl}/credentials`,
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    data: {
      name: name,
      type: credentialType,
      data: data,
      nodesAccess: [] // Optionally restrict which nodes can use this credential
    }
  });

  return response.data;
}

// Example: Creating Airtable credentials
const airtableCredential = await createCredential(
  'https://localhost:5678',
  'n8n_api_key',
  'airtableApi',
  'Airtable',
  {
    apiKey: 'YOUR_AIRTABLE_API_KEY'
  }
);
```

### Using the n8n-bridge MCP Server

For the n8n-bridge (MCP server), you can create credentials using these commands:

```
Show credential schema for airtableApi
Create credential for airtableApi named Airtable
```

## Updating Workflow Nodes to Use Credentials

When updating a workflow to use credentials:

1. Make sure the credential already exists in n8n
2. Update the node's credential reference

```javascript
// Example: Updating an Airtable node to use a credential
const airtableNode = workflow.nodes.find(n => n.type === 'n8n-nodes-base.airtable');
if (airtableNode) {
  airtableNode.credentials = {
    airtableApi: {
      id: "Airtable",  // This must match the name you gave the credential
      name: "Airtable account"
    }
  };
}
```

## Storing Credential IDs

A common pattern is to store credential IDs in environmental variables or a configuration file, then reference them in your workflow creation scripts:

```javascript
// Example: Reading credential references from environment variables
const AIRTABLE_CREDENTIAL_NAME = process.env.AIRTABLE_CREDENTIAL_NAME || 'Airtable';

// Then use in your node configuration
node.credentials = {
  airtableApi: {
    id: AIRTABLE_CREDENTIAL_NAME,
    name: "Airtable account"
  }
};
```

## Best Practices

1. **Never hardcode credential values** (API keys, passwords, etc.) in your workflow scripts
2. **Use credential names that are descriptive** and clearly indicate the service and purpose
3. **Create credentials before workflow creation** to ensure they exist when referenced
4. **Store credential names in configuration files or environment variables** rather than hardcoding them
5. **Regularly audit credential usage** to ensure no unused credentials remain

## Troubleshooting

### Common Credential Issues

1. **"Credential not found" error**:
   - Check if the credential name in the workflow matches exactly with the name in n8n
   - Credentials are case-sensitive

2. **Authentication failures**:
   - Verify the credential data is correct (API keys, tokens, etc.)
   - Check if the credential has expired (particularly for OAuth tokens)

3. **Node shows as disabled in UI**:
   - This often indicates a credential issue
   - Check if the credential exists and is properly configured

## Example: Complete Airtable Credential Setup

```javascript
// 1. Create the credential if it doesn't exist
async function ensureAirtableCredential(workflowManager, name, apiKey) {
  try {
    // Check if credential exists (Note: this API call may not be available in all versions)
    const credentials = await workflowManager.listCredentials();
    const exists = credentials.some(cred => cred.name === name);

    if (!exists) {
      await workflowManager.createCredential('airtableApi', name, {
        apiKey: apiKey
      });
      console.log(`Created Airtable credential: ${name}`);
    } else {
      console.log(`Airtable credential already exists: ${name}`);
    }

    return name;
  } catch (error) {
    console.error('Error managing credential:', error);
    // If we can't verify or create, assume it exists and proceed
    return name;
  }
}

// 2. Update all Airtable nodes in a workflow to use the credential
function updateWorkflowCredentials(workflow, credentialName) {
  let updated = false;

  workflow.nodes.forEach(node => {
    if (node.type === 'n8n-nodes-base.airtable') {
      node.credentials = {
        airtableApi: {
          id: credentialName,
          name: "Airtable account"
        }
      };
      updated = true;
    }
  });

  return updated;
}

// 3. Usage in a workflow creation script
async function createWorkflowWithCredentials() {
  const credentialName = await ensureAirtableCredential(
    workflowManager,
    'Airtable',
    process.env.AIRTABLE_API_KEY
  );

  // Create or update workflow
  const workflow = createBaseWorkflow();
  updateWorkflowCredentials(workflow, credentialName);

  return workflowManager.createWorkflow('My Workflow', workflow.nodes, workflow.connections);
}
```

This approach ensures credentials exist before referencing them and keeps sensitive data out of your code.
