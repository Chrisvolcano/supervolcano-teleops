#!/bin/bash

# install-and-commit.sh
# Wrapper script that runs npm install and automatically commits package.json and package-lock.json
# Usage: ./scripts/install-and-commit.sh [npm install args...]

set -e

echo "📦 Running npm install..."
npm install "$@"

# Check if package files changed
if git diff --quiet package.json package-lock.json; then
  echo "✅ No changes to package files"
else
  echo "📝 Package files changed, committing..."
  
  # Stage package files
  git add package.json package-lock.json
  
  # Create commit message
  if [ -n "$1" ]; then
    # If package name provided, use it in commit message
    PACKAGE_NAME=$(echo "$1" | sed 's/@.*//' | sed 's/^.*\///')
    COMMIT_MSG="chore: Update package-lock.json after installing $PACKAGE_NAME"
  else
    COMMIT_MSG="chore: Update package-lock.json after npm install"
  fi
  
  # Commit
  git commit -m "$COMMIT_MSG" || {
    echo "⚠️  Commit failed (might be no changes or already committed)"
    exit 0
  }
  
  echo "✅ Committed package files"
  echo "💡 Don't forget to push: git push"
fi

echo "✅ Done!"

