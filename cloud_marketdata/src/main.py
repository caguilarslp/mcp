"""
Cloud MarketData MCP Server - Main Application Entry Point

Provides FastAPI application with health checks and basic structure
for future FastMCP integration.
"""

from contextlib import asynccontextmanager
from typing import Dict, Any
import logging
import os
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .core.config import Settings
from .core.logger import setup_logger
from .mcp_integration.server import get_mcp_server

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
    
    logger.info(f"✅ Application started at {startup_time}")
    
    yield
    
    # Shutdown logic here
    logger.info("🛑 Cloud MarketData MCP Server shutting down...")
    if hasattr(app.state, 'mcp_server'):
        logger.info("🔌 Shutting down MCP server...")

# Create FastAPI application
app = FastAPI(
    title="Cloud MarketData MCP Server",
    description="Real-time market data collection and processing service with MCP integration",
    version="0.1.0",
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
            "mcp_server": "healthy" if hasattr(app.state, 'mcp_server') else "not_initialized"
        }
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow().isoformat(),
            version="0.1.0",
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
        version="0.1.0",
        environment=settings.ENVIRONMENT,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        started_at=getattr(app.state, 'startup_time', 'unknown')
    )

@app.get("/ping")
async def ping() -> Dict[str, str]:
    """Simple ping endpoint for connectivity testing"""
    return {"message": "pong", "timestamp": datetime.utcnow().isoformat()}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if settings.ENVIRONMENT == "development" else False,
        log_level=settings.LOG_LEVEL.lower()
    )
