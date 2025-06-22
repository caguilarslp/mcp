"""
API Configuration
Settings specific to the FastAPI application
"""

import os
from typing import List


class APIConfig:
    """API-specific configuration"""
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8000",
        "https://wadm.app",  # Future production domain
    ]
    
    # Rate limiting
    RATE_LIMIT_CALLS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    # API Keys (from environment)
    API_KEY_HEADER: str = "X-API-Key"
    MASTER_API_KEY: str = os.getenv("WADM_MASTER_API_KEY", "wadm-dev-key-change-in-production")
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 100
    MAX_PAGE_SIZE: int = 1000
    
    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_MAX_CONNECTIONS: int = 100
    
    # Cache settings
    CACHE_TTL: int = 300  # 5 minutes default
    CACHE_ENABLED: bool = True
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    CACHE_TTL_CANDLES: int = 60  # 1 minute for candles
    CACHE_TTL_MARKET_STATS: int = 30  # 30 seconds for market stats
    CACHE_TTL_ORDERBOOK: int = 10  # 10 seconds for orderbook
    CACHE_TTL_INDICATORS: int = 120  # 2 minutes for indicators
    CACHE_PREFIX: str = "wadm:api:"
    
    # Response settings
    PRETTY_JSON: bool = os.getenv("WADM_API_PRETTY_JSON", "false").lower() == "true"
    
    # Security
    ENABLE_DOCS: bool = os.getenv("WADM_API_ENABLE_DOCS", "true").lower() == "true"
    REQUIRE_AUTH_FOR_DOCS: bool = os.getenv("WADM_API_REQUIRE_AUTH_DOCS", "false").lower() == "true"
