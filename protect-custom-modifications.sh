#!/bin/bash

# Protect Custom N8N Modifications Script
# This script helps protect custom modifications from being accidentally overwritten during N8N updates

echo "🛡️  N8N Custom Modifications Protection Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show current protection status
show_status() {
    echo -e "\n${BLUE}Current Protection Status:${NC}"

    # Check if files are marked as assume-unchanged
    if git ls-files -v | grep "^h.*packages/frontend/editor-ui/src/stores/ndv.store.ts" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ndv.store.ts is protected (assume-unchanged)${NC}"
    else
        echo -e "${RED}❌ ndv.store.ts is NOT protected${NC}"
    fi

    if git ls-files -v | grep "^h.*packages/frontend/editor-ui/src/components/NodeSettings.vue" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ NodeSettings.vue is protected (assume-unchanged)${NC}"
    else
        echo -e "${RED}❌ NodeSettings.vue is NOT protected${NC}"
    fi
}

# Function to protect files
protect_files() {
    echo -e "\n${YELLOW}Protecting custom modification files...${NC}"

    git update-index --assume-unchanged packages/frontend/editor-ui/src/stores/ndv.store.ts
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Protected ndv.store.ts${NC}"
    else
        echo -e "${RED}❌ Failed to protect ndv.store.ts${NC}"
    fi

    git update-index --assume-unchanged packages/frontend/editor-ui/src/components/NodeSettings.vue
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Protected NodeSettings.vue${NC}"
    else
        echo -e "${RED}❌ Failed to protect NodeSettings.vue${NC}"
    fi

    echo -e "\n${GREEN}Files are now protected from git changes.${NC}"
    echo -e "${YELLOW}⚠️  Remember: These files will now be ignored by git operations.${NC}"
    echo -e "${YELLOW}⚠️  You must run this script with 'unprotect' before making intentional changes.${NC}"
}

# Function to unprotect files
unprotect_files() {
    echo -e "\n${YELLOW}Unprotecting custom modification files...${NC}"

    git update-index --no-assume-unchanged packages/frontend/editor-ui/src/stores/ndv.store.ts
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Unprotected ndv.store.ts${NC}"
    else
        echo -e "${RED}❌ Failed to unprotect ndv.store.ts${NC}"
    fi

    git update-index --no-assume-unchanged packages/frontend/editor-ui/src/components/NodeSettings.vue
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Unprotected NodeSettings.vue${NC}"
    else
        echo -e "${RED}❌ Failed to unprotect NodeSettings.vue${NC}"
    fi

    echo -e "\n${GREEN}Files are now unprotected and will be tracked by git again.${NC}"
}

# Function to backup custom modifications
backup_files() {
    echo -e "\n${YELLOW}Creating backup of custom modifications...${NC}"

    BACKUP_DIR="custom-modifications-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    cp packages/frontend/editor-ui/src/stores/ndv.store.ts "$BACKUP_DIR/"
    cp packages/frontend/editor-ui/src/components/NodeSettings.vue "$BACKUP_DIR/"
    cp SHADOW_PARAMETER_STORAGE_CUSTOM_MODIFICATION.md "$BACKUP_DIR/"

    echo -e "${GREEN}✅ Backup created in: $BACKUP_DIR${NC}"
    echo -e "${BLUE}Files backed up:${NC}"
    echo "  - ndv.store.ts"
    echo "  - NodeSettings.vue"
    echo "  - SHADOW_PARAMETER_STORAGE_CUSTOM_MODIFICATION.md"
}

# Function to create custom branch
create_custom_branch() {
    echo -e "\n${YELLOW}Creating custom modifications branch...${NC}"

    CURRENT_BRANCH=$(git branch --show-current)
    CUSTOM_BRANCH="custom-shadow-parameter-storage"

    if git branch | grep -q "$CUSTOM_BRANCH"; then
        echo -e "${YELLOW}⚠️  Branch '$CUSTOM_BRANCH' already exists${NC}"
        read -p "Switch to it? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout "$CUSTOM_BRANCH"
        fi
    else
        git checkout -b "$CUSTOM_BRANCH"
        echo -e "${GREEN}✅ Created and switched to branch '$CUSTOM_BRANCH'${NC}"
        echo -e "${BLUE}This branch contains your custom shadow parameter storage modifications.${NC}"
        echo -e "${BLUE}When updating N8N:${NC}"
        echo "  1. git checkout main"
        echo "  2. git pull # Get N8N updates"
        echo "  3. git checkout $CUSTOM_BRANCH"
        echo "  4. git rebase main # Apply your changes on top"
    fi
}

# Function to show help
show_help() {
    echo -e "\n${BLUE}N8N Custom Modifications Protection Tool${NC}"
    echo -e "\nThis script helps protect your shadow parameter storage modifications"
    echo -e "from being accidentally overwritten during N8N updates.\n"
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./protect-custom-modifications.sh [command]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  status      Show current protection status"
    echo "  protect     Mark files as assume-unchanged (ignore in git)"
    echo "  unprotect   Remove assume-unchanged flag (track in git again)"
    echo "  backup      Create timestamped backup of modifications"
    echo "  branch      Create/switch to custom modifications branch"
    echo "  help        Show this help message"
    echo ""
    echo -e "${YELLOW}Files protected:${NC}"
    echo "  - packages/frontend/editor-ui/src/stores/ndv.store.ts"
    echo "  - packages/frontend/editor-ui/src/components/NodeSettings.vue"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo "  - SHADOW_PARAMETER_STORAGE_CUSTOM_MODIFICATION.md"
}

# Main script logic
case "$1" in
    "status")
        show_status
        ;;
    "protect")
        protect_files
        show_status
        ;;
    "unprotect")
        unprotect_files
        show_status
        ;;
    "backup")
        backup_files
        ;;
    "branch")
        create_custom_branch
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        echo -e "${BLUE}N8N Custom Modifications Protection${NC}"
        echo "Run with 'help' to see available commands"
        show_status
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run with 'help' to see available commands"
        exit 1
        ;;
esac
