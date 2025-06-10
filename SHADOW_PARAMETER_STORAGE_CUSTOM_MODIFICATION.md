# Shadow Parameter Storage System - Custom N8N Modification

## ⚠️ CRITICAL: Custom Modification Alert ⚠️

**THIS FILE DOCUMENTS CUSTOM MODIFICATIONS TO N8N CORE FILES**

🚨 **DO NOT OVERWRITE THESE CHANGES WHEN UPDATING N8N** 🚨

If you update N8N to a newer version, you MUST carefully preserve or re-implement these changes, as they provide critical UX improvements for conditional field value preservation.

## Problem Description

### Core Issue
In N8N's default behavior, when a dropdown field with `displayOptions` changes values, any dependent fields that become hidden **lose their values permanently**. This creates a poor user experience where users lose their work when exploring different dropdown options.

### Specific Scenario
1. User sets dropdown to "attribute" → dependent `attributeName` field appears
2. User fills in `attributeName` with value (e.g., "data-id" or expression "={{ $json.attrName }}")
3. User switches dropdown to "text" → `attributeName` field disappears AND value is cleared
4. User switches back to "attribute" → `attributeName` field reappears but is now empty ❌

### Impact
- **Lost work**: Users lose their input when experimenting with different dropdown options
- **Poor UX**: Fear of switching options because values might be lost
- **Inefficient workflows**: Users avoid using conditional fields or write workarounds
- **Affects ALL nodes**: This impacts any N8N node using conditional `displayOptions`

## Solution: Shadow Parameter Storage System

### Concept
Implement a "shadow storage" system that:
1. **Preserves hidden field values** instead of clearing them
2. **Restores values** when fields become visible again
3. **Maintains separate storage** per controlling field value
4. **Works with both static values and expressions**

### How It Works
```
User Flow:
1. Dropdown = "attribute", attributeName = "data-id"
   → Save: shadowStore["attributeName"]["attribute"] = "data-id"

2. Dropdown changes to "text"
   → attributeName field hidden but value preserved in shadow store

3. Dropdown changes back to "attribute"
   → Restore: attributeName = shadowStore["attributeName"]["attribute"] = "data-id" ✅
```

## Technical Implementation

### Architecture Overview

The solution captures the **old controlling field value** before parameter updates and uses it as the key for shadow storage:

```javascript
// BEFORE parameter update: capture old value
const oldValue = get(nodeParameters, parameterPath);

// AFTER parameter update: save dependent fields with old value as key
saveFieldValue(dependentFieldPath, String(oldValue), fieldValue);

// LATER: restore using new controlling value as key
restoreFieldValue(dependentFieldPath, String(newValue), nodeParameters);
```

## Files Modified

### 1. `packages/frontend/editor-ui/src/stores/ndv.store.ts`

**Purpose**: Added shadow parameter storage functions to NDV store

**Changes Added**:
```typescript
// Shadow parameter storage for conditional fields
const shadowParameterStores = ref(new Map<string, Map<string, Map<string, any>>>());

const getShadowStore = () => {
	if (!currentNode.value?.id) return null;

	if (!shadowParameterStores.value.has(currentNode.value.id)) {
		shadowParameterStores.value.set(currentNode.value.id, new Map());
	}

	return shadowParameterStores.value.get(currentNode.value.id)!;
};

const saveFieldValue = (fieldPath: string, controllingFieldValue: string, value: NodeParameterValue) => {
	const store = getShadowStore();
	if (!store || !value) return;

	if (!store.has(fieldPath)) {
		store.set(fieldPath, new Map());
	}

	store.get(fieldPath)!.set(controllingFieldValue, value);
	console.log(`[Shadow] Saved ${fieldPath} = ${JSON.stringify(value)} for controlling value "${controllingFieldValue}"`);
};

const restoreFieldValue = (fieldPath: string, controllingFieldValue: string, nodeParameters: INodeParameters) => {
	const store = getShadowStore();
	if (!store || !store.has(fieldPath)) return null;

	const fieldStore = store.get(fieldPath)!;
	if (!fieldStore.has(controllingFieldValue)) return null;

	const storedValue = fieldStore.get(controllingFieldValue);
	const currentValue = get(nodeParameters, fieldPath);

	// Only restore if field is currently empty
	if ((currentValue === undefined || currentValue === null || currentValue === '') && storedValue) {
		set(nodeParameters, fieldPath, storedValue);
		console.log(`[Shadow] Restored ${fieldPath} = "${storedValue}" for controlling value "${controllingFieldValue}"`);
		return storedValue;
	}

	return null;
};
```

