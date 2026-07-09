#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GAMALSP_DIR="$ROOT_DIR/gamalsp"
EXTENSION_DIR="$ROOT_DIR/vscode-extension-self-contained"

JAVA_XML_OPTS="-Djdk.xml.maxGeneralEntitySizeLimit=0 -Djdk.xml.totalEntitySizeLimit=0"
MAVEN_OPTS="$JAVA_XML_OPTS"

echo "=== Step 1: Build gama ==="
cd "$GAMALSP_DIR/"
bash travis/build.sh

echo "=== Step 4: Compile VS Code extension TypeScript ==="
cd "$EXTENSION_DIR"
npx tsc -p src/tsconfig.json

echo "=== Step 5: Package VSIX ==="
rm -rf "$EXTENSION_DIR/server"
cd "$EXTENSION_DIR"
bash scripts/package-self-contained.sh arm64

echo ""
echo "=== Done ==="
echo "VSIX: $EXTENSION_DIR/gaml-extension-darwin-arm64-0.0.33.vsix"
echo ""
echo "Install with:"
echo "\"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code\" --uninstall-extension hqnghi.gaml-extension; \"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code\" --install-extension \"$EXTENSION_DIR/gaml-extension-darwin-arm64-0.0.33.vsix\""
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --uninstall-extension hqnghi.gaml-extension
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension "/Users/hqnghi/git/webgama/xtextlsp/vscode-extension-self-contained/gaml-extension-darwin-arm64-0.0.33.vsix"