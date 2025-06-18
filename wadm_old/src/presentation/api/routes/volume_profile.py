"""
Volume Profile API endpoints - Production implementation.

This module provides REST API endpoints for volume profile calculations,
integrating with the application layer use cases and services.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Query, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
import structlog

from src.core.types import Symbol, Exchange
from src.core.entities import VolumeProfile
from src.application.use_cases.volume_profile_use_cases import (
    CalculateVolumeProfileUseCase,
    GetRealTimeVolumeProfileUseCase,
    GetHistoricalVolumeProfilesUseCase,
    VolumeProfileRequest,
    RealTimeVolumeProfileRequest,
    HistoricalVolumeProfileRequest
)

router = APIRouter(prefix="/volume-profile", tags=["Volume Profile"])
logger = structlog.get_logger()


# ===============================
# Response Models
# ===============================

class VolumeLevel(BaseModel):
    """Volume level in the profile."""
    price: float = Field(..., description="Price level")
    volume: float = Field(..., description="Total volume at this level")
    percentage: float = Field(..., description="Percentage of total volume")


class VolumeProfileResponse(BaseModel):
    """Volume profile response model."""
    symbol: str = Field(..., description="Trading pair symbol")
    exchange: str = Field(..., description="Exchange name")
    timeframe: str = Field(..., description="Timeframe period")
    start_time: datetime = Field(..., description="Period start time")
    end_time: datetime = Field(..., description="Period end time")
    poc: float = Field(..., description="Point of Control - price with highest volume")
    vah: float = Field(..., description="Value Area High")
    val: float = Field(..., description="Value Area Low")
    total_volume: float = Field(..., description="Total volume in period")
    value_area_volume: float = Field(..., description="Volume in value area (70%)")
    levels: List[VolumeLevel] = Field(..., description="Volume distribution by price levels")
    
    @classmethod
    def from_entity(cls, volume_profile: VolumeProfile, timeframe: str = "1h") -> "VolumeProfileResponse":
        """Create response from VolumeProfile entity."""
        # Convert price levels to VolumeLevel objects
        total_vol = float(volume_profile.total_volume)
        levels = []
        
        for price_str, volume in volume_profile.price_levels.items():
            volume_float = float(volume)
            percentage = (volume_float / total_vol * 100) if total_vol > 0 else 0
            
            levels.append(VolumeLevel(
                price=float(price_str),
                volume=volume_float,
                percentage=round(percentage, 2)
            ))
        
        # Sort levels by volume descending
        levels.sort(key=lambda x: x.volume, reverse=True)
        
        return cls(
            symbol=volume_profile.symbol,
            exchange=volume_profile.exchange,
            timeframe=timeframe,
            start_time=volume_profile.start_time,
            end_time=volume_profile.end_time,
            poc=float(volume_profile.poc_price),
            vah=float(volume_profile.vah_price),
            val=float(volume_profile.val_price),
            total_volume=total_vol,
            value_area_volume=float(volume_profile.value_area_volume),
            levels=levels
        )


class VolumeProfileSummary(BaseModel):
    """Simplified volume profile summary."""
    symbol: str
    exchange: str
    timestamp: datetime
    poc: float
    vah: float
    val: float
    total_volume: float


class AvailableSymbol(BaseModel):
    """Available symbol information."""
    symbol: str
    exchange: str
    last_update: Optional[datetime] = None
    profiles_available: int = 0


# ===============================
# Request Models
# ===============================

class VolumeProfileQueryParams(BaseModel):
    """Query parameters for volume profile requests."""
    exchange: str = Query("binance", description="Exchange name")
    timeframe: str = Query("1h", regex="^(5m|15m|30m|1h|4h|1d)$", description="Timeframe")
    value_area_percentage: float = Query(70.0, ge=50.0, le=95.0, description="Value area percentage")
    
    @validator('value_area_percentage')
    def convert_percentage(cls, v):
        return v / 100.0  # Convert to decimal


# ===============================
# Dependency Injection
# ===============================

async def get_calculate_use_case() -> CalculateVolumeProfileUseCase:
    """Get CalculateVolumeProfileUseCase dependency."""
    # TODO: Implement proper dependency injection
    # For now, this is a placeholder
    return None


async def get_realtime_use_case() -> GetRealTimeVolumeProfileUseCase:
    """Get GetRealTimeVolumeProfileUseCase dependency."""
    # TODO: Implement proper dependency injection
    return None


async def get_historical_use_case() -> GetHistoricalVolumeProfilesUseCase:
    """Get GetHistoricalVolumeProfilesUseCase dependency."""
    # TODO: Implement proper dependency injection
    return None


# ===============================
# API Endpoints
# ===============================

@router.get("/current/{symbol}", response_model=VolumeProfileResponse)
async def get_current_volume_profile(
    symbol: str,
    params: VolumeProfileQueryParams = Depends(),
    use_case: GetRealTimeVolumeProfileUseCase = Depends(get_realtime_use_case)
) -> VolumeProfileResponse:
    """
    Get current volume profile for a symbol.
    
    Returns the volume profile for the current time period based on the specified timeframe.
    """
    try:
        # Convert timeframe to minutes
        timeframe_map = {
            "5m": 5, "15m": 15, "30m": 30, 
            "1h": 60, "4h": 240, "1d": 1440
        }
        timeframe_minutes = timeframe_map.get(params.timeframe, 60)
        
        # Create request
        request = RealTimeVolumeProfileRequest(
            symbol=symbol.upper(),
            exchange=params.exchange,
            timeframe_minutes=timeframe_minutes
        )
        
        # Execute use case
        volume_profile = await use_case.execute(request)
        
        if not volume_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No volume profile data available for {symbol} on {params.exchange}"
            )
        
        return VolumeProfileResponse.from_entity(volume_profile, params.timeframe)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get current volume profile", 
                    symbol=symbol, 
                    exchange=params.exchange,
                    timeframe=params.timeframe,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/historical/{symbol}", response_model=List[VolumeProfileSummary])
async def get_volume_profile_history(
    symbol: str,
    params: VolumeProfileQueryParams = Depends(),
    periods: int = Query(24, ge=1, le=168, description="Number of periods to retrieve"),
    use_case: GetHistoricalVolumeProfilesUseCase = Depends(get_historical_use_case)
) -> List[VolumeProfileSummary]:
    """
    Get historical volume profiles for a symbol.
    
    Returns a list of volume profile summaries for the specified number of historical periods.
    """
    try:
        # Convert timeframe to minutes
        timeframe_map = {
            "5m": 5, "15m": 15, "30m": 30, 
            "1h": 60, "4h": 240, "1d": 1440
        }
        timeframe_minutes = timeframe_map.get(params.timeframe, 60)
        
        # Create request
        request = HistoricalVolumeProfileRequest(
            symbol=symbol.upper(),
            exchange=params.exchange,
            timeframe_minutes=timeframe_minutes,
            periods=periods
        )
        
        # Execute use case
        volume_profiles = await use_case.execute(request)
        
        # Convert to summary format
        summaries = []
        for profile in volume_profiles:
            summaries.append(VolumeProfileSummary(
                symbol=profile.symbol,
                exchange=profile.exchange,
                timestamp=profile.end_time,
                poc=float(profile.poc_price),
                vah=float(profile.vah_price),
                val=float(profile.val_price),
                total_volume=float(profile.total_volume)
            ))
        
        return summaries
        
    except Exception as e:
        logger.error("Failed to get volume profile history", 
                    symbol=symbol, 
                    exchange=params.exchange,
                    timeframe=params.timeframe,
                    periods=periods,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/calculate/{symbol}", response_model=VolumeProfileResponse)
async def calculate_volume_profile(
    symbol: str,
    start_time: datetime = Query(..., description="Period start time (ISO format)"),
    end_time: datetime = Query(..., description="Period end time (ISO format)"),
    params: VolumeProfileQueryParams = Depends(),
    use_case: CalculateVolumeProfileUseCase = Depends(get_calculate_use_case)
) -> VolumeProfileResponse:
    """
    Calculate volume profile for a specific time period.
    
    Allows calculation of volume profile for any custom time range.
    """
    try:
        # Validate time range
        if start_time >= end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_time must be before end_time"
            )
        
        # Limit time range to prevent excessive computation
        max_duration = timedelta(days=7)
        if end_time - start_time > max_duration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time range cannot exceed 7 days"
            )
        
        # Create request
        request = VolumeProfileRequest(
            symbol=symbol.upper(),
            exchange=params.exchange,
            start_time=start_time,
            end_time=end_time,
            value_area_percentage=Decimal(str(params.value_area_percentage))
        )
        
        # Execute use case
        volume_profile = await use_case.execute(request)
        
        if not volume_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No trade data available for {symbol} on {params.exchange} in specified time range"
            )
        
        return VolumeProfileResponse.from_entity(volume_profile, "custom")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to calculate volume profile", 
                    symbol=symbol, 
                    exchange=params.exchange,
                    start_time=start_time,
                    end_time=end_time,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/symbols", response_model=List[AvailableSymbol])
async def get_available_symbols(
    exchange: str = Query("binance", description="Exchange name")
) -> List[AvailableSymbol]:
    """
    Get list of symbols with available volume profile data.
    
    Returns symbols that have recent trade data available for volume profile calculation.
    """
    try:
        # TODO: Implement actual database query to get available symbols
        # For now, return common symbols
        symbols = [
            AvailableSymbol(
                symbol="BTCUSDT",
                exchange=exchange,
                last_update=datetime.utcnow(),
                profiles_available=24
            ),
            AvailableSymbol(
                symbol="ETHUSDT",
                exchange=exchange,
                last_update=datetime.utcnow(),
                profiles_available=24
            ),
            AvailableSymbol(
                symbol="SOLUSDT",
                exchange=exchange,
                last_update=datetime.utcnow(),
                profiles_available=24
            )
        ]
        
        return symbols
        
    except Exception as e:
        logger.error("Failed to get available symbols", 
                    exchange=exchange,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/poc-levels/{symbol}", response_model=Dict[str, Any])
async def get_poc_levels(
    symbol: str,
    exchange: str = Query("binance", description="Exchange name"),
    timeframe: str = Query("1h", regex="^(1h|4h|1d)$", description="Timeframe"),
    lookback_periods: int = Query(24, ge=1, le=168, description="Number of periods to analyze")
) -> Dict[str, Any]:
    """
    Get Point of Control levels for multiple periods.
    
    Returns POC levels for the specified lookback periods, useful for identifying
    key price levels where volume was concentrated.
    """
    try:
        # TODO: Implement POC levels extraction from historical data
        
        # Mock response for now
        poc_levels = [
            {"timestamp": datetime.utcnow() - timedelta(hours=i), "poc": 50000.0 + i * 100}
            for i in range(lookback_periods)
        ]
        
        return {
            "symbol": symbol.upper(),
            "exchange": exchange,
            "timeframe": timeframe,
            "lookback_periods": lookback_periods,
            "poc_levels": poc_levels,
            "key_levels": [50000.0, 50500.0, 51000.0],  # Most frequent POC levels
            "support_levels": [49500.0, 50000.0],
            "resistance_levels": [51000.0, 51500.0]
        }
        
    except Exception as e:
        logger.error("Failed to get POC levels", 
                    symbol=symbol, 
                    exchange=exchange,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/statistics/{symbol}", response_model=Dict[str, Any])
async def get_volume_profile_statistics(
    symbol: str,
    exchange: str = Query("binance", description="Exchange name"),
    timeframe: str = Query("1h", regex="^(1h|4h|1d)$", description="Timeframe")
) -> Dict[str, Any]:
    """
    Get volume profile statistics and metrics.
    
    Returns statistical analysis of volume distribution patterns.
    """
    try:
        # TODO: Implement actual statistics calculation
        
        return {
            "symbol": symbol.upper(),
            "exchange": exchange,
            "timeframe": timeframe,
            "last_updated": datetime.utcnow(),
            "statistics": {
                "average_poc": 50250.0,
                "poc_std_deviation": 125.5,
                "average_value_area_volume_pct": 72.3,
                "most_traded_price_range": {"min": 49800.0, "max": 50800.0},
                "volume_distribution_skew": 0.15,
                "price_range_efficiency": 0.68
            },
            "trends": {
                "poc_trend": "ascending",
                "value_area_trend": "expanding",
                "volume_concentration": "high"
            }
        }
        
    except Exception as e:
        logger.error("Failed to get volume profile statistics", 
                    symbol=symbol, 
                    exchange=exchange,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
