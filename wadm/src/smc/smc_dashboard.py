"""
Smart Money Concepts (SMC) Dashboard

Complete integration of all SMC components with institutional intelligence.
This dashboard provides comprehensive SMC analysis combining:
- Order Blocks with institutional validation
- Fair Value Gaps with multi-exchange confirmation
- Break of Structure with Smart Money flow
- Liquidity Mapping with real positioning

Value Proposition:
"Transform SMC from pattern recognition to institutional intelligence"
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import statistics
import uuid
from ..logger import get_logger
from .order_blocks import OrderBlockDetector, OrderBlock
from .fvg_detector import FVGDetector, FairValueGap
from .structure_analyzer import StructureAnalyzer, StructureBreak, TrendDirection
from .liquidity_mapper import LiquidityMapper, LiquidityZone

logger = get_logger(__name__)

class SMCBias(str, Enum):
    """Overall SMC market bias"""
    STRONG_BULLISH = "strong_bullish"
    BULLISH = "bullish"
    NEUTRAL = "neutral"
    BEARISH = "bearish"
    STRONG_BEARISH = "strong_bearish"

class ConfluenceStrength(str, Enum):
    """Confluence strength levels"""
    VERY_HIGH = "very_high"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    VERY_LOW = "very_low"

@dataclass
class SMCAnalysis:
    """Complete SMC analysis result"""
    
    # Core analysis
    symbol: str
    timestamp: datetime
    current_price: float
    smc_bias: SMCBias
    trend_direction: str
    institutional_bias: str
    confluence_score: float
    
    # SMC Components
    order_blocks: List[OrderBlock]
    fair_value_gaps: List[FairValueGap]
    structure_breaks: List[StructureBreak]
    liquidity_zones: List[LiquidityZone]
    
    # Key levels
    key_support_levels: List[float]
    key_resistance_levels: List[float]
    immediate_support: Optional[float]
    immediate_resistance: Optional[float]
    
    # Trading signals
    active_signals: List[Any]
    setup_quality: ConfluenceStrength
    next_targets: List[Dict[str, Any]]
    invalidation_levels: List[Dict[str, Any]]
    
    # Institutional metrics
    institutional_activity_score: float
    smart_money_positioning: str  # accumulating, distributing, neutral
    institutional_sentiment: str   # bullish, bearish, neutral
    
    # Performance metrics
    signal_accuracy_24h: float
    institutional_confirmation_rate: float
    multi_exchange_validation_rate: float
    
    # Analysis narrative
    market_narrative: str
    key_insights: List[str]
    trading_recommendations: List[str]
    risk_warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "symbol": self.symbol,
            "timestamp": self.timestamp,
            "current_price": self.current_price,
            "smc_bias": self.smc_bias.value,
            "trend_direction": self.trend_direction,
            "institutional_bias": self.institutional_bias,
            "confluence_score": self.confluence_score,
            "order_blocks_count": len(self.order_blocks),
            "fair_value_gaps_count": len(self.fair_value_gaps),
            "structure_breaks_count": len(self.structure_breaks),
            "liquidity_zones_count": len(self.liquidity_zones),
            "key_support_levels": self.key_support_levels,
            "key_resistance_levels": self.key_resistance_levels,
            "immediate_support": self.immediate_support,
            "immediate_resistance": self.immediate_resistance,
            "active_signals_count": len(self.active_signals),
            "setup_quality": self.setup_quality.value,
            "next_targets": self.next_targets,
            "invalidation_levels": self.invalidation_levels,
            "institutional_activity_score": self.institutional_activity_score,
            "smart_money_positioning": self.smart_money_positioning,
            "institutional_sentiment": self.institutional_sentiment,
            "signal_accuracy_24h": self.signal_accuracy_24h,
            "institutional_confirmation_rate": self.institutional_confirmation_rate,
            "multi_exchange_validation_rate": self.multi_exchange_validation_rate,
            "market_narrative": self.market_narrative,
            "key_insights": self.key_insights,
            "trading_recommendations": self.trading_recommendations,
            "risk_warnings": self.risk_warnings
        }

@dataclass
class SMCSignal:
    """Trading signal based on SMC analysis"""
    
    # Signal properties
    id: str
    type: str  # long, short
    strength: ConfluenceStrength
    confidence: float  # 0-100
    
    # Entry/Exit levels
    entry_price: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    take_profit_3: float
    
    # Risk management
    risk_reward_ratio: float
    max_risk_pct: float
    position_size_suggestion: float  # % of capital
    
    # Supporting elements
    supporting_order_blocks: List[str]
    supporting_fvgs: List[str]
    supporting_structure: List[str]
    supporting_liquidity: List[str]
    
    # Validation
    institutional_confirmation: bool
    multi_exchange_validated: bool
    institutional_ratio: float
    
    # Timing
    formation_time: datetime
    expiry_time: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "type": self.type,
            "strength": self.strength.value,
            "confidence": self.confidence,
            "entry_price": self.entry_price,
            "stop_loss": self.stop_loss,
            "take_profit_1": self.take_profit_1,
            "take_profit_2": self.take_profit_2,
            "take_profit_3": self.take_profit_3,
            "risk_reward_ratio": self.risk_reward_ratio,
            "max_risk_pct": self.max_risk_pct,
            "position_size_suggestion": self.position_size_suggestion,
            "supporting_order_blocks": self.supporting_order_blocks,
            "supporting_fvgs": self.supporting_fvgs,
            "supporting_structure": self.supporting_structure,
            "supporting_liquidity": self.supporting_liquidity,
            "institutional_confirmation": self.institutional_confirmation,
            "multi_exchange_validated": self.multi_exchange_validated,
            "institutional_ratio": self.institutional_ratio,
            "formation_time": self.formation_time,
            "expiry_time": self.expiry_time
        }

class SMCDashboard:
    """Smart Money Concepts Dashboard with Institutional Intelligence"""
    
    def __init__(self, storage_manager=None):
        self.storage = storage_manager
        
        # Initialize all SMC components
        self.order_block_detector = OrderBlockDetector(storage_manager)
        self.fvg_detector = FVGDetector(storage_manager)
        self.structure_analyzer = StructureAnalyzer(storage_manager)
        self.liquidity_mapper = LiquidityMapper(storage_manager)
        
        # Cache for analysis results
        self.analysis_cache: Dict[str, Tuple[SMCAnalysis, datetime]] = {}
        self.cache_ttl = timedelta(minutes=5)
        
        # Signal tracking
        self.signal_cache: Dict[str, List[SMCSignal]] = {}
        self.signal_history: List[SMCSignal] = []
        self.signal_expiry_hours = 4
        self.min_confluence_for_signal = 70.0
        
        # Performance tracking
        self.performance_metrics = {
            'total_signals': 0,
            'successful_signals': 0,
            'failed_signals': 0,
            'average_rr': 0.0,
            'win_rate': 0.0
        }
        
        logger.info("SMCDashboard initialized with institutional intelligence")
    
    async def get_comprehensive_analysis(self, symbol: str) -> SMCAnalysis:
        """
        Get comprehensive SMC analysis for a symbol
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            
        Returns:
            Complete SMC analysis with institutional validation
        """
        try:
            # Check cache first
            if symbol in self.analysis_cache:
                cached_analysis, cached_time = self.analysis_cache[symbol]
                if datetime.now(timezone.utc) - cached_time < self.cache_ttl:
                    logger.debug(f"Returning cached SMC analysis for {symbol}")
                    return cached_analysis
            
            logger.info(f"Performing comprehensive SMC analysis for {symbol}")
            
            # Get current price (would come from market data in production)
            current_price = await self._get_current_price(symbol)
            
            # Run all SMC components in parallel
            results = await asyncio.gather(
                self.order_block_detector.detect_order_blocks(symbol),
                self.fvg_detector.detect_fair_value_gaps(symbol),
                self.structure_analyzer.analyze_market_structure(symbol),
                self.liquidity_mapper.map_liquidity_zones(symbol),
                return_exceptions=True
            )
            
            # Parse results
            order_blocks = results[0] if not isinstance(results[0], Exception) else []
            fair_value_gaps = results[1] if not isinstance(results[1], Exception) else []
            structure_analysis = results[2] if not isinstance(results[2], Exception) else None
            liquidity_zones = results[3] if not isinstance(results[3], Exception) else []
            
            # Log any errors
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    component_names = ['order_blocks', 'fair_value_gaps', 'structure', 'liquidity']
                    logger.error(f"Error in {component_names[i]}: {result}")
            
            # Calculate confluence and bias
            confluence_data = await self._calculate_confluence(
                order_blocks, fair_value_gaps, structure_analysis, liquidity_zones, current_price
            )
            
            # Generate trading signals if confluence is high
            active_signals = []
            if confluence_data['confluence_score'] >= self.min_confluence_for_signal:
                active_signals = await self._generate_trading_signals(
                    symbol, current_price, order_blocks, fair_value_gaps, 
                    structure_analysis, liquidity_zones, confluence_data
                )
            
            # Extract key levels
            key_levels = self._extract_key_levels(order_blocks, liquidity_zones, structure_analysis)
            
            # Calculate institutional metrics
            institutional_metrics = self._calculate_institutional_metrics(
                order_blocks, fair_value_gaps, liquidity_zones
            )
            
            # Generate analysis narrative
            narrative_data = self._generate_analysis_narrative(
                symbol, current_price, confluence_data, institutional_metrics,
                order_blocks, fair_value_gaps, structure_analysis, liquidity_zones
            )
            
            # Create comprehensive analysis
            analysis = SMCAnalysis(
                symbol=symbol,
                timestamp=datetime.now(timezone.utc),
                current_price=current_price,
                smc_bias=confluence_data['smc_bias'],
                trend_direction=confluence_data['trend_direction'],
                institutional_bias=confluence_data['institutional_bias'],
                confluence_score=confluence_data['confluence_score'],
                order_blocks=order_blocks,
                fair_value_gaps=fair_value_gaps,
                structure_breaks=structure_analysis.structure_breaks if structure_analysis else [],
                liquidity_zones=liquidity_zones,
                key_support_levels=key_levels['support'],
                key_resistance_levels=key_levels['resistance'],
                immediate_support=key_levels['immediate_support'],
                immediate_resistance=key_levels['immediate_resistance'],
                active_signals=active_signals,
                setup_quality=confluence_data['setup_quality'],
                next_targets=confluence_data['next_targets'],
                invalidation_levels=confluence_data['invalidation_levels'],
                institutional_activity_score=institutional_metrics['activity_score'],
                smart_money_positioning=institutional_metrics['positioning'],
                institutional_sentiment=institutional_metrics['sentiment'],
                signal_accuracy_24h=self._get_recent_accuracy(),
                institutional_confirmation_rate=institutional_metrics['confirmation_rate'],
                multi_exchange_validation_rate=institutional_metrics['validation_rate'],
                market_narrative=narrative_data['narrative'],
                key_insights=narrative_data['insights'],
                trading_recommendations=narrative_data['recommendations'],
                risk_warnings=narrative_data['warnings']
            )
            
            # Cache the analysis
            self.analysis_cache[symbol] = (analysis, datetime.now(timezone.utc))
            
            # Store in database if available
            if self.storage:
                await self._save_analysis(analysis)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error performing SMC analysis for {symbol}: {e}", exc_info=True)
            # Return a minimal analysis on error
            return self._create_error_analysis(symbol, str(e))
    
    async def _get_current_price(self, symbol: str) -> float:
        """Get current price for symbol"""
        if self.storage:
            # Get latest trade price
            recent_trades = self.storage.get_recent_trades(symbol, "bybit", minutes=1)
            if recent_trades:
                return float(recent_trades[-1]['price'])
        
        # Default fallback
        return 0.0
    
    async def _calculate_confluence(self, order_blocks: List[OrderBlock], 
                                  fair_value_gaps: List[FairValueGap],
                                  structure_analysis: Any,
                                  liquidity_zones: List[LiquidityZone],
                                  current_price: float) -> Dict[str, Any]:
        """Calculate confluence scores and market bias"""
        
        # Initialize scores
        bullish_score = 0
        bearish_score = 0
        
        # Order blocks contribution
        bullish_obs = [ob for ob in order_blocks if ob.direction == "bullish" and ob.is_active]
        bearish_obs = [ob for ob in order_blocks if ob.direction == "bearish" and ob.is_active]
        
        bullish_score += len(bullish_obs) * 10
        bearish_score += len(bearish_obs) * 10
        
        # Add institutional validation bonus
        for ob in bullish_obs:
            if ob.institutional_confirmation:
                bullish_score += 5
        for ob in bearish_obs:
            if ob.institutional_confirmation:
                bearish_score += 5
        
        # Fair value gaps contribution
        bullish_fvgs = [fvg for fvg in fair_value_gaps if fvg.direction == "bullish" and fvg.state == "unfilled"]
        bearish_fvgs = [fvg for fvg in fair_value_gaps if fvg.direction == "bearish" and fvg.state == "unfilled"]
        
        bullish_score += len(bullish_fvgs) * 8
        bearish_score += len(bearish_fvgs) * 8
        
        # Structure analysis contribution
        if structure_analysis:
            if structure_analysis.trend == TrendDirection.BULLISH:
                bullish_score += 20
            elif structure_analysis.trend == TrendDirection.BEARISH:
                bearish_score += 20
            
            # Recent BOS/CHoCH
            recent_breaks = [b for b in structure_analysis.structure_breaks 
                           if (datetime.now(timezone.utc) - b.break_time).total_seconds() < 3600]
            for break_event in recent_breaks:
                # Handle both enum types - check if it's a string or enum value
                break_type = break_event.type.value if hasattr(break_event.type, 'value') else str(break_event.type)
                
                if "bos" in break_type and "bullish" in break_type:
                    bullish_score += 15
                elif "bos" in break_type and "bearish" in break_type:
                    bearish_score += 15
                elif "choch" in break_type and "bullish" in break_type:
                    bullish_score += 20
                elif "choch" in break_type and "bearish" in break_type:
                    bearish_score += 20
        
        # Liquidity zones contribution
        bullish_liq = [lz for lz in liquidity_zones if lz.direction == "bullish" and lz.is_active]
        bearish_liq = [lz for lz in liquidity_zones if lz.direction == "bearish" and lz.is_active]
        
        bullish_score += len(bullish_liq) * 5
        bearish_score += len(bearish_liq) * 5
        
        # Calculate total confluence score
        total_score = bullish_score + bearish_score
        confluence_score = min(100, (total_score / 200) * 100) if total_score > 0 else 0
        
        # Determine bias
        if bullish_score > bearish_score * 1.5:
            smc_bias = SMCBias.STRONG_BULLISH
            institutional_bias = "strong_bullish"
        elif bullish_score > bearish_score * 1.2:
            smc_bias = SMCBias.BULLISH
            institutional_bias = "bullish"
        elif bearish_score > bullish_score * 1.5:
            smc_bias = SMCBias.STRONG_BEARISH
            institutional_bias = "strong_bearish"
        elif bearish_score > bullish_score * 1.2:
            smc_bias = SMCBias.BEARISH
            institutional_bias = "bearish"
        else:
            smc_bias = SMCBias.NEUTRAL
            institutional_bias = "neutral"
        
        # Determine setup quality
        if confluence_score >= 80:
            setup_quality = ConfluenceStrength.VERY_HIGH
        elif confluence_score >= 70:
            setup_quality = ConfluenceStrength.HIGH
        elif confluence_score >= 50:
            setup_quality = ConfluenceStrength.MEDIUM
        elif confluence_score >= 30:
            setup_quality = ConfluenceStrength.LOW
        else:
            setup_quality = ConfluenceStrength.VERY_LOW
        
        # Determine trend direction
        trend_direction = "bullish" if bullish_score > bearish_score else "bearish" if bearish_score > bullish_score else "neutral"
        
        # Calculate targets and invalidation levels
        next_targets = []
        invalidation_levels = []
        
        # Bullish targets
        if trend_direction == "bullish":
            # Use liquidity zones and FVGs as targets
            targets_above = sorted([lz.price for lz in liquidity_zones if lz.price > current_price])
            fvg_targets = sorted([fvg.gap_high for fvg in fair_value_gaps if fvg.gap_high > current_price])
            
            all_targets = sorted(list(set(targets_above + fvg_targets)))
            next_targets = [{"price": price, "type": "resistance"} for price in all_targets[:3]]
            
            # Invalidation is below recent lows or order blocks
            inv_levels = sorted([ob.low_price for ob in order_blocks if ob.low_price < current_price], reverse=True)
            invalidation_levels = [{"price": price, "type": "support_break"} for price in inv_levels[:2]]
        
        # Bearish targets
        elif trend_direction == "bearish":
            # Use liquidity zones and FVGs as targets
            targets_below = sorted([lz.price for lz in liquidity_zones if lz.price < current_price], reverse=True)
            fvg_targets = sorted([fvg.gap_low for fvg in fair_value_gaps if fvg.gap_low < current_price], reverse=True)
            
            all_targets = sorted(list(set(targets_below + fvg_targets)), reverse=True)
            next_targets = [{"price": price, "type": "support"} for price in all_targets[:3]]
            
            # Invalidation is above recent highs or order blocks
            inv_levels = sorted([ob.high_price for ob in order_blocks if ob.high_price > current_price])
            invalidation_levels = [{"price": price, "type": "resistance_break"} for price in inv_levels[:2]]
        
        return {
            'smc_bias': smc_bias,
            'institutional_bias': institutional_bias,
            'confluence_score': confluence_score,
            'setup_quality': setup_quality,
            'trend_direction': trend_direction,
            'bullish_score': bullish_score,
            'bearish_score': bearish_score,
            'next_targets': next_targets,
            'invalidation_levels': invalidation_levels
        }
    
    async def _generate_trading_signals(self, symbol: str, current_price: float,
                                      order_blocks: List[OrderBlock],
                                      fair_value_gaps: List[FairValueGap],
                                      structure_analysis: Any,
                                      liquidity_zones: List[LiquidityZone],
                                      confluence_data: Dict[str, Any]) -> List[SMCSignal]:
        """Generate trading signals based on SMC analysis"""
        signals = []
        
        # Only generate signals for strong bias
        if confluence_data['smc_bias'] in [SMCBias.NEUTRAL]:
            return signals
        
        # Determine signal type
        signal_type = "long" if "bullish" in confluence_data['smc_bias'].value else "short"
        
        # Find entry zone
        if signal_type == "long":
            # Look for nearest bullish order block or support
            entry_candidates = [ob.zone_low for ob in order_blocks 
                              if ob.direction == "bullish" and ob.zone_low < current_price]
            if not entry_candidates:
                entry_candidates = [lz.lower_bound for lz in liquidity_zones 
                                  if lz.direction == "bullish" and lz.lower_bound < current_price]
        else:
            # Look for nearest bearish order block or resistance
            entry_candidates = [ob.zone_high for ob in order_blocks 
                              if ob.direction == "bearish" and ob.zone_high > current_price]
            if not entry_candidates:
                entry_candidates = [lz.upper_bound for lz in liquidity_zones 
                                  if lz.direction == "bearish" and lz.upper_bound > current_price]
        
        if not entry_candidates:
            return signals
        
        # Calculate entry price
        entry_price = sorted(entry_candidates, key=lambda x: abs(x - current_price))[0]
        
        # Calculate stop loss
        if signal_type == "long":
            stop_candidates = [ob.low_price for ob in order_blocks if ob.low_price < entry_price]
            stop_loss = min(stop_candidates) * 0.998 if stop_candidates else entry_price * 0.97
        else:
            stop_candidates = [ob.high_price for ob in order_blocks if ob.high_price > entry_price]
            stop_loss = max(stop_candidates) * 1.002 if stop_candidates else entry_price * 1.03
        
        # Calculate take profits using Fibonacci extensions
        risk = abs(entry_price - stop_loss)
        if signal_type == "long":
            take_profit_1 = entry_price + (risk * 1.5)
            take_profit_2 = entry_price + (risk * 2.5)
            take_profit_3 = entry_price + (risk * 4.0)
        else:
            take_profit_1 = entry_price - (risk * 1.5)
            take_profit_2 = entry_price - (risk * 2.5)
            take_profit_3 = entry_price - (risk * 4.0)
        
        # Calculate risk metrics
        risk_reward_ratio = 2.5  # Average of TP levels
        max_risk_pct = 1.0  # 1% risk per trade
        
        # Determine position size based on confluence
        if confluence_data['confluence_score'] >= 80:
            position_size = 2.0  # 2% of capital
        elif confluence_data['confluence_score'] >= 70:
            position_size = 1.5  # 1.5% of capital
        else:
            position_size = 1.0  # 1% of capital
        
        # Collect supporting elements
        supporting_obs = [ob.id for ob in order_blocks if ob.is_active][:3]
        supporting_fvgs = [fvg.id for fvg in fair_value_gaps if fvg.state == "unfilled"][:3]
        supporting_structure = [sb.id for sb in structure_analysis.structure_breaks][:3] if structure_analysis else []
        supporting_liquidity = [lz.id for lz in liquidity_zones if lz.is_active][:3]
        
        # Check institutional confirmation
        institutional_obs = [ob for ob in order_blocks if ob.institutional_confirmation]
        institutional_lzs = [lz for lz in liquidity_zones if lz.is_institutional]
        institutional_confirmation = len(institutional_obs) > 0 or len(institutional_lzs) > 0
        
        # Check multi-exchange validation
        multi_validated_obs = [ob for ob in order_blocks if ob.multi_exchange_confirmed]
        multi_validated_lzs = [lz for lz in liquidity_zones if lz.cross_exchange_validated]
        multi_exchange_validated = len(multi_validated_obs) > 0 or len(multi_validated_lzs) > 0
        
        # Calculate institutional ratio
        total_elements = len(order_blocks) + len(liquidity_zones)
        institutional_elements = len(institutional_obs) + len(institutional_lzs)
        institutional_ratio = institutional_elements / total_elements if total_elements > 0 else 0
        
        # Create signal
        signal = SMCSignal(
            id=f"SIG_{symbol}_{uuid.uuid4().hex[:8]}",
            type=signal_type,
            strength=confluence_data['setup_quality'],
            confidence=confluence_data['confluence_score'],
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit_1=take_profit_1,
            take_profit_2=take_profit_2,
            take_profit_3=take_profit_3,
            risk_reward_ratio=risk_reward_ratio,
            max_risk_pct=max_risk_pct,
            position_size_suggestion=position_size,
            supporting_order_blocks=supporting_obs,
            supporting_fvgs=supporting_fvgs,
            supporting_structure=supporting_structure,
            supporting_liquidity=supporting_liquidity,
            institutional_confirmation=institutional_confirmation,
            multi_exchange_validated=multi_exchange_validated,
            institutional_ratio=institutional_ratio,
            formation_time=datetime.now(timezone.utc),
            expiry_time=datetime.now(timezone.utc) + timedelta(hours=self.signal_expiry_hours)
        )
        
        signals.append(signal)
        
        # Update signal cache
        if symbol not in self.signal_cache:
            self.signal_cache[symbol] = []
        self.signal_cache[symbol].append(signal)
        self.signal_history.append(signal)
        
        # Update performance metrics
        self.performance_metrics['total_signals'] += 1
        
        return signals
    
    def _extract_key_levels(self, order_blocks: List[OrderBlock], 
                           liquidity_zones: List[LiquidityZone],
                           structure_analysis: Any) -> Dict[str, Any]:
        """Extract key support and resistance levels"""
        
        support_levels = []
        resistance_levels = []
        
        # Extract from order blocks
        for ob in order_blocks:
            if ob.is_active:
                if ob.direction == "bullish":
                    support_levels.append(ob.zone_low)
                else:
                    resistance_levels.append(ob.zone_high)
        
        # Extract from liquidity zones
        for lz in liquidity_zones:
            if lz.is_active:
                if lz.type in ["high_volume_node", "order_block"]:
                    if lz.direction == "bullish":
                        support_levels.append(lz.lower_bound)
                    else:
                        resistance_levels.append(lz.upper_bound)
        
        # Extract from structure
        if structure_analysis:
            support_levels.extend([s.price for s in structure_analysis.support_levels])
            resistance_levels.extend([r.price for r in structure_analysis.resistance_levels])
        
        # Remove duplicates and sort
        support_levels = sorted(list(set(support_levels)), reverse=True)
        resistance_levels = sorted(list(set(resistance_levels)))
        
        # Get immediate levels (closest to current price)
        immediate_support = support_levels[0] if support_levels else None
        immediate_resistance = resistance_levels[0] if resistance_levels else None
        
        return {
            'support': support_levels[:5],  # Top 5 support levels
            'resistance': resistance_levels[:5],  # Top 5 resistance levels
            'immediate_support': immediate_support,
            'immediate_resistance': immediate_resistance
        }
    
    def _calculate_institutional_metrics(self, order_blocks: List[OrderBlock],
                                       fair_value_gaps: List[FairValueGap],
                                       liquidity_zones: List[LiquidityZone]) -> Dict[str, Any]:
        """Calculate institutional activity metrics"""
        
        # Count institutional confirmations
        institutional_obs = [ob for ob in order_blocks if ob.institutional_confirmation]
        multi_exchange_obs = [ob for ob in order_blocks if ob.multi_exchange_confirmed]
        
        institutional_lzs = [lz for lz in liquidity_zones if lz.is_institutional]
        cross_validated_lzs = [lz for lz in liquidity_zones if lz.cross_exchange_validated]
        
        # Calculate activity score (0-100)
        activity_score = 0
        
        # Order blocks contribution
        if order_blocks:
            ob_inst_ratio = len(institutional_obs) / len(order_blocks)
            activity_score += ob_inst_ratio * 40
        
        # Liquidity zones contribution
        if liquidity_zones:
            lz_inst_ratio = len(institutional_lzs) / len(liquidity_zones)
            activity_score += lz_inst_ratio * 30
        
        # Multi-exchange validation bonus
        if order_blocks:
            multi_ratio = len(multi_exchange_obs) / len(order_blocks)
            activity_score += multi_ratio * 20
        
        # Cross-exchange validation bonus
        if liquidity_zones:
            cross_ratio = len(cross_validated_lzs) / len(liquidity_zones)
            activity_score += cross_ratio * 10
        
        # Determine positioning
        bullish_institutional = len([ob for ob in institutional_obs if ob.direction == "bullish"])
        bearish_institutional = len([ob for ob in institutional_obs if ob.direction == "bearish"])
        
        if bullish_institutional > bearish_institutional * 1.5:
            positioning = "accumulating"
            sentiment = "bullish"
        elif bearish_institutional > bullish_institutional * 1.5:
            positioning = "distributing"
            sentiment = "bearish"
        else:
            positioning = "neutral"
            sentiment = "neutral"
        
        # Calculate rates
        total_elements = len(order_blocks) + len(liquidity_zones)
        institutional_elements = len(institutional_obs) + len(institutional_lzs)
        multi_validated_elements = len(multi_exchange_obs) + len(cross_validated_lzs)
        
        confirmation_rate = (institutional_elements / total_elements * 100) if total_elements > 0 else 0
        validation_rate = (multi_validated_elements / total_elements * 100) if total_elements > 0 else 0
        
        return {
            'activity_score': round(activity_score, 1),
            'positioning': positioning,
            'sentiment': sentiment,
            'confirmation_rate': round(confirmation_rate, 1),
            'validation_rate': round(validation_rate, 1)
        }
    
    def _generate_analysis_narrative(self, symbol: str, current_price: float,
                                   confluence_data: Dict[str, Any],
                                   institutional_metrics: Dict[str, Any],
                                   order_blocks: List[OrderBlock],
                                   fair_value_gaps: List[FairValueGap],
                                   structure_analysis: Any,
                                   liquidity_zones: List[LiquidityZone]) -> Dict[str, Any]:
        """Generate human-readable analysis narrative"""
        
        # Market narrative
        bias_text = confluence_data['smc_bias'].value.replace('_', ' ')
        narrative = f"{symbol} shows {bias_text} bias with {confluence_data['confluence_score']:.0f}% confluence. "
        
        if institutional_metrics['activity_score'] > 70:
            narrative += f"High institutional activity ({institutional_metrics['activity_score']:.0f}/100) indicates smart money {institutional_metrics['positioning']}. "
        elif institutional_metrics['activity_score'] > 40:
            narrative += f"Moderate institutional activity suggests cautious {institutional_metrics['sentiment']} positioning. "
        
        # Key insights
        insights = []
        
        # Order blocks insight
        if order_blocks:
            active_obs = [ob for ob in order_blocks if ob.is_active]
            if active_obs:
                insights.append(f"{len(active_obs)} active order blocks provide {confluence_data['trend_direction']} structure")
        
        # FVG insight
        if fair_value_gaps:
            unfilled_fvgs = [fvg for fvg in fair_value_gaps if fvg.state == "unfilled"]
            if unfilled_fvgs:
                insights.append(f"{len(unfilled_fvgs)} unfilled FVGs may act as price magnets")
        
        # Structure insight
        if structure_analysis and structure_analysis.structure_breaks:
            latest_break = structure_analysis.structure_breaks[-1]  # Get the most recent break
            insights.append(f"Recent {latest_break.type.value} confirms {structure_analysis.trend.value} momentum")
        
        # Liquidity insight
        if liquidity_zones:
            injection_zones = [lz for lz in liquidity_zones if lz.type == "injection_zone"]
            if injection_zones:
                insights.append(f"{len(injection_zones)} fresh liquidity injections detected")
        
        # Trading recommendations
        recommendations = []
        
        if confluence_data['setup_quality'] in [ConfluenceStrength.VERY_HIGH, ConfluenceStrength.HIGH]:
            if confluence_data['trend_direction'] == "bullish":
                recommendations.append("Look for long entries at pullbacks to bullish order blocks")
                recommendations.append("Target unfilled bearish FVGs above current price")
            else:
                recommendations.append("Look for short entries at rallies to bearish order blocks")
                recommendations.append("Target unfilled bullish FVGs below current price")
        else:
            recommendations.append("Wait for higher confluence before taking positions")
            recommendations.append("Monitor for structure breaks to confirm direction")
        
        # Risk warnings
        warnings = []
        
        if confluence_data['confluence_score'] < 50:
            warnings.append("Low confluence - higher risk of false signals")
        
        if institutional_metrics['validation_rate'] < 30:
            warnings.append("Limited multi-exchange validation - verify signals independently")
        
        sweep_zones = [lz for lz in liquidity_zones if lz.type == "sweep_zone"]
        if sweep_zones:
            warnings.append(f"{len(sweep_zones)} sweep zones detected - watch for stop hunts")
        
        if not warnings:
            warnings.append("Always use proper risk management and position sizing")
        
        return {
            'narrative': narrative,
            'insights': insights[:5],  # Top 5 insights
            'recommendations': recommendations[:3],  # Top 3 recommendations
            'warnings': warnings[:3]  # Top 3 warnings
        }
    
    def _get_recent_accuracy(self) -> float:
        """Calculate signal accuracy for last 24 hours"""
        if self.performance_metrics['total_signals'] == 0:
            return 0.0
        
        win_rate = (self.performance_metrics['successful_signals'] / 
                   self.performance_metrics['total_signals'] * 100)
        
        return round(win_rate, 1)
    
    async def _save_analysis(self, analysis: SMCAnalysis):
        """Save analysis to storage"""
        if self.storage:
            try:
                await self.storage.save_smc_analysis(analysis.to_dict())
                logger.debug(f"Saved SMC analysis for {analysis.symbol}")
            except Exception as e:
                logger.error(f"Error saving SMC analysis: {e}")
    
    def _create_error_analysis(self, symbol: str, error_message: str) -> SMCAnalysis:
        """Create minimal analysis when error occurs"""
        return SMCAnalysis(
            symbol=symbol,
            timestamp=datetime.now(timezone.utc),
            current_price=0.0,
            smc_bias=SMCBias.NEUTRAL,
            trend_direction="unknown",
            institutional_bias="neutral",
            confluence_score=0.0,
            order_blocks=[],
            fair_value_gaps=[],
            structure_breaks=[],
            liquidity_zones=[],
            key_support_levels=[],
            key_resistance_levels=[],
            immediate_support=None,
            immediate_resistance=None,
            active_signals=[],
            setup_quality=ConfluenceStrength.VERY_LOW,
            next_targets=[],
            invalidation_levels=[],
            institutional_activity_score=0.0,
            smart_money_positioning="unknown",
            institutional_sentiment="unknown",
            signal_accuracy_24h=0.0,
            institutional_confirmation_rate=0.0,
            multi_exchange_validation_rate=0.0,
            market_narrative=f"Analysis failed: {error_message}",
            key_insights=["Analysis error - please retry"],
            trading_recommendations=["Do not trade based on incomplete analysis"],
            risk_warnings=["Analysis failed - data may be incomplete"]
        )
    
    async def get_quick_summary(self, symbol: str) -> Dict[str, Any]:
        """Get quick SMC summary for a symbol"""
        try:
            analysis = await self.get_comprehensive_analysis(symbol)
            
            return {
                'symbol': symbol,
                'smc_bias': analysis.smc_bias.value,
                'confluence_score': analysis.confluence_score,
                'setup_quality': analysis.setup_quality.value,
                'institutional_bias': analysis.institutional_bias,
                'active_signals_count': len(analysis.active_signals),
                'key_insight': analysis.key_insights[0] if analysis.key_insights else "No key insights",
                'recommendation': analysis.trading_recommendations[0] if analysis.trading_recommendations else "No recommendations"
            }
            
        except Exception as e:
            logger.error(f"Error getting SMC summary for {symbol}: {e}")
            return {
                'symbol': symbol,
                'error': 'Analysis failed',
                'message': str(e)
            }
    
    def get_active_signals(self, symbol: str) -> List[SMCSignal]:
        """Get active trading signals for a symbol"""
        if symbol not in self.signal_cache:
            return []
        
        # Filter expired signals
        current_time = datetime.now(timezone.utc)
        active_signals = [
            signal for signal in self.signal_cache[symbol]
            if signal.expiry_time > current_time
        ]
        
        # Update cache
        self.signal_cache[symbol] = active_signals
        
        return active_signals
    
    def clear_cache(self):
        """Clear analysis and signal cache"""
        self.analysis_cache.clear()
        self.signal_cache.clear()
        logger.info("SMC Dashboard cache cleared")
