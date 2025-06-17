"""
Pytest configuration with additional markers and fixtures
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture(scope="session")
def event_loop_policy():
    """Set the event loop policy for the test session."""
    return asyncio.DefaultEventLoopPolicy()


@pytest.fixture
def mock_mongodb():
    """Mock MongoDB client."""
    mock_client = AsyncMock()
    mock_db = AsyncMock()
    mock_collection = AsyncMock()
    
    mock_client.wadm = mock_db
    mock_db.trades = mock_collection
    mock_db.volume_profiles = mock_collection
    mock_db.order_flows = mock_collection
    
    # Mock common operations
    mock_collection.insert_one = AsyncMock()
    mock_collection.insert_many = AsyncMock()
    mock_collection.find_one = AsyncMock()
    mock_collection.find = AsyncMock()
    mock_collection.update_one = AsyncMock()
    mock_collection.delete_one = AsyncMock()
    mock_collection.create_index = AsyncMock()
    
    return mock_client


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    mock_redis = AsyncMock()
    
    # Mock common Redis operations
    mock_redis.get = AsyncMock()
    mock_redis.set = AsyncMock()
    mock_redis.delete = AsyncMock()
    mock_redis.exists = AsyncMock()
    mock_redis.expire = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.flushdb = AsyncMock()
    
    # Mock pub/sub
    mock_pubsub = AsyncMock()
    mock_redis.pubsub = MagicMock(return_value=mock_pubsub)
    
    return mock_redis


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection."""
    mock_ws = AsyncMock()
    
    # Mock WebSocket methods
    mock_ws.send = AsyncMock()
    mock_ws.recv = AsyncMock()
    mock_ws.close = AsyncMock()
    mock_ws.ping = AsyncMock()
    mock_ws.pong = AsyncMock()
    
    # Mock connection state
    mock_ws.closed = False
    mock_ws.open = True
    
    return mock_ws


@pytest.fixture
def mock_exchange_api():
    """Mock exchange API responses."""
    return {
        "bybit": {
            "ticker": {
                "symbol": "BTCUSDT",
                "lastPrice": "50000.0",
                "volume24h": "1000.0",
                "turnover24h": "50000000.0"
            },
            "orderbook": {
                "bids": [["49990.0", "1.0"], ["49980.0", "2.0"]],
                "asks": [["50010.0", "1.5"], ["50020.0", "2.5"]]
            },
            "trades": [
                {
                    "execId": "trade_1",
                    "symbol": "BTCUSDT",
                    "price": "50000.0",
                    "size": "1.0",
                    "side": "Buy",
                    "time": "1640995200000"
                }
            ]
        },
        "binance": {
            "ticker": {
                "symbol": "BTCUSDT",
                "price": "50000.0",
                "volume": "1000.0",
                "quoteVolume": "50000000.0"
            },
            "depth": {
                "bids": [["49990.0", "1.0"], ["49980.0", "2.0"]],
                "asks": [["50010.0", "1.5"], ["50020.0", "2.5"]]
            },
            "trades": [
                {
                    "id": 123456,
                    "price": "50000.0",
                    "qty": "1.0",
                    "isBuyerMaker": False,
                    "time": 1640995200000
                }
            ]
        }
    }


@pytest.fixture
def sample_kline_data():
    """Sample kline/candlestick data."""
    return {
        "symbol": "BTCUSDT",
        "interval": "1h",
        "openTime": 1640995200000,
        "closeTime": 1640998799999,
        "open": "49500.0",
        "high": "50500.0",
        "low": "49000.0",
        "close": "50000.0",
        "volume": "1000.0",
        "quoteVolume": "49750000.0",
        "trades": 5000,
        "takerBuyBaseVolume": "600.0",
        "takerBuyQuoteVolume": "29850000.0"
    }


@pytest.fixture(autouse=True)
def cleanup_after_test():
    """Cleanup after each test."""
    yield
    # Cleanup code can go here
    # For example, clearing caches, resetting singletons, etc.


def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests as performance tests"
    )
    config.addinivalue_line(
        "markers", "network: marks tests that require network access"
    )
    config.addinivalue_line(
        "markers", "docker: marks tests that require Docker"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on test names."""
    for item in items:
        # Add markers based on test file names
        if "test_performance" in item.nodeid:
            item.add_marker(pytest.mark.performance)
        if "test_integration" in item.nodeid:
            item.add_marker(pytest.mark.integration)
        if "_slow" in item.name:
            item.add_marker(pytest.mark.slow)
        if "network" in item.name:
            item.add_marker(pytest.mark.network)
        if "docker" in item.name:
            item.add_marker(pytest.mark.docker)


@pytest.fixture
def disable_network():
    """Disable network access for tests that shouldn't use it."""
    import socket
    
    def guard(*args, **kwargs):
        raise Exception("Network access disabled in tests")
    
    socket.socket = guard


# Custom assertion helpers
def assert_valid_trade(trade):
    """Assert that a trade object is valid."""
    assert trade.symbol is not None
    assert trade.price > 0
    assert trade.quantity > 0
    assert trade.timestamp is not None
    assert trade.trade_type is not None
    assert trade.trade_id is not None


def assert_valid_volume_profile(profile):
    """Assert that a volume profile is valid."""
    assert profile.symbol is not None
    assert profile.timeframe is not None
    assert profile.start_time is not None
    assert profile.end_time is not None
    assert len(profile.nodes) > 0
    assert profile.total_volume > 0
    assert profile.poc is not None


def assert_valid_order_flow(order_flow):
    """Assert that an order flow is valid."""
    assert order_flow.symbol is not None
    assert order_flow.timeframe is not None
    assert order_flow.timestamp is not None
    assert order_flow.volume > 0
    assert order_flow.buy_volume >= 0
    assert order_flow.sell_volume >= 0
    assert order_flow.buy_volume + order_flow.sell_volume == order_flow.volume


# Make assertion helpers available globally
pytest.assert_valid_trade = assert_valid_trade
pytest.assert_valid_volume_profile = assert_valid_volume_profile
pytest.assert_valid_order_flow = assert_valid_order_flow
