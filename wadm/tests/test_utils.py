"""
Test utilities and helpers
"""

import pytest
from datetime import datetime, timezone
from decimal import Decimal

from src.core.utils.timeframes import (
    TimeframeConverter,
    validate_timeframe,
    get_timeframe_seconds,
    align_timestamp
)
from src.core.utils.validation import (
    validate_symbol,
    validate_price,
    validate_quantity,
    sanitize_symbol
)
from src.core.utils.formatters import (
    format_price,
    format_volume,
    format_percentage,
    format_timestamp
)


class TestTimeframeConverter:
    """Test timeframe conversion utilities."""
    
    def test_validate_timeframe_valid(self):
        """Test valid timeframe validation."""
        valid_timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]
        
        for tf in valid_timeframes:
            assert validate_timeframe(tf) is True
    
    def test_validate_timeframe_invalid(self):
        """Test invalid timeframe validation."""
        invalid_timeframes = ["", "2m", "90m", "3h", "2d", "invalid"]
        
        for tf in invalid_timeframes:
            assert validate_timeframe(tf) is False
    
    def test_get_timeframe_seconds(self):
        """Test timeframe to seconds conversion."""
        assert get_timeframe_seconds("1m") == 60
        assert get_timeframe_seconds("5m") == 300
        assert get_timeframe_seconds("15m") == 900
        assert get_timeframe_seconds("30m") == 1800
        assert get_timeframe_seconds("1h") == 3600
        assert get_timeframe_seconds("4h") == 14400
        assert get_timeframe_seconds("1d") == 86400
        assert get_timeframe_seconds("1w") == 604800
    
    def test_get_timeframe_seconds_invalid(self):
        """Test invalid timeframe seconds conversion."""
        with pytest.raises(ValueError, match="Invalid timeframe"):
            get_timeframe_seconds("invalid")
    
    def test_align_timestamp(self):
        """Test timestamp alignment to timeframe."""
        # Test with 5m timeframe
        timestamp = datetime(2025, 6, 17, 14, 23, 45, tzinfo=timezone.utc)
        aligned = align_timestamp(timestamp, "5m")
        
        # Should align to 14:20:00
        expected = datetime(2025, 6, 17, 14, 20, 0, tzinfo=timezone.utc)
        assert aligned == expected
    
    def test_align_timestamp_1h(self):
        """Test timestamp alignment to 1h."""
        timestamp = datetime(2025, 6, 17, 14, 23, 45, tzinfo=timezone.utc)
        aligned = align_timestamp(timestamp, "1h")
        
        # Should align to 14:00:00
        expected = datetime(2025, 6, 17, 14, 0, 0, tzinfo=timezone.utc)
        assert aligned == expected


class TestValidation:
    """Test validation utilities."""
    
    def test_validate_symbol_valid(self):
        """Test valid symbol validation."""
        valid_symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT"]
        
        for symbol in valid_symbols:
            assert validate_symbol(symbol) is True
    
    def test_validate_symbol_invalid(self):
        """Test invalid symbol validation."""
        invalid_symbols = ["", "btcusdt", "BTC-USDT", "BTC/USDT", "123USDT"]
        
        for symbol in invalid_symbols:
            assert validate_symbol(symbol) is False
    
    def test_sanitize_symbol(self):
        """Test symbol sanitization."""
        assert sanitize_symbol("btcusdt") == "BTCUSDT"
        assert sanitize_symbol("BTC-USDT") == "BTCUSDT"
        assert sanitize_symbol("BTC/USDT") == "BTCUSDT"
        assert sanitize_symbol("BTC_USDT") == "BTCUSDT"
        assert sanitize_symbol("  BTCUSDT  ") == "BTCUSDT"
    
    def test_validate_price_valid(self):
        """Test valid price validation."""
        valid_prices = [
            Decimal("100.0"),
            Decimal("0.001"),
            Decimal("50000.123456")
        ]
        
        for price in valid_prices:
            assert validate_price(price) is True
    
    def test_validate_price_invalid(self):
        """Test invalid price validation."""
        invalid_prices = [
            Decimal("0"),
            Decimal("-100.0"),
            Decimal("0.0")
        ]
        
        for price in invalid_prices:
            assert validate_price(price) is False
    
    def test_validate_quantity_valid(self):
        """Test valid quantity validation."""
        valid_quantities = [
            Decimal("1.0"),
            Decimal("0.001"),
            Decimal("1000.123456")
        ]
        
        for quantity in valid_quantities:
            assert validate_quantity(quantity) is True
    
    def test_validate_quantity_invalid(self):
        """Test invalid quantity validation."""
        invalid_quantities = [
            Decimal("0"),
            Decimal("-1.0"),
            Decimal("0.0")
        ]
        
        for quantity in invalid_quantities:
            assert validate_quantity(quantity) is False


class TestFormatters:
    """Test formatting utilities."""
    
    def test_format_price(self):
        """Test price formatting."""
        assert format_price(Decimal("50000.0")) == "50,000.00"
        assert format_price(Decimal("0.001234")) == "0.001234"
        assert format_price(Decimal("1.23456789")) == "1.234568"
    
    def test_format_volume(self):
        """Test volume formatting."""
        assert format_volume(Decimal("1000.0")) == "1.00K"
        assert format_volume(Decimal("1000000.0")) == "1.00M"
        assert format_volume(Decimal("1500000.0")) == "1.50M"
        assert format_volume(Decimal("123.456")) == "123.46"
    
    def test_format_percentage(self):
        """Test percentage formatting."""
        assert format_percentage(0.1234) == "12.34%"
        assert format_percentage(0.0) == "0.00%"
        assert format_percentage(-0.0567) == "-5.67%"
    
    def test_format_timestamp(self):
        """Test timestamp formatting."""
        timestamp = datetime(2025, 6, 17, 14, 30, 45, tzinfo=timezone.utc)
        
        formatted = format_timestamp(timestamp)
        assert "2025-06-17" in formatted
        assert "14:30:45" in formatted
        
        formatted_date = format_timestamp(timestamp, format_type="date")
        assert formatted_date == "2025-06-17"
        
        formatted_time = format_timestamp(timestamp, format_type="time")
        assert formatted_time == "14:30:45"
