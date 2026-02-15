#!/bin/bash

# Auto-detect version from manifest.json
VERSION=$(grep '"version":' manifest.json | cut -d\" -f4)

if [ -z "$VERSION" ]; then
  echo "❌ Error: Could not detect version from manifest.json"
  exit 1
fi

echo "🚀 Preparing release v$VERSION..."

# check status
git status

# Ask before proceeding
read -p "❓ Do you want to commit and tag v$VERSION? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🚫 Cancelled."
    exit 1
fi

# Add all changes
echo "📦 Adding files..."
git add .

# Commit
echo "💾 Committing..."
git commit -m "Release v$VERSION"

# Tag
echo "🏷️ Tagging v$VERSION..."
git tag "v$VERSION"

# Push
echo "⬆️ Pushing to origin..."
git push origin main
git push origin "v$VERSION"

echo "✅ Done! Release v$VERSION is live on GitHub."
