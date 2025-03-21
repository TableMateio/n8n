# Airtable Operations

This directory contains reusable workflow operations for interacting with Airtable.

## Purpose

Airtable operations provide standardized ways to:
- Retrieve records from Airtable
- Update records in Airtable
- Create new records
- Search for records using field names or IDs
- Handle linked records properly
- Manage field mappings

These operations abstract the complexity of Airtable interactions and provide a consistent interface for higher-level processes.

## Directory Structure

```
workflows/operations/airtable/
├── README.md                      # This file
├── get-record.js                  # Operation to retrieve a single record
├── search-records.js              # Operation to search for records with proper field handling
├── update-record.js               # Operation to update a record
├── create-record.js               # Operation to create a new record
├── handle-linked-record.js        # Operation to properly handle linked record fields
└── ...
```

## Implementation Notes

- Operations should be atomic, focusing on a specific task
- They should handle edge cases like field name vs ID issues
- Each operation should adapt based on the environment and system configuration
- Error handling should be thorough with clear error messages
- Operations should be composable and have consistent interfaces

## Common Issues Addressed

These operations help address common Airtable integration issues including:
- Field name vs field ID mismatches in filter formulas
- Linked field resolution challenges
- Authentication and credential validation
- Field format inconsistencies
- Pagination handling for large result sets
