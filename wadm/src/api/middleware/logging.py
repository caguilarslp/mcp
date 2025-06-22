"""
Logging Middleware
Request/response logging with performance metrics
"""

import time
import logging
import json
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Log all requests with timing information
    """
    
    async def dispatch(self, request: Request, call_next):
        # Skip logging for health checks
        if request.url.path == "/api/v1/system/health":
            return await call_next(request)
        
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {request.client.host}"
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            f"Response: {request.method} {request.url.path} "
            f"status={response.status_code} "
            f"duration={duration:.3f}s"
        )
        
        # Add timing header
        response.headers["X-Process-Time"] = f"{duration:.3f}"
        
        return response
