# Workflow Modification Scripts

This directory contains scripts for modifying existing n8n workflows.

## Important Note

These scripts are provided as legacy examples. New workflow modification code should use the modern utilities in `utils/generators/`:

```javascript
// Import modern utilities
const WorkflowModifier = require('../../../utils/generators/workflow-modifier');
const NodeFactory = require('../../../utils/generators/node-factory');
const WorkflowFixer = require('../../../utils/generators/workflow-fixer');

// Create a modifier
const modifier = new WorkflowModifier();

// Example: Adding a node at the end of a workflow
async function addNodeExample() {
  // Create a node using NodeFactory
  const newNode = NodeFactory.createCodeNode({
    name: 'Process Data',
    jsCode: 'return items;'
  });

  // Add the node to a workflow
  const updatedWorkflow = await modifier.addNodeAtEnd(
    'your-workflow-id',
    'Last Node Name',
    newNode
  );

  return updatedWorkflow;
}

// Example: Fixing issues in a workflow
async function fixWorkflowExample() {
  const fixer = new WorkflowFixer();

  // Apply multiple fixes to a workflow
  const updatedWorkflow = await fixer.applyFixes(
    'your-workflow-id',
    ['binary', 'paths', 'set', 'connections']
  );

  return updatedWorkflow;
}
```

## Current Scripts (Reference Only)

The scripts in this directory now serve as reference examples only. Their functionality should be implemented using the modern utilities in `utils/generators/` for new development.

### Node Addition (Reference Examples)
- `add-middle-node.js` - Insert a node between existing nodes
- `add-branch-path.js` - Add a branch to a workflow
- `add-conditional-branch.js` - Add a conditional branch
- `add-switch-to-linear.js` - Convert a linear workflow to use a switch

### Node Removal (Reference Examples)
- `remove-api-request-node.js` - Remove an API request node
- `remove-switch-from-linear.js` - Remove a switch from a workflow

### Node Fixing (Legacy Examples)
**Note: Most generic fix functionality has been consolidated into the `WorkflowFixer` utility in `utils/generators/workflow-fixer.js`**

The following scripts contain workflow-specific fixes that are not generalized:
- `fix-approach2-expressions.js` - Fix expression issues in a specific workflow
- `fix-config-workflow.js` - Fix configuration issues in a specific workflow
- `fix-method4.js` - Fix method 4 issues in a specific workflow

### Complex Update Examples
The following scripts provide examples of complex workflow updates that may require careful handling of node connections and positioning:
- `update-single-workflow.js` - Example of updating a complete workflow with proper connections
- `update-test-workflow.js` - Example of updating a test workflow with both ID and name-based connections

## Supported Operations in Modern Utilities

### WorkflowModifier

1. **Adding Nodes**:
   - `addNodeAtEnd()` - Add a node at the end of a workflow (replaces `add-end-node.js`)
   - `addNodeBetween()` - Add a node between two existing nodes
   - `addNodeBranch()` - Add a new branch to a workflow

2. **Removing Nodes**:
   - `removeNode()` - Remove a node from a workflow
   - `replaceNode()` - Replace a node with a different one

3. **Layout and Connections**:
   - `updateNodeLayout()` - Update the visual layout of nodes
   - `optimizeWorkflowLayout()` - Automatically position nodes in an optimal layout

### WorkflowFixer

See the section below for details on fixing operations.

## Using the New WorkflowFixer Utility

The `WorkflowFixer` utility (in `utils/generators/workflow-fixer.js`) consolidates common fix operations:

1. **Binary Expression Fixes**: Fix issues with expressions that reference binary data
   ```javascript
   await fixer.fixBinaryExpressions(workflowId);
   ```

2. **Config Path Fixes**: Convert relative file paths to absolute paths
   ```javascript
   await fixer.fixConfigPaths(workflowId);
   ```

3. **Set Node Fixes**: Update old Set node formats to newer n8n version format
   ```javascript
   await fixer.fixSetNodes(workflowId);
   ```

4. **Connection Fixes**: Ensure connections between nodes are properly structured
   ```javascript
   await fixer.fixConnections(workflowId);
   ```

5. **Apply Multiple Fixes**: Apply multiple fixes in a single operation
   ```javascript
   await fixer.applyFixes(workflowId, ['binary', 'paths', 'set', 'connections']);
   ```

See the example script at `examples/fix-workflow-issues.js` for a complete demonstration.

## Migrating to New Utilities

To migrate your code to use the new utilities, follow these steps:

1. Replace direct API calls with `WorkflowModifier` methods
2. Use `NodeFactory` to create node configurations
3. Use the batch operations in `modifyWorkflow()` for complex changes
4. Use `WorkflowFixer` for common workflow fixes

These utilities handle many edge cases and provide a more consistent API.
