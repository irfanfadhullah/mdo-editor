#!/bin/bash
set -euo pipefail

# Build the MDO Viewer Electron application
# Requires: node.js, npm

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GUI_DIR="$PROJECT_ROOT/gui-new"

echo "==> Installing Node dependencies..."
(cd "$GUI_DIR" && npm install --production=false)

echo "==> Building Electron app..."
(cd "$GUI_DIR" && npx electron-builder --linux)

echo ""
echo "Build complete!"
echo "Output: $(ls "$GUI_DIR/dist/"*.AppImage 2>/dev/null || ls "$GUI_DIR/dist/"*.deb 2>/dev/null || echo "check dist/ directory")"
