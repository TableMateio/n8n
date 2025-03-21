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

## TypeScript Workflow Manager

The TypeScript version of the workflow manager (`workflow-manager.ts`) has been moved to:

```
utils/managers/workflow-manager.ts
```

This version provides the same functionality with stronger type checking and interfaces.

## n8n CLI Tool

The `n8n-cli.js` command-line tool has been moved to:

```
utils/cli/n8n-cli.js
```

This tool provides a command-line interface for managing n8n workflows, including listing, creating, updating, and deleting workflows.

## Current Status

This directory is being phased out as utilities are consolidated and moved to more appropriate locations. Please use the utilities in the main `utils` directory instead.
