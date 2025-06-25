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

# Complete timeframes configuration for professional trading
STANDARD_TIMEFRAMES = {
    # Ultra-fast scalping
    "1s": 1, "5s": 5, "15s": 15, "30s": 30,
    # Intraday trading
    "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800,
    # Day trading
    "1h": 3600, "2h": 7200, "4h": 14400, "6h": 21600, "8h": 28800, "12h": 43200,
    # Swing/Position trading
    "1d": 86400, "3d": 259200, "1w": 604800, "1M": 2592000
}

# Indicator-specific timeframe configurations with priorities
INDICATOR_TIMEFRAMES = {
    "volume_profile": {
        "timeframes": ["1m", "5m", "15m", "1h", "4h", "1d"],
        "priority": "CRITICAL"
    },
    "order_flow": {
        "timeframes": ["1s", "5s", "15s", "1m", "5m"],
        "priority": "CRITICAL"
    },
    "footprint": {
        "timeframes": ["1m", "5m", "15m", "30m"],
        "priority": "HIGH"
    },
    "market_profile": {
        "timeframes": ["30m", "1h", "4h", "1d"],
        "priority": "HIGH"
    },
    "vwap": {
        "timeframes": ["5m", "15m", "1h", "4h", "1d"],
        "priority": "HIGH"
    },
    "bollinger_bands": {
        "timeframes": ["5m", "15m", "1h", "4h", "1d"],
        "priority": "MEDIUM"
    },
    "rsi": {
        "timeframes": ["5m", "15m", "1h", "4h", "1d"],
        "priority": "MEDIUM"
    },
    "macd": {
        "timeframes": ["15m", "1h", "4h", "1d"],
        "priority": "MEDIUM"
    },
    "wyckoff": {
        "timeframes": ["15m", "1h", "4h", "1d"],
        "priority": "MEDIUM"
    },
    "smc": {
        "timeframes": ["5m", "15m", "1h", "4h"],
        "priority": "HIGH"
    }
}

