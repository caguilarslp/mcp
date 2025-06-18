"""Timeframe utilities."""

from datetime import datetime, timedelta
from typing import Dict


class TimeframeConverter:
    """Utility class for timeframe conversions."""
    
    @staticmethod
    def to_seconds(timeframe: str) -> int:
        """Convert timeframe to seconds."""
        return get_timeframe_seconds(timeframe)
    
    @staticmethod
    def to_minutes(timeframe: str) -> int:
        """Convert timeframe to minutes."""
        return get_timeframe_seconds(timeframe) // 60
    
    @staticmethod
    def to_hours(timeframe: str) -> float:
        """Convert timeframe to hours."""
        return get_timeframe_seconds(timeframe) / 3600


# Timeframe to seconds mapping
TIMEFRAME_SECONDS: Dict[str, int] = {
    "1m": 60,
    "3m": 180,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "2h": 7200,
    "4h": 14400,
    "6h": 21600,
    "8h": 28800,
    "12h": 43200,
    "1d": 86400,
    "3d": 259200,
    "1w": 604800,
}


def get_timeframe_seconds(timeframe: str) -> int:
    """Convert timeframe string to seconds."""
    if timeframe not in TIMEFRAME_SECONDS:
        raise ValueError(f"Invalid timeframe: {timeframe}")
    return TIMEFRAME_SECONDS[timeframe]


def round_timestamp_to_timeframe(timestamp: datetime, timeframe: str) -> datetime:
    """Round timestamp down to the nearest timeframe boundary."""
    seconds = get_timeframe_seconds(timeframe)
    
    # Convert to Unix timestamp
    unix_timestamp = int(timestamp.timestamp())
    
    # Round down to nearest timeframe
    rounded_unix = (unix_timestamp // seconds) * seconds
    
    # Convert back to datetime preserving timezone
    if timestamp.tzinfo:
        return datetime.fromtimestamp(rounded_unix, tz=timestamp.tzinfo)
    else:
        return datetime.fromtimestamp(rounded_unix)


def get_timeframe_start(end_time: datetime, timeframe: str, periods: int) -> datetime:
    """Calculate start time based on timeframe and number of periods."""
    seconds = get_timeframe_seconds(timeframe)
    total_seconds = seconds * periods
    return end_time - timedelta(seconds=total_seconds)


def validate_timeframe(timeframe: str) -> bool:
    """Validate if timeframe string is supported."""
    return timeframe in TIMEFRAME_SECONDS


def align_timestamp(timestamp: datetime, timeframe: str) -> datetime:
    """Align timestamp to timeframe boundary."""
    return round_timestamp_to_timeframe(timestamp, timeframe)
