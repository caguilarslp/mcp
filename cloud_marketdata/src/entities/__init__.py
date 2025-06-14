"""
Cloud MarketData - Core Entities

Data models y entidades fundamentales usando Pydantic v2
para validación automática y serialización.
"""

from .trade import Trade, TradeSide

__all__ = [
    "Trade",
    "TradeSide",
]
