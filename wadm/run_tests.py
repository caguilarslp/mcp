#!/usr/bin/env python3
"""
Simple test runner for WADM
"""

import subprocess
import sys


def run_tests():
    """Run basic tests."""
    print("Running WADM tests...")
    
    try:
        result = subprocess.run(["pytest", "-v"], check=True)
        print("✅ All tests passed!")
        return 0
    except subprocess.CalledProcessError:
        print("❌ Tests failed!")
        return 1
    except FileNotFoundError:
        print("❌ pytest not found. Install with: pip install pytest")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
