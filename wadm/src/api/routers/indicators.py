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
    IndicatorStatus,
    OrderBlock,
    FairValueGap,
    StructureBreak,
    TradingSignal
)
from ..models.auth import APIKeyVerifyResponse, PermissionLevel
from ..models.session import SessionResponse
from ..routers.auth import verify_api_key
from ..dependencies import require_active_session
from ..cache import cache_manager
from ..services import VolumeProfileService, OrderFlowService, SMCService
from ...storage.mongo_manager import MongoManager
from ...config import Config
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/indicators",
    tags=["indicators"]
)

# Initialize storage and services
storage = MongoManager()
vp_service = VolumeProfileService(storage, cache_manager)
of_service = OrderFlowService(storage, cache_manager)
smc_service = SMCService(storage, cache_manager)


@router.get("/status", response_model=IndicatorStatus)
async def get_indicators_status(
    verification: APIKeyVerifyResponse = Depends(verify_api_key)
):
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
    mode: str = Query("latest", description="Data mode: latest, historical, or realtime"),
    session: SessionResponse = Depends(require_active_session)
):
    """
    Get Volume Profile data for a symbol with real calculations
    
    **Requires active session** ($1 per 24h or 100k tokens)
    """
    
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
                "data_quality": "high" if data.get("trades_count", 0) > 100 else "medium",
                "session_id": session.id
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
    mode: str = Query("latest", description="Data mode: latest, realtime, or analysis"),
    session: SessionResponse = Depends(require_active_session)
):
    """
    Get Order Flow data for a symbol with real calculations
    
    **Requires active session** ($1 per 24h or 100k tokens)
    """
    
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
                "data": data,
                "session_id": session.id
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
                "exhaustion_signals": data.get("exhaustion_signals", []),
                "session_id": session.id
            }
        )
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error getting order flow for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving order flow: {str(e)}")


