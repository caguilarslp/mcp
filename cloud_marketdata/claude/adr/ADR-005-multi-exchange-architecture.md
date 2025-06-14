# ADR-005: Arquitectura Multi-Exchange con Binance como Referencia

**Estado**: Propuesto  
**Fecha**: 2025-06-14  
**Decisores**: Equipo de desarrollo  

## Contexto

El sistema actualmente recopila datos solo de Bybit. Sin embargo, Binance tiene mayor liquidez y es considerado el exchange de referencia para determinar el precio "real" del mercado. Necesitamos integrar Binance manteniendo Bybit como exchange principal para trading.

### Consideraciones

1. **Binance como fuente de verdad**: Mayor volumen y liquidez
2. **Bybit para ejecución**: Donde se realizan las operaciones reales
3. **Sincronización**: Necesidad de correlacionar datos de ambos exchanges
4. **Diferencias de formato**: Cada exchange tiene su propio formato de mensajes
5. **Latencia**: Minimizar retrasos en el procesamiento

## Decisión

Implementar una arquitectura multi-exchange con:

1. **Strategy Pattern** para collectors
2. **Adaptadores** por exchange para normalización
3. **Binance** como referencia de precios
4. **Correlación** temporal de trades

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────┐
│                Collector Manager                 │
├─────────────────┬───────────────────────────────┤
│  Bybit Strategy │      Binance Strategy         │
├─────────────────┼───────────────────────────────┤
│ Trades │ Order  │  Trades │ Order │ Ticker      │
│        │ Book   │         │ Book  │             │
└────────┴────────┴─────────┴───────┴─────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────┴────────┐
              │ Correlation    │
              │   Engine       │
              └───────────────┘
```

### Endpoints WebSocket Binance

1. **Trades Stream**
   - URL: `wss://stream.binance.com:9443/ws/{symbol}@trade`
   - Formato: 
   ```json
   {
     "e": "trade",
     "E": 123456789,
     "s": "BTCUSDT",
     "t": 12345,
     "p": "0.001",
     "q": "100",
     "b": 88,
     "a": 50,
     "T": 123456785,
     "m": true,
     "M": true
   }
   ```

2. **Order Book (Depth)**
   - URL: `wss://stream.binance.com:9443/ws/{symbol}@depth{levels}`
   - Niveles: 5, 10, 20
   - Formato parcial para actualizaciones incrementales

3. **Ticker 24hr**
   - URL: `wss://stream.binance.com:9443/ws/{symbol}@ticker`
   - Información agregada del mercado

### Sincronización Bybit-Binance

```python
class ExchangeCorrelator:
    """Correlaciona datos de múltiples exchanges"""
    
    def correlate_trades(self, bybit_trade: Trade, binance_trade: Trade) -> CorrelatedTrade:
        """
        Correlaciona trades por:
        1. Timestamp (ventana de ±100ms)
        2. Volumen similar (±5%)
        3. Dirección (buy/sell)
        """
        
    def calculate_spread(self) -> Decimal:
        """Calcula spread entre exchanges"""
        
    def detect_arbitrage(self) -> ArbitrageOpportunity:
        """Detecta oportunidades de arbitraje"""
```

## Consecuencias

### Positivas

1. **Precio de referencia confiable** de Binance
2. **Detección de anomalías** comparando exchanges
3. **Mejor comprensión del mercado** con múltiples fuentes
4. **Preparado para arbitraje** futuro
5. **Resistente a manipulación** de un solo exchange

### Negativas

1. **Mayor complejidad** en el código
2. **Más ancho de banda** requerido
3. **Sincronización compleja** entre fuentes
4. **Mayor latencia** por procesamiento adicional

### Riesgos Mitigados

1. **Rate Limits**: Implementar backoff exponencial
2. **Desincronización**: Time window tolerance de 100ms
3. **Formato cambiante**: Versionado de adaptadores
4. **Caída de un exchange**: Modo degradado automático

## Implementación Por Fases

### Fase 1: TASK-002B - Planning (1.5h)
- Análisis detallado de APIs
- Diseño de adaptadores
- Plan de testing

### Fase 2: TASK-002C - Binance Trades (2h)
- BinanceTradesCollector
- Adaptador de formato
- Tests de integración

### Fase 3: TASK-002D - OrderBooks (2h)
- OrderBook entity
- Collectors para ambos exchanges
- Optimización de memoria

### Fase 4: TASK-002E - Production (1.5h)
- Circuit breakers avanzados
- Métricas por exchange
- Sistema de alertas

## Alternativas Consideradas

1. **Solo Binance**: Descartado por necesitar Bybit para trading
2. **Agregador tercero**: Más caro y menos control
3. **Un exchange a la vez**: No permite correlación en tiempo real

## Referencias

- [Binance WebSocket Docs](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)
- [Bybit WebSocket v5](https://bybit-exchange.github.io/docs/v5/ws/connect)