**Key Features**:
- **Per-node storage**: Separate shadow storage for each node instance
- **Nested field support**: Works with complex field paths like `filterCriteria.criteria[0].attributeName`
- **Value preservation**: Only restores if current field is empty (doesn't overwrite user changes)
- **Debug logging**: Console logs for troubleshooting

### 2. `packages/frontend/editor-ui/src/components/NodeSettings.vue`

**Purpose**: Enhanced parameter update logic to use shadow storage

**Critical Changes**:

#### A. Old Value Capture (Lines ~720-725)
```typescript
// CRITICAL: Capture the old value BEFORE updating the parameter
const oldValue = get(nodeParameters, parameterPath);

if (newValue === undefined) {
	unset(nodeParameters as object, parameterPath);
} else {
	set(nodeParameters as object, parameterPath, newValue);
}
```

#### B. Enhanced removeMismatchedOptionValues Function
```typescript
const removeMismatchedOptionValues = (
	nodeType: INodeTypeDescription,
	nodeParameterValues: INodeParameters | null,
	updatedParameter: { name: string; value: NodeParameterValue; oldValue?: NodeParameterValue },
) => {
```

#### C. Shadow Storage Integration (Lines ~535-540)
```typescript
if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
	// SAVE VALUE TO SHADOW STORE before clearing
	// Use the OLD value that made this field visible (passed from valueChanged function)
	const oldControllingValue = String(updatedParameter.oldValue || '');
	saveFieldValue(actualDependentFieldPath, oldControllingValue, currentValue);

	unset(nodeParameterValues as object, actualDependentFieldPath);
	console.log(`[N8N] Cleared dependent field: ${actualDependentFieldPath} (depends on ${changedFieldName})`);
}
```

#### D. Value Restoration Logic (Lines ~545-550)
```typescript
} else {
	// Field is visible - check if we should restore a saved value
	const currentValue = get(nodeParameterValues, actualDependentFieldPath);
	console.log(`[DEBUG]   - Field is visible, currentValue:`, currentValue);
	if ((currentValue === undefined || currentValue === null || currentValue === '')) {
		const restoredValue = restoreFieldValue(actualDependentFieldPath, String(updatedParameter.value || ''), nodeParameterValues);
		if (restoredValue) {
			console.log(`[DEBUG]   - Restored value: ${restoredValue}`);
		}
	}
}
```

### Key Technical Insights

#### 1. Timing is Critical
The **old value must be captured BEFORE the parameter update**:
```typescript
// ✅ CORRECT: Capture first, then update
const oldValue = get(nodeParameters, parameterPath);
set(nodeParameters as object, parameterPath, newValue);

// ❌ WRONG: Update first, then try to get old value
set(nodeParameters as object, parameterPath, newValue);
const oldValue = get(nodeParameters, parameterPath); // This gets the NEW value!
```

#### 2. Path Adjustment for Collections
For nested `fixedCollection` fields, paths need adjustment:
```typescript
// Changed parameter: "filterCriteria.criteria[0].extractionType"
// Dependent field found as: "filterCriteria.attributeName"
// Must adjust to: "filterCriteria.criteria[0].attributeName"

const collectionItemMatch = changedParamName.match(/^(.+\[[0-9]+\])\.[^.]+$/);
if (collectionItemMatch) {
	const collectionItemPath = collectionItemMatch[1]; // "filterCriteria.criteria[0]"
	actualDependentFieldPath = `${collectionItemPath}.${fieldName}`;
}
```

#### 3. Context-Aware Visibility Checking
For collection fields, visibility must be checked with collection item context:
```typescript
if (actualDependentFieldPath.includes('.criteria[') && changedParamName.includes('.criteria[')) {
	const collectionItemPath = actualDependentFieldPath.match(/^(.+\.criteria\[\d+\])/)[1];
	const collectionItemValues = get(tempParameterValues, collectionItemPath);
	isVisible = displayParameter(collectionItemValues || {}, prop, node.value, nodeType);
}
```

## Debug Features

### Console Logging
The implementation includes comprehensive debug logging:
- `[Shadow] Saved fieldPath = value for controlling value "X"`
- `[Shadow] Restored fieldPath = "value" for controlling value "X"`
- `[DEBUG] - Field is visible, currentValue: value`
- `[N8N] Cleared dependent field: fieldPath`

### Monitoring in Browser Console
When testing, you can monitor the shadow storage in browser console:
```javascript
// View current shadow storage
$nuxt.$stores.ndv.shadowParameterStores

// Watch for shadow storage activity
// Look for console logs starting with [Shadow] or [DEBUG]
```

## Testing Scenarios

### Basic Field Preservation Test
1. Set dropdown to "attribute"
2. Fill in dependent field with "test-value"
3. Switch dropdown to "text" → field disappears
4. Switch back to "attribute" → field reappears with "test-value" ✅

### Expression Preservation Test
1. Set dropdown to "attribute"
2. Fill in dependent field with "={{ $json.dynamicValue }}"
3. Switch dropdown to "text" → field disappears
4. Switch back to "attribute" → field reappears with expression ✅

### Multiple Value Preservation Test
1. Set dropdown to "attribute", fill field with "attr-value"
2. Switch to "text", fill field with "text-value"
3. Switch back to "attribute" → should show "attr-value"
4. Switch back to "text" → should show "text-value" ✅

## Maintenance Notes

### During N8N Updates

1. **BACKUP THESE FILES FIRST**:
   - `packages/frontend/editor-ui/src/stores/ndv.store.ts`
   - `packages/frontend/editor-ui/src/components/NodeSettings.vue`

2. **AFTER UPDATE**:
   - Compare your backed-up files with new versions
   - Re-apply the shadow storage modifications
   - Test the field preservation functionality
   - Run `pnpm build:frontend` to rebuild

3. **SEARCH FOR THESE MARKERS** in new N8N versions:
   - `removeMismatchedOptionValues` function
   - `valueChanged` function in NodeSettings.vue
   - NDV store structure changes

### Git Protection Strategy

You can use Git to help protect these changes:

```bash
# Mark these files as "assume unchanged" to prevent accidental overwrites
git update-index --assume-unchanged packages/frontend/editor-ui/src/stores/ndv.store.ts
git update-index --assume-unchanged packages/frontend/editor-ui/src/components/NodeSettings.vue

# To revert this protection when you want to update:
git update-index --no-assume-unchanged packages/frontend/editor-ui/src/stores/ndv.store.ts
git update-index --no-assume-unchanged packages/frontend/editor-ui/src/components/NodeSettings.vue
```

### Alternative: Custom Branch Strategy
```bash
# Create a custom feature branch for your modifications
git checkout -b custom-shadow-parameter-storage

# When updating N8N:
git checkout main
git pull # Get N8N updates
git checkout custom-shadow-parameter-storage
git rebase main # Apply your changes on top of new N8N version
# Resolve any conflicts, re-test functionality
```

## Benefits

### User Experience
- **No more lost work**: Users can freely switch between dropdown options
- **Confident exploration**: Users can experiment without fear of losing values
- **Better workflow building**: More intuitive conditional field behavior

### Technical Benefits
- **Backward compatible**: Doesn't break existing functionality
- **Minimal overhead**: Only stores values when needed
- **Works universally**: Benefits ALL N8N nodes using conditional fields
- **Future-proof**: Clean implementation that can evolve with N8N

## Commit History

### Initial Implementation
**Commit Hash**: `bc7b97f00d`
**Branch**: `update-to-v1.97.0`
**Commit Message**: "Fix field value preservation in conditional parameters - implement shadow parameter storage to preserve dependent field values when dropdown changes"

### Critical Bug Fix
**Commit Hash**: `077fbf8b8b`
**Branch**: `update-to-v1.97.0`
**Date**: December 2024
**Commit Message**: "Fix shadow storage fieldPath variable error in NodeSettings.vue - Fixed ReferenceError preventing shadow storage restoration for conditional dropdown parameters"

**Issue Fixed**: The `restoreFieldValue` function was referencing an undefined variable `fieldPath` instead of `actualFieldPath`, causing a `ReferenceError: Can't find variable: fieldPath` that prevented the shadow storage system from working.

**Fix Applied**: Changed line 488 in the `restoreFieldValue` function:
```typescript
// ❌ BEFORE (broken):
const currentValue = get(nodeParameters, fieldPath);

// ✅ AFTER (fixed):
const currentValue = get(nodeParameters, actualFieldPath);
```

**Impact**: This was a critical fix that prevented users from being able to switch back to dropdown options (like "Table" extraction type) without JavaScript errors. The shadow storage system now works correctly for all conditional dropdown parameters.

## Troubleshooting

### Common Issues and Solutions

#### JavaScript Error: "ReferenceError: Can't find variable: fieldPath"
**Symptoms**:
- Cannot switch back to certain dropdown options (e.g., "Table" extraction type)
- JavaScript error in browser console
- Shadow storage restoration fails

**Solution**:
Ensure the `restoreFieldValue` function in `NodeSettings.vue` uses `actualFieldPath` instead of `fieldPath`:
```typescript
// ✅ CORRECT:
const currentValue = get(nodeParameters, actualFieldPath);

// ❌ INCORRECT:
const currentValue = get(nodeParameters, fieldPath);
```

#### Values Not Being Preserved
**Symptoms**: Field values are still lost when switching dropdown options

**Debugging Steps**:
1. **Check browser console** for shadow storage debug logs starting with `[Shadow]`
2. **Verify shadow storage functions exist** in ndv.store.ts: `getShadowStore`, `saveFieldValue`, `restoreFieldValue`
3. **Confirm old value capture** in NodeSettings.vue: Look for `const oldValue = get(nodeParameters, parameterPath)` BEFORE parameter update
4. **Test visibility logic**: Ensure `displayParameter` calls use correct context for collection fields

#### Collection Fields Not Working
**Symptoms**: Shadow storage works for simple fields but not nested collection fields

**Solution**: Verify path adjustment logic for collection items:
```typescript
// For extractionItems.items[0].tableOptions, ensure paths are adjusted correctly
const collectionItemMatch = changedParamName.match(/^(.+\.(items|criteria)\[\d+\])/);
```

## Support

If you encounter issues with this modification:

1. **Check browser console** for shadow storage debug logs
2. **Verify functions exist** in ndv.store.ts: `getShadowStore`, `saveFieldValue`, `restoreFieldValue`
3. **Confirm parameter capture** in NodeSettings.vue: `const oldValue = get(nodeParameters, parameterPath)`
4. **Test with simple cases** before complex nested scenarios
5. **Check commit history** to ensure all fixes have been applied (especially commit `077fbf8b8b`)

This modification significantly improves N8N's UX for conditional fields and represents a valuable enhancement to the core platform.
