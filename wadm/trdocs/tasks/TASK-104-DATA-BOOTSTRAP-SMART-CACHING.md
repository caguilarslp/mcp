# TASK-104: Data Bootstrap + Smart Caching Strategy

**Date**: 2025-06-25  
**Priority**: CRITICAL 🔥  
**Status**: READY  
**Category**: Infrastructure

## 🎯 **OBJETIVO**

Implementar **bootstrap de datos históricos** y **estrategia de caching inteligente** para reemplazar completamente la funcionalidad del MCP en obtención de datos, optimizando peticiones API y performance.

## 📊 **PROBLEMA ACTUAL**

### **❌ Estado sin MCP**:
- **Solo datos desde WebSocket** - No hay históricos pre-existing
- **APIs públicas no usadas** - Sin fetch de Binance/Bybit REST
- **Gaps en datos** - Candles solo desde que empezó el sistema
- **Sin optimización** - No hay caching strategy

### **✅ Objetivo Post-Implementation**:
- **Datos completos** - Históricos desde inception + real-time
- **Zero waste API** - 99% reducción peticiones
- **Performance óptimo** - <50ms response times
- **Resiliencia** - Fallbacks automáticos

## 🚀 **ARQUITECTURA HÍBRIDA INTELIGENTE**

### **3-Layer Data Strategy**:

#### **🔥 Layer 1: Hot Data (Redis Cache)**
```python
REDIS_STRATEGY = {
    "1m": "last_24h",    # Últimas 24h en 1m (1440 candles)
    "5m": "last_3d",     # Últimos 3 días en 5m (864 candles)  
    "15m": "last_7d",    # Última semana en 15m (672 candles)
    "1h": "last_30d",    # Último mes en 1h (720 candles)
    "4h": "last_90d",    # Últimos 3 meses en 4h (540 candles)
    "1d": "last_1y",     # Último año en 1d (365 candles)
    "ttl": "auto_refresh" # Auto-refresh from real-time trades
}
```

#### **💾 Layer 2: Warm Data (MongoDB Storage)**
```python
MONGODB_STRATEGY = {
    "all_timeframes": "complete_history",
    "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT", ...],
    "from": "symbol_inception_date",
    "indexed": True,
    "aggregated": True,  # Pre-computed candles
    "source": "bootstrap_once + realtime_append"
}
```

#### **🌐 Layer 3: Cold Data (API Fallback)**
```python
API_STRATEGY = {
    "usage": "MINIMAL_GAPS_ONLY",
    "triggers": ["system_downtime_recovery", "new_symbol_bootstrap"],
    "frequency": "ONCE_PER_SYMBOL + emergency",
    "rate_limits": "respected",
    "caching": "immediate_store"
}
```

## 🏗️ **IMPLEMENTATION**

### **Nueva Estructura**:
```python
src/services/
├── data_bootstrap/
│   ├── __init__.py
│   ├── historical_fetcher.py      # 🆕 Bootstrap históricos
│   ├── gap_detector.py            # 🆕 Detect missing data
│   └── api_manager.py             # 🆕 Smart API calls
├── caching/
│   ├── __init__.py  
│   ├── redis_manager.py           # 🆕 Hot cache management
│   ├── cache_strategy.py          # 🆕 Multi-layer logic
│   └── performance_monitor.py     # 🆕 Cache performance
├── candles/
│   ├── __init__.py
│   ├── candle_manager.py          # 🆕 Unified candle access
│   ├── real_time_builder.py       # 🆕 WebSocket → Candles
│   └── aggregator.py              # 🆕 Trade aggregation
```

### **Core Services**:

#### **1. Historical Bootstrap Service** (2 días)
```python
class HistoricalBootstrapService:
    """One-time historical data fetching"""
    
    async def bootstrap_symbol(self, symbol: str):
        """Bootstrap complete historical data for symbol"""
        # 1. Get symbol inception date from exchange
        # 2. Check existing data in MongoDB  
        # 3. Identify gaps
        # 4. Fetch missing data in batches
        # 5. Store in MongoDB with metadata
        
    async def fetch_inception_date(self, symbol: str) -> datetime:
        """Get symbol trading start date"""
        
    async def batch_fetch_candles(self, symbol: str, start: datetime, end: datetime):
        """Smart batching with rate limits"""
        
    async def validate_data_integrity(self, symbol: str):
        """Validate fetched data completeness"""
```

#### **2. Smart Cache Manager** (2 días)
```python
class SmartCacheManager:
    """Multi-layer intelligent caching"""
    
    async def get_candles(self, symbol: str, timeframe: str, limit: int) -> List[Candle]:
        """Smart retrieval: Redis → MongoDB → Real-time → API"""
        # 1. Check Redis cache (hot data)
        # 2. Check MongoDB (warm data)
        # 3. Build from real-time trades (fresh data)
        # 4. API fallback (only if gaps)
        
    async def cache_candles(self, candles: List[Candle], timeframe: str):
        """Store in appropriate cache layer"""
        
    async def invalidate_cache(self, symbol: str, timeframe: str):
        """Smart cache invalidation"""
        
    async def preload_hot_data(self):
        """Preload frequently accessed data"""
```

#### **3. Real-time Candle Builder** (1 día)
```python
class RealTimeCandleBuilder:
    """Build candles from WebSocket trades"""
    
    async def build_candle(self, trades: List[Trade], timeframe: str) -> Candle:
        """Aggregate trades into OHLCV candle"""
        
    async def update_cache_realtime(self, candle: Candle):
        """Update cache with fresh candle"""
        
    async def detect_candle_completion(self, timeframe: str) -> bool:
        """Detect when candle period completes"""
```

