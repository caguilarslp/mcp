# 🏗️ Arquitectura Cloud MarketData v0.1.4

## 📋 Estado Actual
- **Versión**: v0.1.4
- **Funcionalidades**: Docker + FastAPI + MCP + WebSocket Collectors
- **Última actualización**: 2025-06-14

## 🎯 Arquitectura Implementada

### 📦 Stack Tecnológico Actual
```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Application                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────┐ │
│  │   MCP Server    │  │     Collector Manager          │ │
│  │                 │  │                                 │ │
│  │ • ping          │  │ • WebSocket Collectors          │ │
│  │ • system_info   │  │ • Bybit Trades                  │ │
│  │ • HTTP endpoints│  │ • Health Monitoring             │ │
│  └─────────────────┘  │ • In-Memory Storage             │ │
│                       └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Health & Monitoring                  │
│  • /health - Sistema completo                           │
│  • /collectors/status - Estado collectors               │
│  • /collectors/trades - Trades en tiempo real           │
│  • /collectors/storage/stats - Estadísticas             │
└─────────────────────────────────────────────────────────┘
```

### 🗂️ Estructura de Código Actual
```
src/
├── core/                    # ✅ Core utilities
│   ├── __init__.py
│   ├── config.py           # Settings con Pydantic
│   └── logger.py           # Structured JSON logging + get_logger()
├── mcp_integration/         # ✅ MCP Server
│   ├── __init__.py
│   ├── server.py           # SimpleMCP server
│   └── tools.py            # ping, system_info tools
├── entities/                # ✅ Data Models
│   ├── __init__.py
│   └── trade.py            # Trade Pydantic model + TradeSide enum
├── collectors/              # ✅ WebSocket System
│   ├── __init__.py
│   ├── base.py             # Abstract WebSocketCollector template
│   ├── manager.py          # CollectorManager para gestión centralizada
│   ├── bybit/              # Bybit implementations
│   │   ├── __init__.py
│   │   └── trades.py       # BybitTradesCollector
│   └── storage/            # Storage handlers
│       ├── __init__.py
│       └── memory.py       # InMemoryStorage para testing
└── main.py                 # FastAPI app + lifespan integration
```

## 🔄 Patrones Arquitectónicos Implementados

### 1. Template Method Pattern - WebSocket Collectors
```python
class WebSocketCollector(ABC):
    # Template method define el flujo
    async def _run(self):
        while not stopped:
            await self._connect_and_run()
    
    # Hook methods que subclases implementan
    @abstractmethod
    async def create_subscription_message(self) -> str
    
    @abstractmethod 
    async def process_message(self, message) -> None
```

### 2. Manager Pattern - Collector Management
```python
class CollectorManager:
    def __init__(self):
        self.collectors: Dict[str, WebSocketCollector] = {}
        self.storage = InMemoryStorage()
    
    async def start(self):
        # Inicializa y gestiona múltiples collectors
```

### 3. Entity Pattern - Data Models
```python
class Trade(BaseModel):
    symbol: str
    side: TradeSide
    price: Decimal
    quantity: Decimal
    timestamp: datetime
    # ... con validators Pydantic v2
```

## 🌐 Flujo de Datos Actual

### 📊 WebSocket Data Flow
```
Bybit WebSocket v5 API
         ↓
wss://stream.bybit.com/v5/public/spot
         ↓
BybitTradesCollector.process_message()
         ↓
Parse → Trade Entity (Pydantic validation)
         ↓
InMemoryStorage.store_trade()
         ↓
Available via FastAPI endpoints
         ↓
/collectors/trades?symbol=BTCUSDT&limit=10
```

### 🔄 Lifecycle Management
```
FastAPI Startup
    ↓
CollectorManager.start()
    ↓
Initialize BybitTradesCollector
    ↓
WebSocket connect → subscribe → active
    ↓
Continuous message processing
    ↓
FastAPI Shutdown → Graceful stop
```

## 📡 API Endpoints Disponibles

### Core System
- `GET /` - System information
- `GET /health` - Health check (incluye collector status)
- `GET /ping` - Connectivity test

### MCP Integration (HTTP Testing)
- `GET /mcp/ping?message=test` - MCP ping tool
- `GET /mcp/info` - MCP system info tool

