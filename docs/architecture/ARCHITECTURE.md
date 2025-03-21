# Tax Surplus Recovery System - n8n Architecture

This document details the architecture of our n8n-based Tax Surplus Recovery System, focusing on code organization, component structure, and implementation patterns.

> **Related Documentation**:
> - [STRATEGY.md](../STRATEGY.md) - Overall implementation strategy
> - [DECISION_GUIDE.md](./DECISION_GUIDE.md) - Framework for architectural decisions
> - [N8N-WORKFLOW-ARCHITECTURE.md](../workflow-architecture/N8N-WORKFLOW-ARCHITECTURE.md) - n8n workflow architecture implementation

## 1. Component Structure

Our system is organized into four primary component types:

### Triggers
Entry points that detect events and initiate workflows.
```
/triggers
  /airtable        # Airtable record changes
    /created.ts    # New records
    /updated.ts    # Changed fields
    /deleted.ts    # Removed records
  /schedule        # Time-based events
    /daily.ts      # Daily processes
    /weekly.ts     # Weekly processes
    /monthly.ts    # Monthly processes
```

### Workflows
Business processes organized by entity, representing complete operations.
```
/workflows
  /auction         # Auction-related processes
    /discover.ts   # Find new auctions
    /monitor.ts    # Track auction status
    /process-results.ts # Handle auction completion
  /foreclosure     # Foreclosure-related processes
    /enrich.ts     # Add property/tax/owner info
    /calculate-surplus.ts
    /assess-eligibility.ts
  /contact         # Contact-related processes
    /research.ts   # Find contact information
    /verify.ts     # Confirm contact details
    /outreach.ts   # Generate communications
  /property        # Property-related processes
    /lookup.ts     # Find property details
    /evaluate.ts   # Assess value, etc.
```

### Steps
Atomic, reusable operations that represent specific interactions.
```
/steps
  /browse          # Web page interaction
    /open.ts       # Opening web pages
    /scrape.ts     # Extracting data from pages
    /fill.ts       # Filling forms
    /click.ts      # Clicking elements
  /navigate        # Site navigation
    /menu.ts       # Navigating menus
    /pagination.ts # Handling pagination
    /auth.ts       # Authentication
  /fetch           # Data retrieval
    /api.ts        # API data
    /airtable.ts   # Airtable records
  /transform       # Data processing
    /parse.ts      # Parsing
    /format.ts     # Formatting
  /store           # Data persistence
    /create.ts     # Record creation
    /update.ts     # Record updates
    /link.ts       # Record linking
  /communicate     # External communication
    /email.ts      # Emails
    /letter.ts     # Letters
    /sms.ts        # Text messages
```

### Utilities
Pure functions and implementation approaches.
```
/utils
  /formatters      # Data formatting
    /name.ts       # Name formatting
    /address.ts    # Address formatting
    /currency.ts   # Currency formatting
  /processors      # Implementation approaches
    /playwright.ts # Browser automation
    /cheerio.ts    # Static HTML parsing
    /ai.ts         # AI-assisted extraction
  /validators      # Validation functions
    /schema.ts     # Schema validation
  /logger.ts       # Logging utilities
```

## 2. Data Flow

A typical data flow follows this pattern:

1. **Trigger Activation**
   - An event (Airtable record created, scheduled job) activates a trigger
   - The trigger evaluates conditions and decides which workflow to call

2. **Workflow Execution**
   - The workflow defines the overall business process
   - It composes steps into a logical sequence
   - It handles state between steps and error handling

3. **Step Execution**
   - Each step performs a specific operation
   - Steps use utilities for implementation details
   - Steps maintain a consistent input/output contract

4. **Data Persistence**
   - Results are stored back in Airtable
   - Entity relationships are maintained

## 3. Configuration Approach

System configuration is stored separately from code:

```javascript
{
  "id": "tax-lookup-system",
  "name": "Tax Lookup System",
  "environment": "structured-web",
  "auth": {
    "type": "form",
    "url": "{{baseUrl}}/login",
    "fields": { /* field selectors */ }
  },
  "navigation": {
    "search": {
      "url": "{{baseUrl}}/search",
      "forms": { /* form details */ }
    }
  },
  "data": {
    "property": {
      "selectors": { /* data selectors */ },
      "transformations": { /* data transformations */ }
    }
  }
}
```

