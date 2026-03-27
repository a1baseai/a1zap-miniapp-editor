#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     A1Zap MiniApp Admin CLI - Installer${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

get_shell_rc_targets() {
    local shell_name
    shell_name=$(basename "${SHELL:-}")
    local is_mac=false
    [ "$(uname)" = "Darwin" ] && is_mac=true

    case "$shell_name" in
        zsh)
            printf '%s\n' "$HOME/.zprofile" "$HOME/.zshrc"
            ;;
        bash)
            if [ "$is_mac" = true ]; then
                printf '%s\n' "$HOME/.bash_profile" "$HOME/.bashrc"
            else
                printf '%s\n' "$HOME/.bashrc" "$HOME/.profile"
            fi
            ;;
        *)
            printf '%s\n' "$HOME/.profile"
            ;;
    esac
}

primary_shell_rc() {
    get_shell_rc_targets | head -n 1
}

shell_source_hint() {
    local shell_rc
    shell_rc=$(primary_shell_rc)

    if [ -n "$shell_rc" ]; then
        echo "source $shell_rc"
    else
        echo "restart your terminal"
    fi
}

shell_rc_label() {
    local first=true
    local shell_rc
    while IFS= read -r shell_rc; do
        [ -z "$shell_rc" ] && continue
        if [ "$first" = true ]; then
            printf '%s' "$shell_rc"
            first=false
        else
            printf ', %s' "$shell_rc"
        fi
    done <<EOF
$(get_shell_rc_targets)
EOF
}

require_command() {
    local cmd="$1"
    local label="$2"

    if ! command -v "$cmd" &> /dev/null; then
        echo -e "${RED}✗ $label is not installed${NC}"
        exit 1
    fi
}

run_or_fail() {
    local label="$1"
    local log_file="$2"
    shift 2

    if ! "$@" >"$log_file" 2>&1; then
        echo -e "${RED}✗ $label failed${NC}"
        echo "  Log: $log_file"
        echo ""
        tail -n 20 "$log_file" 2>/dev/null || true
        exit 1
    fi
}

download_repo() {
    if [ -n "${A1ZAP_INSTALL_SOURCE_DIR:-}" ]; then
        if [ ! -d "$A1ZAP_INSTALL_SOURCE_DIR" ]; then
            echo -e "${RED}✗ A1ZAP_INSTALL_SOURCE_DIR does not exist: $A1ZAP_INSTALL_SOURCE_DIR${NC}"
            exit 1
        fi

        mkdir -p "$INSTALL_DIR"
        if command -v rsync &> /dev/null; then
            rsync -a \
                --exclude ".git" \
                --exclude "node_modules" \
                --exclude ".tmp-install-home" \
                --exclude ".tmp-admin-home" \
                "$A1ZAP_INSTALL_SOURCE_DIR"/ "$INSTALL_DIR"/
        else
            cp -R "$A1ZAP_INSTALL_SOURCE_DIR"/. "$INSTALL_DIR"
            rm -rf "$INSTALL_DIR/.git" "$INSTALL_DIR/node_modules"
        fi
        return 0
    fi

    if command -v git &> /dev/null; then
        local skip_git=false
        if [ "$(uname)" = "Darwin" ] && ! xcode-select -p &> /dev/null; then
            skip_git=true
        fi

        if [ "$skip_git" = false ]; then
            if git clone --depth 1 https://github.com/a1baseai/a1zap-miniapp-editor.git "$INSTALL_DIR" 2>/dev/null; then
                return 0
            fi

            echo -e "${YELLOW}→${NC} Git clone failed, falling back to direct download..."
            rm -rf "$INSTALL_DIR"
        fi
    fi

    require_command curl "curl"
    require_command tar "tar"
    rm -rf "$INSTALL_ROOT/a1zap-miniapp-editor-main"

    if ! curl -fsSL https://github.com/a1baseai/a1zap-miniapp-editor/archive/main.tar.gz | tar xz -C "$INSTALL_ROOT"; then
        echo -e "${RED}✗ Failed to download repository archive${NC}"
        exit 1
    fi

    mv "$INSTALL_ROOT/a1zap-miniapp-editor-main" "$INSTALL_DIR"
}

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
require_command npm "npm"

