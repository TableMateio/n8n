# Airtable Workflow Fixes and Debugging

This document summarizes the work done to fix issues with the Airtable nodes in the "Dynamic Airtable Configuration" workflow and the debugging steps taken.

## Issues Identified

1. **Incorrect Airtable Node Structure:** The Airtable nodes were using an outdated structure that didn't align with the current version of the Airtable node.
2. **Incorrect Filter Formula Format:** The filter formulas were not correctly formatted, causing query issues.
3. **Field IDs vs Field Names in Formulas:** Airtable filter formulas require field **names** not field **IDs**, which was a critical discovery.
4. **Missing Trigger Node:** The workflow didn't have a proper trigger node, preventing API execution.
5. **Credential Type Mismatch:** The nodes were using `airtableApi` instead of the newer `airtableTokenApi` type.
6. **Table and Field ID References:** Some of the table and field IDs might have been incorrect.

## Solutions Implemented

### 1. Updated Scripts

Several scripts were created to diagnose and fix the issues:

- `fix-airtable-filtering.js`: Updates the existing workflow's Airtable nodes with proper structure and filter formulas.
- `debug-airtable-nodes.js`: Tests different filter formula formats to identify which one works correctly.
- `debug-airtable-field-names.js`: Specifically tests field names vs. field IDs in filter formulas.
- `test-airtable-credentials.js`: Validates that the Airtable credentials are working correctly.
- `fix-airtable-workflow-trigger.js`: Adds a manual trigger node to the workflow.
- `recreate-airtable-workflow.js`: Creates a new version of the workflow with the correct structure.

### 2. Airtable Node Structure Updates

The key changes made to the Airtable nodes include:

- Added `resource: "record"` and `application: "airtable"` to parameters
- Changed operation from `list` to `search` to enable filtering
- Properly structured base and table parameters:
  ```javascript
  base: {
    __rl: true,
    value: AIRTABLE_REFERENCE.BASE_ID,
    mode: "list",
    cachedResultName: "Tax Surplus",
    cachedResultUrl: `https://airtable.com/${AIRTABLE_REFERENCE.BASE_ID}`
  }
  ```
- Updated credentials to use `airtableTokenApi` instead of `airtableApi`

### 3. Filter Formula Formatting with Field Names

We discovered that Airtable formulas must use field **names**, not field **IDs**. For example:

```
# This WORKS:
{Auction} = '24-10-onondaga-ny'

# This DOESN'T WORK:
{fld7zoOS3uQg4tiyh} = '24-10-onondaga-ny'
```

We created a field name mapping system in `scripts/airtable-reference.js` to handle this correctly:

```javascript
// Example of our field name mappings
FIELD_NAMES: {
  AUCTION: {
    'fld7zoOS3uQg4tiyh': 'Auction', // PRIMARY_FIELD
    'fldQM9eGzadxpJujs': 'County',  // COUNTY
    // ...other fields
  }
}
```

And a helper method to generate the correct filter formula:

```javascript
createFilterFormula(tableType, fieldId, value) {
  const fieldName = this.getFieldName(tableType, fieldId);
  return `{${fieldName}} = '${value}'`;
}
```

### 4. Workflow Structure Enhancements

- Added a Manual Trigger node to allow API execution
- Connected all nodes properly to ensure data flow
- Fixed node positions for better visualization

## Reference Files

The following reference files were created during the debugging process:

1. `original-workflow-before-airtable-fix.json`: Original workflow before fixes
2. `fixed-workflow-with-airtable-filtering.json`: Workflow after Airtable node fixes
3. `original-workflow-before-trigger-fix.json`: Workflow before adding trigger node
4. `fixed-workflow-with-trigger.json`: Workflow after adding trigger node
5. `new-airtable-workflow.json`: Fresh workflow created from scratch
6. `airtable-field-name-test-workflow.json`: Test workflow comparing field names vs IDs

## Field Name Mappings

We created an enhanced Airtable reference file that includes both field IDs and their corresponding display names:

```javascript
const AIRTABLE_REFERENCE = {
    BASE_ID: 'appWxxzsTHMY0MZHu',
    BASE_NAME: 'Tax Surplus',

    // Table IDs
    TABLES: {
        AUCTIONS: 'tblteK8SeHqZ8xQxV',
        // ...other tables
    },

    // Field IDs by table
    FIELD_IDS: {
        AUCTION: {
            PRIMARY_FIELD: 'fld7zoOS3uQg4tiyh', // auction_id
            COUNTY: 'fldQM9eGzadxpJujs', // county
            // ...other fields
        },
        // ...other tables
    },

    // Field Names by table (map from ID to name)
    FIELD_NAMES: {
        AUCTION: {
            'fld7zoOS3uQg4tiyh': 'Auction', // PRIMARY_FIELD
            'fldQM9eGzadxpJujs': 'County', // COUNTY
            // ...other fields
        },
        // ...other tables
    },

    // Helper methods
    getFieldName(tableType, fieldId) {
        // Returns field name from ID
    },

    createFilterFormula(tableType, fieldId, value) {
        // Creates a filter formula using field name
    }
};
```

## API Execution Issues

Despite our fixes, we encountered issues with the workflow execution API:

- The `/workflows/{id}/execute` endpoint returned 404 errors, suggesting it's not available in this version of n8n.
- The `/workflows/{id}/activate` endpoint returned errors because the workflow requires a trigger node.

## Next Steps

1. **Test in UI:** Open the newly created workflow (ID: 6PFLsCmsw6z9Xy31) in the n8n UI and test it manually.
2. **Verify Credentials:** Ensure the "Airtable" credential exists and is properly configured as an Access Token.
3. **Use Field Names in Formulas:** Remember to always use field display names (not IDs) in Airtable filter formulas.
4. **Consider n8n Version:** Some of the API issues might be related to the specific version of n8n being used.

## Conclusion

The workflow should now have the proper structure with correctly configured Airtable nodes. The filter formulas have been updated to use the correct field name format. While API execution issues remain, the workflow should be functional when run manually in the n8n UI.
