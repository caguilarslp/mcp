"""
Quick MongoDB Connection Test
Test MongoDB connection without authentication
"""

import pymongo
from pymongo import MongoClient
import os

def test_mongo_connection():
    """Test different MongoDB connection strings"""
    
    print("🔧 TESTING MONGODB CONNECTIONS")
    print("=" * 50)
    
    # Test connections in order of preference
    test_urls = [
        "mongodb://localhost:27017/wadm",  # Local no auth
        "mongodb://mongodb:27017/wadm",    # Docker no auth
        "mongodb://127.0.0.1:27017/wadm",  # IP no auth
    ]
    
    for i, url in enumerate(test_urls, 1):
        print(f"\n{i}. Testing: {url}")
        
        try:
            # Short timeout for quick testing
            client = MongoClient(url, serverSelectionTimeoutMS=3000)
            
            # Test connection
            client.server_info()
            
            # Test database operations
            db = client.wadm
            
            # Insert test document
            test_doc = {"test": "connection", "timestamp": "2025-06-22"}
            result = db.test_connection.insert_one(test_doc)
            
            # Count documents
            count = db.test_connection.count_documents({})
            
            # Clean up test document
            db.test_connection.delete_one({"_id": result.inserted_id})
            
            print(f"✅ SUCCESS! Connected and performed operations")
            print(f"   - Server info: OK")
            print(f"   - Insert/Delete: OK")
            print(f"   - Document count: {count}")
            
            client.close()
            return url
            
        except Exception as e:
            print(f"❌ Failed: {e}")
    
    print(f"\n❌ All MongoDB connections failed!")
    return None

def update_config_with_working_url(url):
    """Update config with working MongoDB URL"""
    if not url:
        return
    
    # Update environment variable
    os.environ["MONGODB_URL"] = url
    print(f"\n✅ Updated MONGODB_URL to: {url}")

if __name__ == "__main__":
    working_url = test_mongo_connection()
    
    if working_url:
        update_config_with_working_url(working_url)
        print("\n🎯 MongoDB connection successful!")
        print("✅ Ready to start API server")
    else:
        print("\n🚨 MongoDB connection failed!")
        print("🔧 Make sure MongoDB container is running:")
        print("   docker-compose up -d mongodb")
