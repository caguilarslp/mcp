# ADR-003: Volume Profile Service Implementation

**Status**: ✅ Accepted  
**Date**: 2025-06-17  
**Deciders**: Development Team  
**Technical Story**: TASK-004 Volume Profile Service

## Context

WADM necesita un sistema robusto para calcular Volume Profiles en tiempo real, proporcionando indicadores clave como POC (Point of Control), VAH/VAL (Value Area High/Low) y distribución de volumen por niveles de precio. El sistema debe soportar múltiples timeframes, caching inteligente y precisión institucional.

## Decision Drivers

- **Precisión Financiera**: Cálculos exactos usando Decimal para evitar errores de floating point
- **Performance**: Procesamiento rápido de grandes volúmenes de trades
- **Escalabilidad**: Soporte para múltiples símbolos y exchanges
- **Tiempo Real**: Updates frecuentes con latencia mínima
- **Cache Inteligente**: Optimización de recursos con TTL diferenciado
- **Clean Architecture**: Separación clara de responsabilidades

## Considered Options

### 1. **Volume Profile Calculation Algorithm**

**Option A**: Simple aggregation by price buckets
- ✅ Fácil implementación
- ❌ Menos preciso para análisis institucional
- ❌ No maneja tick sizes dinámicos

**Option B**: Tick-aware aggregation with POC-centered Value Area
- ✅ Precisión institucional
- ✅ Tick size automático por símbolo
- ✅ Expansión simétrica del Value Area
- ❌ Más complejo de implementar

**Option C**: Machine Learning-based volume analysis
- ✅ Potencialmente más insights
- ❌ Demasiado complejo para MVP
- ❌ Requiere training data extenso

**Selected**: **Option B** - Tick-aware aggregation with POC-centered Value Area

### 2. **Caching Strategy**

**Option A**: No caching - Calculate on demand
- ✅ Siempre datos frescos
- ❌ Alta latencia
- ❌ Desperdicio de recursos

**Option B**: Simple Redis cache with fixed TTL
- ✅ Mejor performance
- ❌ No optimizado por tipo de dato
- ❌ Cache invalidation problems

**Option C**: Stratified caching with TTL by use case
- ✅ Optimizado por patrón de uso
- ✅ Real-time: 1min, Calculated: 5min, Historical: 10min
- ✅ Selective invalidation
- ❌ Más complejo de mantener

**Selected**: **Option C** - Stratified caching with TTL by use case

### 3. **API Design Pattern**

**Option A**: Single endpoint with multiple parameters
- ✅ Simplificado
- ❌ Difícil de versionar
- ❌ Parámetros complejos

**Option B**: Multiple specialized endpoints
- ✅ Clear separation of concerns
- ✅ Fácil documentación
- ✅ Mejor para rate limiting
- ❌ Más endpoints que mantener

**Selected**: **Option B** - Multiple specialized endpoints

## Decision

Implementamos un **Volume Profile Service** con las siguientes características:

### Core Components

1. **VolumeProfileCalculator**
   - Algoritmos precisos POC/VAH/VAL con expansión simétrica
   - Tick size automático según símbolo (BTC: 0.01, ETH: 0.01, USDT: 0.001, otros: 0.0001)
   - Value area configurable (60%-95%, default 70%)
   - Decimal precision para cálculos financieros exactos

2. **VolumeProfileService**
   - Multi-timeframe support (5m, 15m, 30m, 1h, 4h, 1d)
   - Real-time profiles con period boundaries correctos
   - Historical analysis con trend identification
   - Integration con TradeRepository para data access

3. **Use Cases (Clean Architecture)**
   - `CalculateVolumeProfileUseCase`: Cálculos específicos con cache
   - `GetRealTimeVolumeProfileUseCase`: Datos en tiempo real
   - `GetHistoricalVolumeProfilesUseCase`: Análisis histórico

4. **Redis Cache Extension**
   - Cache especializado para Volume Profile data
   - TTL estratificado: real-time (1min), calculated (5min), historical (10min)
   - Selective invalidation por símbolo/exchange
   - Streaming de updates en tiempo real

5. **API REST Endpoints** (6 endpoints)
   - `GET /volume-profile/current/{symbol}`: Profile actual
   - `GET /volume-profile/historical/{symbol}`: Histórico resumido
   - `GET /volume-profile/calculate/{symbol}`: Cálculo personalizado
   - `GET /volume-profile/symbols`: Símbolos disponibles
   - `GET /volume-profile/poc-levels/{symbol}`: Niveles POC
   - `GET /volume-profile/statistics/{symbol}`: Estadísticas y métricas

### Technical Decisions

- **Async/await throughout**: Todas las operaciones son asíncronas
- **Type hints estrictos**: Python 3.12 compliance
- **Pydantic v2 validation**: Request/response models
- **Error handling robusto**: Logging estructurado en todos los niveles
- **Repository pattern**: Abstracción de acceso a datos

## Consequences

### Positive

- ✅ **Precisión Institucional**: Cálculos exactos con Decimal precision
- ✅ **Performance Optimizada**: Cache estratificado reduce latencia
- ✅ **Escalabilidad**: Arquitectura soporta múltiples símbolos/exchanges
- ✅ **Maintainability**: Clean Architecture con separación clara
- ✅ **Testing**: 25+ test cases con cobertura completa
- ✅ **Documentation**: Ejemplos prácticos y API reference completa

### Negative

- ❌ **Complejidad**: Más complejo que simple aggregation
- ❌ **Memory Usage**: Cache estratificado usa más memoria
- ❌ **Learning Curve**: Requires understanding de Volume Profile concepts

### Neutral

- 🔄 **Trade-offs aceptables**: Complejidad vs precisión es worth it
- 🔄 **Future-proof**: Arquitectura permite extensiones (ML, multi-exchange)

## Implementation Notes

### Performance Benchmarks

```python
# Expected performance targets
calculation_time_1h = "< 50ms"      # 1 hour of trades
calculation_time_1d = "< 200ms"     # 1 day of trades
cache_hit_ratio = "> 80%"           # Cache effectiveness
api_response_time = "< 100ms"       # P95 response time
memory_usage = "< 512MB"            # Per calculation
```

### Monitoring Metrics

```python
metrics_to_track = [
    "volume_profile_calculations_total",
    "volume_profile_calculation_duration_seconds",
    "volume_profile_cache_hits_total", 
    "volume_profile_cache_misses_total",
    "volume_profile_api_requests_total",
    "volume_profile_errors_total"
]
```

### Future Extensions

1. **Multi-Exchange Aggregation**: Combine volume from múltiples exchanges
2. **Real-time Streaming**: WebSocket updates for live profiles
3. **ML Integration**: Predict POC movement patterns
4. **Advanced Analytics**: Volume profile overlays y comparisons

## Related ADRs

- [ADR-001: FastMCP Adoption](ADR-001-fastmcp-adoption.md)
- [ADR-002: Simplificación VPS](ADR-002-simplificacion-vps.md)

## References

- [Volume Profile Trading Guide](https://www.tradingview.com/wiki/Volume_Profile)
- [Market Profile Methodology](https://www.cmegroup.com/market-data/market-profile.html)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)

---

**Este ADR documenta las decisiones arquitectónicas para el Volume Profile Service, proporcionando análisis institucional de microestructura de mercado.** 📊
