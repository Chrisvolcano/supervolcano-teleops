#!/bin/bash

# Quick deployment script for Vercel
# Usage: ./scripts/deploy-vercel.sh

set -e

echo "🚀 Deploying SuperVolcano Teleoperator Portal to Vercel..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are you in the project root?"
  exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm i -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
  echo "🔐 Please log in to Vercel:"
  vercel login
fi

echo "📋 Checking build..."
npm run build

echo ""
echo "🌐 Deploying to Vercel..."
echo ""

# Deploy
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Check your deployment at: https://vercel.com/dashboard"
echo "   2. Verify environment variables are set"
echo "   3. Test the application"
echo ""