@router.get("/smc/{symbol}/analysis", response_model=SMCAnalysisResponse)
async def get_smc_analysis(
    symbol: str,
    timeframe: str = Query("15m", description="Analysis timeframe (5m, 15m, 1h, 4h)"),
    session: SessionResponse = Depends(require_active_session)
):
    """
    Get comprehensive Smart Money Concepts analysis for a symbol
    
    **Requires active session** ($1 per 24h or 100k tokens)
    
    Returns:
    - Order blocks with institutional validation
    - Fair value gaps with fill probability
    - Market structure breaks (BOS/CHoCH)
    - Liquidity zones and institutional positioning
    - Overall confluence score and market bias
    """
    
    # Validate symbol
    if symbol not in Config.SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    try:
        # Get comprehensive SMC analysis
        analysis = await smc_service.get_comprehensive_analysis(symbol, timeframe)
        
        # Convert to response model
        response = SMCAnalysisResponse(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=datetime.fromisoformat(analysis["timestamp"]),
            order_blocks=[
                OrderBlock(
                    id=ob.get("id", str(i)),
                    price_high=ob.get("top", 0),
                    price_low=ob.get("bottom", 0),
                    timestamp=datetime.fromisoformat(ob.get("timestamp", datetime.now(timezone.utc).isoformat())),
                    block_type=ob.get("type", "unknown"),
                    strength=ob.get("strength", 50),
                    volume=ob.get("volume", 0),
                    status="active" if ob.get("active", True) else "mitigated"
                )
                for i, ob in enumerate(analysis.get("order_blocks", []))
            ],
            fair_value_gaps=[
                FairValueGap(
                    id=fvg.get("id", str(i)),
                    price_high=fvg.get("high", 0),
                    price_low=fvg.get("low", 0),
                    timestamp=datetime.fromisoformat(fvg.get("timestamp", datetime.now(timezone.utc).isoformat())),
                    gap_type=fvg.get("type", "unknown"),
                    fill_probability=fvg.get("fill_probability", 50),
                    status="open" if not fvg.get("filled", False) else "filled"
                )
                for i, fvg in enumerate(analysis.get("fair_value_gaps", []))
            ],
            structure_breaks=[
                StructureBreak(
                    id=str(i),
                    break_type=sb.get("type", "unknown"),
                    price=sb.get("price", 0),
                    timestamp=datetime.fromisoformat(sb.get("timestamp", datetime.now(timezone.utc).isoformat())),
                    timeframe=timeframe,
                    confirmation=sb.get("confirmed", False),
                    volume=sb.get("volume", 0)
                )
                for i, sb in enumerate(analysis.get("structure_breaks", []))
            ],
            confluence_score=analysis.get("confluence_score", 50),
            market_bias=analysis.get("market_bias", "neutral"),
            institutional_activity=analysis.get("institutional_metrics", {}),
            metadata={
                "trades_analyzed": analysis.get("trades_analyzed", 0),
                "calculation_time": analysis.get("calculation_time", 0),
                "exchanges_analyzed": analysis.get("exchanges", ["bybit", "binance", "coinbase", "kraken"]),
                "wyckoff_phase": analysis.get("wyckoff_phase", "unknown"),
                "session_id": session.id
            }
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting SMC analysis for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error in SMC analysis: {str(e)}")


@router.get("/smc/{symbol}/signals", response_model=SMCSignalsResponse)
async def get_smc_signals(
    symbol: str,
    signal_type: Optional[str] = Query(None, enum=["long", "short"], description="Filter by signal type"),
    min_confidence: float = Query(70.0, ge=0, le=100, description="Minimum confidence score"),
    session: SessionResponse = Depends(require_active_session)
):
    """
    Get actionable trading signals from Smart Money Concepts analysis
    
    **Requires active session** ($1 per 24h or 100k tokens)
    
    Returns high-probability trading signals with:
    - Entry, stop loss, and take profit levels
    - Risk/reward ratios
    - Confidence scores
    - Supporting confluence factors
    - Position sizing suggestions
    """
    
    # Validate symbol
    if symbol not in Config.SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    try:
        # Get trading signals
        signals_data = await smc_service.get_trading_signals(symbol, signal_type)
        
        # Filter by confidence
        filtered_signals = [
            s for s in signals_data.get("signals", [])
            if s.get("confidence", 0) >= min_confidence
        ]
        
        # Convert to response model
        response = SMCSignalsResponse(
            symbol=symbol,
            timestamp=datetime.fromisoformat(signals_data["timestamp"]),
            active_signals=[
                TradingSignal(
                    id=sig.get("id", str(i)),
                    signal_type=sig.get("type", "unknown"),
                    entry_price=sig.get("entry", 0),
                    stop_loss=sig.get("stop_loss", 0),
                    take_profit=sig.get("take_profits", []),
                    confidence=sig.get("confidence", 50),
                    risk_reward=sig.get("risk_reward", 1.0),
                    confluence_factors=sig.get("factors", []),
                    position_size=sig.get("position_size"),
                    timestamp=datetime.fromisoformat(sig.get("timestamp", datetime.now(timezone.utc).isoformat())),
                    expiry=datetime.fromisoformat(sig["expiry"]) if sig.get("expiry") else None
                )
                for i, sig in enumerate(filtered_signals)
            ],
            signal_count=len(filtered_signals),
            average_confidence=sum(s.get("confidence", 0) for s in filtered_signals) / len(filtered_signals) if filtered_signals else 0,
            market_conditions=signals_data.get("summary", {}),
            risk_assessment={
                "market_volatility": signals_data.get("volatility", "normal"),
                "recommended_risk_per_trade": 1.0 if signals_data.get("summary", {}).get("market_bias") != "neutral" else 0.5,
                "max_concurrent_positions": 3 if len(filtered_signals) > 5 else len(filtered_signals),
                "overall_market_risk": "low" if signals_data.get("summary", {}).get("institutional_bias") == signals_data.get("summary", {}).get("market_bias") else "medium"
            },
            metadata={
                "analysis_depth": signals_data.get("analysis_depth", "comprehensive"),
                "signal_generation_method": "smc_institutional_confluence",
                "filters_applied": {"min_confidence": min_confidence, "signal_type": signal_type},
                "recommendations": signals_data.get("recommendations", []),
                "session_id": session.id
            }
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting SMC signals for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating signals: {str(e)}")


@router.get("/smc/{symbol}/structure")
async def get_market_structure(
    symbol: str,
    include_levels: bool = Query(True, description="Include key support/resistance levels"),
    session: SessionResponse = Depends(require_active_session)
):
    """
    Get detailed market structure analysis
    
    **Requires active session** ($1 per 24h or 100k tokens)
    
    Returns:
    - Current market trend and phase
    - Recent structure breaks
    - Key support and resistance levels
    - Momentum analysis
    - Institutional alignment
    """
    
    # Validate symbol
    if symbol not in Config.SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    try:
        structure = await smc_service.get_market_structure(symbol, include_levels)
        structure["session_id"] = session.id
        return JSONResponse(content=structure)
        
    except Exception as e:
        logger.error(f"Error getting market structure for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing structure: {str(e)}")


@router.get("/smc/{symbol}/confluence")
async def get_confluence_analysis(
    symbol: str,
    min_score: int = Query(70, ge=0, le=100, description="Minimum confluence score"),
    session: SessionResponse = Depends(require_active_session)
):
    """
    Get multi-factor confluence analysis
    
    **Requires active session** ($1 per 24h or 100k tokens)
    
    Combines Volume Profile, Order Flow, and SMC indicators to identify
    high-probability trading zones with multiple confirming factors.
    """
    
    # Validate symbol
    if symbol not in Config.SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    
    try:
        confluence = await smc_service.get_confluence_analysis(symbol, min_score)
        confluence["session_id"] = session.id
        return JSONResponse(content=confluence)
        
    except Exception as e:
        logger.error(f"Error getting confluence analysis for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error in confluence analysis: {str(e)}")
