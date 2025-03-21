# Migrated Utilities

The utilities in this directory have been migrated to the main `utils` directory for better organization and reusability.

## Workflow Manager

The `workflow-manager.js` utility has been moved to:

```
utils/managers/workflow-manager.js
```

This utility provides a comprehensive API for interacting with n8n workflows programmatically. It's used by the following utilities:

- `WorkflowBuilder` in `utils/generators/workflow-builder.js`
- `WorkflowModifier` in `utils/generators/workflow-modifier.js`
- `WorkflowFixer` in `utils/generators/workflow-fixer.js`

## Other Utilities

Other utilities that may still be in this directory should be evaluated for migration as well. The goal is to move all reusable utilities to the main `utils` directory and its subdirectories.

## Current Status

This directory is being phased out as utilities are consolidated and moved to more appropriate locations. Please use the utilities in the main `utils` directory instead.
