# n8n Node Patterns

This document catalogs common node patterns, configuration approaches, and best practices for our n8n workflow system.

## Node Version Compatibility

A critical consideration when creating workflows programmatically is node version compatibility. Different node types have multiple versions with different parameter structures.

### Switch Node

The Switch node is used for conditional branching and has gone through significant changes in versions.

#### Version 1 (Legacy)

```javascript
{
  "id": "switch-node-id",
  "name": "Route by Status",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 1,
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.status }}",
          "operation": "equal",
          "value2": "new"
        }
      ]
    }
  }
}
```

#### Version 3.2 (Current)

```javascript
{
  "id": "switch-node-id",
  "name": "Route by Status",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3.2,
  "parameters": {
    "rules": {
      "values": [
        {
          "outputKey": "New Status",
          "conditions": {
            "options": {
              "version": 2,
              "caseSensitive": true,
              "typeValidation": "strict"
            },
            "combinator": "and",
            "conditions": [
              {
                "operator": {
                  "type": "string",
                  "operation": "equals"
                },
                "leftValue": "={{ $json.status }}",
                "rightValue": "new"
              }
            ]
          },
          "renameOutput": true
        },
        {
          "outputKey": "Default",
          "conditions": {
            "options": {
              "version": 2,
              "caseSensitive": true
            },
            "combinator": "and",
            "conditions": [] // Empty conditions for default case
          },
          "renameOutput": true
        }
      ]
    },
    "options": {}
  }
}
```

### Set Node

The Set node is used to set variables and has also evolved significantly.

#### Version 1 (Legacy)

```javascript
{
  "id": "set-node-id",
  "name": "Set Variables",
  "type": "n8n-nodes-base.set",
  "typeVersion": 1,
  "parameters": {
    "values": {
      "string": [
        {
          "name": "status",
          "value": "processing"
        }
      ],
      "number": [
        {
          "name": "priority",
          "value": 1
        }
      ]
    }
  }
}
```

#### Version 3.4 (Current)

```javascript
{
  "id": "set-node-id",
  "name": "Set Variables",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "parameters": {
    "mode": "manual",
    "includeOtherFields": true,
    "include": "all",
    "assignments": {
      "assignments": [
        {
          "name": "status",
          "type": "string",
          "value": "processing"
        },
        {
          "name": "priority",
          "type": "number",
          "value": 1
        }
      ]
    }
  }
}
```

### HTTP Request Node

The HTTP Request node has evolved to support more authentication methods and options.

#### Version 1 (Simple)

```javascript
{
  "id": "http-node-id",
  "name": "Make API Request",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 1,
  "parameters": {
    "url": "https://api.example.com/data",
    "method": "GET",
    "authentication": "none"
  }
}
```

#### Version 1 (Advanced with Auth)

```javascript
{
  "id": "http-node-id",
  "name": "Make API Request",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 1,
  "parameters": {
    "url": "https://api.example.com/data",
    "method": "POST",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "options": {
      "headerParameters": {
        "parameter": [
          {
            "name": "Authorization",
            "value": "Bearer {{ $env.API_KEY }}"
          },
          {
            "name": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    },
    "bodyParametersJson": "={{ JSON.stringify({ \"query\": $json.searchTerm }) }}"
  }
}
```

## Expression Mode vs Fixed Value

Many nodes in n8n support both fixed values and expressions. Here's how to configure each:

### Fixed Value

```javascript
{
  "parameters": {
    "value": "static-value"
  }
}
```

### Expression Mode

```javascript
{
  "parameters": {
    "value": {
      "__rl": true,
      "__dl": {
        "mode": "expression",
        "value": "={{ $json.dynamicValue }}"
      }
    }
  }
}
```

### Alternative Expression Format

Some nodes use a different format for expressions:

```javascript
{
  "parameters": {
    "value": "={{ $json.dynamicValue }}"
  }
}
```

## Common Node Patterns

### Authentication Pattern

This pattern handles authentication to external systems:

```javascript
// Function Node for Authentication
const authNode = {
  "id": "auth-node-id",
  "name": "Authenticate",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 1,
  "parameters": {
    "url": "https://api.example.com/auth",
    "method": "POST",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpBasicAuth",
    "options": {
      "username": "{{ $env.API_USERNAME }}",
      "password": "{{ $env.API_PASSWORD }}"
    },
    "returnFullResponse": true
  }
};

// Set Node to Extract Token
const extractTokenNode = {
  "id": "extract-token-id",
  "name": "Extract Token",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "parameters": {
    "mode": "manual",
    "includeOtherFields": true,
    "assignments": {
      "assignments": [
        {
          "name": "authToken",
          "type": "string",
          "value": "={{ $json.body.token }}"
        }
      ]
    }
  }
};
```

