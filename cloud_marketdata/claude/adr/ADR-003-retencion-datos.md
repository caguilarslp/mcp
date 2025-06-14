# 🏛️ ADR-003: Estrategia de Retención de Datos

## Estado
Aceptado

## Contexto
En un VPS con storage limitado, necesitamos una estrategia inteligente para mantener datos útiles mientras eliminamos los obsoletos. Los datos raw de trades pueden ser millones por día.

## Decisión
Implementaremos un sistema de 3 niveles:

### Nivel 1: Hot Data (0-1h)
- Datos raw completos en Redis
- Acceso inmediato para cálculos real-time

### Nivel 2: Warm Data (1h-24h)
- Datos agregados por minuto en MongoDB
- Volume Profile y Order Flow pre-calculados
- Datos raw eliminados después de agregación

### Nivel 3: Cold Data (1d-7d)
- Solo métricas agregadas por hora
- Perfiles históricos para análisis de tendencias
- Compresión ZSTD en MongoDB

## Políticas de Retención
```
Raw Trades:      1 hora  (Redis → MongoDB → Delete)
1m Aggregates:   24 horas (MongoDB con índices)
1h Aggregates:   7 días   (MongoDB comprimido)
Daily Profiles:  30 días  (MongoDB archivo)
```

## Consecuencias

### Positivas
- Uso eficiente del storage (~90% reducción)
- Queries rápidas en datos recientes
- Históricos disponibles para backtesting

### Negativas
- Pérdida de granularidad en datos antiguos
- Complejidad en pipeline de agregación
- CPU overhead por compresión

### Mitigaciones
- Agregaciones incrementales para reducir CPU
- Monitoreo continuo de uso de disco
- Exportación opcional a S3 para archivo largo plazo

## Fecha
2025-06-13
