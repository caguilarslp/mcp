#!/bin/bash

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list

echo "Virtual environment created and activated!"
echo "To activate in the future, run: source venv/bin/activate"
