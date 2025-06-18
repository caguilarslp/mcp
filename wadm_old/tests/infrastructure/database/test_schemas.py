"""
Tests for MongoDB schemas and database infrastructure.

This module tests the database schemas, repositories, and data manager
to ensure proper functionality and data integrity.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List

from src.infrastructure.database import (
    MongoSchemas, DataManager, TradeRepository, 
    VolumeProfileRepository, OrderFlowRepository
)
from src.core.entities import Trade, VolumeProfile, OrderFlow
from src.core.types import Symbol, Exchange, Side


class TestMongoSchemas:
    """Test MongoDB schema creation and management."""
    
    def test_ttl_settings(self):
        """Test TTL configuration values."""
        assert MongoSchemas.TTL_RAW_DATA == 3600  # 1 hour
        assert MongoSchemas.TTL_AGGREGATED_1M == 86400  # 24 hours
        assert MongoSchemas.TTL_AGGREGATED_1H == 604800  # 7 days
        assert MongoSchemas.TTL_INDICATORS == 2592000  # 30 days
    
    @pytest.mark.asyncio
    async def test_create_schemas(self, mock_db):
        """Test schema creation."""
        # Mock the database methods
        mock_db.trades.create_indexes = pytest.AsyncMock()
        mock_db.orderbook.create_indexes = pytest.AsyncMock()
        mock_db.klines.create_indexes = pytest.AsyncMock()
        mock_db.volume_profiles.create_indexes = pytest.AsyncMock()
        mock_db.order_flow.create_indexes = pytest.AsyncMock()
        mock_db.liquidity_levels.create_indexes = pytest.AsyncMock()
        mock_db.market_structure.create_indexes = pytest.AsyncMock()
        mock_db.collector_stats.create_indexes = pytest.AsyncMock()
        
        # Create schemas
        await MongoSchemas.create_all_schemas(mock_db)
        
        # Verify all collections had indexes created
        mock_db.trades.create_indexes.assert_called_once()
        mock_db.orderbook.create_indexes.assert_called_once()
        mock_db.klines.create_indexes.assert_called_once()
        mock_db.volume_profiles.create_indexes.assert_called_once()
        mock_db.order_flow.create_indexes.assert_called_once()
        mock_db.liquidity_levels.create_indexes.assert_called_once()
        mock_db.market_structure.create_indexes.assert_called_once()
        mock_db.collector_stats.create_indexes.assert_called_once()


class TestDataManager:
    """Test data manager functionality."""
    
    @pytest.mark.asyncio
    async def test_initialization(self, mock_mongodb_client):
        """Test data manager initialization."""
        data_manager = DataManager(mock_mongodb_client)
        
        # Mock the initialization process
        mock_mongodb_client._db = pytest.MagicMock()
        mock_mongodb_client.connect = pytest.AsyncMock()
        
        # Mock schema creation
        import src.infrastructure.database.schemas as schemas_module
        schemas_module.MongoSchemas.create_all_schemas = pytest.AsyncMock()
        
        await data_manager.initialize()
        
        assert data_manager._initialized is True
        assert "trades" in data_manager._repositories
        assert "volume_profiles" in data_manager._repositories
        assert "order_flow" in data_manager._repositories


# Fixtures for testing
@pytest.fixture
def mock_db():
    """Mock MongoDB database."""
    from unittest.mock import MagicMock
    db = MagicMock()
    
    # Mock collections
    db.trades = MagicMock()
    db.orderbook = MagicMock()
    db.klines = MagicMock()
    db.volume_profiles = MagicMock()
    db.order_flow = MagicMock()
    db.liquidity_levels = MagicMock()
    db.market_structure = MagicMock()
    db.collector_stats = MagicMock()
    
    return db


@pytest.fixture
def mock_mongodb_client():
    """Mock MongoDB client."""
    from unittest.mock import MagicMock
    client = MagicMock()
    client._db = None
    from unittest.mock import AsyncMock
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    return client