#### **4. Gap Detection & Recovery** (1 día)
```python
class GapDetector:
    """Detect and fill data gaps"""
    
    async def scan_for_gaps(self, symbol: str, timeframe: str) -> List[DateRange]:
        """Identify missing data periods"""
        
    async def fill_gaps(self, gaps: List[DateRange]):
        """Fill gaps with API calls"""
        
    async def schedule_gap_monitoring(self):
        """Background gap monitoring"""
```

## 📈 **API ENDPOINTS**

### **Enhanced Existing**:
```python
# Optimized with smart caching
GET /api/v1/market/candles/{symbol}/{timeframe}
  # Smart cache: Redis → MongoDB → Real-time → API fallback
  
# Parameters:
  ?limit=500           # Number of candles
  ?start_time=ISO      # Start time filter  
  ?end_time=ISO        # End time filter
  ?cache_strategy=auto # auto, force_fresh, cache_only
```

### **New Admin Endpoints**:
```python
# Bootstrap management (admin only)
POST /api/v1/admin/bootstrap/{symbol}
  # One-time historical bootstrap

GET /api/v1/admin/bootstrap/status
  # Bootstrap progress for all symbols
  
POST /api/v1/admin/cache/preload
  # Preload hot cache data
  
GET /api/v1/admin/cache/stats
  # Cache performance statistics
  
POST /api/v1/admin/gaps/scan
  # Scan and report data gaps
  
POST /api/v1/admin/gaps/fill
  # Fill detected gaps
```

### **Enhanced Performance Metrics**:
```python
GET /api/v1/system/cache-stats
  # Cache hit rates, performance metrics
  
GET /api/v1/system/data-health
  # Data completeness, gap reports
```

## ⚡ **PERFORMANCE OPTIMIZATION**

### **Request Flow Optimization**:
```python
def get_candles_optimized(symbol: str, timeframe: str, limit: int):
    # Step 1: Redis check (10ms)
    if hot_data := redis.get(f"{symbol}:{timeframe}:latest"):
        return hot_data[:limit]
    
    # Step 2: MongoDB check (50ms)  
    if warm_data := mongodb.find({"symbol": symbol, "timeframe": timeframe}):
        redis.set(key, warm_data)  # Cache for next time
        return warm_data[:limit]
    
    # Step 3: Real-time build (100ms)
    if fresh_data := build_from_trades(symbol, timeframe):
        mongodb.insert(fresh_data)  # Store for warm cache
        redis.set(key, fresh_data)  # Store for hot cache
        return fresh_data[:limit]
    
    # Step 4: API fallback (500ms) - RARELY used
    if gap_data := api_fetch(symbol, timeframe):
        mongodb.insert(gap_data)
        redis.set(key, gap_data)
        return gap_data[:limit]
```

### **Performance Targets**:
| Data Source | Avg Response | Cache Hit Rate | API Requests |
|-------------|-------------|----------------|-------------|
| **Redis (Hot)** | <10ms | 80% | 0 |
| **MongoDB (Warm)** | <50ms | 15% | 0 |  
| **Real-time** | <100ms | 4% | 0 |
| **API (Cold)** | <500ms | <1% | Minimal |

## 🎯 **BOOTSTRAP EXECUTION PLAN**

### **Phase 1: Infrastructure** (2 días)
- [ ] Redis cache manager implementation
- [ ] Smart cache strategy logic
- [ ] MongoDB indexing optimization
- [ ] Performance monitoring setup

### **Phase 2: Bootstrap Service** (2 días)  
- [ ] Historical data fetcher
- [ ] Batch processing with rate limits
- [ ] Gap detection algorithms
- [ ] Data validation systems

### **Phase 3: Integration** (1 día)
- [ ] Enhanced candle endpoints
- [ ] Admin management endpoints
- [ ] Cache warming procedures
- [ ] Error handling & fallbacks

### **Phase 4: Deployment** (1 día)
- [ ] Bootstrap execution for all symbols
- [ ] Cache preloading
- [ ] Performance validation
- [ ] Monitoring setup

## 📊 **SUCCESS METRICS**

### **Performance**:
- [ ] **99% cache hit rate** (Redis + MongoDB)
- [ ] **<50ms avg response** for candle requests
- [ ] **<1 API request/day** per symbol (post-bootstrap)
- [ ] **Zero data gaps** in active timeframes

### **Reliability**:
- [ ] **99.9% data availability** 
- [ ] **Auto-recovery** from outages
- [ ] **Real-time freshness** (<1min delay)
- [ ] **Scalable** for new symbols/timeframes

### **Resource Efficiency**:
- [ ] **95% reduction** in API usage vs MCP
- [ ] **50% faster** response times
- [ ] **10x lower** infrastructure costs
- [ ] **Zero manual** data management

## 🔄 **MIGRATION STRATEGY**

### **Backward Compatibility**:
- ✅ **Existing endpoints unchanged** - Same URLs, enhanced performance
- ✅ **Gradual rollout** - Symbol by symbol bootstrap
- ✅ **Fallback safety** - API calls if cache fails
- ✅ **Monitoring** - Performance comparison vs current

### **Risk Mitigation**:
- **Rate limit compliance** - Respect exchange limits
- **Error handling** - Graceful degradation
- **Data validation** - Integrity checks
- **Rollback plan** - Can revert to current system

---

**Status**: ✅ **DOCUMENTED** - Ready for implementation  
**Dependencies**: Redis setup, MongoDB optimization  
**Timeline**: 6 days total implementation  
**Impact**: **FOUNDATIONAL** - Enables all subsequent indicator development 