# Priority levels for resource management
PRIORITY_LEVELS = {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 3,
    "LOW": 4
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
        
        # Track last calculation times per indicator/symbol/exchange/timeframe
        self.last_calc_times = defaultdict(lambda: datetime.min.replace(tzinfo=timezone.utc))
        
        # Resource management
        self.max_concurrent_calculations = 10
        self.running_calculations = 0
        
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
        
        logger.info("WADM Manager initialized with complete timeframe system")
        logger.info(f"Available timeframes: {list(STANDARD_TIMEFRAMES.keys())}")
        logger.info(f"Configured indicators: {list(INDICATOR_TIMEFRAMES.keys())}")
        
        # Log critical indicators
        critical_indicators = [name for name, config in INDICATOR_TIMEFRAMES.items() 
                              if config["priority"] == "CRITICAL"]
        logger.info(f"Critical indicators: {critical_indicators}")
    
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
    
    def should_calculate_indicator(self, indicator: str, symbol: str, 
                                  exchange: str, timeframe: str) -> bool:
        """Check if indicator should be calculated for given timeframe"""
        # Check if indicator supports this timeframe
        config = INDICATOR_TIMEFRAMES.get(indicator)
        if not config or timeframe not in config["timeframes"]:
            return False
        
        # Get calculation interval
        interval_seconds = STANDARD_TIMEFRAMES.get(timeframe)
        if not interval_seconds:
            return False
        
        # Check last calculation time
        key = f"{indicator}:{symbol}:{exchange}:{timeframe}"
        last_calc = self.last_calc_times[key]
        
        now = datetime.now(timezone.utc)
        elapsed = (now - last_calc).total_seconds()
        
        return elapsed >= interval_seconds
    
    def get_indicator_priority(self, indicator: str) -> int:
        """Get priority level for an indicator (lower = higher priority)"""
        config = INDICATOR_TIMEFRAMES.get(indicator, {})
        priority_name = config.get("priority", "MEDIUM")
        return PRIORITY_LEVELS.get(priority_name, 3)
    
    async def calculate_indicator_for_timeframe(self, indicator: str, symbol: str, 
                                              exchange: str, timeframe: str):
        """Calculate specific indicator for given timeframe"""
        if not self.should_calculate_indicator(indicator, symbol, exchange, timeframe):
            return
        
        # Check resource limits
        if self.running_calculations >= self.max_concurrent_calculations:
            logger.warning(f"Resource limit hit, skipping {indicator} calculation")
            return
        
        self.running_calculations += 1
        
        try:
            if indicator == "volume_profile":
                await self.calculate_volume_profile(symbol, exchange, timeframe)
            elif indicator == "order_flow":
                await self.calculate_order_flow(symbol, exchange, timeframe)
            elif indicator == "smc":
                await self.calculate_smc_analysis(symbol)
            # TODO: Add other indicators as they are implemented
            else:
                logger.debug(f"Indicator {indicator} not yet implemented")
            
            # Mark as completed
            key = f"{indicator}:{symbol}:{exchange}:{timeframe}"
            self.last_calc_times[key] = datetime.now(timezone.utc)
            
        except Exception as e:
            logger.error(f"Error calculating {indicator} for {symbol}/{exchange} at {timeframe}: {e}")
            self.stats["errors"] += 1
        finally:
            self.running_calculations -= 1
    
    async def calculate_volume_profile(self, symbol: str, exchange: str, timeframe: str):
        """Calculate Volume Profile for specific timeframe"""
        try:
            # Get data window based on timeframe
            minutes = max(5, STANDARD_TIMEFRAMES[timeframe] // 60)  # At least 5 minutes of data
            trades = self.storage.get_recent_trades(symbol, exchange, minutes=minutes)
            
            if len(trades) < 20:
                return
            
            valid_trades = self._validate_and_format_trades(trades)
            vp = VolumeProfileCalculator.calculate(valid_trades, symbol, exchange)
            self.storage.save_volume_profile(vp)
            self.stats["volume_profiles"] += 1
            
            logger.debug(f"[VP-{timeframe}] {symbol}/{exchange}: POC={vp.poc:.2f}")
            
        except Exception as e:
            logger.error(f"Error in Volume Profile {timeframe}: {e}")
            raise
    
    async def calculate_order_flow(self, symbol: str, exchange: str, timeframe: str):
        """Calculate Order Flow for specific timeframe"""
        try:
            # Get data window based on timeframe  
            minutes = max(1, STANDARD_TIMEFRAMES[timeframe] // 60)  # At least 1 minute
            trades = self.storage.get_recent_trades(symbol, exchange, minutes=minutes)
            
            if len(trades) < 10:
                return
            
            valid_trades = self._validate_and_format_trades(trades)
            prev_flow = self.storage.get_latest_order_flow(symbol, exchange)
            of = self.order_flow_calc.calculate(valid_trades[-100:], symbol, exchange, prev_flow)
            self.storage.save_order_flow(of)
            self.stats["order_flows"] += 1
            
            logger.debug(f"[OF-{timeframe}] {symbol}/{exchange}: Delta={of.delta:.2f}")
            
        except Exception as e:
            logger.error(f"Error in Order Flow {timeframe}: {e}")
            raise

    # Legacy methods kept for backward compatibility (deprecated)
    async def calculate_fast_indicators(self, symbol: str, exchange: str):
        """DEPRECATED: Use calculate_indicator_for_timeframe instead"""
        logger.warning("calculate_fast_indicators is deprecated, use new timeframe system")
        # Delegate to new system
        await self.calculate_indicator_for_timeframe("volume_profile", symbol, exchange, "1m")
        await self.calculate_indicator_for_timeframe("order_flow", symbol, exchange, "1m")
    
    async def calculate_medium_indicators(self, symbol: str, exchange: str):
        """DEPRECATED: Use calculate_indicator_for_timeframe instead"""
        logger.warning("calculate_medium_indicators is deprecated, use new timeframe system")
        # Placeholder - will be implemented with new indicators
    
    async def calculate_slow_indicators(self, symbol: str, exchange: str):
        """DEPRECATED: Use calculate_indicator_for_timeframe instead"""
        logger.warning("calculate_slow_indicators is deprecated, use new timeframe system")
        await self.calculate_smc_analysis(symbol)
    
    async def periodic_calculations(self):
        """Run dynamic timeframe-based indicator calculations"""
        while self.running:
            try:
                await asyncio.sleep(5)  # Check every 5 seconds (optimized)
                
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
                
                # Schedule calculations for each indicator/timeframe/pair combination
                calculation_tasks = []
                
                for symbol, exchange in active_pairs:
                    for indicator_name, config in INDICATOR_TIMEFRAMES.items():
                        for timeframe in config["timeframes"]:
                            if self.should_calculate_indicator(indicator_name, symbol, exchange, timeframe):
                                priority = self.get_indicator_priority(indicator_name)
                                
                                # Create task with priority consideration
                                task_info = {
                                    "indicator": indicator_name,
                                    "symbol": symbol,
                                    "exchange": exchange,
                                    "timeframe": timeframe,
                                    "priority": priority
                                }
                                calculation_tasks.append(task_info)
                
                # Sort by priority (lower number = higher priority)
                calculation_tasks.sort(key=lambda x: x["priority"])
                
                # Execute tasks respecting resource limits
                executed_tasks = 0
                max_tasks_per_cycle = 20  # Prevent overwhelming the system
                
                for task_info in calculation_tasks[:max_tasks_per_cycle]:
                    if self.running_calculations < self.max_concurrent_calculations:
                        asyncio.create_task(
                            self.calculate_indicator_for_timeframe(
                                task_info["indicator"],
                                task_info["symbol"], 
                                task_info["exchange"],
                                task_info["timeframe"]
                            )
                        )
                        executed_tasks += 1
                    else:
                        break
                
                if executed_tasks > 0:
                    logger.debug(f"Scheduled {executed_tasks} calculation tasks "
                               f"({self.running_calculations} running)")
                
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
                    logger.info("=== WADM Stats (Dynamic Timeframes) ===")
                    logger.info(f"Trades: received={self.stats['trades_received']:,}, "
                              f"processed={self.stats['trades_processed']:,}")
                    logger.info(f"Indicators: total={self.stats['indicators_calculated']:,}")
                    logger.info(f"  VP={self.stats['volume_profiles']:,}, "
                              f"OF={self.stats['order_flows']:,}, "
                              f"SMC={self.stats['smc_analyses']:,}")
                    logger.info(f"Running calculations: {self.running_calculations}/{self.max_concurrent_calculations}")
                    logger.info(f"Errors: {self.stats['errors']}")
                    
                    # Show recent calculation activity
                    now = datetime.now(timezone.utc)
                    recent_calcs = len([k for k, v in self.last_calc_times.items() 
                                      if (now - v).total_seconds() < 300])  # Last 5 minutes
                    logger.info(f"Recent calculations (5min): {recent_calcs}")
                    
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
        logger.info("Dynamic timeframe calculations active:")
        for indicator, config in INDICATOR_TIMEFRAMES.items():
            logger.info(f"  {indicator}: {config['timeframes']} (priority: {config['priority']})")
        logger.info(f"Max concurrent calculations: {self.max_concurrent_calculations}")
        
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
        now = datetime.now(timezone.utc)
        
        # Count recent calculations by indicator
        recent_by_indicator = {}
        for key, timestamp in self.last_calc_times.items():
            if (now - timestamp).total_seconds() < 3600:  # Last hour
                indicator = key.split(':')[0]
                recent_by_indicator[indicator] = recent_by_indicator.get(indicator, 0) + 1
        
        return {
            "running": self.running,
            "collectors": len(self.collectors),
            "stats": self.stats,
            "storage": self.storage.get_stats(),
            "timeframes": {
                "available": list(STANDARD_TIMEFRAMES.keys()),
                "indicators": list(INDICATOR_TIMEFRAMES.keys())
            },
            "resource_usage": {
                "running_calculations": self.running_calculations,
                "max_concurrent": self.max_concurrent_calculations,
                "utilization": f"{(self.running_calculations / self.max_concurrent_calculations * 100):.1f}%"
            },
            "recent_calculations": recent_by_indicator,
            "total_scheduled_combinations": sum(len(config["timeframes"]) for config in INDICATOR_TIMEFRAMES.values())
        }
