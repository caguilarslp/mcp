"""
WADM - wAIckoff Data Manager
Main FastAPI application entry point
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.core.config import Settings, get_settings
from src.infrastructure.database.mongodb import MongoDBClient
from src.infrastructure.cache.redis import RedisCache
from src.presentation.api.routes import health, volume_profile
from src.presentation.api.routes.order_flow import router as order_flow_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Manage application lifecycle."""
    settings = get_settings()
    
    # Startup
    logger.info("Starting WADM application", 
                version=settings.APP_VERSION,
                environment=settings.ENVIRONMENT)
    
    # Initialize MongoDB
    app.state.mongodb = MongoDBClient(settings.MONGODB_URL)
    await app.state.mongodb.connect()
    logger.info("MongoDB connected successfully")
    
    # Initialize Redis
    app.state.redis = RedisCache(settings.REDIS_URL)
    await app.state.redis.connect()
    logger.info("Redis connected successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down WADM application")
    
    # Close MongoDB connection
    await app.state.mongodb.disconnect()
    logger.info("MongoDB disconnected")
    
    # Close Redis connection
    await app.state.redis.disconnect()
    logger.info("Redis disconnected")


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title="WADM - wAIckoff Data Manager",
        description="Real-time market data collection and analysis system",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
        lifespan=lifespan
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.ENVIRONMENT == "development" else settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add custom exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        logger.error("Unhandled exception", 
                    exc_info=exc,
                    path=request.url.path,
                    method=request.method)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    
    # Include routers
    app.include_router(health.router, tags=["health"])
    app.include_router(volume_profile.router, prefix="/api/v1", tags=["volume-profile"])
    app.include_router(order_flow_router, prefix="/api/v1", tags=["order-flow"])
    
    return app


# Create the application instance
app = create_application()


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "src.presentation.api.main:app",
        host="0.0.0.0",
        port=8920,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower()
    )
