"""
LLM Service - Secure server-side LLM integration
Handles all LLM operations with security, rate limiting, and monitoring
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import logging

from .config import LLMConfig
from .models import ChatRequest, ChatResponse, LLMProvider, LLMUsageLog, LLMError
from src.logger import get_logger

logger = get_logger(__name__)


class LLMService:
    """
    Secure LLM service with rate limiting and monitoring
    Follows WADM service pattern for consistency
    """
    
    def __init__(self):
        """Initialize LLM service"""
        self.config = LLMConfig()
        self.providers = {}
        
        # Initialize security components (FASE 3)
        try:
            from .security.rate_limiter import RedisRateLimiter
            from .security.audit import AuditLogger
            from .security.sanitizer import DataSanitizer
            
            self.rate_limiter = RedisRateLimiter()
            self.audit_logger = AuditLogger()
            self.sanitizer = DataSanitizer()
            
            logger.info("✅ FASE 3 security components initialized successfully")
        except Exception as e:
            logger.warning(f"FASE 3 security components failed, using fallback: {str(e)}")
            self.usage_tracker = {}  # Fallback to in-memory
            self.rate_limiter = None
            self.audit_logger = None
            self.sanitizer = None
        
        self._initialize_providers()
        
        logger.info(f"LLMService initialized with providers: {self.config.get_available_providers()}")
    
    def _initialize_providers(self):
        """Initialize available LLM providers"""
        from .providers import AnthropicProvider, OpenAIProvider, GoogleProvider, ProviderError
        
        available = self.config.get_available_providers()
        logger.info(f"Available LLM providers: {available}")
        
        # Initialize each available provider
        for provider_name in available:
            try:
                if provider_name == "anthropic" and self.config.ANTHROPIC_API_KEY:
                    self.providers[provider_name] = AnthropicProvider(self.config.ANTHROPIC_API_KEY)
                elif provider_name == "openai" and self.config.OPENAI_API_KEY:
                    self.providers[provider_name] = OpenAIProvider(self.config.OPENAI_API_KEY)
                elif provider_name == "google" and self.config.GOOGLE_API_KEY:
                    self.providers[provider_name] = GoogleProvider(self.config.GOOGLE_API_KEY)
                    
                logger.info(f"✅ {provider_name.title()} provider initialized")
                
            except ProviderError as e:
                logger.warning(f"❌ Failed to initialize {provider_name}: {e.message}")
            except Exception as e:
                logger.error(f"❌ Unexpected error initializing {provider_name}: {str(e)}")
        
        if not self.providers:
            logger.warning("No LLM providers configured - service will not function")
        else:
            logger.info(f"✅ Initialized {len(self.providers)} LLM providers: {list(self.providers.keys())}")
    
    async def analyze_market(
        self, 
        request: ChatRequest, 
        user_id: str
    ) -> ChatResponse:
        """
        Main method for market analysis using LLM
        
        Args:
            request: Chat request with message and context
            user_id: User identifier for rate limiting
            
        Returns:
            ChatResponse with analysis and usage metrics
        """
        start_time = datetime.now()
        
        # Sanitize request data (FASE 3)
        sanitized_request = request
        if self.sanitizer:
            try:
                request_dict = {
                    "message": request.message,
                    "symbol": request.symbol,
                    "provider": request.provider.value if request.provider else None,
                    "include_indicators": request.include_indicators,
                    "include_market_data": request.include_market_data
                }
                
                sanitized_dict = self.sanitizer.sanitize_request_data(request_dict)
                
                # Validate sanitization
                validation = self.sanitizer.validate_clean_data(request.message, sanitized_dict["message"])
                if not validation["is_valid"]:
                    logger.warning(f"Sanitization validation failed: {validation}")
                
                # Create sanitized request
                from .models import LLMProvider
                sanitized_request = ChatRequest(
                    message=sanitized_dict["message"],
                    symbol=sanitized_dict["symbol"],
                    provider=LLMProvider(sanitized_dict["provider"]) if sanitized_dict["provider"] else None,
                    include_indicators=sanitized_dict["include_indicators"],
                    include_market_data=sanitized_dict["include_market_data"]
                )
                
            except Exception as e:
                logger.error(f"Error sanitizing request: {str(e)}")
                # Continue with original request if sanitization fails
        
        # Start audit logging (FASE 3)
        audit_id = ""
        if self.audit_logger:
            audit_id = self.audit_logger.log_request(user_id, sanitized_request)
        
        try:
            # Rate limiting check (Redis-based for FASE 3)
            if self.rate_limiter:
                is_allowed, limits_info = self.rate_limiter.check_limits(user_id)
                if not is_allowed:
                    # Log rate limit exceeded
                    if self.audit_logger:
                        self.audit_logger.log_rate_limit_exceeded(user_id, "request_limit", limits_info)
                    raise Exception(f"Rate limit exceeded: {limits_info}")
            else:
                # Fallback to in-memory rate limiting
                await self._check_rate_limits(user_id)
            
            # Build market context (placeholder for now)
            context = await self._build_market_context(sanitized_request.symbol)
            
            # Select provider
            provider = self._select_provider(sanitized_request.provider)
            
            # Execute analysis (placeholder)
            result = await self._execute_analysis(sanitized_request, context, provider)
            
            # Calculate metrics
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Update rate limiter usage (Redis-based for FASE 3)
            if self.rate_limiter:
                self.rate_limiter.increment_usage(
                    user_id,
                    result.get("tokens_used", 0),
                    result.get("cost_usd", 0.0),
                    provider.value
                )
            
            # Create response
            response = ChatResponse(
                response=result.get("response", "Analysis completed"),
                provider_used=provider,
                tokens_used=result.get("tokens_used", 0),
                cost_usd=result.get("cost_usd", 0.0),
                processing_time_ms=processing_time,
                context_symbols=[sanitized_request.symbol]
            )
            
            # Log successful response (FASE 3)
            if self.audit_logger:
                self.audit_logger.log_response(audit_id, user_id, response, True)
            
            # Log usage (legacy)
            await self._log_usage(user_id, sanitized_request, result, processing_time, True)
            
            return response
            
        except Exception as e:
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            logger.error(f"LLM analysis failed for user {user_id}: {str(e)}")
            
            # Log failed response (FASE 3)
            if self.audit_logger:
                self.audit_logger.log_response(audit_id, user_id, None, False, str(e))
            
            # Log failed usage (legacy)
            await self._log_usage(user_id, sanitized_request, {}, processing_time, False, str(e))
            
            raise e
    
    async def _check_rate_limits(self, user_id: str) -> None:
        """Check if user is within rate limits"""
        now = datetime.now()
        
        # Get user usage
        user_usage = self.usage_tracker.get(user_id, {
            "hourly_requests": [],
            "daily_requests": [],
            "daily_cost": 0.0
        })
        
        # Clean old entries
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        user_usage["hourly_requests"] = [
            req_time for req_time in user_usage["hourly_requests"] 
            if req_time > hour_ago
        ]
        
        user_usage["daily_requests"] = [
            req_time for req_time in user_usage["daily_requests"] 
            if req_time > day_ago
        ]
        
        # Check limits
        if len(user_usage["hourly_requests"]) >= self.config.RATE_LIMIT_REQUESTS_PER_HOUR:
            raise Exception(f"Rate limit exceeded: {self.config.RATE_LIMIT_REQUESTS_PER_HOUR} requests per hour")
        
        if len(user_usage["daily_requests"]) >= self.config.RATE_LIMIT_REQUESTS_PER_DAY:
            raise Exception(f"Rate limit exceeded: {self.config.RATE_LIMIT_REQUESTS_PER_DAY} requests per day")
        
        if user_usage["daily_cost"] >= float(self.config.RATE_LIMIT_COST_PER_DAY_USD):
            raise Exception(f"Cost limit exceeded: ${self.config.RATE_LIMIT_COST_PER_DAY_USD} per day")
        
        # Update usage tracker
        user_usage["hourly_requests"].append(now)
        user_usage["daily_requests"].append(now)
        self.usage_tracker[user_id] = user_usage
    
    async def _build_market_context(self, symbol: str) -> Dict[str, Any]:
        """Build market context for LLM analysis"""
        # Placeholder - will integrate with existing indicators in FASE 2
        context = {
            "symbol": symbol,
            "timestamp": datetime.now().isoformat(),
            "indicators": {},  # Will populate with real data
            "market_data": {}  # Will populate with real data
        }
        
        logger.debug(f"Built market context for {symbol}")
        return context
    
    def _select_provider(self, preferred: Optional[LLMProvider]) -> LLMProvider:
        """Select best available provider"""
        available = self.config.get_available_providers()
        
        if not available:
            raise Exception("No LLM providers available")
        
        if preferred and preferred.value in available:
            return preferred
        
        # Use default provider
        if self.config.DEFAULT_PROVIDER in available:
            return LLMProvider(self.config.DEFAULT_PROVIDER)
        
        # Fallback to first available
        return LLMProvider(available[0])
    
    async def _execute_analysis(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any], 
        provider: LLMProvider
    ) -> Dict[str, Any]:
        """Execute LLM analysis using real provider"""
        logger.info(f"Executing analysis with {provider.value} provider")
        
        # Get the initialized provider
        if provider.value not in self.providers:
            raise Exception(f"Provider {provider.value} not available")
        
        provider_instance = self.providers[provider.value]
        
        # Execute analysis using the provider
        result = await provider_instance.analyze(request, context)
        
        return result
    
    async def _log_usage(
        self, 
        user_id: str, 
        request: ChatRequest, 
        result: Dict[str, Any], 
        processing_time: int,
        success: bool,
        error_message: Optional[str] = None
    ) -> None:
        """Log LLM usage for monitoring and billing"""
        usage_log = LLMUsageLog(
            user_id=user_id,
            query_preview=request.message[:self.config.LOG_QUERY_PREVIEW_LENGTH],
            provider=LLMProvider(result.get("provider", "unknown")),
            tokens_used=result.get("tokens_used", 0),
            cost_usd=result.get("cost_usd", 0.0),
            success=success,
            error_message=error_message,
            processing_time_ms=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
        # Update daily cost tracking
        if user_id in self.usage_tracker and success:
            self.usage_tracker[user_id]["daily_cost"] += usage_log.cost_usd
        
        # Log for monitoring (can be enhanced to store in database)
        log_level = logging.INFO if success else logging.ERROR
        logger.log(
            log_level,
            f"LLM Usage - User: {user_id}, Provider: {usage_log.provider}, "
            f"Tokens: {usage_log.tokens_used}, Cost: ${usage_log.cost_usd:.4f}, "
            f"Time: {processing_time}ms, Success: {success}"
        )
    
    def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get usage statistics for a user"""
        user_usage = self.usage_tracker.get(user_id, {})
        return {
            "requests_today": len(user_usage.get("daily_requests", [])),
            "cost_today": user_usage.get("daily_cost", 0.0),
            "limit_requests_day": self.config.RATE_LIMIT_REQUESTS_PER_DAY,
            "limit_cost_day": float(self.config.RATE_LIMIT_COST_PER_DAY_USD)
        } 