#!/bin/bash

# Exit on error
set -e

VENV_DIR="venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

echo "Activating virtual environment and installing requirements..."
source "$VENV_DIR/bin/activate"

# Use the pinned requirements with hashes
pip install --require-hashes -r requirements.txt

echo "------------------------------------------------"
echo "Setup complete!"
echo "To enter the environment, run: source venv/bin/activate"
echo "------------------------------------------------"
