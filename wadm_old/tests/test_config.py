"""
Test configuration and settings
"""

import os
import pytest
from unittest.mock import patch

from src.core.config import Settings, get_settings


class TestSettings:
    """Test application settings."""
    
    def test_default_settings(self):
        """Test default settings values."""
        settings = Settings()
        
        assert settings.environment == "development"
        assert settings.debug is True
        assert settings.app_name == "WADM"
        assert settings.version == "0.1.0"
        assert settings.api_port == 8920
        assert settings.log_level == "INFO"
    
    def test_mongodb_settings(self):
        """Test MongoDB settings."""
        settings = Settings()
        
        assert settings.mongodb_url == "mongodb://localhost:27017"
        assert settings.mongodb_database == "wadm"
        assert settings.mongodb_max_connections == 100
        assert settings.mongodb_min_connections == 10
    
    def test_redis_settings(self):
        """Test Redis settings."""
        settings = Settings()
        
        assert settings.redis_url == "redis://localhost:6379"
        assert settings.redis_max_connections == 20
        assert settings.redis_decode_responses is True
    
    @patch.dict(os.environ, {
        "ENVIRONMENT": "production",
        "DEBUG": "false",
        "API_PORT": "9000",
        "MONGODB_URL": "mongodb://prod:27017",
        "REDIS_URL": "redis://prod:6379"
    })
    def test_settings_from_environment(self):
        """Test settings loaded from environment variables."""
        settings = Settings()
        
        assert settings.environment == "production"
        assert settings.debug is False
        assert settings.api_port == 9000
        assert settings.mongodb_url == "mongodb://prod:27017"
        assert settings.redis_url == "redis://prod:6379"
    
    def test_exchange_settings(self):
        """Test exchange API settings."""
        settings = Settings()
        
        assert isinstance(settings.bybit_testnet, bool)
        assert isinstance(settings.binance_testnet, bool)
        assert settings.rate_limit_requests == 1200
        assert settings.rate_limit_window == 60
    
    def test_get_settings_singleton(self):
        """Test that get_settings returns the same instance."""
        settings1 = get_settings()
        settings2 = get_settings()
        
        assert settings1 is settings2
    
    @patch.dict(os.environ, {"ENVIRONMENT": "test"})
    def test_test_environment_settings(self):
        """Test settings in test environment."""
        # Clear cache to force reload
        get_settings.cache_clear()
        
        settings = get_settings()
        assert settings.environment == "test"
    
    def test_log_level_validation(self):
        """Test log level validation."""
        with patch.dict(os.environ, {"LOG_LEVEL": "INVALID"}):
            settings = Settings()
            # Should fallback to default
            assert settings.log_level == "INFO"
    
    def test_database_url_construction(self):
        """Test database URL construction."""
        with patch.dict(os.environ, {
            "MONGODB_HOST": "custom-host",
            "MONGODB_PORT": "27018",
            "MONGODB_USERNAME": "user",
            "MONGODB_PASSWORD": "pass"
        }):
            settings = Settings()
            expected_url = "mongodb://user:pass@custom-host:27018"
            assert expected_url in settings.mongodb_url
