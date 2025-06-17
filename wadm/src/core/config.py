"""
Core configuration module for WADM
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )
    
    # Application
    APP_NAME: str = "WADM"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = Field(default="development", pattern="^(development|staging|production)$")
    LOG_LEVEL: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    
    # API
    API_KEY: str = Field(default="development_key", min_length=10)
    ALLOWED_ORIGINS: List[str] = Field(default=["http://localhost:3000"])
    
    # Database
    MONGODB_URL: str = Field(
        default="mongodb://wadm:wadm_secure_pass@localhost:27017/wadm?authSource=admin"
    )
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    
    # Exchange API Keys (optional)
    BYBIT_API_KEY: Optional[str] = None
    BYBIT_API_SECRET: Optional[str] = None
    BINANCE_API_KEY: Optional[str] = None
    BINANCE_API_SECRET: Optional[str] = None
    
    # WebSocket Configuration
    WS_RECONNECT_INTERVAL: int = Field(default=5, ge=1, le=60)
    WS_PING_INTERVAL: int = Field(default=30, ge=10, le=300)
    WS_MAX_RECONNECT_ATTEMPTS: int = Field(default=10, ge=1, le=100)
    
    # Data Retention (seconds)
    TRADES_RETENTION: int = Field(default=3600, ge=300)  # Min 5 minutes
    ORDERBOOK_RETENTION: int = Field(default=86400, ge=3600)  # Min 1 hour
    KLINES_1M_RETENTION: int = Field(default=86400, ge=3600)  # Min 1 hour
    KLINES_1H_RETENTION: int = Field(default=604800, ge=86400)  # Min 1 day
    
    # Performance Settings
    MAX_CONCURRENT_CONNECTIONS: int = Field(default=10, ge=1, le=50)
    BUFFER_SIZE: int = Field(default=10000, ge=1000, le=100000)
    BATCH_SIZE: int = Field(default=1000, ge=100, le=10000)
    
    # MCP Settings
    MCP_SERVER_NAME: str = "wadm"
    MCP_SERVER_VERSION: str = "0.1.0"
    
    @field_validator("API_KEY")
    @classmethod
    def validate_api_key(cls, v: str, info) -> str:
        """Ensure API key is not default in production."""
        if info.data.get("ENVIRONMENT") == "production" and v == "development_key":
            raise ValueError("Must set a secure API_KEY in production")
        return v
    
    @field_validator("MONGODB_URL")
    @classmethod
    def validate_mongodb_url(cls, v: str) -> str:
        """Validate MongoDB connection string."""
        if not v.startswith(("mongodb://", "mongodb+srv://")):
            raise ValueError("Invalid MongoDB URL format")
        return v
    
    @field_validator("REDIS_URL")
    @classmethod
    def validate_redis_url(cls, v: str) -> str:
        """Validate Redis connection string."""
        if not v.startswith("redis://"):
            raise ValueError("Invalid Redis URL format")
        return v
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT == "production"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
