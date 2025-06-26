"""
OpenAI Provider - Server-side GPT integration
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
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI package not installed. Run: pip install openai")


class OpenAIProvider(BaseProvider):
    """
    OpenAI GPT provider - server-side only
    Implements secure GPT-4o integration
    """
    
    def __init__(self, api_key: str):
        """Initialize OpenAI provider"""
        if not OPENAI_AVAILABLE:
            raise ProviderError(
                "OpenAI package not available", 
                "openai", 
                "PACKAGE_MISSING"
            )
        
        if not api_key:
            raise ProviderError(
                "OpenAI API key required", 
                "openai", 
                "API_KEY_MISSING"
            )
        
        super().__init__(api_key, "openai")
        
        # OpenAI-specific pricing (GPT-4o)
        self.input_price_per_1k = 0.005   # $5 per 1M tokens
        self.output_price_per_1k = 0.015  # $15 per 1M tokens
        
        # Model configuration
        self.model = "gpt-4o"
        self.max_tokens = 4000
        self.temperature = 0.1  # Low temperature for analytical responses
    
    def _initialize_client(self) -> None:
        """Initialize OpenAI client"""
        try:
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise ProviderError(
                f"OpenAI client initialization failed: {str(e)}", 
                "openai", 
                "CLIENT_INIT_ERROR"
            )
    
    async def analyze(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze market using GPT
        
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
            
            # Execute OpenAI analysis
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert cryptocurrency market analyst specializing in institutional trading patterns and quantitative analysis."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            # Extract response data
            response_text = response.choices[0].message.content if response.choices else ""
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens  
            total_tokens = response.usage.total_tokens
            
            # Calculate cost
            cost_usd = self._calculate_openai_cost(input_tokens, output_tokens)
            
            logger.info(f"OpenAI analysis completed - Tokens: {total_tokens}, Cost: ${cost_usd:.4f}")
            
            return {
                "response": response_text,
                "tokens_used": total_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost_usd,
                "model": self.model,
                "provider": "openai"
            }
            
        except Exception as e:
            logger.error(f"OpenAI analysis failed: {str(e)}")
            raise ProviderError(
                f"OpenAI analysis failed: {str(e)}", 
                "openai", 
                "ANALYSIS_ERROR"
            )
    
    async def stream_analyze(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream analysis response from GPT
        """
        try:
            # Sanitize context
            safe_context = self._sanitize_context(context)
            
            # Build prompt
            prompt = self._build_prompt(request, safe_context)
            
            # Start streaming
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert cryptocurrency market analyst specializing in institutional trading patterns and quantitative analysis."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stream=True
            )
            
            response_text = ""
            output_tokens = 0
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    delta_text = chunk.choices[0].delta.content
                    response_text += delta_text
                    output_tokens += 1  # Approximate token counting
                    
                    yield {
                        "delta": delta_text,
                        "response": response_text,
                        "tokens_used": output_tokens,
                        "provider": "openai",
                        "streaming": True
                    }
            
            # Estimate input tokens (OpenAI streaming doesn't provide usage stats)
            input_tokens = len(prompt.split()) * 1.3  # Rough estimation
            cost_usd = self._calculate_openai_cost(int(input_tokens), output_tokens)
            
            # Final response
            yield {
                "delta": "",
                "response": response_text,
                "tokens_used": int(input_tokens) + output_tokens,
                "input_tokens": int(input_tokens),
                "output_tokens": output_tokens,
                "cost_usd": cost_usd,
                "provider": "openai",
                "streaming": False,
                "completed": True
            }
            
        except Exception as e:
            logger.error(f"OpenAI streaming failed: {str(e)}")
            yield {
                "error": str(e),
                "provider": "openai",
                "streaming": False,
                "completed": True
            }
    
    def _calculate_openai_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for OpenAI GPT-4o"""
        input_cost = (input_tokens / 1000) * self.input_price_per_1k
        output_cost = (output_tokens / 1000) * self.output_price_per_1k
        return round(input_cost + output_cost, 6)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check OpenAI service health"""
        try:
            # Simple test message
            test_response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            
            return {
                'provider': 'openai',
                'status': 'healthy',
                'model': self.model,
                'test_tokens': test_response.usage.total_tokens,
                'timestamp': self._get_timestamp()
            }
            
        except Exception as e:
            return {
                'provider': 'openai',
                'status': 'error',
                'error': str(e),
                'timestamp': self._get_timestamp()
            }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat() 