"""
Tests for Bybit WebSocket collector.
"""

import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'src'))

import pytest
import json
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from infrastructure.collectors.bybit_collector import BybitCollector
from core.entities import Trade, OrderBook, Kline
from core.types import Symbol, Side, ExchangeName


@pytest.fixture
def symbols():
    return [Symbol("BTCUSDT"), Symbol("ETHUSDT")]


@pytest.fixture
def mock_callbacks():
    return {
        "on_trade": AsyncMock(),
        "on_orderbook": AsyncMock(),
        "on_kline": AsyncMock(),
    }


@pytest.fixture
def bybit_collector(symbols, mock_callbacks):
    return BybitCollector(
        symbols=symbols,
        **mock_callbacks,
        max_reconnect_attempts=1,  # Limit for tests
        reconnect_delay=0.1,  # Fast for tests
    )


class TestBybitCollector:
    """Test Bybit WebSocket collector functionality."""
    
    def test_initialization(self, bybit_collector, symbols):
        """Test collector initialization."""
        assert bybit_collector.exchange == ExchangeName.BYBIT
        assert bybit_collector.symbols == set(symbols)
        assert bybit_collector.websocket_url == "wss://stream.bybit.com/v5/public/spot"
        assert not bybit_collector.is_connected
        assert not bybit_collector.is_running
    
    @pytest.mark.asyncio
    async def test_build_subscription_message(self, bybit_collector):
        """Test subscription message building."""
        symbols = [Symbol("BTCUSDT")]
        message = await bybit_collector._build_subscription_message(symbols)
        
        assert message["op"] == "subscribe"
        assert "args" in message
        assert "req_id" in message
        
        # Check that all expected topics are included
        args = message["args"]
        expected_topics = [
            "publicTrade.BTCUSDT",
            "orderbook.200.BTCUSDT",
            "kline.1.BTCUSDT",
        ]
        
        for topic in expected_topics:
            assert topic in args
    
    def test_get_ping_message(self, bybit_collector):
        """Test ping message format."""
        ping_msg = bybit_collector._get_ping_message()
        assert ping_msg == {"op": "ping"}
    
    @pytest.mark.asyncio
    async def test_parse_subscription_confirmation(self, bybit_collector):
        """Test parsing subscription confirmation messages."""
        confirmation_msg = {
            "op": "subscribe",
            "success": True,
            "req_id": "1"
        }
        
        result = await bybit_collector._parse_message(confirmation_msg)
        assert result is None  # Confirmations return None
    
    @pytest.mark.asyncio
    async def test_parse_pong_message(self, bybit_collector):
        """Test parsing pong messages."""
        pong_msg = {"op": "pong"}
        
        result = await bybit_collector._parse_message(pong_msg)
        assert result is None  # Pong messages return None
    
    @pytest.mark.asyncio
    async def test_parse_trade_message(self, bybit_collector):
        """Test parsing trade data."""
        trade_msg = {
            "topic": "publicTrade.BTCUSDT",
            "ts": 1672324800000,
            "data": [{
                "i": "2100000000047355506",
                "s": "BTCUSDT",
                "p": "16596.5",
                "v": "0.012",
                "S": "Buy",
                "T": 1672323400122,
                "BT": False,
                "RPI": False
            }]
        }
        
        result = await bybit_collector._parse_message(trade_msg)
        
        assert isinstance(result, Trade)
        assert result.id == "2100000000047355506"
        assert result.symbol == Symbol("BTCUSDT")
        assert result.exchange == ExchangeName.BYBIT
        assert result.price == Decimal("16596.5")
        assert result.quantity == Decimal("0.012")
        assert result.side == Side.BUY
        assert not result.is_buyer_maker  # Buy side means buyer was taker
    
    @pytest.mark.asyncio
    async def test_parse_trade_sell_side(self, bybit_collector):
        """Test parsing sell side trade."""
        trade_msg = {
            "topic": "publicTrade.BTCUSDT",
            "ts": 1672324800000,
            "data": [{
                "i": "2100000000047355507",
                "s": "BTCUSDT",
                "p": "16595.0",
                "v": "0.025",
                "S": "Sell",
                "T": 1672323400122,
                "BT": False,
                "RPI": False
            }]
        }
        
        result = await bybit_collector._parse_message(trade_msg)
        
        assert isinstance(result, Trade)
        assert result.side == Side.SELL
        assert result.is_buyer_maker  # Sell side means buyer was maker
    
    @pytest.mark.asyncio
    async def test_parse_orderbook_message(self, bybit_collector):
        """Test parsing orderbook data."""
        orderbook_msg = {
            "topic": "orderbook.200.BTCUSDT",
            "ts": 1672324800000,
            "data": [{
                "s": "BTCUSDT",
                "b": [["16493.5", "0.021"], ["16493", "0.025"]],  # bids
                "a": [["16497", "0.125"], ["16497.5", "0.02"]],    # asks
                "u": 177163,
                "seq": 8046152471
            }]
        }
        
        result = await bybit_collector._parse_message(orderbook_msg)
        
        assert isinstance(result, OrderBook)
        assert result.symbol == Symbol("BTCUSDT")
        assert result.exchange == ExchangeName.BYBIT
        assert result.sequence == 8046152471
        
        # Check bids
        assert len(result.bids) == 2
        assert result.bids[0].price == Decimal("16493.5")
        assert result.bids[0].quantity == Decimal("0.021")
        
        # Check asks
        assert len(result.asks) == 2
        assert result.asks[0].price == Decimal("16497")
        assert result.asks[0].quantity == Decimal("0.125")
        
        # Test properties
        assert result.best_bid.price == Decimal("16493.5")
        assert result.best_ask.price == Decimal("16497")
        assert result.spread == Decimal("3.5")
        assert result.mid_price == Decimal("16495.25")
    
    @pytest.mark.asyncio
    async def test_parse_kline_message(self, bybit_collector):
        """Test parsing kline data."""
        kline_msg = {
            "topic": "kline.1.BTCUSDT",
            "ts": 1672324800000,
            "data": [{
                "start": 1672324800000,
                "end": 1672324860000,
                "interval": "1",
                "open": "16649",
                "close": "16649",
                "high": "16649",
                "low": "16649",
                "volume": "0.081",
                "turnover": "1.34869",
                "confirm": False,
                "timestamp": 1672324821123
            }]
        }
        
        result = await bybit_collector._parse_message(kline_msg)
        
        assert isinstance(result, Kline)
        assert result.symbol == Symbol("BTCUSDT")
        assert result.exchange == ExchangeName.BYBIT
        assert result.interval == "1m"
        assert result.open_price == Decimal("16649")
        assert result.close_price == Decimal("16649")
        assert result.high_price == Decimal("16649")
        assert result.low_price == Decimal("16649")
        assert result.volume == Decimal("0.081")
        assert result.quote_volume == Decimal("1.34869")
        assert not result.is_closed  # confirm: false
    
    @pytest.mark.asyncio
    async def test_parse_invalid_message(self, bybit_collector):
        """Test parsing invalid or malformed messages."""
        # Empty message
        result = await bybit_collector._parse_message({})
        assert result is None
        
        # Missing topic
        result = await bybit_collector._parse_message({"data": []})
        assert result is None
        
        # Missing data
        result = await bybit_collector._parse_message({"topic": "publicTrade.BTCUSDT"})
        assert result is None
        
        # Invalid topic format
        result = await bybit_collector._parse_message({
            "topic": "invalid",
            "data": [{}]
        })
        assert result is None
    
    @pytest.mark.asyncio
    async def test_parse_malformed_trade_data(self, bybit_collector):
        """Test parsing malformed trade data."""
        malformed_msg = {
            "topic": "publicTrade.BTCUSDT",
            "ts": 1672324800000,
            "data": [{
                "i": "123",
                # Missing required fields
                "s": "BTCUSDT"
            }]
        }
        
        result = await bybit_collector._parse_message(malformed_msg)
        assert result is None  # Should handle gracefully
    
    def test_get_supported_intervals(self, bybit_collector):
        """Test supported intervals."""
        intervals = bybit_collector.get_supported_intervals()
        
        expected_intervals = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1d", "1w", "1M"]
        assert intervals == expected_intervals
    
    def test_get_max_symbols_per_connection(self, bybit_collector):
        """Test max symbols per connection."""
        max_symbols = bybit_collector.get_max_symbols_per_connection()
        assert max_symbols == 100
    
    def test_symbol_formatting(self, bybit_collector):
        """Test symbol formatting for Bybit."""
        formatted = bybit_collector._format_symbol_for_bybit(Symbol("btcusdt"))
        assert formatted == "BTCUSDT"
    
    def test_statistics_tracking(self, bybit_collector):
        """Test statistics tracking."""
        stats = bybit_collector.get_stats()
        
        expected_keys = [
            "messages_received", "messages_processed", "errors", "reconnections",
            "last_message_time", "trades_received", "orderbooks_received", "klines_received",
            "is_connected", "is_running", "subscribed_symbols", "reconnect_attempts"
        ]
        
        for key in expected_keys:
            assert key in stats
        
        assert stats["messages_received"] == 0
        assert stats["is_connected"] is False
        assert stats["is_running"] is False
    
    def test_reset_statistics(self, bybit_collector):
        """Test resetting statistics."""
        # Manually modify some stats
        bybit_collector.stats["messages_received"] = 100
        bybit_collector.stats["errors"] = 5
        
        bybit_collector.reset_stats()
        
        stats = bybit_collector.get_stats()
        assert stats["messages_received"] == 0
        assert stats["errors"] == 0


