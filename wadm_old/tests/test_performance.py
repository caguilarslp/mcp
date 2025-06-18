"""
Performance and benchmark tests
"""

import pytest
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import List

from src.core.entities import Trade, TradeType, VolumeProfile, VolumeNode


class TestPerformance:
    """Performance tests for core components."""
    
    @pytest.mark.benchmark(group="trade_creation")
    def test_trade_creation_performance(self, benchmark):
        """Benchmark trade creation performance."""
        
        def create_trade():
            return Trade(
                symbol="BTCUSDT",
                price=Decimal("50000.0"),
                quantity=Decimal("1.0"),
                timestamp=datetime.now(timezone.utc),
                trade_type=TradeType.BUY,
                trade_id="test_123"
            )
        
        result = benchmark(create_trade)
        assert result.symbol == "BTCUSDT"
    
    @pytest.mark.benchmark(group="volume_calculation")
    def test_volume_calculation_performance(self, benchmark):
        """Benchmark volume calculation performance."""
        
        def calculate_volumes():
            trades = []
            for i in range(1000):
                trade = Trade(
                    symbol="BTCUSDT",
                    price=Decimal(f"{50000 + i}"),
                    quantity=Decimal("0.1"),
                    timestamp=datetime.now(timezone.utc),
                    trade_type=TradeType.BUY if i % 2 == 0 else TradeType.SELL,
                    trade_id=f"trade_{i}"
                )
                trades.append(trade)
            
            total_volume = sum(trade.volume for trade in trades)
            return total_volume
        
        result = benchmark(calculate_volumes)
        assert result > 0
    
    @pytest.mark.benchmark(group="volume_profile")
    def test_volume_profile_creation_performance(self, benchmark):
        """Benchmark volume profile creation."""
        
        def create_volume_profile():
            nodes = []
            for i in range(100):
                price = Decimal(f"{50000 + i * 10}")
                volume = Decimal(f"{1000 - i * 5}")
                buy_volume = volume * Decimal("0.6")
                sell_volume = volume - buy_volume
                
                node = VolumeNode(
                    price_level=price,
                    volume=volume,
                    buy_volume=buy_volume,
                    sell_volume=sell_volume,
                    trade_count=50
                )
                nodes.append(node)
            
            return VolumeProfile(
                symbol="BTCUSDT",
                timeframe="1h",
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc),
                nodes=nodes
            )
        
        result = benchmark(create_volume_profile)
        assert len(result.nodes) == 100
    
    @pytest.mark.benchmark(group="poc_calculation")
    def test_poc_calculation_performance(self, benchmark):
        """Benchmark POC calculation performance."""
        
        # Create a large volume profile
        nodes = []
        for i in range(1000):
            price = Decimal(f"{40000 + i}")
            volume = Decimal(f"{1000 + (i % 100) * 10}")  # Varying volumes
            buy_volume = volume * Decimal("0.6")
            sell_volume = volume - buy_volume
            
            node = VolumeNode(
                price_level=price,
                volume=volume,
                buy_volume=buy_volume,
                sell_volume=sell_volume,
                trade_count=50
            )
            nodes.append(node)
        
        profile = VolumeProfile(
            symbol="BTCUSDT",
            timeframe="1h",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            nodes=nodes
        )
        
        def calculate_poc():
            return profile.poc
        
        result = benchmark(calculate_poc)
        assert result is not None
    
    @pytest.mark.benchmark(group="vah_val_calculation")
    def test_vah_val_calculation_performance(self, benchmark):
        """Benchmark VAH/VAL calculation performance."""
        
        # Create a large volume profile
        nodes = []
        for i in range(500):
            price = Decimal(f"{50000 + i}")
            volume = Decimal(f"{500 + i}")
            buy_volume = volume * Decimal("0.6")
            sell_volume = volume - buy_volume
            
            node = VolumeNode(
                price_level=price,
                volume=volume,
                buy_volume=buy_volume,
                sell_volume=sell_volume,
                trade_count=25
            )
            nodes.append(node)
        
        profile = VolumeProfile(
            symbol="BTCUSDT",
            timeframe="1h",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            nodes=nodes
        )
        
        def calculate_value_area():
            return (profile.vah, profile.val)
        
        result = benchmark(calculate_value_area)
        vah, val = result
        assert vah is not None
        assert val is not None
        assert val <= vah
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark(group="async_processing")
    async def test_async_trade_processing(self, benchmark):
        """Benchmark async trade processing."""
        
        async def process_trades():
            tasks = []
            
            async def process_single_trade(trade_data):
                # Simulate async processing
                await asyncio.sleep(0.001)  # 1ms delay
                return Trade(
                    symbol=trade_data["symbol"],
                    price=trade_data["price"],
                    quantity=trade_data["quantity"],
                    timestamp=trade_data["timestamp"],
                    trade_type=trade_data["trade_type"],
                    trade_id=trade_data["trade_id"]
                )
            
            # Create 50 trade processing tasks
            for i in range(50):
                trade_data = {
                    "symbol": "BTCUSDT",
                    "price": Decimal(f"{50000 + i}"),
                    "quantity": Decimal("0.1"),
                    "timestamp": datetime.now(timezone.utc),
                    "trade_type": TradeType.BUY if i % 2 == 0 else TradeType.SELL,
                    "trade_id": f"async_trade_{i}"
                }
                tasks.append(process_single_trade(trade_data))
            
            results = await asyncio.gather(*tasks)
            return results
        
        # Note: pytest-benchmark doesn't directly support async functions
        # This is a simplified version for demonstration
        results = await process_trades()
        assert len(results) == 50
        assert all(isinstance(trade, Trade) for trade in results)


