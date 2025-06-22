"""
WADM Indicators API Router
Endpoints for technical indicators and Smart Money Concepts
"""

from datetime import datetime, timedelta
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import JSONResponse

from ..models.indicators import (
    VolumeProfileResponse,
    OrderFlowResponse,
    SMCAnalysisResponse,
    SMCSignalsResponse,
    IndicatorStatus
)
from ..routers.auth import verify_api_key
from ..cache import cache_manager
from ...storage.mongo_manager import MongoManager
from ...config import Config
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/indicators",
    tags=["indicators"],
    dependencies=[Depends(verify_api_key)]
)

# Initialize storage
storage = MongoManager()

@router.get("/status", response_model=IndicatorStatus)
async def get_indicators_status():
    """Get status of all indicators system"""
    try:
        # Check available symbols
        symbols = list(Config.SYMBOLS.keys())
        
        # Check last calculation times
        last_volume_profile = await storage.get_latest_volume_profile("BTCUSDT")
        last_order_flow = await storage.get_latest_order_flow("BTCUSDT")
        
        # Get SMC analysis count
        smc_count = await storage.db.smc_analyses.count_documents({})
        
        return IndicatorStatus(
            available_symbols=symbols,
            last_volume_profile_update=last_volume_profile.timestamp if last_volume_profile else None,
            last_order_flow_update=last_order_flow.timestamp if last_order_flow else None,
            smc_analyses_count=smc_count,
            cache_enabled=cache_manager.redis_available,
            status="operational"
        )
    except Exception as e:
        logger.error(f"Error getting indicators status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")


@router.get("/volume-profile/{symbol}", response_model=VolumeProfileResponse)
async def get_volume_profile(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe for analysis"),
    start_time: Optional[datetime] = Query(None, description="Start time for historical data"),
    end_time: Optional[datetime] = Query(None, description="End time for historical data"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records")
):
    """Get Volume Profile data for a symbol"""
    
    # Validate symbol
    if symbol not in Config.SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    # Check cache first
    cache_key = f"volume_profile:{symbol}:{timeframe}:{start_time}:{end_time}:{limit}"
    cached_data = await cache_manager.get_cached_response(cache_key)
    if cached_data:
        return JSONResponse(content=cached_data)
    
    try:
        # Set default time range if not provided
        if not end_time:
            end_time = datetime.utcnow()
        if not start_time:
            start_time = end_time - timedelta(hours=24)
        
        # Get volume profile data from storage
        volume_profiles = await storage.get_volume_profiles(
            symbol=symbol,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
        
        if not volume_profiles:
            raise HTTPException(status_code=404, detail=f"No volume profile data found for {symbol}")
        
        # Get the latest volume profile for response
        latest_vp = volume_profiles[0]
        
        response_data = VolumeProfileResponse(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=latest_vp.timestamp,
            poc=latest_vp.poc,
            vah=latest_vp.vah,
            val=latest_vp.val,
            total_volume=latest_vp.total_volume,
            volume_nodes=latest_vp.volume_nodes,
            session_data={
                "session_count": len(volume_profiles),
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                }
            },
            metadata={
                "data_points": len(volume_profiles),
                "latest_update": latest_vp.timestamp.isoformat(),
                "calculation_method": "trade_based"
            }
        )
        
        # Cache the response
        await cache_manager.cache_response(cache_key, response_data.dict(), ttl=120)
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error getting volume profile for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving volume profile: {str(e)}")


@router.get("/order-flow/{symbol}", response_model=OrderFlowResponse)
async def get_order_flow(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe for analysis"),
    start_time: Optional[datetime] = Query(None, description="Start time for historical data"),
    end_time: Optional[datetime] = Query(None, description="End time for historical data"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records")
):
    """Get Order Flow data for a symbol"""
    
    # Validate symbol
    if symbol not in Config.SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    # Check cache first
    cache_key = f"order_flow:{symbol}:{timeframe}:{start_time}:{end_time}:{limit}"
    cached_data = await cache_manager.get_cached_response(cache_key)
    if cached_data:
        return JSONResponse(content=cached_data)
    
    try:
        # Set default time range if not provided
        if not end_time:
            end_time = datetime.utcnow()
        if not start_time:
            start_time = end_time - timedelta(hours=24)
        
        # Get order flow data from storage
        order_flows = await storage.get_order_flows(
            symbol=symbol,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
        
        if not order_flows:
            raise HTTPException(status_code=404, detail=f"No order flow data found for {symbol}")
        
        # Get the latest order flow for response
        latest_of = order_flows[0]
        
        response_data = OrderFlowResponse(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=latest_of.timestamp,
            delta=latest_of.delta,
            cumulative_delta=latest_of.cumulative_delta,
            buy_volume=latest_of.buy_volume,
            sell_volume=latest_of.sell_volume,
            absorption_events=latest_of.absorption_events or [],
            momentum_score=getattr(latest_of, 'momentum_score', 0.0),
            metadata={
                "data_points": len(order_flows),
                "latest_update": latest_of.timestamp.isoformat(),
                "calculation_method": "trade_based",
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                }
            }
        )
        
        # Cache the response
        await cache_manager.cache_response(cache_key, response_data.dict(), ttl=120)
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error getting order flow for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving order flow: {str(e)}")


# Placeholder endpoints for SMC (will be implemented in Phase 3)
@router.get("/smc/{symbol}/analysis")
async def get_smc_analysis_placeholder(symbol: str):
    """SMC Analysis endpoint - Phase 3 implementation"""
    return {"message": "SMC Analysis endpoint - Coming in Phase 3", "symbol": symbol}


@router.get("/smc/{symbol}/signals")
async def get_smc_signals_placeholder(symbol: str):
    """SMC Signals endpoint - Phase 3 implementation"""
    return {"message": "SMC Signals endpoint - Coming in Phase 3", "symbol": symbol}
