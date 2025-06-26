"""
Anthropic Provider - Server-side Claude integration
Secure implementation without browser exposure
"""

import asyncio
from typing import Dict, Any, AsyncGenerator
import json

from .base_provider import BaseProvider, ProviderError
from ..models import ChatRequest
from src.logger import get_logger

logger = get_logger(__name__)

try:
    from anthropic import AsyncAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic package not installed. Run: pip install anthropic")


class AnthropicProvider(BaseProvider):
    """
    Anthropic Claude provider - server-side only
    Implements secure Claude 3.5 Sonnet integration
    """
    
    def __init__(self, api_key: str):
        """Initialize Anthropic provider"""
        if not ANTHROPIC_AVAILABLE:
            raise ProviderError(
                "Anthropic package not available", 
                "anthropic", 
                "PACKAGE_MISSING"
            )
        
        if not api_key:
            raise ProviderError(
                "Anthropic API key required", 
                "anthropic", 
                "API_KEY_MISSING"
            )
        
        super().__init__(api_key, "anthropic")
        
        # Anthropic-specific pricing (Claude 3.5 Sonnet)
        self.input_price_per_1k = 0.003   # $3 per 1M tokens
        self.output_price_per_1k = 0.015  # $15 per 1M tokens
        
        # Model configuration
        self.model = "claude-3-5-sonnet-20241022"
        self.max_tokens = 4000
        self.temperature = 0.1  # Low temperature for analytical responses
    
    def _initialize_client(self) -> None:
        """Initialize Anthropic client"""
        try:
            self.client = AsyncAnthropic(api_key=self.api_key)
            logger.info("Anthropic client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic client: {str(e)}")
            raise ProviderError(
                f"Anthropic client initialization failed: {str(e)}", 
                "anthropic", 
                "CLIENT_INIT_ERROR"
            )
    
    async def analyze(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze market using Claude
        
        Args:
            request: Chat request with user message
            context: Market context data
            
        Returns:
            Dict with response, tokens_used, cost_usd
        """
        try:
            # Sanitize context
            safe_context = self._sanitize_context(context)
            
            # Build prompt
            prompt = self._build_prompt(request, safe_context)
            
            # Execute Claude analysis
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # Extract response data
            response_text = response.content[0].text if response.content else ""
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            total_tokens = input_tokens + output_tokens
            
            # Calculate cost
            cost_usd = self._calculate_anthropic_cost(input_tokens, output_tokens)
            
            logger.info(f"Anthropic analysis completed - Tokens: {total_tokens}, Cost: ${cost_usd:.4f}")
            
            return {
                "response": response_text,
                "tokens_used": total_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost_usd,
                "model": self.model,
                "provider": "anthropic"
            }
            
        except Exception as e:
            logger.error(f"Anthropic analysis failed: {str(e)}")
            raise ProviderError(
                f"Anthropic analysis failed: {str(e)}", 
                "anthropic", 
                "ANALYSIS_ERROR"
            )
    
    async def stream_analyze(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream analysis response from Claude
        """
        try:
            # Sanitize context
            safe_context = self._sanitize_context(context)
            
            # Build prompt  
            prompt = self._build_prompt(request, safe_context)
            
            # Start streaming
            stream = await self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                stream=True
            )
            
            response_text = ""
            input_tokens = 0
            output_tokens = 0
            
            async for chunk in stream:
                if chunk.type == "content_block_delta":
                    delta_text = chunk.delta.text if hasattr(chunk.delta, 'text') else ""
                    response_text += delta_text
                    output_tokens += 1  # Approximate token counting
                    
                    yield {
                        "delta": delta_text,
                        "response": response_text,
                        "tokens_used": output_tokens,
                        "provider": "anthropic",
                        "streaming": True
                    }
                
                elif chunk.type == "message_start":
                    input_tokens = chunk.message.usage.input_tokens if hasattr(chunk.message, 'usage') else 0
                
                elif chunk.type == "message_delta":
                    if hasattr(chunk, 'usage'):
                        output_tokens = chunk.usage.output_tokens
            
            # Final response with accurate metrics
            cost_usd = self._calculate_anthropic_cost(input_tokens, output_tokens)
            
            yield {
                "delta": "",
                "response": response_text,
                "tokens_used": input_tokens + output_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost_usd,
                "provider": "anthropic",
                "streaming": False,
                "completed": True
            }
            
        except Exception as e:
            logger.error(f"Anthropic streaming failed: {str(e)}")
            yield {
                "error": str(e),
                "provider": "anthropic",
                "streaming": False,
                "completed": True
            }
    
    def _calculate_anthropic_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for Anthropic Claude 3.5 Sonnet"""
        input_cost = (input_tokens / 1000) * self.input_price_per_1k
        output_cost = (output_tokens / 1000) * self.output_price_per_1k
        return round(input_cost + output_cost, 6)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Anthropic service health"""
        try:
            # Simple test message
            test_response = await self.client.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[{"role": "user", "content": "Hello"}]
            )
            
            return {
                'provider': 'anthropic',
                'status': 'healthy',
                'model': self.model,
                'test_tokens': test_response.usage.input_tokens + test_response.usage.output_tokens,
                'timestamp': self._get_timestamp()
            }
            
        except Exception as e:
            return {
                'provider': 'anthropic',
                'status': 'error', 
                'error': str(e),
                'timestamp': self._get_timestamp()
            }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat() 