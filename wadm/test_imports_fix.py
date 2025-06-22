"""
Quick Import Fix Validation
Check if the import error is resolved
"""

import sys
import os

# Add project root to path
sys.path.insert(0, 'D:/projects/mcp/wadm')

def test_imports():
    """Test all imports without running the server"""
    
    print("🔧 TESTING IMPORT FIXES")
    print("=" * 40)
    
    try:
        print("1. Testing basic config import...")
        from src.config import Config
        print("✅ Config imported successfully")
        
        print("\n2. Testing models import...")
        from src.models import Exchange, Trade
        print("✅ Models imported successfully")
        
        print("\n3. Testing storage import...")
        from src.storage.mongo_manager import MongoManager
        print("✅ Storage imported successfully")
        
        print("\n4. Testing API auth import...")
        from src.api.routers.auth import verify_api_key
        print("✅ Auth imported successfully")
        
        print("\n5. Testing indicators models import...")
        from src.api.models.indicators import VolumeProfileResponse, IndicatorStatus
        print("✅ Indicator models imported successfully")
        
        print("\n6. Testing indicators router import...")
        from src.api.routers.indicators import router
        print("✅ Indicators router imported successfully")
        
        print("\n7. Testing full app import...")
        from src.api.app import create_app
        print("✅ App imported successfully")
        
        print("\n" + "=" * 40)
        print("✅ ALL IMPORTS SUCCESSFUL!")
        print("🚀 API should start without import errors")
        
        return True
        
    except ImportError as e:
        print(f"\n❌ Import error: {e}")
        print(f"Module: {e.name if hasattr(e, 'name') else 'unknown'}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_imports()
    if success:
        print("\n📋 Next step: Start Docker containers and test API")
        print("   docker-compose up -d")
    else:
        print("\n🔧 Fix remaining import issues before starting server")
