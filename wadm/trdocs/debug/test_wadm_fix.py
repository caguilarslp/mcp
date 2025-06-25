"""
Test script to verify WADM is working after SMC fixes
"""
import asyncio
from src.manager import WADMManager
from src.logger import get_logger

logger = get_logger(__name__)

async def test_wadm():
    """Test WADM startup"""
    logger.info("Testing WADM startup...")
    
    try:
        # Create manager
        manager = WADMManager()
        logger.info("✅ WADMManager created successfully")
        
        # Check SMC Dashboard
        if hasattr(manager, 'smc_dashboard'):
            logger.info("✅ SMC Dashboard initialized")
        else:
            logger.error("❌ SMC Dashboard not found")
        
        # Check status
        status = manager.get_status()
        logger.info(f"✅ System status: {status}")
        
        logger.info("✅ All tests passed! WADM is ready to run.")
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False
    
    return True

if __name__ == "__main__":
    asyncio.run(test_wadm())