Key principles:
- Configuration describes WHAT and WHERE, not HOW
- Environment types determine implementation approach
- Common structure across all systems of the same type
- No county-specific information (that comes from Airtable)

## 4. Component Design Principles

### Workflows
- Organized by entity and purpose
- Composed of reusable steps
- Maintain a clear start and end
- Handle errors and state

### Steps
- Perform a single logical operation
- Accept standardized parameters
- Return consistent response structure
- Are agnostic to specific counties or systems

### Utilities
- Pure functions when possible
- Implement technical approaches
- Separation of concerns
- Maximum reusability

## 5. Examples

### Trigger Example (created.ts)
```javascript
export default {
  watch: 'airtable.record.created',
  execute: async (event) => {
    const { table, recordId, data } = event;

    if (table === 'Foreclosure' && !data.Property) {
      await n8n.workflows.foreclosure.enrich({
        entityId: recordId
      });
    }
  }
}
```

### Workflow Example (enrich.ts)
```javascript
export default {
  execute: async ({ entityId }) => {
    // Get foreclosure data
    const foreclosure = await steps.fetch.airtable({
      table: 'Foreclosure',
      recordId: entityId
    });

    // Resolve county and system
    const county = await steps.fetch.airtable({
      table: 'County',
      recordId: foreclosure.countyId
    });

    const propSystem = await steps.fetch.airtable({
      table: 'Systems',
      filters: {
        Counties: county.id,
        Type: 'Property'
      }
    });

    // Extract property data
    const propertyData = await steps.browse.scrape({
      system: propSystem,
      dataType: 'property',
      searchParams: {
        sbl: foreclosure.sbl
      }
    });

    // Create and link property record
    const propertyId = await steps.store.create({
      table: 'Property',
      data: propertyData
    });

    await steps.store.link({
      table: 'Foreclosure',
      recordId: entityId,
      field: 'Property',
      linkedId: propertyId
    });

    // Continue with tax and owner info...
  }
}
```

### Step Example (scrape.ts)
```javascript
export default async ({ system, dataType, searchParams }) => {
  try {
    // Get system configuration
    const config = await utils.config.getSystem(system.id);

    // Login if needed
    await steps.navigate.auth({ system: config });

    // Navigate to search
    await steps.browse.open({
      url: config.navigation.search.url
    });

    // Fill search form
    await steps.browse.fill({
      form: config.navigation.search.forms.parcel,
      data: searchParams
    });

    // Extract data using the appropriate processor
    const processor = utils.processors.forEnvironment(config.environment);
    const data = await processor.extract({
      selectors: config.data[dataType].selectors,
      transformations: config.data[dataType].transformations
    });

    return {
      status: 'success',
      data
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}
```

## 6. Decision Guide for Adding Components

When adding new components, follow these guidelines:

### Create a Workflow when:
- It represents a complete business process
- It aligns with a specific entity
- It will be triggered directly by an event
- It involves multiple steps across systems

### Create a Step when:
- It's an atomic operation reusable across workflows
- It represents a single interaction with a system
- It can apply to different entities or processes
- It has a clear input/output contract

### Create a Utility when:
- It's a pure function with no side effects
- It will be used by multiple steps or workflows
- It primarily transforms or validates data
- It implements a technical approach that might change

### Key Questions:
1. Could this be used for a different county system?
2. Could this be used for a different entity type?
3. Would this be useful in a different business process?
4. Is this specific to implementation details that might change?

## 7. Implementation Timeline

We will implement this architecture in phases:

### Phase 1: Foundation
- Establish folder structure
- Create core utilities and steps
- Implement basic Airtable integration

### Phase 2: Auction Monitoring
- Develop auction discovery workflows
- Implement property data extraction
- Create foreclosure enrichment process

### Phase 3: Contact Research
- Implement contact discovery
- Develop skip tracing integration
- Create outreach workflows

### Phase 4: Claim Processing
- Implement eligibility assessment
- Develop document generation
- Create claim tracking workflows
