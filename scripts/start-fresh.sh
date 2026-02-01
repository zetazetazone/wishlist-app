#!/bin/bash

# Start Fresh script for Wishlist App - Ensures clean startup

echo "🚀 Starting Wishlist App (Fresh Mode)..."

# Run cleanup first
./scripts/clean.sh

# Wait a moment for processes to fully terminate
sleep 2

# Start Expo with cleared cache
echo "📦 Starting Expo with fresh cache..."
npx expo start --clear
