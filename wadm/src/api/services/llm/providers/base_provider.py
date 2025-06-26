"""
Base Provider - Abstract base class for LLM providers
Defines common interface and shared functionality
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
import logging

from ..models import ChatRequest, LLMProvider
from src.logger import get_logger

logger = get_logger(__name__)


class ProviderError(Exception):
    """Custom exception for provider errors"""
    
    def __init__(self, message: str, provider: str, error_code: str = "PROVIDER_ERROR"):
        self.message = message
        self.provider = provider
        self.error_code = error_code
        super().__init__(self.message)


class BaseProvider(ABC):
    """
    Abstract base class for LLM providers
    Defines common interface and shared functionality
    """
    
    def __init__(self, api_key: str, provider_name: str):
        """
        Initialize base provider
        
        Args:
            api_key: API key for the provider
            provider_name: Name of the provider (anthropic, openai, google)
        """
        self.api_key = api_key
        self.provider_name = provider_name
        self.client = None
        self._initialize_client()
        
        logger.info(f"{provider_name.title()} provider initialized")
    
    @abstractmethod
    def _initialize_client(self) -> None:
        """Initialize the provider-specific client"""
        pass
    
    @abstractmethod
    async def analyze(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze market using the provider
        
        Args:
            request: Chat request with user message
            context: Market context data
            
        Returns:
            Dict with response, tokens_used, cost_usd
        """
        pass
    
    @abstractmethod
    async def stream_analyze(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream analysis response
        
        Args:
            request: Chat request with user message
            context: Market context data
            
        Yields:
            Dict with partial response data
        """
        pass
    
    def _build_prompt(self, request: ChatRequest, context: Dict[str, Any]) -> str:
        """
        Build prompt with market context
        Shared implementation for all providers
        """
        # Build comprehensive market analysis prompt
        prompt_parts = [
            "You are an expert cryptocurrency market analyst with deep knowledge of institutional trading patterns.",
            f"\nCurrent Analysis Request: {request.message}",
            f"\nTarget Symbol: {context.get('symbol', 'Unknown')}",
            f"\nAnalysis Timestamp: {context.get('timestamp', datetime.now().isoformat())}"
        ]
        
        # Add market data if available
        if context.get('market_data'):
            market_data = context['market_data']
            prompt_parts.append(f"\nCurrent Market Data:")
            for key, value in market_data.items():
                prompt_parts.append(f"- {key}: {value}")
        
        # Add indicators if available  
        if context.get('indicators'):
            indicators = context['indicators']
            prompt_parts.append(f"\nTechnical Indicators:")
            for indicator, data in indicators.items():
                prompt_parts.append(f"- {indicator}: {data}")
        
        # Add analysis instructions
        prompt_parts.extend([
            "\nProvide a comprehensive analysis including:",
            "1. Current market structure and trend analysis",
            "2. Key support/resistance levels", 
            "3. Volume analysis and institutional flow patterns",
            "4. Risk assessment and potential scenarios",
            "5. Actionable insights for institutional trading",
            "\nFocus on data-driven insights with specific price levels and quantitative analysis."
        ])
        
        return "\n".join(prompt_parts)
    
    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """
        Calculate cost based on token usage
        Should be overridden by providers with specific pricing
        """
        # Default pricing - will be overridden
        input_cost = input_tokens * 0.005 / 1000  # $0.005 per 1K tokens
        output_cost = output_tokens * 0.015 / 1000  # $0.015 per 1K tokens
        return round(input_cost + output_cost, 6)
    
    def _sanitize_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize context data before sending to LLM
        Remove sensitive information
        """
        sanitized = {}
        
        # Safe fields to include
        safe_fields = [
            'symbol', 'timestamp', 'current_price', 
            'indicators', 'market_data', 'volume_data'
        ]
        
        for field in safe_fields:
            if field in context:
                sanitized[field] = context[field]
        
        # Remove any fields that might contain sensitive data
        sensitive_patterns = ['key', 'token', 'secret', 'password', 'auth']
        for key in list(sanitized.keys()):
            if any(pattern in key.lower() for pattern in sensitive_patterns):
                del sanitized[key]
        
        return sanitized
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check provider health and availability
        """
        try:
            # Simple test to verify provider is responsive
            test_context = {
                'symbol': 'BTCUSDT',
                'timestamp': datetime.now().isoformat(),
                'indicators': {},
                'market_data': {}
            }
            
            test_request = ChatRequest(
                message="Health check test",
                symbol="BTCUSDT"
            )
            
            # This will be implemented by each provider
            # For now, return basic health info
            return {
                'provider': self.provider_name,
                'status': 'available' if self.client else 'unavailable',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed for {self.provider_name}: {str(e)}")
            return {
                'provider': self.provider_name,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            } 