INSTALL_ROOT="$HOME/.a1zap-admin"
INSTALL_DIR="$INSTALL_ROOT/cli"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}→${NC} Removing previous installation..."
    rm -rf "$INSTALL_DIR"
fi

echo -e "${YELLOW}→${NC} Downloading A1Zap Admin CLI..."
mkdir -p "$INSTALL_ROOT"
download_repo
echo -e "${GREEN}✓${NC} Downloaded"

echo -e "${YELLOW}→${NC} Installing dependencies..."
cd "$INSTALL_DIR"
INSTALL_LOG=$(mktemp "${TMPDIR:-/tmp}/a1zap-admin-install.XXXXXX")
if [ -f "package-lock.json" ]; then
    run_or_fail "Dependency installation" "$INSTALL_LOG" npm ci --silent
else
    run_or_fail "Dependency installation" "$INSTALL_LOG" npm install --silent
fi
echo -e "${GREEN}✓${NC} Dependencies installed"

if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
    echo -e "${YELLOW}→${NC} Building..."
    BUILD_LOG=$(mktemp "${TMPDIR:-/tmp}/a1zap-admin-build.XXXXXX")
    run_or_fail "Build" "$BUILD_LOG" npm run build --silent
    echo -e "${GREEN}✓${NC} Built"
fi

if [ ! -f "$INSTALL_DIR/bin/a1zap-admin.js" ] || [ ! -f "$INSTALL_DIR/dist/admin-cli.js" ]; then
    echo -e "${RED}✗ Installation is incomplete${NC}"
    echo "  Expected CLI files were not created."
    exit 1
fi

BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
rm -f "$BIN_DIR/a1zap-admin"
ln -sf "$INSTALL_DIR/bin/a1zap-admin.js" "$BIN_DIR/a1zap-admin"
chmod +x "$INSTALL_DIR/bin/a1zap-admin.js"

echo -e "${GREEN}✓${NC} CLI installed"

PRIMARY_SHELL_RC=$(primary_shell_rc)
SHELL_RC_LABEL=$(shell_rc_label)
SOURCE_HINT=$(shell_source_hint)

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo -e "${YELLOW}⚠ Add this to your shell startup files ($SHELL_RC_LABEL):${NC}"
    echo ""
    echo '    case ":$PATH:" in'
    echo '      *":$HOME/.local/bin:"*) ;;'
    echo '      *) export PATH="$HOME/.local/bin:$PATH" ;;'
    echo '    esac'
    echo ""
    echo "  Then restart your terminal, or run:"
    echo ""
    echo "    $SOURCE_HINT"
    echo ""

    while IFS= read -r SHELL_RC; do
        [ -z "$SHELL_RC" ] && continue
        mkdir -p "$(dirname "$SHELL_RC")"
        touch "$SHELL_RC"

        if ! grep -q 'A1Zap Admin CLI' "$SHELL_RC" 2>/dev/null; then
            {
                echo ""
                echo '# A1Zap Admin CLI'
                echo 'case ":$PATH:" in'
                echo '  *":$HOME/.local/bin:"*) ;;'
                echo '  *) export PATH="$HOME/.local/bin:$PATH" ;;'
                echo 'esac'
            } >> "$SHELL_RC"
            echo -e "${GREEN}✓${NC} Automatically added to $SHELL_RC"
        fi
    done <<EOF
$(get_shell_rc_targets)
EOF

    echo ""
    echo "  You can also run the CLI right now with:"
    echo ""
    echo "    $BIN_DIR/a1zap-admin"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}     ✓ Installation complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Restart your terminal (or run: $SOURCE_HINT)"
echo ""
echo "  2. Configure your API key:"
echo -e "     ${BLUE}a1zap-admin config \"your-api-key\"${NC}"
echo ""
echo "  3. List your apps:"
echo -e "     ${BLUE}a1zap-admin list${NC}"
echo ""