class TestMemoryUsage:
    """Memory usage tests."""
    
    def test_large_volume_profile_memory(self):
        """Test memory usage with large volume profiles."""
        import sys
        
        # Create a large volume profile
        nodes = []
        for i in range(10000):  # 10k nodes
            price = Decimal(f"{40000 + i * 0.01}")
            volume = Decimal(f"{100 + i % 1000}")
            buy_volume = volume * Decimal("0.6")
            sell_volume = volume - buy_volume
            
            node = VolumeNode(
                price_level=price,
                volume=volume,
                buy_volume=buy_volume,
                sell_volume=sell_volume,
                trade_count=10
            )
            nodes.append(node)
        
        profile = VolumeProfile(
            symbol="BTCUSDT",
            timeframe="1h",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            nodes=nodes
        )
        
        # Basic memory usage check
        size = sys.getsizeof(profile) + sum(sys.getsizeof(node) for node in profile.nodes)
        
        # Should be reasonable for 10k nodes (less than 10MB)
        assert size < 10 * 1024 * 1024
        
        # POC calculation should still work efficiently
        poc = profile.poc
        assert poc is not None
    
    def test_trade_list_memory_efficiency(self):
        """Test memory efficiency of trade lists."""
        import sys
        
        # Create 10k trades
        trades = []
        for i in range(10000):
            trade = Trade(
                symbol="BTCUSDT",
                price=Decimal(f"{50000 + (i % 1000)}"),
                quantity=Decimal("0.1"),
                timestamp=datetime.now(timezone.utc),
                trade_type=TradeType.BUY if i % 2 == 0 else TradeType.SELL,
                trade_id=f"trade_{i}"
            )
            trades.append(trade)
        
        # Calculate memory usage
        total_size = sys.getsizeof(trades) + sum(sys.getsizeof(trade) for trade in trades)
        
        # Should be reasonable (less than 50MB for 10k trades)
        assert total_size < 50 * 1024 * 1024
        
        # Verify all trades are valid
        assert len(trades) == 10000
        assert all(isinstance(trade, Trade) for trade in trades)
