#!/bin/bash

# Exit on error
set -e

VENV_DIR="venv"

# Ensure the virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not found."
    echo "Please run ./setup_venv.sh first."
    exit 1
fi

echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

echo "Starting the bridge script..."
python3 bridge.py
