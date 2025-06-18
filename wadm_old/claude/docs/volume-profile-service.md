# Volume Profile Service - Technical Documentation

## 🎯 Overview

El Volume Profile Service es el núcleo del análisis de volumen en WADM, proporcionando cálculos precisos de POC (Point of Control), VAH/VAL (Value Area High/Low) y distribución de volumen por niveles de precio.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Volume Profile Service                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌─────────────────────────────┐   │
│  │ VolumeProfile    │    │   VolumeProfileService      │   │
│  │ Calculator       │◄───┤   • Multi-timeframe        │   │
│  │ • POC/VAH/VAL    │    │   • Real-time updates       │   │
│  │ • Tick size      │    │   • Historical analysis     │   │
│  │ • Value area     │    │   • Cache integration       │   │
│  └──────────────────┘    └─────────────────────────────┘   │
│           ▲                            ▲                   │
│           │                            │                   │
│  ┌────────┴────────┐          ┌───────┴───────┐           │
│  │   Use Cases     │          │  Redis Cache  │           │
│  │ • Calculate     │          │ • TTL by type │           │
│  │ • Real-time     │          │ • Invalidation│           │
│  │ • Historical    │          │ • Streaming   │           │
│  └─────────────────┘          └───────────────┘           │
│           ▲                                                │
│           │                                                │
│  ┌────────┴────────┐                                      │
│  │   API Routes    │                                      │
│  │ • 6 endpoints   │                                      │
│  │ • Validation    │                                      │
│  │ • Error handling│                                      │
│  └─────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
           ▲
           │
┌──────────┴──────────┐
│   Trade Repository  │
│ • Time range queries│
│ • Symbol filtering  │
│ • Exchange support  │
└─────────────────────┘
```

## 🧮 Core Algorithms

### POC (Point of Control) Calculation

```python
def calculate_poc(price_levels: Dict[Decimal, Decimal]) -> Optional[Decimal]:
    """
    Encuentra el precio con mayor volumen ejecutado.
    
    Algorithm:
    1. Itera sobre todos los price levels
    2. Identifica el nivel con mayor volume
    3. En caso de empate, toma el primer precio encontrado
    """
    if not price_levels:
        return None
    return max(price_levels.keys(), key=lambda p: price_levels[p])
```

### Value Area (VAH/VAL) Calculation

```python
def calculate_value_area(
    price_levels: Dict[Decimal, Decimal], 
    value_area_percentage: Decimal = Decimal("0.70")
) -> Tuple[Optional[Decimal], Optional[Decimal], Decimal]:
    """
    Calcula Value Area High y Low usando expansión simétrica.
    
    Algorithm:
    1. Identifica POC como punto central
    2. Calcula volumen objetivo (70% del total por defecto)
    3. Expande simétricamente desde POC:
       - Compara volumen disponible arriba vs abajo
       - Expande hacia el lado con mayor volumen
       - Continúa hasta alcanzar volumen objetivo
    4. Retorna VAH (límite superior) y VAL (límite inferior)
    """
```

**Características clave:**
- **Expansión simétrica**: Prioriza lado con mayor volumen
- **Centrado en POC**: Siempre incluye el Point of Control
- **Configurable**: Value area de 60% a 95%
- **Preciso**: Maneja casos edge como volumen insuficiente

### Tick Size Management

```python
def _get_tick_size(symbol: Symbol) -> Decimal:
    """
    Determina tick size apropiado según símbolo.
    
    Rules:
    - BTC pairs: 0.01 (cent precision)
    - ETH pairs: 0.01 (cent precision)  
    - USDT/USDC pairs: 0.001 (tenth cent precision)
    - Other pairs: 0.0001 (high precision)
    """
```

## 📊 Data Structures

### VolumeProfile Entity

```python
@dataclass
class VolumeProfile:
    symbol: Symbol                    # Trading pair
    exchange: Exchange               # Exchange name
    start_time: datetime            # Period start
    end_time: datetime             # Period end
    price_levels: Dict[str, Decimal]  # Price -> Volume mapping
    poc_price: Decimal              # Point of Control
    vah_price: Decimal             # Value Area High
    val_price: Decimal             # Value Area Low
    total_volume: Decimal          # Total volume in period
    value_area_volume: Decimal     # Volume in value area
```

### Volume Level (API Response)

```python
@dataclass  
class VolumeLevel:
    price: float        # Price level
    volume: float       # Volume at price
    percentage: float   # % of total volume
```

## ⏱️ Timeframe Support

| Timeframe | Minutes | Use Case | Cache TTL |
|-----------|---------|----------|-----------|
| 5m | 5 | Scalping, micro-structure | 30s |
| 15m | 15 | Intraday analysis | 1min |
| 30m | 30 | Session analysis | 2min |
| 1h | 60 | Standard analysis | 5min |
| 4h | 240 | Swing trading | 15min |
| 1d | 1440 | Position analysis | 1hour |

### Real-time Period Boundaries

```python
# 1 hour: Start at hour boundary
start_time = now.replace(minute=0, second=0, microsecond=0)