### Data Fetching Pattern

This pattern fetches data from an API:

```javascript
// HTTP Request Node for Fetching Data
const fetchDataNode = {
  "id": "fetch-data-id",
  "name": "Fetch Data",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 1,
  "parameters": {
    "url": "={{ $json.apiEndpoint }}",
    "method": "GET",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "options": {
      "headerParameters": {
        "parameter": [
          {
            "name": "Authorization",
            "value": "Bearer {{ $json.authToken }}"
          }
        ]
      }
    }
  }
};

// Function Node to Process Data
const processDataNode = {
  "id": "process-data-id",
  "name": "Process Data",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "parameters": {
    "functionCode": `
      // Get the raw data
      const rawData = $input.item.json.body;

      // Transform data into our standard format
      const processedData = rawData.items.map(item => ({
        id: item.id,
        name: item.title,
        description: item.description || '',
        createdAt: new Date(item.created_at).toISOString(),
        status: item.status.toLowerCase()
      }));

      // Return the processed data
      return {
        json: {
          data: processedData,
          count: processedData.length,
          source: $input.item.json.apiEndpoint
        }
      };
    `
  }
};
```

### Data Transformation Pattern

This pattern transforms data between formats:

```javascript
// Function Node for Data Transformation
const transformNode = {
  "id": "transform-data-id",
  "name": "Transform Data",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "parameters": {
    "functionCode": `
      // Get the input data
      const inputData = $input.item.json;

      // Define the transformation function
      function transformAddress(address) {
        return {
          street: [address.streetNumber, address.streetName].filter(Boolean).join(' '),
          city: address.city,
          state: address.state,
          zip: address.postalCode,
          formatted: [
            [address.streetNumber, address.streetName].filter(Boolean).join(' '),
            address.city,
            [address.state, address.postalCode].filter(Boolean).join(' ')
          ].filter(Boolean).join(', ')
        };
      }

      // Apply the transformation
      const transformedData = {
        ...inputData,
        address: transformAddress(inputData.address)
      };

      // Return the transformed data
      return {
        json: transformedData
      };
    `
  }
};
```

### Error Handling Pattern

This pattern implements robust error handling:

```javascript
// Try-Catch Implementation in Function Node
const errorHandlingNode = {
  "id": "error-handling-id",
  "name": "Handle Errors",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "parameters": {
    "functionCode": `
      try {
        // Get the input data
        const inputData = $input.item.json;

        // Validate required fields
        if (!inputData.id) {
          throw new Error('Missing required field: id');
        }

        // Process the data
        const result = {
          id: inputData.id,
          processedAt: new Date().toISOString(),
          status: 'success'
        };

        // Return the result
        return {
          json: result
        };
      } catch (error) {
        console.error('Error processing data:', error);

        // Return error information
        return {
          json: {
            error: true,
            message: error.message,
            timestamp: new Date().toISOString(),
            inputData: $input.item.json
          }
        };
      }
    `
  }
};

// Switch Node for Error Branching
const errorBranchNode = {
  "id": "error-branch-id",
  "name": "Check for Errors",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3.2,
  "parameters": {
    "rules": {
      "values": [
        {
          "outputKey": "Error",
          "conditions": {
            "options": {
              "version": 2,
              "caseSensitive": true
            },
            "combinator": "and",
            "conditions": [
              {
                "operator": {
                  "type": "boolean",
                  "operation": "equals"
                },
                "leftValue": "={{ $json.error === true }}",
                "rightValue": true
              }
            ]
          },
          "renameOutput": true
        },
        {
          "outputKey": "Success",
          "conditions": {
            "options": {
              "version": 2,
              "caseSensitive": true
            },
            "combinator": "and",
            "conditions": []
          },
          "renameOutput": true
        }
      ]
    },
    "options": {}
  }
};

// Function Node for Error Notification
const notifyErrorNode = {
  "id": "notify-error-id",
  "name": "Notify Error",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "parameters": {
    "functionCode": `
      // Log the error details
      console.error('Error occurred:', $input.item.json.message);

      // Format error message for notification
      const errorMessage = \`
        Error processing data:
        Message: \${$input.item.json.message}
        Time: \${$input.item.json.timestamp}
        Input: \${JSON.stringify($input.item.json.inputData)}
      \`;

      // Return formatted notification
      return {
        json: {
          subject: 'Workflow Error: Data Processing Failed',
          message: errorMessage,
          severity: 'high'
        }
      };
    `
  }
};
```

## Data Handling Patterns

### Batch Processing Pattern

This pattern processes multiple items in a batch:

```javascript
// Code Node for Batch Processing
const batchProcessNode = {
  "id": "batch-process-id",
  "name": "Batch Process",
  "type": "n8n-nodes-base.code",
  "typeVersion": 1,
  "parameters": {
    "mode": "jsObject",
    "jsCode": `
      // Get all items
      const items = $input.all();

      // Process each item
      for (const item of items) {
        // Skip items with errors
        if (item.json.error) {
          continue;
        }

        // Transform the item
        item.json.processed = true;
        item.json.timestamp = new Date().toISOString();

        // Add additional data
        if (item.json.type === 'foreclosure') {
          item.json.priority = 'high';
        } else {
          item.json.priority = 'normal';
        }
      }

      // Return all processed items
      return $input.all();
    `
  }
};

