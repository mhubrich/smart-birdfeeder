#!/bin/bash
# -----------------------------------------------------------------------------
# Script: logs_server.sh
# Purpose: Outputs the last 100 lines of logs for the bird-server PM2 process.
# -----------------------------------------------------------------------------

# Exit on error
set -e

echo "📜 Fetching logs for bird-server..."

# Output last 100 lines of bird-server logs
pm2 logs bird-server --lines=100
