"""
Order Flow Service for API
Production-ready order flow calculations with enhanced analytics
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
import logging
from src.storage.mongo_manager import MongoManager
from src.indicators.order_flow import OrderFlowCalculator
from src.api.cache import CacheManager

logger = logging.getLogger(__name__)


class OrderFlowService:
    """Service for Order Flow calculations and data retrieval"""
    
    def __init__(self, mongo: MongoManager, cache: CacheManager):
        self.mongo = mongo
        self.cache = cache
        self.calculator = OrderFlowCalculator()
    
    async def get_latest(self, symbol: str, exchange: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get latest order flow for symbol"""
        cache_key = f"order_flow_latest:{symbol}:{exchange or 'all'}"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get from database
        flow = await self.mongo.get_latest_order_flow(symbol, exchange)
        if flow:
            result = {
                "symbol": symbol,
                "exchange": exchange,
                "timestamp": flow.timestamp.isoformat(),
                "buy_volume": flow.buy_volume,
                "sell_volume": flow.sell_volume,
                "delta": flow.delta,
                "cumulative_delta": flow.cumulative_delta,
                "imbalance_ratio": flow.imbalance_ratio,
                "large_trades_count": flow.large_trades_count,
                "absorption_detected": flow.absorption_detected,
                "momentum_score": getattr(flow, 'momentum_score', 50.0),
                "institutional_volume": getattr(flow, 'institutional_volume', 0.0),
                "vwap_delta": getattr(flow, 'vwap_delta', 0.0),
                "absorption_events": getattr(flow, 'absorption_events', []),
                "flow_strength": self._calculate_flow_strength(flow),
                "market_bias": self._determine_market_bias(flow)
            }
            
            # Cache for 1 minute
            await self.cache.set(cache_key, result, ttl=60)
            return result
        
        return None
    
    async def get_historical(self, symbol: str, 
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None,
                           limit: int = 100) -> List[Dict[str, Any]]:
        """Get historical order flows"""
        if not start_time:
            start_time = datetime.now(timezone.utc) - timedelta(hours=24)
        if not end_time:
            end_time = datetime.now(timezone.utc)
        
        cache_key = f"order_flow_historical:{symbol}:{start_time.isoformat()}:{end_time.isoformat()}:{limit}"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get from database
        flows = await self.mongo.get_order_flows(symbol, start_time, end_time, limit)
        
        result = []
        for flow in flows:
            result.append({
                "symbol": symbol,
                "timestamp": flow.timestamp.isoformat(),
                "buy_volume": flow.buy_volume,
                "sell_volume": flow.sell_volume,
                "delta": flow.delta,
                "cumulative_delta": flow.cumulative_delta,
                "imbalance_ratio": flow.imbalance_ratio,
                "large_trades_count": flow.large_trades_count,
                "absorption_detected": flow.absorption_detected,
                "momentum_score": getattr(flow, 'momentum_score', 50.0),
                "flow_strength": self._calculate_flow_strength(flow)
            })
        
        # Cache for 5 minutes
        await self.cache.set(cache_key, result, ttl=300)
        return result
    
    async def calculate_realtime(self, symbol: str, exchange: str, 
                               minutes: int = 15) -> Optional[Dict[str, Any]]:
        """Calculate order flow from recent trades"""
        cache_key = f"order_flow_realtime:{symbol}:{exchange}:{minutes}"
        
        # Try cache first (30 second TTL for realtime)
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get recent trades
        trades = self._get_recent_trades(symbol, exchange, minutes)
        if len(trades) < 10:  # Need minimum trades for meaningful analysis
            return None
        
        try:
            # Get previous flow for cumulative delta
            previous_flow = await self._get_previous_flow(symbol, exchange)
            
            # Calculate flow
            flow = self.calculator.calculate(trades, symbol, exchange, previous_flow)
            
            result = {
                "symbol": symbol,
                "exchange": exchange,
                "timestamp": flow.timestamp.isoformat(),
                "buy_volume": flow.buy_volume,
                "sell_volume": flow.sell_volume,
                "delta": flow.delta,
                "cumulative_delta": flow.cumulative_delta,
                "imbalance_ratio": flow.imbalance_ratio,
                "large_trades_count": flow.large_trades_count,
                "absorption_detected": flow.absorption_detected,
                "momentum_score": flow.momentum_score,
                "institutional_volume": flow.institutional_volume,
                "vwap_delta": flow.vwap_delta,
                "absorption_events": flow.absorption_events,
                "trades_count": len(trades),
                "time_period_minutes": minutes,
                "flow_strength": self._calculate_flow_strength(flow),
                "market_bias": self._determine_market_bias(flow),
                "exhaustion_signals": self._detect_exhaustion_signals(flow, trades)
            }
            
            # Cache for 30 seconds
            await self.cache.set(cache_key, result, ttl=30)
            return result
            
        except Exception as e:
            logger.error(f"Error calculating realtime order flow: {e}")
            return None
    
    async def get_flow_analysis(self, symbol: str, exchange: Optional[str] = None) -> Dict[str, Any]:
        """Get comprehensive order flow analysis"""
        cache_key = f"order_flow_analysis:{symbol}:{exchange or 'all'}"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get multiple timeframes
        timeframes = {
            "5m": 5,
            "15m": 15,
            "1h": 60,
            "4h": 240
        }
        
        analysis = {
            "symbol": symbol,
            "exchange": exchange,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "timeframes": {},
            "overall_bias": "neutral",
            "confluence_score": 50.0,
            "key_levels": [],
            "alerts": []
        }
        
        flows_by_tf = {}
        
        # Calculate for each timeframe
        for tf_name, minutes in timeframes.items():
            if exchange:
                flow = await self.calculate_realtime(symbol, exchange, minutes)
            else:
                # Get best available exchange
                flow = await self._get_best_exchange_flow(symbol, minutes)
            
            if flow:
                flows_by_tf[tf_name] = flow
                analysis["timeframes"][tf_name] = flow
        
        # Calculate confluence and overall bias
        if flows_by_tf:
            analysis["overall_bias"] = self._calculate_overall_bias(flows_by_tf)
            analysis["confluence_score"] = self._calculate_confluence_score(flows_by_tf)
            analysis["key_levels"] = self._extract_key_levels(flows_by_tf)
            analysis["alerts"] = self._generate_alerts(flows_by_tf)
        
        # Cache for 2 minutes
        await self.cache.set(cache_key, analysis, ttl=120)
        return analysis
    
    def _get_recent_trades(self, symbol: str, exchange: str, minutes: int) -> List[Dict[str, Any]]:
        """Get recent trades for calculation"""
        if not self.mongo.connected:
            return []
        
        since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        
        query = {
            "symbol": symbol,
            "exchange": exchange,
            "timestamp": {"$gte": since}
        }
        
        return self.mongo.get_trades(query, limit=5000)  # Reasonable limit for flow analysis
    
    async def _get_previous_flow(self, symbol: str, exchange: str) -> Optional[Dict[str, Any]]:
        """Get previous order flow for cumulative delta"""
        flow = await self.mongo.get_latest_order_flow(symbol, exchange)
        if flow:
            return {
                "cumulative_delta": flow.cumulative_delta,
                "timestamp": flow.timestamp
            }
        return None
    
    def _calculate_flow_strength(self, flow) -> float:
        """Calculate order flow strength (0-100)"""
        if not flow:
            return 50.0
        
        # Factors for strength calculation
        momentum = getattr(flow, 'momentum_score', 50.0)
        imbalance = abs(flow.imbalance_ratio - 0.5) * 200  # 0-100 scale
        institutional = min(100, (flow.large_trades_count * 10))  # Cap at 100
        absorption = 20 if flow.absorption_detected else 0
        
        # Weighted average
        strength = (momentum * 0.4) + (imbalance * 0.3) + (institutional * 0.2) + (absorption * 0.1)
        return max(0, min(100, strength))
    
    def _determine_market_bias(self, flow) -> str:
        """Determine market bias from order flow"""
        if not flow:
            return "neutral"
        
        momentum = getattr(flow, 'momentum_score', 50.0)
        delta = flow.delta
        cumulative_delta = flow.cumulative_delta
        
        # Strong bullish signals
        if (momentum > 70 and delta > 0 and cumulative_delta > 0 and 
            flow.imbalance_ratio > 0.6):
            return "strong_bullish"
        
        # Strong bearish signals
        if (momentum < 30 and delta < 0 and cumulative_delta < 0 and 
            flow.imbalance_ratio < 0.4):
            return "strong_bearish"
        
        # Moderate signals
        if momentum > 60 and delta > 0:
            return "bullish"
        if momentum < 40 and delta < 0:
            return "bearish"
        
        return "neutral"
    
    def _detect_exhaustion_signals(self, flow, trades: List[Dict[str, Any]]) -> List[str]:
        """Detect exhaustion signals in order flow"""
        signals = []
        
        # High volume but weakening momentum
        if (flow.momentum_score < 40 and 
            (flow.buy_volume + flow.sell_volume) > 0 and
            flow.large_trades_count > 5):
            signals.append("volume_exhaustion")
        
        # Delta divergence
        if hasattr(flow, 'vwap_delta') and flow.vwap_delta:
            if flow.delta > 0 and flow.vwap_delta < 0:
                signals.append("bullish_delta_divergence")
            elif flow.delta < 0 and flow.vwap_delta > 0:
                signals.append("bearish_delta_divergence")
        
        # Absorption without follow-through
        if flow.absorption_detected and flow.momentum_score < 55:
            signals.append("absorption_exhaustion")
        
        return signals
    
    def _calculate_overall_bias(self, flows_by_tf: Dict[str, Dict[str, Any]]) -> str:
        """Calculate overall bias from multiple timeframes"""
        biases = []
        for tf_data in flows_by_tf.values():
            bias = tf_data.get("market_bias", "neutral")
            biases.append(bias)
        
        # Count bias votes
        bullish_votes = sum(1 for b in biases if "bullish" in b)
        bearish_votes = sum(1 for b in biases if "bearish" in b)
        
        if bullish_votes > bearish_votes:
            return "bullish" if bullish_votes > len(biases) * 0.6 else "lean_bullish"
        elif bearish_votes > bullish_votes:
            return "bearish" if bearish_votes > len(biases) * 0.6 else "lean_bearish"
        else:
            return "neutral"
    
    def _calculate_confluence_score(self, flows_by_tf: Dict[str, Dict[str, Any]]) -> float:
        """Calculate confluence score across timeframes"""
        if not flows_by_tf:
            return 50.0
        
        # Get momentum scores
        momentum_scores = []
        for tf_data in flows_by_tf.values():
            momentum = tf_data.get("momentum_score", 50.0)
            momentum_scores.append(momentum)
        
        if not momentum_scores:
            return 50.0
        
        # Calculate alignment
        avg_momentum = sum(momentum_scores) / len(momentum_scores)
        
        # Calculate how aligned all timeframes are
        variance = sum((score - avg_momentum) ** 2 for score in momentum_scores) / len(momentum_scores)
        alignment = max(0, 100 - (variance / 10))  # Lower variance = higher alignment
        
        return min(100, alignment)
    
    def _extract_key_levels(self, flows_by_tf: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract key price levels from order flow analysis"""
        levels = []
        
        for tf_name, tf_data in flows_by_tf.items():
            # Add absorption levels
            absorption_events = tf_data.get("absorption_events", [])
            for event in absorption_events:
                levels.append({
                    "price": event.get("price_level"),
                    "type": "absorption",
                    "timeframe": tf_name,
                    "strength": event.get("strength", 50),
                    "side": event.get("dominant_side", "unknown")
                })
        
        # Sort by strength and remove duplicates
        levels.sort(key=lambda x: x.get("strength", 0), reverse=True)
        return levels[:10]  # Top 10 levels
    
    def _generate_alerts(self, flows_by_tf: Dict[str, Dict[str, Any]]) -> List[str]:
        """Generate alerts based on order flow analysis"""
        alerts = []
        
        # Check for strong momentum across timeframes
        strong_momentum_count = 0
        for tf_data in flows_by_tf.values():
            momentum = tf_data.get("momentum_score", 50.0)
            if momentum > 75 or momentum < 25:
                strong_momentum_count += 1
        
        if strong_momentum_count >= 2:
            alerts.append("Strong momentum alignment detected across multiple timeframes")
        
        # Check for absorption events
        total_absorption_events = 0
        for tf_data in flows_by_tf.values():
            events = tf_data.get("absorption_events", [])
            total_absorption_events += len(events)
        
        if total_absorption_events >= 3:
            alerts.append("Multiple absorption events detected - potential reversal zone")
        
        # Check for exhaustion signals
        exhaustion_signals = []
        for tf_data in flows_by_tf.values():
            signals = tf_data.get("exhaustion_signals", [])
            exhaustion_signals.extend(signals)
        
        if len(exhaustion_signals) >= 2:
            alerts.append("Exhaustion signals detected - momentum may be weakening")
        
        return alerts
    
    async def _get_best_exchange_flow(self, symbol: str, minutes: int) -> Optional[Dict[str, Any]]:
        """Get order flow from the best available exchange"""
        exchanges = ["bybit", "binance", "coinbase", "kraken"]
        
        for exchange in exchanges:
            flow = await self.calculate_realtime(symbol, exchange, minutes)
            if flow and flow.get("trades_count", 0) >= 10:
                return flow
        
        return None
