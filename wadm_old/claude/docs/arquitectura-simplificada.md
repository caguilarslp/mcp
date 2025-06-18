# Arquitectura Simplificada de WADM

## 🎯 Visión General

WADM es un sistema minimalista y eficiente para recolección y distribución de datos de mercado, optimizado para deployment en VPS con recursos limitados.

## 🏗️ Arquitectura del Sistema

### Capas Principales

```
┌─────────────────────────────────────────────────────┐
│                 PRESENTACIÓN                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   FastAPI   │  │  MCP Tools  │  │ Health APIs │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                  APLICACIÓN                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Volume    │  │ Order Flow  │  │ WebSocket   │  │
│  │   Profile   │  │  Analyzer   │  │ Collectors  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                INFRAESTRUCTURA                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   MongoDB   │  │    Redis    │  │   WebSocket │  │
│  │   Storage   │  │   Cache     │  │   Clients   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Datos

### 1. Recolección (Data Collection)
```
Bybit WebSocket ──┐
                  ├── Trade Data ──→ MongoDB ──→ Cache (Redis)
Binance WebSocket ─┘
```

### 2. Procesamiento (Data Processing)
```
Raw Trades ──→ Volume Profile Calculator ──→ Aggregated Data
            ──→ Order Flow Analyzer ──────→ Flow Metrics
```

### 3. Distribución (Data Distribution)
```
Processed Data ──→ MCP Tools ──→ Local Clients ──→ waickoff_reports
```

## 🗄️ Modelo de Datos

### Estructura MongoDB
```javascript
// Trades Collection
{
  _id: ObjectId,
  symbol: "BTCUSDT",
  price: Decimal128,
  quantity: Decimal128,
  timestamp: Date,
  trade_type: "BUY|SELL",
  trade_id: String,
  exchange: "bybit|binance"
}

// Volume Profiles Collection
{
  _id: ObjectId,
  symbol: "BTCUSDT",
  timeframe: "1h",
  start_time: Date,
  end_time: Date,
  poc: Decimal128,  // Point of Control
  vah: Decimal128,  // Value Area High
  val: Decimal128,  // Value Area Low
  nodes: [
    {
      price_level: Decimal128,
      volume: Decimal128,
      buy_volume: Decimal128,
      sell_volume: Decimal128,
      trade_count: Number
    }
  ]
}

// Order Flow Collection
{
  _id: ObjectId,
  symbol: "BTCUSDT",
  timeframe: "5m",
  timestamp: Date,
  delta: Decimal128,
  cumulative_delta: Decimal128,
  volume: Decimal128,
  buy_volume: Decimal128,
  sell_volume: Decimal128,
  imbalance_ratio: Number
}
```

## 🐳 Arquitectura Docker

### Servicios
1. **wadm-api**: FastAPI application (Puerto 8920)
2. **wadm-mongodb**: MongoDB 7.0 (Puerto 27017, solo localhost)
3. **wadm-redis**: Redis 7 (Puerto 6379, solo localhost)

### Red y Seguridad
```yaml
networks:
  wadm-network: # Red interna para comunicación entre servicios

ports:
  - "8920:8920"           # API pública
  - "127.0.0.1:27017:27017"  # MongoDB solo localhost
  - "127.0.0.1:6379:6379"    # Redis solo localhost
```

## 🔌 Integraciones Externas

### Exchanges
- **Bybit v5 WebSocket**: Trades en tiempo real
- **Binance WebSocket**: Trades en tiempo real

### Protocolos
- **MCP (Model Context Protocol)**: Distribución de datos a clientes
- **FastMCP**: Framework para herramientas MCP

## 📊 Performance y Limitaciones

### Targets VPS
- **CPU**: 1-2 cores
- **RAM**: 2-4 GB
- **Storage**: 20-50 GB
- **Bandwidth**: Limitado

### Optimizaciones
- **TTL automático**: Datos antiguos se eliminan automáticamente
- **Agregación eficiente**: Datos se procesan en lotes
- **Cache inteligente**: Redis para datos frecuentemente accedidos
- **Compresión**: MessagePack para serialización eficiente

## 🔧 Configuración Simple

### Variables de Entorno Esenciales
```bash
ENVIRONMENT=production
API_KEY=tu_clave_segura
MONGODB_URL=mongodb://user:pass@localhost:27017/wadm
REDIS_URL=redis://localhost:6379/0
BYBIT_API_KEY=opcional
BINANCE_API_KEY=opcional
```

### Dependencias Mínimas
- Python 3.11+
- FastAPI + Uvicorn
- Motor (MongoDB async)
- Redis
- FastMCP

## 🚀 Deployment

### Pasos Simples
1. **Clonar**: `git clone <repo>`
2. **Configurar**: `cp .env.example .env`
3. **Instalar**: `pip install -r requirements.txt`
4. **Ejecutar**: `docker-compose up -d`
5. **Verificar**: `curl http://localhost:8920/health`

### Monitoreo
- **Health Check**: `/health` endpoint
- **Docker Stats**: `docker stats`
- **Logs**: `docker-compose logs -f`

---

**WADM mantiene simplicidad sin sacrificar funcionalidad**
