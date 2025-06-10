# Quick Start: Protecting Your N8N Custom Modifications

## 🚨 IMPORTANT: READ THIS FIRST

You have **custom modifications** to N8N that implement **shadow parameter storage** for field value preservation. These changes are **NOT part of standard N8N** and will be lost if you update N8N without taking precautions.

## What You Have

✅ **Shadow Parameter Storage System** - Preserves field values when dropdown conditions change
✅ **Universal Fix** - Works for ALL N8N nodes with conditional fields
✅ **Comprehensive Documentation** - Full technical details in `SHADOW_PARAMETER_STORAGE_CUSTOM_MODIFICATION.md`

## Quick Protection (30 seconds)

### Option 1: Use the Protection Script (Recommended)
```bash
# Create timestamped backup
./protect-custom-modifications.sh backup

# Protect files from git changes
./protect-custom-modifications.sh protect

# Check status
./protect-custom-modifications.sh status
```

### Option 2: Manual Git Protection
```bash
# Mark files as "assume unchanged"
git update-index --assume-unchanged packages/frontend/editor-ui/src/stores/ndv.store.ts
git update-index --assume-unchanged packages/frontend/editor-ui/src/components/NodeSettings.vue
```

## When Updating N8N

### Before Update:
```bash
# Create backup
./protect-custom-modifications.sh backup

# OR manually backup
cp packages/frontend/editor-ui/src/stores/ndv.store.ts ./my-custom-ndv-store.ts
cp packages/frontend/editor-ui/src/components/NodeSettings.vue ./my-custom-node-settings.vue
```

### After Update:
1. **Compare your backup files** with the new N8N versions
2. **Re-apply the shadow storage modifications** (see documentation)
3. **Test field preservation** functionality
4. **Run `pnpm build:frontend`** to rebuild

## Files That Contain Your Modifications

| File | What Changed |
|------|-------------|
| `packages/frontend/editor-ui/src/stores/ndv.store.ts` | Added shadow storage functions |
| `packages/frontend/editor-ui/src/components/NodeSettings.vue` | Enhanced parameter update logic |

## Testing Your Modifications Work

1. Open any node with conditional fields (like your custom browser node)
2. Set dropdown to show a dependent field (e.g., "Table" extraction type)
3. Fill in the dependent field with a value
4. Switch dropdown to hide the field (e.g., to "Attribute")
5. Switch back - **the value should be preserved** ✅

⚠️ **If you get a JavaScript error or can't switch back to certain dropdown options**, check that the recent critical fix (commit `077fbf8b8b`) has been applied. See the troubleshooting section in the full documentation.

## Documentation Files

- 📖 `SHADOW_PARAMETER_STORAGE_CUSTOM_MODIFICATION.md` - Complete technical documentation
- 🛡️ `protect-custom-modifications.sh` - Protection utility script
- 🚀 `QUICK_START_CUSTOM_MODIFICATIONS.md` - This file

## Help & Support

If you encounter issues:
1. Check browser console for `[Shadow]` logs
2. Run `./protect-custom-modifications.sh status`
3. Review the full documentation
4. Test with simple dropdown scenarios first

## Script Commands

```bash
./protect-custom-modifications.sh help      # Show all commands
./protect-custom-modifications.sh status    # Check protection status
./protect-custom-modifications.sh protect   # Enable protection
./protect-custom-modifications.sh unprotect # Disable protection
./protect-custom-modifications.sh backup    # Create backup
./protect-custom-modifications.sh branch    # Create custom branch
```

---

**Remember**: These modifications significantly improve N8N's UX and represent valuable enhancements. Don't lose them! 🛡️