// Split in Batches Node
const splitBatchesNode = {
  "id": "split-batches-id",
  "name": "Split in Batches",
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 1,
  "parameters": {
    "batchSize": 10
  }
};
```

### Binary Data Handling Pattern

This pattern handles binary data like files and images:

```javascript
// HTTP Request Node to Download Binary Data
const downloadFileNode = {
  "id": "download-file-id",
  "name": "Download File",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 1,
  "parameters": {
    "url": "https://example.com/files/document.pdf",
    "method": "GET",
    "responseFormat": "file",
    "options": {
      "binary": true
    }
  }
};

// Function Node to Process Binary Data
const processBinaryNode = {
  "id": "process-binary-id",
  "name": "Process Binary Data",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "parameters": {
    "functionCode": `
      // Check if we have binary data
      if (!$input.item.binary) {
        throw new Error('No binary data found');
      }

      // Extract file information
      const fileKey = Object.keys($input.item.binary)[0];
      const fileData = $input.item.binary[fileKey];

      // Create output with file metadata
      const output = {
        fileName: fileData.fileName,
        mimeType: fileData.mimeType,
        fileSize: fileData.fileSize,
        extension: fileData.fileName.split('.').pop(),
        downloadUrl: $input.item.json.url,
        timestamp: new Date().toISOString()
      };

      // Return both the binary data and the JSON
      return {
        json: output,
        binary: $input.item.binary
      };
    `
  }
};
```

### Configuration-Based Operation Pattern

This pattern adapts operations based on configuration:

```javascript
// Configuration Object
const configuration = {
  "environments": {
    "structured-web": {
      "implementation": "cheerio",
      "requiresAuthentication": false
    },
    "dynamic-web": {
      "implementation": "playwright",
      "requiresAuthentication": true
    },
    "structured-api": {
      "implementation": "api",
      "requiresAuthentication": true
    },
    "unstructured": {
      "implementation": "ai",
      "requiresAuthentication": false
    }
  },
  "selectors": {
    "property": {
      "owner": {
        "structured-web": "#owner-info .name",
        "dynamic-web": "//div[@class='owner-details']//span[@class='name']",
        "unstructured": "owner name"
      },
      "address": {
        "structured-web": "#property-address",
        "dynamic-web": "//div[@class='property-address']",
        "unstructured": "property address"
      }
    }
  }
};

// Function Node to Configure Operation
const configureOperationNode = {
  "id": "configure-operation-id",
  "name": "Configure Operation",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "parameters": {
    "functionCode": `
      // Get input parameters
      const environment = $input.item.json.environment || 'structured-web';
      const dataType = $input.item.json.dataType || 'property';
      const fields = $input.item.json.fields || ['owner', 'address'];

      // Get configuration for this environment
      const envConfig = ${JSON.stringify(configuration.environments)}[environment];

      // Get selectors for this data type and environment
      const selectors = {};
      const allSelectors = ${JSON.stringify(configuration.selectors)};

      // Only include requested fields
      fields.forEach(field => {
        if (allSelectors[dataType] && allSelectors[dataType][field]) {
          selectors[field] = allSelectors[dataType][field][environment];
        }
      });

      // Build operation configuration
      const operationConfig = {
        environment,
        implementation: envConfig.implementation,
        requiresAuthentication: envConfig.requiresAuthentication,
        selectors,
        dataType
      };

      // Return the configuration
      return {
        json: {
          ...operationConfig,
          originalData: $input.item.json
        }
      };
    `
  }
};
```

## Workflow Patterns

### Parent-Child Workflow Pattern

This pattern allows one workflow to call another:

```javascript
// Execute Workflow Node
const executeWorkflowNode = {
  "id": "execute-workflow-id",
  "name": "Execute Child Workflow",
  "type": "n8n-nodes-base.executeWorkflow",
  "typeVersion": 1,
  "parameters": {
    "workflowId": "={{ $getWorkflowByName('operations/web/scrape') }}",
    "options": {},
    "inputData": {
      "data": {
        "value": `={{ {
          "system": $json.system,
          "selector": $json.selector,
          "searchParams": $json.searchParams
        } }}`,
        "type": "json"
      }
    }
  }
};

