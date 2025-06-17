"""
Specific repositories for WADM data types.

This module contains specialized repository classes for different types
of market data with domain-specific query methods.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal

import structlog
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from .repository import SymbolExchangeRepository, TimestampedRepository
from ...core.entities import (
    Trade, OrderBook, Kline, VolumeProfile, OrderFlow, 
    LiquidityLevel, MarketStructure
)
from ...core.types import Symbol, Exchange, Side, TimeFrame

logger = structlog.get_logger()


class TradeRepository(SymbolExchangeRepository[Trade]):
    """Repository for trade data with trade-specific queries."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "trades", Trade)
    
    async def find_by_price_range(self,
                                 symbol: Symbol,
                                 min_price: Decimal,
                                 max_price: Decimal,
                                 exchange: Optional[Exchange] = None,
                                 start_time: Optional[datetime] = None,
                                 end_time: Optional[datetime] = None,
                                 limit: int = 1000) -> List[Trade]:
        """Find trades within a price range."""
        filter_dict = {
            "symbol": symbol,
            "price": {
                "$gte": float(min_price),
                "$lte": float(max_price)
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        if start_time and end_time:
            filter_dict["timestamp"] = {
                "$gte": start_time,
                "$lte": end_time
            }
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("timestamp", DESCENDING)]
        )
    
    async def find_large_trades(self,
                               symbol: Symbol,
                               min_quantity: Decimal,
                               exchange: Optional[Exchange] = None,
                               hours_back: int = 24,
                               limit: int = 100) -> List[Trade]:
        """Find large trades above specified quantity."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours_back)
        
        filter_dict = {
            "symbol": symbol,
            "quantity": {"$gte": float(min_quantity)},
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("quantity", DESCENDING), ("timestamp", DESCENDING)]
        )
    
    async def get_trades_in_range(self,
                                 symbol: Symbol,
                                 exchange: Exchange,
                                 start_time: datetime,
                                 end_time: datetime,
                                 limit: int = 10000) -> List[Trade]:
        """Get trades in a specific time range."""
        filter_dict = {
            "symbol": symbol,
            "exchange": exchange,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("timestamp", ASCENDING)]
        )
    
    async def get_volume_by_side(self,
                                symbol: Symbol,
                                start_time: datetime,
                                end_time: datetime,
                                exchange: Optional[Exchange] = None) -> Dict[str, Decimal]:
        """Get buy/sell volume breakdown for a time period."""
        filter_dict = {
            "symbol": symbol,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        pipeline = [
            {"$match": filter_dict},
            {"$group": {
                "_id": "$side",
                "total_volume": {"$sum": "$quantity"},
                "total_trades": {"$sum": 1},
                "avg_size": {"$avg": "$quantity"}
            }}
        ]
        
        result = await self.aggregate(pipeline)
        
        # Convert to more readable format
        volume_data = {
            "buy_volume": Decimal("0"),
            "sell_volume": Decimal("0"),
            "buy_trades": 0,
            "sell_trades": 0,
            "avg_buy_size": Decimal("0"),
            "avg_sell_size": Decimal("0")
        }
        
        for doc in result:
            side = doc["_id"]
            if side == "buy":
                volume_data["buy_volume"] = Decimal(str(doc["total_volume"]))
                volume_data["buy_trades"] = doc["total_trades"]
                volume_data["avg_buy_size"] = Decimal(str(doc["avg_size"]))
            else:
                volume_data["sell_volume"] = Decimal(str(doc["total_volume"]))
                volume_data["sell_trades"] = doc["total_trades"]
                volume_data["avg_sell_size"] = Decimal(str(doc["avg_size"]))
        
        return volume_data
    
    async def get_price_volume_distribution(self,
                                           symbol: Symbol,
                                           start_time: datetime,
                                           end_time: datetime,
                                           price_bucket_size: Decimal = Decimal("1.0"),
                                           exchange: Optional[Exchange] = None) -> Dict[str, Decimal]:
        """Get volume distribution across price levels."""
        filter_dict = {
            "symbol": symbol,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        pipeline = [
            {"$match": filter_dict},
            {"$addFields": {
                "price_bucket": {
                    "$multiply": [
                        {"$floor": {"$divide": ["$price", float(price_bucket_size)]}},
                        float(price_bucket_size)
                    ]
                }
            }},
            {"$group": {
                "_id": "$price_bucket",
                "volume": {"$sum": "$quantity"},
                "trade_count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        result = await self.aggregate(pipeline)
        
        return {
            str(Decimal(str(doc["_id"]))): Decimal(str(doc["volume"]))
            for doc in result
        }


class OrderBookRepository(SymbolExchangeRepository[OrderBook]):
    """Repository for orderbook data with orderbook-specific queries."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "orderbook", OrderBook)
    
    async def get_latest_by_symbol(self,
                                  symbol: Symbol,
                                  exchange: Optional[Exchange] = None) -> Optional[OrderBook]:
        """Get the most recent orderbook for a symbol."""
        filter_dict = {"symbol": symbol}
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        result = await self.find_many(
            filter_dict,
            limit=1,
            sort=[("timestamp", DESCENDING)]
        )
        
        return result[0] if result else None
    
    async def get_closest_orderbook(self,
                                   symbol: Symbol,
                                   exchange: Exchange,
                                   timestamp: datetime,
                                   max_time_diff: timedelta = timedelta(seconds=5)) -> Optional[OrderBook]:
        """Get orderbook closest to given timestamp."""
        filter_dict = {
            "symbol": symbol,
            "exchange": exchange,
            "timestamp": {
                "$gte": timestamp - max_time_diff,
                "$lte": timestamp + max_time_diff
            }
        }
        
        # Find the closest one
        pipeline = [
            {"$match": filter_dict},
            {"$addFields": {
                "time_diff": {"$abs": {"$subtract": ["$timestamp", timestamp]}}
            }},
            {"$sort": {"time_diff": 1}},
            {"$limit": 1}
        ]
        
        result = await self.aggregate(pipeline)
        if result:
            return OrderBook(**result[0])
        return None
    
    async def get_best_prices_history(self,
                                     symbol: Symbol,
                                     start_time: datetime,
                                     end_time: datetime,
                                     exchange: Optional[Exchange] = None,
                                     limit: int = 1000) -> List[Dict[str, Any]]:
        """Get history of best bid/ask prices."""
        filter_dict = {
            "symbol": symbol,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        pipeline = [
            {"$match": filter_dict},
            {"$project": {
                "timestamp": 1,
                "best_bid": {"$arrayElemAt": ["$bids.price", 0]},
                "best_ask": {"$arrayElemAt": ["$asks.price", 0]},
                "bid_quantity": {"$arrayElemAt": ["$bids.quantity", 0]},
                "ask_quantity": {"$arrayElemAt": ["$asks.quantity", 0]}
            }},
            {"$sort": {"timestamp": 1}},
            {"$limit": limit}
        ]
        
        return await self.aggregate(pipeline)
    
    async def get_depth_at_price(self,
                                symbol: Symbol,
                                target_price: Decimal,
                                exchange: Optional[Exchange] = None,
                                latest_only: bool = True) -> Dict[str, Any]:
        """Get orderbook depth at specific price level."""
        filter_dict = {"symbol": symbol}
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        if latest_only:
            orderbook = await self.get_latest_by_symbol(symbol, exchange)
            if not orderbook:
                return {"error": "No orderbook data found"}
            
            # Find quantity at target price
            target_price_float = float(target_price)
            
            bid_quantity = Decimal("0")
            ask_quantity = Decimal("0")
            
            # Check bids
            for level in orderbook.bids:
                if float(level.price) == target_price_float:
                    bid_quantity = level.quantity
                    break
            
            # Check asks
            for level in orderbook.asks:
                if float(level.price) == target_price_float:
                    ask_quantity = level.quantity
                    break
            
            return {
                "timestamp": orderbook.timestamp,
                "price": target_price,
                "bid_quantity": bid_quantity,
                "ask_quantity": ask_quantity,
                "total_quantity": bid_quantity + ask_quantity
            }
        
        return {"error": "Historical depth analysis not implemented"}


class KlineRepository(SymbolExchangeRepository[Kline]):
    """Repository for kline/candlestick data."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "klines", Kline)
    
    async def find_by_interval(self,
                              symbol: Symbol,
                              interval: str,
                              start_time: datetime,
                              end_time: datetime,
                              exchange: Optional[Exchange] = None,
                              limit: int = 1000) -> List[Kline]:
        """Find klines by specific interval."""
        filter_dict = {
            "symbol": symbol,
            "interval": interval,
            "open_time": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("open_time", ASCENDING)]
        )
    
    async def get_ohlcv_data(self,
                            symbol: Symbol,
                            interval: str,
                            start_time: datetime,
                            end_time: datetime,
                            exchange: Optional[Exchange] = None) -> List[Dict[str, Any]]:
        """Get OHLCV data in simplified format."""
        klines = await self.find_by_interval(
            symbol, interval, start_time, end_time, exchange
        )
        
        return [
            {
                "timestamp": kline.open_time,
                "open": float(kline.open_price),
                "high": float(kline.high_price),
                "low": float(kline.low_price),
                "close": float(kline.close_price),
                "volume": float(kline.volume)
            }
            for kline in klines
        ]


class VolumeProfileRepository(SymbolExchangeRepository[VolumeProfile]):
    """Repository for volume profile data."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "volume_profiles", VolumeProfile)
    
    async def find_by_timeframe(self,
                               symbol: Symbol,
                               timeframe: str,
                               start_time: datetime,
                               end_time: datetime,
                               exchange: Optional[Exchange] = None,
                               limit: int = 100) -> List[VolumeProfile]:
        """Find volume profiles by timeframe."""
        filter_dict = {
            "symbol": symbol,
            "timeframe": timeframe,
            "start_time": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("start_time", DESCENDING)]
        )
    
    async def get_latest_profile(self,
                                symbol: Symbol,
                                timeframe: str = "1h",
                                exchange: Optional[Exchange] = None) -> Optional[VolumeProfile]:
        """Get the most recent volume profile."""
        filter_dict = {
            "symbol": symbol,
            "timeframe": timeframe
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        result = await self.find_many(
            filter_dict,
            limit=1,
            sort=[("start_time", DESCENDING)]
        )
        
        return result[0] if result else None
    
    async def get_poc_history(self,
                             symbol: Symbol,
                             days_back: int = 7,
                             exchange: Optional[Exchange] = None) -> List[Dict[str, Any]]:
        """Get Point of Control price history."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days_back)
        
        filter_dict = {
            "symbol": symbol,
            "start_time": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        pipeline = [
            {"$match": filter_dict},
            {"$project": {
                "start_time": 1,
                "poc_price": 1,
                "total_volume": 1,
                "timeframe": 1
            }},
            {"$sort": {"start_time": 1}}
        ]
        
        return await self.aggregate(pipeline)


class OrderFlowRepository(SymbolExchangeRepository[OrderFlow]):
    """Repository for order flow data."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "order_flow", OrderFlow)
    
    async def find_by_timeframe(self,
                               symbol: Symbol,
                               timeframe: str,
                               start_time: datetime,
                               end_time: datetime,
                               exchange: Optional[Exchange] = None,
                               limit: int = 1000) -> List[OrderFlow]:
        """Find order flow data by timeframe."""
        filter_dict = {
            "symbol": symbol,
            "timeframe": timeframe,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("timestamp", DESCENDING)]
        )
    
    async def get_delta_analysis(self,
                                symbol: Symbol,
                                hours_back: int = 24,
                                exchange: Optional[Exchange] = None) -> Dict[str, Any]:
        """Get delta analysis for the specified period."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours_back)
        
        filter_dict = {
            "symbol": symbol,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        pipeline = [
            {"$match": filter_dict},
            {"$group": {
                "_id": None,
                "total_delta": {"$sum": "$delta"},
                "avg_delta": {"$avg": "$delta"},
                "max_delta": {"$max": "$delta"},
                "min_delta": {"$min": "$delta"},
                "total_buy_volume": {"$sum": "$buy_volume"},
                "total_sell_volume": {"$sum": "$sell_volume"},
                "avg_imbalance": {"$avg": "$imbalance_ratio"},
                "total_large_trades": {"$sum": "$large_trades_count"},
                "total_absorption_events": {"$sum": "$absorption_events"}
            }}
        ]
        
        result = await self.aggregate(pipeline)
        
        if result:
            data = result[0]
            return {
                "period_hours": hours_back,
                "total_delta": Decimal(str(data.get("total_delta", 0))),
                "avg_delta": Decimal(str(data.get("avg_delta", 0))),
                "max_delta": Decimal(str(data.get("max_delta", 0))),
                "min_delta": Decimal(str(data.get("min_delta", 0))),
                "total_buy_volume": Decimal(str(data.get("total_buy_volume", 0))),
                "total_sell_volume": Decimal(str(data.get("total_sell_volume", 0))),
                "avg_imbalance": Decimal(str(data.get("avg_imbalance", 0))),
                "large_trades_count": data.get("total_large_trades", 0),
                "absorption_events": data.get("total_absorption_events", 0)
            }
        
        return {}
    
    async def get_cumulative_delta_trend(self,
                                        symbol: Symbol,
                                        hours_back: int = 24,
                                        exchange: Optional[Exchange] = None,
                                        limit: int = 100) -> List[Dict[str, Any]]:
        """Get cumulative delta trend over time."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours_back)
        
        filter_dict = {
            "symbol": symbol,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        pipeline = [
            {"$match": filter_dict},
            {"$sort": {"timestamp": 1}},
            {"$project": {
                "timestamp": 1,
                "cumulative_delta": 1,
                "delta": 1,
                "imbalance_ratio": 1
            }},
            {"$limit": limit}
        ]
        
        return await self.aggregate(pipeline)


class LiquidityLevelRepository(SymbolExchangeRepository[LiquidityLevel]):
    """Repository for liquidity level data."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "liquidity_levels", LiquidityLevel)
    
    async def find_by_price_range(self,
                                 symbol: Symbol,
                                 min_price: Decimal,
                                 max_price: Decimal,
                                 min_strength: Decimal = Decimal("50"),
                                 exchange: Optional[Exchange] = None) -> List[LiquidityLevel]:
        """Find liquidity levels within price range."""
        filter_dict = {
            "symbol": symbol,
            "price": {
                "$gte": float(min_price),
                "$lte": float(max_price)
            },
            "strength": {"$gte": float(min_strength)}
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        return await self.find_many(
            filter_dict,
            sort=[("strength", DESCENDING), ("price", ASCENDING)]
        )
    
    async def get_strongest_levels(self,
                                  symbol: Symbol,
                                  limit: int = 10,
                                  exchange: Optional[Exchange] = None) -> List[LiquidityLevel]:
        """Get strongest liquidity levels."""
        filter_dict = {"symbol": symbol}
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("strength", DESCENDING)]
        )


class MarketStructureRepository(SymbolExchangeRepository[MarketStructure]):
    """Repository for market structure data."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "market_structure", MarketStructure)
    
    async def get_latest_analysis(self,
                                 symbol: Symbol,
                                 timeframe: str = "1h",
                                 exchange: Optional[Exchange] = None) -> Optional[MarketStructure]:
        """Get the most recent market structure analysis."""
        filter_dict = {
            "symbol": symbol,
            "timeframe": timeframe
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        result = await self.find_many(
            filter_dict,
            limit=1,
            sort=[("timestamp", DESCENDING)]
        )
        
        return result[0] if result else None
    
    async def get_trend_history(self,
                               symbol: Symbol,
                               days_back: int = 7,
                               timeframe: str = "1h",
                               exchange: Optional[Exchange] = None) -> List[Dict[str, Any]]:
        """Get trend history over time."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days_back)
        
        filter_dict = {
            "symbol": symbol,
            "timeframe": timeframe,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        pipeline = [
            {"$match": filter_dict},
            {"$project": {
                "timestamp": 1,
                "trend": 1,
                "structure_breaks": 1
            }},
            {"$sort": {"timestamp": 1}}
        ]
        
        return await self.aggregate(pipeline)


# Factory functions for dependency injection
def get_trade_repository() -> TradeRepository:
    """Get trade repository instance."""
    from src.presentation.api.main import app
    return TradeRepository(app.state.mongodb.db)


def get_orderbook_repository() -> OrderBookRepository:
    """Get orderbook repository instance."""
    from src.presentation.api.main import app
    return OrderBookRepository(app.state.mongodb.db)


def get_kline_repository() -> KlineRepository:
    """Get kline repository instance."""
    from src.presentation.api.main import app
    return KlineRepository(app.state.mongodb.db)


def get_volume_profile_repository() -> VolumeProfileRepository:
    """Get volume profile repository instance."""
    from src.presentation.api.main import app
    return VolumeProfileRepository(app.state.mongodb.db)


def get_order_flow_repository() -> OrderFlowRepository:
    """Get order flow repository instance."""
    from src.presentation.api.main import app
    return OrderFlowRepository(app.state.mongodb.db)


def get_liquidity_level_repository() -> LiquidityLevelRepository:
    """Get liquidity level repository instance."""
    from src.presentation.api.main import app
    return LiquidityLevelRepository(app.state.mongodb.db)


def get_market_structure_repository() -> MarketStructureRepository:
    """Get market structure repository instance."""
    from src.presentation.api.main import app
    return MarketStructureRepository(app.state.mongodb.db)
