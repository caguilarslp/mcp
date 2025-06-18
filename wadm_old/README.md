# WADM - wAIckoff Data Manager

## 🎯 Objetivo

Sistema de recolección y distribución de indicadores de mercado (Volume Profile y Order Flow) para alimentar el ecosistema wAIckoff con datos procesados de alta calidad a través de WebSocket collectors y MCP protocol.

## ✅ Estado Actual - v0.1.0

**Progreso: 25% (2/8 tareas completadas)**

### 🎉 Implementado

✅ **TASK-001: Setup Docker + FastAPI + MongoDB**
- Entorno de desarrollo completo con Docker
- Sistema de testing profesional con pytest
- Configuración optimizada para VPS
- Makefile y scripts de automatización

✅ **TASK-002: Sistema de WebSocket Collectors**
- BaseWebSocketCollector abstracto con auto-reconexión
- BybitCollector para API v5 (trades, orderbook, klines)
- BinanceCollector para Spot y Futures
- CollectorManager para gestión unificada
- Health monitoring y estadísticas en tiempo real
- Tests unitarios completos
- Ejemplos de uso y configuraciones

### 🚧 Próximas Tareas

📅 **TASK-003:** Schemas MongoDB y modelos de datos (3h)
📅 **TASK-004:** Volume Profile service (4h) 
📅 **TASK-005:** Order Flow analyzer (4h)
📅 **TASK-006:** FastMCP Tools Implementation (6h)
📅 **TASK-007:** Sistema de alertas (3h)
📅 **TASK-008:** Historical data backfill (2h)

## 🚀 Quick Start

### 1. Verificación del Setup

```bash
# Verificar que todo funcione
python verify_setup.py
```

### 2. Ejemplo Básico

```bash
# Probar collector individual
python examples/basic_usage.py single

# Probar múltiples exchanges
python examples/basic_usage.py basic

# Gestión dinámica de símbolos
python examples/basic_usage.py symbols
```

### 3. Desarrollo

```bash
# Tests
pytest tests/ -v

# Con Docker
docker-compose up -d
docker-compose logs -f

# Tests específicos de collectors
pytest tests/infrastructure/collectors/ -v
```

## 📚 Arquitectura

### Estructura del Proyecto

```
wadm/
├── src/
│   ├── core/                    # Entidades y tipos
│   │   ├── entities.py         # Trade, OrderBook, Kline, etc.
│   │   └── types.py            # Symbol, Exchange, Side, etc.
│   ├── infrastructure/         # Adaptadores externos
│   │   └── collectors/         # WebSocket collectors
│   │       ├── base.py         # Collector abstracto
│   │       ├── bybit_collector.py
│   │       ├── binance_collector.py
│   │       └── collector_manager.py
│   ├── application/            # Casos de uso (pendiente)
│   └── presentation/           # API y MCP (pendiente)
├── tests/                      # Tests unitarios
├── examples/                   # Ejemplos de uso
└── claude/                     # Sistema de trazabilidad
```

### Flujo de Datos

```
Exchange WebSocket → Collector → Manager → Callbacks → Processing
     ↓
  [Bybit/Binance] → [Parser] → [Validation] → [Trade/OrderBook/Kline]
     ↓
  MongoDB Storage (próximo) → MCP Tools (próximo) → Client Apps
```

## 🔧 Collectors Implementados

### BybitCollector
- **API:** Bybit v5 WebSocket
- **Streams:** publicTrade, orderbook.200, kline.*
- **Features:** Auto-reconexión, ping/pong, manejo de errores
- **Símbolos:** Ilimitados por conexión

### BinanceCollector  
- **API:** Binance Spot/Futures WebSocket
- **Streams:** @trade, @depth20@100ms, @kline_*
- **Features:** Suscripción dinámica, streams múltiples
- **Símbolos:** 100+ por conexión

### CollectorManager
- **Features:** Gestión unificada, health monitoring
- **Auto-restart:** Reconexión automática en errores
- **Statistics:** Métricas agregadas en tiempo real
- **Multi-exchange:** Soporte simultáneo de exchanges

## 📊 Entidades Core

```python
# Entidades principales implementadas
Trade          # Operaciones individuales
OrderBook      # Libros de órdenes con spreads
Kline          # Velas OHLCV con volúmenes
VolumeProfile  # Perfil de volumen (pendiente implementar)
OrderFlow      # Flujo de órdenes (pendiente implementar)
```

## 💡 Ejemplos de Uso

### Collector Individual

```python
from src.infrastructure.collectors import BybitCollector
from src.core.types import Symbol

async def handle_trade(trade):
    print(f"Trade: {trade.symbol} {trade.side} {trade.quantity} @ {trade.price}")

collector = BybitCollector(
    symbols=[Symbol("BTCUSDT")],
    on_trade=handle_trade
)

await collector.start()
```

### Múltiples Exchanges

```python
from src.infrastructure.collectors import CollectorManager
from src.core.types import Symbol, ExchangeName

async def process_data(data):
    print(f"Data: {data}")

async with CollectorManager(
    on_trade=process_data,
    on_orderbook=process_data,
    on_kline=process_data,
) as manager:
    
    await manager.add_exchange(ExchangeName.BYBIT, [Symbol("BTCUSDT")])
    await manager.add_exchange(ExchangeName.BINANCE, [Symbol("ETHUSDT")])
    await manager.start_all()
    
    # Procesamiento en tiempo real...
```

## 🧪 Testing

```bash
# Todos los tests
pytest tests/ -v

# Solo collectors
pytest tests/infrastructure/collectors/ -v

# Con cobertura
pytest tests/ --cov=src --cov-report=html

# Tests específicos
pytest tests/infrastructure/collectors/test_bybit_collector.py -v
```

## 📋 Configuraciones

### Desarrollo
```python
from examples.config_example import get_config

config = get_config("development")  # Solo BTCUSDT en Bybit
```

### Producción
```python
config = get_config("production")   # Múltiples símbolos, exchanges
```

### Testing
```python
config = get_config("testing")      # Configuración minimal
```

## 🔍 Monitoring y Estadísticas

```python
# Estadísticas del collector
stats = collector.get_stats()
print(f"Mensajes recibidos: {stats['messages_received']}")
print(f"Trades procesados: {stats['trades_received']}")

# Estadísticas del manager
all_stats = manager.get_all_stats()
print(f"Collectors activos: {all_stats['manager_stats']['running_collectors']}")
```

## 🎯 Próximos Desarrollos

1. **MongoDB Schemas:** Modelos optimizados para time-series data
2. **Volume Profile:** Cálculo de POC, VAH, VAL en tiempo real  
3. **Order Flow:** Análisis de delta y absorción
4. **MCP Tools:** Herramientas para distribución de datos
5. **Alertas:** Sistema de notificaciones basado en condiciones
6. **Historical:** Backfill de datos históricos

## 📝 Documentación

- **Trazabilidad:** `claude/master-log.md` - Historial completo
- **Tareas:** `claude/tasks/task-tracker.md` - Estado de desarrollo
- **Arquitectura:** `claude/adr/` - Decisiones técnicas
- **API:** `claude/docs/api-reference.md` - Referencia futura

## 🛠️ Contribución

1. Revisar `claude/master-log.md` para contexto
2. Consultar `claude/tasks/task-tracker.md` para tareas disponibles
3. Seguir convenciones: commits `[TASK-XXX] Descripción`
4. Ejecutar tests antes de commits
5. Actualizar documentación relevante

---

**WADM** - Sistema profesional de recolección de datos de mercado para análisis técnico avanzado con Wyckoff y Volume Profile.
