"""
WADM FastAPI Application Factory
Main application setup with CORS, middleware, and error handling
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.api.routers import auth, market_data, system, indicators, sessions, mcp
from src.api.middleware import LoggingMiddleware
from src.api.middleware.rate_limit import EnhancedRateLimitMiddleware
from src.api.config import APIConfig
from src.storage.mongo_manager import MongoManager
from src.config import Config

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager for startup/shutdown events
    """
    # Startup
    logger.info("Starting WADM API Server...")
    
    # Initialize MongoDB connection
    mongo = MongoManager()
    app.state.mongo = mongo
    
    # Store config
    app.state.config = Config()
    app.state.api_config = APIConfig()
    
    logger.info("WADM API Server started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down WADM API Server...")
    # MongoDB connection will be cleaned up automatically
    logger.info("WADM API Server stopped")


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application
    """
    config = APIConfig()
    
    app = FastAPI(
        title="WADM API",
        description="wAIckoff Data Manager - Smart Money Analysis System",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Total-Count", "X-Page", "X-Per-Page"]
    )
    
    # Custom middleware
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(EnhancedRateLimitMiddleware, 
                      default_calls_per_minute=config.RATE_LIMIT_CALLS,
                      default_calls_per_hour=config.RATE_LIMIT_CALLS * 60)
    
    # Exception handlers
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "message": exc.detail,
                    "type": "http_error",
                    "status_code": exc.status_code
                }
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "message": "Validation error",
                    "type": "validation_error",
                    "details": exc.errors()
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": "Internal server error",
                    "type": "internal_error"
                }
            }
        )
    
    # Include routers
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(sessions.router, prefix="/api/v1/sessions", tags=["Sessions"])
    app.include_router(market_data.router, prefix="/api/v1/market", tags=["Market Data"])
    app.include_router(indicators.router, tags=["Indicators"])
    app.include_router(mcp.router, prefix="/api/v1", tags=["MCP Analysis"])
    app.include_router(system.router, prefix="/api/v1/system", tags=["System"])
    
    # Root endpoint
    @app.get("/")
    async def root():
        return {
            "name": "WADM API",
            "version": "1.0.0",
            "status": "operational",
            "docs": "/api/docs"
        }
    
    @app.get("/api/v1")
    async def api_info():
        return {
            "version": "1.0.0",
            "endpoints": {
                "auth": "/api/v1/auth",
                "sessions": "/api/v1/sessions",
                "market": "/api/v1/market",
                "indicators": "/api/v1/indicators",
                "mcp": "/api/v1/mcp",
                "system": "/api/v1/system"
            }
        }
    
    return app
