#!/bin/bash
set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     A1Zap MiniApp Editor - Installer${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo ""
    echo "Please install Node.js first:"
    echo ""
    echo "  → Visit: https://nodejs.org"
    echo "  → Download the LTS version"
    echo "  → Run the installer"
    echo ""
    echo "Then run this script again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version 18+ is required (you have $(node -v))${NC}"
    echo ""
    echo "Please update Node.js at: https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) detected"

# Install location
INSTALL_DIR="$HOME/.a1zap/cli"

# Clean previous installation if exists
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}→${NC} Removing previous installation..."
    rm -rf "$INSTALL_DIR"
fi

# Clone or download
echo -e "${YELLOW}→${NC} Downloading A1Zap CLI..."

mkdir -p "$HOME/.a1zap"

if command -v git &> /dev/null; then
    git clone --depth 1 https://github.com/a1zap/a1zap-miniapp-editor.git "$INSTALL_DIR" 2>/dev/null || {
        echo -e "${RED}✗ Failed to clone repository${NC}"
        echo "  Make sure you have access to the repository."
        exit 1
    }
else
    # Fallback: download tarball if git not available
    curl -sL https://github.com/a1zap/a1zap-miniapp-editor/archive/main.tar.gz | tar xz -C "$HOME/.a1zap"
    mv "$HOME/.a1zap/a1zap-miniapp-editor-main" "$INSTALL_DIR"
fi

echo -e "${GREEN}✓${NC} Downloaded"

# Install dependencies
echo -e "${YELLOW}→${NC} Installing dependencies..."
cd "$INSTALL_DIR"
npm install --silent 2>/dev/null

echo -e "${GREEN}✓${NC} Dependencies installed"

# Build if needed
if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
    echo -e "${YELLOW}→${NC} Building..."
    npm run build --silent 2>/dev/null
    echo -e "${GREEN}✓${NC} Built"
fi

# Create symlink in a common bin location
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"

# Remove old symlink if exists
rm -f "$BIN_DIR/a1zap"

# Create new symlink
ln -sf "$INSTALL_DIR/bin/a1zap.js" "$BIN_DIR/a1zap"
chmod +x "$INSTALL_DIR/bin/a1zap.js"

echo -e "${GREEN}✓${NC} CLI installed"

# Check if bin dir is in PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo -e "${YELLOW}⚠ Add this to your shell config (~/.zshrc or ~/.bashrc):${NC}"
    echo ""
    echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "  Then restart your terminal, or run:"
    echo ""
    echo "    source ~/.zshrc"
    echo ""
    
    # Try to add it automatically
    SHELL_RC=""
    if [ -f "$HOME/.zshrc" ]; then
        SHELL_RC="$HOME/.zshrc"
    elif [ -f "$HOME/.bashrc" ]; then
        SHELL_RC="$HOME/.bashrc"
    fi
    
    if [ -n "$SHELL_RC" ]; then
        if ! grep -q 'HOME/.local/bin' "$SHELL_RC" 2>/dev/null; then
            echo "" >> "$SHELL_RC"
            echo '# A1Zap CLI' >> "$SHELL_RC"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
            echo -e "${GREEN}✓${NC} Automatically added to $SHELL_RC"
            echo "  Please restart your terminal or run: source $SHELL_RC"
        fi
    fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}     ✓ Installation complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Restart your terminal (or run: source ~/.zshrc)"
echo ""
echo "  2. Configure your API key:"
echo -e "     ${BLUE}a1zap config \"your-api-key\"${NC}"
echo ""
echo "  3. List your apps:"
echo -e "     ${BLUE}a1zap list${NC}"
echo ""
echo "  Need help? Check the docs or ask in Slack!"
echo ""
