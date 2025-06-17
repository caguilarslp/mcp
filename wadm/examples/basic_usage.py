"""
Basic example of using the WebSocket collectors.

This example shows how to:
1. Create collectors for multiple exchanges
2. Handle incoming trade and orderbook data
3. Manage collector lifecycle
"""

import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src'))

import asyncio
import logging
from typing import List
from datetime import datetime

from infrastructure.collectors import CollectorManager, BybitCollector, BinanceCollector
from core.entities import Trade, OrderBook, Kline
from core.types import Symbol, ExchangeName

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataProcessor:
    """
    Example data processor that handles incoming market data.
    
    In a real application, this would store data to database,
    calculate indicators, trigger alerts, etc.
    """
    
    def __init__(self):
        self.trade_count = 0
        self.orderbook_count = 0
        self.kline_count = 0
        self.last_prices = {}
    
    async def handle_trade(self, trade: Trade) -> None:
        """Handle incoming trade data."""
        self.trade_count += 1
        self.last_prices[trade.symbol] = trade.price
        
        logger.info(
            f"Trade #{self.trade_count}: {trade.exchange} {trade.symbol} "
            f"{trade.side} {trade.quantity} @ {trade.price}"
        )
        
        # Example: Detect large trades
        if trade.quantity > 1.0:  # Adjust threshold as needed
            logger.warning(
                f"LARGE TRADE: {trade.exchange} {trade.symbol} "
                f"{trade.quantity} @ {trade.price}"
            )
    
    async def handle_orderbook(self, orderbook: OrderBook) -> None:
        """Handle incoming orderbook data."""
        self.orderbook_count += 1
        
        if self.orderbook_count % 100 == 0:  # Log every 100th orderbook
            spread = orderbook.spread
            mid_price = orderbook.mid_price
            
            logger.info(
                f"OrderBook #{self.orderbook_count}: {orderbook.exchange} {orderbook.symbol} "
                f"Mid: {mid_price}, Spread: {spread}"
            )
    
    async def handle_kline(self, kline: Kline) -> None:
        """Handle incoming kline data."""
        self.kline_count += 1
        
        logger.info(
            f"Kline #{self.kline_count}: {kline.exchange} {kline.symbol} "
            f"{kline.interval} OHLC: {kline.open_price}/{kline.high_price}/"
            f"{kline.low_price}/{kline.close_price} Vol: {kline.volume}"
        )
    
    def get_stats(self) -> dict:
        """Get processing statistics."""
        return {
            "trades_processed": self.trade_count,
            "orderbooks_processed": self.orderbook_count,
            "klines_processed": self.kline_count,
            "symbols_tracked": len(self.last_prices),
            "last_prices": dict(self.last_prices)
        }


async def run_basic_example():
    """
    Run a basic example with multiple exchanges.
    """
    logger.info("Starting WebSocket collectors example")
    
    # Define symbols to monitor
    symbols = [
        Symbol("BTCUSDT"),
        Symbol("ETHUSDT"),
        Symbol("SOLUSDT"),
    ]
    
    # Create data processor
    processor = DataProcessor()
    
    # Create collector manager
    async with CollectorManager(
        on_trade=processor.handle_trade,
        on_orderbook=processor.handle_orderbook,
        on_kline=processor.handle_kline,
        auto_restart=True,
        restart_delay=10.0,
    ) as manager:
        
        # Add exchanges
        bybit_id = await manager.add_exchange(
            exchange=ExchangeName.BYBIT,
            symbols=symbols,
            max_reconnect_attempts=5,
            reconnect_delay=5.0,
        )
        
        binance_id = await manager.add_exchange(
            exchange=ExchangeName.BINANCE,
            symbols=symbols,
            max_reconnect_attempts=5,
            reconnect_delay=5.0,
        )
        
        logger.info(f"Added collectors: {bybit_id}, {binance_id}")
        
        # Start all collectors
        await manager.start_all()
        
        try:
            # Run for a specified time
            run_duration = 60  # seconds
            logger.info(f"Running collectors for {run_duration} seconds...")
            
            # Periodically log statistics
            for i in range(run_duration):
                await asyncio.sleep(1)
                
                if i % 10 == 0:  # Every 10 seconds
                    stats = manager.get_all_stats()
                    processor_stats = processor.get_stats()
                    
                    logger.info("=== STATISTICS ===")
                    logger.info(f"Manager: {stats['manager_stats']}")
                    logger.info(f"Processor: {processor_stats}")
                    logger.info("==================")
        
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        
        finally:
            logger.info("Stopping collectors...")
            # Manager will auto-stop via context manager


