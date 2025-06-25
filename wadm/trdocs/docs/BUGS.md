# Bugs Activos WADM

## B001: [ABIERTO] Indicadores no calculan
- **Detectado**: 2025-06-20
- **Severidad**: CRÍTICA
- **Módulo**: `indicators/volume_profile.py`, `indicators/order_flow.py`
- **Síntomas**: 
  - Trades se recolectan (1400+)
  - Indicadores siempre retornan 0 o None
  - MongoDB queries pueden estar mal
- **Siguiente paso**: Debug time windows y aggregation pipeline

## B002: [ABIERTO] WebSocket reconexión inconsistente  
- **Detectado**: 2025-06-19
- **Severidad**: MEDIA
- **Módulo**: `collectors/base_collector.py`
- **Síntomas**: Algunas reconexiones fallan después de 3 intentos
- **Workaround**: Restart manual del collector

---

## Bugs Resueltos

### B003: [RESUELTO] 2025-06-18 - Duplicación de trades
- **Solución**: Added unique index on (symbol, timestamp, trade_id)
- **Commit**: a3f4b5c

### B004: [RESUELTO] 2025-06-17 - Memory leak en collectors
- **Solución**: Clear message buffer after processing
- **Commit**: b7c8d9e