class TestBybitCollectorIntegration:
    """Integration tests for Bybit collector."""
    
    @pytest.mark.asyncio
    async def test_symbol_management(self, bybit_collector):
        """Test adding and removing symbols."""
        new_symbol = Symbol("ADAUSDT")
        
        # Add symbol
        await bybit_collector.add_symbol(new_symbol)
        assert new_symbol in bybit_collector.symbols
        
        # Remove symbol
        await bybit_collector.remove_symbol(new_symbol)
        assert new_symbol not in bybit_collector.symbols
    
    @pytest.mark.asyncio
    async def test_callback_integration(self, mock_callbacks):
        """Test that callbacks are properly called."""
        collector = BybitCollector(
            symbols=[Symbol("BTCUSDT")],
            **mock_callbacks
        )
        
        # Simulate trade message
        trade_msg = {
            "topic": "publicTrade.BTCUSDT",
            "ts": 1672324800000,
            "data": [{
                "i": "123",
                "s": "BTCUSDT",
                "p": "50000",
                "v": "0.01",
                "S": "Buy",
                "T": 1672323400122,
                "BT": False,
                "RPI": False
            }]
        }
        
        # Parse and dispatch
        result = await collector._parse_message(trade_msg)
        assert isinstance(result, Trade)
        
        # Manually call dispatch (since we're not running the full collector)
        await collector._dispatch_data(result)
        
        # Verify callback was called
        mock_callbacks["on_trade"].assert_called_once()
        called_trade = mock_callbacks["on_trade"].call_args[0][0]
        assert isinstance(called_trade, Trade)
        assert called_trade.symbol == Symbol("BTCUSDT")
