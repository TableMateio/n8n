# n8n Workflow Templates

This directory contains reusable workflow templates organized by their functional purpose in our automation ecosystem.

## Workflow Naming Convention

All workflows should follow our standardized naming convention:

```
[COMPONENT]: [Entity] - [Optional component name]
```

### Component Types

- **OPERATION**: Reusable, atomic actions that perform a specific function (e.g., API calls, data transformations)
- **PROCESS**: Multi-step business processes that orchestrate multiple operations
- **ROUTER**: Entry points that detect various events and route them to appropriate processes

### Examples

- `OPERATION: Airtable - Search Records`
- `PROCESS: Foreclosure - Enrich`
- `ROUTER: Auction`

## Directory Structure

```
workflows/
├── operations/         # Reusable, atomic workflow operations
│   ├── airtable/       # Airtable-specific operations
│   ├── data/           # Data processing operations
│   └── ...
├── processes/          # Multi-step business processes
│   ├── foreclosure/    # Foreclosure-related processes
│   └── ...
└── routers/            # Event detection and routing workflows
    ├── airtable/       # Airtable-triggered routers
    └── ...
```

## Using the CLI for Creating Standardized Workflows

We've added a helper function to our CLI tools to create workflows with standardized names:

```bash
node utils/cli/n8n-cli.js create-named <componentType> <entity> [component-name]
```

Example:
```bash
node utils/cli/n8n-cli.js create-named OPERATION Airtable "Search Records"
# Creates a workflow named "OPERATION: Airtable - Search Records"
```

## Best Practices

1. **Consistency**: Always use the standardized naming convention for all workflows
2. **Modularity**: Operations should be small, focused, and reusable
3. **Documentation**: Include descriptive node names and comments in workflows
4. **Error Handling**: Include error handling nodes in all workflows
5. **Testing**: Test workflows with various input scenarios before production use

## Programmatic Workflow Creation

You can also create standardized workflows programmatically using the `N8nConnectionManager`:

```javascript
const { N8nConnectionManager } = require('../utils/connection/n8n-connection');

async function createWorkflow() {
  const n8n = new N8nConnectionManager();
  await n8n.initialize();

  const workflow = await n8n.createNamedWorkflow(
    'OPERATION',
    'Airtable',
    'Search Records',
    [...nodes],
    {...connections},
    {...options}
  );

  console.log(`Created workflow: ${workflow.name} (${workflow.id})`);
}
```
