"""
Test fixtures and factories for testing
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List
import factory
from factory import fuzzy

from src.core.entities.trade import Trade, TradeType
from src.core.entities.volume_profile import VolumeProfile, VolumeNode
from src.core.entities.order_flow import OrderFlow


class TradeFactory(factory.Factory):
    """Factory for creating Trade instances."""
    
    class Meta:
        model = Trade
    
    symbol = "BTCUSDT"
    price = fuzzy.FuzzyDecimal(30000.0, 70000.0, precision=2)
    quantity = fuzzy.FuzzyDecimal(0.001, 10.0, precision=6)
    timestamp = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    trade_type = fuzzy.FuzzyChoice([TradeType.BUY, TradeType.SELL])
    trade_id = factory.Sequence(lambda n: f"trade_{n}")


class VolumeNodeFactory(factory.Factory):
    """Factory for creating VolumeNode instances."""
    
    class Meta:
        model = VolumeNode
    
    price_level = fuzzy.FuzzyDecimal(30000.0, 70000.0, precision=2)
    volume = fuzzy.FuzzyDecimal(100.0, 10000.0, precision=2)
    buy_volume = factory.LazyAttribute(lambda obj: obj.volume * Decimal("0.6"))
    sell_volume = factory.LazyAttribute(lambda obj: obj.volume - obj.buy_volume)
    trade_count = fuzzy.FuzzyInteger(1, 100)


class VolumeProfileFactory(factory.Factory):
    """Factory for creating VolumeProfile instances."""
    
    class Meta:
        model = VolumeProfile
    
    symbol = "BTCUSDT"
    timeframe = fuzzy.FuzzyChoice(["1m", "5m", "15m", "1h"])
    start_time = factory.LazyFunction(lambda: datetime.now(timezone.utc) - timedelta(hours=1))
    end_time = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    
    @factory.post_generation
    def nodes(self, create, extracted, **kwargs):
        """Create volume nodes for the profile."""
        if not create:
            return
        
        if extracted:
            self.nodes = extracted
        else:
            # Create 5 nodes with sequential price levels
            base_price = Decimal("50000.0")
            nodes = []
            for i in range(5):
                price = base_price + (i * Decimal("100.0"))
                volume = Decimal(str(1000 - (i * 100)))  # Decreasing volume
                buy_volume = volume * Decimal("0.6")
                sell_volume = volume - buy_volume
                
                node = VolumeNode(
                    price_level=price,
                    volume=volume,
                    buy_volume=buy_volume,
                    sell_volume=sell_volume,
                    trade_count=50 - (i * 5)
                )
                nodes.append(node)
            
            self.nodes = nodes


class OrderFlowFactory(factory.Factory):
    """Factory for creating OrderFlow instances."""
    
    class Meta:
        model = OrderFlow
    
    symbol = "BTCUSDT"
    timeframe = fuzzy.FuzzyChoice(["1m", "5m", "15m"])
    timestamp = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    delta = fuzzy.FuzzyDecimal(-5000.0, 5000.0, precision=2)
    cumulative_delta = fuzzy.FuzzyDecimal(-50000.0, 50000.0, precision=2)
    volume = fuzzy.FuzzyDecimal(1000.0, 50000.0, precision=2)
    buy_volume = factory.LazyAttribute(
        lambda obj: (obj.volume + obj.delta) / 2
    )
    sell_volume = factory.LazyAttribute(
        lambda obj: obj.volume - obj.buy_volume
    )
    large_trades_count = fuzzy.FuzzyInteger(0, 20)
    imbalance_ratio = fuzzy.FuzzyFloat(0.5, 3.0)


# Pytest fixtures using factories
@pytest.fixture
def sample_trade():
    """Create a sample trade."""
    return TradeFactory()


@pytest.fixture
def sample_trades():
    """Create a list of sample trades."""
    return TradeFactory.create_batch(10)


@pytest.fixture
def sample_volume_node():
    """Create a sample volume node."""
    return VolumeNodeFactory()


@pytest.fixture
def sample_volume_profile():
    """Create a sample volume profile."""
    return VolumeProfileFactory()


@pytest.fixture
def sample_order_flow():
    """Create a sample order flow."""
    return OrderFlowFactory()


@pytest.fixture
def btc_trade():
    """Create a specific BTC trade."""
    return TradeFactory(
        symbol="BTCUSDT",
        price=Decimal("50000.0"),
        quantity=Decimal("1.0"),
        trade_type=TradeType.BUY
    )


@pytest.fixture
def eth_trade():
    """Create a specific ETH trade."""
    return TradeFactory(
        symbol="ETHUSDT",
        price=Decimal("3000.0"),
        quantity=Decimal("2.0"),
        trade_type=TradeType.SELL
    )


@pytest.fixture
def mock_trades_sequence():
    """Create a sequence of trades for testing algorithms."""
    trades = []
    base_time = datetime.now(timezone.utc)
    
    for i in range(100):
        trade = TradeFactory(
            timestamp=base_time + timedelta(seconds=i),
            price=Decimal("50000.0") + Decimal(str(i % 20 - 10)),  # Price oscillation
            quantity=Decimal("0.1") + Decimal(str(i % 5)) * Decimal("0.1")
        )
        trades.append(trade)
    
    return trades


@pytest.fixture
def volume_profile_with_clear_poc():
    """Create a volume profile with a clear POC."""
    nodes = [
        VolumeNode(
            price_level=Decimal("49900.0"),
            volume=Decimal("500.0"),
            buy_volume=Decimal("250.0"),
            sell_volume=Decimal("250.0"),
            trade_count=25
        ),
        VolumeNode(
            price_level=Decimal("50000.0"),
            volume=Decimal("2000.0"),  # Clear POC
            buy_volume=Decimal("1200.0"),
            sell_volume=Decimal("800.0"),
            trade_count=100
        ),
        VolumeNode(
            price_level=Decimal("50100.0"),
            volume=Decimal("800.0"),
            buy_volume=Decimal("400.0"),
            sell_volume=Decimal("400.0"),
            trade_count=40
        ),
        VolumeNode(
            price_level=Decimal("50200.0"),
            volume=Decimal("300.0"),
            buy_volume=Decimal("150.0"),
            sell_volume=Decimal("150.0"),
            trade_count=15
        )
    ]
    
    return VolumeProfileFactory(nodes=nodes)


@pytest.fixture
def bullish_order_flow():
    """Create a bullish order flow."""
    return OrderFlowFactory(
        delta=Decimal("5000.0"),
        cumulative_delta=Decimal("25000.0"),
        volume=Decimal("20000.0"),
        buy_volume=Decimal("12500.0"),
        sell_volume=Decimal("7500.0"),
        imbalance_ratio=1.67
    )


@pytest.fixture
def bearish_order_flow():
    """Create a bearish order flow."""
    return OrderFlowFactory(
        delta=Decimal("-3000.0"),
        cumulative_delta=Decimal("-15000.0"),
        volume=Decimal("15000.0"),
        buy_volume=Decimal("6000.0"),
        sell_volume=Decimal("9000.0"),
        imbalance_ratio=0.67
    )
