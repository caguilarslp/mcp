"""Tests for Bybit WebSocket collector."""

import json
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from src.infrastructure.websocket.collectors import BybitCollector
from src.core.domain.entities import Trade


class TestBybitCollector:
    """Test suite for BybitCollector."""
    
    @pytest.fixture
    def mock_repository(self):
        """Create mock repository."""
        repo = AsyncMock()
        repo.save_trades = AsyncMock()
        return repo
        
    @pytest.fixture
    def collector(self, mock_repository):
        """Create Bybit collector instance."""
        return BybitCollector(
            symbol="BTCUSDT",
            market_type="linear",
            repository=mock_repository
        )
        
    def test_initialization(self, collector):
        """Test collector initialization."""
        assert collector.symbol == "BTCUSDT"
        assert collector.market_type == "linear"
        assert collector.url == BybitCollector.LINEAR_URL
        assert collector.name == "BybitCollector-BTCUSDT"
        
    def test_spot_url_selection(self, mock_repository):
        """Test spot market URL selection."""
        collector = BybitCollector(
            symbol="BTCUSDT",
            market_type="spot",
            repository=mock_repository
        )
        assert collector.url == BybitCollector.SPOT_URL
        
    @pytest.mark.asyncio
    async def test_on_connect(self, collector):
        """Test subscription on connect."""
        # Mock send method
        collector.send = AsyncMock()
        
        await collector._on_connect()
        
        # Verify subscription message
        collector.send.assert_called_once_with({
            "op": "subscribe",
            "args": ["publicTrade.BTCUSDT"]
        })
        
    @pytest.mark.asyncio
    async def test_process_trade_message(self, collector, mock_repository):
        """Test processing trade data."""
        # Sample trade message from Bybit
        message = {
            "topic": "publicTrade.BTCUSDT",
            "type": "snapshot",
            "ts": 1672304486868,
            "data": [
                {
                    "T": 1672304486865,
                    "s": "BTCUSDT",
                    "S": "Buy",
                    "v": "0.001",
                    "p": "16578.50",
                    "L": "PlusTick",
                    "i": "2290000000022420137",
                    "BT": False
                },
                {
                    "T": 1672304486866,
                    "s": "BTCUSDT", 
                    "S": "Sell",
                    "v": "0.002",
                    "p": "16578.45",
                    "L": "MinusTick",
                    "i": "2290000000022420138",
                    "BT": False
                }
            ]
        }
        
        await collector._process_message(message)
        
        # Verify trades were saved
        mock_repository.save_trades.assert_called_once()
        saved_trades = mock_repository.save_trades.call_args[0][0]
        
        assert len(saved_trades) == 2
        
        # Check first trade
        trade1 = saved_trades[0]
        assert isinstance(trade1, Trade)
        assert trade1.exchange == "bybit"
        assert trade1.symbol == "BTCUSDT"
        assert trade1.price == 16578.50
        assert trade1.size == 0.001
        assert trade1.side == "buy"
        assert trade1.trade_id == "2290000000022420137"
        
        # Check second trade
        trade2 = saved_trades[1]
        assert trade2.side == "sell"
        assert trade2.price == 16578.45
        assert trade2.size == 0.002
        
        # Check statistics
        assert collector._trade_count == 2
        assert collector._last_trade_time is not None
        
    @pytest.mark.asyncio
    async def test_process_subscription_response(self, collector):
        """Test handling subscription response."""
        # Success response
        success_msg = {
            "success": True,
            "ret_msg": "",
            "conn_id": "abc123"
        }
        
        await collector._process_message(success_msg)
        # Should not raise any exception
        
        # Failure response
        fail_msg = {
            "success": False,
            "ret_msg": "Invalid symbol",
            "conn_id": "abc123"
        }
        
        await collector._process_message(fail_msg)
        # Should log error but not raise
        
    @pytest.mark.asyncio
    async def test_process_pong_message(self, collector):
        """Test handling pong response."""
        pong_msg = {
            "op": "pong",
            "args": ["1672304486868"]
        }
        
        await collector._process_message(pong_msg)
        # Should not raise any exception
        
    def test_create_ping_message(self, collector):
        """Test ping message creation."""
        ping_msg = collector._create_ping_message()
        assert ping_msg == '{"op":"ping"}'
        
    def test_parse_trade(self, collector):
        """Test trade parsing."""
        trade_data = {
            "T": 1672304486865,
            "s": "BTCUSDT",
            "S": "Buy",
            "v": "0.001",
            "p": "16578.50",
            "L": "PlusTick",
            "i": "2290000000022420137",
            "BT": False
        }
        
        trade = collector._parse_trade(trade_data)
        
        assert isinstance(trade, Trade)
        assert trade.exchange == "bybit"
        assert trade.symbol == "BTCUSDT"
        assert trade.price == 16578.50
        assert trade.size == 0.001
        assert trade.side == "buy"
        assert trade.trade_id == "2290000000022420137"
        assert isinstance(trade.timestamp, datetime)
        
    def test_get_stats(self, collector):
        """Test statistics retrieval."""
        # Set some test data
        collector._trade_count = 100
        collector._last_trade_time = datetime.now()
        
        stats = collector.get_stats()
        
        assert stats["name"] == "BybitCollector-BTCUSDT"
        assert stats["symbol"] == "BTCUSDT"
        assert stats["market_type"] == "linear"
        assert stats["connected"] is False  # Not connected in test
        assert stats["trade_count"] == 100
        assert stats["last_trade_time"] is not None
        assert stats["uptime_seconds"] == 0  # No uptime in test
        
    @pytest.mark.asyncio
    async def test_error_handling_in_parse(self, collector, mock_repository):
        """Test error handling when parsing fails."""
        # Invalid trade data
        message = {
            "topic": "publicTrade.BTCUSDT",
            "data": [
                {
                    "invalid": "data"
                }
            ]
        }
        
        await collector._process_message(message)
        
        # Should not save any trades
        mock_repository.save_trades.assert_not_called()
        
    @pytest.mark.asyncio
    async def test_repository_error_handling(self, collector, mock_repository):
        """Test handling of repository errors."""
        # Make repository raise an error
        mock_repository.save_trades.side_effect = Exception("DB Error")
        
        message = {
            "topic": "publicTrade.BTCUSDT",
            "data": [
                {
                    "T": 1672304486865,
                    "s": "BTCUSDT",
                    "S": "Buy",
                    "v": "0.001",
                    "p": "16578.50",
                    "L": "PlusTick",
                    "i": "2290000000022420137",
                    "BT": False
                }
            ]
        }
        
        # Should not raise, just log error
        await collector._process_message(message)
        
        # Trade count should still increase
        assert collector._trade_count == 1
