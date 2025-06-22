"""
Market Data Router
Endpoints for trade data, candles, and orderbook
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from pymongo import DESCENDING

from src.api.routers.auth import verify_api_key
from src.api.models.market import (
    Trade, Candle, OrderBook, MarketStats, 
    SymbolInfo, MarketSummary
)
from src.api.models import TimeFrame, Exchange, PaginatedResponse
from src.storage.mongo_manager import MongoManager
from src.config import Config

logger = logging.getLogger(__name__)
router = APIRouter()


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
    """
    mongo = MongoManager()
    
    # For now, aggregate from trades
    # TODO: Use pre-aggregated data once TASK-022 is complete
    
    # Convert timeframe to seconds
    timeframe_seconds = {
        "1m": 60, "5m": 300, "15m": 900, "30m": 1800,
        "1h": 3600, "4h": 14400, "1d": 86400, "1w": 604800
    }
    
    interval = timeframe_seconds.get(timeframe.value, 3600)
    
    # Default time range if not specified
    if not end_time:
        end_time = datetime.utcnow()
    if not start_time:
        start_time = end_time - timedelta(seconds=interval * limit)
    
    # Build aggregation pipeline
    match_stage = {
        "symbol": symbol.upper(),
        "timestamp": {"$gte": start_time, "$lte": end_time}
    }
    if exchange:
        match_stage["exchange"] = exchange.value
    
    pipeline = [
        {"$match": match_stage},
        {
            "$group": {
                "_id": {
                    "$subtract": [
                        {"$toLong": "$timestamp"},
                        {"$mod": [{"$toLong": "$timestamp"}, interval * 1000]}
                    ]
                },
                "open": {"$first": "$price"},
                "high": {"$max": "$price"},
                "low": {"$min": "$price"},
                "close": {"$last": "$price"},
                "volume": {"$sum": "$quantity"},
                "trades": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}},
        {"$limit": limit}
    ]
    
    candles = []
    for doc in mongo.db.trades.aggregate(pipeline):
        candles.append(Candle(
            timestamp=datetime.fromtimestamp(doc["_id"] / 1000),
            open=Decimal(str(doc["open"])),
            high=Decimal(str(doc["high"])),
            low=Decimal(str(doc["low"])),
            close=Decimal(str(doc["close"])),
            volume=Decimal(str(doc["volume"])),
            trades=doc["trades"]
        ))
    
    return candles


@router.get("/orderbook/{symbol}", response_model=OrderBook)
async def get_orderbook(
    symbol: str = Path(..., description="Trading symbol"),
    exchange: Exchange = Query(..., description="Exchange"),
    depth: int = Query(20, ge=1, le=100, description="Number of levels"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get current orderbook snapshot
    
    Note: This is a placeholder. Real orderbook data requires
    separate WebSocket collectors for orderbook updates.
    """
    # TODO: Implement orderbook collection
    raise HTTPException(
        status_code=501,
        detail="Orderbook data collection not implemented yet"
    )


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
                active=active
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
        {
            "$group": {
                "_id": None,
                "open": {"$first": "$price"},
                "high": {"$max": "$price"},
                "low": {"$min": "$price"},
                "close": {"$last": "$price"},
                "volume": {"$sum": "$quantity"},
                "trades": {"$sum": 1},
                "vwap": {
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
    vwap = Decimal(str(stats["vwap"] / float(stats["volume"]))) if stats["volume"] > 0 else None
    
    return MarketStats(
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
