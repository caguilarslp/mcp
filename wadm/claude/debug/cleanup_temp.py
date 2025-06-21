#!/usr/bin/env python
"""
Cleanup temporary files
"""
import os
import sys

# Files to delete
temp_files = [
    "deleted_file.tmp",
    "src/manager_fixed_delete.tmp",
    # Add more patterns here if needed
]

for file in temp_files:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), file)
    if os.path.exists(path):
        try:
            os.remove(path)
            print(f"Deleted: {file}")
        except Exception as e:
            print(f"Error deleting {file}: {e}")
    else:
        print(f"Not found: {file}")

print("Cleanup complete")
