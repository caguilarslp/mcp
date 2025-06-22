"""
Market Data Router
Endpoints for trade data, candles, and orderbook
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Path, WebSocket, WebSocketDisconnect
from pymongo import DESCENDING
import asyncio
import json

from src.api.routers.auth import verify_api_key
from src.api.models.market import (
    Trade, Candle, OrderBook, MarketStats, 
    SymbolInfo, MarketSummary
)
from src.api.models import TimeFrame, Exchange, PaginatedResponse
from src.storage.mongo_manager import MongoManager
from src.api.cache import cache_manager
from src.config import Config

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """WebSocket connection manager for real-time data"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.trade_subscribers: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from all subscriptions
        for symbol, subscribers in self.trade_subscribers.items():
            if websocket in subscribers:
                subscribers.remove(websocket)
        
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def subscribe_to_trades(self, websocket: WebSocket, symbol: str):
        """Subscribe websocket to trades for specific symbol"""
        if symbol not in self.trade_subscribers:
            self.trade_subscribers[symbol] = []
        if websocket not in self.trade_subscribers[symbol]:
            self.trade_subscribers[symbol].append(websocket)
        logger.info(f"WebSocket subscribed to {symbol} trades")
    
    async def broadcast_trade(self, trade_data: dict):
        """Broadcast trade to all subscribers of the symbol"""
        symbol = trade_data.get("symbol")
        if symbol in self.trade_subscribers:
            subscribers = self.trade_subscribers[symbol].copy()
            for websocket in subscribers:
                try:
                    await websocket.send_text(json.dumps({
                        "type": "trade",
                        "data": trade_data
                    }))
                except:
                    # Remove failed connection
                    if websocket in subscribers:
                        subscribers.remove(websocket)


# Global connection manager
manager = ConnectionManager()


@router.get("/trades/{symbol}", response_model=PaginatedResponse)
async def get_trades(
    symbol: str = Path(..., description="Trading symbol (e.g., BTCUSDT)"),
    exchange: Optional[Exchange] = Query(None, description="Filter by exchange"),
    start_time: Optional[datetime] = Query(None, description="Start time (ISO format)"),
    end_time: Optional[datetime] = Query(None, description="End time (ISO format)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(100, ge=1, le=1000, description="Items per page"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get historical trades with pagination
    """
    mongo = MongoManager()
    
    # Build query
    query = {"symbol": symbol.upper()}
    if exchange:
        query["exchange"] = exchange.value
    
    # Time filter
    if start_time or end_time:
        time_filter = {}
        if start_time:
            time_filter["$gte"] = start_time
        if end_time:
            time_filter["$lte"] = end_time
        query["timestamp"] = time_filter
    
    # Count total
    total = mongo.db.trades.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * per_page
    cursor = mongo.db.trades.find(query).sort("timestamp", DESCENDING).skip(skip).limit(per_page)
    
    trades = []
    for doc in cursor:
        trades.append(Trade(
            id=str(doc["_id"]),
            symbol=doc["symbol"],
            exchange=doc["exchange"],
            price=Decimal(str(doc["price"])),
            quantity=Decimal(str(doc["quantity"])),
            side=doc["side"],
            timestamp=doc["timestamp"]
        ))
    
    return PaginatedResponse(
        data=trades,
        page=page,
        per_page=per_page,
        total=total,
        pages=(total + per_page - 1) // per_page
    )


@router.get("/candles/{symbol}/{timeframe}", response_model=List[Candle])
async def get_candles(
    symbol: str = Path(..., description="Trading symbol"),
    timeframe: TimeFrame = Path(..., description="Candle timeframe"),
    exchange: Optional[Exchange] = Query(None, description="Filter by exchange"),
    start_time: Optional[datetime] = Query(None, description="Start time"),
    end_time: Optional[datetime] = Query(None, description="End time"),
    limit: int = Query(500, ge=1, le=1000, description="Number of candles"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get OHLCV candles aggregated from trades
    Enhanced aggregation with optimized MongoDB pipeline and caching
    """
    # Check cache first
    cache_key_params = {
        "exchange": exchange.value if exchange else None,
        "start_time": start_time.isoformat() if start_time else None,
        "end_time": end_time.isoformat() if end_time else None,
        "limit": limit
    }
    
    cached_data = await cache_manager.get_candles(
        symbol.upper(), timeframe.value, **cache_key_params
    )
    if cached_data:
        logger.info(f"Cache hit for candles {symbol}/{timeframe}")
        return [Candle(**candle) for candle in cached_data]
    
    mongo = MongoManager()
    
    # Convert timeframe to milliseconds for precise bucketing
    timeframe_ms = {
        "1m": 60 * 1000, "5m": 5 * 60 * 1000, "15m": 15 * 60 * 1000, 
        "30m": 30 * 60 * 1000, "1h": 60 * 60 * 1000, "4h": 4 * 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000, "1w": 7 * 24 * 60 * 60 * 1000
    }
    
    interval_ms = timeframe_ms.get(timeframe.value, 60 * 60 * 1000)
    
    # Default time range if not specified
    if not end_time:
        end_time = datetime.utcnow()
    if not start_time:
        start_time = end_time - timedelta(milliseconds=interval_ms * limit)
    
    # Build aggregation pipeline
    match_stage = {
        "symbol": symbol.upper(),
        "timestamp": {"$gte": start_time, "$lte": end_time}
    }
    if exchange:
        match_stage["exchange"] = exchange.value
    
    pipeline = [
        {"$match": match_stage},
        # Convert timestamp to bucket
        {
            "$addFields": {
                "bucket": {
                    "$subtract": [
                        {"$toLong": "$timestamp"},
                        {"$mod": [{"$toLong": "$timestamp"}, interval_ms]}
                    ]
                }
            }
        },
        # Sort to get proper first/last for open/close
        {"$sort": {"bucket": 1, "timestamp": 1}},
        # Group by bucket
        {
            "$group": {
                "_id": "$bucket",
                "open": {"$first": "$price"},
                "high": {"$max": "$price"},
                "low": {"$min": "$price"},
                "close": {"$last": "$price"},
                "volume": {"$sum": "$quantity"},
                "trades": {"$sum": 1},
                "buy_volume": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$side", "buy"]},
                            "$quantity",
                            0
                        ]
                    }
                },
                "sell_volume": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$side", "sell"]},
                            "$quantity",
                            0
                        ]
                    }
                }
            }
        },
        {"$sort": {"_id": 1}},
        {"$limit": limit}
    ]
    
    candles = []
    for doc in mongo.db.trades.aggregate(pipeline):
        timestamp = datetime.fromtimestamp(doc["_id"] / 1000)
        
        candles.append(Candle(
            timestamp=timestamp,
            open=Decimal(str(doc["open"])),
            high=Decimal(str(doc["high"])),
            low=Decimal(str(doc["low"])),
            close=Decimal(str(doc["close"])),
            volume=Decimal(str(doc["volume"])),
            trades=doc["trades"],
            buy_volume=Decimal(str(doc.get("buy_volume", 0))),
            sell_volume=Decimal(str(doc.get("sell_volume", 0)))
        ))
    
    # Cache the results (60 seconds TTL)
    candles_data = [candle.dict() for candle in candles]
    await cache_manager.set_candles(
        symbol.upper(), timeframe.value, candles_data, 
        ttl=60, **cache_key_params
    )
    
    return candles