// Function Node to Handle Results
const handleResultsNode = {
  "id": "handle-results-id",
  "name": "Handle Child Results",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "parameters": {
    "functionCode": `
      // Get the results from the child workflow
      const childResults = $input.item.json;

      // Log the results
      console.log('Child workflow completed:', {
        success: childResults.success,
        dataCount: childResults.data ? childResults.data.length : 0
      });

      // Process and return the results
      return {
        json: {
          success: childResults.success,
          data: childResults.data,
          processedAt: new Date().toISOString(),
          source: 'parent-workflow'
        }
      };
    `
  }
};
```

### Webhook Handling Pattern

This pattern handles incoming webhook data:

```javascript
// Webhook Trigger Node
const webhookTriggerNode = {
  "id": "webhook-trigger-id",
  "name": "Webhook Trigger",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1,
  "parameters": {
    "path": "incoming-data",
    "responseMode": "lastNode",
    "options": {
      "responseCode": 200,
      "responseData": "firstEntryJson"
    }
  }
};

// Function Node to Validate Webhook Data
const validateWebhookNode = {
  "id": "validate-webhook-id",
  "name": "Validate Webhook Data",
  "type": "n8n-nodes-base.function",
  "typeVersion": 1,
  "parameters": {
    "functionCode": `
      // Get webhook payload
      const payload = $input.item.json.body;

      // Validate required fields
      const required = ['event', 'data', 'timestamp'];
      const missing = required.filter(field => !payload[field]);

      if (missing.length > 0) {
        return {
          json: {
            success: false,
            error: \`Missing required fields: \${missing.join(', ')}\`,
            receivedData: payload
          }
        };
      }

      // Additional validation
      if (new Date(payload.timestamp) > new Date()) {
        return {
          json: {
            success: false,
            error: 'Invalid timestamp (future date)',
            receivedData: payload
          }
        };
      }

      // Return validated data
      return {
        json: {
          success: true,
          event: payload.event,
          data: payload.data,
          timestamp: payload.timestamp,
          validated: true
        }
      };
    `
  }
};
```

## Best Practices

### Node Positioning

When creating workflows programmatically, use consistent node positioning for better visualization:

```javascript
// Position nodes in a grid
const positions = {
  trigger: [250, 300],
  process1: [500, 300],
  branch: [750, 300],
  pathA: [1000, 200],
  pathB: [1000, 400],
  merge: [1250, 300]
};

// Apply positions to nodes
const triggerNode = {
  ...nodeDefinition,
  position: positions.trigger
};
```

### Node Naming

Use clear, consistent naming patterns for nodes:

```javascript
// For data flow nodes
const fetchDataNode = {
  id: "fetch_foreclosure_data",
  name: "Fetch Foreclosure Data"
};

// For conditional nodes
const statusCheckNode = {
  id: "check_foreclosure_status",
  name: "Check Foreclosure Status"
};

// For transformation nodes
const transformAddressNode = {
  id: "transform_address_format",
  name: "Transform Address Format"
};
```

### Parameter Structure

Keep parameter structures clean and maintainable:

```javascript
// Separate configuration from node definition
const apiConfig = {
  baseUrl: "https://api.example.com",
  endpoints: {
    auth: "/auth",
    data: "/data",
    files: "/files"
  },
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
};

// Apply configuration in node
const apiRequestNode = {
  "id": "api_request",
  "name": "API Request",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 1,
  "parameters": {
    "url": `${apiConfig.baseUrl}${apiConfig.endpoints.data}`,
    "method": "GET",
    "options": {
      "headerParameters": {
        "parameter": Object.entries(apiConfig.headers).map(([name, value]) => ({
          name,
          value
        }))
      }
    }
  }
};
```

### Error Handling Strategy

Implement a consistent error handling strategy:

1. **Use try-catch blocks** in Function/Code nodes
2. **Validate inputs** at the beginning of each step
3. **Add error paths** to handle failures
4. **Log context information** for debugging
5. **Return standardized error objects**

### Connection Best Practices

When creating connections:

1. **Include both ID and name-based connections** for better compatibility
2. **Validate connection integrity** after creation
3. **Use consistent connection indexes**
4. **Document branch paths** in code comments

## Conclusion

This document provides a reference for common node patterns and best practices. By following these patterns, you can create more maintainable and reliable workflows. Keep in mind that n8n evolves over time, so check the current documentation and source code for the latest node versions and parameter structures.
