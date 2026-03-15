#!/bin/bash
# -----------------------------------------------------------------------------
# Script: logs_vision.sh
# Purpose: Outputs the last 100 lines of logs for the bird-vision PM2 process.
# -----------------------------------------------------------------------------

# Exit on error
set -e

echo "📜 Fetching logs for bird-vision..."

# Output last 100 lines of bird-vision logs
pm2 logs bird-vision --lines=100