# 4 hours: Start at 4-hour boundary (0, 4, 8, 12, 16, 20)
hour_group = (now.hour // 4) * 4
start_time = now.replace(hour=hour_group, minute=0, second=0, microsecond=0)

# 1 day: Start at day boundary
start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
```

## 🚀 Performance Optimizations

### Cache Strategy

```python
# Cache TTL por tipo de operación
CACHE_TTL = {
    "real_time": 60,      # 1 minuto - datos frescos
    "calculated": 300,    # 5 minutos - cálculos específicos  
    "historical": 600,    # 10 minutos - datos históricos
    "statistics": 60,     # 1 minuto - métricas
    "poc_levels": 600     # 10 minutos - niveles POC
}
```

### Database Optimization

```python
# Índices optimizados para queries de Volume Profile
indexes = [
    ("symbol", "exchange", "timestamp"),  # Time range queries
    ("symbol", "timestamp"),              # Single symbol queries
    ("timestamp",),                       # Time-based cleanup
]

# TTL automático para limpieza
ttl_seconds = {
    "trades": 3600,           # 1 hora raw trades
    "volume_profiles": 2592000  # 30 días profiles calculados
}
```

### Memory Management

- **Lazy loading**: Solo calcula cuando se solicita
- **Batch processing**: Agrupa múltiples requests
- **Price level limiting**: Máximo 1000 levels por profile
- **Decimal precision**: Evita float precision errors

## 🔧 Configuration

### Environment Variables

```bash
# Volume Profile Service
VP_DEFAULT_TIMEFRAME=1h
VP_DEFAULT_VALUE_AREA=70.0
VP_MAX_PERIODS=168
VP_MAX_PRICE_LEVELS=1000

# Cache Configuration  
VP_CACHE_TTL_REALTIME=60
VP_CACHE_TTL_CALCULATED=300
VP_CACHE_TTL_HISTORICAL=600

# Performance
VP_CALCULATION_TIMEOUT=30
VP_BATCH_SIZE=100
VP_MEMORY_LIMIT=512MB
```

### Tick Size Configuration

```python
TICK_SIZES = {
    "BTC": Decimal("0.01"),
    "ETH": Decimal("0.01"), 
    "USDT": Decimal("0.001"),
    "USDC": Decimal("0.001"),
    "DEFAULT": Decimal("0.0001")
}
```

## 🧪 Testing Strategy

### Unit Tests Coverage

```python
# VolumeProfileCalculator Tests
test_calculate_price_levels_empty_trades()
test_calculate_price_levels_aggregation()
test_calculate_poc_multiple_levels()
test_calculate_value_area_symmetric_expansion()
test_round_to_tick_various_sizes()

# VolumeProfileService Tests  
test_get_calculator_creates_new()
test_calculate_volume_profile_success()
test_calculate_real_time_profile_boundaries()
test_get_historical_profiles_multiple_periods()

# Edge Cases
test_empty_trades_returns_none()
test_single_trade_creates_profile()
test_repository_error_handling()
test_cache_integration()
```

### Performance Tests

```python
# Load Testing
test_1000_concurrent_requests()
test_large_volume_calculation_performance()
test_memory_usage_under_load()
test_cache_hit_ratio_optimization()

# Accuracy Tests
test_poc_calculation_accuracy()
test_value_area_precision()
test_volume_aggregation_correctness()
```

## 📈 Trading Applications

### Support/Resistance Identification

```python
# Automatic level detection
support_levels = [profile.val_price for profile in historical_profiles]
resistance_levels = [profile.vah_price for profile in historical_profiles]
key_levels = [profile.poc_price for profile in historical_profiles]
```

### Market Structure Analysis

```python
# Volume concentration analysis
concentration = top_20_percent_volume / total_volume * 100

# Price efficiency measurement  
efficiency = value_area_range / total_price_range * 100

# Trend identification
poc_trend = "ascending" if current_poc > avg_poc else "descending"
```

### Institutional Activity Detection

```python
# High volume concentration indicates institutional interest
if concentration > 40:
    return "high_institutional_activity"

# Tight value area indicates efficient price discovery
if efficiency > 70:
    return "efficient_price_discovery"
```

## 🚀 Future Enhancements

### Planned Features

1. **Multi-Exchange Aggregation**: Combine volume from multiple exchanges
2. **Intraday Profiles**: Sub-minute volume profile analysis
3. **Volume Profile Overlays**: Compare multiple periods
4. **Machine Learning**: Predict POC movement patterns
5. **Real-time Streaming**: WebSocket updates for live profiles

### Optimization Opportunities

1. **Parallel Processing**: Concurrent calculation for multiple symbols
2. **Smart Caching**: Predictive cache warming
3. **Data Compression**: Optimized storage for historical profiles
4. **Query Optimization**: Advanced MongoDB aggregation pipelines

---

**Volume Profile Service provides institutional-grade market microstructure analysis** 📊
