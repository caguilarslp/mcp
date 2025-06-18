"""Formatting utilities."""

from datetime import datetime
from decimal import Decimal
from typing import Optional


def format_price(price: Decimal, decimals: int = 6) -> str:
    """Format price with appropriate decimal places."""
    if price >= 1000:
        # Use comma separator for large numbers
        return f"{price:,.2f}"
    else:
        # Show more decimals for small prices
        return f"{price:.{decimals}f}".rstrip('0').rstrip('.')


def format_volume(volume: Decimal) -> str:
    """Format volume with K/M suffix."""
    if volume >= 1_000_000:
        return f"{volume / 1_000_000:.2f}M"
    elif volume >= 1_000:
        return f"{volume / 1_000:.2f}K"
    else:
        return f"{volume:.2f}"


def format_percentage(value: float) -> str:
    """Format value as percentage."""
    return f"{value * 100:.2f}%"


def format_timestamp(
    timestamp: datetime, 
    format_type: str = "full"
) -> str:
    """Format timestamp based on type."""
    if format_type == "date":
        return timestamp.strftime("%Y-%m-%d")
    elif format_type == "time":
        return timestamp.strftime("%H:%M:%S")
    else:  # full
        return timestamp.strftime("%Y-%m-%d %H:%M:%S")
