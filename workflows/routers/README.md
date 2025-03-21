# Workflow Routers

This directory contains workflow routers that serve as entry points for various business events.

## Purpose

Routers centralize event detection and routing logic in one place, replacing individual triggers scattered across many workflows. A router detects various events and routes them to appropriate processes based on event type, source, and other criteria.

## Directory Structure

```
workflows/routers/
├── README.md                # This file
├── airtable/                # Airtable-specific routers
│   ├── record-created.js    # Routes new record events
│   └── record-updated.js    # Routes record update events
├── email/                   # Email-related routers
│   └── inbox-monitor.js     # Routes incoming emails
└── ...
```

## Implementation Pattern

Routers follow a consistent pattern:

```javascript
// Example Router Template
function buildWorkflow() {
  // 1. Define trigger (HTTP, webhook, schedule, etc.)
  const trigger = NodeBuilder.createTriggerNode({
    id: 'trigger',
    // Trigger configuration...
  });

  // 2. Create event detection and routing logic
  const routingLogic = NodeBuilder.createFunctionNode({
    id: 'determine_route',
    code: `
      // Analyze event data
      const eventType = $input.body.eventType;
      const entity = $input.body.entity;

      // Routing logic to determine which process to call
      let processToCall;
      if (eventType === 'created' && entity === 'property') {
        processToCall = 'processes/property/enrich-property';
      } else if (...) {
        // Additional routing rules
      }

      return { processToCall };
    `
  });

  // 3. Process execution nodes (one per possible route)
  const executeProcess = NodeBuilder.createExecuteWorkflowNode({
    id: 'execute_process',
    parameters: {
      workflowId: '={{ $getWorkflowByName($input.processToCall) }}'
    }
  });

  // 4. Connect nodes
  NodeBuilder.connect(trigger, routingLogic);
  NodeBuilder.connect(routingLogic, executeProcess);

  // 5. Return the workflow
  return NodeBuilder.workflow({
    nodes: [trigger, routingLogic, executeProcess],
    connections: NodeBuilder.getConnections(),
    settings: {
      saveExecutionProgress: true,
      callerPolicy: 'workflowsFromSameOwner'
    }
  });
}

module.exports = { buildWorkflow };
```

## Best Practices

- Keep routing logic clear and maintainable
- Include comprehensive event detection patterns
- Add robust error handling and fallback routes
- Use standardized input/output formats
- Document expected event formats for each router

## Router vs. Trigger vs. Process

- **Router**: Detects various events and routes to appropriate processes
- **Trigger**: A specific event detection mechanism (HTTP, schedule, webhook)
- **Process**: Business logic that acts on event data

Routers reduce duplication across similar event types by centralizing event detection and routing logic. They also make it easier to discover entry points into the system.
