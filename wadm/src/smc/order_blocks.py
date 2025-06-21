"""
Order Block Detection with Institutional Validation

Real implementation - NO PLACEHOLDERS
Detects actual Order Blocks from trades with multi-exchange validation
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from collections import defaultdict
import numpy as np
from ..logger import get_logger

logger = get_logger(__name__)

class OrderBlockType(str, Enum):
    """Order Block types"""
    BULLISH = "bullish"
    BEARISH = "bearish"
    BREAKER = "breaker"  # Mitigated OB that flipped

class OrderBlockStrength(str, Enum):
    """Order Block strength levels"""
    WEAK = "weak"
    MEDIUM = "medium"
    STRONG = "strong"
    VERY_STRONG = "very_strong"

@dataclass
class OrderBlock:
    """Order Block with institutional validation"""
    
    # Core properties (required fields first)
    id: str
    type: OrderBlockType
    symbol: str
    exchange: str
    
    # Price levels
    top: float
    bottom: float
    midpoint: float
    
    # Formation details
    formation_time: datetime
    formation_candles: int
    formation_volume: float
    
    # Volume analysis
    institutional_volume: float  # From Coinbase/Kraken
    retail_volume: float        # From Bybit/Binance
    volume_imbalance: float     # Institutional vs retail ratio
    
    # Strength metrics
    strength: OrderBlockStrength
    confidence_score: float  # 0-100
    
    # Optional fields with defaults
    touches: int = 0
    respected: bool = True
    
    # Multi-exchange validation
    exchanges_confirmed: List[str] = field(default_factory=list)
    exchange_divergence: float = 0.0
    
    # Status
    active: bool = True
    mitigated: bool = False
    mitigation_time: Optional[datetime] = None
    mitigation_price: Optional[float] = None
    
    # Compatibility properties
    @property
    def is_active(self) -> bool:
        """Check if order block is active"""
        return self.active and not self.mitigated
    
    @property
    def direction(self) -> str:
        """Get direction (for compatibility)"""
        return self.type.value
    
    @property
    def zone_high(self) -> float:
        """Get zone high (for compatibility)"""
        return self.top
    
    @property
    def zone_low(self) -> float:
        """Get zone low (for compatibility)"""
        return self.bottom
    
    @property
    def low_price(self) -> float:
        """Get low price (for compatibility)"""
        return self.bottom
    
    @property
    def high_price(self) -> float:
        """Get high price (for compatibility)"""
        return self.top
    
    @property
    def institutional_confirmation(self) -> bool:
        """Check if institutionally confirmed"""
        return self.volume_imbalance > 0.4
    
    @property
    def multi_exchange_confirmed(self) -> bool:
        """Check if confirmed on multiple exchanges"""
        return len(self.exchanges_confirmed) >= 2
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "type": self.type.value,
            "symbol": self.symbol,
            "exchange": self.exchange,
            "top": self.top,
            "bottom": self.bottom,
            "midpoint": self.midpoint,
            "formation_time": self.formation_time,
            "formation_candles": self.formation_candles,
            "formation_volume": self.formation_volume,
            "institutional_volume": self.institutional_volume,
            "retail_volume": self.retail_volume,
            "volume_imbalance": self.volume_imbalance,
            "strength": self.strength.value,
            "confidence_score": self.confidence_score,
            "touches": self.touches,
            "respected": self.respected,
            "exchanges_confirmed": self.exchanges_confirmed,
            "exchange_divergence": self.exchange_divergence,
            "active": self.active,
            "mitigated": self.mitigated,
            "mitigation_time": self.mitigation_time,
            "mitigation_price": self.mitigation_price
        }

class OrderBlockDetector:
    """Enhanced Order Block detector with institutional validation"""
    
    def __init__(self, storage_manager=None):
        self.storage = storage_manager
        self.min_volume_multiplier = 2.0  # Minimum volume spike for OB
        self.min_candles = 3  # Minimum candles for valid OB
        self.institutional_weight = 2.0  # Weight for institutional volume
        self.lookback_periods = 100  # Candles to analyze
        
        # Cache detected blocks
        self.active_blocks: Dict[str, List[OrderBlock]] = defaultdict(list)
        
        logger.info("OrderBlockDetector initialized with institutional validation")
    
    async def detect_order_blocks(self, symbol: str, timeframe: str = "15min") -> List[OrderBlock]:
        """
        Detect Order Blocks from real trade data
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            timeframe: Candle timeframe for analysis
            
        Returns:
            List of detected Order Blocks
        """
        try:
            # Get candles from trades
            candles = await self._build_candles_from_trades(symbol, timeframe)
            
            if len(candles) < self.min_candles:
                logger.debug(f"Not enough candles for OB detection: {len(candles)}")
                return []
            
            # Calculate average volume for comparison
            volumes = [c['volume'] for c in candles]
            avg_volume = np.mean(volumes)
            
            detected_blocks = []
            
            # Scan for Order Blocks
            for i in range(self.min_candles, len(candles) - 1):
                # Check for volume spike
                current_vol = candles[i]['volume']
                if current_vol < avg_volume * self.min_volume_multiplier:
                    continue
                
                # Analyze price action
                prev_candles = candles[max(0, i-self.min_candles):i]
                current = candles[i]
                next_candle = candles[i+1] if i+1 < len(candles) else None
                
                # Detect bullish Order Block
                if self._is_bullish_ob_pattern(prev_candles, current, next_candle):
                    ob = await self._create_order_block(
                        symbol, current, prev_candles, 
                        OrderBlockType.BULLISH, timeframe
                    )
                    if ob and ob.confidence_score >= 60:
                        detected_blocks.append(ob)
                        logger.info(f"[OB] {symbol}: Bullish OB at {ob.bottom:.2f}-{ob.top:.2f}, "
                                  f"confidence={ob.confidence_score:.1f}%, strength={ob.strength.value}")
                
                # Detect bearish Order Block
                elif self._is_bearish_ob_pattern(prev_candles, current, next_candle):
                    ob = await self._create_order_block(
                        symbol, current, prev_candles,
                        OrderBlockType.BEARISH, timeframe
                    )
                    if ob and ob.confidence_score >= 60:
                        detected_blocks.append(ob)
                        logger.info(f"[OB] {symbol}: Bearish OB at {ob.bottom:.2f}-{ob.top:.2f}, "
                                  f"confidence={ob.confidence_score:.1f}%, strength={ob.strength.value}")
            
            # Update cache
            self.active_blocks[symbol] = detected_blocks
            
            # Save to storage if available
            if self.storage and detected_blocks:
                for ob in detected_blocks:
                    self.storage.save_smc_analysis({
                        "type": "order_block",
                        "symbol": symbol,
                        "timestamp": datetime.now(timezone.utc),
                        "data": ob.to_dict()
                    })
            
            return detected_blocks
            
        except Exception as e:
            logger.error(f"Error detecting Order Blocks for {symbol}: {e}", exc_info=True)
            return []
    
    async def _build_candles_from_trades(self, symbol: str, timeframe: str) -> List[Dict[str, Any]]:
        """Build candles from trade data"""
        if not self.storage:
            return []
        
        # Get timeframe in minutes
        tf_minutes = {
            "1min": 1, "5min": 5, "15min": 15, "30min": 30,
            "1h": 60, "4h": 240, "1d": 1440
        }.get(timeframe, 15)
        
        # Get trades from all exchanges
        all_candles = []
        exchanges = ["bybit", "binance", "coinbase", "kraken"]
        
        for exchange in exchanges:
            trades = self.storage.get_recent_trades(
                symbol, exchange, 
                minutes=tf_minutes * self.lookback_periods
            )
            
            if not trades:
                continue
            
            # Group trades into candles
            candles = self._aggregate_trades_to_candles(trades, tf_minutes)
            
            # Add exchange info
            for candle in candles:
                candle['exchange'] = exchange
                candle['is_institutional'] = exchange in ["coinbase", "kraken"]
            
            all_candles.extend(candles)
        
        # Sort by timestamp
        all_candles.sort(key=lambda x: x['timestamp'])
        
        # Merge candles from different exchanges for same time period
        merged_candles = self._merge_exchange_candles(all_candles, tf_minutes)
        
        return merged_candles
    
    def _aggregate_trades_to_candles(self, trades: List[Dict], tf_minutes: int) -> List[Dict]:
        """Aggregate trades into candles"""
        if not trades:
            return []
        
        candles = []
        current_candle = None
        candle_start = None
        
        for trade in trades:
            trade_time = trade['timestamp']
            if isinstance(trade_time, str):
                trade_time = datetime.fromisoformat(trade_time.replace('Z', '+00:00'))
            
            # Calculate candle period
            period_start = trade_time.replace(
                minute=(trade_time.minute // tf_minutes) * tf_minutes,
                second=0, microsecond=0
            )
            
            # Start new candle if needed
            if candle_start != period_start:
                if current_candle:
                    candles.append(current_candle)
                
                current_candle = {
                    'timestamp': period_start,
                    'open': float(trade['price']),
                    'high': float(trade['price']),
                    'low': float(trade['price']),
                    'close': float(trade['price']),
                    'volume': 0.0,
                    'buy_volume': 0.0,
                    'sell_volume': 0.0,
                    'trades': 0
                }
                candle_start = period_start
            
            # Update candle
            price = float(trade['price'])
            volume = float(trade['quantity'])
            
            current_candle['high'] = max(current_candle['high'], price)
            current_candle['low'] = min(current_candle['low'], price)
            current_candle['close'] = price
            current_candle['volume'] += volume
            current_candle['trades'] += 1
            
            if trade.get('side', '').lower() == 'buy':
                current_candle['buy_volume'] += volume
            else:
                current_candle['sell_volume'] += volume
        
        if current_candle:
            candles.append(current_candle)
        
        return candles
    
    def _merge_exchange_candles(self, candles: List[Dict], tf_minutes: int) -> List[Dict]:
        """Merge candles from different exchanges"""
        # Group by timestamp
        candle_groups = defaultdict(list)
        
        for candle in candles:
            key = candle['timestamp']
            candle_groups[key].append(candle)
        
        merged = []
        
        for timestamp, group in sorted(candle_groups.items()):
            # Calculate merged candle
            merged_candle = {
                'timestamp': timestamp,
                'open': group[0]['open'],  # Use first exchange's open
                'high': max(c['high'] for c in group),
                'low': min(c['low'] for c in group),
                'close': group[-1]['close'],  # Use last exchange's close
                'volume': sum(c['volume'] for c in group),
                'buy_volume': sum(c['buy_volume'] for c in group),
                'sell_volume': sum(c['sell_volume'] for c in group),
                'trades': sum(c['trades'] for c in group),
                'institutional_volume': sum(c['volume'] for c in group if c.get('is_institutional')),
                'retail_volume': sum(c['volume'] for c in group if not c.get('is_institutional')),
                'exchanges': list(set(c['exchange'] for c in group))
            }
            merged.append(merged_candle)
        
        return merged
    
    def _is_bullish_ob_pattern(self, prev_candles: List[Dict], current: Dict, 
                               next_candle: Optional[Dict]) -> bool:
        """Check if candles form bullish Order Block pattern"""
        if not prev_candles or not next_candle:
            return False
        
        # Bullish OB: Down move -> Big bullish candle with volume -> Continuation up
        
        # Check previous trend (should be bearish)
        prev_close_avg = np.mean([c['close'] for c in prev_candles[-3:]])
        if current['open'] >= prev_close_avg:
            return False
        
        # Check current candle is bullish with size
        candle_body = abs(current['close'] - current['open'])
        candle_range = current['high'] - current['low']
        
        if current['close'] <= current['open']:  # Not bullish
            return False
        
        if candle_body < candle_range * 0.6:  # Body should be >60% of range
            return False
        
        # Check next candle continues up
        if next_candle['close'] <= current['close']:
            return False
        
        # Check volume spike
        prev_vol_avg = np.mean([c['volume'] for c in prev_candles[-5:]])
        if current['volume'] < prev_vol_avg * self.min_volume_multiplier:
            return False
        
        return True
    
    def _is_bearish_ob_pattern(self, prev_candles: List[Dict], current: Dict,
                               next_candle: Optional[Dict]) -> bool:
        """Check if candles form bearish Order Block pattern"""
        if not prev_candles or not next_candle:
            return False
        
        # Bearish OB: Up move -> Big bearish candle with volume -> Continuation down
        
        # Check previous trend (should be bullish)
        prev_close_avg = np.mean([c['close'] for c in prev_candles[-3:]])
        if current['open'] <= prev_close_avg:
            return False
        
        # Check current candle is bearish with size
        candle_body = abs(current['close'] - current['open'])
        candle_range = current['high'] - current['low']
        
        if current['close'] >= current['open']:  # Not bearish
            return False
        
        if candle_body < candle_range * 0.6:  # Body should be >60% of range
            return False
        
        # Check next candle continues down
        if next_candle['close'] >= current['close']:
            return False
        
        # Check volume spike
        prev_vol_avg = np.mean([c['volume'] for c in prev_candles[-5:]])
        if current['volume'] < prev_vol_avg * self.min_volume_multiplier:
            return False
        
        return True
    
    async def _create_order_block(self, symbol: str, candle: Dict, prev_candles: List[Dict],
                                 ob_type: OrderBlockType, timeframe: str) -> Optional[OrderBlock]:
        """Create Order Block with institutional validation"""
        try:
            # Calculate OB levels
            if ob_type == OrderBlockType.BULLISH:
                top = candle['high']
                bottom = candle['low']
            else:
                top = candle['high']
                bottom = candle['low']
            
            midpoint = (top + bottom) / 2
            
            # Calculate strength based on multiple factors
            strength_score = 0
            
            # 1. Volume analysis (30 points)
            inst_vol = candle.get('institutional_volume', 0)
            retail_vol = candle.get('retail_volume', 0)
            total_vol = inst_vol + retail_vol
            
            if total_vol > 0:
                inst_ratio = inst_vol / total_vol
                if inst_ratio > 0.6:
                    strength_score += 30
                elif inst_ratio > 0.4:
                    strength_score += 20
                elif inst_ratio > 0.2:
                    strength_score += 10
            
            # 2. Volume spike magnitude (20 points)
            prev_vol_avg = np.mean([c['volume'] for c in prev_candles[-5:]])
            vol_spike = candle['volume'] / prev_vol_avg if prev_vol_avg > 0 else 1
            
            if vol_spike > 4:
                strength_score += 20
            elif vol_spike > 3:
                strength_score += 15
            elif vol_spike > 2:
                strength_score += 10
            
            # 3. Candle strength (20 points)
            candle_body = abs(candle['close'] - candle['open'])
            candle_range = candle['high'] - candle['low']
            body_ratio = candle_body / candle_range if candle_range > 0 else 0
            
            if body_ratio > 0.8:
                strength_score += 20
            elif body_ratio > 0.7:
                strength_score += 15
            elif body_ratio > 0.6:
                strength_score += 10
            
            # 4. Multi-exchange confirmation (30 points)
            exchanges = candle.get('exchanges', [])
            if len(exchanges) >= 4:
                strength_score += 30
            elif len(exchanges) >= 3:
                strength_score += 20
            elif len(exchanges) >= 2:
                strength_score += 10
            
            # Determine strength level
            if strength_score >= 80:
                strength = OrderBlockStrength.VERY_STRONG
            elif strength_score >= 60:
                strength = OrderBlockStrength.STRONG
            elif strength_score >= 40:
                strength = OrderBlockStrength.MEDIUM
            else:
                strength = OrderBlockStrength.WEAK
            
            # Create Order Block
            ob = OrderBlock(
                id=f"OB_{symbol}_{candle['timestamp'].isoformat()}_{ob_type.value}",
                type=ob_type,
                symbol=symbol,
                exchange="multi",  # Multi-exchange OB
                top=top,
                bottom=bottom,
                midpoint=midpoint,
                formation_time=candle['timestamp'],
                formation_candles=len(prev_candles) + 1,
                formation_volume=candle['volume'],
                institutional_volume=inst_vol,
                retail_volume=retail_vol,
                volume_imbalance=inst_ratio if total_vol > 0 else 0,
                strength=strength,
                confidence_score=float(strength_score),
                exchanges_confirmed=exchanges
            )
            
            return ob
            
        except Exception as e:
            logger.error(f"Error creating Order Block: {e}", exc_info=True)
            return None
    
    def validate_order_block(self, ob: OrderBlock, current_price: float) -> bool:
        """Validate if Order Block is still active"""
        # Check if price has mitigated the OB
        if ob.type == OrderBlockType.BULLISH:
            if current_price < ob.bottom:
                ob.mitigated = True
                ob.mitigation_time = datetime.now(timezone.utc)
                ob.mitigation_price = current_price
                ob.active = False
                return False
        else:  # Bearish
            if current_price > ob.top:
                ob.mitigated = True
                ob.mitigation_time = datetime.now(timezone.utc)
                ob.mitigation_price = current_price
                ob.active = False
                return False
        
        # Check if OB was touched
        if ob.type == OrderBlockType.BULLISH:
            if ob.bottom <= current_price <= ob.top:
                ob.touches += 1
        else:
            if ob.bottom <= current_price <= ob.top:
                ob.touches += 1
        
        return ob.active
    
    def get_active_order_blocks(self, symbol: str) -> List[OrderBlock]:
        """Get active Order Blocks for a symbol"""
        return [ob for ob in self.active_blocks.get(symbol, []) if ob.active]
    
    def get_nearest_order_block(self, symbol: str, current_price: float, 
                               ob_type: Optional[OrderBlockType] = None) -> Optional[OrderBlock]:
        """Get nearest Order Block to current price"""
        active_obs = self.get_active_order_blocks(symbol)
        
        if ob_type:
            active_obs = [ob for ob in active_obs if ob.type == ob_type]
        
        if not active_obs:
            return None
        
        # Sort by distance to current price
        active_obs.sort(key=lambda ob: abs(ob.midpoint - current_price))
        
        return active_obs[0]
