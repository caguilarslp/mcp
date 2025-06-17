"""
Health check endpoints
"""

from typing import Dict, Any

from fastapi import APIRouter, Request, Response
import structlog

from src.core.config import get_settings

router = APIRouter()
logger = structlog.get_logger()


@router.get("/health", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    settings = get_settings()
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


@router.get("/health/detailed", response_model=Dict[str, Any])
async def detailed_health_check(request: Request) -> Dict[str, Any]:
    """Detailed health check with dependency status."""
    settings = get_settings()
    
    # Check MongoDB
    mongodb_status = await request.app.state.mongodb.health_check()
    
    # Check Redis
    redis_status = await request.app.state.redis.health_check()
    
    # Overall status
    overall_status = "healthy"
    if mongodb_status["status"] != "healthy" or redis_status["status"] != "healthy":
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "dependencies": {
            "mongodb": mongodb_status,
            "redis": redis_status
        }
    }


@router.get("/ping")
async def ping() -> Dict[str, str]:
    """Simple ping endpoint for monitoring."""
    return {"ping": "pong"}


@router.head("/health")
async def health_check_head(response: Response) -> None:
    """HEAD health check for load balancers."""
    response.status_code = 200
