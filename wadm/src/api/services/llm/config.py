"""
LLM Service Configuration
Secure configuration for LLM providers
"""

import os
from typing import Dict, Optional
from decimal import Decimal


class LLMConfig:
    """LLM service configuration"""
    
    # API Keys (server-side only)
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY") 
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    
    # Rate limiting per user
    RATE_LIMIT_REQUESTS_PER_HOUR: int = int(os.getenv("LLM_RATE_LIMIT_HOUR", "50"))
    RATE_LIMIT_REQUESTS_PER_DAY: int = int(os.getenv("LLM_RATE_LIMIT_DAY", "200"))
    RATE_LIMIT_COST_PER_DAY_USD: Decimal = Decimal(os.getenv("LLM_COST_LIMIT_DAY", "10.00"))
    
    # Token limits
    MAX_TOKENS_PER_REQUEST: int = int(os.getenv("LLM_MAX_TOKENS", "4000"))
    MAX_CONTEXT_LENGTH: int = int(os.getenv("LLM_MAX_CONTEXT", "32000"))
    
    # Provider settings
    DEFAULT_PROVIDER: str = os.getenv("LLM_DEFAULT_PROVIDER", "anthropic")
    ENABLE_PROVIDER_FALLBACK: bool = os.getenv("LLM_ENABLE_FALLBACK", "true").lower() == "true"
    
    # Pricing (approximate USD per 1K tokens)
    PROVIDER_PRICING: Dict[str, Dict[str, Decimal]] = {
        "anthropic": {
            "input": Decimal("0.008"),   # Claude 3.5 Sonnet
            "output": Decimal("0.024")
        },
        "openai": {
            "input": Decimal("0.005"),   # GPT-4o
            "output": Decimal("0.015")
        },
        "google": {
            "input": Decimal("0.00125"), # Gemini Pro
            "output": Decimal("0.00375")
        }
    }
    
    # Security settings
    ENABLE_DATA_SANITIZATION: bool = os.getenv("LLM_SANITIZE_DATA", "true").lower() == "true"
    LOG_QUERY_PREVIEW_LENGTH: int = int(os.getenv("LLM_LOG_PREVIEW_LENGTH", "100"))
    
    # Performance settings
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("LLM_REQUEST_TIMEOUT", "30"))
    CONNECTION_POOL_SIZE: int = int(os.getenv("LLM_POOL_SIZE", "10"))
    
    # Cache settings (reuse existing cache config)
    CACHE_ENABLED: bool = os.getenv("LLM_CACHE_ENABLED", "true").lower() == "true"
    CACHE_TTL_SECONDS: int = int(os.getenv("LLM_CACHE_TTL", "300"))  # 5 minutes
    
    # Validation
    @classmethod
    def validate_config(cls) -> bool:
        """Validate that at least one provider is configured"""
        providers_available = [
            cls.ANTHROPIC_API_KEY is not None,
            cls.OPENAI_API_KEY is not None,
            cls.GOOGLE_API_KEY is not None
        ]
        return any(providers_available)
    
    @classmethod
    def get_available_providers(cls) -> list:
        """Get list of available providers"""
        providers = []
        if cls.ANTHROPIC_API_KEY:
            providers.append("anthropic")
        if cls.OPENAI_API_KEY:
            providers.append("openai")
        if cls.GOOGLE_API_KEY:
            providers.append("google")
        return providers 