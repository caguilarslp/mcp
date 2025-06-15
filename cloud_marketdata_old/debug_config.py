#!/usr/bin/env python3
"""
Debug script to verify configuration loading
"""

import os
import sys
sys.path.append('src')

from src.core.config import Settings

def main():
    print("=== DEBUG CONFIG LOADING ===")
    
    # Check environment variables directly
    print(f"Environment SYMBOLS: {os.getenv('SYMBOLS', 'NOT_SET')}")
    print(f"Environment SYMBOLS type: {type(os.getenv('SYMBOLS'))}")
    
    # Check parsed config
    settings = Settings()
    print(f"Settings SYMBOLS: {settings.SYMBOLS}")
    print(f"Settings SYMBOLS type: {type(settings.SYMBOLS)}")
    print(f"Settings SYMBOLS length: {len(settings.SYMBOLS)}")
    
    # Debug other fields
    print(f"Settings APP_NAME: {settings.APP_NAME}")
    print(f"Settings ENVIRONMENT: {settings.ENVIRONMENT}")
    
    print("\n=== RAW ENV DUMP ===")
    for key, value in os.environ.items():
        if 'SYMBOL' in key.upper():
            print(f"{key}: {value}")

if __name__ == "__main__":
    main()
