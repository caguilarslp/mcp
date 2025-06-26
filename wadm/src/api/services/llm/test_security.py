"""
Tests for LLM Security Components
Comprehensive testing for rate limiting, audit logging, and data sanitization
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from .security import RedisRateLimiter, AuditLogger, DataSanitizer
from .models import ChatRequest, ChatResponse, LLMProvider
from .config import LLMConfig


class TestRedisRateLimiter:
    """Test Redis rate limiter functionality"""
    
    @pytest.fixture
    async def rate_limiter(self):
        """Mock rate limiter for testing"""
        with patch('redis.asyncio.from_url') as mock_redis:
            mock_client = AsyncMock()
            mock_redis.return_value = mock_client
            
            limiter = RedisRateLimiter()
            limiter.redis_client = mock_client
            return limiter, mock_client
    
    @pytest.mark.asyncio
    async def test_check_limits_allowed(self, rate_limiter):
        """Test rate limiting when user is within limits"""
        limiter, mock_client = rate_limiter
        
        # Mock Redis responses
        mock_client.zcard.return_value = 10  # Within hourly limit (50)
        mock_client.get.return_value = "5.00"  # Within cost limit ($10)
        
        is_allowed, limits_info = await limiter.check_limits("test_user")
        
        assert is_allowed is True
        assert limits_info["hourly_requests"] == 10
        assert limits_info["daily_cost"] == 5.00
        assert limits_info["remaining_requests_hour"] == 40
    
    @pytest.mark.asyncio 
    async def test_check_limits_exceeded(self, rate_limiter):
        """Test rate limiting when limits are exceeded"""
        limiter, mock_client = rate_limiter
        
        # Mock Redis responses - exceeding hourly limit
        mock_client.zcard.return_value = 55  # Exceeds hourly limit (50)
        mock_client.get.return_value = "8.00"  # Within cost limit
        
        is_allowed, limits_info = await limiter.check_limits("test_user")
        
        assert is_allowed is False
        assert limits_info["hourly_requests"] == 55
        assert limits_info["remaining_requests_hour"] == 0
    
    @pytest.mark.asyncio
    async def test_increment_usage(self, rate_limiter):
        """Test usage increment functionality"""
        limiter, mock_client = rate_limiter
        
        await limiter.increment_usage("test_user", 1000, 0.05, "anthropic")
        
        # Verify Redis calls
        assert mock_client.zadd.called
        assert mock_client.set.called
        assert mock_client.lpush.called
    
    @pytest.mark.asyncio
    async def test_get_usage_stats(self, rate_limiter):
        """Test usage statistics retrieval"""
        limiter, mock_client = rate_limiter
        
        # Mock responses
        mock_client.zcard.return_value = 25
        mock_client.get.return_value = "7.50"
        mock_client.lrange.return_value = ['{"timestamp": "2025-01-01T12:00:00", "tokens_used": 1000}']
        
        stats = await limiter.get_usage_stats("test_user")
        
        assert "limits" in stats
        assert "usage_history" in stats
        assert stats["is_allowed"] is True
    
    @pytest.mark.asyncio
    async def test_health_check(self, rate_limiter):
        """Test health check functionality"""
        limiter, mock_client = rate_limiter
        
        # Mock successful health check
        mock_client.ping.return_value = True
        mock_client.get.return_value = "test"
        
        health = await limiter.health_check()
        
        assert health["status"] == "healthy"
        assert health["redis_connected"] is True


class TestAuditLogger:
    """Test MongoDB audit logger functionality"""
    
    @pytest.fixture
    async def audit_logger(self):
        """Mock audit logger for testing"""
        with patch('motor.motor_asyncio.AsyncIOMotorClient') as mock_client:
            mock_db = AsyncMock()
            mock_collection = AsyncMock()
            
            mock_client.return_value.wadm = mock_db
            mock_db.llm_audit = mock_collection
            
            logger = AuditLogger()
            logger.client = mock_client.return_value
            logger.db = mock_db
            
            return logger, mock_collection
    
    @pytest.mark.asyncio
    async def test_log_request(self, audit_logger):
        """Test request logging"""
        logger, mock_collection = audit_logger
        
        # Mock successful insert
        mock_result = MagicMock()
        mock_result.inserted_id = "test_id_123"
        mock_collection.insert_one.return_value = mock_result
        
        request = ChatRequest(
            message="Analyze BTCUSDT",
            symbol="BTCUSDT",
            provider=LLMProvider.anthropic
        )
        
        audit_id = await logger.log_request("test_user", request, "127.0.0.1", "test-agent")
        
        assert audit_id == "test_id_123"
        assert mock_collection.insert_one.called
    
    @pytest.mark.asyncio
    async def test_log_response(self, audit_logger):
        """Test response logging"""
        logger, mock_collection = audit_logger
        
        response = ChatResponse(
            response="Analysis completed",
            provider_used=LLMProvider.anthropic,
            tokens_used=1500,
            cost_usd=0.04,
            processing_time_ms=2500,
            context_symbols=["BTCUSDT"]
        )
        
        await logger.log_response("test_audit_id", "test_user", response, True)
        
        assert mock_collection.update_one.called
    
    @pytest.mark.asyncio
    async def test_get_usage_analytics(self, audit_logger):
        """Test usage analytics aggregation"""
        logger, mock_collection = audit_logger
        
        # Mock aggregation result
        mock_cursor = AsyncMock()
        mock_cursor.to_list.return_value = [{
            "total_requests": 100,
            "successful_requests": 95,
            "total_tokens": 150000,
            "total_cost": 4.50,
            "avg_processing_time": 2000.0,
            "providers_used": ["anthropic", "openai"]
        }]
        mock_collection.aggregate.return_value = mock_cursor
        
        analytics = await logger.get_usage_analytics("test_user")
        
        assert analytics["total_requests"] == 100
        assert analytics["success_rate"] == 0.95
        assert analytics["total_cost"] == 4.50
    
    @pytest.mark.asyncio
    async def test_health_check(self, audit_logger):
        """Test audit logger health check"""
        logger, mock_collection = audit_logger
        
        # Mock successful operations
        logger.client.admin.command = AsyncMock(return_value=True)
        mock_collection.insert_one.return_value = MagicMock(inserted_id="test")
        mock_collection.delete_one.return_value = None
        mock_collection.count_documents.return_value = 1500
        
        health = await logger.health_check()
        
        assert health["status"] == "healthy"
        assert health["mongodb_connected"] is True
        assert health["total_audit_records"] == 1500


class TestDataSanitizer:
    """Test data sanitizer functionality"""
    
    @pytest.fixture
    def sanitizer(self):
        """Create sanitizer instance"""
        return DataSanitizer()
    
    @pytest.mark.asyncio
    async def test_pii_detection(self, sanitizer):
        """Test PII detection and removal"""
        text_with_pii = "Contact me at john.doe@example.com or call 555-123-4567"
        
        # Test detection
        detected = sanitizer.detect_pii(text_with_pii)
        assert "email" in detected
        assert "phone" in detected
        
        # Test removal
        sanitized = await sanitizer._remove_pii(text_with_pii)
        assert "[EMAIL_REDACTED]" in sanitized
        assert "[PHONE_REDACTED]" in sanitized
        assert "john.doe@example.com" not in sanitized
    
    @pytest.mark.asyncio
    async def test_malicious_content_removal(self, sanitizer):
        """Test malicious content detection and removal"""
        malicious_text = "'; DROP TABLE users; --"
        
        sanitized = await sanitizer._remove_malicious_content(malicious_text)
        assert "[SQL_BLOCKED]" in sanitized
        assert "DROP TABLE" not in sanitized
    
    @pytest.mark.asyncio
    async def test_request_data_sanitization(self, sanitizer):
        """Test complete request data sanitization"""
        request_data = {
            "message": "Analyze <script>alert('xss')</script> BTCUSDT for john@example.com",
            "symbol": "BTCUSDT",
            "provider": "anthropic"
        }
        
        sanitized = await sanitizer.sanitize_request_data(request_data)
        
        assert "<script>" not in sanitized["message"]
        assert "[EMAIL_REDACTED]" in sanitized["message"]
        assert sanitized["symbol"] == "BTCUSDT"  # Symbol should be unchanged
    
    @pytest.mark.asyncio
    async def test_length_limiting(self, sanitizer):
        """Test text length limiting"""
        long_text = "A" * 15000  # 15K characters
        
        sanitized = await sanitizer._sanitize_string(long_text)
        assert len(sanitized) <= 10003  # 10K + "..."
        assert sanitized.endswith("...")
    
    def test_validation(self, sanitizer):
        """Test sanitization validation"""
        original = "Analyze BTCUSDT technical indicators for trading strategy"
        sanitized = "Analyze BTCUSDT technical indicators for trading strategy"
        
        validation = sanitizer.validate_clean_data(original, sanitized)
        assert validation["is_valid"] is True
        assert validation["keyword_preservation_ratio"] > 0.7
    
    @pytest.mark.asyncio
    async def test_logging_sanitization(self, sanitizer):
        """Test data sanitization for logging"""
        sensitive_data = {
            "user_id": "user123",
            "api_key": "sk-abc123def456ghi789",
            "message": "Trade with john@example.com"
        }
        
        sanitized_log = await sanitizer.sanitize_for_logging(sensitive_data, 100)
        
        assert len(sanitized_log) <= 100
        assert "sk-abc123def456ghi789" not in sanitized_log
        assert "[EMAIL_REDACTED]" in sanitized_log or "john@example.com" not in sanitized_log


class TestSecurityIntegration:
    """Integration tests for security components"""
    
    @pytest.mark.asyncio
    async def test_security_workflow(self):
        """Test complete security workflow"""
        # This would test the integration between all components
        # Mock the external dependencies
        with patch('redis.asyncio.from_url'), \
             patch('motor.motor_asyncio.AsyncIOMotorClient'):
            
            # Initialize components
            rate_limiter = RedisRateLimiter()
            audit_logger = AuditLogger()
            sanitizer = DataSanitizer()
            
            # Mock Redis and MongoDB clients
            rate_limiter.redis_client = AsyncMock()
            audit_logger.db = AsyncMock()
            
            # Test data
            request_data = {
                "message": "Analyze BTCUSDT with email test@example.com",
                "symbol": "BTCUSDT"
            }
            
            # 1. Sanitize data
            sanitized = await sanitizer.sanitize_request_data(request_data)
            assert "[EMAIL_REDACTED]" in sanitized["message"]
            
            # 2. Check rate limits
            rate_limiter.redis_client.zcard.return_value = 10
            rate_limiter.redis_client.get.return_value = "2.50"
            
            is_allowed, limits = await rate_limiter.check_limits("test_user")
            assert is_allowed is True
            
            # 3. Log audit record
            audit_logger.db.llm_audit.insert_one.return_value = MagicMock(inserted_id="audit123")
            
            # This demonstrates the security components working together
            # In a real integration test, we would test the full LLMService workflow


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"]) 