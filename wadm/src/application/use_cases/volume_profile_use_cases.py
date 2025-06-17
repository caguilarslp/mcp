"""
Volume Profile Use Cases - Application layer for volume profile operations.

These use cases orchestrate the business logic for volume profile calculations
and coordinate between services, repositories, and caching layers.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from src.core.entities import VolumeProfile
from src.core.types import Symbol, Exchange
from src.application.services.volume_profile_service import VolumeProfileService
from src.infrastructure.database.repositories import VolumeProfileRepository
from src.infrastructure.cache.redis_cache import RedisCache


logger = logging.getLogger(__name__)


class VolumeProfileRequest(BaseModel):
    """Request model for volume profile calculations."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    start_time: datetime = Field(..., description="Period start time")
    end_time: datetime = Field(..., description="Period end time")
    value_area_percentage: Decimal = Field(
        Decimal("0.70"), 
        description="Value area percentage (default 70%)"
    )


class RealTimeVolumeProfileRequest(BaseModel):
    """Request model for real-time volume profile."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    timeframe_minutes: int = Field(60, description="Timeframe in minutes")


class HistoricalVolumeProfileRequest(BaseModel):
    """Request model for historical volume profiles."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    timeframe_minutes: int = Field(60, description="Timeframe in minutes")
    periods: int = Field(24, description="Number of periods to retrieve")


class CalculateVolumeProfileUseCase:
    """Use case for calculating volume profile for specific time period."""
    
    def __init__(
        self,
        volume_profile_service: VolumeProfileService,
        volume_profile_repository: VolumeProfileRepository,
        cache: Optional[RedisCache] = None
    ):
        self.volume_profile_service = volume_profile_service
        self.volume_profile_repository = volume_profile_repository
        self.cache = cache
    
    async def execute(self, request: VolumeProfileRequest) -> Optional[VolumeProfile]:
        """
        Execute volume profile calculation.
        
        Args:
            request: Volume profile calculation request
            
        Returns:
            Calculated volume profile or None
        """
        try:
            # Generate cache key
            cache_key = self._generate_cache_key(request)
            
            # Try to get from cache first
            if self.cache:
                cached_profile = await self.cache.get_volume_profile(cache_key)
                if cached_profile:
                    logger.info(f"Retrieved volume profile from cache: {cache_key}")
                    return cached_profile
            
            # Calculate volume profile
            volume_profile = await self.volume_profile_service.calculate_volume_profile(
                symbol=request.symbol,
                exchange=request.exchange,
                start_time=request.start_time,
                end_time=request.end_time,
                value_area_percentage=request.value_area_percentage
            )
            
            if not volume_profile:
                return None
            
            # Save to repository
            try:
                await self.volume_profile_repository.save(volume_profile)
                logger.info(f"Saved volume profile to database: {request.symbol}")
            except Exception as e:
                logger.warning(f"Failed to save volume profile to database: {e}")
            
            # Cache the result
            if self.cache:
                try:
                    await self.cache.set_volume_profile(cache_key, volume_profile, ttl=300)  # 5 min cache
                    logger.info(f"Cached volume profile: {cache_key}")
                except Exception as e:
                    logger.warning(f"Failed to cache volume profile: {e}")
            
            return volume_profile
            
        except Exception as e:
            logger.error(f"Error in CalculateVolumeProfileUseCase: {e}", exc_info=True)
            return None
    
    def _generate_cache_key(self, request: VolumeProfileRequest) -> str:
        """Generate cache key for request."""
        return (
            f"volume_profile:{request.symbol}:{request.exchange}:"
            f"{request.start_time.isoformat()}:{request.end_time.isoformat()}:"
            f"{request.value_area_percentage}"
        )


