# 🏛️ ADR-002: Arquitectura de Recopilación de Datos

## Estado
Aceptado

## Contexto
Necesitamos diseñar cómo recopilar datos de múltiples exchanges (Bybit, Binance) de forma confiable y escalable, manejando disconnections, rate limits y garantizando 24/7 uptime.

## Decisión
Implementaremos:
1. **Collector Pattern**: Una clase abstracta `BaseCollector` con implementaciones específicas por exchange
2. **Circuit Breaker**: Para manejar fallos temporales sin cascada
3. **Supervisor Pattern**: Proceso supervisor que monitorea y reinicia collectors
4. **Buffer Strategy**: Redis como buffer intermedio antes de MongoDB
5. **Graceful Degradation**: Si un exchange falla, los otros continúan

## Arquitectura
```
WebSocket Streams
    ↓
Collectors (Bybit/Binance)
    ↓
Redis Buffer (Pub/Sub)
    ↓
Processing Pipeline
    ↓
MongoDB (Persistence)
```

## Consecuencias

### Positivas
- Alta disponibilidad con múltiples fuentes de datos
- Resiliencia ante fallos individuales
- Escalabilidad horizontal (más collectors)
- Backpressure handling con Redis

### Negativas
- Complejidad adicional en coordinación
- Posible duplicación de datos entre exchanges
- Mayor uso de memoria por buffers

### Mitigaciones
- Deduplicación por timestamp + exchange
- Monitoreo detallado de cada collector
- Límites configurables en buffers

## Fecha
2025-06-13
