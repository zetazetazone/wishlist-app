#!/bin/bash

# Clean script for Wishlist App - Clears all caches and artifacts

echo "🧹 Cleaning Wishlist App..."

# Kill any running Metro/Expo processes
echo "📛 Stopping all Expo and Metro processes..."
pkill -9 -f "expo start" 2>/dev/null || true
pkill -9 -f "Metro" 2>/dev/null || true

# Clear Metro bundler cache
echo "🗑️  Clearing Metro bundler cache..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf /tmp/metro-*
rm -rf /tmp/react-*
rm -rf /tmp/haste-map-*
rm -rf ~/.cache/expo 2>/dev/null || true

# Clear watchman (if installed)
if command -v watchman &> /dev/null; then
    echo "👁️  Clearing Watchman cache..."
    watchman watch-del-all 2>/dev/null || true
fi

echo "✅ Cleanup complete!"
