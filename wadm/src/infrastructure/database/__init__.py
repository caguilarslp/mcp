"""
Database infrastructure module for WADM.

This module provides all database-related functionality including:
- MongoDB client and connection management
- Collection schemas and indexes
- Repository pattern for data access
- Pydantic models for API serialization
- Data manager for coordinated operations
"""

from .mongodb import MongoDBClient
from .schemas import MongoSchemas
from .repository import BaseRepository, TimestampedRepository, SymbolExchangeRepository
from .repositories import (
    TradeRepository, OrderBookRepository, KlineRepository,
    VolumeProfileRepository, OrderFlowRepository,
    LiquidityLevelRepository, MarketStructureRepository
)
from .models import (
    # Base models
    APIResponse, ErrorResponse, HealthResponse,
    
    # Request models
    TimeRangeRequest, TradeRequest, OrderBookRequest, KlineRequest,
    VolumeProfileRequest, OrderFlowRequest, LiquidityLevelRequest,
    
    # Response models
    TradeResponse, OrderBookResponse, OrderBookLevelResponse,
    KlineResponse, VolumeProfileResponse, OrderFlowResponse,
    LiquidityLevelResponse, VolumeAnalysisResponse, CollectorStatsResponse
)
from .data_manager import DataManager

__all__ = [
    # Core infrastructure
    "MongoDBClient",
    "MongoSchemas",
    "DataManager",
    
    # Repository classes
    "BaseRepository",
    "TimestampedRepository", 
    "SymbolExchangeRepository",
    "TradeRepository",
    "OrderBookRepository",
    "KlineRepository",
    "VolumeProfileRepository",
    "OrderFlowRepository",
    "LiquidityLevelRepository",
    "MarketStructureRepository",
    
    # API models - Base
    "APIResponse",
    "ErrorResponse",
    "HealthResponse",
    
    # API models - Requests
    "TimeRangeRequest",
    "TradeRequest",
    "OrderBookRequest",
    "KlineRequest",
    "VolumeProfileRequest",
    "OrderFlowRequest",
    "LiquidityLevelRequest",
    
    # API models - Responses
    "TradeResponse",
    "OrderBookResponse",
    "OrderBookLevelResponse",
    "KlineResponse",
    "VolumeProfileResponse",
    "OrderFlowResponse",
    "LiquidityLevelResponse",
    "VolumeAnalysisResponse",
    "CollectorStatsResponse"
]
