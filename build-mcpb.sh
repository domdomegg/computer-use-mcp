#!/usr/bin/env bash

set -euo pipefail

# Build the project first
echo "Building project..."
npm run build

# Update manifest.json with version from package.json
echo "Updating manifest version..."
VERSION=$(node -p "require('./package.json').version")
sed "s/{{VERSION}}/$VERSION/g" manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json

# Remove devDependencies
echo "Removing devDependencies and types from node_modules..."
rm -rf node_modules
npm ci --omit=dev --audit false --fund false

# Install all sharp platform binaries for cross-platform support
# (sharp uses optional deps that only install for current platform)
# --force is needed to bypass platform checks for non-native packages
# Note: darwin/linux need sharp-libvips-* for the libvips shared library,
# win32 bundles libvips directly in the sharp package
echo "Installing cross-platform sharp binaries..."
npm install --no-save --force --audit false --fund false \
  @img/sharp-darwin-arm64 @img/sharp-libvips-darwin-arm64 \
  @img/sharp-darwin-x64 @img/sharp-libvips-darwin-x64 \
  @img/sharp-linux-x64 @img/sharp-libvips-linux-x64 \
  @img/sharp-win32-x64

# Ad-hoc sign macOS native binaries for Gatekeeper compatibility
# This ensures binaries work when extracted from the MCPB zip
if command -v codesign &> /dev/null; then
  echo "Signing macOS native binaries..."
  find node_modules -name "*.node" -path "*darwin*" -exec codesign -f -s - {} \; 2>/dev/null || true
  find node_modules -name "*.dylib" -path "*darwin*" -exec codesign -f -s - {} \; 2>/dev/null || true
fi

find node_modules -name "*.ts" -type f -delete 2>/dev/null || true

# Create the MCPB package
echo "Creating MCPB package..."
rm -rf computer-use-mcp.mcpb
# --no-dir-entries: https://github.com/anthropics/mcpb/issues/18#issuecomment-3021467806
zip --recurse-paths --no-dir-entries \
  computer-use-mcp.mcpb \
  manifest.json \
  icon.png \
  dist/ \
  node_modules/ \
  package.json \
  README.md \
  LICENSE

# Restore the template version
echo "Restoring manifest template..."
sed "s/$VERSION/{{VERSION}}/g" manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json

# Restore full node_modules
echo "Restoring node_modules..."
npm ci --audit false --fund false

echo
echo "MCPB package created: computer-use-mcp.mcpb ($(du -h computer-use-mcp.mcpb | cut -f1))"