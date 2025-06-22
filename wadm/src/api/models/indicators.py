"""
WADM Indicators API Models
Pydantic models for indicator responses
"""

from datetime import datetime
from typing import List, Dict, Optional, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class VolumeNode(BaseModel):
    """Volume node in Volume Profile"""
    price: float = Field(..., description="Price level")
    volume: float = Field(..., description="Volume at this price level")
    percentage: float = Field(..., description="Percentage of total volume")


class VolumeProfileResponse(BaseModel):
    """Volume Profile API response"""
    symbol: str = Field(..., description="Trading symbol")
    timeframe: str = Field(..., description="Analysis timeframe")
    timestamp: datetime = Field(..., description="Calculation timestamp")
    poc: float = Field(..., description="Point of Control price")
    vah: float = Field(..., description="Value Area High")
    val: float = Field(..., description="Value Area Low")
    total_volume: float = Field(..., description="Total volume in period")
    volume_nodes: List[VolumeNode] = Field(..., description="Volume distribution by price")
    session_data: Dict[str, Any] = Field(..., description="Session information")
    metadata: Dict[str, Any] = Field(..., description="Calculation metadata")


class AbsorptionEvent(BaseModel):
    """Order Flow absorption event"""
    timestamp: datetime = Field(..., description="Event timestamp")
    price: float = Field(..., description="Price where absorption occurred")
    volume: float = Field(..., description="Volume absorbed")
    side: str = Field(..., description="Buy or sell side")
    intensity: float = Field(..., description="Absorption intensity score")


class OrderFlowResponse(BaseModel):
    """Order Flow API response"""
    symbol: str = Field(..., description="Trading symbol")
    timeframe: str = Field(..., description="Analysis timeframe")
    timestamp: datetime = Field(..., description="Calculation timestamp")
    delta: float = Field(..., description="Current delta (buy - sell volume)")
    cumulative_delta: float = Field(..., description="Cumulative delta")
    buy_volume: float = Field(..., description="Buy volume in period")
    sell_volume: float = Field(..., description="Sell volume in period")
    absorption_events: List[AbsorptionEvent] = Field(..., description="Detected absorption events")
    momentum_score: float = Field(..., description="Order flow momentum score")
    metadata: Dict[str, Any] = Field(..., description="Calculation metadata")


class OrderBlock(BaseModel):
    """SMC Order Block"""
    id: str = Field(..., description="Order block unique ID")
    price_high: float = Field(..., description="Order block high price")
    price_low: float = Field(..., description="Order block low price")
    timestamp: datetime = Field(..., description="Formation timestamp")
    block_type: str = Field(..., description="Bullish or bearish")
    strength: float = Field(..., description="Order block strength score")
    volume: float = Field(..., description="Formation volume")
    status: str = Field(..., description="Active, tested, or mitigated")


class FairValueGap(BaseModel):
    """SMC Fair Value Gap"""
    id: str = Field(..., description="FVG unique ID")
    price_high: float = Field(..., description="Gap high price")
    price_low: float = Field(..., description="Gap low price")
    timestamp: datetime = Field(..., description="Formation timestamp")
    gap_type: str = Field(..., description="Bullish or bearish")
    fill_probability: float = Field(..., description="Probability of gap fill")
    status: str = Field(..., description="Open, partial, or filled")


class StructureBreak(BaseModel):
    """SMC Structure Break"""
    id: str = Field(..., description="Break unique ID")
    break_type: str = Field(..., description="BOS or CHoCH")
    price: float = Field(..., description="Break price level")
    timestamp: datetime = Field(..., description="Break timestamp")
    timeframe: str = Field(..., description="Timeframe of break")
    confirmation: bool = Field(..., description="Break confirmed")
    volume: float = Field(..., description="Break volume")


class SMCAnalysisResponse(BaseModel):
    """SMC Analysis API response"""
    symbol: str = Field(..., description="Trading symbol")
    timeframe: str = Field(..., description="Analysis timeframe")
    timestamp: datetime = Field(..., description="Analysis timestamp")
    order_blocks: List[OrderBlock] = Field(..., description="Active order blocks")
    fair_value_gaps: List[FairValueGap] = Field(..., description="Active FVGs")
    structure_breaks: List[StructureBreak] = Field(..., description="Recent structure breaks")
    confluence_score: float = Field(..., description="Overall confluence score")
    market_bias: str = Field(..., description="Bullish, bearish, or neutral")
    institutional_activity: Dict[str, Any] = Field(..., description="Institutional metrics")
    metadata: Dict[str, Any] = Field(..., description="Analysis metadata")


class TradingSignal(BaseModel):
    """SMC Trading Signal"""
    id: str = Field(..., description="Signal unique ID")
    signal_type: str = Field(..., description="Long or short signal")
    entry_price: float = Field(..., description="Suggested entry price")
    stop_loss: float = Field(..., description="Stop loss level")
    take_profit: List[float] = Field(..., description="Take profit levels")
    confidence: float = Field(..., description="Signal confidence score")
    risk_reward: float = Field(..., description="Risk to reward ratio")
    confluence_factors: List[str] = Field(..., description="Supporting factors")
    position_size: Optional[float] = Field(None, description="Suggested position size")
    timestamp: datetime = Field(..., description="Signal generation time")
    expiry: Optional[datetime] = Field(None, description="Signal expiry time")


class SMCSignalsResponse(BaseModel):
    """SMC Signals API response"""
    symbol: str = Field(..., description="Trading symbol")
    timestamp: datetime = Field(..., description="Analysis timestamp")
    active_signals: List[TradingSignal] = Field(..., description="Current active signals")
    signal_count: int = Field(..., description="Total number of signals")
    average_confidence: float = Field(..., description="Average signal confidence")
    market_conditions: Dict[str, Any] = Field(..., description="Current market conditions")
    risk_assessment: Dict[str, Any] = Field(..., description="Risk assessment")
    metadata: Dict[str, Any] = Field(..., description="Signal generation metadata")


class IndicatorStatus(BaseModel):
    """Indicators system status"""
    available_symbols: List[str] = Field(..., description="Available trading symbols")
    last_volume_profile_update: Optional[datetime] = Field(None, description="Last VP calculation")
    last_order_flow_update: Optional[datetime] = Field(None, description="Last OF calculation")
    smc_analyses_count: int = Field(..., description="Number of SMC analyses stored")
    cache_enabled: bool = Field(..., description="Cache system status")
    status: str = Field(..., description="Overall system status")
