# TASK-025: Institutional Data Sources Integration

**Status:** TODO  
**Priority:** HIGH  
**Time:** 1 week  
**Estimated ROI:** Very High (institutional signal quality)

## Overview
Expand data collection to include institutional-grade sources for better Smart Money analysis:
1. Coinbase Pro & Kraken (institutional exchanges)
2. Cold/Hot wallet monitoring (exchange reserves)
3. USDT/USDC minting events (liquidity injection)

## Phase 1: Coinbase & Kraken Integration (3 days)

### Coinbase Pro Integration
```python
# New collector: src/collectors/coinbase_collector.py
class CoinbaseCollector:
    def __init__(self):
        self.ws_url = "wss://ws-feed.pro.coinbase.com"
        self.products = ["BTC-USD", "ETH-USD"]  # Premium pairs
    
    async def subscribe_matches(self):
        # Real-time trade data (higher quality than retail exchanges)
        pass
```

**Benefits:**
- Higher average trade size
- Less wash trading
- Clearer institutional patterns
- US regulatory compliance = cleaner data

### Kraken Integration
```python
# src/collectors/kraken_collector.py
class KrakenCollector:
    def __init__(self):
        self.ws_url = "wss://ws.kraken.com"
        self.pairs = ["XBT/USD", "ETH/USD"]  # European institutional focus
```

**Benefits:**
- European institutional flow
- Traditional finance bridge
- Lower HFT noise
- Better for accumulation detection

### Implementation Plan
- [ ] Create WebSocket collectors for both exchanges
- [ ] Add to existing manager.py coordination
- [ ] Update MongoDB schema for exchange tagging
- [ ] Create institutional activity scoring
- [ ] Multi-exchange arbitrage detection
- [ ] Cross-exchange order flow analysis

## Phase 2: Exchange Reserve Monitoring (2 days)

### Cold Wallet Tracking
**Data Sources:**
- Bybit Cold Wallets: `bc1ql49ydapnjafl5t2ussv9ghhf9v5eep0x8uqex5`, `3BMEX...`
- Binance Cold Wallets: `34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo`, `bc1qa5w...`
- Coinbase Cold: `36n4MbFNbk15Uo2DtgeMYT2v9i1vVE5JhN`
- Kraken Cold: `3NvQh5jAHuLdZxvr5JgCQNpnTHiLEkGfuD`

```python
# src/collectors/wallet_monitor.py
class WalletMonitor:
    def __init__(self):
        self.api_sources = [
            "https://api.blockchain.info/rawaddr/",  # Bitcoin
            "https://api.etherscan.io/api",          # Ethereum
        ]
    
    async def track_cold_movements(self):
        # Monitor inflows/outflows to major exchange cold wallets
        # Alert on significant movements (>500 BTC, >5000 ETH)
        pass
```

**Smart Money Signals:**
- **Cold Inflow** = Bearish short-term, Bullish long-term
- **Cold Outflow** = Bullish (expect selling pressure)
- **Hot → Cold** = Accumulation phase (Wyckoff Phase C)
- **Cold → Hot** = Distribution phase (Wyckoff Phase D)

### Implementation Plan
- [ ] Identify major cold wallet addresses per exchange
- [ ] Create blockchain API integration (free tiers)
- [ ] Real-time monitoring with configurable thresholds
- [ ] Historical analysis of movements vs price action
- [ ] Correlation with Wyckoff phases
- [ ] Alert system for significant movements

## Phase 3: Stablecoin Minting Monitor (1 day)

### USDT Minting Tracking
**API Source:** `https://api.whale-alert.io/v1/transactions`
```python
# src/collectors/stablecoin_monitor.py
class StablecoinMonitor:
    async def track_tether_minting(self):
        # Monitor USDT Treasury wallet: 0x5754284f345afc66a98bb...
        # Alert on mints >$50M
        pass
    
    async def track_usdc_minting(self):
        # Monitor Circle's issuing address
        # Correlate with institutional demand
        pass
```

**Smart Money Context:**
- **Large Mints** ($100M+) = Institutional demand incoming
- **Minting Clusters** = Accumulation preparation
- **Mint → Exchange** = Buying pressure building
- **Historical Pattern**: 72h delay from mint to market impact

### Implementation Plan
- [ ] Integrate with Whale Alert API (free tier: 1000 calls/month)
- [ ] Track USDT/USDC/BUSD minting events
- [ ] Correlate with exchange inflows
- [ ] Historical backtesting (mint → price correlation)
- [ ] Create "Institutional Demand Index"

## Phase 4: Confluence Analysis (2 days)

### Multi-Source Signal Scoring
Create composite institutional activity score:

```python
class InstitutionalActivityScore:
    def calculate_score(self):
        score = 0
        
        # Exchange Flow Score (30%)
        coinbase_volume_vs_binance = self.get_exchange_dominance()
        score += coinbase_volume_vs_binance * 0.3
        
        # Cold Wallet Score (40%)
        cold_inflows = self.get_cold_wallet_activity()
        score += cold_inflows * 0.4
        
        # Minting Score (20%)
        recent_mints = self.get_stablecoin_minting()
        score += recent_mints * 0.2
        
        # Order Flow Quality (10%)
        institutional_trades = self.get_large_trade_ratio()
        score += institutional_trades * 0.1
        
        return min(score, 100)  # Cap at 100
```

### Wyckoff Integration
- Map institutional signals to Wyckoff phases
- Enhance spring/upthrust detection with wallet data
- Validate accumulation with cold wallet inflows
- Confirm distribution with stablecoin redemptions

## Expected Outcomes

### Immediate Benefits (Week 1)
- 40% better signal quality from institutional exchanges
- Early detection of accumulation/distribution
- Reduced false breakouts (better data quality)

### Medium Term (Month 1)
- Predictive cold wallet signals (2-3 day lead time)
- Stablecoin flow correlation (institutional demand)
- Multi-exchange arbitrage opportunities

### Long Term (Quarter 1)
- Institutional activity composite index
- Wyckoff phase prediction accuracy >80%
- Alert system for major institutional moves
- Cross-market correlation analysis

## Resource Requirements
- **APIs**: Whale Alert (free), blockchain APIs (free tiers)
- **Storage**: +20% MongoDB usage
- **Processing**: +30% CPU for multi-source correlation
- **Development**: 1 week full-time

## Success Metrics
- Increase in profitable signal accuracy by 25%
- Reduction in false signals by 40%
- Early detection of major moves (2-4 hour advantage)
- Correlation score >0.7 between cold flows and price

## Risk Mitigation
- Use free API tiers initially
- Graceful fallback if external APIs fail
- Rate limiting for API calls
- Data validation for blockchain queries
