"""
Google Provider - Server-side Gemini integration  
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
    import google.generativeai as genai
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    logger.warning("Google AI package not installed. Run: pip install google-generativeai")


class GoogleProvider(BaseProvider):
    """
    Google Gemini provider - server-side only
    Implements secure Gemini Pro integration
    """
    
    def __init__(self, api_key: str):
        """Initialize Google provider"""
        if not GOOGLE_AVAILABLE:
            raise ProviderError(
                "Google AI package not available", 
                "google", 
                "PACKAGE_MISSING"
            )
        
        if not api_key:
            raise ProviderError(
                "Google API key required", 
                "google", 
                "API_KEY_MISSING"
            )
        
        super().__init__(api_key, "google")
        
        # Google-specific pricing (Gemini Pro)
        self.input_price_per_1k = 0.00125   # $1.25 per 1M tokens
        self.output_price_per_1k = 0.00375  # $3.75 per 1M tokens
        
        # Model configuration
        self.model = "gemini-1.5-pro"
        self.max_tokens = 4000
        self.temperature = 0.1  # Low temperature for analytical responses
    
    def _initialize_client(self) -> None:
        """Initialize Google client"""
        try:
            genai.configure(api_key=self.api_key)
            self.client = genai.GenerativeModel(self.model)
            logger.info("Google Gemini client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Google client: {str(e)}")
            raise ProviderError(
                f"Google client initialization failed: {str(e)}", 
                "google", 
                "CLIENT_INIT_ERROR"
            )
    
    async def analyze(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze market using Gemini
        
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
            
            # Configure generation
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=self.max_tokens,
                temperature=self.temperature,
            )
            
            # Execute Gemini analysis
            response = await asyncio.to_thread(
                self.client.generate_content,
                prompt,
                generation_config=generation_config
            )
            
            # Extract response data
            response_text = response.text if response.text else ""
            
            # Estimate token usage (Gemini doesn't always provide exact counts)
            input_tokens = self._estimate_tokens(prompt)
            output_tokens = self._estimate_tokens(response_text)
            total_tokens = input_tokens + output_tokens
            
            # Calculate cost
            cost_usd = self._calculate_google_cost(input_tokens, output_tokens)
            
            logger.info(f"Google analysis completed - Tokens: {total_tokens}, Cost: ${cost_usd:.4f}")
            
            return {
                "response": response_text,
                "tokens_used": total_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost_usd,
                "model": self.model,
                "provider": "google"
            }
            
        except Exception as e:
            logger.error(f"Google analysis failed: {str(e)}")
            raise ProviderError(
                f"Google analysis failed: {str(e)}", 
                "google", 
                "ANALYSIS_ERROR"
            )
    
    async def stream_analyze(
        self, 
        request: ChatRequest, 
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream analysis response from Gemini
        """
        try:
            # Sanitize context
            safe_context = self._sanitize_context(context)
            
            # Build prompt
            prompt = self._build_prompt(request, safe_context)
            
            # Configure generation
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=self.max_tokens,
                temperature=self.temperature,
            )
            
            # Start streaming (simulate streaming for Google as it doesn't have native streaming)
            response = await asyncio.to_thread(
                self.client.generate_content,
                prompt,
                generation_config=generation_config
            )
            
            response_text = response.text if response.text else ""
            
            # Simulate streaming by yielding chunks
            words = response_text.split()
            chunk_size = 5  # Words per chunk
            partial_response = ""
            
            for i in range(0, len(words), chunk_size):
                chunk_words = words[i:i + chunk_size]
                chunk_text = " ".join(chunk_words) + " "
                partial_response += chunk_text
                
                yield {
                    "delta": chunk_text,
                    "response": partial_response,
                    "tokens_used": self._estimate_tokens(partial_response),
                    "provider": "google",
                    "streaming": True
                }
                
                # Small delay to simulate streaming
                await asyncio.sleep(0.05)
            
            # Final response with accurate metrics
            input_tokens = self._estimate_tokens(prompt)
            output_tokens = self._estimate_tokens(response_text)
            cost_usd = self._calculate_google_cost(input_tokens, output_tokens)
            
            yield {
                "delta": "",
                "response": response_text,
                "tokens_used": input_tokens + output_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost_usd,
                "provider": "google",
                "streaming": False,
                "completed": True
            }
            
        except Exception as e:
            logger.error(f"Google streaming failed: {str(e)}")
            yield {
                "error": str(e),
                "provider": "google",
                "streaming": False,
                "completed": True
            }
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for Google (rough approximation)"""
        # Google uses different tokenization, this is a rough estimate
        return int(len(text.split()) * 1.3)  # Approximate: 1.3 tokens per word
    
    def _calculate_google_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for Google Gemini Pro"""
        input_cost = (input_tokens / 1000) * self.input_price_per_1k
        output_cost = (output_tokens / 1000) * self.output_price_per_1k
        return round(input_cost + output_cost, 6)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Google service health"""
        try:
            # Simple test message
            test_response = await asyncio.to_thread(
                self.client.generate_content,
                "Hello"
            )
            
            return {
                'provider': 'google',
                'status': 'healthy',
                'model': self.model,
                'test_response_length': len(test_response.text) if test_response.text else 0,
                'timestamp': self._get_timestamp()
            }
            
        except Exception as e:
            return {
                'provider': 'google',
                'status': 'error',
                'error': str(e),
                'timestamp': self._get_timestamp()
            }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat() 