"""
API Cache Manager
Redis-like caching for frequent API responses
Uses in-memory caching if Redis not available
"""

import json
import logging
import time
from typing import Any, Optional, Union
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Simple in-memory cache with TTL support
    Falls back from Redis if not available
    """
    
    def __init__(self):
        self._cache = {}
        self._expires = {}
        self.redis_available = False
        self.default_ttl = 300  # 5 minutes
        
        # Try to import and connect to Redis
        try:
            import redis
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            # Test connection
            self.redis_client.ping()
            self.redis_available = True
            logger.info("Redis cache available")
        except Exception as e:
            logger.info(f"Redis not available, using in-memory cache: {e}")
            self.redis_client = None
    
    def _generate_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters"""
        key_data = f"{prefix}:{json.dumps(kwargs, sort_keys=True, default=str)}"
        return hashlib.md5(key_data.encode()).hexdigest()[:16]
    
    def _cleanup_expired(self):
        """Remove expired keys from in-memory cache"""
        current_time = time.time()
        expired_keys = [
            key for key, expire_time in self._expires.items()
            if expire_time < current_time
        ]
        for key in expired_keys:
            self._cache.pop(key, None)
            self._expires.pop(key, None)
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if self.redis_available:
            try:
                value = self.redis_client.get(key)
                return json.loads(value) if value else None
            except Exception as e:
                logger.warning(f"Redis get error: {e}")
        
        # Fallback to in-memory
        self._cleanup_expired()
        current_time = time.time()
        
        if key in self._cache and key in self._expires:
            if self._expires[key] > current_time:
                return self._cache[key]
            else:
                # Expired
                self._cache.pop(key, None)
                self._expires.pop(key, None)
        
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL"""
        ttl = ttl or self.default_ttl
        
        if self.redis_available:
            try:
                return self.redis_client.setex(
                    key, 
                    ttl, 
                    json.dumps(value, default=str)
                )
            except Exception as e:
                logger.warning(f"Redis set error: {e}")
        
        # Fallback to in-memory
        self._cache[key] = value
        self._expires[key] = time.time() + ttl
        return True
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if self.redis_available:
            try:
                return bool(self.redis_client.delete(key))
            except Exception as e:
                logger.warning(f"Redis delete error: {e}")
        
        # Fallback to in-memory
        self._cache.pop(key, None)
        self._expires.pop(key, None)
        return True
    
    async def clear(self) -> bool:
        """Clear all cache"""
        if self.redis_available:
            try:
                return self.redis_client.flushdb()
            except Exception as e:
                logger.warning(f"Redis clear error: {e}")
        
        # Fallback to in-memory
        self._cache.clear()
        self._expires.clear()
        return True
    
    # Convenience methods for API endpoints
    async def get_candles(self, symbol: str, timeframe: str, **kwargs) -> Optional[Any]:
        """Get cached candles"""
        key = self._generate_key("candles", symbol=symbol, timeframe=timeframe, **kwargs)
        return await self.get(key)
    
    async def set_candles(self, symbol: str, timeframe: str, data: Any, ttl: int = 60, **kwargs) -> bool:
        """Cache candles data"""
        key = self._generate_key("candles", symbol=symbol, timeframe=timeframe, **kwargs)
        return await self.set(key, data, ttl)
    
    async def get_market_stats(self, symbol: str, timeframe: str, **kwargs) -> Optional[Any]:
        """Get cached market stats"""
        key = self._generate_key("stats", symbol=symbol, timeframe=timeframe, **kwargs)
        return await self.get(key)
    
    async def set_market_stats(self, symbol: str, timeframe: str, data: Any, ttl: int = 30, **kwargs) -> bool:
        """Cache market stats"""
        key = self._generate_key("stats", symbol=symbol, timeframe=timeframe, **kwargs)
        return await self.set(key, data, ttl)
    
    async def get_orderbook(self, symbol: str, exchange: str, **kwargs) -> Optional[Any]:
        """Get cached orderbook"""
        key = self._generate_key("orderbook", symbol=symbol, exchange=exchange, **kwargs)
        return await self.get(key)
    
    async def set_orderbook(self, symbol: str, exchange: str, data: Any, ttl: int = 10, **kwargs) -> bool:
        """Cache orderbook data"""
        key = self._generate_key("orderbook", symbol=symbol, exchange=exchange, **kwargs)
        return await self.set(key, data, ttl)
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        stats = {
            "type": "redis" if self.redis_available else "memory",
            "memory_keys": len(self._cache),
            "memory_expired": len([k for k, v in self._expires.items() if v < time.time()]),
        }
        
        if self.redis_available:
            try:
                info = self.redis_client.info("memory")
                stats.update({
                    "redis_memory_used": info.get("used_memory_human", "unknown"),
                    "redis_keys": self.redis_client.dbsize()
                })
            except Exception:
                stats["redis_error"] = True
        
        return stats


# Global cache instance
cache_manager = CacheManager()
