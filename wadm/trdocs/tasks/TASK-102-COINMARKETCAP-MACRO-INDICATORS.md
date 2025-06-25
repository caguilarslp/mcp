# TASK-102: CoinMarketCap Macro Indicators Integration

**Date**: 2025-06-25  
**Priority**: MEDIUM  
**Status**: PLANNING  
**Category**: Data Sources

## 🎯 **OBJETIVO**

Integrar indicadores macro-económicos de **CoinMarketCap** para complementar el análisis Wyckoff y SMC con datos de mercado institucional y sentiment global.

## 📊 **INDICADORES OBJETIVO DE COINMARKETCAP**

### **1. ETF Inflows/Outflows** 🔥
- **Bitcoin ETF flows** (IBIT, FBTC, ARKB, etc.)
- **Ethereum ETF flows** 
- **Correlación** flows vs price action
- **Institutional sentiment** basado en flows

### **2. Market Dominance Metrics**
- **Bitcoin dominance** (BTC.D)
- **Ethereum dominance** (ETH.D) 
- **Stablecoin dominance** (USDT.D, USDC.D)
- **DeFi vs CeFi dominance**

### **3. Fear & Greed Index**
- **Current sentiment** (0-100)
- **Historical patterns** vs price movements
- **Volatility sentiment** indicators
- **Social sentiment** metrics

### **4. Institutional Metrics**
- **Total market cap** trends
- **24h volume** institutional vs retail
- **Active addresses** growth
- **Network value** ratios

### **5. Macro Economic Data**
- **Global crypto adoption** metrics
- **Regulatory sentiment** index
- **Institutional adoption** rate
- **DeFi TVL** vs market cap correlation

## 🔍 **RESEARCH PHASE**

### **API Endpoints to Investigate**:
```bash
# CoinMarketCap Pro API endpoints to research:
/v1/cryptocurrency/listings/latest
/v1/global-metrics/quotes/latest  
/v2/cryptocurrency/quotes/latest
/v1/tools/price-conversion
/v1/cryptocurrency/ohlcv/historical
/v1/exchange/listings/latest
/v1/fiat/map  # For fiat currency data
```

### **Alternative Data Sources**:
- **CoinGecko API** (backup/comparison)
- **Glassnode API** (on-chain metrics)
- **Santiment API** (social sentiment)
- **DefiLlama API** (DeFi metrics)

## 🏗️ **IMPLEMENTATION PLAN**

### **Phase 1: Data Collection** (2 days)
- [ ] Research CoinMarketCap API capabilities
- [ ] Identify free vs paid endpoints needed
- [ ] Test API key requirements and rate limits
- [ ] Create data collection service
- [ ] Implement caching strategy (Redis/MongoDB)

### **Phase 2: Core Indicators** (3 days)
- [ ] **ETF Flows Tracker** 
  ```python
  class ETFFlowsService:
      def get_btc_etf_flows(self, period='24h')
      def get_eth_etf_flows(self, period='24h') 
      def analyze_flow_vs_price(self, symbol)
  ```
- [ ] **Dominance Calculator**
  ```python
  class DominanceService:
      def get_btc_dominance(self)
      def get_stablecoin_dominance(self)
      def analyze_dominance_shifts(self)
  ```

### **Phase 3: Sentiment Integration** (2 days)
- [ ] **Fear & Greed Index**
- [ ] **Social sentiment** aggregation
- [ ] **News sentiment** analysis
- [ ] Integration with existing SMC analysis

### **Phase 4: Wyckoff + Macro Confluence** (3 days)
- [ ] **Macro-Wyckoff correlation** engine
- [ ] **Institutional flow** vs Wyckoff phases
- [ ] **ETF inflows** vs Accumulation/Distribution detection
- [ ] **Sentiment extremes** vs Wyckoff reversal points

## 📈 **EXPECTED OUTPUTS**

### **New API Endpoints**:
```python
# Macro indicators
GET /api/v1/macro/etf-flows/{symbol}
GET /api/v1/macro/dominance
GET /api/v1/macro/fear-greed
GET /api/v1/macro/sentiment/{symbol}

# Integrated analysis
GET /api/v1/analysis/macro-wyckoff/{symbol}
GET /api/v1/analysis/institutional-flow/{symbol}
```

### **Dashboard Widgets**:
- **ETF Flows Heatmap** (inflows/outflows by day)
- **Dominance Chart** (BTC.D, ETH.D, USDT.D trends)
- **Fear & Greed Gauge** with historical correlation
- **Institutional Activity** score (ETF + exchange + sentiment)

## 🎯 **USE CASES**

### **Wyckoff Enhancement**:
- **Accumulation confirmation**: ETF inflows + BTC dominance rising = institutional accumulation
- **Distribution warning**: ETF outflows + fear & greed >80 = distribution phase likely
- **Composite Man activity**: Large ETF flows + low fear & greed = smart money positioning

### **SMC Confluence**:
- **Order Block validation**: Institutional flows confirm OB levels
- **FVG fill probability**: Sentiment extremes increase FVG fill likelihood  
- **Liquidity sweep timing**: ETF flows predict sweep direction

### **Trading Signals**:
- **High-conviction setups**: Wyckoff + SMC + Macro confluence
- **Risk management**: Sentiment extremes = reduce position size
- **Market regime detection**: Dominance shifts = trend change early warning

## ⚠️ **CONSIDERATIONS**

### **Data Reliability**:
- ETF flow data may have **1-day delay**
- Sentiment indicators can be **manipulated**
- Free API limits may require **paid upgrade**

### **Performance Impact**:
- External API calls add **latency**
- Large historical datasets need **efficient storage**
- Real-time updates require **WebSocket** or polling

### **Cost Analysis**:
- **CoinMarketCap Pro**: $79/month (100,000 calls)
- **Alternative**: CoinGecko free tier (10,000 calls/month)
- **Storage**: ~50MB/month additional data

## 📋 **SUCCESS METRICS**

### **Technical**:
- [ ] 5+ macro indicators integrated
- [ ] <500ms API response time
- [ ] 99.5% uptime data collection
- [ ] Correlation analysis with >0.7 accuracy

### **Business Value**:
- [ ] 20% improvement in signal quality
- [ ] Institutional flow predictions
- [ ] Market regime detection 24h ahead
- [ ] Premium feature differentiation

## 🔗 **RELATED TASKS**

- **TASK-025**: Institutional Data Sources (cold wallets)
- **TASK-026**: SMC Advanced (confluence detection)
- **TASK-064**: Dashboard MVP (visualization)
- **Fase 2**: Migración herramientas críticas (integration)

---

**Status**: ✅ **DOCUMENTED** - Ready for research phase  
**Next Step**: Investigate CoinMarketCap API capabilities and pricing  
**Timeline**: 2 weeks after Fase 2 completion  
**Dependencies**: Dashboard MVP, API infrastructure 