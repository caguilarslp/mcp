"""
Smart Money Concepts (SMC) Service
Integrates all SMC components for comprehensive market analysis
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import asyncio
import json
import logging

from src.storage.mongo_manager import MongoManager
from src.api.cache import CacheManager
from src.smc import SMCDashboard
from src.models import Trade

logger = logging.getLogger(__name__)


class SMCService:
    """Service for Smart Money Concepts analysis and signals."""
    
    def __init__(self, storage: MongoManager, cache_manager: CacheManager):
        """Initialize SMC service with storage and cache."""
        self.storage = storage
        self.cache = cache_manager
        self.smc_dashboard = SMCDashboard()
        
    async def get_comprehensive_analysis(
        self, 
        symbol: str, 
        timeframe: str = "15m"
    ) -> Dict[str, Any]:
        """
        Get comprehensive SMC analysis for a symbol.
        
        Returns complete analysis including:
        - Order blocks
        - Fair value gaps
        - Market structure
        - Liquidity zones
        - Trading signals
        - Institutional metrics
        """
        cache_key = self.cache.get_cache_key("smc_analysis", symbol, timeframe)
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Get recent trades for analysis
            minutes_map = {
                "5m": 60,    # 1 hour of data for 5m
                "15m": 180,  # 3 hours for 15m
                "1h": 720,   # 12 hours for 1h
                "4h": 2880   # 2 days for 4h
            }
            minutes = minutes_map.get(timeframe, 180)
            
            # Fetch trades
            start_time = datetime.now(timezone.utc) - timedelta(minutes=minutes)
            trades = await self.storage.get_trades_range(
                symbol,
                start_time,
                datetime.now(timezone.utc),
                limit=10000
            )
            
            if not trades or len(trades) < 50:
                # Try to get latest SMC analysis from DB
                latest = await self._get_latest_smc_analysis(symbol)
                if latest:
                    return latest
                return self._empty_analysis(symbol)
            
            # Run comprehensive SMC analysis
            analysis = await self.smc_dashboard.get_comprehensive_analysis(
                symbol=symbol,
                trades=trades,
                timeframe=timeframe
            )
            
            # Add metadata
            analysis["timeframe"] = timeframe
            analysis["timestamp"] = datetime.now(timezone.utc).isoformat()
            analysis["trades_analyzed"] = len(trades)
            
            # Cache for 2 minutes
            await self.cache.set(cache_key, json.dumps(analysis, default=str), ttl=120)
            
            # Store in database for historical reference
            await self.storage.db.smc_analyses.insert_one({
                **analysis,
                "created_at": datetime.now(timezone.utc)
            })
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in SMC comprehensive analysis for {symbol}: {e}")
            # Return latest stored analysis as fallback
            latest = await self._get_latest_smc_analysis(symbol)
            if latest:
                return latest
            return self._empty_analysis(symbol)
    
    async def get_trading_signals(
        self, 
        symbol: str,
        signal_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get actionable trading signals from SMC analysis.
        
        Args:
            symbol: Trading symbol
            signal_type: Filter by type (long, short, or None for all)
            
        Returns:
            Dictionary with active signals and recommendations
        """
        cache_key = self.cache.get_cache_key("smc_signals", symbol, signal_type or "all")
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Get comprehensive analysis first
            analysis = await self.get_comprehensive_analysis(symbol)
            
            # Extract signals
            all_signals = analysis.get("trading_signals", [])
            
            # Filter by type if requested
            if signal_type:
                signals = [s for s in all_signals if s.get("type") == signal_type]
            else:
                signals = all_signals
            
            # Sort by confidence
            signals.sort(key=lambda x: x.get("confidence", 0), reverse=True)
            
            # Calculate summary metrics
            total_signals = len(signals)
            high_confidence = sum(1 for s in signals if s.get("confidence", 0) > 80)
            
            response = {
                "symbol": symbol,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "signals": signals[:10],  # Top 10 signals
                "summary": {
                    "total_signals": total_signals,
                    "high_confidence_signals": high_confidence,
                    "market_bias": analysis.get("market_bias", "neutral"),
                    "institutional_bias": analysis.get("institutional_metrics", {}).get("bias", "neutral"),
                    "best_timeframe": self._determine_best_timeframe(analysis)
                },
                "recommendations": self._generate_recommendations(analysis, signals)
            }
            
            # Cache for 1 minute
            await self.cache.set(cache_key, json.dumps(response, default=str), ttl=60)
            
            return response
            
        except Exception as e:
            logger.error(f"Error getting SMC signals for {symbol}: {e}")
            return {
                "symbol": symbol,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "signals": [],
                "summary": {"total_signals": 0, "error": str(e)},
                "recommendations": []
            }
    
    async def get_market_structure(
        self, 
        symbol: str,
        include_levels: bool = True
    ) -> Dict[str, Any]:
        """
        Get detailed market structure analysis.
        
        Returns structure breaks, trend analysis, and key levels.
        """
        cache_key = self.cache.get_cache_key("smc_structure", symbol)
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Get comprehensive analysis
            analysis = await self.get_comprehensive_analysis(symbol)
            
            # Extract structure data
            structure = {
                "symbol": symbol,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "market_structure": analysis.get("market_structure", {}),
                "trend": {
                    "primary": analysis.get("market_bias", "neutral"),
                    "strength": analysis.get("confluence_score", 50),
                    "phase": analysis.get("wyckoff_phase", "unknown")
                },
                "recent_breaks": self._extract_structure_breaks(analysis),
                "momentum": {
                    "score": analysis.get("momentum_score", 50),
                    "direction": analysis.get("momentum_direction", "neutral"),
                    "institutional_alignment": analysis.get("institutional_metrics", {}).get("alignment", False)
                }
            }
            
            # Add key levels if requested
            if include_levels:
                structure["key_levels"] = analysis.get("key_levels", [])
                structure["liquidity_zones"] = self._extract_liquidity_zones(analysis)
            
            # Cache for 2 minutes
            await self.cache.set(cache_key, json.dumps(structure, default=str), ttl=120)
            
            return structure
            
        except Exception as e:
            logger.error(f"Error getting market structure for {symbol}: {e}")
            return {
                "symbol": symbol,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            }
    
    async def get_confluence_analysis(
        self, 
        symbol: str,
        min_score: int = 70
    ) -> Dict[str, Any]:
        """
        Get multi-factor confluence analysis combining VP, OF, and SMC.
        
        Args:
            symbol: Trading symbol
            min_score: Minimum confluence score to include (0-100)
            
        Returns:
            High-confluence zones and signals
        """
        cache_key = self.cache.get_cache_key("smc_confluence", symbol, str(min_score))
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Get all data sources
            smc_analysis = await self.get_comprehensive_analysis(symbol)
            
            # Get volume profile data
            vp_data = await self.storage.get_latest_volume_profile(symbol)
            
            # Get order flow data
            of_data = await self.storage.get_latest_order_flow(symbol)
            
            # Calculate confluences
            confluences = []
            
            # Check each key level for confluence
            for level in smc_analysis.get("key_levels", []):
                score = 0
                factors = []
                
                price = level.get("price", 0)
                
                # Check if near Volume Profile POC/VAH/VAL
                if vp_data:
                    if abs(price - vp_data.poc) / price < 0.005:  # Within 0.5%
                        score += 30
                        factors.append("Volume POC")
                    elif abs(price - vp_data.vah) / price < 0.005:
                        score += 20
                        factors.append("Volume VAH")
                    elif abs(price - vp_data.val) / price < 0.005:
                        score += 20
                        factors.append("Volume VAL")
                
                # Check if it's an order block
                if level.get("type") == "order_block":
                    score += 25
                    factors.append("Order Block")
                
                # Check if near FVG
                if level.get("type") == "fvg":
                    score += 20
                    factors.append("Fair Value Gap")
                
                # Check order flow momentum
                if of_data and of_data.momentum_score:
                    if of_data.momentum_score > 70:
                        score += 15
                        factors.append("High OF Momentum")
                
                # Check for structure confluence
                if level.get("touches", 0) > 2:
                    score += 10
                    factors.append("Multiple touches")
                
                if score >= min_score:
                    confluences.append({
                        "price": price,
                        "score": score,
                        "factors": factors,
                        "type": level.get("type", "unknown"),
                        "strength": level.get("strength", 50)
                    })
            
            # Sort by score
            confluences.sort(key=lambda x: x["score"], reverse=True)
            
            response = {
                "symbol": symbol,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "min_score": min_score,
                "confluences": confluences[:20],  # Top 20
                "summary": {
                    "total_confluences": len(confluences),
                    "highest_score": confluences[0]["score"] if confluences else 0,
                    "primary_confluence_zone": self._identify_confluence_zone(confluences),
                    "recommendation": self._confluence_recommendation(confluences, smc_analysis)
                }
            }
            
            # Cache for 2 minutes
            await self.cache.set(cache_key, json.dumps(response, default=str), ttl=120)
            
            return response
            
        except Exception as e:
            logger.error(f"Error getting confluence analysis for {symbol}: {e}")
            return {
                "symbol": symbol,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e),
                "confluences": []
            }
    
    # Helper methods
    
    async def _get_latest_smc_analysis(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get latest SMC analysis from database."""
        try:
            doc = await self.storage.db.smc_analyses.find_one(
                {"symbol": symbol},
                sort=[("created_at", -1)]
            )
            if doc:
                doc.pop("_id", None)
                return doc
        except Exception as e:
            logger.error(f"Error fetching latest SMC analysis: {e}")
        return None
    
    def _empty_analysis(self, symbol: str) -> Dict[str, Any]:
        """Return empty analysis structure."""
        return {
            "symbol": symbol,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": "Insufficient data for analysis",
            "order_blocks": [],
            "fair_value_gaps": [],
            "market_structure": {},
            "liquidity_zones": [],
            "trading_signals": [],
            "key_levels": [],
            "confluence_score": 0,
            "market_bias": "neutral"
        }
    
    def _determine_best_timeframe(self, analysis: Dict[str, Any]) -> str:
        """Determine best timeframe based on analysis."""
        # Logic to determine optimal timeframe
        confluence = analysis.get("confluence_score", 50)
        if confluence > 80:
            return "15m"  # High confluence on lower timeframe
        elif confluence > 60:
            return "1h"   # Medium confluence, use higher timeframe
        else:
            return "4h"   # Low confluence, use even higher timeframe
    
    def _generate_recommendations(self, analysis: Dict[str, Any], signals: List[Dict]) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []
        
        bias = analysis.get("market_bias", "neutral")
        confluence = analysis.get("confluence_score", 50)
        
        if confluence > 80 and bias == "bullish":
            recommendations.append("Strong bullish confluence. Look for long entries on pullbacks.")
        elif confluence > 80 and bias == "bearish":
            recommendations.append("Strong bearish confluence. Look for short entries on rallies.")
        elif confluence < 40:
            recommendations.append("Low confluence. Wait for clearer market structure.")
        
        if len(signals) > 5:
            recommendations.append(f"Multiple signals detected ({len(signals)}). Focus on highest confidence setups.")
        
        # Check for institutional alignment
        inst_bias = analysis.get("institutional_metrics", {}).get("bias", "neutral")
        if inst_bias != "neutral" and inst_bias == bias:
            recommendations.append(f"Institutional activity aligns with {bias} bias. Higher probability setups.")
        
        return recommendations
    
    def _extract_structure_breaks(self, analysis: Dict[str, Any]) -> List[Dict]:
        """Extract recent structure breaks from analysis."""
        structure = analysis.get("market_structure", {})
        breaks = []
        
        # Extract BOS/CHoCH from structure analysis
        if "recent_break" in structure:
            breaks.append(structure["recent_break"])
        
        # Look for structure breaks in key levels
        for level in analysis.get("key_levels", []):
            if "break" in level.get("type", "").lower():
                breaks.append(level)
        
        return breaks[:5]  # Return top 5 most recent
    
    def _extract_liquidity_zones(self, analysis: Dict[str, Any]) -> List[Dict]:
        """Extract liquidity zones from analysis."""
        zones = analysis.get("liquidity_zones", [])
        
        # Add order blocks as liquidity zones
        for ob in analysis.get("order_blocks", []):
            if ob.get("active", True):
                zones.append({
                    "type": "order_block",
                    "price_start": ob.get("bottom"),
                    "price_end": ob.get("top"),
                    "strength": ob.get("strength", 50),
                    "side": ob.get("type", "unknown")
                })
        
        return zones[:10]  # Top 10 zones
    
    def _identify_confluence_zone(self, confluences: List[Dict]) -> Optional[Dict]:
        """Identify primary confluence zone."""
        if not confluences:
            return None
        
        # Group nearby confluences
        if len(confluences) >= 2:
            # Check if top 2 confluences are within 1% of each other
            price1 = confluences[0]["price"]
            price2 = confluences[1]["price"]
            
            if abs(price1 - price2) / price1 < 0.01:
                return {
                    "price_center": (price1 + price2) / 2,
                    "price_range": [min(price1, price2), max(price1, price2)],
                    "combined_score": confluences[0]["score"] + confluences[1]["score"] * 0.5,
                    "factors": list(set(confluences[0]["factors"] + confluences[1]["factors"]))
                }
        
        # Return single highest confluence
        return {
            "price_center": confluences[0]["price"],
            "price_range": [confluences[0]["price"] * 0.995, confluences[0]["price"] * 1.005],
            "combined_score": confluences[0]["score"],
            "factors": confluences[0]["factors"]
        }
    
    def _confluence_recommendation(self, confluences: List[Dict], analysis: Dict[str, Any]) -> str:
        """Generate recommendation based on confluence analysis."""
        if not confluences:
            return "No significant confluence zones detected. Wait for better setups."
        
        top_score = confluences[0]["score"]
        bias = analysis.get("market_bias", "neutral")
        
        if top_score >= 90:
            return f"Exceptional confluence detected. Prime {bias} opportunity if market approaches these levels."
        elif top_score >= 80:
            return f"Strong confluence zone identified. Monitor for {bias} entries with proper risk management."
        elif top_score >= 70:
            return f"Moderate confluence present. Consider {bias} positions with tight stops."
        else:
            return "Weak confluence. Better opportunities may develop with more market data."
