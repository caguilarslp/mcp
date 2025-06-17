"""
Tests for Volume Profile Service.

This module contains comprehensive tests for the VolumeProfileService and
VolumeProfileCalculator classes, covering all calculation scenarios.
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import Mock, AsyncMock
from typing import List

from src.core.entities import Trade, VolumeProfile
from src.core.types import Symbol, Exchange, Side
from src.application.services.volume_profile_service import (
    VolumeProfileService, 
    VolumeProfileCalculator
)
from src.infrastructure.database.repositories import TradeRepository


class TestVolumeProfileCalculator:
    """Test cases for VolumeProfileCalculator."""
    
    @pytest.fixture
    def calculator(self):
        """Create calculator instance with default tick size."""
        return VolumeProfileCalculator(tick_size=Decimal("0.01"))
    
    @pytest.fixture
    def sample_trades(self) -> List[Trade]:
        """Create sample trades for testing."""
        base_time = datetime(2025, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
        
        return [
            Trade(
                id="1",
                symbol="BTCUSDT",
                exchange="binance",
                price=Decimal("50000.00"),
                quantity=Decimal("1.0"),
                side=Side.BUY,
                timestamp=base_time,
                is_buyer_maker=False
            ),
            Trade(
                id="2",
                symbol="BTCUSDT",
                exchange="binance",
                price=Decimal("50000.00"),  # Same price - should aggregate
                quantity=Decimal("2.0"),
                side=Side.SELL,
                timestamp=base_time + timedelta(minutes=1),
                is_buyer_maker=True
            ),
            Trade(
                id="3",
                symbol="BTCUSDT",
                exchange="binance",
                price=Decimal("50100.00"),
                quantity=Decimal("0.5"),
                side=Side.BUY,
                timestamp=base_time + timedelta(minutes=2),
                is_buyer_maker=False
            ),
            Trade(
                id="4",
                symbol="BTCUSDT",
                exchange="binance",
                price=Decimal("49900.00"),
                quantity=Decimal("1.5"),
                side=Side.SELL,
                timestamp=base_time + timedelta(minutes=3),
                is_buyer_maker=True
            ),
            Trade(
                id="5",
                symbol="BTCUSDT",
                exchange="binance",
                price=Decimal("50050.00"),
                quantity=Decimal("0.8"),
                side=Side.BUY,
                timestamp=base_time + timedelta(minutes=4),
                is_buyer_maker=False
            )
        ]
    
    def test_calculate_price_levels_empty_trades(self, calculator):
        """Test price levels calculation with empty trades list."""
        price_levels = calculator.calculate_price_levels([])
        assert price_levels == {}
    
    def test_calculate_price_levels_single_trade(self, calculator):
        """Test price levels calculation with single trade."""
        trade = Trade(
            id="1",
            symbol="BTCUSDT",
            exchange="binance",
            price=Decimal("50000.00"),
            quantity=Decimal("1.0"),
            side=Side.BUY,
            timestamp=datetime.now(timezone.utc),
            is_buyer_maker=False
        )
        
        price_levels = calculator.calculate_price_levels([trade])
        
        assert len(price_levels) == 1
        assert price_levels[Decimal("50000.00")] == Decimal("1.0")
    
    def test_calculate_price_levels_aggregation(self, calculator, sample_trades):
        """Test price levels calculation with trade aggregation."""
        price_levels = calculator.calculate_price_levels(sample_trades)
        
        # Should have 4 distinct price levels
        assert len(price_levels) == 4
        
        # Price 50000.00 should have aggregated volume (1.0 + 2.0 = 3.0)
        assert price_levels[Decimal("50000.00")] == Decimal("3.0")
        assert price_levels[Decimal("50100.00")] == Decimal("0.5")
        assert price_levels[Decimal("49900.00")] == Decimal("1.5")
        assert price_levels[Decimal("50050.00")] == Decimal("0.8")
    
    def test_calculate_poc_empty_levels(self, calculator):
        """Test POC calculation with empty price levels."""
        poc = calculator.calculate_poc({})
        assert poc is None
    
    def test_calculate_poc_single_level(self, calculator):
        """Test POC calculation with single price level."""
        price_levels = {Decimal("50000.00"): Decimal("10.0")}
        poc = calculator.calculate_poc(price_levels)
        assert poc == Decimal("50000.00")
    
    def test_calculate_poc_multiple_levels(self, calculator, sample_trades):
        """Test POC calculation with multiple price levels."""
        price_levels = calculator.calculate_price_levels(sample_trades)
        poc = calculator.calculate_poc(price_levels)
        
        # POC should be 50000.00 (highest volume: 3.0)
        assert poc == Decimal("50000.00")
    
    def test_calculate_value_area_empty_levels(self, calculator):
        """Test value area calculation with empty price levels."""
        vah, val, va_volume = calculator.calculate_value_area({})
        assert vah is None
        assert val is None
        assert va_volume == Decimal("0")
    
    def test_calculate_value_area_single_level(self, calculator):
        """Test value area calculation with single price level."""
        price_levels = {Decimal("50000.00"): Decimal("10.0")}
        vah, val, va_volume = calculator.calculate_value_area(price_levels)
        
        assert vah == Decimal("50000.00")
        assert val == Decimal("50000.00")
        assert va_volume == Decimal("10.0")
    
    def test_calculate_value_area_multiple_levels(self, calculator, sample_trades):
        """Test value area calculation with multiple price levels."""
        price_levels = calculator.calculate_price_levels(sample_trades)
        vah, val, va_volume = calculator.calculate_value_area(price_levels)
        
        # Total volume: 3.0 + 0.5 + 1.5 + 0.8 = 5.8
        # 70% target: 5.8 * 0.7 = 4.06
        # POC: 50000.00 (volume 3.0)
        # Should expand to include 50050.00 (volume 0.8) to reach 3.8
        # Then include 49900.00 (volume 1.5) to reach 5.3 > 4.06
        
        assert vah is not None
        assert val is not None
        assert va_volume >= Decimal("4.06")  # At least 70% of total volume
    
    def test_round_to_tick_exact_tick(self, calculator):
        """Test rounding to tick with exact tick size."""
        price = Decimal("50000.00")
        rounded = calculator._round_to_tick(price)
        assert rounded == Decimal("50000.00")
    
    def test_round_to_tick_needs_rounding(self, calculator):
        """Test rounding to tick with price that needs rounding."""
        price = Decimal("50000.005")  # Should round to 50000.01
        rounded = calculator._round_to_tick(price)
        assert rounded == Decimal("50000.01")
    
    def test_different_tick_sizes(self):
        """Test calculator with different tick sizes."""
        # Small tick size
        calculator_small = VolumeProfileCalculator(tick_size=Decimal("0.001"))
        price = Decimal("50000.0025")
        rounded_small = calculator_small._round_to_tick(price)
        assert rounded_small == Decimal("50000.003")
        
        # Large tick size
        calculator_large = VolumeProfileCalculator(tick_size=Decimal("1.0"))
        rounded_large = calculator_large._round_to_tick(price)
        assert rounded_large == Decimal("50000.0")


class TestVolumeProfileService:
    """Test cases for VolumeProfileService."""
    
    @pytest.fixture
    def mock_trade_repository(self):
        """Create mock trade repository."""
        return Mock(spec=TradeRepository)
    
    @pytest.fixture
    def service(self, mock_trade_repository):
        """Create VolumeProfileService instance."""
        return VolumeProfileService(mock_trade_repository)
    
    @pytest.fixture
    def sample_trades(self) -> List[Trade]:
        """Create sample trades for testing."""
        base_time = datetime(2025, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
        
        return [
            Trade(
                id="1",
                symbol="BTCUSDT",
                exchange="binance",
                price=Decimal("50000.00"),
                quantity=Decimal("2.0"),
                side=Side.BUY,
                timestamp=base_time,
                is_buyer_maker=False
            ),
            Trade(
                id="2",
                symbol="BTCUSDT",
                exchange="binance",
                price=Decimal("50100.00"),
                quantity=Decimal("1.0"),
                side=Side.SELL,
                timestamp=base_time + timedelta(minutes=1),
                is_buyer_maker=True
            )
        ]
    
    def test_get_calculator_creates_new(self, service):
        """Test that get_calculator creates new calculator for symbol."""
        symbol = "BTCUSDT"
        calculator = service.get_calculator(symbol)
        
        assert symbol in service.calculators
        assert isinstance(calculator, VolumeProfileCalculator)
    
    def test_get_calculator_reuses_existing(self, service):
        """Test that get_calculator reuses existing calculator."""
        symbol = "BTCUSDT"
        calculator1 = service.get_calculator(symbol)
        calculator2 = service.get_calculator(symbol)
        
        assert calculator1 is calculator2
    
    def test_get_tick_size_btc(self, service):
        """Test tick size determination for BTC pairs."""
        tick_size = service._get_tick_size("BTCUSDT")
        assert tick_size == Decimal("0.01")
    
    def test_get_tick_size_eth(self, service):
        """Test tick size determination for ETH pairs."""
        tick_size = service._get_tick_size("ETHUSDT")
        assert tick_size == Decimal("0.01")
    
    def test_get_tick_size_stablecoin(self, service):
        """Test tick size determination for stablecoin pairs."""
        tick_size = service._get_tick_size("USDCUSDT")
        assert tick_size == Decimal("0.001")
    
    def test_get_tick_size_default(self, service):
        """Test tick size determination for other pairs."""
        tick_size = service._get_tick_size("SOLUSDT")
        assert tick_size == Decimal("0.0001")
    
    @pytest.mark.asyncio
    async def test_calculate_volume_profile_no_trades(self, service, mock_trade_repository):
        """Test volume profile calculation with no trades."""
        # Mock repository to return empty list
        mock_trade_repository.find_by_time_range = AsyncMock(return_value=[])
        
        start_time = datetime(2025, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
        end_time = start_time + timedelta(hours=1)
        
        result = await service.calculate_volume_profile(
            symbol="BTCUSDT",
            exchange="binance",
            start_time=start_time,
            end_time=end_time
        )
        
        assert result is None
        mock_trade_repository.find_by_time_range.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_calculate_volume_profile_success(self, service, mock_trade_repository, sample_trades):
        """Test successful volume profile calculation."""
        # Mock repository to return sample trades
        mock_trade_repository.find_by_time_range = AsyncMock(return_value=sample_trades)
        
        start_time = datetime(2025, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
        end_time = start_time + timedelta(hours=1)
        
        result = await service.calculate_volume_profile(
            symbol="BTCUSDT",
            exchange="binance",
            start_time=start_time,
            end_time=end_time
        )
        
        assert result is not None
        assert isinstance(result, VolumeProfile)
        assert result.symbol == "BTCUSDT"
        assert result.exchange == "binance"
        assert result.start_time == start_time
        assert result.end_time == end_time
        assert result.total_volume == Decimal("3.0")  # 2.0 + 1.0
        assert result.poc_price == Decimal("50000.00")  # Higher volume
        
        mock_trade_repository.find_by_time_range.assert_called_once_with(
            symbol="BTCUSDT",
            exchange="binance",
            start_time=start_time,
            end_time=end_time
        )
    
    @pytest.mark.asyncio
    async def test_calculate_volume_profile_repository_error(self, service, mock_trade_repository):
        """Test volume profile calculation with repository error."""
        # Mock repository to raise exception
        mock_trade_repository.find_by_time_range = AsyncMock(side_effect=Exception("DB error"))
        
        start_time = datetime(2025, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
        end_time = start_time + timedelta(hours=1)
        
        result = await service.calculate_volume_profile(
            symbol="BTCUSDT",
            exchange="binance",
            start_time=start_time,
            end_time=end_time
        )
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_calculate_real_time_profile_1h(self, service, mock_trade_repository, sample_trades):
        """Test real-time profile calculation for 1 hour timeframe."""
        mock_trade_repository.find_by_time_range = AsyncMock(return_value=sample_trades)
        
        result = await service.calculate_real_time_profile(
            symbol="BTCUSDT",
            exchange="binance",
            timeframe_minutes=60
        )
        
        assert result is not None
        assert isinstance(result, VolumeProfile)
        
        # Verify the time range is for current hour
        call_args = mock_trade_repository.find_by_time_range.call_args
        start_time = call_args.kwargs['start_time']
        
        # Start time should be at the beginning of current hour
        assert start_time.minute == 0
        assert start_time.second == 0
        assert start_time.microsecond == 0
    
    @pytest.mark.asyncio
    async def test_calculate_real_time_profile_4h(self, service, mock_trade_repository, sample_trades):
        """Test real-time profile calculation for 4 hour timeframe."""
        mock_trade_repository.find_by_time_range = AsyncMock(return_value=sample_trades)
        
        result = await service.calculate_real_time_profile(
            symbol="BTCUSDT",
            exchange="binance",
            timeframe_minutes=240
        )
        
        assert result is not None
        
        # Verify the time range is for current 4-hour period
        call_args = mock_trade_repository.find_by_time_range.call_args
        start_time = call_args.kwargs['start_time']
        
        # Start time should be at 4-hour boundary (0, 4, 8, 12, 16, 20)
        assert start_time.hour % 4 == 0
        assert start_time.minute == 0
        assert start_time.second == 0
    
    @pytest.mark.asyncio
    async def test_calculate_real_time_profile_1d(self, service, mock_trade_repository, sample_trades):
        """Test real-time profile calculation for daily timeframe."""
        mock_trade_repository.find_by_time_range = AsyncMock(return_value=sample_trades)
        
        result = await service.calculate_real_time_profile(
            symbol="BTCUSDT",
            exchange="binance",
            timeframe_minutes=1440
        )
        
        assert result is not None
        
        # Verify the time range is for current day
        call_args = mock_trade_repository.find_by_time_range.call_args
        start_time = call_args.kwargs['start_time']
        
        # Start time should be at beginning of day
        assert start_time.hour == 0
        assert start_time.minute == 0
        assert start_time.second == 0
    
    @pytest.mark.asyncio
    async def test_get_historical_profiles(self, service, mock_trade_repository, sample_trades):
        """Test historical profiles retrieval."""
        # Mock repository to return sample trades for each call
        mock_trade_repository.find_by_time_range = AsyncMock(return_value=sample_trades)
        
        profiles = await service.get_historical_profiles(
            symbol="BTCUSDT",
            exchange="binance",
            timeframe_minutes=60,
            periods=3
        )
        
        assert len(profiles) == 3
        assert all(isinstance(p, VolumeProfile) for p in profiles)
        
        # Should have been called 3 times for 3 periods
        assert mock_trade_repository.find_by_time_range.call_count == 3
    
    @pytest.mark.asyncio
    async def test_get_historical_profiles_empty_periods(self, service, mock_trade_repository):
        """Test historical profiles with empty periods."""
        # Mock repository to return empty for some periods
        mock_trade_repository.find_by_time_range = AsyncMock(return_value=[])
        
        profiles = await service.get_historical_profiles(
            symbol="BTCUSDT",
            exchange="binance",
            timeframe_minutes=60,
            periods=3
        )
        
        assert len(profiles) == 0  # No profiles returned for empty periods
        assert mock_trade_repository.find_by_time_range.call_count == 3
