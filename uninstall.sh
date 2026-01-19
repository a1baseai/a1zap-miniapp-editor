#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}Uninstalling A1Zap CLI...${NC}"
echo ""

# Remove CLI installation
if [ -d "$HOME/.a1zap/cli" ]; then
    rm -rf "$HOME/.a1zap/cli"
    echo -e "${GREEN}✓${NC} Removed CLI files"
fi

# Remove symlink
if [ -L "$HOME/.local/bin/a1zap" ]; then
    rm -f "$HOME/.local/bin/a1zap"
    echo -e "${GREEN}✓${NC} Removed symlink"
fi

echo ""
echo -e "${GREEN}✓ A1Zap CLI uninstalled${NC}"
echo ""
echo "Note: Your apps and config are still in ~/.a1zap/"
echo "To remove everything: rm -rf ~/.a1zap"
echo ""
