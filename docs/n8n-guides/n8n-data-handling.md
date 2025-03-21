# Understanding n8n Data Handling

This document serves as a reference for understanding how data flows between nodes in n8n workflows and how to properly access data in different scenarios.

> **Related Documentation**:
> - [N8N-NODE-PATTERNS.md](../workflow-architecture/N8N-NODE-PATTERNS.md) - For common node patterns and configurations
> - [N8N-DEV-WORKFLOW.md](../workflow-architecture/N8N-DEV-WORKFLOW.md) - For development workflow and debugging

## Data Structure Basics

In n8n, data between nodes flows as **items**. An item typically has two main properties:

- **json**: Contains regular JSON data (objects, arrays, strings, numbers, etc.)
- **binary**: Contains binary data (files, images, etc.)

## Accessing Data in Different Node Types

Based on our experiments, here's how to access data in different scenarios:

### 1. Function Node

In a Function node, data comes in through the `$input` object:

```javascript
// Access the first item's JSON data
const firstItem = $input.item;
const jsonData = firstItem.json;

// Access binary data if present
const binaryData = firstItem.binary?.data;

// Return data
return {
  json: {
    // Your processed data
    processedValue: jsonData.someValue
  }
};
```

### 2. Expression Editor (Using in HTTP Request, Set, etc.)

When using expressions in other nodes, the syntax varies:

```
// Access JSON data from previous node
{{ $json.propertyName }}

// Access binary data (DOESN'T WORK CONSISTENTLY)
{{ $binary.data }}

// Access binary data (MORE RELIABLE)
{{ $input.item.binary.data }}
```

### 3. Binary Data Handling

Binary data requires special handling:

```javascript
// Converting binary to string in Function node
const binaryString = $input.item.binary.data.toString("utf8");

// Converting binary to string in expressions
// DON'T USE THIS (unreliable):
{{ $binary.data.toString() }}

// INSTEAD USE THIS (in Function/Code node):
const configStr = $input.item.binary.data.toString("utf8");
const parsedData = JSON.parse(configStr);
```

## Key Patterns We've Discovered

### 🟢 Working Patterns

1. **Two-Step Binary Handling**:
   - First extract the binary data as a string
   - Then parse it in a separate step

```javascript
// Step 1: Extract as string (in Set node)
// Field: configString
// Value: {{ $input.item.binary.data.toString() }}

// Step 2: Parse in Function node
const configStr = $input.item.json.configString;
const config = JSON.parse(configStr);
```

2. **Function Node for Complex Processing**:
   - Function nodes provide the most reliable way to process complex data

```javascript
// Get the binary data and convert to JSON object
const configStr = $input.item.binary.data.toString("utf8");
const config = JSON.parse(configStr);

// Return the config as a JSON object
return {
  json: config
};
```

3. **Code Node for Batch Processing**:
   - Code nodes are great for processing multiple items

```javascript
// Process all items
for (const item of $input.all()) {
  if (item.binary && item.binary.data) {
    // Convert binary to string and parse as JSON
    const configStr = Buffer.from(item.binary.data, "base64").toString("utf8");
    try {
      const config = JSON.parse(configStr);
      // Set the result as JSON
      item.json = {
        ...config,
        _source: "Code Node"
      };
    } catch (error) {
      item.json = { error: error.message };
    }
  }
}

return $input.all();
```

### 🔴 Problematic Patterns

1. **Direct JSON Parsing in Expressions**:
   - This often fails in nodes like HTTP Request, Set, etc.

```
// DON'T DO THIS
{{ JSON.parse($binary.data.toString()).apiEndpoint }}
```

2. **Using $binary vs $input**:
   - The `$binary` shorthand doesn't work consistently
   - Better to use explicit `$input.item.binary` notation

## Multiple Items vs Single Item

When dealing with multiple items:

1. **In Function Nodes**:
   - Default behavior processes one item at a time
   - Use `$input.all()` to get all items, then return the entire array

2. **In Code Nodes**:
   - Use `$input.all()` to get all items
   - Process them in a loop
   - Return all items with `return $input.all()`

3. **In Expression Editor**:
   - Use `$json` to access current item
   - Use `$('nodeName').item.json` to access specific items from other nodes

## File Lock / Resource Issues

We discovered that when multiple nodes try to read the same file:
- Only the first node successfully reads the file
- Subsequent nodes may fail due to file locking
- Solution: Read the file once and branch out from that node

## What We Know vs What We Think

### What We Know
- Function nodes are the most reliable for complex data processing
- Two-step approach works best for binary data conversion
- Direct JSON parsing in expressions is problematic
- `$input.item` is the reliable way to access the current item

### What We Think
- File locking may occur when multiple nodes read the same file
- n8n may have race conditions in how it processes parallel branches
- The `$binary` shorthand might be using a different context than `$input.item.binary`

## Best Practices

1. Always use Function or Code nodes for complex data manipulation
2. Break binary data handling into two steps:
   - Extract the string
   - Parse the string
3. Prefer `$input.item.binary` over `$binary`
4. When dealing with files, read them once and branch from there
5. Add debug nodes to visualize the data structure at various points
