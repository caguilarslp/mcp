# MongoDB Schemas y Arquitectura de Datos - WADM

## 📊 Visión General

WADM utiliza MongoDB como base de datos principal para almacenar datos de mercado time-series con schemas optimizados, índices especializados y TTL automático para gestión eficiente del ciclo de vida de datos.

## 🏗️ Arquitectura de Datos

### Patrón Repository
```
Domain Entities (src/core/entities.py)
         ↓
API Models (src/infrastructure/database/models.py)
         ↓
Repositories (src/infrastructure/database/repositories.py)
         ↓
MongoDB Collections (schemas.py)
```

### Data Manager
- **Coordinación central** de todos los repositorios
- **Queries complejas** que abarcan múltiples colecciones
- **Operaciones batch** optimizadas
- **Mantenimiento automático** de base de datos

## 📋 Esquemas de Colecciones

### 1. **Trades Collection** 
```javascript
{
  trade_id: "string",        // Unique per exchange
  symbol: "BTCUSDT",         // Trading pair
  exchange: "binance",       // Exchange name
  price: 50000.0,           // Trade price (Decimal→float)
  quantity: 0.1,            // Trade quantity
  side: "buy",              // buy/sell
  timestamp: ISODate,       // Trade time
  is_buyer_maker: true      // Maker/taker flag
}
```

**Índices:**
- `symbol_exchange_timestamp` (compuesto)
- `timestamp_desc` (tiempo descendente)
- `trade_id_exchange` (único)
- TTL: **1 hora**

### 2. **OrderBook Collection**
```javascript
{
  symbol: "BTCUSDT",
  exchange: "binance", 
  timestamp: ISODate,
  sequence: 12345,          // Optional ordering
  bids: [
    {price: 49995.0, quantity: 0.5},
    {price: 49990.0, quantity: 1.2}
  ],
  asks: [
    {price: 50005.0, quantity: 0.8},
    {price: 50010.0, quantity: 2.1}
  ]
}
```

**Índices:**
- `symbol_exchange_timestamp`
- `symbol_exchange_sequence`
- TTL: **1 hora**

### 3. **Volume Profiles Collection**
```javascript
{
  symbol: "BTCUSDT",
  exchange: "binance",
  timeframe: "1h",          // 1m, 5m, 1h, 4h, 1d
  start_time: ISODate,
  end_time: ISODate,
  poc_price: 50030.0,       // Point of Control
  vah_price: 50050.0,       // Value Area High
  val_price: 50010.0,       // Value Area Low
  total_volume: 1250.5,
  value_area_volume: 875.35,
  price_levels: {
    "50000.0": 125.5,       // Price → Volume mapping
    "50010.0": 89.3,
    "50020.0": 156.7
  }
}
```

**Índices:**
- `symbol_timeframe_time`
- `symbol_poc_time`
- `volume_profile_uniqueness` (único)
- TTL: **30 días**

### 4. **Order Flow Collection**
```javascript
{
  symbol: "BTCUSDT",
  exchange: "binance",
  timestamp: ISODate,
  timeframe: "5m",          // Analysis window
  delta: 15.5,              // Buy - Sell volume
  cumulative_delta: 125.3,  // Running total
  buy_volume: 285.8,
  sell_volume: 270.3,
  total_volume: 556.1,
  imbalance_ratio: 1.06,    // Buy/Sell ratio
  large_trades_count: 8,    // Large size trades
  absorption_events: 2      // Absorption detections
}
```

**Índices:**
- `symbol_timeframe_timestamp`
- `symbol_delta_timestamp`
- `symbol_cumulative_delta_timestamp`
- TTL: **30 días**

### 5. **Liquidity Levels Collection**
```javascript
{
  symbol: "BTCUSDT",
  exchange: "binance",
  price: 50000.0,
  liquidity_type: "support", // support, resistance, poc, vah, val
  strength: 85.5,           // Score 0-100
  volume: 1250.8,          // Volume at level
  touches: 5,              // Price interactions
  last_touch: ISODate,
  created_at: ISODate
}
```

**Índices:**
- `symbol_type_strength`
- `symbol_strength_last_touch`
- TTL: **30 días**

## ⚡ Optimizaciones de Performance

