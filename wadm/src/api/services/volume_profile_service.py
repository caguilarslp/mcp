"""
Volume Profile Service for API
Production-ready volume profile calculations with MongoDB optimization
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
import logging
from src.storage.mongo_manager import MongoManager
from src.indicators.volume_profile import VolumeProfileCalculator
from src.api.cache import CacheManager

logger = logging.getLogger(__name__)


class VolumeProfileService:
    """Service for Volume Profile calculations and data retrieval"""
    
    def __init__(self, mongo: MongoManager, cache: CacheManager):
        self.mongo = mongo
        self.cache = cache
        self.calculator = VolumeProfileCalculator()
    
    async def get_latest(self, symbol: str, exchange: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get latest volume profile for symbol"""
        cache_key = f"volume_profile_latest:{symbol}:{exchange or 'all'}"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get from database
        profile = await self.mongo.get_latest_volume_profile(symbol, exchange)
        if profile:
            result = {
                "symbol": symbol,
                "exchange": exchange,
                "timestamp": profile.timestamp.isoformat(),
                "poc": profile.poc,
                "vah": profile.vah,
                "val": profile.val,
                "total_volume": profile.total_volume,
                "volume_nodes": self._format_volume_nodes(profile.volume_nodes),
                "value_area_percentage": 70.0,
                "profile_strength": self._calculate_profile_strength(profile)
            }
            
            # Cache for 2 minutes
            await self.cache.set(cache_key, result, ttl=120)
            return result
        
        return None
    
    async def get_historical(self, symbol: str, 
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None,
                           limit: int = 100) -> List[Dict[str, Any]]:
        """Get historical volume profiles"""
        if not start_time:
            start_time = datetime.now(timezone.utc) - timedelta(hours=24)
        if not end_time:
            end_time = datetime.now(timezone.utc)
        
        cache_key = f"volume_profile_historical:{symbol}:{start_time.isoformat()}:{end_time.isoformat()}:{limit}"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get from database
        profiles = await self.mongo.get_volume_profiles(symbol, start_time, end_time, limit)
        
        result = []
        for profile in profiles:
            result.append({
                "symbol": symbol,
                "timestamp": profile.timestamp.isoformat(),
                "poc": profile.poc,
                "vah": profile.vah,
                "val": profile.val,
                "total_volume": profile.total_volume,
                "volume_nodes": self._format_volume_nodes(profile.volume_nodes),
                "profile_strength": self._calculate_profile_strength(profile)
            })
        
        # Cache for 5 minutes
        await self.cache.set(cache_key, result, ttl=300)
        return result
    
    async def calculate_realtime(self, symbol: str, exchange: str, 
                               minutes: int = 60) -> Optional[Dict[str, Any]]:
        """Calculate volume profile from recent trades"""
        cache_key = f"volume_profile_realtime:{symbol}:{exchange}:{minutes}"
        
        # Try cache first (30 second TTL for realtime)
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get recent trades
        trades = self._get_recent_trades(symbol, exchange, minutes)
        if len(trades) < 20:  # Need minimum trades for meaningful profile
            return None
        
        try:
            # Calculate profile
            profile = self.calculator.calculate(trades, symbol, exchange)
            
            result = {
                "symbol": symbol,
                "exchange": exchange,
                "timestamp": profile.timestamp.isoformat(),
                "poc": profile.poc,
                "vah": profile.vah,
                "val": profile.val,
                "total_volume": profile.total_volume,
                "volume_nodes": self._format_volume_nodes(profile.volume_distribution),
                "trades_count": len(trades),
                "time_period_minutes": minutes,
                "profile_strength": self._calculate_profile_strength(profile),
                "value_area_percentage": 70.0
            }
            
            # Cache for 30 seconds
            await self.cache.set(cache_key, result, ttl=30)
            return result
            
        except Exception as e:
            logger.error(f"Error calculating realtime volume profile: {e}")
            return None
    
    async def get_multi_timeframe(self, symbol: str, exchange: Optional[str] = None) -> Dict[str, Any]:
        """Get volume profiles for multiple timeframes"""
        cache_key = f"volume_profile_multi:{symbol}:{exchange or 'all'}"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        timeframes = {
            "15m": 15,
            "1h": 60,
            "4h": 240,
            "1d": 1440
        }
        
        result = {
            "symbol": symbol,
            "exchange": exchange,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "timeframes": {}
        }
        
        # Calculate for each timeframe
        for tf_name, minutes in timeframes.items():
            if exchange:
                profile = await self.calculate_realtime(symbol, exchange, minutes)
            else:
                # Aggregate across all exchanges
                profile = await self._aggregate_multi_exchange(symbol, minutes)
            
            if profile:
                result["timeframes"][tf_name] = profile
        
        # Cache for 2 minutes
        await self.cache.set(cache_key, result, ttl=120)
        return result
    
    def _get_recent_trades(self, symbol: str, exchange: str, minutes: int) -> List[Dict[str, Any]]:
        """Get recent trades for calculation"""
        if not self.mongo.connected:
            return []
        
        since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        
        query = {
            "symbol": symbol,
            "exchange": exchange,
            "timestamp": {"$gte": since}
        }
        
        return self.mongo.get_trades(query, limit=10000)  # Large limit for full data
    
    def _format_volume_nodes(self, volume_data) -> List[Dict[str, Any]]:
        """Format volume distribution for API response"""
        if not volume_data:
            return []
        
        # Handle both dict and list formats
        if isinstance(volume_data, dict):
            nodes = []
            for price_str, volume in volume_data.items():
                try:
                    price = float(price_str)
                    nodes.append({
                        "price": price,
                        "volume": float(volume),
                        "percentage": 0.0  # Will be calculated below
                    })
                except (ValueError, TypeError):
                    continue
        else:
            # Assume it's already a list
            nodes = volume_data
        
        # Calculate percentages
        total_volume = sum(node.get("volume", 0) for node in nodes)
        if total_volume > 0:
            for node in nodes:
                node["percentage"] = (node.get("volume", 0) / total_volume) * 100
        
        # Sort by price
        nodes.sort(key=lambda x: x.get("price", 0))
        return nodes
    
    def _calculate_profile_strength(self, profile) -> float:
        """Calculate strength score for the profile (0-100)"""
        if not hasattr(profile, 'volume_distribution') or not profile.volume_distribution:
            return 50.0
        
        # Convert volume distribution to list if it's a dict
        if hasattr(profile, 'volume_nodes') and profile.volume_nodes:
            volumes = [node.get("volume", 0) for node in profile.volume_nodes]
        elif isinstance(profile.volume_distribution, dict):
            volumes = list(profile.volume_distribution.values())
        else:
            volumes = []
        
        if not volumes:
            return 50.0
        
        # Calculate concentration (higher concentration = stronger profile)
        max_volume = max(volumes)
        total_volume = sum(volumes)
        concentration = (max_volume / total_volume) * 100 if total_volume > 0 else 0
        
        # Calculate distribution spread
        non_zero_nodes = len([v for v in volumes if v > 0])
        spread_factor = max(0, 100 - (non_zero_nodes * 2))  # Fewer nodes = higher concentration
        
        # Combine factors
        strength = min(100, (concentration * 0.7) + (spread_factor * 0.3))
        return max(0, strength)
    
    async def _aggregate_multi_exchange(self, symbol: str, minutes: int) -> Optional[Dict[str, Any]]:
        """Aggregate volume profile across multiple exchanges"""
        # For now, return the best available exchange data
        # TODO: Implement true multi-exchange aggregation
        exchanges = ["bybit", "binance", "coinbase", "kraken"]
        
        for exchange in exchanges:
            profile = await self.calculate_realtime(symbol, exchange, minutes)
            if profile:
                return profile
        
        return None
