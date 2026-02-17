#!/bin/bash
# -----------------------------------------------------------------------------
# Script: update.sh
# Purpose: Automates the process of updating the smart-birdfeeder codebase on RPI.
#          It checks out main, pulls latest changes, and rebuilds the frontend.
# -----------------------------------------------------------------------------

# Exit on error
set -e

echo "🚀 Starting update process..."

# 1. Navigate to the project directory
# We use the absolute path to ensure the script works from anywhere
PROJECT_ROOT="$HOME/smart-birdfeeder"
cd "$PROJECT_ROOT" || { echo "❌ Directory $PROJECT_ROOT not found"; exit 1; }

# 2. Ensure we are on the main branch
echo "🌿 Switching to main branch..."
git checkout main

# 3. Fetch latest changes from remote
echo "🔍 Fetching latest updates..."
git fetch

# 4. Pull the latest code
echo "📥 Pulling changes..."
git pull

# 5. Build the client application
echo "🏗️ Building the frontend client..."
cd client || { echo "❌ Client directory not found"; exit 1; }

# Note: We run npm run build. It is assumed that npm install has been run previously
# or that dependencies haven't changed.
npm run build

echo "✅ Update and build successful!"
