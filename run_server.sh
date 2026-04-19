#!/bin/bash

# Exit on error
set -e

PORT=8000

echo "Starting local web server on port $PORT..."
echo "Open your browser to http://localhost:$PORT to view the dashboard."
echo "Press Ctrl+C to stop."

# Start the Python built-in HTTP server
python3 -m http.server "$PORT"