@router.get("/orderbook/{symbol}", response_model=OrderBook)
async def get_orderbook(
    symbol: str = Path(..., description="Trading symbol"),
    exchange: Exchange = Query(..., description="Exchange"),
    depth: int = Query(20, ge=1, le=100, description="Number of levels"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get current orderbook snapshot with caching
    
    Note: For now, creates a simulated orderbook based on recent trades.
    Real orderbook data requires separate WebSocket collectors.
    """
    # Check cache first (short TTL for orderbook)
    cached_orderbook = await cache_manager.get_orderbook(
        symbol.upper(), exchange.value, depth=depth
    )
    if cached_orderbook:
        logger.info(f"Cache hit for orderbook {symbol}/{exchange.value}")
        return OrderBook(**cached_orderbook)
    
    mongo = MongoManager()
    
    # Get recent trades to simulate orderbook
    now = datetime.utcnow()
    recent_time = now - timedelta(minutes=5)
    
    query = {
        "symbol": symbol.upper(),
        "exchange": exchange.value,
        "timestamp": {"$gte": recent_time}
    }
    
    # Get recent price to center the orderbook
    recent_trades = list(mongo.db.trades.find(query).sort("timestamp", DESCENDING).limit(100))
    
    if not recent_trades:
        raise HTTPException(
            status_code=404,
            detail=f"No recent trades found for {symbol} on {exchange.value}"
        )
    
    # Calculate average recent price
    recent_price = sum(float(trade["price"]) for trade in recent_trades) / len(recent_trades)
    spread_pct = 0.001  # 0.1% spread
    
    # Generate simulated orderbook
    bids = []
    asks = []
    
    for i in range(depth):
        # Bids (below current price)
        bid_price = recent_price * (1 - spread_pct * (i + 1))
        bid_qty = 1.0 + (i * 0.5)  # Increasing quantity further from mid
        
        bids.append({
            "price": Decimal(str(round(bid_price, 2))),
            "quantity": Decimal(str(round(bid_qty, 4))),
            "count": 1
        })
        
        # Asks (above current price)
        ask_price = recent_price * (1 + spread_pct * (i + 1))
        ask_qty = 1.0 + (i * 0.5)
        
        asks.append({
            "price": Decimal(str(round(ask_price, 2))),
            "quantity": Decimal(str(round(ask_qty, 4))),
            "count": 1
        })
    
    # Sort properly
    bids.sort(key=lambda x: x["price"], reverse=True)  # Highest bid first
    asks.sort(key=lambda x: x["price"])  # Lowest ask first
    
    best_bid = bids[0]["price"] if bids else Decimal("0")
    best_ask = asks[0]["price"] if asks else Decimal("0")
    
    orderbook_data = OrderBook(
        symbol=symbol.upper(),
        exchange=exchange.value,
        timestamp=now,
        bids=bids,
        asks=asks,
        spread=best_ask - best_bid if best_bid and best_ask else None,
        mid_price=(best_bid + best_ask) / 2 if best_bid and best_ask else None
    )
    
    # Cache orderbook (10 seconds TTL)
    await cache_manager.set_orderbook(
        symbol.upper(), exchange.value, orderbook_data.dict(),
        ttl=10, depth=depth
    )
    
    return orderbook_data


@router.get("/symbols", response_model=List[SymbolInfo])
async def get_symbols(
    category: Optional[str] = Query(None, description="Filter by category"),
    active: Optional[bool] = Query(True, description="Filter by active status"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get list of tracked symbols
    """
    config = Config()
    symbols = []
    
    # Get symbols from config
    categories = {
        "reference": config.REFERENCE_SYMBOLS,
        "iso20022": config.ISO20022_SYMBOLS,
        "rwa": config.RWA_SYMBOLS,
        "ai": config.AI_SYMBOLS
    }
    
    for cat, symbol_list in categories.items():
        if category and cat != category.lower():
            continue
        
        for sym in symbol_list:
            symbols.append(SymbolInfo(
                symbol=f"{sym}USDT",
                exchanges=["bybit", "binance", "coinbase", "kraken"],
                category=cat,
                active=active if active is not None else True
            ))
    
    return symbols


@router.get("/stats/{symbol}", response_model=MarketStats)
async def get_market_stats(
    symbol: str = Path(..., description="Trading symbol"),
    timeframe: TimeFrame = Query(TimeFrame.D1, description="Stats timeframe"),
    exchange: Optional[Exchange] = Query(None, description="Filter by exchange"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get market statistics for a symbol
    """
    mongo = MongoManager()
    
    # Calculate time range
    now = datetime.utcnow()
    timeframe_hours = {
        "1h": 1, "4h": 4, "1d": 24, "1w": 168
    }
    hours = timeframe_hours.get(timeframe.value, 24)
    start_time = now - timedelta(hours=hours)
    
    # Build query
    query = {
        "symbol": symbol.upper(),
        "timestamp": {"$gte": start_time, "$lte": now}
    }
    if exchange:
        query["exchange"] = exchange.value
    
    # Aggregate stats
    pipeline = [
        {"$match": query},
        {"$sort": {"timestamp": 1}},  # Sort for proper first/last
        {
            "$group": {
                "_id": None,
                "open": {"$first": "$price"},
                "high": {"$max": "$price"},
                "low": {"$min": "$price"},
                "close": {"$last": "$price"},
                "volume": {"$sum": "$quantity"},
                "trades": {"$sum": 1},
                "vwap_sum": {
                    "$sum": {
                        "$multiply": ["$price", "$quantity"]
                    }
                }
            }
        }
    ]
    
    result = list(mongo.db.trades.aggregate(pipeline))
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for {symbol}"
        )
    
    stats = result[0]
    volume = float(stats["volume"]) if stats["volume"] else 0
    vwap = Decimal(str(stats["vwap_sum"] / volume)) if volume > 0 else None
    
    stats_data = MarketStats(
        symbol=symbol.upper(),
        exchange=exchange.value if exchange else "all",
        timeframe=timeframe,
        start_time=start_time,
        end_time=now,
        open=Decimal(str(stats["open"])),
        high=Decimal(str(stats["high"])),
        low=Decimal(str(stats["low"])),
        close=Decimal(str(stats["close"])),
        volume=Decimal(str(stats["volume"])),
        trades=stats["trades"],
        vwap=vwap
    )
    
    # Cache the results (30 seconds TTL)
    await cache_manager.set_market_stats(
        symbol.upper(), timeframe.value, stats_data.dict(),
        ttl=30, exchange=exchange.value if exchange else None
    )
    
    return stats_data


@router.get("/stats/multi", response_model=Dict[str, MarketStats])
async def get_multi_symbol_stats(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    timeframe: TimeFrame = Query(TimeFrame.D1, description="Stats timeframe"),
    exchange: Optional[Exchange] = Query(None, description="Filter by exchange"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get market statistics for multiple symbols
    Enhanced for efficient multi-symbol queries
    """
    mongo = MongoManager()
    
    # Parse symbols
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if len(symbol_list) > 20:  # Limit to prevent abuse
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 symbols allowed per request"
        )
    
    # Calculate time range
    now = datetime.utcnow()
    timeframe_hours = {
        "1h": 1, "4h": 4, "1d": 24, "1w": 168
    }
    hours = timeframe_hours.get(timeframe.value, 24)
    start_time = now - timedelta(hours=hours)
    
    # Build query
    query = {
        "symbol": {"$in": symbol_list},
        "timestamp": {"$gte": start_time, "$lte": now}
    }
    if exchange:
        query["exchange"] = exchange.value
    
    # Aggregate stats for all symbols at once
    pipeline = [
        {"$match": query},
        {"$sort": {"symbol": 1, "timestamp": 1}},
        {
            "$group": {
                "_id": "$symbol",
                "open": {"$first": "$price"},
                "high": {"$max": "$price"},
                "low": {"$min": "$price"},
                "close": {"$last": "$price"},
                "volume": {"$sum": "$quantity"},
                "trades": {"$sum": 1},
                "vwap_sum": {
                    "$sum": {
                        "$multiply": ["$price", "$quantity"]
                    }
                }
            }
        }
    ]
    
    results = {}
    for doc in mongo.db.trades.aggregate(pipeline):
        symbol = doc["_id"]
        volume = float(doc["volume"]) if doc["volume"] else 0
        vwap = Decimal(str(doc["vwap_sum"] / volume)) if volume > 0 else None
        
        results[symbol] = MarketStats(
            symbol=symbol,
            exchange=exchange.value if exchange else "all",
            timeframe=timeframe,
            start_time=start_time,
            end_time=now,
            open=Decimal(str(doc["open"])),
            high=Decimal(str(doc["high"])),
            low=Decimal(str(doc["low"])),
            close=Decimal(str(doc["close"])),
            volume=Decimal(str(doc["volume"])),
            trades=doc["trades"],
            vwap=vwap
        )
    
    # Add empty results for symbols with no data
    for symbol in symbol_list:
        if symbol not in results:
            results[symbol] = None
    
    return results


@router.get("/summary", response_model=MarketSummary)
async def get_market_summary(api_key: str = Depends(verify_api_key)):
    """
    Get overall market summary across all symbols and exchanges
    """
    mongo = MongoManager()
    now = datetime.utcnow()
    start_time = now - timedelta(hours=24)
    
    # Get summary stats
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_time}}},
        {
            "$group": {
                "_id": "$exchange",
                "trades": {"$sum": 1},
                "volume": {"$sum": "$quantity"},
                "symbols": {"$addToSet": "$symbol"}
            }
        }
    ]
    
    exchange_stats = {}
    total_trades = 0
    total_volume = Decimal("0")
    all_symbols = set()
    
    for doc in mongo.db.trades.aggregate(pipeline):
        exchange_stats[doc["_id"]] = {
            "trades": doc["trades"],
            "volume": float(doc["volume"]),
            "active_symbols": len(doc["symbols"])
        }
        total_trades += doc["trades"]
        total_volume += Decimal(str(doc["volume"]))
        all_symbols.update(doc["symbols"])
    
    return MarketSummary(
        timestamp=now,
        total_trades=total_trades,
        total_volume=total_volume,
        active_symbols=len(all_symbols),
        exchanges=exchange_stats
    )


@router.websocket("/ws/trades")
async def websocket_trades_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time trade streaming
    
    Clients can subscribe to specific symbols by sending:
    {"action": "subscribe", "symbol": "BTCUSDT"}
    {"action": "unsubscribe", "symbol": "BTCUSDT"}
    """
    await manager.connect(websocket)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                action = message.get("action")
                symbol = message.get("symbol", "").upper()
                
                if action == "subscribe" and symbol:
                    await manager.subscribe_to_trades(websocket, symbol)
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "message": f"Subscribed to {symbol} trades"
                    }))
                elif action == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                else:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Invalid action or missing symbol"
                    }))
                    
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
