#!/bin/bash
set -e

TARGET=$1

if [ -z "$TARGET" ]; then
    echo "Usage: ./package-self-contained.sh <target>"
    echo ""
    echo "Targets:"
    echo "  darwin-arm64   macOS Apple Silicon (M1/M2/M3)"
    echo "  darwin-x64     macOS Intel"
    echo "  linux-x64      Linux x86_64"
    echo "  win32-x64      Windows x86_64"
    exit 1
fi

GAMA_SOURCE="../gamalsp/gama.product/target/products"
SERVER_DEST="server"

echo "Packaging self-contained VSIX for target: $TARGET"

[ -d "$SERVER_DEST" ] && chmod -R u+w "$SERVER_DEST" 2>/dev/null || true
rm -rf "$SERVER_DEST" 2>/dev/null || true
mkdir -p "$SERVER_DEST"

case $TARGET in
    darwin-arm64)
        ARCH_FILE="gama.application-macosx.cocoa.aarch64.tar.gz"
        NEED_BAT=false
        ;;
    darwin-x64)
        ARCH_FILE="gama.application-macosx.cocoa.x86_64.tar.gz"
        NEED_BAT=false
        ;;
    linux-x64)
        ARCH_FILE="gama.application-linux.gtk.x86_64.tar.gz"
        NEED_BAT=false
        ;;
    win32-x64)
        ARCH_FILE="gama.application-win32.win32.x86_64.zip"
        NEED_BAT=true
        ;;
    *)
        echo "Invalid target: $TARGET"
        echo "Supported: darwin-arm64, darwin-x64, linux-x64, win32-x64"
        exit 1
        ;;
esac

echo "Extracting GAMA from: $GAMA_SOURCE/$ARCH_FILE"
if [[ "$ARCH_FILE" == *.zip ]]; then
    unzip -o "$GAMA_SOURCE/$ARCH_FILE" -d "$SERVER_DEST"
else
    tar -xzf "$GAMA_SOURCE/$ARCH_FILE" -C "$SERVER_DEST"
fi

if $NEED_BAT; then
    echo "Copying gama-lsp.bat to server/headless/"
    cp scripts/gama-lsp.bat "$SERVER_DEST/headless/gama-lsp.bat"
    chmod +x "$SERVER_DEST/headless/gama-lsp.bat" 2>/dev/null || true
fi

echo "GAMA extracted to $SERVER_DEST"

echo "Packaging VSIX with target: $TARGET"
npx vsce package --target "$TARGET"

echo "VSIX package created successfully for $TARGET"