class GetRealTimeVolumeProfileUseCase:
    """Use case for getting real-time volume profile."""
    
    def __init__(
        self,
        volume_profile_service: VolumeProfileService,
        cache: Optional[RedisCache] = None
    ):
        self.volume_profile_service = volume_profile_service
        self.cache = cache
    
    async def execute(self, request: RealTimeVolumeProfileRequest) -> Optional[VolumeProfile]:
        """
        Execute real-time volume profile retrieval.
        
        Args:
            request: Real-time volume profile request
            
        Returns:
            Current volume profile or None
        """
        try:
            # Generate cache key for current period
            cache_key = self._generate_cache_key(request)
            
            # Try cache first (short TTL for real-time data)
            if self.cache:
                cached_profile = await self.cache.get_volume_profile(cache_key)
                if cached_profile:
                    logger.debug(f"Retrieved real-time profile from cache: {cache_key}")
                    return cached_profile
            
            # Calculate real-time profile
            volume_profile = await self.volume_profile_service.calculate_real_time_profile(
                symbol=request.symbol,
                exchange=request.exchange,
                timeframe_minutes=request.timeframe_minutes
            )
            
            if not volume_profile:
                return None
            
            # Cache with short TTL for real-time data
            if self.cache:
                try:
                    await self.cache.set_volume_profile(cache_key, volume_profile, ttl=60)  # 1 min cache
                    logger.debug(f"Cached real-time volume profile: {cache_key}")
                except Exception as e:
                    logger.warning(f"Failed to cache real-time volume profile: {e}")
            
            return volume_profile
            
        except Exception as e:
            logger.error(f"Error in GetRealTimeVolumeProfileUseCase: {e}", exc_info=True)
            return None
    
    def _generate_cache_key(self, request: RealTimeVolumeProfileRequest) -> str:
        """Generate cache key for real-time request."""
        # Include current period in cache key
        now = datetime.utcnow()
        
        if request.timeframe_minutes == 60:
            period_key = now.strftime("%Y%m%d_%H")
        elif request.timeframe_minutes == 240:
            hour_group = (now.hour // 4) * 4
            period_key = f"{now.strftime('%Y%m%d')}_{hour_group:02d}"
        elif request.timeframe_minutes == 1440:
            period_key = now.strftime("%Y%m%d")
        else:
            period_key = now.strftime("%Y%m%d_%H%M")
        
        return f"realtime_profile:{request.symbol}:{request.exchange}:{request.timeframe_minutes}:{period_key}"


class GetHistoricalVolumeProfilesUseCase:
    """Use case for getting historical volume profiles."""
    
    def __init__(
        self,
        volume_profile_service: VolumeProfileService,
        volume_profile_repository: VolumeProfileRepository,
        cache: Optional[RedisCache] = None
    ):
        self.volume_profile_service = volume_profile_service
        self.volume_profile_repository = volume_profile_repository
        self.cache = cache
    
    async def execute(self, request: HistoricalVolumeProfileRequest) -> List[VolumeProfile]:
        """
        Execute historical volume profiles retrieval.
        
        Args:
            request: Historical volume profiles request
            
        Returns:
            List of historical volume profiles
        """
        try:
            # First try to get from repository (faster than recalculating)
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(minutes=request.timeframe_minutes * request.periods)
            
            existing_profiles = await self.volume_profile_repository.find_by_time_range(
                symbol=request.symbol,
                exchange=request.exchange,
                start_time=start_time,
                end_time=end_time
            )
            
            # If we have sufficient data from repository, return it
            if len(existing_profiles) >= request.periods * 0.8:  # 80% threshold
                logger.info(f"Retrieved {len(existing_profiles)} historical profiles from repository")
                return existing_profiles[:request.periods]  # Limit to requested count
            
            # Otherwise, calculate missing profiles
            logger.info(f"Calculating {request.periods} historical volume profiles")
            profiles = await self.volume_profile_service.get_historical_profiles(
                symbol=request.symbol,
                exchange=request.exchange,
                timeframe_minutes=request.timeframe_minutes,
                periods=request.periods
            )
            
            # Save newly calculated profiles to repository
            if profiles:
                try:
                    await self.volume_profile_repository.save_many(profiles)
                    logger.info(f"Saved {len(profiles)} historical profiles to repository")
                except Exception as e:
                    logger.warning(f"Failed to save historical profiles: {e}")
            
            return profiles
            
        except Exception as e:
            logger.error(f"Error in GetHistoricalVolumeProfilesUseCase: {e}", exc_info=True)
            return []
