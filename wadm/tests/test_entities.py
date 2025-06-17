"""
Test core domain models
"""

import pytest
from datetime import datetime, timezone
from decimal import Decimal

from src.core.entities.trade import Trade, TradeType
from src.core.entities.volume_profile import VolumeProfile, VolumeNode
from src.core.entities.order_flow import OrderFlow


class TestTrade:
    """Test Trade entity."""
    
    def test_trade_creation(self):
        """Test creating a valid trade."""
        trade = Trade(
            symbol="BTCUSDT",
            price=Decimal("50000.0"),
            quantity=Decimal("0.5"),
            timestamp=datetime.now(timezone.utc),
            trade_type=TradeType.BUY,
            trade_id="123456"
        )
        
        assert trade.symbol == "BTCUSDT"
        assert trade.price == Decimal("50000.0")
        assert trade.quantity == Decimal("0.5")
        assert trade.trade_type == TradeType.BUY
        assert trade.trade_id == "123456"
        assert trade.volume == Decimal("25000.0")  # price * quantity
    
    def test_trade_volume_calculation(self):
        """Test trade volume calculation."""
        trade = Trade(
            symbol="ETHUSDT",
            price=Decimal("3000.0"),
            quantity=Decimal("2.0"),
            timestamp=datetime.now(timezone.utc),
            trade_type=TradeType.SELL,
            trade_id="789012"
        )
        
        assert trade.volume == Decimal("6000.0")
    
    def test_trade_invalid_price(self):
        """Test trade with invalid price."""
        with pytest.raises(ValueError, match="Price must be positive"):
            Trade(
                symbol="BTCUSDT",
                price=Decimal("-100.0"),
                quantity=Decimal("1.0"),
                timestamp=datetime.now(timezone.utc),
                trade_type=TradeType.BUY,
                trade_id="123"
            )
    
    def test_trade_invalid_quantity(self):
        """Test trade with invalid quantity."""
        with pytest.raises(ValueError, match="Quantity must be positive"):
            Trade(
                symbol="BTCUSDT",
                price=Decimal("50000.0"),
                quantity=Decimal("0.0"),
                timestamp=datetime.now(timezone.utc),
                trade_type=TradeType.BUY,
                trade_id="123"
            )


class TestVolumeNode:
    """Test VolumeNode entity."""
    
    def test_volume_node_creation(self):
        """Test creating a valid volume node."""
        node = VolumeNode(
            price_level=Decimal("50000.0"),
            volume=Decimal("1000.0"),
            buy_volume=Decimal("600.0"),
            sell_volume=Decimal("400.0"),
            trade_count=50
        )
        
        assert node.price_level == Decimal("50000.0")
        assert node.volume == Decimal("1000.0")
        assert node.buy_volume == Decimal("600.0")
        assert node.sell_volume == Decimal("400.0")
        assert node.trade_count == 50
        assert node.delta == Decimal("200.0")  # buy - sell
    
    def test_volume_node_volume_validation(self):
        """Test volume node volume validation."""
        with pytest.raises(ValueError, match="Total volume must equal sum"):
            VolumeNode(
                price_level=Decimal("50000.0"),
                volume=Decimal("1000.0"),
                buy_volume=Decimal("600.0"),
                sell_volume=Decimal("500.0"),  # 600 + 500 != 1000
                trade_count=50
            )


