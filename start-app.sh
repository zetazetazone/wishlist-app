#!/bin/bash

echo "🚀 Starting Wishlist App..."
echo ""
echo "Metro Bundler will start on http://localhost:8081"
echo ""
echo "Once started, you can:"
echo "  - Press 'a' for Android emulator"
echo "  - Press 'i' for iOS simulator"
echo "  - Scan QR code with Expo Go app on your phone"
echo ""
echo "==============================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start Expo
npx expo start
