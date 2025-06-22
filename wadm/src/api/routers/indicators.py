"""
WADM Indicators API Router
Endpoints for technical indicators with real calculation services
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
from ..services import VolumeProfileService, OrderFlowService
from ...storage.mongo_manager import MongoManager
from ...config import Config
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/indicators",
    tags=["indicators"],
    dependencies=[Depends(verify_api_key)]
)

# Initialize storage and services
storage = MongoManager()
vp_service = VolumeProfileService(storage, cache_manager)
of_service = OrderFlowService(storage, cache_manager)

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
    exchange: Optional[str] = Query(None, description="Specific exchange"),
    mode: str = Query("latest", description="Data mode: latest, historical, or realtime")
):
    """Get Volume Profile data for a symbol with real calculations"""
    
    # Validate symbol
    if symbol not in Config.SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    try:
        if mode == "latest":
            # Get latest stored volume profile
            data = await vp_service.get_latest(symbol, exchange)
            if not data:
                # Fallback to realtime calculation
                data = await vp_service.calculate_realtime(symbol, exchange or "bybit", 60)
        
        elif mode == "realtime":
            # Calculate from recent trades
            minutes = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}.get(timeframe, 60)
            data = await vp_service.calculate_realtime(symbol, exchange or "bybit", minutes)
        
        elif mode == "multi-timeframe":
            # Get multiple timeframes
            data = await vp_service.get_multi_timeframe(symbol, exchange)
        
        else:
            raise HTTPException(status_code=400, detail="Mode must be: latest, realtime, or multi-timeframe")
        
        if not data:
            raise HTTPException(status_code=404, detail=f"No volume profile data available for {symbol}")
        
        # Convert to response model format
        response_data = VolumeProfileResponse(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00")),
            poc=data["poc"],
            vah=data["vah"],
            val=data["val"],
            total_volume=data["total_volume"],
            volume_nodes=data.get("volume_nodes", []),
            session_data={
                "profile_strength": data.get("profile_strength", 50.0),
                "value_area_percentage": data.get("value_area_percentage", 70.0),
                "trades_count": data.get("trades_count", 0)
            },
            metadata={
                "calculation_method": "real_time_trades",
                "exchange": data.get("exchange", exchange),
                "time_period_minutes": data.get("time_period_minutes", 60),
                "data_quality": "high" if data.get("trades_count", 0) > 100 else "medium"
            }
        )
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error getting volume profile for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving volume profile: {str(e)}")


@router.get("/order-flow/{symbol}", response_model=OrderFlowResponse)
async def get_order_flow(
    symbol: str,
    timeframe: str = Query("15m", description="Timeframe for analysis"),
    exchange: Optional[str] = Query(None, description="Specific exchange"),
    mode: str = Query("latest", description="Data mode: latest, realtime, or analysis")
):
    """Get Order Flow data for a symbol with real calculations"""
    
    # Validate symbol
    if symbol not in Config.SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    try:
        if mode == "latest":
            # Get latest stored order flow
            data = await of_service.get_latest(symbol, exchange)
            if not data:
                # Fallback to realtime calculation
                data = await of_service.calculate_realtime(symbol, exchange or "bybit", 15)
        
        elif mode == "realtime":
            # Calculate from recent trades
            minutes = {"5m": 5, "15m": 15, "1h": 60, "4h": 240}.get(timeframe, 15)
            data = await of_service.calculate_realtime(symbol, exchange or "bybit", minutes)
        
        elif mode == "analysis":
            # Get comprehensive flow analysis
            data = await of_service.get_flow_analysis(symbol, exchange)
            
            # For analysis mode, return more detailed response
            return JSONResponse(content={
                "symbol": symbol,
                "mode": "comprehensive_analysis",
                "data": data
            })
        
        else:
            raise HTTPException(status_code=400, detail="Mode must be: latest, realtime, or analysis")
        
        if not data:
            raise HTTPException(status_code=404, detail=f"No order flow data available for {symbol}")
        
        # Convert to response model format
        response_data = OrderFlowResponse(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00")),
            delta=data["delta"],
            cumulative_delta=data["cumulative_delta"],
            buy_volume=data["buy_volume"],
            sell_volume=data["sell_volume"],
            absorption_events=data.get("absorption_events", []),
            momentum_score=data.get("momentum_score", 50.0),
            metadata={
                "calculation_method": "real_time_trades",
                "exchange": data.get("exchange", exchange),
                "trades_count": data.get("trades_count", 0),
                "time_period_minutes": data.get("time_period_minutes", 15),
                "flow_strength": data.get("flow_strength", 50.0),
                "market_bias": data.get("market_bias", "neutral"),
                "institutional_volume": data.get("institutional_volume", 0.0),
                "exhaustion_signals": data.get("exhaustion_signals", [])
            }
        )
        
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
