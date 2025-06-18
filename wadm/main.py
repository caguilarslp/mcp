"""
WADM - wAIckoff Data Manager
Main entry point
"""
import asyncio
import signal
import sys
from src.manager import WADMManager
from src.logger import get_logger

logger = get_logger(__name__)

# Global manager instance
manager = None
shutdown_event = None

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    logger.info("Shutdown signal received")
    if shutdown_event and not shutdown_event.is_set():
        shutdown_event.set()

async def main():
    """Main function"""
    global manager, shutdown_event
    
    logger.info("Starting WADM - wAIckoff Data Manager")
    
    # Create shutdown event
    shutdown_event = asyncio.Event()
    
    # Create manager
    manager = WADMManager()
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Create tasks
        manager_task = asyncio.create_task(manager.start())
        shutdown_task = asyncio.create_task(shutdown_event.wait())
        
        # Wait for either manager to stop or shutdown signal
        done, pending = await asyncio.wait(
            [manager_task, shutdown_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Cancel pending tasks
        for task in pending:
            task.cancel()
            
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        if manager:
            await manager.stop()

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
