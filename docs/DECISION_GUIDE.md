# N8N Component Decision Guide

When building Tax Surplus Recovery workflows, ask yourself these questions to determine the right component type:

## Core Questions

### When to Create a Workflow?
- Does this represent a complete business process?
- Is it tied to a specific entity (auction, foreclosure, property)?
- Will it be triggered directly by an event?
- Does it coordinate multiple steps across different systems?
- EXAMPLES: discover-auctions, enrich-foreclosure, research-contact

### When to Create a Step?
- Is this an atomic operation that can be reused across workflows?
- Does it represent a single interaction with a system?
- Can it be applied to different entities or processes?
- Does it have a clear input and output contract?
- EXAMPLES: scrape-page, fill-form, create-record, send-email

### When to Create a Utility?
- Is this a pure function with no side effects?
- Will it be used by multiple steps or workflows?
- Does it primarily transform or validate data?
- Does it implement a technical approach that might change?
- EXAMPLES: format-address, validate-data, process-with-ai

## Reusability Questions
1. Could this be used for a different county system?
2. Could this be used for a different entity type?
3. Would this be useful in a different business process?
4. Is this specific to implementation details that might change?

## Abstraction Guidelines
1. Abstract by FUNCTION not by ENTITY
2. Use environment types instead of specific technologies
3. Parameterize instead of hardcoding
4. Compose complex workflows from simple steps
5. Keep components focused on a single responsibility

## Configuration Rules
1. Configuration should describe WHAT and WHERE, not HOW
2. Use environment types to determine implementation approach
3. Maintain common structure across similar systems
4. County-specific information comes from Airtable, not config
5. Make configs as simple as possible while maintaining flexibility

## Remember
- The goal is to write once, use everywhere
- Make each component testable in isolation
- Design for extension, not modification
- When in doubt, favor simplicity over complexity
