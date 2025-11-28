#!/bin/bash

# Script to add Firebase environment variables to Vercel
# Run this after installing Vercel CLI: npm i -g vercel

echo "Adding Firebase environment variables to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
  echo "   Or use: npx vercel env add"
  exit 1
fi

# Variables to add
declare -A vars=(
  ["NEXT_PUBLIC_FIREBASE_API_KEY"]="AIzaSyBJd8_A8tH6e2S5WhgwHqoeXIB58WQWDvw"
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"]="super-volcano-oem-portal.firebaseapp.com"
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]="super-volcano-oem-portal"
  ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"]="super-volcano-oem-portal.firebasestorage.app"
  ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"]="243745387315"
  ["NEXT_PUBLIC_FIREBASE_APP_ID"]="1:243745387315:web:88448a0ee710a8fcc2c446"
)

# Add each variable to all environments
for var_name in "${!vars[@]}"; do
  var_value="${vars[$var_name]}"
  echo "Adding $var_name..."
  
  # Add to Production
  echo "$var_value" | vercel env add "$var_name" production
  
  # Add to Preview
  echo "$var_value" | vercel env add "$var_name" preview
  
  # Add to Development
  echo "$var_value" | vercel env add "$var_name" development
  
  echo "✅ Added $var_name"
done

echo ""
echo "✅ All environment variables added to Vercel!"
echo "⚠️  You may need to redeploy for changes to take effect."

