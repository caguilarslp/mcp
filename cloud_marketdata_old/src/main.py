"""
Cloud MarketData MCP Server - Main Application Entry Point

Provides FastAPI application with health checks, collector management
and MCP integration.
"""

from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
import logging
import os
from datetime import datetime

from fastapi import FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .core.config import Settings
from .core.logger import setup_logger
from .mcp_integration.server import get_mcp_server
from .collectors.manager import collector_manager
from .collectors.storage import GLOBAL_STORAGE
from .collectors.base import CollectorStatus
from .auth import create_api_key, list_api_keys, revoke_api_key, require_read, require_write

# Load configuration
settings = Settings()
logger = setup_logger(__name__)

class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    timestamp: str
    version: str
    services: Dict[str, str]

class SystemInfo(BaseModel):
    """System information response model"""
    app_name: str
    version: str
    environment: str
    python_version: str
    started_at: str

# Application startup/shutdown context
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🚀 Cloud MarketData MCP Server starting up...")
    
    # Startup logic here
    startup_time = datetime.utcnow().isoformat()
    app.state.startup_time = startup_time
    
    # Initialize MCP server
    try:
        mcp_server = get_mcp_server()
        app.state.mcp_server = mcp_server
        logger.info("✅ MCP server initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize MCP server: {e}")
        raise
    
    # Start collector manager
    try:
        await collector_manager.start()
        app.state.collector_manager = collector_manager
        logger.info("✅ Collector manager started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start collector manager: {e}")
        raise
    
    logger.info(f"✅ Application started at {startup_time}")
    
    yield
    
    # Shutdown logic here
    logger.info("🛑 Cloud MarketData MCP Server shutting down...")
    
    # Stop collector manager
    if hasattr(app.state, 'collector_manager'):
        logger.info("🔌 Shutting down collector manager...")
        await collector_manager.stop()
    
    if hasattr(app.state, 'mcp_server'):
        logger.info("🔌 Shutting down MCP server...")

