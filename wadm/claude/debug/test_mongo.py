"""
Test MongoDB Connection
Quick script to verify MongoDB is accessible
"""
import pymongo
from pymongo import MongoClient
import sys

# Test connection
try:
    print("Testing MongoDB connection...")
    
    # Try without auth first
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
    client.server_info()
    print("✅ Connected without authentication")
    client.close()
    
except Exception as e:
    print(f"❌ Connection without auth failed: {e}")
    
    # Try with auth
    try:
        print("\nTrying with authentication...")
        client = MongoClient("mongodb://wadm:wadm_secure_pass@localhost:27017/wadm?authSource=admin", serverSelectionTimeoutMS=5000)
        client.server_info()
        print("✅ Connected with authentication")
        
        # Test database access
        db = client.wadm
        print(f"Database: {db.name}")
        print(f"Collections: {db.list_collection_names()}")
        client.close()
        
    except Exception as e2:
        print(f"❌ Connection with auth also failed: {e2}")
        print("\nMake sure MongoDB is running!")
        print("Use: docker run -d -p 27017:27017 --name wadm-mongo mongo:latest")
        sys.exit(1)

print("\nMongoDB connection successful!")
