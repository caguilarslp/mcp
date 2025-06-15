#!/usr/bin/env python3
"""
Test direct WebSocket connection to Bybit to ensure collector is working
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.collectors.bybit import BybitTradesCollector
from src.collectors.storage import InMemoryStorage
from src.core.logger import setup_logger

logger = setup_logger("test_collector")

async def main():
    """Test Bybit collector directly"""
    logger.info("Starting direct collector test...")
    
    # Create storage
    storage = InMemoryStorage()
    logger.info(f"Created storage: {storage}")
    
    # Create collector
    symbols = ["BTCUSDT", "XRPUSDT"]
    collector = BybitTradesCollector(
        symbols=symbols,
        storage_handler=storage
    )
    
    logger.info(f"Created collector for symbols: {symbols}")
    logger.info(f"Collector storage handler: {collector.storage_handler}")
    logger.info(f"Storage handler is same object: {collector.storage_handler is storage}")
    
    # Start collector
    logger.info("Starting collector...")
    await collector.start()
    
    # Wait and check periodically
    for i in range(6):
        await asyncio.sleep(10)
        
        # Check stats
        stats = await storage.get_stats()
        collector_stats = collector.stats
        
        logger.info(f"\n--- Check {i+1} ---")
        logger.info(f"Collector status: {collector.status.value}")
        logger.info(f"Messages received: {collector_stats['messages_received']}")
        logger.info(f"Messages processed: {collector_stats['messages_processed']}")
        logger.info(f"Storage trades received: {stats['total_trades_received']}")
        logger.info(f"Storage trades stored: {stats['current_trades_stored']}")
        logger.info(f"Storage symbols: {stats['symbols_tracked']}")
        
        # Get sample trades
        trades = await storage.get_recent_trades(limit=5)
        if trades:
            logger.info(f"Sample trades:")
            for trade in trades:
                logger.info(f"  - {trade.symbol} {trade.side.value} {trade.price} x {trade.quantity}")
        else:
            logger.info("No trades in storage yet")
    
    # Stop collector
    logger.info("\nStopping collector...")
    await collector.stop()
    
    # Final stats
    final_stats = await storage.get_stats()
    logger.info(f"\nFinal storage stats:")
    logger.info(f"Total trades received: {final_stats['total_trades_received']}")
    logger.info(f"Total trades stored: {final_stats['current_trades_stored']}")
    logger.info(f"Trades per second: {final_stats['trades_per_second']:.2f}")

if __name__ == "__main__":
    asyncio.run(main())
