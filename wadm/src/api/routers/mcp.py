"""MCP Integration Router."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging

from ..dependencies import require_active_session, get_api_key
from ..services.mcp import MCPClient, MCPToolCall, MCPResponse, MCPError
from ..services.session import SessionService
from ..models.session import SessionUsage, SessionResponse
from ..models.auth import APIKeyInDB
from src.storage.mongo_manager import MongoManager


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mcp", tags=["MCP Analysis"])

# Initialize MCP client
mcp_client = MCPClient()

# Global MongoDB instance
_mongo_manager: Optional[MongoManager] = None


def get_mongo_manager() -> Optional[MongoManager]:
    """Get MongoDB manager instance."""
    global _mongo_manager
    if _mongo_manager is None:
        try:
            _mongo_manager = MongoManager()
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
    return _mongo_manager


@router.post("/call", response_model=MCPResponse)
async def call_mcp_tool(
    request: MCPToolCall,
    session: SessionResponse = Depends(require_active_session),
    api_key: APIKeyInDB = Depends(get_api_key)
) -> MCPResponse:
    """Call an MCP analysis tool.
    
    Available tools include:
    - Market data: get_ticker, get_orderbook, get_market_data
    - Technical analysis: perform_technical_analysis, fibonacci, bollinger bands
    - Wyckoff: analyze_wyckoff_phase, find_wyckoff_events, composite_man
    - Smart Money: detect_order_blocks, find_fair_value_gaps, smc_confluence
    - Volume: analyze_volume, analyze_volume_delta
    - Complete: get_complete_analysis, complete_analysis_with_context
    
    See /api/v1/mcp/tools for full list.
    """
    try:
        # Execute MCP tool call
        response = await mcp_client.call_tool(
            tool_name=request.tool,
            params=request.params,
            session_id=session.session_id
        )
        
        # Update session usage
        if response.success and response.tokens_used > 0:
            mongo = get_mongo_manager()
            session_service = SessionService(mongo_manager=mongo)
            await session_service.track_endpoint_usage(
                session_id=session.id,  # Changed from session.session_id
                endpoint=f"/mcp/{request.tool}",
                tokens_used=response.tokens_used
            )
        
        return response
        
    except MCPError as e:
        logger.error(f"MCP error: {e.message}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Unexpected MCP error", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/tools")
async def list_mcp_tools(
    category: Optional[str] = Query(None, description="Filter by category"),
    api_key: APIKeyInDB = Depends(get_api_key)
) -> List[dict]:
    """Get list of available MCP analysis tools."""
    try:
        tools = await mcp_client.list_tools()
        
        # Filter by category if specified
        if category:
            tools = [t for t in tools if t.category == category]
            
        return [tool.dict() for tool in tools]
        
    except Exception as e:
        logger.error("Failed to list MCP tools", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve tool list")


@router.get("/health")
async def check_mcp_health(
    api_key: APIKeyInDB = Depends(get_api_key)
) -> dict:
    """Check MCP server health status."""
    try:
        health = await mcp_client.get_health()
        return health.dict()
        
    except Exception as e:
        logger.error("MCP health check failed", exc_info=True)
        return {
            "healthy": False,
            "error": str(e),
            "version": "unknown",
            "tools_count": 0,
            "process_running": False
        }


# Convenience endpoints for common analyses

@router.post("/analyze/wyckoff/{symbol}")
async def analyze_wyckoff(
    symbol: str,
    timeframe: str = Query("60", description="Timeframe (15, 30, 60, 240, D)"),
    session: SessionResponse = Depends(require_active_session),
    api_key: APIKeyInDB = Depends(get_api_key)
) -> MCPResponse:
    """Perform complete Wyckoff analysis for a symbol."""
    request = MCPToolCall(
        tool="analyze_wyckoff_phase",
        params={"symbol": symbol.upper(), "timeframe": timeframe},
        session_id=session.id
    )
    return await call_mcp_tool(request, session, api_key)


@router.post("/analyze/smc/{symbol}")
async def analyze_smart_money(
    symbol: str,
    timeframe: str = Query("60", description="Timeframe"),
    session: SessionResponse = Depends(require_active_session),
    api_key: APIKeyInDB = Depends(get_api_key)
) -> MCPResponse:
    """Perform Smart Money Concepts analysis."""
    request = MCPToolCall(
        tool="analyze_smart_money_confluence",
        params={"symbol": symbol.upper(), "timeframe": timeframe},
        session_id=session.id
    )
    return await call_mcp_tool(request, session, api_key)


@router.post("/analyze/complete/{symbol}")
async def complete_analysis(
    symbol: str,
    investment: Optional[float] = Query(None, description="Investment amount for grid suggestions"),
    session: SessionResponse = Depends(require_active_session),
    api_key: APIKeyInDB = Depends(get_api_key)
) -> MCPResponse:
    """Perform complete market analysis with all indicators."""
    params = {"symbol": symbol.upper()}
    if investment:
        params["investment"] = investment
        
    request = MCPToolCall(
        tool="get_complete_analysis",
        params=params,
        session_id=session.id
    )
    return await call_mcp_tool(request, session, api_key)


@router.post("/analyze/technical/{symbol}")
async def technical_analysis(
    symbol: str,
    timeframe: str = Query("60", description="Timeframe"),
    periods: int = Query(100, description="Number of periods"),
    session: SessionResponse = Depends(require_active_session),
    api_key: APIKeyInDB = Depends(get_api_key)
) -> MCPResponse:
    """Perform comprehensive technical analysis."""
    request = MCPToolCall(
        tool="perform_technical_analysis",
        params={
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "periods": periods
        },
        session_id=session.id
    )
    return await call_mcp_tool(request, session, api_key)


@router.get("/analyze/{symbol}/context")
async def get_analysis_context(
    symbol: str,
    session: SessionResponse = Depends(require_active_session),
    api_key: APIKeyInDB = Depends(get_api_key)
) -> MCPResponse:
    """Get 3-month historical context for a symbol."""
    request = MCPToolCall(
        tool="get_master_context",
        params={"symbol": symbol.upper()},
        session_id=session.id
    )
    return await call_mcp_tool(request, session, api_key)
