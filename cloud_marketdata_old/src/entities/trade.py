"""
Trade Entity Model

Modelo Pydantic para representar trades de mercado con validación
automática y compatibilidad con múltiples exchanges.
"""

from decimal import Decimal
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class TradeSide(str, Enum):
    """Lado del trade - Buy o Sell"""
    BUY = "Buy"
    SELL = "Sell"


class Trade(BaseModel):
    """
    Entidad Trade unificada para todos los exchanges
    
    Attributes:
        symbol: Par de trading (ej: BTCUSDT)
        side: Lado del trade (Buy/Sell)
        price: Precio del trade
        quantity: Cantidad traded
        timestamp: Timestamp del trade
        exchange: Exchange donde ocurrió el trade
        trade_id: ID único del trade en el exchange
        raw_data: Datos originales del exchange (opcional)
    """
    
    symbol: str = Field(..., description="Trading pair symbol")
    side: TradeSide = Field(..., description="Trade side (Buy/Sell)")
    price: Decimal = Field(..., gt=0, description="Trade price")
    quantity: Decimal = Field(..., gt=0, description="Trade quantity")
    timestamp: datetime = Field(..., description="Trade timestamp")
    exchange: str = Field(..., description="Exchange name")
    trade_id: str = Field(..., description="Unique trade ID from exchange")
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Original exchange data")
    
    class Config:
        """Pydantic configuration"""
        use_enum_values = True
        json_encoders = {
            Decimal: lambda v: str(v),
            datetime: lambda v: v.isoformat(),
        }
        json_schema_extra = {
            "example": {
                "symbol": "BTCUSDT",
                "side": "Buy",
                "price": "50000.50",
                "quantity": "0.001",
                "timestamp": "2025-06-14T17:30:00.000Z",
                "exchange": "bybit",
                "trade_id": "2280000000054932641",
                "raw_data": None
            }
        }
    
    @validator('symbol')
    def validate_symbol(cls, v: str) -> str:
        """Validate symbol format"""
        if not v or len(v) < 3:
            raise ValueError("Symbol must be at least 3 characters long")
        return v.upper()
    
    @validator('exchange')
    def validate_exchange(cls, v: str) -> str:
        """Validate exchange name"""
        if not v:
            raise ValueError("Exchange name cannot be empty")
        return v.lower()
    
    @validator('price', 'quantity')
    def validate_positive_decimals(cls, v: Decimal) -> Decimal:
        """Ensure price and quantity are positive"""
        if v <= 0:
            raise ValueError("Value must be greater than 0")
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "symbol": self.symbol,
            "side": self.side.value,
            "price": str(self.price),
            "quantity": str(self.quantity),
            "timestamp": self.timestamp.isoformat(),
            "exchange": self.exchange,
            "trade_id": self.trade_id,
            "raw_data": self.raw_data
        }
    
    def __str__(self) -> str:
        """String representation"""
        return f"Trade({self.exchange}:{self.symbol}:{self.side}:{self.price}@{self.quantity})"
    
    def __hash__(self) -> int:
        """Hash for set operations"""
        return hash((self.exchange, self.trade_id))
