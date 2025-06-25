"""
Enhanced Market Structure Analysis with Institutional Validation - CONTINUED

This is the continuation of the StructureAnalyzer class with remaining methods.
"""

    def _analyze_trend_direction(self, swing_points: List[SwingPoint]) -> TrendDirection:
        """Analyze current trend direction based on swing points"""
        if len(swing_points) < 4:
            return TrendDirection.UNKNOWN
        
        # Get recent swing points (last 8)
        recent_swings = swing_points[-8:]
        
        # Separate highs and lows
        recent_highs = [s for s in recent_swings if s.is_high and s.confirmed]
        recent_lows = [s for s in recent_swings if not s.is_high and s.confirmed]
        
        if len(recent_highs) < 2 or len(recent_lows) < 2:
            return TrendDirection.UNKNOWN
        
        # Sort by timestamp
        recent_highs.sort(key=lambda x: x.timestamp)
        recent_lows.sort(key=lambda x: x.timestamp)
        
        # Check for Higher Highs and Higher Lows (bullish trend)
        hh_count = 0
        for i in range(1, len(recent_highs)):
            if recent_highs[i].price > recent_highs[i-1].price:
                hh_count += 1
        
        hl_count = 0
        for i in range(1, len(recent_lows)):
            if recent_lows[i].price > recent_lows[i-1].price:
                hl_count += 1
        
        # Check for Lower Lows and Lower Highs (bearish trend)
        ll_count = 0
        for i in range(1, len(recent_lows)):
            if recent_lows[i].price < recent_lows[i-1].price:
                ll_count += 1
        
        lh_count = 0
        for i in range(1, len(recent_highs)):
            if recent_highs[i].price < recent_highs[i-1].price:
                lh_count += 1
        
        # Determine trend
        bullish_signals = hh_count + hl_count
        bearish_signals = ll_count + lh_count
        
        if bullish_signals > bearish_signals and bullish_signals >= 2:
            return TrendDirection.BULLISH
        elif bearish_signals > bullish_signals and bearish_signals >= 2:
            return TrendDirection.BEARISH
        else:
            return TrendDirection.SIDEWAYS
    
    async def _detect_structure_breaks(self, swing_points: List[SwingPoint], candle_data: Dict[str, List[Dict]], symbol: str) -> List[StructureBreak]:
        """Detect structure breaks with institutional validation"""
        structure_breaks = []
        
        if len(swing_points) < 3:
            return structure_breaks
        
        # Get all candles for break detection
        all_candles = []
        for exchange, candles in candle_data.items():
            for candle in candles:
                candle['source_exchange'] = exchange
                all_candles.append(candle)
        
        all_candles.sort(key=lambda x: x['timestamp'])
        aggregated_candles = self._aggregate_candles_by_time(all_candles)
        
        # Look for structure breaks
        confirmed_swings = [s for s in swing_points if s.confirmed]
        
        for i in range(len(confirmed_swings) - 1):
            current_swing = confirmed_swings[i]
            
            # Find subsequent price action that might break this swing
            subsequent_candles = [c for c in aggregated_candles if c['timestamp'] > current_swing.timestamp]
            
            for candle in subsequent_candles[:20]:  # Check next 20 candles
                break_detected = False
                break_type = None
                
                if current_swing.is_high:
                    # Check for break above swing high (bullish BOS)
                    if candle['high'] > current_swing.price:
                        break_detected = True
                        break_type = StructureType.BOS_BULLISH
                        break_price = current_swing.price
                        
                else:
                    # Check for break below swing low (bearish BOS)
                    if candle['low'] < current_swing.price:
                        break_detected = True
                        break_type = StructureType.BOS_BEARISH
                        break_price = current_swing.price
                
                if break_detected:
                    # Create structure break
                    structure_break = await self._create_structure_break(
                        current_swing, candle, break_type, break_price, 
                        candle_data, symbol, aggregated_candles
                    )
                    
                    if structure_break:
                        structure_breaks.append(structure_break)
                    
                    break  # Only detect first break per swing
        
        # Detect Change of Character (CHoCH)
        choch_breaks = await self._detect_change_of_character(swing_points, aggregated_candles, candle_data, symbol)
        structure_breaks.extend(choch_breaks)
        
        return structure_breaks
    
    async def _create_structure_break(self, broken_swing: SwingPoint, break_candle: Dict, 
                                    break_type: StructureType, break_price: float,
                                    candle_data: Dict[str, List[Dict]], symbol: str,
                                    aggregated_candles: List[Dict]) -> Optional[StructureBreak]:
        """Create a structure break with full validation"""
        
        try:
            # Find the trigger swing (most recent opposite swing)
            trigger_swing = self._find_trigger_swing(broken_swing, aggregated_candles)
            if not trigger_swing:
                return None
            
            # Calculate institutional metrics during break
            break_window_start = break_candle['timestamp'] - timedelta(minutes=30)
            break_window_end = break_candle['timestamp'] + timedelta(minutes=30)
            
            institutional_volume = 0.0
            retail_volume = 0.0
            exchanges_confirming = []
            
            for exchange, candles in candle_data.items():
                exchange_volume = 0.0
                for candle in candles:
                    if break_window_start <= candle['timestamp'] <= break_window_end:
                        exchange_volume += candle['volume']
                
                if exchange_volume > 0:
                    exchanges_confirming.append(exchange)
                    if exchange in ['coinbase', 'kraken']:
                        institutional_volume += exchange_volume
                    else:
                        retail_volume += exchange_volume
            
            total_volume = institutional_volume + retail_volume
            institutional_ratio = institutional_volume / total_volume if total_volume > 0 else 0.0
            
            # Check if Coinbase led the move
            coinbase_leading = self._check_coinbase_leading(break_candle['timestamp'], candle_data)
            
            # Generate structure break ID
            break_id = f"{break_type.value}_{symbol}_{break_candle['timestamp'].strftime('%Y%m%d_%H%M')}"
            
            # Calculate invalidation level
            if break_type in [StructureType.BOS_BULLISH, StructureType.MSB_BULLISH]:
                invalidation_price = trigger_swing.price  # Previous swing low
            else:
                invalidation_price = trigger_swing.price  # Previous swing high
            
            # Calculate target level
            target_level = self._calculate_target_level(broken_swing, trigger_swing, break_type)
            
            structure_break = StructureBreak(
                id=break_id,
                type=break_type,
                strength=StructureStrength.WEAK,  # Will be upgraded during validation
                break_price=break_price,
                previous_level=broken_swing.price,
                target_level=target_level,
                break_time=break_candle['timestamp'],
                setup_start_time=trigger_swing.timestamp,
                broken_swing=broken_swing,
                trigger_swing=trigger_swing,
                break_volume=break_candle['volume'],
                institutional_volume=institutional_volume,
                retail_volume=retail_volume,
                institutional_ratio=institutional_ratio,
                exchanges_confirming=exchanges_confirming,
                multi_exchange_confirmed=len(exchanges_confirming) >= 2,
                coinbase_leading=coinbase_leading,
                liquidity_swept=self._check_liquidity_swept(broken_swing, aggregated_candles),
                volume_spike=self._check_volume_spike(break_candle, aggregated_candles),
                structure_significance=0.0,  # Will be calculated
                previous_tests=self._count_previous_tests(broken_swing, aggregated_candles),
                invalidation_price=invalidation_price,
                follow_through_confirmed=False,  # Will be updated later
                symbol=symbol,
                timeframe="15m"
            )
            
            return structure_break
            
        except Exception as e:
            logger.error(f"Error creating structure break: {e}")
            return None
    
    def _find_trigger_swing(self, broken_swing: SwingPoint, candles: List[Dict]) -> Optional[SwingPoint]:
        """Find the swing that triggered the structure break"""
        
        # Find candles between the broken swing and the break
        relevant_candles = [c for c in candles if c['timestamp'] < broken_swing.timestamp]
        
        if not relevant_candles:
            return None
        
        # Look for the most recent opposite swing
        if broken_swing.is_high:
            # Look for recent swing low
            for candle in reversed(relevant_candles[-20:]):  # Last 20 candles before break
                # Simple swing low detection
                if self._is_local_low(candle, relevant_candles):
                    return SwingPoint(
                        price=candle['low'],
                        timestamp=candle['timestamp'],
                        is_high=False,
                        volume=candle['volume'],
                        institutional_volume=candle.get('institutional_volume', 0.0),
                        retail_volume=candle.get('retail_volume', 0.0),
                        strength=50.0,  # Default strength
                        confirmed=True
                    )
        else:
            # Look for recent swing high
            for candle in reversed(relevant_candles[-20:]):
                if self._is_local_high(candle, relevant_candles):
                    return SwingPoint(
                        price=candle['high'],
                        timestamp=candle['timestamp'],
                        is_high=True,
                        volume=candle['volume'],
                        institutional_volume=candle.get('institutional_volume', 0.0),
                        retail_volume=candle.get('retail_volume', 0.0),
                        strength=50.0,
                        confirmed=True
                    )
        
        return None
    
    def _is_local_high(self, candle: Dict, all_candles: List[Dict]) -> bool:
        """Check if candle represents a local high"""
        candle_time = candle['timestamp']
        window_start = candle_time - timedelta(hours=2)
        window_end = candle_time + timedelta(hours=2)
        
        window_candles = [c for c in all_candles 
                         if window_start <= c['timestamp'] <= window_end]
        
        if len(window_candles) < 3:
            return False
        
        return candle['high'] == max(c['high'] for c in window_candles)
    
    def _is_local_low(self, candle: Dict, all_candles: List[Dict]) -> bool:
        """Check if candle represents a local low"""
        candle_time = candle['timestamp']
        window_start = candle_time - timedelta(hours=2)
        window_end = candle_time + timedelta(hours=2)
        
        window_candles = [c for c in all_candles 
                         if window_start <= c['timestamp'] <= window_end]
        
        if len(window_candles) < 3:
            return False
        
        return candle['low'] == min(c['low'] for c in window_candles)
    
    def _check_coinbase_leading(self, break_time: datetime, candle_data: Dict[str, List[Dict]]) -> bool:
        """Check if Coinbase led the move (institutional signal)"""
        
        # Get Coinbase data around break time
        coinbase_candles = candle_data.get('coinbase', [])
        if not coinbase_candles:
            return False
        
        # Find candle closest to break time
        break_window = timedelta(minutes=15)
        relevant_candles = [c for c in coinbase_candles 
                          if abs(c['timestamp'] - break_time) <= break_window]
        
        if not relevant_candles:
            return False
        
        # Check if Coinbase had significant volume during break
        coinbase_volume = sum(c['volume'] for c in relevant_candles)
        
        # Compare with other exchanges
        total_volume = 0.0
        for exchange, candles in candle_data.items():
            if exchange != 'coinbase':
                exchange_volume = sum(c['volume'] for c in candles 
                                   if abs(c['timestamp'] - break_time) <= break_window)
                total_volume += exchange_volume
        
        # Coinbase leading if it has >30% of volume during break
        if total_volume > 0:
            coinbase_ratio = coinbase_volume / (coinbase_volume + total_volume)
            return coinbase_ratio > 0.3
        
        return False
    
    def _calculate_target_level(self, broken_swing: SwingPoint, trigger_swing: SwingPoint, 
                              break_type: StructureType) -> Optional[float]:
        """Calculate next target level based on structure break"""
        
        # Simple target calculation based on swing-to-swing distance
        swing_distance = abs(broken_swing.price - trigger_swing.price)
        
        if break_type in [StructureType.BOS_BULLISH, StructureType.MSB_BULLISH]:
            # Target above broken high
            return broken_swing.price + swing_distance
        else:
            # Target below broken low
            return broken_swing.price - swing_distance
    
    def _check_liquidity_swept(self, swing: SwingPoint, candles: List[Dict]) -> bool:
        """Check if liquidity was swept before the structure break"""
        
        # Look for stop hunt pattern - price briefly moves beyond swing then reverses
        swing_time = swing.timestamp
        subsequent_candles = [c for c in candles if c['timestamp'] > swing_time][:10]
        
        if swing.is_high:
            # Check for sweep above swing high followed by reversal
            for candle in subsequent_candles:
                if candle['high'] > swing.price * 1.001:  # 0.1% above swing
                    # Check if price closed back below swing
                    if candle['close'] < swing.price:
                        return True
        else:
            # Check for sweep below swing low followed by reversal
            for candle in subsequent_candles:
                if candle['low'] < swing.price * 0.999:  # 0.1% below swing
                    if candle['close'] > swing.price:
                        return True
        
        return False
    
    def _check_volume_spike(self, break_candle: Dict, candles: List[Dict]) -> bool:
        """Check if break occurred with volume spike"""
        
        break_time = break_candle['timestamp']
        recent_candles = [c for c in candles 
                         if break_time - timedelta(hours=4) <= c['timestamp'] < break_time]
        
        if len(recent_candles) < 10:
            return False
        
        avg_volume = statistics.mean([c['volume'] for c in recent_candles])
        return break_candle['volume'] > avg_volume * self.volume_spike_threshold
    
    def _count_previous_tests(self, swing: SwingPoint, candles: List[Dict]) -> int:
        """Count how many times the swing level was tested before breaking"""
        
        tests = 0
        swing_time = swing.timestamp
        tolerance = swing.price * 0.002  # 0.2% tolerance
        
        # Look at candles before the swing
        prior_candles = [c for c in candles if c['timestamp'] < swing_time]
        
        for candle in prior_candles[-50:]:  # Check last 50 candles
            if swing.is_high:
                # Check if price approached swing high
                if abs(candle['high'] - swing.price) <= tolerance:
                    tests += 1
            else:
                # Check if price approached swing low
                if abs(candle['low'] - swing.price) <= tolerance:
                    tests += 1
        
        return tests
    
    async def _detect_change_of_character(self, swing_points: List[SwingPoint], 
                                        candles: List[Dict], candle_data: Dict[str, List[Dict]], 
                                        symbol: str) -> List[StructureBreak]:
        """Detect Change of Character (CHoCH) patterns"""
        
        choch_breaks = []
        
        if len(swing_points) < 4:
            return choch_breaks
        
        # Analyze trend changes
        confirmed_swings = [s for s in swing_points if s.confirmed]
        
        for i in range(2, len(confirmed_swings)):
            current_swing = confirmed_swings[i]
            prev_swing = confirmed_swings[i-1]
            prev_prev_swing = confirmed_swings[i-2]
            
            # Check for CHoCH pattern
            choch_type = None
            
            if (not current_swing.is_high and not prev_prev_swing.is_high and 
                current_swing.price > prev_prev_swing.price):
                # Higher Low formed - potential bullish CHoCH
                choch_type = StructureType.CHOCH_BULLISH
                
            elif (current_swing.is_high and prev_prev_swing.is_high and 
                  current_swing.price < prev_prev_swing.price):
                # Lower High formed - potential bearish CHoCH
                choch_type = StructureType.CHOCH_BEARISH
            
            if choch_type:
                # Create CHoCH structure break
                choch_break = await self._create_structure_break(
                    prev_swing, self._find_candle_by_time(current_swing.timestamp, candles),
                    choch_type, current_swing.price, candle_data, symbol, candles
                )
                
                if choch_break:
                    choch_breaks.append(choch_break)
        
        return choch_breaks
    
    def _find_candle_by_time(self, timestamp: datetime, candles: List[Dict]) -> Dict:
        """Find candle closest to given timestamp"""
        closest_candle = None
        min_diff = timedelta.max
        
        for candle in candles:
            diff = abs(candle['timestamp'] - timestamp)
            if diff < min_diff:
                min_diff = diff
                closest_candle = candle
        
        return closest_candle or {'timestamp': timestamp, 'volume': 0, 'high': 0, 'low': 0, 'close': 0}
    
    async def _apply_institutional_validation(self, structure_breaks: List[StructureBreak], 
                                            candle_data: Dict[str, List[Dict]]) -> List[StructureBreak]:
        """Apply institutional validation to structure breaks"""
        
        validated_breaks = []
        
        for break_item in structure_breaks:
            try:
                # Update strength based on institutional metrics
                if break_item.institutional_ratio > 0.6:
                    break_item.strength = StructureStrength.VERY_STRONG
                elif break_item.institutional_ratio > 0.4:
                    break_item.strength = StructureStrength.STRONG
                elif break_item.institutional_ratio > 0.2:
                    break_item.strength = StructureStrength.MODERATE
                else:
                    break_item.strength = StructureStrength.WEAK
                
                # Check follow-through confirmation
                break_item.follow_through_confirmed = await self._check_follow_through(break_item, candle_data)
                
                # Only keep breaks with minimum institutional validation
                if (break_item.institutional_ratio >= self.min_institutional_ratio or 
                    break_item.multi_exchange_confirmed or 
                    break_item.coinbase_leading):
                    validated_breaks.append(break_item)
                
            except Exception as e:
                logger.error(f"Error validating structure break {break_item.id}: {e}")
                continue
        
        return validated_breaks
    
    async def _check_follow_through(self, structure_break: StructureBreak, 
                                  candle_data: Dict[str, List[Dict]]) -> bool:
        """Check if structure break had institutional follow-through"""
        
        # Get candles after break for follow-through analysis
        follow_through_window = timedelta(hours=4)
        break_time = structure_break.break_time
        
        total_institutional_volume = 0.0
        total_retail_volume = 0.0
        
        for exchange, candles in candle_data.items():
            is_institutional = exchange in ['coinbase', 'kraken']
            
            for candle in candles:
                if break_time < candle['timestamp'] <= break_time + follow_through_window:
                    if is_institutional:
                        total_institutional_volume += candle['volume']
                    else:
                        total_retail_volume += candle['volume']
        
        total_volume = total_institutional_volume + total_retail_volume
        if total_volume > 0:
            follow_through_ratio = total_institutional_volume / total_volume
            return follow_through_ratio > 0.3
        
        return False
    
    async def _calculate_structure_significance(self, structure_breaks: List[StructureBreak]) -> List[StructureBreak]:
        """Calculate significance scores for structure breaks"""
        
        for break_item in structure_breaks:
            try:
                score = 0.0
                
                # Institutional participation (0-40 points)
                score += min(break_item.institutional_ratio * 100, 40)
                
                # Multi-exchange confirmation (0-20 points)
                if break_item.multi_exchange_confirmed:
                    score += 20
                
                # Coinbase leading (0-15 points)
                if break_item.coinbase_leading:
                    score += 15
                
                # Volume spike (0-10 points)
                if break_item.volume_spike:
                    score += 10
                
                # Liquidity swept (0-10 points)
                if break_item.liquidity_swept:
                    score += 10
                
                # Previous tests bonus (0-5 points)
                score += min(break_item.previous_tests, 5)
                
                break_item.structure_significance = min(score, 100.0)
                
            except Exception as e:
                logger.error(f"Error calculating significance for {break_item.id}: {e}")
                break_item.structure_significance = 0.0
        
        # Filter by minimum significance
        return [b for b in structure_breaks if b.structure_significance >= self.min_structure_significance]
    
    def _determine_market_bias(self, structure_breaks: List[StructureBreak], 
                             swing_points: List[SwingPoint]) -> str:
        """Determine overall market bias"""
        
        if not structure_breaks:
            return "neutral"
        
        # Weight recent breaks more heavily
        recent_breaks = structure_breaks[-5:]
        
        bullish_score = 0
        bearish_score = 0
        
        for break_item in recent_breaks:
            weight = break_item.structure_significance / 100.0
            
            if break_item.type in [StructureType.BOS_BULLISH, StructureType.CHOCH_BULLISH, StructureType.MSB_BULLISH]:
                bullish_score += weight
            else:
                bearish_score += weight
        
        if bullish_score > bearish_score * 1.2:
            return "bullish"
        elif bearish_score > bullish_score * 1.2:
            return "bearish"
        else:
            return "neutral"
    
    def _update_active_structures(self, symbol: str, new_breaks: List[StructureBreak]):
        """Update active structures for a symbol"""
        if symbol not in self.active_structures:
            self.active_structures[symbol] = []
        
        # Add new breaks
        self.active_structures[symbol].extend(new_breaks)
        
        # Remove expired structures
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=self.structure_expiry_hours)
        self.active_structures[symbol] = [
            s for s in self.active_structures[symbol]
            if s.break_time > cutoff_time
        ]
        
        # Limit number of active structures
        if len(self.active_structures[symbol]) > self.max_structures_per_symbol:
            self.active_structures[symbol].sort(key=lambda x: x.structure_significance, reverse=True)
            self.active_structures[symbol] = self.active_structures[symbol][:self.max_structures_per_symbol]
    
    def _identify_key_levels(self, swing_points: List[SwingPoint]) -> List[Dict[str, Any]]:
        """Identify key support/resistance levels"""
        
        key_levels = []
        confirmed_swings = [s for s in swing_points if s.confirmed]
        
        # Group swings by price level (cluster analysis)
        price_clusters = {}
        tolerance_pct = 0.5  # 0.5% tolerance for clustering
        
        for swing in confirmed_swings:
            clustered = False
            for level, swings in price_clusters.items():
                if abs(swing.price - level) / level * 100 <= tolerance_pct:
                    swings.append(swing)
                    clustered = True
                    break
            
            if not clustered:
                price_clusters[swing.price] = [swing]
        
        # Convert clusters to key levels
        for level_price, swings in price_clusters.items():
            if len(swings) >= 2:  # At least 2 touches to be significant
                total_volume = sum(s.volume for s in swings)
                institutional_volume = sum(s.institutional_volume for s in swings)
                
                key_levels.append({
                    'price': level_price,
                    'touches': len(swings),
                    'total_volume': total_volume,
                    'institutional_volume': institutional_volume,
                    'institutional_ratio': institutional_volume / total_volume if total_volume > 0 else 0,
                    'last_touch': max(s.timestamp for s in swings),
                    'type': 'resistance' if any(s.is_high for s in swings) else 'support'
                })
        
        # Sort by significance (touches * volume)
        key_levels.sort(key=lambda x: x['touches'] * x['total_volume'], reverse=True)
        
        return key_levels[:10]  # Top 10 key levels
    
    def _calculate_trend_strength(self, swing_points: List[SwingPoint], 
                                structure_breaks: List[StructureBreak]) -> float:
        """Calculate trend strength (0-100)"""
        
        if not swing_points or not structure_breaks:
            return 0.0
        
        # Recent swing consistency
        recent_swings = swing_points[-6:]
        trend_direction = self._analyze_trend_direction(swing_points)
        
        consistency_score = 0.0
        if trend_direction == TrendDirection.BULLISH:
            highs = [s for s in recent_swings if s.is_high]
            lows = [s for s in recent_swings if not s.is_high]
            
            if len(highs) >= 2 and len(lows) >= 2:
                hh_count = sum(1 for i in range(1, len(highs)) if highs[i].price > highs[i-1].price)
                hl_count = sum(1 for i in range(1, len(lows)) if lows[i].price > lows[i-1].price)
                consistency_score = (hh_count + hl_count) / (len(highs) + len(lows) - 2) * 50
        
        elif trend_direction == TrendDirection.BEARISH:
            highs = [s for s in recent_swings if s.is_high]
            lows = [s for s in recent_swings if not s.is_high]
            
            if len(highs) >= 2 and len(lows) >= 2:
                lh_count = sum(1 for i in range(1, len(highs)) if highs[i].price < highs[i-1].price)
                ll_count = sum(1 for i in range(1, len(lows)) if lows[i].price < lows[i-1].price)
                consistency_score = (lh_count + ll_count) / (len(highs) + len(lows) - 2) * 50
        
        # Institutional confirmation
        recent_breaks = structure_breaks[-3:]
        avg_institutional_ratio = statistics.mean([b.institutional_ratio for b in recent_breaks]) if recent_breaks else 0
        institutional_score = avg_institutional_ratio * 50
        
        return min(consistency_score + institutional_score, 100.0)
    
    def _calculate_institutional_bias(self, structure_breaks: List[StructureBreak]) -> str:
        """Calculate institutional bias based on recent structure breaks"""
        
        if not structure_breaks:
            return "neutral"
        
        recent_breaks = structure_breaks[-3:]
        
        # Weight by institutional ratio and significance
        bullish_weight = 0.0
        bearish_weight = 0.0
        
        for break_item in recent_breaks:
            weight = break_item.institutional_ratio * break_item.structure_significance / 100
            
            if break_item.type in [StructureType.BOS_BULLISH, StructureType.CHOCH_BULLISH, StructureType.MSB_BULLISH]:
                bullish_weight += weight
            else:
                bearish_weight += weight
        
        if bullish_weight > bearish_weight * 1.5:
            return "bullish"
        elif bearish_weight > bullish_weight * 1.5:
            return "bearish"
        else:
            return "neutral"
    
    def _calculate_next_targets(self, swing_points: List[SwingPoint], trend: TrendDirection) -> List[Dict[str, Any]]:
        """Calculate next price targets based on structure"""
        
        targets = []
        
        if len(swing_points) < 4:
            return targets
        
        recent_swings = swing_points[-4:]
        
        if trend == TrendDirection.BULLISH:
            # Calculate bullish targets
            highs = [s for s in recent_swings if s.is_high]
            lows = [s for s in recent_swings if not s.is_high]
            
            if len(highs) >= 2 and len(lows) >= 2:
                last_high = max(highs, key=lambda x: x.price)
                last_low = max(lows, key=lambda x: x.timestamp)
                
                # Extension targets
                swing_size = last_high.price - last_low.price
                
                targets.extend([
                    {'price': last_high.price + swing_size * 0.618, 'type': 'fibonacci_61.8', 'probability': 70},
                    {'price': last_high.price + swing_size * 1.0, 'type': 'measured_move', 'probability': 60},
                    {'price': last_high.price + swing_size * 1.618, 'type': 'fibonacci_161.8', 'probability': 45}
                ])
        
        elif trend == TrendDirection.BEARISH:
            # Calculate bearish targets
            highs = [s for s in recent_swings if s.is_high]
            lows = [s for s in recent_swings if not s.is_high]
            
            if len(highs) >= 2 and len(lows) >= 2:
                last_low = min(lows, key=lambda x: x.price)
                last_high = max(highs, key=lambda x: x.timestamp)
                
                # Extension targets
                swing_size = last_high.price - last_low.price
                
                targets.extend([
                    {'price': last_low.price - swing_size * 0.618, 'type': 'fibonacci_61.8', 'probability': 70},
                    {'price': last_low.price - swing_size * 1.0, 'type': 'measured_move', 'probability': 60},
                    {'price': last_low.price - swing_size * 1.618, 'type': 'fibonacci_161.8', 'probability': 45}
                ])
        
        return targets
    
    def _calculate_invalidation_levels(self, swing_points: List[SwingPoint], trend: TrendDirection) -> List[Dict[str, Any]]:
        """Calculate invalidation levels for current structure"""
        
        invalidation_levels = []
        
        if len(swing_points) < 2:
            return invalidation_levels
        
        recent_swings = swing_points[-4:]
        
        if trend == TrendDirection.BULLISH:
            # Last significant low is invalidation
            lows = [s for s in recent_swings if not s.is_high]
            if lows:
                last_low = max(lows, key=lambda x: x.timestamp)
                invalidation_levels.append({
                    'price': last_low.price,
                    'type': 'trend_invalidation',
                    'description': 'Break below last higher low invalidates bullish structure'
                })
        
        elif trend == TrendDirection.BEARISH:
            # Last significant high is invalidation
            highs = [s for s in recent_swings if s.is_high]
            if highs:
                last_high = max(highs, key=lambda x: x.timestamp)
                invalidation_levels.append({
                    'price': last_high.price,
                    'type': 'trend_invalidation',
                    'description': 'Break above last lower high invalidates bearish structure'
                })
        
        return invalidation_levels
    
    def get_active_structure_breaks(self, symbol: str, min_significance: float = 60.0) -> List[StructureBreak]:
        """Get active structure breaks for a symbol"""
        if symbol not in self.active_structures:
            return []
        
        return [
            s for s in self.active_structures[symbol]
            if s.structure_significance >= min_significance and not s.false_break
        ]
    
    def get_structure_summary(self, symbol: str) -> Dict[str, Any]:
        """Get structure summary for a symbol"""
        active_breaks = self.get_active_structure_breaks(symbol)
        swing_points = self.swing_cache.get(symbol, [])
        
        if not active_breaks and not swing_points:
            return {
                'symbol': symbol,
                'status': 'insufficient_data',
                'message': 'No structure data available'
            }
        
        current_trend = self._analyze_trend_direction(swing_points)
        market_bias = self._determine_market_bias(active_breaks, swing_points)
        
        return {
            'symbol': symbol,
            'current_trend': current_trend.value,
            'market_bias': market_bias,
            'active_breaks_count': len(active_breaks),
            'trend_strength': self._calculate_trend_strength(swing_points, active_breaks),
            'institutional_bias': self._calculate_institutional_bias(active_breaks),
            'last_significant_break': active_breaks[-1].to_dict() if active_breaks else None,
            'key_levels_count': len(self._identify_key_levels(swing_points)),
            'analysis_timestamp': datetime.now(timezone.utc)
        }
