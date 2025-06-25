"""
Main WADM Manager - Coordinates collectors and indicators
UPDATED: Time-based indicator calculation instead of trade count
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from collections import defaultdict
from src.collectors import BybitCollector, BinanceCollector, CoinbaseCollector, KrakenCollector
from src.indicators import VolumeProfileCalculator, OrderFlowCalculator
from src.storage import StorageManager
from src.models import Trade
from src.config import (
    BYBIT_SYMBOLS, BINANCE_SYMBOLS, COINBASE_SYMBOLS, KRAKEN_SYMBOLS, 
    BATCH_SIZE, ORDER_FLOW_WINDOW, BUFFER_SIZE
)
from src.smc import SMCDashboard
from src.logger import get_logger

logger = get_logger(__name__)

# Time-based calculation intervals (seconds)
INDICATOR_INTERVALS = {
    "fast": 60,      # 1 minute - Order Flow, Volume Profile
    "medium": 300,   # 5 minutes - VWAP, Bollinger, RSI
    "slow": 900      # 15 minutes - Wyckoff, Elliott, SMC
}

class WADMManager:
    """Main manager for WADM system with time-based calculations"""
    
    def __init__(self):
        self.storage = StorageManager()
        self.order_flow_calc = OrderFlowCalculator()
        self.smc_dashboard = SMCDashboard(self.storage)
        
        # Trade buffers per symbol/exchange
        self.trade_buffers = defaultdict(list)
        
        # Collectors
        self.collectors = []
        
        # Running flag
        self.running = False
        
        # Track last calculation times for each indicator type
        self.last_calc_times = {
            "fast": defaultdict(lambda: datetime.min.replace(tzinfo=timezone.utc)),
            "medium": defaultdict(lambda: datetime.min.replace(tzinfo=timezone.utc)),
            "slow": defaultdict(lambda: datetime.min.replace(tzinfo=timezone.utc))
        }
        
        # Stats
        self.stats = {
            "trades_received": 0,
            "trades_processed": 0,
            "indicators_calculated": 0,
            "errors": 0,
            "volume_profiles": 0,
            "order_flows": 0,
            "smc_analyses": 0,
            "footprints": 0,
            "market_profiles": 0
        }
        
        logger.info("WADM Manager initialized with time-based calculations")
        logger.info(f"Intervals - Fast: {INDICATOR_INTERVALS['fast']}s, "
                   f"Medium: {INDICATOR_INTERVALS['medium']}s, "
                   f"Slow: {INDICATOR_INTERVALS['slow']}s")
    
    async def on_trades(self, trades: List[Trade]):
        """Handle incoming trades from collectors"""
        self.stats["trades_received"] += len(trades)
        
        # Save trades immediately
        saved = self.storage.save_trades(trades)
        self.stats["trades_processed"] += saved
        
        # Buffer trades for indicator calculation
        for trade in trades:
            key = f"{trade.exchange.value}:{trade.symbol}"
            self.trade_buffers[key].append(trade)
            
            # Limit buffer size
            if len(self.trade_buffers[key]) > BUFFER_SIZE:
                self.trade_buffers[key] = self.trade_buffers[key][-BUFFER_SIZE:]
    
    async def calculate_fast_indicators(self, symbol: str, exchange: str):
        """Calculate fast indicators (1 minute interval)"""
        try:
            # Get recent trades
            trades = self.storage.get_recent_trades(symbol, exchange, minutes=5)
            
            if len(trades) < 20:
                return
            
            # Format trades for calculation
            valid_trades = self._validate_and_format_trades(trades)
            
            # Calculate Volume Profile
            try:
                vp = VolumeProfileCalculator.calculate(valid_trades, symbol, exchange)
                self.storage.save_volume_profile(vp)
                self.stats["volume_profiles"] += 1
                logger.debug(f"[VP] {symbol}/{exchange}: POC={vp.poc:.2f}")
            except Exception as e:
                logger.error(f"Error in Volume Profile: {e}")
            
            # Calculate Order Flow
            try:
                prev_flow = self.storage.get_latest_order_flow(symbol, exchange)
                of = self.order_flow_calc.calculate(valid_trades[-100:], symbol, exchange, prev_flow)
                self.storage.save_order_flow(of)
                self.stats["order_flows"] += 1
                logger.debug(f"[OF] {symbol}/{exchange}: Delta={of.delta:.2f}")
            except Exception as e:
                logger.error(f"Error in Order Flow: {e}")
                
            self.stats["indicators_calculated"] += 2
            
        except Exception as e:
            logger.error(f"Error in fast indicators: {e}")
            self.stats["errors"] += 1
    
    async def calculate_medium_indicators(self, symbol: str, exchange: str):
        """Calculate medium indicators (5 minute interval)"""
        try:
            # Placeholder for medium indicators
            # TODO: Implement VWAP, Bollinger Bands, RSI, MACD
            logger.debug(f"[Medium] Calculating for {symbol}/{exchange}")
            
            # Get data for calculations
            trades = self.storage.get_recent_trades(symbol, exchange, minutes=60)
            if len(trades) < 100:
                return
                
            # TODO: Add actual calculations
            # - VWAP with bands
            # - Bollinger Bands
            # - RSI
            # - MACD
            
        except Exception as e:
            logger.error(f"Error in medium indicators: {e}")
            self.stats["errors"] += 1
    
    async def calculate_slow_indicators(self, symbol: str, exchange: str):
        """Calculate slow indicators (15 minute interval)"""
        try:
            # Use existing SMC analysis
            await self.calculate_smc_analysis(symbol)
            
            # TODO: Add more slow indicators
            # - Market Profile (TPO)
            # - Footprint charts
            # - Liquidation levels
            # - Dark pool detection
            
        except Exception as e:
            logger.error(f"Error in slow indicators: {e}")
            self.stats["errors"] += 1
    
    async def periodic_calculations(self):
        """Run time-based indicator calculations"""
        while self.running:
            try:
                await asyncio.sleep(1)  # Check every second
                
                now = datetime.now(timezone.utc)
                
                # Get all active symbol/exchange pairs
                active_pairs = set()
                for exchange in ["bybit", "binance", "coinbase", "kraken"]:
                    symbols = {
                        "bybit": BYBIT_SYMBOLS,
                        "binance": BINANCE_SYMBOLS,
                        "coinbase": COINBASE_SYMBOLS,
                        "kraken": KRAKEN_SYMBOLS
                    }.get(exchange, [])
                    
                    for symbol in symbols:
                        active_pairs.add((symbol, exchange))
                
                # Check each pair for needed calculations
                for symbol, exchange in active_pairs:
                    key = f"{exchange}:{symbol}"
                    
                    # Fast indicators (1 minute)
                    if (now - self.last_calc_times["fast"][key]).total_seconds() >= INDICATOR_INTERVALS["fast"]:
                        asyncio.create_task(self.calculate_fast_indicators(symbol, exchange))
                        self.last_calc_times["fast"][key] = now
                    
                    # Medium indicators (5 minutes)
                    if (now - self.last_calc_times["medium"][key]).total_seconds() >= INDICATOR_INTERVALS["medium"]:
                        asyncio.create_task(self.calculate_medium_indicators(symbol, exchange))
                        self.last_calc_times["medium"][key] = now
                    
                    # Slow indicators (15 minutes)
                    if (now - self.last_calc_times["slow"][key]).total_seconds() >= INDICATOR_INTERVALS["slow"]:
                        asyncio.create_task(self.calculate_slow_indicators(symbol, exchange))
                        self.last_calc_times["slow"][key] = now
                
            except Exception as e:
                logger.error(f"Error in periodic calculations: {e}", exc_info=True)
    
    async def periodic_tasks(self):
        """Run periodic maintenance tasks"""
        last_stats_time = 0
        last_cleanup_time = 0
        
        while self.running:
            try:
                await asyncio.sleep(10)
                
                current_time = int(datetime.now().timestamp())
                
                # Log stats every 30 seconds
                if current_time % 30 == 0 and current_time != last_stats_time:
                    logger.info("=== WADM Stats (Time-based) ===")
                    logger.info(f"Trades: received={self.stats['trades_received']:,}, "
                              f"processed={self.stats['trades_processed']:,}")
                    logger.info(f"Indicators: total={self.stats['indicators_calculated']:,}")
                    logger.info(f"  Fast: VP={self.stats['volume_profiles']:,}, "
                              f"OF={self.stats['order_flows']:,}")
                    logger.info(f"  Slow: SMC={self.stats['smc_analyses']:,}")
                    logger.info(f"Errors: {self.stats['errors']}")
                    
                    # Show calculation frequency
                    active_count = len([k for k in self.last_calc_times["fast"] 
                                      if (datetime.now(timezone.utc) - self.last_calc_times["fast"][k]).total_seconds() < 120])
                    logger.info(f"Active pairs: {active_count}")
                    
                    last_stats_time = current_time
                    
                # Cleanup old data every hour
                if current_time - last_cleanup_time > 3600:
                    self.storage.cleanup_old_data()
                    last_cleanup_time = current_time
                    logger.info("Cleaned up old data")
                    
            except Exception as e:
                logger.error(f"Error in periodic tasks: {e}", exc_info=True)
    
    async def calculate_smc_analysis(self, symbol: str):
        """Calculate Smart Money Concepts analysis for a symbol"""
        try:
            # Check if we have sufficient data
            total_trades = 0
            for exchange in ["bybit", "binance", "coinbase", "kraken"]:
                recent_trades = self.storage.get_recent_trades(symbol, exchange, minutes=60)
                total_trades += len(recent_trades)
            
            if total_trades < 100:
                return
            
            # Get comprehensive SMC analysis
            smc_analysis = await self.smc_dashboard.get_comprehensive_analysis(symbol)
            
            self.stats["smc_analyses"] += 1
            
            logger.info(f"[SMC] {symbol}: {smc_analysis.smc_bias.value} bias, "
                       f"{smc_analysis.confluence_score:.1f}% confluence")
            
        except Exception as e:
            logger.error(f"Error in SMC analysis for {symbol}: {e}")
            self.stats["errors"] += 1
    
    def _validate_and_format_trades(self, trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate and format trades for indicator calculation"""
        valid_trades = []
        required_fields = ['price', 'quantity', 'side', 'timestamp']
        
        for trade in trades:
            try:
                # Check required fields
                if not all(field in trade for field in required_fields):
                    continue
                    
                # Validate and convert data types
                formatted_trade = {
                    'price': float(trade['price']),
                    'quantity': float(trade['quantity']),
                    'side': str(trade['side']).lower(),
                    'timestamp': trade['timestamp']
                }
                
                # Validate side
                if formatted_trade['side'] not in ['buy', 'sell']:
                    continue
                    
                # Validate numeric values
                if formatted_trade['price'] <= 0 or formatted_trade['quantity'] <= 0:
                    continue
                    
                valid_trades.append(formatted_trade)
                
            except (ValueError, TypeError) as e:
                continue
        
        return valid_trades
    
    async def start(self):
        """Start the manager"""
        logger.info("Starting WADM Manager with time-based calculations...")
        self.running = True
        
        # Create collectors
        if BYBIT_SYMBOLS:
            self.collectors.append(BybitCollector(BYBIT_SYMBOLS, self.on_trades))
        
        if BINANCE_SYMBOLS:
            self.collectors.append(BinanceCollector(BINANCE_SYMBOLS, self.on_trades))
        
        if COINBASE_SYMBOLS:
            self.collectors.append(CoinbaseCollector(COINBASE_SYMBOLS, self.on_trades))
        
        if KRAKEN_SYMBOLS:
            self.collectors.append(KrakenCollector(KRAKEN_SYMBOLS, self.on_trades))
        
        # Start all tasks
        tasks = []
        
        # Start collectors
        for collector in self.collectors:
            tasks.append(asyncio.create_task(collector.run()))
        
        # Start calculation loops
        tasks.append(asyncio.create_task(self.periodic_calculations()))
        tasks.append(asyncio.create_task(self.periodic_tasks()))
        
        logger.info(f"Started {len(self.collectors)} collectors")
        logger.info("Time-based calculations active:")
        logger.info(f"  Fast indicators: every {INDICATOR_INTERVALS['fast']}s")
        logger.info(f"  Medium indicators: every {INDICATOR_INTERVALS['medium']}s")
        logger.info(f"  Slow indicators: every {INDICATOR_INTERVALS['slow']}s")
        
        # Wait for all tasks
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            logger.error(f"Error in main loop: {e}", exc_info=True)
    
    async def stop(self):
        """Stop the manager"""
        logger.info("Stopping WADM Manager...")
        self.running = False
        
        # Stop collectors
        for collector in self.collectors:
            await collector.stop()
        
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
            "intervals": INDICATOR_INTERVALS,
            "active_calculations": {
                interval: len([k for k in times 
                             if (datetime.now(timezone.utc) - times[k]).total_seconds() < INDICATOR_INTERVALS[interval] * 2])
                for interval, times in self.last_calc_times.items()
            }
        }