async def run_single_collector_example():
    """
    Run a simple example with a single Bybit collector.
    """
    logger.info("Starting single Bybit collector example")
    
    symbols = [Symbol("BTCUSDT")]
    processor = DataProcessor()
    
    # Create single collector
    collector = BybitCollector(
        symbols=symbols,
        on_trade=processor.handle_trade,
        on_orderbook=processor.handle_orderbook,
        on_kline=processor.handle_kline,
        max_reconnect_attempts=3,
        reconnect_delay=5.0,
    )
    
    try:
        # Start collector
        logger.info("Starting Bybit collector...")
        
        # Run collector in background
        collector_task = asyncio.create_task(collector.start())
        
        # Wait a bit and check stats
        await asyncio.sleep(30)
        
        stats = collector.get_stats()
        processor_stats = processor.get_stats()
        
        logger.info("=== FINAL STATISTICS ===")
        logger.info(f"Collector: {stats}")
        logger.info(f"Processor: {processor_stats}")
        logger.info("========================")
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    
    finally:
        logger.info("Stopping collector...")
        await collector.stop()
        
        # Wait for task to complete
        if not collector_task.done():
            collector_task.cancel()
            try:
                await collector_task
            except asyncio.CancelledError:
                pass


async def run_symbol_management_example():
    """
    Demonstrate dynamic symbol management.
    """
    logger.info("Starting symbol management example")
    
    # Start with fewer symbols
    initial_symbols = [Symbol("BTCUSDT")]
    processor = DataProcessor()
    
    async with CollectorManager(
        on_trade=processor.handle_trade,
        on_orderbook=processor.handle_orderbook,
        on_kline=processor.handle_kline,
    ) as manager:
        
        # Add Bybit with initial symbols
        collector_id = await manager.add_exchange(
            exchange=ExchangeName.BYBIT,
            symbols=initial_symbols,
        )
        
        await manager.start_all()
        
        # Monitor initial symbol for 15 seconds
        logger.info("Monitoring initial symbols...")
        await asyncio.sleep(15)
        
        # Add more symbols dynamically
        new_symbols = [Symbol("ETHUSDT"), Symbol("SOLUSDT")]
        
        for symbol in new_symbols:
            logger.info(f"Adding symbol: {symbol}")
            await manager.add_symbol_to_exchange(ExchangeName.BYBIT, symbol)
            await asyncio.sleep(5)  # Wait between additions
        
        # Monitor all symbols for another 20 seconds
        logger.info("Monitoring all symbols...")
        await asyncio.sleep(20)
        
        # Show final stats
        stats = manager.get_all_stats()
        processor_stats = processor.get_stats()
        
        logger.info("=== FINAL STATISTICS ===")
        logger.info(f"Manager: {stats['manager_stats']}")
        logger.info(f"Tracked symbols: {list(processor_stats['last_prices'].keys())}")
        logger.info("========================")


def main():
    """Main entry point - choose which example to run."""
    import sys
    
    examples = {
        "basic": run_basic_example,
        "single": run_single_collector_example,
        "symbols": run_symbol_management_example,
    }
    
    if len(sys.argv) > 1 and sys.argv[1] in examples:
        example_name = sys.argv[1]
    else:
        print("Available examples:")
        for name in examples:
            print(f"  python examples/basic_usage.py {name}")
        print("\nDefaulting to 'basic' example...")
        example_name = "basic"
    
    logger.info(f"Running example: {example_name}")
    
    try:
        asyncio.run(examples[example_name]())
    except KeyboardInterrupt:
        logger.info("Example interrupted by user")
    except Exception as e:
        logger.error(f"Example failed: {e}")
        raise


if __name__ == "__main__":
    main()
