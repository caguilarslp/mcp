"""Domain entities for WADM."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class Trade(BaseModel):
    """Trade entity representing a single market trade."""
    
    exchange: str = Field(..., description="Exchange name (bybit, binance)")
    symbol: str = Field(..., description="Trading symbol (e.g., BTCUSDT)")
    price: float = Field(..., gt=0, description="Trade price")
    size: float = Field(..., gt=0, description="Trade size/volume")
    side: Literal["buy", "sell"] = Field(..., description="Trade side from taker perspective")
    timestamp: datetime = Field(..., description="Trade execution time")
    trade_id: str = Field(..., description="Unique trade identifier from exchange")
    
    class Config:
        """Pydantic config."""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
