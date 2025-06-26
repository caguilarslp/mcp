"""
FastAPI Security Middleware for LLM Service
Handles request validation, security headers, and CORS
"""

import json
import time
from typing import Dict, Any, Optional

try:
    from fastapi import Request, Response, HTTPException, status
    from fastapi.middleware.base import BaseHTTPMiddleware
    from fastapi.responses import JSONResponse
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    # Fallback classes for when FastAPI is not available
    class BaseHTTPMiddleware:
        pass
    class Request:
        pass
    class Response:
        pass
    class JSONResponse:
        pass

from ..config import LLMConfig
from .sanitizer import DataSanitizer
from src.logger import get_logger

logger = get_logger(__name__)


class LLMSecurityMiddleware(BaseHTTPMiddleware):
    """
    Security middleware for LLM endpoints
    Provides request validation, sanitization, and security headers
    """
    
    def __init__(self, app, config: LLMConfig = None):
        """Initialize security middleware"""
        super().__init__(app)
        self.config = config or LLMConfig()
        self.sanitizer = DataSanitizer()
        
        # Paths that require LLM security
        self.protected_paths = [
            "/api/v1/chat/",
            "/api/v1/llm/"
        ]
        
        # Security headers
        self.security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
        
        logger.info("✅ LLM Security Middleware initialized")
    
    async def dispatch(self, request: Request, call_next):
        """Main middleware dispatch"""
        start_time = time.time()
        
        try:
            # Check if this is a protected path
            if self._is_protected_path(request.url.path):
                # Apply security measures
                security_result = await self._apply_security_measures(request)
                if security_result:
                    return security_result
            
            # Process request
            response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(response)
            
            # Log request
            processing_time = int((time.time() - start_time) * 1000)
            await self._log_request(request, response, processing_time)
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": "Internal security error"}
            )
    
    def _is_protected_path(self, path: str) -> bool:
        """Check if path requires LLM security"""
        return any(path.startswith(protected) for protected in self.protected_paths)
    
    async def _apply_security_measures(self, request: Request) -> Optional[Response]:
        """Apply security measures to request"""
        try:
            # 1. Validate request method
            if request.method not in ["GET", "POST", "OPTIONS"]:
                logger.warning(f"Invalid method {request.method} for LLM endpoint")
                return JSONResponse(
                    status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
                    content={"error": "Method not allowed"}
                )
            
            # 2. Handle CORS preflight
            if request.method == "OPTIONS":
                return await self._handle_cors_preflight(request)
            
            # 3. Validate Content-Type for POST requests
            if request.method == "POST":
                content_type = request.headers.get("content-type", "")
                if not content_type.startswith("application/json"):
                    return JSONResponse(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        content={"error": "Content-Type must be application/json"}
                    )
            
            # 4. Check request size
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > 1024 * 1024:  # 1MB limit
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"error": "Request too large"}
                )
            
            # 5. Validate and sanitize request body
            if request.method == "POST":
                sanitization_result = await self._sanitize_request_body(request)
                if sanitization_result:
                    return sanitization_result
            
            # 6. Check for suspicious patterns
            if self._detect_suspicious_patterns(request):
                logger.warning(f"Suspicious request detected: {request.url}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Request blocked by security filter"}
                )
            
            return None  # Allow request to proceed
            
        except Exception as e:
            logger.error(f"Error applying security measures: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": "Security validation failed"}
            )
    
    async def _handle_cors_preflight(self, request: Request) -> Response:
        """Handle CORS preflight requests"""
        origin = request.headers.get("origin")
        
        # Check if origin is allowed
        allowed_origins = ["http://localhost:3000", "http://localhost:8000"]
        
        if origin not in allowed_origins:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"error": "CORS origin not allowed"}
            )
        
        return Response(
            status_code=status.HTTP_200_OK,
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400"
            }
        )
    
    async def _sanitize_request_body(self, request: Request) -> Optional[Response]:
        """Sanitize request body"""
        try:
            # Read body once
            body = await request.body()
            if not body:
                return None
            
            # Parse JSON
            try:
                data = json.loads(body.decode())
            except json.JSONDecodeError:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Invalid JSON in request body"}
                )
            
            # Sanitize data
            sanitized_data = await self.sanitizer.sanitize_request_data(data)
            
            # Check if sanitization removed critical data
            if self._is_sanitization_too_aggressive(data, sanitized_data):
                logger.warning("Aggressive sanitization detected, blocking request")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Request contains potentially harmful content"}
                )
            
            # Replace request body with sanitized version
            sanitized_body = json.dumps(sanitized_data).encode()
            request._body = sanitized_body
            
            return None
            
        except Exception as e:
            logger.error(f"Error sanitizing request body: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "Request sanitization failed"}
            )
    
    def _detect_suspicious_patterns(self, request: Request) -> bool:
        """Detect suspicious patterns in request"""
        try:
            # Check for common attack patterns in headers
            suspicious_headers = [
                "x-forwarded-for",
                "x-real-ip",
                "x-originating-ip"
            ]
            
            for header in suspicious_headers:
                value = request.headers.get(header, "")
                if self._contains_suspicious_content(value):
                    return True
            
            # Check user agent
            user_agent = request.headers.get("user-agent", "")
            if self._is_suspicious_user_agent(user_agent):
                return True
            
            # Check for SQL injection patterns in URL
            if self._contains_sql_injection_patterns(str(request.url)):
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error detecting suspicious patterns: {str(e)}")
            return False
    
    def _contains_suspicious_content(self, content: str) -> bool:
        """Check if content contains suspicious patterns"""
        suspicious_patterns = [
            "<script",
            "javascript:",
            "vbscript:",
            "onload=",
            "onerror=",
            "eval(",
            "exec(",
            "../",
            "..\\",
            "%2e%2e%2f",
            "%2e%2e%5c"
        ]
        
        content_lower = content.lower()
        return any(pattern in content_lower for pattern in suspicious_patterns)
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if user agent is suspicious"""
        if not user_agent:
            return True
        
        suspicious_agents = [
            "bot",
            "crawler",
            "spider",
            "scanner",
            "curl",
            "wget",
            "python-requests",
            "nikto",
            "sqlmap"
        ]
        
        user_agent_lower = user_agent.lower()
        return any(agent in user_agent_lower for agent in suspicious_agents)
    
    def _contains_sql_injection_patterns(self, url: str) -> bool:
        """Check for SQL injection patterns"""
        sql_patterns = [
            "union select",
            "or 1=1",
            "' or '1'='1",
            "drop table",
            "insert into",
            "delete from",
            "update set"
        ]
        
        url_lower = url.lower()
        return any(pattern in url_lower for pattern in sql_patterns)
    
    def _is_sanitization_too_aggressive(self, original: Dict, sanitized: Dict) -> bool:
        """Check if sanitization was too aggressive"""
        try:
            # Check if critical fields were removed
            critical_fields = ["message", "symbol", "provider"]
            
            for field in critical_fields:
                if field in original and field not in sanitized:
                    return True
                
                if (field in original and field in sanitized and 
                    len(str(sanitized[field])) < len(str(original[field])) * 0.5):
                    return True
            
            return False
            
        except Exception:
            return False
    
    def _add_security_headers(self, response: Response) -> None:
        """Add security headers to response"""
        try:
            for header, value in self.security_headers.items():
                response.headers[header] = value
            
            # Add CORS headers for API responses
            response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            
        except Exception as e:
            logger.error(f"Error adding security headers: {str(e)}")
    
    async def _log_request(self, request: Request, response: Response, processing_time: int) -> None:
        """Log request for security monitoring"""
        try:
            # Get client IP
            client_ip = request.client.host if request.client else "unknown"
            
            # Get user agent
            user_agent = request.headers.get("user-agent", "unknown")
            
            # Log basic info
            log_data = {
                "timestamp": time.time(),
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query) if request.url.query else None,
                "client_ip": client_ip,
                "user_agent": user_agent[:100],  # Truncate long user agents
                "status_code": response.status_code,
                "processing_time_ms": processing_time
            }
            
            # Log at appropriate level
            if response.status_code >= 400:
                logger.warning(f"LLM security request failed: {json.dumps(log_data)}")
            elif request.url.path.startswith("/api/v1/chat/"):
                logger.info(f"LLM request: {request.method} {request.url.path} -> {response.status_code}")
            else:
                logger.debug(f"LLM security request: {json.dumps(log_data)}")
            
        except Exception as e:
            logger.error(f"Error logging request: {str(e)}") 