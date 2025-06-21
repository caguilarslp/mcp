"""
Market Structure Models for SMC Analysis

Contains dataclasses and enums used by the StructureAnalyzer
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

class TrendDirection(str, Enum):
    """Market trend direction"""
    BULLISH = "bullish"
    BEARISH = "bearish"
    SIDEWAYS = "sideways"
    UNKNOWN = "unknown"

class StructureType(str, Enum):
    """Structure break types"""
    BOS_BULLISH = "bos_bullish"        # Break of Structure - Bullish
    BOS_BEARISH = "bos_bearish"        # Break of Structure - Bearish
    CHOCH_BULLISH = "choch_bullish"    # Change of Character - Bullish
    CHOCH_BEARISH = "choch_bearish"    # Change of Character - Bearish
    MSB_BULLISH = "msb_bullish"        # Market Structure Break - Bullish
    MSB_BEARISH = "msb_bearish"        # Market Structure Break - Bearish

class StructureStrength(str, Enum):
    """Structure break strength"""
    VERY_STRONG = "very_strong"
    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"

@dataclass
class SwingPoint:
    """Swing high or low point"""
    price: float
    timestamp: datetime
    is_high: bool
    volume: float
    institutional_volume: float
    retail_volume: float
    strength: float  # 0-100 score based on multiple factors
    confirmed: bool = False
    retests: int = 0
    institutional_ratio: float = 0.0
    
    def __post_init__(self):
        total_volume = self.institutional_volume + self.retail_volume
        if total_volume > 0:
            self.institutional_ratio = self.institutional_volume / total_volume

@dataclass
class StructureBreak:
    """Enhanced structure break with institutional validation"""
    
    # Core properties
    id: str
    type: StructureType
    strength: StructureStrength
    
    # Price levels
    break_price: float
    previous_level: float
    target_level: Optional[float]
    
    # Timing
    break_time: datetime
    setup_start_time: datetime
    
    # Related swings
    broken_swing: SwingPoint
    trigger_swing: SwingPoint
    
    # Volume analysis
    break_volume: float
    institutional_volume: float
    retail_volume: float
    institutional_ratio: float
    
    # Multi-exchange validation
    exchanges_confirming: List[str]
    multi_exchange_confirmed: bool
    coinbase_leading: bool
    
    # Context
    liquidity_swept: bool
    volume_spike: bool
    structure_significance: float  # 0-100 significance score
    
    # Validation
    previous_tests: int
    invalidation_price: float
    follow_through_confirmed: bool
    false_break: bool = False
    
    # Metadata
    symbol: str = ""
    timeframe: str = "15m"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "type": self.type.value,
            "strength": self.strength.value,
            "break_price": self.break_price,
            "previous_level": self.previous_level,
            "target_level": self.target_level,
            "break_time": self.break_time,
            "setup_start_time": self.setup_start_time,
            "broken_swing": {
                "price": self.broken_swing.price,
                "timestamp": self.broken_swing.timestamp,
                "is_high": self.broken_swing.is_high
            },
            "trigger_swing": {
                "price": self.trigger_swing.price,
                "timestamp": self.trigger_swing.timestamp,
                "is_high": self.trigger_swing.is_high
            },
            "break_volume": self.break_volume,
            "institutional_volume": self.institutional_volume,
            "retail_volume": self.retail_volume,
            "institutional_ratio": self.institutional_ratio,
            "exchanges_confirming": self.exchanges_confirming,
            "multi_exchange_confirmed": self.multi_exchange_confirmed,
            "coinbase_leading": self.coinbase_leading,
            "liquidity_swept": self.liquidity_swept,
            "volume_spike": self.volume_spike,
            "structure_significance": self.structure_significance,
            "previous_tests": self.previous_tests,
            "invalidation_price": self.invalidation_price,
            "follow_through_confirmed": self.follow_through_confirmed,
            "false_break": self.false_break,
            "symbol": self.symbol,
            "timeframe": self.timeframe
        }
