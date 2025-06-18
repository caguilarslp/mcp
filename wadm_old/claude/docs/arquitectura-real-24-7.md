# WADM - Arquitectura Real del Sistema

## 🎯 Propósito Principal
WADM es un **servicio de recolección de datos 24/7** que se ejecuta en un VPS dockerizado y:
1. Se conecta automáticamente a WebSockets de Binance y Bybit al iniciar
2. Recolecta datos de mercado continuamente (trades, orderbook, klines)
3. Procesa y almacena indicadores (Volume Profile, Order Flow)
4. Expone una API REST para que clientes MCP locales consulten datos

## 🏗️ Arquitectura de Despliegue

```
┌─────────────────────── VPS (24/7) ───────────────────────┐
│                                                           │
│  ┌─────────────────┐     ┌──────────────────────────┐   │
│  │   WebSocket     │     │    WADM API (8920)       │   │
│  │   Collectors    │────▶│                          │   │
│  │  - Binance WS   │     │  - Volume Profile API    │   │
│  │  - Bybit WS     │     │  - Order Flow API        │   │
│  └─────────────────┘     │  - Market Structure API  │   │
│           │               └──────────────────────────┘   │
│           ▼                           ▲                   │
│  ┌─────────────────┐                 │                   │
│  │    MongoDB      │                 │                   │
│  │  - Trades       │                 │ REST API          │
│  │  - OrderBooks   │                 │                   │
│  │  - Indicators   │                 │                   │
│  └─────────────────┘                 │                   │
│                                      │                   │
└──────────────────────────────────────┼───────────────────┘
                                       │
                                       │ HTTP/HTTPS
                                       │
┌─────────────── LOCAL ────────────────┼───────────────────┐
│                                      │                   │
│  ┌─────────────────┐        ┌───────▼────────────┐     │
│  │  wAIckoff MCP   │───────▶│   WADM MCP Client  │     │
│  │  (Claude/LLM)   │        │  (FastMCP tools)   │     │
│  └─────────────────┘        └────────────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Funcionamiento

### 1. Inicio del Sistema (VPS)
```bash
docker-compose up -d
```
- ✅ Inicia MongoDB y Redis
- ✅ Inicia API REST (puerto 8920)
- ✅ **Inicia WebSocket collectors automáticamente**
- ✅ Comienza a recolectar datos inmediatamente

### 2. Configuración de Símbolos
```yaml
# config/symbols.yaml o variables de entorno
SYMBOLS:
  BINANCE:
    - BTCUSDT
    - ETHUSDT
    - XRPUSDT
  BYBIT:
    - BTCUSDT
    - ETHUSDT
    - SOLUSDT
```

### 3. Recolección Continua (24/7)
- **Trades**: Cada trade se almacena en MongoDB
- **OrderBook**: Snapshots cada X segundos
- **Klines**: Actualizaciones en tiempo real
- **Procesamiento**: Volume Profile y Order Flow calculados periódicamente

### 4. Consumo desde MCP Local
```python
# MCP local se conecta a la API del VPS
response = requests.get("http://vps-ip:8920/api/v1/order-flow/current/BTCUSDT")
```

## 📋 Componentes Clave

### WebSocket Collectors (TASK-006) - **CRÍTICO**
```python
# src/infrastructure/websocket/collectors.py
class BinanceCollector:
    def __init__(self, symbols: List[str]):
        self.symbols = symbols
        
    async def start(self):
        # Conectar a Binance WS
        # Suscribir a trades, orderbook, klines
        # Almacenar en MongoDB continuamente

class BybitCollector:
    def __init__(self, symbols: List[str]):
        self.symbols = symbols
        
    async def start(self):
        # Conectar a Bybit WS
        # Suscribir a trades, orderbook, klines
        # Almacenar en MongoDB continuamente
```

### Servicio Principal
```python
# src/main.py o src/collectors_service.py
async def start_collectors():
    # Leer configuración de símbolos
    binance_symbols = config.BINANCE_SYMBOLS
    bybit_symbols = config.BYBIT_SYMBOLS
    
    # Iniciar collectors
    binance = BinanceCollector(binance_symbols)
    bybit = BybitCollector(bybit_symbols)
    
    # Ejecutar en paralelo
    await asyncio.gather(
        binance.start(),
        bybit.start()
    )
```

## 🚨 Consideraciones Importantes

### 1. Resiliencia
- **Auto-reconexión**: Si se cae la conexión WS, debe reconectar automáticamente
- **Gestión de errores**: No debe crashear por errores de una conexión
- **Heartbeat**: Mantener conexiones vivas con ping/pong

### 2. Performance
- **Backpressure**: Manejar alta velocidad de datos sin saturar
- **Batch inserts**: Insertar en MongoDB en lotes
- **Índices optimizados**: Para queries rápidas

### 3. Almacenamiento
- **Retención de datos**: 
  - Raw trades: 1 hora
  - Agregados 1m: 24 horas
  - Agregados 1h: 7 días
- **Limpieza automática**: Cron job para eliminar datos viejos

### 4. Monitoreo
- **Health checks**: Endpoint para verificar collectors activos
- **Métricas**: Trades/segundo, latencia, errores
- **Alertas**: Si un collector se detiene

## 🔧 Configuración de Despliegue

### docker-compose.yml
```yaml
services:
  wadm-api:
    image: wadm:latest
    ports:
      - "8920:8920"
    environment:
      - COLLECTORS_ENABLED=true
      - BINANCE_SYMBOLS=BTCUSDT,ETHUSDT,XRPUSDT
      - BYBIT_SYMBOLS=BTCUSDT,ETHUSDT,SOLUSDT
    depends_on:
      - mongodb
      - redis
    restart: always
```

### Variables de Entorno
```env
# Collectors
COLLECTORS_ENABLED=true
COLLECTORS_START_DELAY=5  # segundos antes de iniciar
COLLECTORS_RESTART_ON_ERROR=true

# Símbolos
BINANCE_SYMBOLS=BTCUSDT,ETHUSDT,XRPUSDT
BYBIT_SYMBOLS=BTCUSDT,ETHUSDT,SOLUSDT

# Retención
RETENTION_RAW_TRADES=3600  # 1 hora
RETENTION_AGGREGATES_1M=86400  # 24 horas
RETENTION_AGGREGATES_1H=604800  # 7 días
```

## ✅ Validación del Entendimiento

1. **WADM es un servicio autónomo** que recolecta datos 24/7
2. **NO requiere intervención manual** para iniciar collectors
3. **MCP local solo consulta**, no controla la recolección
4. **Los símbolos se configuran** al desplegar, no dinámicamente
5. **La API REST es solo para lectura**, no para controlar collectors

¿Es correcto este entendimiento?