# Create FastAPI application
app = FastAPI(
    title="Cloud MarketData MCP Server",
    description="Real-time market data collection and processing service with MCP integration",
    version="0.1.3",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint
    
    Returns:
        HealthResponse: Current system health status
    """
    try:
        # Basic service checks
        services_status = {
            "api": "healthy",
            "mongodb": "checking",  # Will implement actual checks later
            "redis": "checking",    # Will implement actual checks later
            "mcp_server": "healthy" if hasattr(app.state, 'mcp_server') else "not_initialized",
            "collector_manager": "healthy" if hasattr(app.state, 'collector_manager') else "not_initialized"
        }
        
        # Check collector manager health if available
        if hasattr(app.state, 'collector_manager'):
            status_info = collector_manager.get_collector_status()
            active_collectors = status_info.get("manager", {}).get("active_collectors", 0)
            total_collectors = status_info.get("manager", {}).get("total_collectors", 0)
            
            services_status["collectors"] = f"{active_collectors}/{total_collectors} active"
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow().isoformat(),
            version="0.1.3",
            services=services_status
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.get("/", response_model=SystemInfo)
async def root() -> SystemInfo:
    """
    Root endpoint with system information
    
    Returns:
        SystemInfo: Basic system information
    """
    import sys
    
    return SystemInfo(
        app_name="Cloud MarketData MCP Server",
        version="0.1.3",
        environment=settings.ENVIRONMENT,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        started_at=getattr(app.state, 'startup_time', 'unknown')
    )

@app.get("/ping")
async def ping() -> Dict[str, str]:
    """Simple ping endpoint for connectivity testing"""
    return {"message": "pong", "timestamp": datetime.utcnow().isoformat()}

# MCP HTTP endpoints for testing
@app.get("/mcp/ping")
async def mcp_ping(message: str = "Hello from HTTP!") -> Dict[str, Any]:
    """MCP ping tool accessible via HTTP for testing"""
    if not hasattr(app.state, 'mcp_server'):
        raise HTTPException(status_code=503, detail="MCP server not initialized")
    
    from .mcp_integration.tools import ping_tool
    return await ping_tool(message)

@app.get("/mcp/info")
async def mcp_info() -> Dict[str, Any]:
    """MCP system info tool accessible via HTTP for testing"""
    if not hasattr(app.state, 'mcp_server'):
        raise HTTPException(status_code=503, detail="MCP server not initialized")
    
    from .mcp_integration.tools import system_info_tool
    return await system_info_tool()

# Collector endpoints for testing and monitoring
@app.get("/collectors/status")
async def get_collectors_status() -> Dict[str, Any]:
    """Get status of all collectors"""
    if not hasattr(app.state, 'collector_manager'):
        raise HTTPException(status_code=503, detail="Collector manager not initialized")
    
    return collector_manager.get_collector_status()

@app.get("/collectors/status/{collector_name}")
async def get_collector_status(collector_name: str) -> Dict[str, Any]:
    """Get status of specific collector"""
    if not hasattr(app.state, 'collector_manager'):
        raise HTTPException(status_code=503, detail="Collector manager not initialized")
    
    status = collector_manager.get_collector_status(collector_name)
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])
    
    return status

@app.get("/collectors/storage/stats")
async def get_storage_stats() -> Dict[str, Any]:
    """Get storage statistics"""
    if not hasattr(app.state, 'collector_manager'):
        raise HTTPException(status_code=503, detail="Collector manager not initialized")
    
    return await collector_manager.get_storage_stats()

@app.get("/collectors/trades")
async def get_recent_trades(symbol: str = None, limit: int = 10) -> Dict[str, Any]:
    """Get recent trades from storage"""
    if not hasattr(app.state, 'collector_manager'):
        raise HTTPException(status_code=503, detail="Collector manager not initialized")
    
    if limit > 100:
        raise HTTPException(status_code=400, detail="Limit cannot exceed 100")
    
    trades = await collector_manager.get_recent_trades(symbol=symbol, limit=limit)
    
    return {
        "symbol": symbol,
        "limit": limit,
        "count": len(trades),
        "trades": trades
    }

@app.get("/debug/tasks")
async def debug_tasks() -> Dict[str, Any]:
    """Debug endpoint to check running asyncio tasks"""
    import asyncio
    
    # Get all tasks
    tasks = asyncio.all_tasks()
    
    # Get collector specific info
    collector_info = {}
    if hasattr(app.state, 'collector_manager'):
        for name, collector in collector_manager.collectors.items():
            collector_info[name] = {
                "status": collector.status.value,
                "task": str(collector._task) if hasattr(collector, '_task') else "No task",
                "task_done": collector._task.done() if hasattr(collector, '_task') and collector._task else None,
                "websocket": "connected" if collector._websocket else "disconnected" if hasattr(collector, '_websocket') else "unknown"
            }
    
    return {
        "total_tasks": len(tasks),
        "tasks": [str(task) for task in tasks],
        "collectors": collector_info,
        "event_loop": str(asyncio.get_event_loop())
    }

@app.get("/debug/storage")
async def debug_storage() -> Dict[str, Any]:
    """Debug endpoint to check storage internals"""
    if not hasattr(app.state, 'collector_manager'):
        raise HTTPException(status_code=503, detail="Collector manager not initialized")
    
    storage = collector_manager.storage
    
    # Get internal state safely  
    debug_info = {
        "storage_type": type(storage).__name__,
        "storage_id": id(storage),
        "global_storage_id": id(GLOBAL_STORAGE),
        "storage_is_global": storage is GLOBAL_STORAGE,
        "stats": await storage.get_stats(),
        "symbols": await storage.get_symbols(),
        "trade_counts": {}
    }
    
    # Get trade count per symbol
    for symbol in await storage.get_symbols():
        debug_info["trade_counts"][symbol] = await storage.get_trades_count(symbol)
    
    # Get sample trades
    sample_trades = await storage.get_recent_trades(limit=3)
    debug_info["sample_trades"] = [
        {
            "symbol": t.symbol,
            "side": t.side.value,
            "price": str(t.price),
            "quantity": str(t.quantity),
            "timestamp": t.timestamp.isoformat(),
            "exchange": t.exchange
        }
        for t in sample_trades
    ]
    
    # Check if storage handler is connected to collector
    for name, collector in collector_manager.collectors.items():
        if hasattr(collector, 'storage_handler'):
            debug_info[f"collector_{name}_has_storage"] = collector.storage_handler is not None
            debug_info[f"collector_{name}_storage_same"] = collector.storage_handler is storage
    
    return debug_info


@app.get("/debug/collector-details")
async def debug_collector_details() -> Dict[str, Any]:
    """Debug endpoint with complete collector details"""
    if not hasattr(app.state, 'collector_manager'):
        raise HTTPException(status_code=503, detail="Collector manager not initialized")
    
    details = {}
    
    for name, collector in collector_manager.collectors.items():
        # Get basic info
        details[name] = {
            "class": type(collector).__name__,
            "status": collector.status.value,
            "websocket_url": collector.websocket_url,
            "symbols": collector.symbols if hasattr(collector, 'symbols') else [],
            "stats": collector.stats,
            "has_storage_handler": hasattr(collector, 'storage_handler') and collector.storage_handler is not None,
            "storage_handler_type": type(collector.storage_handler).__name__ if hasattr(collector, 'storage_handler') and collector.storage_handler else "None",
            "storage_handler_id": id(collector.storage_handler) if hasattr(collector, 'storage_handler') and collector.storage_handler else None,
            "manager_storage_id": id(collector_manager.storage),
            "storage_handlers_match": (hasattr(collector, 'storage_handler') and 
                                      collector.storage_handler is collector_manager.storage)
        }
        
        # Check WebSocket state
        if hasattr(collector, '_websocket'):
            ws = collector._websocket
            details[name]["websocket_state"] = {
                "connected": ws is not None,
                "closed": ws.state.name if ws and hasattr(ws, 'state') else None,
                "type": type(ws).__name__ if ws else None
            }
    
    # Add storage info
    storage_stats = await collector_manager.storage.get_stats()
    details["storage"] = {
        "type": type(collector_manager.storage).__name__,
        "id": id(collector_manager.storage),
        "stats": storage_stats,
        "total_objects": len(collector_manager.storage)
    }
    
    return details


# Symbol management endpoints
@app.post("/collectors/symbols")
async def add_symbol(symbol: str) -> Dict[str, Any]:
    """
    Add a new symbol to monitor
    
    Args:
        symbol: Trading pair to add (e.g., BTCUSDT)
    """
    try:
        # Validate symbol format
        symbol = symbol.upper().strip()
        if not symbol.endswith(("USDT", "BUSD", "USD")):
            return {
                "error": "Invalid symbol format. Should end with USDT/BUSD/USD"
            }
        
        # Get current collector
        bybit_collector = collector_manager.collectors.get("bybit_trades")
        if not bybit_collector:
            return {"error": "No active Bybit collector found"}
        
        # Check if already monitoring
        if symbol in bybit_collector.symbols:
            return {
                "message": f"Already monitoring {symbol}",
                "symbols": bybit_collector.symbols
            }
        
        # Add symbol to existing collector
        bybit_collector.symbols.append(symbol)
        
        # If collector is active, subscribe to new symbol
        if bybit_collector.status == CollectorStatus.ACTIVE:
            await bybit_collector._subscribe()
        
        return {
            "message": f"Added {symbol} to monitoring",
            "symbols": bybit_collector.symbols
        }
    except Exception as e:
        logger.error(f"Error adding symbol: {e}", exc_info=True)
        return {"error": str(e)}


@app.delete("/collectors/symbols/{symbol}")
async def remove_symbol(symbol: str) -> Dict[str, Any]:
    """
    Remove a symbol from monitoring
    
    Args:
        symbol: Trading pair to remove
    """
    try:
        symbol = symbol.upper().strip()
        
        # Get current collector
        bybit_collector = collector_manager.collectors.get("bybit_trades")
        if not bybit_collector:
            return {"error": "No active Bybit collector found"}
        
        # Check if monitoring
        if symbol not in bybit_collector.symbols:
            return {
                "message": f"Not monitoring {symbol}",
                "symbols": bybit_collector.symbols
            }
        
        # Remove symbol
        bybit_collector.symbols.remove(symbol)
        
        # If collector is active, re-subscribe
        if bybit_collector.status == CollectorStatus.ACTIVE:
            await bybit_collector._subscribe()
        
        return {
            "message": f"Removed {symbol} from monitoring",
            "symbols": bybit_collector.symbols
        }
    except Exception as e:
        logger.error(f"Error removing symbol: {e}", exc_info=True)
        return {"error": str(e)}


@app.get("/collectors/symbols")
async def list_symbols() -> Dict[str, Any]:
    """
    List all symbols being monitored
    """
    try:
        symbols_by_collector = {}
        
        for name, collector in collector_manager.collectors.items():
            if hasattr(collector, 'symbols'):
                symbols_by_collector[name] = collector.symbols
        
        return {
            "symbols_by_collector": symbols_by_collector,
            "all_symbols": list(set(
                symbol 
                for symbols in symbols_by_collector.values() 
                for symbol in symbols
            ))
        }
    except Exception as e:
        logger.error(f"Error listing symbols: {e}", exc_info=True)
        return {"error": str(e)}


# API Key Management Endpoints (temporary for development)
@app.post("/auth/api-keys")
async def create_new_api_key(
    name: str,
    expires_in_days: int = 7,
    permissions: str = "read"
) -> Dict[str, Any]:
    """
    Create a new API key for temporary access
    
    WARNING: In production, this endpoint should be secured!
    """
    try:
        # Parse permissions
        perms = set(permissions.split(","))
        
        # Create the key
        api_key = create_api_key(
            name=name,
            expires_in_days=expires_in_days,
            permissions=perms
        )
        
        return {
            "api_key": api_key,
            "name": name,
            "expires_in_days": expires_in_days,
            "permissions": list(perms),
            "warning": "Save this key securely. It cannot be retrieved again."
        }
    except Exception as e:
        logger.error(f"Error creating API key: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/api-keys")
async def get_api_keys() -> Dict[str, Any]:
    """
    List all API keys (without the actual keys)
    """
    return {
        "api_keys": list_api_keys()
    }


@app.delete("/auth/api-keys/{key_prefix}")
async def delete_api_key(key_prefix: str) -> Dict[str, Any]:
    """
    Revoke an API key by its hash prefix
    """
    if len(key_prefix) < 8:
        raise HTTPException(
            status_code=400,
            detail="Key prefix must be at least 8 characters"
        )
    
    if revoke_api_key(key_prefix):
        return {"message": f"API key starting with {key_prefix} has been revoked"}
    else:
        raise HTTPException(
            status_code=404,
            detail=f"No API key found starting with {key_prefix}"
        )


# Example of protected endpoint
@app.get("/protected/example")
async def protected_endpoint(auth: Dict = Security(require_read)):
    """
    Example of a protected endpoint requiring API key
    """
    return {
        "message": "Access granted",
        "key_name": auth.name,
        "permissions": list(auth.permissions)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if settings.ENVIRONMENT == "development" else False,
        log_level=settings.LOG_LEVEL.lower()
    )