### Collectors Monitoring
- `GET /collectors/status` - Status de todos los collectors
- `GET /collectors/status/{name}` - Status específico
- `GET /collectors/storage/stats` - Estadísticas de storage
- `GET /collectors/trades?symbol=X&limit=N` - Trades recientes

## 🔧 Configuración y Environment

### Variables de Entorno (.env)
```bash
# Application
ENVIRONMENT=development
LOG_LEVEL=INFO

# API
API_HOST=0.0.0.0
API_PORT=8000

# MongoDB (futuro)
MONGODB_URL=mongodb://mongo:27017/cloud_marketdata

# Redis (futuro)  
REDIS_URL=redis://redis:6379/0

# MCP
MCP_SERVER_NAME=Cloud MarketData
```

### Docker Composition
```yaml
services:
  app:      # FastAPI + Collectors
  mongo:    # MongoDB 7.0
  redis:    # Redis 7.2
  mongo-express: # Dev tool
  redis-commander: # Dev tool
```

## 🔍 Observabilidad Implementada

### 1. Structured Logging (JSON)
```json
{
  "timestamp": "2025-06-14T17:30:00.000Z",
  "level": "INFO", 
  "logger": "collector.bybit_trades",
  "message": "Subscribed to symbols: ['BTCUSDT']",
  "context": {...}
}
```

### 2. Health Checks Multi-Level
```json
{
  "status": "healthy",
  "services": {
    "api": "healthy",
    "mcp_server": "healthy", 
    "collector_manager": "healthy",
    "collectors": "1/1 active"
  }
}
```

### 3. Performance Metrics
```json
{
  "total_trades_received": 1250,
  "trades_per_second": 2.3,
  "uptime_seconds": 543.2,
  "symbols_tracked": ["BTCUSDT"],
  "current_trades_stored": 856
}
```

## 🛡️ Resilience Features

### 1. Reconnection Logic
- Exponential backoff (1s → 30s max)
- Maximum 10 attempts
- Circuit breaker pattern
- Graceful degradation

### 2. Error Handling
- WebSocket connection errors
- JSON parsing errors
- Pydantic validation errors
- Storage errors
- Graceful shutdown

### 3. Resource Management
- Memory limits per symbol (1K trades)
- Total memory limits (10K trades)
- Automatic cleanup of old data
- Thread-safe operations

## 🔮 Arquitectura Futura (Preparada)

### Próximas Expansiones
1. **TASK-002B**: Más collectors (OrderBook, Binance)
2. **TASK-003A/B**: MongoDB persistence + repositories
3. **TASK-004A/B**: Volume Profile calculation engine
4. **TASK-005A/B**: Order Flow analysis engine
5. **TASK-007A/B**: MCP tools completos

### Extensibilidad Preparada
- **Multi-Exchange**: Template pattern permite agregar exchanges fácilmente
- **Multi-DataType**: Base para trades, orderbook, candles, etc.
- **Event-Driven**: Preparado para publish/subscribe patterns
- **Microservices**: Modular design para separación futura

## 📊 Métricas de Performance

### Targets Actuales (TASK-002A)
- ✅ **Conectividad**: WebSocket stable connection
- ✅ **Throughput**: Procesa trades de BTCUSDT sin pérdida
- ✅ **Latency**: < 10ms processing per trade
- ✅ **Memory**: Controlled with limits and cleanup
- ✅ **Resilience**: Auto-reconnection functional

### Targets Futuros
- **Throughput**: 10K trades/segundo por símbolo
- **Storage**: MongoDB con TTL indexes
- **Cache**: Redis para high-speed access
- **Monitoring**: Prometheus + Grafana

## 🔄 Deployment & Operations

### Development
```bash
# Setup
cp .env.example .env
docker-compose --profile dev up --build -d

# Monitoring
docker-compose logs -f app
curl http://localhost:8000/health
curl http://localhost:8000/collectors/trades?limit=5

# Access tools
# MongoDB Express: http://localhost:8082
# Redis Commander: http://localhost:8081
```

### Production Ready Features
- Docker multi-stage builds
- Health checks integrados
- Graceful shutdown handling
- Structured logging para parsing
- Configuration via environment
- Resource limits configurables

---

**Última actualización**: 2025-06-14 - TASK-002A completada con WebSocket collectors base funcional
