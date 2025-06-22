"""
Pydantic Models for API Responses
Common data models used across endpoints
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field


class TimeFrame(str, Enum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"


class Exchange(str, Enum):
    BYBIT = "bybit"
    BINANCE = "binance"
    COINBASE = "coinbase"
    KRAKEN = "kraken"


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number")
    per_page: int = Field(100, ge=1, le=1000, description="Items per page")


class PaginatedResponse(BaseModel):
    data: List[Any]
    page: int
    per_page: int
    total: int
    pages: int


class ErrorResponse(BaseModel):
    error: Dict[str, Any] = Field(..., description="Error details")


class SuccessResponse(BaseModel):
    status: str = "success"
    message: str
    data: Optional[Dict[str, Any]] = None
