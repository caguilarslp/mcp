"""
Main WADM Manager - Coordinates collectors and indicators
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from collections import defaultdict
from src.collectors import BybitCollector, BinanceCollector
from src.indicators import VolumeProfileCalculator, OrderFlowCalculator
from src.storage import StorageManager
from src.models import Trade
from src.config import (
    BYBIT_SYMBOLS, BINANCE_SYMBOLS, BATCH_SIZE,
    ORDER_FLOW_WINDOW, BUFFER_SIZE
)
from src.logger import get_logger

logger = get_logger(__name__)

class WADMManager:
    """Main manager for WADM system"""
    
    def __init__(self):
        self.storage = StorageManager()
        self.order_flow_calc = OrderFlowCalculator()
        
        # Trade buffers per symbol/exchange
        self.trade_buffers = defaultdict(list)
        
        # Collectors
        self.collectors = []
        
        # Running flag
        self.running = False
        
        # Stats
        self.stats = {
            "trades_received": 0,
            "trades_processed": 0,
            "indicators_calculated": 0,
            "errors": 0
        }
        
        logger.info("WADM Manager initialized")
    
    async def on_trades(self, trades: List[Trade]):
        """Handle incoming trades from collectors"""
        self.stats["trades_received"] += len(trades)
        
        # Buffer trades by symbol/exchange
        for trade in trades:
            key = f"{trade.exchange.value}:{trade.symbol}"
            self.trade_buffers[key].append(trade)
            
            # Limit buffer size
            if len(self.trade_buffers[key]) > BUFFER_SIZE:
                self.trade_buffers[key] = self.trade_buffers[key][-BUFFER_SIZE:]
        
        # Process if we have enough trades
        for key, buffer in self.trade_buffers.items():
            if len(buffer) >= BATCH_SIZE:
                await self.process_trades(key, buffer[:BATCH_SIZE])
                self.trade_buffers[key] = buffer[BATCH_SIZE:]
    
    async def process_trades(self, key: str, trades: List[Trade]):
        """Process batch of trades"""
        try:
            exchange, symbol = key.split(":")
            
            # Save trades to storage
            saved = self.storage.save_trades(trades)
            self.stats["trades_processed"] += saved
            
            # Calculate indicators if we have enough data
            await self.calculate_indicators(symbol, exchange)
            
            logger.debug(f"Processed batch of {len(trades)} trades for {key}")
            
        except Exception as e:
            logger.error(f"Error processing trades for {key}: {e}")
            self.stats["errors"] += 1
    
    async def calculate_indicators(self, symbol: str, exchange: str):
        """Calculate and save indicators"""
        try:
            # Get recent trades for analysis
            trades = self.storage.get_recent_trades(symbol, exchange, minutes=5)
            
            logger.debug(f"Found {len(trades)} trades for {symbol} on {exchange}")
            
            if len(trades) < 50:  # Need minimum trades for meaningful indicators
                logger.debug(f"Not enough trades for indicators: {len(trades)} < 50")
                return
            
            # Calculate Volume Profile
            try:
                vp = VolumeProfileCalculator.calculate(trades, symbol, exchange)
                self.storage.save_volume_profile(vp)
                self.stats["indicators_calculated"] += 1
                logger.info(f"Volume Profile calculated for {symbol}: POC={vp.poc:.2f}")
            except Exception as e:
                logger.error(f"Error calculating Volume Profile: {e}")
            
            # Calculate Order Flow
            try:
                # Get previous order flow for cumulative delta
                prev_flow = self.storage.get_latest_order_flow(symbol, exchange)
                
                # Get trades for order flow window
                window_trades = [t for t in trades 
                               if t["timestamp"] > datetime.utcnow() - timedelta(seconds=ORDER_FLOW_WINDOW)]
                
                if window_trades:
                    of = self.order_flow_calc.calculate(window_trades, symbol, exchange, prev_flow)
                    self.storage.save_order_flow(of)
                    self.stats["indicators_calculated"] += 1
                    logger.info(f"Order Flow calculated for {symbol}: Delta={of.delta:.2f}")
            except Exception as e:
                logger.error(f"Error calculating Order Flow: {e}")
                
        except Exception as e:
            logger.error(f"Error in calculate_indicators: {e}")
            self.stats["errors"] += 1
    
    async def periodic_tasks(self):
        """Run periodic tasks"""
        last_process_time = 0
        
        while self.running:
            try:
                # Process remaining buffered trades every 5 seconds
                await asyncio.sleep(5)
                
                current_time = int(datetime.now().timestamp())
                
                # Process buffers
                for key, buffer in list(self.trade_buffers.items()):
                    if buffer:
                        logger.info(f"Processing {len(buffer)} buffered trades for {key}")
                        await self.process_trades(key, buffer)
                        self.trade_buffers[key] = []
                
                # Log stats every 30 seconds
                if current_time % 30 == 0 and current_time != last_process_time:
                    logger.info(f"Stats: {self.stats}")
                    db_stats = self.storage.get_stats()
                    logger.info(f"DB Stats: Trades={db_stats['trades_count']}, "
                              f"VolumeProfiles={db_stats['volume_profiles_count']}, "
                              f"OrderFlows={db_stats['order_flows_count']}")
                    last_process_time = current_time
                    
                # Cleanup old data every hour
                if int(datetime.now().timestamp()) % 3600 == 0:
                    self.storage.cleanup_old_data()
                    
            except Exception as e:
                logger.error(f"Error in periodic tasks: {e}")
    
    async def start(self):
        """Start the manager"""
        logger.info("Starting WADM Manager...")
        self.running = True
        
        # Create collectors
        if BYBIT_SYMBOLS:
            self.collectors.append(
                BybitCollector(BYBIT_SYMBOLS, self.on_trades)
            )
        
        if BINANCE_SYMBOLS:
            self.collectors.append(
                BinanceCollector(BINANCE_SYMBOLS, self.on_trades)
            )
        
        # Start all tasks
        tasks = []
        
        # Start collectors
        for collector in self.collectors:
            tasks.append(asyncio.create_task(collector.run()))
        
        # Start periodic tasks
        tasks.append(asyncio.create_task(self.periodic_tasks()))
        
        logger.info(f"Started {len(self.collectors)} collectors")
        
        # Wait for all tasks
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
    
    async def stop(self):
        """Stop the manager"""
        logger.info("Stopping WADM Manager...")
        self.running = False
        
        # Stop collectors
        for collector in self.collectors:
            await collector.stop()
        
        # Process remaining trades
        for key, buffer in self.trade_buffers.items():
            if buffer:
                await self.process_trades(key, buffer)
        
        # Close storage
        self.storage.close()
        
        logger.info("WADM Manager stopped")
    
    def get_status(self) -> Dict[str, Any]:
        """Get system status"""
        return {
            "running": self.running,
            "collectors": len(self.collectors),
            "stats": self.stats,
            "storage": self.storage.get_stats(),
            "buffers": {k: len(v) for k, v in self.trade_buffers.items()}
        }
