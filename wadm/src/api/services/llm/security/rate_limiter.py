"""
Redis-based distributed rate limiter for LLM service
Replaces in-memory rate limiting with distributed Redis solution
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from decimal import Decimal

try:
    import redis.asyncio as redis
except ImportError:
    import redis

from ..config import LLMConfig
from src.logger import get_logger

logger = get_logger(__name__)


class RedisRateLimiter:
    """
    Distributed rate limiter using Redis
    Supports concurrent requests across multiple server instances
    """
    
    def __init__(self, redis_url: str = None):
        """Initialize Redis rate limiter"""
        self.config = LLMConfig()
        self.redis_url = redis_url or "redis://:wadm_redis_2024@redis:6379"
        self.redis_client = None
        self._initialize_redis()
    
    def _initialize_redis(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                retry_on_timeout=True
            )
            logger.info("✅ Redis rate limiter initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Redis: {str(e)}")
            raise Exception(f"Redis connection failed: {str(e)}")
    
    async def check_limits(self, user_id: str) -> Tuple[bool, Dict[str, any]]:
        """
        Check if user is within rate limits
        
        Args:
            user_id: User identifier
            
        Returns:
            Tuple of (is_allowed: bool, limits_info: dict)
        """
        try:
            # Get current usage
            usage = await self._get_user_usage(user_id)
            
            # Check hourly limit
            hourly_requests = await self._count_requests_in_window(
                user_id, "hour", 1
            )
            hourly_limit = self.config.RATE_LIMIT_REQUESTS_PER_HOUR
            
            # Check daily limit  
            daily_requests = await self._count_requests_in_window(
                user_id, "day", 1
            )
            daily_limit = self.config.RATE_LIMIT_REQUESTS_PER_DAY
            
            # Check daily cost
            daily_cost = await self._get_daily_cost(user_id)
            cost_limit = float(self.config.RATE_LIMIT_COST_PER_DAY_USD)
            
            # Build limits info
            limits_info = {
                "hourly_requests": hourly_requests,
                "hourly_limit": hourly_limit,
                "daily_requests": daily_requests,
                "daily_limit": daily_limit,
                "daily_cost": daily_cost,
                "cost_limit": cost_limit,
                "remaining_requests_hour": max(0, hourly_limit - hourly_requests),
                "remaining_requests_day": max(0, daily_limit - daily_requests),
                "remaining_cost": max(0.0, cost_limit - daily_cost)
            }
            
            # Check if limits exceeded
            is_allowed = (
                hourly_requests < hourly_limit and
                daily_requests < daily_limit and
                daily_cost < cost_limit
            )
            
            if not is_allowed:
                logger.warning(f"Rate limit exceeded for user {user_id}: {limits_info}")
            
            return is_allowed, limits_info
            
        except Exception as e:
            logger.error(f"Error checking rate limits for user {user_id}: {str(e)}")
            # Fail open for now - don't block requests on Redis errors
            return True, {"error": str(e)}
    
    async def increment_usage(
        self, 
        user_id: str, 
        tokens_used: int, 
        cost_usd: float,
        provider: str
    ) -> None:
        """
        Increment user usage after successful request
        
        Args:
            user_id: User identifier
            tokens_used: Number of tokens consumed
            cost_usd: Cost in USD
            provider: Provider used
        """
        try:
            now = datetime.now()
            timestamp = now.isoformat()
            
            # Increment request counters
            await self._increment_request_counter(user_id, "hour", now)
            await self._increment_request_counter(user_id, "day", now)
            
            # Update cost tracking
            await self._add_cost(user_id, cost_usd, now)
            
            # Store detailed usage record
            usage_record = {
                "timestamp": timestamp,
                "tokens_used": tokens_used,
                "cost_usd": cost_usd,
                "provider": provider
            }
            
            # Store usage history (keep last 100 records per user)
            history_key = f"llm:usage_history:{user_id}"
            await self.redis_client.lpush(history_key, json.dumps(usage_record))
            await self.redis_client.ltrim(history_key, 0, 99)  # Keep last 100
            await self.redis_client.expire(history_key, 86400 * 7)  # 7 days
            
            logger.debug(f"Updated usage for user {user_id}: {tokens_used} tokens, ${cost_usd:.4f}")
            
        except Exception as e:
            logger.error(f"Error incrementing usage for user {user_id}: {str(e)}")
    
    async def _get_user_usage(self, user_id: str) -> Dict[str, any]:
        """Get current user usage from Redis"""
        try:
            usage_key = f"llm:usage:{user_id}"
            usage_data = await self.redis_client.hgetall(usage_key)
            
            if not usage_data:
                return {
                    "hourly_requests": 0,
                    "daily_requests": 0,
                    "daily_cost": 0.0
                }
            
            return {
                "hourly_requests": int(usage_data.get("hourly_requests", 0)),
                "daily_requests": int(usage_data.get("daily_requests", 0)),
                "daily_cost": float(usage_data.get("daily_cost", 0.0))
            }
            
        except Exception as e:
            logger.error(f"Error getting usage for user {user_id}: {str(e)}")
            return {"hourly_requests": 0, "daily_requests": 0, "daily_cost": 0.0}
    
    async def _count_requests_in_window(
        self, 
        user_id: str, 
        window_type: str, 
        window_size: int
    ) -> int:
        """Count requests in sliding window"""
        try:
            if window_type == "hour":
                cutoff_time = datetime.now() - timedelta(hours=window_size)
            elif window_type == "day":
                cutoff_time = datetime.now() - timedelta(days=window_size)
            else:
                raise ValueError(f"Invalid window type: {window_type}")
            
            # Use Redis sorted set for sliding window
            key = f"llm:requests:{window_type}:{user_id}"
            cutoff_timestamp = cutoff_time.timestamp()
            
            # Remove old entries
            await self.redis_client.zremrangebyscore(key, 0, cutoff_timestamp)
            
            # Count current entries
            count = await self.redis_client.zcard(key)
            
            return count
            
        except Exception as e:
            logger.error(f"Error counting requests for user {user_id}: {str(e)}")
            return 0
    
    async def _increment_request_counter(
        self, 
        user_id: str, 
        window_type: str, 
        timestamp: datetime
    ) -> None:
        """Increment request counter in sliding window"""
        try:
            key = f"llm:requests:{window_type}:{user_id}"
            score = timestamp.timestamp()
            
            # Add current request
            await self.redis_client.zadd(key, {str(timestamp.isoformat()): score})
            
            # Set expiration
            if window_type == "hour":
                await self.redis_client.expire(key, 3600)  # 1 hour
            elif window_type == "day":
                await self.redis_client.expire(key, 86400)  # 1 day
                
        except Exception as e:
            logger.error(f"Error incrementing counter for user {user_id}: {str(e)}")
    
    async def _get_daily_cost(self, user_id: str) -> float:
        """Get daily cost from Redis"""
        try:
            key = f"llm:cost:daily:{user_id}"
            cost_str = await self.redis_client.get(key)
            return float(cost_str) if cost_str else 0.0
            
        except Exception as e:
            logger.error(f"Error getting daily cost for user {user_id}: {str(e)}")
            return 0.0
    
    async def _add_cost(self, user_id: str, cost_usd: float, timestamp: datetime) -> None:
        """Add cost to daily tracking"""
        try:
            key = f"llm:cost:daily:{user_id}"
            
            # Get current cost
            current_cost = await self._get_daily_cost(user_id)
            new_cost = current_cost + cost_usd
            
            # Update cost
            await self.redis_client.set(key, str(new_cost))
            
            # Set expiration to end of day
            now = datetime.now()
            end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            seconds_until_end = int((end_of_day - now).total_seconds())
            
            await self.redis_client.expire(key, seconds_until_end)
            
        except Exception as e:
            logger.error(f"Error adding cost for user {user_id}: {str(e)}")
    
    async def get_usage_stats(self, user_id: str) -> Dict[str, any]:
        """Get comprehensive usage statistics for user"""
        try:
            # Get current limits
            is_allowed, limits_info = await self.check_limits(user_id)
            
            # Get usage history
            history_key = f"llm:usage_history:{user_id}"
            history_data = await self.redis_client.lrange(history_key, 0, 9)  # Last 10 records
            
            usage_history = []
            for record_json in history_data:
                try:
                    record = json.loads(record_json)
                    usage_history.append(record)
                except json.JSONDecodeError:
                    continue
            
            return {
                "limits": limits_info,
                "is_allowed": is_allowed,
                "usage_history": usage_history,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting usage stats for user {user_id}: {str(e)}")
            return {"error": str(e)}
    
    async def reset_user_limits(self, user_id: str) -> bool:
        """Reset all limits for user (admin function)"""
        try:
            # Get all keys for user
            keys_to_delete = []
            
            # Request counters
            keys_to_delete.extend([
                f"llm:requests:hour:{user_id}",
                f"llm:requests:day:{user_id}"
            ])
            
            # Cost tracking
            keys_to_delete.append(f"llm:cost:daily:{user_id}")
            
            # Usage history
            keys_to_delete.append(f"llm:usage_history:{user_id}")
            
            # Delete all keys
            if keys_to_delete:
                await self.redis_client.delete(*keys_to_delete)
            
            logger.info(f"Reset limits for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting limits for user {user_id}: {str(e)}")
            return False
    
    async def health_check(self) -> Dict[str, any]:
        """Health check for Redis rate limiter"""
        try:
            # Test Redis connection
            await self.redis_client.ping()
            
            # Test basic operations
            test_key = "llm:health_check"
            await self.redis_client.set(test_key, "test", ex=5)
            test_value = await self.redis_client.get(test_key)
            await self.redis_client.delete(test_key)
            
            return {
                "status": "healthy",
                "redis_connected": True,
                "redis_operations": test_value == "test"
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "redis_connected": False,
                "error": str(e)
            } 