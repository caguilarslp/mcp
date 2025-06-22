"""
Rate Limiting Middleware
Simple in-memory rate limiter (Redis-ready for production)
"""

import time
import logging
from collections import defaultdict, deque
from typing import Dict, Deque, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware
    TODO: Replace with Redis-based solution for production
    """
    
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        # Store request timestamps per IP
        self.requests: Dict[str, Deque[float]] = defaultdict(deque)
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for docs and system endpoints
        if request.url.path in ["/", "/api/docs", "/api/redoc", "/api/openapi.json", "/api/v1/system/health"]:
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host
        
        # Get API key if provided
        api_key = request.headers.get("X-API-Key")
        if api_key:
            # Use API key for rate limiting if provided
            client_id = f"key:{api_key}"
        else:
            client_id = f"ip:{client_ip}"
        
        # Current timestamp
        now = time.time()
        
        # Clean old requests
        requests = self.requests[client_id]
        while requests and requests[0] < now - self.period:
            requests.popleft()
        
        # Check rate limit
        if len(requests) >= self.calls:
            logger.warning(f"Rate limit exceeded for {client_id}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "message": "Rate limit exceeded",
                        "type": "rate_limit_error",
                        "retry_after": int(self.period - (now - requests[0]))
                    }
                },
                headers={
                    "X-RateLimit-Limit": str(self.calls),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(requests[0] + self.period))
                }
            )
        
        # Add current request
        requests.append(now)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.calls)
        response.headers["X-RateLimit-Remaining"] = str(self.calls - len(requests))
        response.headers["X-RateLimit-Reset"] = str(int(now + self.period))
        
        return response
