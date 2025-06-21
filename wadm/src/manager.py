"""
Main WADM Manager - Coordinates collectors and indicators
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
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

class WADMManager:
    """Main manager for WADM system"""
    
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
        
        # Track last indicator calculation time
        self.last_indicator_calc = defaultdict(datetime)
        
        # Stats
        self.stats = {
            "trades_received": 0,
            "trades_processed": 0,
            "indicators_calculated": 0,
            "errors": 0,
            "volume_profiles": 0,
            "order_flows": 0,
            "smc_analyses": 0
        }
        
        # Track last SMC calculation time
        self.last_smc_calc = defaultdict(datetime)
        
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
            
            logger.info(f"Saved {saved} trades for {key}, total processed: {self.stats['trades_processed']}")
            
            # Calculate indicators if enough time has passed
            now = datetime.now(timezone.utc)
            last_calc = self.last_indicator_calc.get(key, datetime.min.replace(tzinfo=timezone.utc))
            
            # Calculate indicators every 5 seconds or if never calculated
            if (now - last_calc).total_seconds() > 5:
                await self.calculate_indicators(symbol, exchange)
                self.last_indicator_calc[key] = now
            
        except Exception as e:
            logger.error(f"Error processing trades for {key}: {e}", exc_info=True)
            self.stats["errors"] += 1
    
    async def calculate_indicators(self, symbol: str, exchange: str):
        """Calculate and save indicators"""
        try:
            # Get recent trades for analysis
            trades = self.storage.get_recent_trades(symbol, exchange, minutes=5)
            
            logger.info(f"Calculating indicators for {symbol}/{exchange}: {len(trades)} trades available")
            
            if len(trades) < 20:  # Reduced minimum trades for faster indicators
                logger.debug(f"Not enough trades for indicators: {len(trades)} < 20")
                return
            
            # Validate and format trades for indicator calculation
            valid_trades = self._validate_and_format_trades(trades)
            
            if len(valid_trades) < 20:
                logger.warning(f"Not enough valid trades: {len(valid_trades)}")
                return
            
            # Calculate Volume Profile
            try:
                vp = VolumeProfileCalculator.calculate(valid_trades, symbol, exchange)
                self.storage.save_volume_profile(vp)
                self.stats["indicators_calculated"] += 1
                self.stats["volume_profiles"] += 1
                logger.info(f"[OK] Volume Profile calculated for {symbol}: POC={vp.poc:.2f}, VAH={vp.vah:.2f}, VAL={vp.val:.2f}")
            except Exception as e:
                logger.error(f"Error calculating Volume Profile: {e}", exc_info=True)
            
            # Calculate Order Flow
            try:
                # Get previous order flow for cumulative delta
                prev_flow = self.storage.get_latest_order_flow(symbol, exchange)
                
                # Get trades for order flow window
                window_start = datetime.now(timezone.utc) - timedelta(seconds=ORDER_FLOW_WINDOW)
                window_trades = []
                
                for t in valid_trades:
                    # Handle different timestamp formats
                    ts = t.get("timestamp")
                    if isinstance(ts, str):
                        # Parse string timestamp if needed
                        try:
                            ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                        except:
                            continue
                    elif isinstance(ts, datetime) and ts.tzinfo is None:
                        # If naive datetime, assume UTC
                        ts = ts.replace(tzinfo=timezone.utc)
                    
                    if ts and ts > window_start:
                        window_trades.append(t)
                
                if window_trades:
                    of = self.order_flow_calc.calculate(window_trades, symbol, exchange, prev_flow)
                    self.storage.save_order_flow(of)
                    self.stats["indicators_calculated"] += 1
                    self.stats["order_flows"] += 1
                    logger.info(f"[OK] Order Flow calculated for {symbol}: Delta={of.delta:.2f}, Cumulative={of.cumulative_delta:.2f}")
                else:
                    logger.debug(f"No trades in order flow window for {symbol}")
                    
            except Exception as e:
                logger.error(f"Error calculating Order Flow: {e}", exc_info=True)
                
        except Exception as e:
            logger.error(f"Error in calculate_indicators: {e}", exc_info=True)
            self.stats["errors"] += 1
    
    async def calculate_smc_analysis(self, symbol: str):
        """Calculate Smart Money Concepts analysis for a symbol"""
        try:
            # Check if enough time has passed since last SMC calculation
            now = datetime.now(timezone.utc)
            last_calc = self.last_smc_calc.get(symbol, datetime.min.replace(tzinfo=timezone.utc))
            
            # Calculate SMC analysis every 5 minutes
            if (now - last_calc).total_seconds() < 300:
                return
            
            # Check if we have sufficient data across multiple exchanges
            total_trades = 0
            for exchange in ["bybit", "binance", "coinbase", "kraken"]:
                recent_trades = self.storage.get_recent_trades(symbol, exchange, minutes=60)
                total_trades += len(recent_trades)
            
            if total_trades < 100:  # Need minimum trades for SMC analysis
                logger.debug(f"Not enough trades for SMC analysis for {symbol}: {total_trades} < 100")
                return
            
            # Get comprehensive SMC analysis
            smc_analysis = await self.smc_dashboard.get_comprehensive_analysis(symbol)
            
            self.stats["smc_analyses"] += 1
            self.last_smc_calc[symbol] = now
            
            logger.info(f"[SMC] {symbol}: {smc_analysis.smc_bias.value} bias, {smc_analysis.confluence_score:.1f}% confluence, {len(smc_analysis.active_signals)} signals")
            
            # Log key insights if any
            if smc_analysis.key_insights:
                logger.info(f"[SMC] {symbol} Key Insight: {smc_analysis.key_insights[0]}")
            
        except Exception as e:
            logger.error(f"Error calculating SMC analysis for {symbol}: {e}", exc_info=True)
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
                logger.debug(f"Invalid trade data: {e}")
                continue
        
        return valid_trades
    
    async def periodic_tasks(self):
        """Run periodic tasks"""
        last_stats_time = 0
        last_cleanup_time = 0
        
        while self.running:
            try:
                await asyncio.sleep(5)
                
                current_time = int(datetime.now().timestamp())
                
                # Process remaining buffered trades
                for key, buffer in list(self.trade_buffers.items()):
                    if buffer:
                        logger.info(f"Processing {len(buffer)} buffered trades for {key}")
                        await self.process_trades(key, buffer)
                        self.trade_buffers[key] = []
                
                # Force indicator calculation for all symbols every 15 seconds
                if current_time % 15 == 0 and current_time != last_stats_time:
                    all_symbols = BYBIT_SYMBOLS + BINANCE_SYMBOLS + COINBASE_SYMBOLS + KRAKEN_SYMBOLS
                    for symbol in all_symbols:
                        for exchange in ["bybit", "binance", "coinbase", "kraken"]:
                            # Check if we have recent trades before forcing calculation
                            recent_trades = self.storage.get_recent_trades(symbol, exchange, minutes=2)
                            if len(recent_trades) >= 10:
                                await self.calculate_indicators(symbol, exchange)
                
                # Calculate SMC analysis every 60 seconds for symbols with sufficient data
                if current_time % 60 == 0:
                    unique_symbols = list(set(BYBIT_SYMBOLS + BINANCE_SYMBOLS + COINBASE_SYMBOLS + KRAKEN_SYMBOLS))
                    for symbol in unique_symbols:
                        await self.calculate_smc_analysis(symbol)
                
                # Log stats every 30 seconds
                if current_time % 30 == 0 and current_time != last_stats_time:
                    logger.info(f"=== WADM Stats ===")
                    logger.info(f"Trades: received={self.stats['trades_received']}, "
                              f"processed={self.stats['trades_processed']}")
                    logger.info(f"Indicators: total={self.stats['indicators_calculated']}, "
                              f"VP={self.stats['volume_profiles']}, "
                              f"OF={self.stats['order_flows']}, "
                              f"SMC={self.stats['smc_analyses']}")
                    logger.info(f"Errors: {self.stats['errors']}")
                    
                    db_stats = self.storage.get_stats()
                    logger.info(f"DB Stats: Trades={db_stats['trades_count']}, "
                              f"VolumeProfiles={db_stats['volume_profiles_count']}, "
                              f"OrderFlows={db_stats['order_flows_count']}")
                    last_stats_time = current_time
                    
                # Cleanup old data every hour
                if current_time - last_cleanup_time > 3600:
                    self.storage.cleanup_old_data()
                    last_cleanup_time = current_time
                    
            except Exception as e:
                logger.error(f"Error in periodic tasks: {e}", exc_info=True)
    
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
        
        if COINBASE_SYMBOLS:
            self.collectors.append(
                CoinbaseCollector(COINBASE_SYMBOLS, self.on_trades)
            )
        
        if KRAKEN_SYMBOLS:
            self.collectors.append(
                KrakenCollector(KRAKEN_SYMBOLS, self.on_trades)
            )
        
        # Start all tasks
        tasks = []
        
        # Start collectors
        for collector in self.collectors:
            tasks.append(asyncio.create_task(collector.run()))
        
        # Start periodic tasks
        tasks.append(asyncio.create_task(self.periodic_tasks()))
        
        logger.info(f"Started {len(self.collectors)} collectors")
        logger.info(f"Monitoring symbols:")
        logger.info(f"  Bybit: {BYBIT_SYMBOLS}")
        logger.info(f"  Binance: {BINANCE_SYMBOLS}")
        logger.info(f"  Coinbase Pro: {COINBASE_SYMBOLS}")
        logger.info(f"  Kraken: {KRAKEN_SYMBOLS}")
        
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
        
        # Process remaining trades
        for key, buffer in self.trade_buffers.items():
            if buffer:
                await self.process_trades(key, buffer)
        
        # Close storage
        self.storage.close()
        
        logger.info("WADM Manager stopped")
    
    async def get_smc_analysis(self, symbol: str) -> Dict[str, Any]:
        """Get SMC analysis for a symbol"""
        try:
            return await self.smc_dashboard.get_comprehensive_analysis(symbol)
        except Exception as e:
            logger.error(f"Error getting SMC analysis for {symbol}: {e}")
            return {"error": str(e)}
    
    async def get_smc_summary(self, symbol: str) -> Dict[str, Any]:
        """Get SMC quick summary for a symbol"""
        try:
            return await self.smc_dashboard.get_quick_summary(symbol)
        except Exception as e:
            logger.error(f"Error getting SMC summary for {symbol}: {e}")
            return {"error": str(e)}
    
    def get_status(self) -> Dict[str, Any]:
        """Get system status"""
        return {
            "running": self.running,
            "collectors": len(self.collectors),
            "stats": self.stats,
            "storage": self.storage.get_stats(),
            "buffers": {k: len(v) for k, v in self.trade_buffers.items()}
        }
