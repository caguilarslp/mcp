# WADM Timeframes Configuration Proposal

## 📊 PROBLEMA ACTUAL

Solo tenemos 3 intervalos hardcodeados:
- Fast: 60s (1m)
- Medium: 300s (5m) 
- Slow: 900s (15m)

**FALTA**: Soporte para todos los timeframes de trading profesional.

## 🎯 SOLUCIÓN PROPUESTA

### 1. Timeframes Estándar Completos

```python
STANDARD_TIMEFRAMES = {
    # Scalping
    "1s": 1,
    "5s": 5,
    "15s": 15,
    "30s": 30,
    
    # Intraday
    "1m": 60,
    "3m": 180,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    
    # Day Trading
    "1h": 3600,
    "2h": 7200,
    "4h": 14400,
    "6h": 21600,
    "8h": 28800,
    "12h": 43200,
    
    # Swing/Position
    "1d": 86400,
    "3d": 259200,
    "1w": 604800,
    "1M": 2592000  # 30 days approx
}
```

### 2. Configuración por Indicador

```yaml
# config/indicators.yaml
indicators:
  volume_profile:
    timeframes: ["1m", "5m", "15m", "1h", "4h"]
    priority: high
    
  order_flow:
    timeframes: ["1s", "5s", "1m", "5m"]
    priority: critical
    
  footprint:
    timeframes: ["1m", "5m", "15m"]
    priority: medium
    
  market_profile:
    timeframes: ["30m", "1h", "4h", "1d"]
    priority: low
    
  vwap:
    timeframes: ["5m", "15m", "1h", "1d"]
    anchors: ["session", "daily", "weekly", "monthly"]
    priority: high
    
  wyckoff:
    timeframes: ["15m", "1h", "4h", "1d"]
    priority: medium
    
  smc:
    timeframes: ["5m", "15m", "1h", "4h"]
    priority: high
```

### 3. Sistema de Prioridades

Para optimizar recursos:

```python
class IndicatorPriority:
    CRITICAL = 1   # Calcula siempre
    HIGH = 2       # Calcula si hay recursos
    MEDIUM = 3     # Calcula con menor frecuencia
    LOW = 4        # Calcula solo si se solicita
```

### 4. Storage Strategy por Timeframe

```python
RETENTION_POLICY = {
    "1s": 3600,      # 1 hora
    "5s": 7200,      # 2 horas
    "15s": 14400,    # 4 horas
    "30s": 21600,    # 6 horas
    "1m": 86400,     # 1 día
    "5m": 259200,    # 3 días
    "15m": 604800,   # 1 semana
    "30m": 1209600,  # 2 semanas
    "1h": 2592000,   # 1 mes
    "4h": 5184000,   # 2 meses
    "1d": 31536000,  # 1 año
    "1w": 63072000   # 2 años
}
```

### 5. Implementación Propuesta

```python
class TimeframeManager:
    def __init__(self):
        self.timeframes = STANDARD_TIMEFRAMES
        self.last_calc = defaultdict(lambda: defaultdict(datetime))
        
    def should_calculate(self, indicator: str, symbol: str, 
                        exchange: str, timeframe: str) -> bool:
        """Check if indicator should be calculated for this timeframe"""
        key = f"{exchange}:{symbol}:{indicator}:{timeframe}"
        now = datetime.now(timezone.utc)
        last = self.last_calc[key]
        
        interval = self.timeframes.get(timeframe, 60)
        return (now - last).total_seconds() >= interval
        
    def get_active_timeframes(self, indicator: str) -> List[str]:
        """Get timeframes configured for this indicator"""
        config = self.indicator_config.get(indicator, {})
        return config.get("timeframes", ["1m", "5m", "15m"])
```

## 🚀 BENEFICIOS

1. **Flexibilidad Total**: Cualquier timeframe estándar soportado
2. **Optimización**: Solo calcula lo necesario según prioridad
3. **Escalabilidad**: Retención inteligente por timeframe
4. **Profesional**: Alineado con plataformas de trading reales

## ⚠️ CONSIDERACIONES

1. **Carga de CPU**: Más timeframes = más cálculos
2. **Storage**: Necesitamos ~10x más espacio
3. **Caché**: Redis crítico para performance
4. **Backfill**: Estrategia para datos históricos

## 📋 IMPLEMENTACIÓN GRADUAL

### Fase 1: Timeframes básicos (1m, 5m, 15m, 1h)
### Fase 2: Agregar 4h, 1d
### Fase 3: Scalping (1s, 5s)
### Fase 4: Todos los demás

---

**NOTA**: Esta es una propuesta. Implementar después de validación.
