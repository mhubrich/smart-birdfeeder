#!/bin/bash
# -----------------------------------------------------------------------------
# Script: restart.sh
# Purpose: Automates the process of restarting the smart-birdfeeder processes.
#          Navigates to the root directory and executes pm2 restart ecosystem.config.js.
# -----------------------------------------------------------------------------

# Exit on error
set -e

echo "🚀 Starting restart process..."

# 1. Navigate to the project directory
# We use the absolute path to ensure the script works from anywhere
PROJECT_ROOT="$HOME/smart-birdfeeder"
cd "$PROJECT_ROOT" || { echo "❌ Directory $PROJECT_ROOT not found"; exit 1; }

# 2. Restart PM2 processes using ecosystem.config.js
# We use ecosystem file to ensure all configured apps restart correctly.
echo "🔄 Restarting application with PM2..."
pm2 restart ecosystem.config.js

echo "✅ Restart successful!"