class TestVolumeProfile:
    """Test VolumeProfile entity."""
    
    def test_volume_profile_creation(self):
        """Test creating a valid volume profile."""
        nodes = [
            VolumeNode(
                price_level=Decimal("49900.0"),
                volume=Decimal("500.0"),
                buy_volume=Decimal("300.0"),
                sell_volume=Decimal("200.0"),
                trade_count=25
            ),
            VolumeNode(
                price_level=Decimal("50000.0"),
                volume=Decimal("1000.0"),
                buy_volume=Decimal("600.0"),
                sell_volume=Decimal("400.0"),
                trade_count=50
            ),
            VolumeNode(
                price_level=Decimal("50100.0"),
                volume=Decimal("300.0"),
                buy_volume=Decimal("150.0"),
                sell_volume=Decimal("150.0"),
                trade_count=15
            )
        ]
        
        profile = VolumeProfile(
            symbol="BTCUSDT",
            timeframe="1h",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            nodes=nodes
        )
        
        assert profile.symbol == "BTCUSDT"
        assert profile.timeframe == "1h"
        assert len(profile.nodes) == 3
        assert profile.total_volume == Decimal("1800.0")
        assert profile.poc == Decimal("50000.0")  # Highest volume node
    
    def test_volume_profile_vah_val(self):
        """Test VAH and VAL calculation."""
        nodes = [
            VolumeNode(Decimal("49900.0"), Decimal("200.0"), Decimal("100.0"), Decimal("100.0"), 10),
            VolumeNode(Decimal("50000.0"), Decimal("600.0"), Decimal("300.0"), Decimal("300.0"), 30),  # POC
            VolumeNode(Decimal("50100.0"), Decimal("200.0"), Decimal("100.0"), Decimal("100.0"), 10),
        ]
        
        profile = VolumeProfile(
            symbol="BTCUSDT",
            timeframe="1h",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            nodes=nodes
        )
        
        # Value area should include POC + adjacent nodes that make up 70% of volume
        # Total volume = 1000, 70% = 700, POC has 600, need 100 more
        assert profile.vah is not None
        assert profile.val is not None
        assert profile.val <= profile.poc <= profile.vah


class TestOrderFlow:
    """Test OrderFlow entity."""
    
    def test_order_flow_creation(self):
        """Test creating a valid order flow."""
        order_flow = OrderFlow(
            symbol="BTCUSDT",
            timeframe="5m",
            timestamp=datetime.now(timezone.utc),
            delta=Decimal("1000.0"),
            cumulative_delta=Decimal("5000.0"),
            volume=Decimal("10000.0"),
            buy_volume=Decimal("6000.0"),
            sell_volume=Decimal("4000.0"),
            large_trades_count=5,
            imbalance_ratio=1.5
        )
        
        assert order_flow.symbol == "BTCUSDT"
        assert order_flow.timeframe == "5m"
        assert order_flow.delta == Decimal("1000.0")
        assert order_flow.cumulative_delta == Decimal("5000.0")
        assert order_flow.volume == Decimal("10000.0")
        assert order_flow.buy_volume == Decimal("6000.0")
        assert order_flow.sell_volume == Decimal("4000.0")
        assert order_flow.large_trades_count == 5
        assert order_flow.imbalance_ratio == 1.5
    
    def test_order_flow_volume_validation(self):
        """Test order flow volume validation."""
        with pytest.raises(ValueError, match="Total volume must equal sum"):
            OrderFlow(
                symbol="BTCUSDT",
                timeframe="5m",
                timestamp=datetime.now(timezone.utc),
                delta=Decimal("1000.0"),
                cumulative_delta=Decimal("5000.0"),
                volume=Decimal("10000.0"),
                buy_volume=Decimal("7000.0"),  # 7000 + 4000 = 11000 != 10000
                sell_volume=Decimal("4000.0"),
                large_trades_count=5,
                imbalance_ratio=1.5
            )
    
    def test_order_flow_delta_calculation(self):
        """Test delta calculation consistency."""
        order_flow = OrderFlow(
            symbol="BTCUSDT",
            timeframe="5m",
            timestamp=datetime.now(timezone.utc),
            delta=Decimal("2000.0"),
            cumulative_delta=Decimal("5000.0"),
            volume=Decimal("10000.0"),
            buy_volume=Decimal("6000.0"),
            sell_volume=Decimal("4000.0"),
            large_trades_count=5,
            imbalance_ratio=1.5
        )
        
        # Delta should equal buy_volume - sell_volume
        expected_delta = order_flow.buy_volume - order_flow.sell_volume
        assert order_flow.delta == expected_delta
