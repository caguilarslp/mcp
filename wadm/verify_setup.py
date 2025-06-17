"""
Quick verification script to test imports and basic functionality.
"""

import sys
import os

# Add src to path for testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_imports():
    """Test that all our modules import correctly."""
    try:
        print("Testing core imports...")
        from src.core.entities import Trade, OrderBook, Kline
        from src.core.types import Symbol, ExchangeName, Side
        print("✓ Core entities and types imported successfully")
        
        print("Testing collector imports...")
        from src.infrastructure.collectors import (
            BaseWebSocketCollector, BybitCollector, BinanceCollector, CollectorManager
        )
        print("✓ Collector classes imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def test_basic_functionality():
    """Test basic functionality without actual connections."""
    try:
        from src.core.entities import Trade, OrderBook, OrderBookLevel
        from src.core.types import Symbol, ExchangeName, Side
        from src.infrastructure.collectors import BybitCollector
        from decimal import Decimal
        from datetime import datetime, timezone
        
        print("Testing entity creation...")
        
        # Test Trade creation
        trade = Trade(
            id="test_123",
            symbol=Symbol("BTCUSDT"),
            exchange=ExchangeName.BYBIT,
            price=Decimal("50000.0"),
            quantity=Decimal("0.01"),
            side=Side.BUY,
            timestamp=datetime.now(timezone.utc),
            is_buyer_maker=False
        )
        print(f"✓ Trade created: {trade.symbol} {trade.side} {trade.quantity} @ {trade.price}")
        
        # Test OrderBook creation
        orderbook = OrderBook(
            symbol=Symbol("BTCUSDT"),
            exchange=ExchangeName.BYBIT,
            timestamp=datetime.now(timezone.utc),
            bids=[
                OrderBookLevel(price=Decimal("49999"), quantity=Decimal("1.0")),
                OrderBookLevel(price=Decimal("49998"), quantity=Decimal("2.0")),
            ],
            asks=[
                OrderBookLevel(price=Decimal("50001"), quantity=Decimal("1.5")),
                OrderBookLevel(price=Decimal("50002"), quantity=Decimal("0.5")),
            ]
        )
        print(f"✓ OrderBook created: {orderbook.symbol} spread={orderbook.spread}")
        
        # Test collector initialization (without connecting)
        collector = BybitCollector(
            symbols=[Symbol("BTCUSDT")],
            max_reconnect_attempts=1,
            reconnect_delay=1.0
        )
        print(f"✓ Collector created: {collector.exchange} with {len(collector.symbols)} symbols")
        
        return True
        
    except Exception as e:
        print(f"✗ Functionality test error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run verification tests."""
    print("WADM WebSocket Collectors - Verification Script")
    print("=" * 50)
    
    # Test imports
    if not test_imports():
        print("\n❌ Import tests failed")
        return False
    
    print()
    
    # Test basic functionality
    if not test_basic_functionality():
        print("\n❌ Functionality tests failed")
        return False
    
    print("\n✅ All verification tests passed!")
    print("\nNext steps:")
    print("1. Run 'python examples/basic_usage.py single' to test a single collector")
    print("2. Run 'python examples/basic_usage.py basic' to test multiple collectors")
    print("3. Run tests with 'pytest tests/' for comprehensive testing")
    
    return True


if __name__ == "__main__":
    main()
