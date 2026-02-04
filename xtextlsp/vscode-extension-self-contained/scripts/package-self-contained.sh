#!/bin/bash
set -e

ARCH=$1

if [ -z "$ARCH" ]; then
    echo "Usage: ./package-self-contained.sh <x64|arm64>"
    exit 1
fi

GAMA_SOURCE="../gamalsp/gama.product/target/products"
SERVER_DEST="server"

echo "Packaging self-contained VSIX for architecture: $ARCH"

rm -rf "$SERVER_DEST"
mkdir -p "$SERVER_DEST"

case $ARCH in
    x64)
        ARCH_FILE="gama.application-macosx.cocoa.x86_64.tar.gz"
        VSCE_TARGET="darwin-x64"
        ;;
    arm64)
        ARCH_FILE="gama.application-macosx.cocoa.aarch64.tar.gz"
        VSCE_TARGET="darwin-arm64"
        ;;
    *)
        echo "Invalid architecture: $ARCH"
        echo "Supported: x64, arm64"
        exit 1
        ;;
esac

echo "Extracting GAMA from: $GAMA_SOURCE/$ARCH_FILE"
tar -xzf "$GAMA_SOURCE/$ARCH_FILE" -C "$SERVER_DEST"

echo "GAMA extracted to $SERVER_DEST"

echo "Packaging VSIX with target: $VSCE_TARGET"
npx vsce package --target "$VSCE_TARGET"

echo "VSIX package created successfully"