### TTL Automático por Tipo de Dato
```python
TTL_RAW_DATA = 3600         # 1 hora (trades, orderbook)
TTL_AGGREGATED_1M = 86400   # 24 horas (klines 1m)
TTL_AGGREGATED_1H = 604800  # 7 días (klines 1h)
TTL_INDICATORS = 2592000    # 30 días (volume profile, order flow)
```

### Índices Compuestos Estratégicos
- **Query patterns principales**: `symbol + exchange + timestamp`
- **Análisis especializados**: `symbol + price`, `symbol + strength`
- **Unicidad**: Prevenir duplicados con constraints únicos
- **Ordenamiento**: Índices descendentes para datos recientes

### Conversión Decimal ↔ Float
```python
# MongoDB storage (float)
def convert_decimals_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    # ... recursive conversion

# Application logic (Decimal)
def convert_floats_to_decimal(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    # ... recursive conversion
```

## 🔧 Patrón Repository

### Base Repository
```python
class BaseRepository(Generic[T]):
    async def create(self, document: T) -> str
    async def create_many(self, documents: List[T]) -> List[str]
    async def find_one(self, filter_dict: Dict) -> Optional[T]
    async def find_many(self, filter_dict: Dict, limit: int = 100) -> List[T]
    async def update_one(self, filter_dict: Dict, update_dict: Dict) -> bool
    async def delete_many(self, filter_dict: Dict) -> int
    async def aggregate(self, pipeline: List[Dict]) -> List[Dict]
```

### Repositorios Especializados
```python
class TradeRepository(SymbolExchangeRepository[Trade]):
    async def find_by_price_range(self, symbol, min_price, max_price) -> List[Trade]
    async def find_large_trades(self, symbol, min_quantity) -> List[Trade]
    async def get_volume_by_side(self, symbol, start_time, end_time) -> Dict

class VolumeProfileRepository(SymbolExchangeRepository[VolumeProfile]):
    async def get_latest_profile(self, symbol, timeframe) -> Optional[VolumeProfile]
    async def get_poc_history(self, symbol, days_back) -> List[Dict]

class OrderFlowRepository(SymbolExchangeRepository[OrderFlow]):
    async def get_delta_analysis(self, symbol, hours_back) -> Dict
    async def get_cumulative_delta_trend(self, symbol) -> List[Dict]
```

## 📈 Data Manager - Coordinación Central

### Operaciones Complejas
```python
class DataManager:
    async def get_market_overview(self, symbol: Symbol, hours_back: int) -> Dict
    async def get_trading_session_analysis(self, symbol: Symbol, session_start: datetime, session_end: datetime) -> Dict
    async def find_liquidity_zones(self, symbol: Symbol, current_price: Decimal, price_range_percent: float) -> Dict
    async def get_symbols_activity_summary(self, hours_back: int) -> List[Dict]
```

### Mantenimiento Automático
```python
async def cleanup_old_data(self, days_to_keep: int) -> Dict[str, int]
async def get_database_stats(self) -> Dict[str, Any]
async def optimize_database(self) -> Dict[str, Any]
```

## 🚀 Flujo de Datos en Producción

### 1. **Recolección** (WebSocket Collectors)
```python
collector.on_trade(trade_data) → Trade entity
```

### 2. **Persistencia** (Repositorios)
```python
await data_manager.trades.create(trade)
```

### 3. **Procesamiento** (Services - próximas tareas)
```python
await volume_profile_service.update(trade)
await order_flow_service.analyze(trade)
```

### 4. **Consulta** (API/MCP)
```python
trades = await data_manager.trades.find_recent(minutes=5)
volume_profile = await data_manager.volume_profiles.get_latest_profile(symbol)
```

## 🎯 Métricas de Performance Objetivo

- **Inserción**: 10,000 trades/segundo (batch)
- **Query tiempo**: <10ms para datos recientes
- **Storage efficiency**: TTL automático, sin intervención manual
- **Precision**: Decimal para cálculos, float para storage
- **Concurrent**: 10-50 conexiones simultáneas

## 📝 Próximos Pasos

Con los schemas implementados, las **próximas tareas** (TASK-004 y TASK-005) conectarán:
1. **WebSocket Collectors** → **Repositorios** (pipeline de datos)
2. **Procesamiento en tiempo real** de Volume Profile y Order Flow
3. **Exposición vía MCP** para integración con wAIckoff

El sistema de base de datos está **100% listo** para recibir datos en tiempo real.
