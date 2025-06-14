"""
Configuration management for Cloud MarketData MCP Server

Uses Pydantic Settings for environment-based configuration
with validation and type safety.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseModel):
    """Database configuration settings"""
    mongodb_uri: str = Field(default="mongodb://localhost:27017/cloud_marketdata")
    redis_uri: str = Field(default="redis://localhost:6379/0")
    connection_timeout: int = Field(default=10)
    retry_attempts: int = Field(default=3)


class ExchangeSettings(BaseModel):
    """Exchange API configuration"""
    bybit_base_url: str = Field(default="wss://stream.bybit.com/v5/public/spot")
    binance_base_url: str = Field(default="wss://stream.binance.com:9443/ws")
    reconnect_delay: int = Field(default=5)
    max_reconnect_attempts: int = Field(default=10)


class RetentionSettings(BaseModel):
    """Data retention policies"""
    raw_data_hours: int = Field(default=1)
    minute_data_hours: int = Field(default=24)
    hourly_data_days: int = Field(default=7)
    cleanup_interval_minutes: int = Field(default=30)


class Settings(BaseSettings):
    """Main application settings"""
    
    # Application
    APP_NAME: str = Field(default="Cloud MarketData MCP Server")
    VERSION: str = Field(default="0.1.0")
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")
    
    # Server
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    WORKERS: int = Field(default=1)
    
    # Database
    MONGODB_URI: str = Field(default="mongodb://localhost:27017/cloud_marketdata")
    REDIS_URI: str = Field(default="redis://localhost:6379/0")
    
    # MCP Server
    MCP_PORT: int = Field(default=3001)
    MCP_HOST: str = Field(default="localhost")
    
    # Trading Symbols
    SYMBOLS: List[str] = Field(default=["BTCUSDT", "ETHUSDT", "ADAUSDT"])
    
    # Nested settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    exchanges: ExchangeSettings = Field(default_factory=ExchangeSettings)
    retention: RetentionSettings = Field(default_factory=RetentionSettings)
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Update nested settings with main settings
        self.database.mongodb_uri = self.MONGODB_URI
        self.database.redis_uri = self.REDIS_URI
