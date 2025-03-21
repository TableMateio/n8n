# TaxSurplus n8n Workflow System

This project extends n8n with custom workflows, utilities, and CLI tools for automating TaxSurplus business processes.

## Directory Structure

```
.
├── docs/                      # Documentation
│   ├── dev-process/           # Development process guides
│   └── workflow-architecture/ # Workflow architecture documentation
├── examples/                  # Example workflows for reference
│   └── workflows/             # Exported workflow files
├── tests/                     # Test scripts and utilities
├── utils/                     # Utility scripts and tools
│   ├── cli/                   # CLI tools for workflow management
│   └── connection/            # n8n connection utilities
└── workflows/                 # Main workflow templates
    ├── operations/            # Reusable atomic operations
    ├── processes/             # Business process workflows
    └── routers/               # Event routing workflows
```

## Workflow Naming Convention

All workflows follow a standardized naming convention:

```
[COMPONENT]: [Entity] - [Optional component name]
```

Examples:
- `OPERATION: Airtable - Search Records`
- `PROCESS: Foreclosure - Enrich`
- `ROUTER: Auction`

## CLI Tools

This project includes custom CLI tools to manage workflows:

```bash
# List all workflows
node utils/cli/n8n-cli.js list

# Export a workflow to examples directory
node utils/cli/n8n-cli.js export <workflow-id> examples/workflows

# Delete workflows except specified IDs
node utils/cli/n8n-cli.js cleanup <id1> <id2> ...

# Create a new workflow with standardized naming
node utils/cli/n8n-cli.js create-named <componentType> <entity> [component-name]
```

## Getting Started

1. Clone this repository
2. Run `npm install` to install dependencies
3. Set up your environment variables in a `.env` file:
   ```
   N8N_ENDPOINT=http://localhost:5678
   N8N_API_KEY=your-api-key
   ```
4. Start n8n using the command: `npm run start`
5. Access the n8n editor at http://localhost:5678

## Documentation

- [N8N Implementation Guide](docs/workflow-architecture/N8N-IMPLEMENTATION-GUIDE.md) - Detailed guide for implementing workflows
- [Contributing Guide](docs/dev-process/CONTRIBUTING.md) - How to contribute to this project

## Workflow Types

### Operations

Operations are atomic, reusable functions that perform a specific task:

- Located in `workflows/operations/`
- Focus on a single responsibility
- Have standardized input/output formats
- Include comprehensive error handling

### Processes

Processes implement business logic for specific domains:

- Located in `workflows/processes/`
- Coordinate multiple operations
- Organized by domain (foreclosure, auction, etc.)
- Include state management and error handling

### Routers

Routers serve as entry points that detect events and route them to appropriate processes:

- Located in `workflows/routers/`
- Centralize event detection
- Route to appropriate processes based on event type
- Reduce duplication across similar event types
