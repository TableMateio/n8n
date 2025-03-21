# Workflow Templates

This directory contains reusable workflow templates organized by abstraction level, following the architecture principles outlined in the [N8N-WORKFLOW-ARCHITECTURE.md](../docs/workflow-architecture/N8N-WORKFLOW-ARCHITECTURE.md) document.

## Directory Structure

```
/workflow-templates
  /triggers         # Entry points/routers organized by source type
    /airtable       # Airtable record change triggers
    /schedule       # Time-based triggers
    /webhook        # External webhook triggers
  /processes        # Business logic flows organized by domain
    /auction        # Auction-related processes
    /foreclosure    # Foreclosure-related processes
    /contact        # Contact-related processes
  /operations       # Reusable, atomic operations
    /web            # Web interaction operations
    /airtable       # Airtable operations
    /data           # Data operations
```

## Usage Guide

### Triggers

Triggers are entry points that respond to external events and route to appropriate processes:
- Respond to a specific event type (Airtable changes, schedules, webhooks)
- Contain minimal logic, primarily for routing
- Determine which process to call based on event conditions
- Pass contextual data to the target process

### Processes

Processes represent business logic flows that accomplish specific goals within a domain:
- Represent a complete business process
- Organized by domain (auction, foreclosure, contact)
- Composed of multiple operations
- Handle state and error management
- Focus on WHAT to do, not HOW to do it

### Operations

Operations are reusable, atomic functions that perform specific tasks and adapt to their environment:
- Perform a single logical operation
- Adapt implementation based on environment type
- Have clear input/output contracts
- Are agnostic to specific entities or business processes
- Focus on HOW to do something, not WHAT to do

## Creating New Templates

When creating new templates:

1. Identify the appropriate abstraction level (trigger, process, or operation)
2. Place the template in the correct subdirectory
3. Use the NodeBuilder and other utilities in the utils directory
4. Follow the pattern established in the examples
5. Export a consistent interface for integration with the WorkflowManager

## Examples

Each directory contains examples to help you understand the patterns:

- **Triggers**: Example triggers for Airtable changes, scheduled events, and webhooks
- **Processes**: Example processes for each domain
- **Operations**: Reusable operations with different environment implementations
