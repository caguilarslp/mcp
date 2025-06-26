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
        self.usage_tracker = {}  # Simple in-memory tracker (can be moved to Redis later)
        self._initialize_providers()
        
        logger.info(f"LLMService initialized with providers: {self.config.get_available_providers()}")
    
    def _initialize_providers(self):
        """Initialize available LLM providers"""
        # Placeholder for provider initialization
        # Will be implemented in FASE 2
        available = self.config.get_available_providers()
        logger.info(f"Available LLM providers: {available}")
        
        if not available:
            logger.warning("No LLM providers configured - service will not function")
    
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
        
        try:
            # Rate limiting check
            await self._check_rate_limits(user_id)
            
            # Build market context (placeholder for now)
            context = await self._build_market_context(request.symbol)
            
            # Select provider
            provider = self._select_provider(request.provider)
            
            # Execute analysis (placeholder)
            result = await self._execute_analysis(request, context, provider)
            
            # Calculate metrics
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Log usage
            await self._log_usage(user_id, request, result, processing_time, True)
            
            return ChatResponse(
                response=result.get("response", "Analysis completed"),
                provider_used=provider,
                tokens_used=result.get("tokens_used", 0),
                cost_usd=result.get("cost_usd", 0.0),
                processing_time_ms=processing_time,
                context_symbols=[request.symbol]
            )
            
        except Exception as e:
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            logger.error(f"LLM analysis failed for user {user_id}: {str(e)}")
            
            # Log failed usage
            await self._log_usage(user_id, request, {}, processing_time, False, str(e))
            
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
        """Execute LLM analysis - placeholder for FASE 2"""
        # Placeholder implementation
        logger.info(f"Executing analysis with {provider.value} provider")
        
        # Simulate processing
        await asyncio.sleep(0.1)
        
        return {
            "response": f"Market analysis for {request.symbol}: {request.message}",
            "tokens_used": 100,  # Placeholder
            "cost_usd": 0.01    # Placeholder
        }
    
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