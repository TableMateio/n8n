# Coding Guidelines for AI and Developers

## Core Principles

- **Simplicity and Elegance**: Code should be simple, readable, and elegant - like a logical treatise.
- **Consistency**: Follow consistent patterns across the codebase.
- **Complete Implementation**: When making changes, implement them fully across the system.
- **Design-Focused**: Treat code organization as UX. Everything is design, including how one codes.

Adhere strictly to the task you've been set out to do, and don't jump ahead. Do what's required to complete that task fully, but don't start a new section or new idea. If it means creating new files or folders or systems, it's probably a moment to pause and ask what you should do next, or ask if it's okay to do something next.

Your instructions are to keep things simple and take it slow. Moving forward, you'll:
Do one task at a time and never start doing the next thing unless specified.
Focus only on what I ask for
Not install unnecessary packages
Take smaller steps instead of trying to do too much at once
Not create any new files in these folders until I specifically request them.

Before continuing with a new task, ask yourself if there are any situations that would break this. How might we realistically expect to expand functionality in the future and which of those expansions does this current method support, not support, or could be easily modified? What would it make sense to modify in advance without gettiing too ahead of ourselves of unwieldy? Answer these questions and make adjustments to the code to make it slightly more robust to accomodate realistic future situations and edge cases without anticipating wild changes.


## Abstract System Design
When designing any system component, prioritize appropriate abstractions and future extensibility:
Generate, Don't Enumerate: Create generators and factories rather than enumerating instances. Build systems that can produce variants rather than manually coding each possibility.
Schema-Driven Development: Base all aspects of your system on schemas - generation, validation, transformation, testing, and UI. When something changes, it should only need to change in the schema.
Pattern Recognition and Replication: Identify patterns across your domain and create abstractions that can be applied universally. If you're writing similar code twice, extract the pattern.
Composition Over Configuration Over Coding: Compose functionality from smaller, reusable parts. Prefer configuration to custom code. When you must code, make it generic and reusable.
Derive Don't Declare: Derive properties, behaviors, and capabilities programmatically whenever possible instead of hardcoding them. Future requirements should be accommodated by changing rules, not adding code.
Interface Anticipation: Design interfaces with future consumers in mind, not just current ones. Consider what other systems might need from yours tomorrow.
Extensibility By Default: Build extension points into everything. Assume every component will need to be extended in ways you haven't anticipated.
Minimize Magic Knowledge: Systems should be self-describing and self-documenting. New developers shouldn't need "inside knowledge" to use your components.
Design Thinking Questions
When designing any component, consider:
What patterns exist across different parts of the system that could be unified?
How can this abstraction express intent more clearly?
What's likely to change in the future, and how can this design accommodate those changes?
What other systems or components might need to interact with this one in the future?
How can this system minimize repetitive work for both developers and users?
What edge cases might arise, and how can the design gracefully handle them?
How can the interface be designed so consumers don't need to know implementation details?
What would make this system easier to test, monitor, and debug?
How would this design scale if the number of entities/users/operations increased by 10x?
Implementation Principles
Parametrize Over Hardcode: Use parameters and configuration rather than hardcoding values.
Progressive Enhancement: Build the core functionality first, then add complexity gradually.
Data-Driven Behavior: Let data shape behavior rather than coding conditional logic.
Implicit Over Explicit: Build systems that do the right thing automatically instead of requiring explicit direction.
Runtime Adaptability: Design systems that can adapt their behavior at runtime based on context.
Separation of What from How: Clearly separate the definition of what should happen from how it happens.
Use The System To Build The System: Your tools should be built using the same patterns and principles as your product.
Remember: The measure of good abstraction isn't how complex it is, but how much complexity it hides while remaining intuitive to use.


## Naming and Organization

### File and Directory Naming

- Use simple, consistent names for files within a category:
  ```
  flows.ts
  triggers.ts
  workflows.ts
  ```
  or
  ```
  send.ts
  post.ts
  get.ts
  update.ts
  ```

- Organize directories so the path provides semantic clarity:
  - Prefer: `workflows/auction.ts` over `workflows/auctionWorkflow.ts`
  - Use folder names that clarify purpose, allowing simpler file names

- Use kebab-case for file names: `pre-auction-flow.ts`

- Choose names that make sense from both business and engineering perspectives

### Variable and Function Naming

- Use PascalCase for classes, interfaces, types, and enums
- Use camelCase for variables and functions
- Choose names that reflect business vocabulary rather than mechanical descriptions
- Consider domain-specific terminology to name states of objects:
  - Example: `foreclosure` → `lot` → `sale` for auction progression
  - Alternatively, use consistent prefixes: `preForeclosure`, `auctionForeclosure`, `soldForeclosure`

## Code Documentation

### Core Principles
- Comments explain **why**, not what
- Group related code with section headers
- Focus on purpose, not mechanics
- Use JSDoc for public methods and interfaces


## Code Changes and Implementation

- When implementing changes:
  - Remove deprecated code completely
  - Update all references to changed structures
  - Ensure no important information is lost during refactoring
  - Complete the entire logical change; don't implement partial solutions

- When moving functionality:
  - Move all relevant code, tests, and documentation
  - Update all references and imports
  - Preserve important context and comments

- Exercise reasonable autonomy:
  - Complete logical changes without asking for permission at each step
  - Draw the line at changes that fundamentally alter the architecture

## Error Handling and Testing

- **Error Handling**:
  - Use typed error handling
  - Log errors with context before rethrowing
  - Include stack traces in development
  - Use structured error objects

- **Testing**:
  - Every flow should have example tests
  - Co-locate test files with implementation
  - Include tests for error cases
  - Mock external services properly

## Common Issues with AI-Assisted Development

### Avoiding Partial Implementation
- Don't leave code in a partially implemented state
- If you're modifying a pattern, change all instances of that pattern
- Check for orphaned imports, variables, or fragments

### Ensuring Type Safety
- Always maintain type integrity
- Never use `any` type without explicit justification
- Ensure interfaces are fully implemented
- Don't leave type errors to be fixed later

### Handling Component Dependencies
- When changing component APIs, update all consumers
- When changing state structures, update all code that accesses that state
- Be mindful of circular dependencies

### Maintaining Configuration Consistency
- Ensure configuration structures remain consistent
- Don't create new configuration patterns without justification
- Update all example configurations when changing schemas

### Handling Asynchronous Code
- Use async/await consistently
- Properly handle promise rejections
- Don't mix promise chaining and async/await styles
- Be careful with concurrent operations to avoid race conditions

## Project-Specific Guidelines

### Intent-Driven Architecture
- Maintain separation between intent declarations and implementations
- Don't create intents with implementation details embedded
- Keep intent definitions declarative and outcome-focused

### Configuration-Driven Workflows
- Separate system-specific details from logic
- Use configuration to drive behavior, not hardcoded values
- Ensure configurations are validated before use

### Step Implementation
- Keep steps atomic and focused on a single responsibility
- Ensure steps are stateless and receive their context explicitly
- Return modified state rather than modifying global state

## Development Process

- **Terminal Usage**:
  - For routine operations (package installs, git pushes), proceed without permission
  - Assign distinct port numbers to different services to avoid confusion
  - Close terminals after use to maintain clarity

- **Git Workflow**:
  - Make atomic, focused commits
  - Use descriptive commit messages that explain both what and why
  - Push changes after completing logical units of work