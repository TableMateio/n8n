# n8n Workflow Utilities

This directory previously contained utility classes and tools for working with n8n workflows programmatically.

## Migration Notice

All utilities have been moved to more appropriate locations within the main `utils` directory:

- `workflow-manager.js` → `utils/managers/workflow-manager.js`
- `workflow-manager.ts` → `utils/managers/workflow-manager.ts`
- `n8n-cli.js` → `utils/cli/n8n-cli.js`

For details about where specific utilities were moved, see [MIGRATED.md](./MIGRATED.md).

## Using the New Utilities

Please update your import paths to use the new locations. For example:

```javascript
// Old import
const WorkflowManager = require('./workflow-manager');

// New import
const WorkflowManager = require('../../utils/managers/workflow-manager');
```

## New Features

The migrated utilities have been enhanced with better documentation, clearer organization, and improved compatibility with the architecture guidelines outlined in the documentation.
