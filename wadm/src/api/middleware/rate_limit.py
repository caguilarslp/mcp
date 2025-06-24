"""
Enhanced Rate Limiting Middleware with per-API-key limits and session tracking.
"""
import time
import logging
from typing import Dict, Tuple, Optional
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from src.api.services.auth_service import AuthService
from src.api.services.session_service import SessionService
from src.storage.mongo_manager import MongoManager

logger = logging.getLogger(__name__)


class EnhancedRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Enhanced rate limiting middleware with:
    - Per API key rate limits
    - Session tracking
    - Token usage estimation
    """
    
    def __init__(self, app, default_calls_per_minute: int = 60, default_calls_per_hour: int = 1000):
        super().__init__(app)
        self.default_calls_per_minute = default_calls_per_minute
        self.default_calls_per_hour = default_calls_per_hour
        
        # In-memory storage for rate limiting
        # Format: {api_key: {"minute": (count, timestamp), "hour": (count, timestamp)}}
        self.rate_limit_storage: Dict[str, Dict[str, Tuple[int, float]]] = defaultdict(dict)
        
        # Services
        self._mongo: Optional[MongoManager] = None
        self._auth_service: Optional[AuthService] = None
        self._session_service: Optional[SessionService] = None
    
    @property
    def mongo(self) -> Optional[MongoManager]:
        if self._mongo is None:
            try:
                self._mongo = MongoManager()
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
        return self._mongo
    
    @property
    def auth_service(self) -> AuthService:
        if self._auth_service is None:
            self._auth_service = AuthService(self.mongo)
        return self._auth_service
    
    @property
    def session_service(self) -> SessionService:
        if self._session_service is None:
            self._session_service = SessionService(self.mongo)
        return self._session_service
    
    def _check_rate_limit(self, key: str, per_minute: int, per_hour: int) -> Tuple[bool, Optional[str]]:
        """
        Check if the rate limit has been exceeded.
        Returns (is_allowed, error_message)
        """
        current_time = time.time()
        current_minute = int(current_time // 60)
        current_hour = int(current_time // 3600)
        
        # Get or initialize rate limit data
        if key not in self.rate_limit_storage:
            self.rate_limit_storage[key] = {
                "minute": (0, current_minute),
                "hour": (0, current_hour)
            }
        
        rate_data = self.rate_limit_storage[key]
        
        # Check minute limit
        minute_count, minute_timestamp = rate_data.get("minute", (0, current_minute))
        if minute_timestamp == current_minute:
            if minute_count >= per_minute:
                return False, f"Rate limit exceeded: {per_minute} requests per minute"
        else:
            # Reset minute counter
            minute_count = 0
            minute_timestamp = current_minute
        
        # Check hour limit
        hour_count, hour_timestamp = rate_data.get("hour", (0, current_hour))
        if hour_timestamp == current_hour:
            if hour_count >= per_hour:
                return False, f"Rate limit exceeded: {per_hour} requests per hour"
        else:
            # Reset hour counter
            hour_count = 0
            hour_timestamp = current_hour
        
        # Update counters
        self.rate_limit_storage[key] = {
            "minute": (minute_count + 1, minute_timestamp),
            "hour": (hour_count + 1, hour_timestamp)
        }
        
        return True, None
    
    async def _estimate_tokens(self, request: Request, response: Response) -> int:
        """
        Estimate token usage based on request/response size.
        This is a rough estimation for demonstration.
        """
        # Simple estimation: 1 token per 4 characters
        request_size = len(str(request.url)) + len(await request.body())
        
        # For response, we'll estimate based on content length
        response_size = int(response.headers.get("content-length", 0))
        
        total_chars = request_size + response_size
        estimated_tokens = max(1, total_chars // 4)
        
        return estimated_tokens
    
    async def dispatch(self, request: Request, call_next):
        """
        Process the request with rate limiting and session tracking.
        """
        # Skip rate limiting for docs and health checks
        if request.url.path in ["/", "/api/docs", "/api/redoc", "/api/openapi.json", "/api/v1"]:
            return await call_next(request)
        
        # Extract API key
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return await call_next(request)
        
        # Get rate limits for this key
        try:
            # Master key gets higher limits
            from src.api.config import APIConfig
            config = APIConfig()
            
            if api_key == config.MASTER_API_KEY:
                per_minute = 300
                per_hour = 10000
                key_id = "master"
                session_id = None
            else:
                # Verify API key and get limits
                verification = await self.auth_service.verify_api_key(api_key)
                if not verification.valid:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid API key"
                    )
                
                per_minute = verification.rate_limit_per_minute or self.default_calls_per_minute
                per_hour = verification.rate_limit_per_hour or self.default_calls_per_hour
                key_id = verification.key_id
                
                # Get active session if exists
                session = await self.session_service.get_active_session(key_id)
                session_id = session.id if session else None
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying API key: {e}")
            return await call_next(request)
        
        # Check rate limits
        is_allowed, error_message = self._check_rate_limit(api_key, per_minute, per_hour)
        if not is_allowed:
            raise HTTPException(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                detail=error_message,
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit-Minute": str(per_minute),
                    "X-RateLimit-Limit-Hour": str(per_hour)
                }
            )
        
        # Track request timing
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate request duration
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Track session usage if applicable
        if session_id and request.url.path.startswith("/api/v1/indicators"):
            try:
                # Estimate tokens
                estimated_tokens = await self._estimate_tokens(request, response)
                
                # Track usage
                from src.api.models.session import SessionUsage
                usage = SessionUsage(
                    session_id=session_id,
                    endpoint=request.url.path,
                    tokens_used=estimated_tokens,
                    request_data={
                        "method": request.method,
                        "path": request.url.path,
                        "query": dict(request.query_params)
                    },
                    response_size=int(response.headers.get("content-length", 0)),
                    duration_ms=duration_ms,
                    timestamp=datetime.now(timezone.utc)
                )
                
                await self.session_service.track_usage(session_id, usage)
                
                # Add session info to response headers
                response.headers["X-Session-ID"] = session_id
                response.headers["X-Tokens-Used"] = str(estimated_tokens)
                
            except Exception as e:
                logger.error(f"Error tracking session usage: {e}")
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit-Minute"] = str(per_minute)
        response.headers["X-RateLimit-Limit-Hour"] = str(per_hour)
        
        return response
