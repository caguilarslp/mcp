"""
Data manager for coordinating MongoDB operations in WADM.

This module provides a unified interface for all data operations,
coordinating between different repositories and handling complex
queries that span multiple collections.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal

import structlog
from motor.motor_asyncio import AsyncIOMotorDatabase

from .mongodb import MongoDBClient
from .schemas import MongoSchemas
from .repositories import (
    TradeRepository, OrderBookRepository, KlineRepository,
    VolumeProfileRepository, OrderFlowRepository, 
    LiquidityLevelRepository, MarketStructureRepository
)
from ...core.entities import (
    Trade, OrderBook, Kline, VolumeProfile, OrderFlow,
    LiquidityLevel, MarketStructure
)
from ...core.types import Symbol, Exchange

logger = structlog.get_logger()


class DataManager:
    """Unified data manager for all MongoDB operations."""
    
    def __init__(self, mongodb_client: MongoDBClient):
        """Initialize data manager with MongoDB client.
        
        Args:
            mongodb_client: MongoDB client instance
        """
        self.db_client = mongodb_client
        self._repositories: Dict[str, Any] = {}
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize all repositories and create schemas."""
        if self._initialized:
            return
        
        try:
            # Ensure MongoDB connection
            if not self.db_client._db:
                await self.db_client.connect()
            
            # Create all schemas and indexes
            await MongoSchemas.create_all_schemas(self.db_client.db)
            
            # Initialize repositories
            self._repositories = {
                'trades': TradeRepository(self.db_client.db),
                'orderbook': OrderBookRepository(self.db_client.db),
                'klines': KlineRepository(self.db_client.db),
                'volume_profiles': VolumeProfileRepository(self.db_client.db),
                'order_flow': OrderFlowRepository(self.db_client.db),
                'liquidity_levels': LiquidityLevelRepository(self.db_client.db),
                'market_structure': MarketStructureRepository(self.db_client.db)
            }
            
            self._initialized = True
            logger.info("Data manager initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize data manager", error=str(e))
            raise
    
    @property
    def db(self) -> AsyncIOMotorDatabase:
        """Get database instance."""
        return self.db_client.db
    
    @property
    def trades(self) -> TradeRepository:
        """Get trades repository."""
        self._ensure_initialized()
        return self._repositories['trades']
    
    @property
    def orderbook(self) -> OrderBookRepository:
        """Get orderbook repository."""
        self._ensure_initialized()
        return self._repositories['orderbook']
    
    @property
    def klines(self) -> KlineRepository:
        """Get klines repository."""
        self._ensure_initialized()
        return self._repositories['klines']
    
    @property
    def volume_profiles(self) -> VolumeProfileRepository:
        """Get volume profiles repository."""
        self._ensure_initialized()
        return self._repositories['volume_profiles']
    
    @property
    def order_flow(self) -> OrderFlowRepository:
        """Get order flow repository."""
        self._ensure_initialized()
        return self._repositories['order_flow']
    
    @property
    def liquidity_levels(self) -> LiquidityLevelRepository:
        """Get liquidity levels repository."""
        self._ensure_initialized()
        return self._repositories['liquidity_levels']
    
    @property
    def market_structure(self) -> MarketStructureRepository:
        """Get market structure repository."""
        self._ensure_initialized()
        return self._repositories['market_structure']
    
    def _ensure_initialized(self) -> None:
        """Ensure data manager is initialized."""
        if not self._initialized:
            raise RuntimeError("Data manager not initialized. Call initialize() first.")
    
    # Bulk operations
    async def save_trades_batch(self, trades: List[Trade]) -> List[str]:
        """Save multiple trades in batch operation."""
        return await self.trades.create_many(trades)
    
    async def save_orderbook_batch(self, orderbooks: List[OrderBook]) -> List[str]:
        """Save multiple orderbook snapshots in batch."""
        return await self.orderbook.create_many(orderbooks)
    
    async def save_klines_batch(self, klines: List[Kline]) -> List[str]:
        """Save multiple klines in batch."""
        return await self.klines.create_many(klines)
    
    # Complex queries spanning multiple collections
    async def get_market_overview(self,
                                 symbol: Symbol,
                                 exchange: Optional[Exchange] = None,
                                 hours_back: int = 24) -> Dict[str, Any]:
        """Get comprehensive market overview for a symbol."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours_back)
        
        # Get latest data from each collection
        latest_trades = await self.trades.find_by_symbol_and_time_range(
            symbol, start_time, end_time, exchange, limit=100
        )
        
        latest_orderbook = await self.orderbook.get_latest_by_symbol(
            symbol, exchange
        )
        
        latest_volume_profile = await self.volume_profiles.get_latest_profile(
            symbol, "1h", exchange
        )
        
        latest_order_flow = await self.order_flow.find_by_timeframe(
            symbol, "1h", start_time, end_time, exchange, limit=1
        )
        
        latest_market_structure = await self.market_structure.get_latest_analysis(
            symbol, "1h", exchange
        )
        
        # Calculate basic statistics
        volume_stats = await self.trades.get_volume_by_side(
            symbol, start_time, end_time, exchange
        )
        
        return {
            "symbol": symbol,
            "exchange": exchange,
            "period_hours": hours_back,
            "timestamp": datetime.utcnow(),
            "latest_trades_count": len(latest_trades),
            "latest_trade": latest_trades[0] if latest_trades else None,
            "latest_orderbook": latest_orderbook,
            "latest_volume_profile": latest_volume_profile,
            "latest_order_flow": latest_order_flow[0] if latest_order_flow else None,
            "latest_market_structure": latest_market_structure,
            "volume_statistics": volume_stats
        }
    
    async def get_trading_session_analysis(self,
                                          symbol: Symbol,
                                          session_start: datetime,
                                          session_end: datetime,
                                          exchange: Optional[Exchange] = None) -> Dict[str, Any]:
        """Get comprehensive analysis for a trading session."""
        
        # Get all trades in session
        session_trades = await self.trades.find_by_symbol_and_time_range(
            symbol, session_start, session_end, exchange, limit=10000
        )
        
        # Get volume profile for session
        volume_profiles = await self.volume_profiles.find_by_timeframe(
            symbol, "1h", session_start, session_end, exchange
        )
        
        # Get order flow data
        order_flow_data = await self.order_flow.find_by_timeframe(
            symbol, "5m", session_start, session_end, exchange, limit=1000
        )
        
        # Calculate session statistics
        if session_trades:
            session_high = max(float(trade.price) for trade in session_trades)
            session_low = min(float(trade.price) for trade in session_trades)
            session_open = float(session_trades[-1].price)  # Oldest trade
            session_close = float(session_trades[0].price)  # Newest trade
            total_volume = sum(float(trade.quantity) for trade in session_trades)
            
            # Calculate VWAP
            total_notional = sum(
                float(trade.price) * float(trade.quantity) 
                for trade in session_trades
            )
            vwap = total_notional / total_volume if total_volume > 0 else 0
        else:
            session_high = session_low = session_open = session_close = 0
            total_volume = vwap = 0
        
        # Aggregate order flow
        total_delta = sum(float(of.delta) for of in order_flow_data)
        avg_imbalance = (
            sum(float(of.imbalance_ratio) for of in order_flow_data) / len(order_flow_data)
            if order_flow_data else 0
        )
        
        return {
            "symbol": symbol,
            "exchange": exchange,
            "session_start": session_start,
            "session_end": session_end,
            "ohlc": {
                "open": session_open,
                "high": session_high,
                "low": session_low,
                "close": session_close
            },
            "volume": total_volume,
            "vwap": vwap,
            "trades_count": len(session_trades),
            "delta_total": total_delta,
            "avg_imbalance_ratio": avg_imbalance,
            "volume_profiles_count": len(volume_profiles),
            "order_flow_periods": len(order_flow_data)
        }
    
    async def find_liquidity_zones(self,
                                  symbol: Symbol,
                                  current_price: Decimal,
                                  price_range_percent: float = 5.0,
                                  exchange: Optional[Exchange] = None) -> Dict[str, List[LiquidityLevel]]:
        """Find liquidity zones around current price."""
        
        price_range = current_price * Decimal(str(price_range_percent / 100))
        min_price = current_price - price_range
        max_price = current_price + price_range
        
        # Get liquidity levels in range
        liquidity_levels = await self.liquidity_levels.find_by_price_range(
            symbol, min_price, max_price, exchange=exchange
        )
        
        # Get recent volume profile for POC/VAH/VAL
        recent_vp = await self.volume_profiles.get_latest_profile(
            symbol, "1h", exchange
        )
        
        # Categorize levels
        support_levels = []
        resistance_levels = []
        poc_levels = []
        
        for level in liquidity_levels:
            if level.liquidity_type in ["support", "val"]:
                support_levels.append(level)
            elif level.liquidity_type in ["resistance", "vah"]:
                resistance_levels.append(level)
            elif level.liquidity_type == "poc":
                poc_levels.append(level)
        
        # Sort by strength
        support_levels.sort(key=lambda x: x.strength, reverse=True)
        resistance_levels.sort(key=lambda x: x.strength, reverse=True)
        poc_levels.sort(key=lambda x: x.strength, reverse=True)
        
        return {
            "current_price": float(current_price),
            "price_range_percent": price_range_percent,
            "support_levels": support_levels[:10],  # Top 10
            "resistance_levels": resistance_levels[:10],  # Top 10
            "poc_levels": poc_levels[:5],  # Top 5
            "recent_volume_profile": recent_vp
        }
    
    async def get_symbols_activity_summary(self,
                                          hours_back: int = 24,
                                          exchange: Optional[Exchange] = None) -> List[Dict[str, Any]]:
        """Get activity summary for all symbols."""
        
        # Get all symbols from trades
        symbols = await self.trades.get_symbols(exchange)
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours_back)
        
        summaries = []
        
        for symbol in symbols[:20]:  # Limit to top 20 symbols
            try:
                # Get basic stats
                recent_trades = await self.trades.find_by_symbol_and_time_range(
                    Symbol(symbol), start_time, end_time, exchange, limit=1000
                )
                
                volume_stats = await self.trades.get_volume_by_side(
                    Symbol(symbol), start_time, end_time, exchange
                )
                
                # Get latest prices
                latest_trade = recent_trades[0] if recent_trades else None
                
                if latest_trade:
                    summaries.append({
                        "symbol": symbol,
                        "exchange": exchange,
                        "latest_price": float(latest_trade.price),
                        "latest_timestamp": latest_trade.timestamp,
                        "trades_count": len(recent_trades),
                        "total_volume": float(volume_stats.get("buy_volume", 0) + volume_stats.get("sell_volume", 0)),
                        "buy_sell_ratio": float(volume_stats.get("buy_volume", 0)) / max(float(volume_stats.get("sell_volume", 1)), 1)
                    })
                    
            except Exception as e:
                logger.warning(f"Failed to get summary for {symbol}: {str(e)}")
                continue
        
        # Sort by volume
        summaries.sort(key=lambda x: x["total_volume"], reverse=True)
        
        return summaries
    
    # Data maintenance operations
    async def cleanup_old_data(self, days_to_keep: int = 7) -> Dict[str, int]:
        """Clean up old data across all collections."""
        cleanup_results = {}
        
        try:
            # Clean trades (keep 1 day)
            trades_deleted = await self.trades.cleanup_old_data(1)
            cleanup_results["trades"] = trades_deleted
            
            # Clean orderbook (keep 1 day)
            orderbook_deleted = await self.orderbook.cleanup_old_data(1)
            cleanup_results["orderbook"] = orderbook_deleted
            
            # Clean klines (keep based on interval)
            klines_deleted = await self.klines.cleanup_old_data(days_to_keep)
            cleanup_results["klines"] = klines_deleted
            
            # Clean volume profiles (keep longer)
            vp_deleted = await self.volume_profiles.cleanup_old_data(days_to_keep * 2)
            cleanup_results["volume_profiles"] = vp_deleted
            
            # Clean order flow (keep standard period)
            of_deleted = await self.order_flow.cleanup_old_data(days_to_keep)
            cleanup_results["order_flow"] = of_deleted
            
            # Clean liquidity levels (keep longer)
            ll_deleted = await self.liquidity_levels.cleanup_old_data(days_to_keep * 4)
            cleanup_results["liquidity_levels"] = ll_deleted
            
            # Clean market structure (keep standard period)
            ms_deleted = await self.market_structure.cleanup_old_data(days_to_keep)
            cleanup_results["market_structure"] = ms_deleted
            
            logger.info("Data cleanup completed", results=cleanup_results)
            
        except Exception as e:
            logger.error("Failed to cleanup data", error=str(e))
            raise
        
        return cleanup_results
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get comprehensive database statistics."""
        try:
            # Get collection info
            collection_info = await MongoSchemas.get_collection_info(self.db_client.db)
            
            # Get overall database stats
            db_stats = await self.db_client.health_check()
            
            # Calculate totals
            total_documents = sum(
                info.get("document_count", 0) 
                for info in collection_info.values()
                if isinstance(info, dict)
            )
            
            total_size = sum(
                info.get("size_bytes", 0) 
                for info in collection_info.values()
                if isinstance(info, dict)
            )
            
            return {
                "database_status": db_stats,
                "collections": collection_info,
                "totals": {
                    "total_documents": total_documents,
                    "total_size_bytes": total_size,
                    "total_size_mb": round(total_size / (1024 * 1024), 2)
                },
                "timestamp": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error("Failed to get database stats", error=str(e))
            return {"error": str(e)}
    
    async def optimize_database(self) -> Dict[str, Any]:
        """Optimize database performance."""
        try:
            # Run optimization
            await MongoSchemas.optimize_collections(self.db_client.db)
            
            # Get updated stats
            stats = await self.get_database_stats()
            
            return {
                "optimization_completed": True,
                "timestamp": datetime.utcnow(),
                "stats": stats
            }
            
        except Exception as e:
            logger.error("Failed to optimize database", error=str(e))
            return {
                "optimization_completed": False,
                "error": str(e),
                "timestamp": datetime.utcnow()
            }
    
    async def close(self) -> None:
        """Close data manager and MongoDB connection."""
        try:
            await self.db_client.disconnect()
            self._initialized = False
            logger.info("Data manager closed")
            
        except Exception as e:
            logger.error("Failed to close data manager", error=str(e))
            raise
