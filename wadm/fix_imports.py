#!/usr/bin/env python3
"""
Script to fix all import issues in WADM project systematically.
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

def test_imports():
    """Test all critical imports."""
    errors = []
    
    print("Testing critical imports...\n")
    
    # Test 1: Core entities and types
    try:
        from src.core.entities import Trade, OrderBook, VolumeProfile, OrderFlow, Symbol, Exchange, TimeFrame
        print("✅ Core entities imported successfully")
    except ImportError as e:
        errors.append(f"❌ Core entities import failed: {e}")
    
    # Test 2: Core algorithms
    try:
        from src.core.algorithms import VolumeProfileCalculator, OrderFlowCalculator
        print("✅ Core algorithms imported successfully")
    except ImportError as e:
        errors.append(f"❌ Core algorithms import failed: {e}")
    
    # Test 3: Application services
    try:
        from src.application.services.volume_profile_service import VolumeProfileService
        from src.application.services.order_flow_service import OrderFlowService
        print("✅ Application services imported successfully")
    except ImportError as e:
        errors.append(f"❌ Application services import failed: {e}")
    
    # Test 4: Use cases
    try:
        from src.application.use_cases.order_flow import (
            CalculateOrderFlowUseCase,
            GetRealTimeOrderFlowUseCase
        )
        print("✅ Order flow use cases imported successfully")
    except ImportError as e:
        errors.append(f"❌ Order flow use cases import failed: {e}")
    
    # Test 5: Infrastructure
    try:
        from src.infrastructure.cache.redis_cache import RedisCache
        from src.infrastructure.database.repositories import get_trade_repository
        print("✅ Infrastructure imports successful")
    except ImportError as e:
        errors.append(f"❌ Infrastructure import failed: {e}")
    
    # Test 6: API routes
    try:
        from src.presentation.api.routes.order_flow import router as order_flow_router
        from src.presentation.api.routes import volume_profile
        print("✅ API routes imported successfully")
    except ImportError as e:
        errors.append(f"❌ API routes import failed: {e}")
    
    # Test 7: Main app
    try:
        from src.presentation.api.main import app
        print("✅ Main app imported successfully")
    except ImportError as e:
        errors.append(f"❌ Main app import failed: {e}")
    
    return errors

def main():
    """Run import tests and report results."""
    print("=" * 60)
    print("WADM Import Test")
    print("=" * 60)
    
    errors = test_imports()
    
    print("\n" + "=" * 60)
    if errors:
        print(f"❌ FAILED: {len(errors)} import errors found:\n")
        for error in errors:
            print(f"  {error}")
        sys.exit(1)
    else:
        print("✅ SUCCESS: All imports working correctly!")
        print("\nThe system should now start without import errors.")
        sys.exit(0)

if __name__ == "__main__":
    main()
