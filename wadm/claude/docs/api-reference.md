# API Reference - WADM

## 🎯 Overview

WADM expone una API REST simple para acceso a datos y una interfaz MCP para integración avanzada.

## 🌐 Endpoints Base

**Base URL**: `http://localhost:8920`  
**Content-Type**: `application/json`  
**Authentication**: API Key via header `X-API-Key`

## 📊 Health & Status

### GET /health
Verifica el estado del servicio.

**Response**:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "environment": "production",
  "timestamp": "2025-06-17T16:30:00Z"
}
```

### GET /health/detailed
Estado detallado incluyendo dependencias.

**Response**:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "dependencies": {
    "mongodb": {
      "status": "healthy",
      "ping": true,
      "version": "7.0.0"
    },
    "redis": {
      "status": "healthy", 
      "ping": true,
      "memory_usage": "25MB"
    }
  },
  "uptime_seconds": 3600
}
```

### GET /ping
Simple ping endpoint.

**Response**:
```json
{
  "ping": "pong"
}
```

## 📈 Market Data

### GET /api/v1/symbols
Lista de símbolos disponibles.

**Response**:
```json
{
  "symbols": [
    "BTCUSDT",
    "ETHUSDT", 
    "SOLUSDT"
  ],
  "count": 3
}
```

### GET /api/v1/volume-profile/{symbol}
Volume Profile para un símbolo.

**Parameters**:
- `symbol` (path): Trading pair (ej: BTCUSDT)
- `timeframe` (query): Timeframe (1h, 4h, 1d) - Default: 1h
- `start_time` (query): ISO timestamp - Default: última hora
- `end_time` (query): ISO timestamp - Default: ahora

**Example**: `/api/v1/volume-profile/BTCUSDT?timeframe=1h`

**Response**:
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "start_time": "2025-06-17T15:00:00Z",
  "end_time": "2025-06-17T16:00:00Z",
  "poc": "50000.00",
  "vah": "50500.00",
  "val": "49500.00", 
  "total_volume": "1500000.00",
  "nodes": [
    {
      "price_level": "50000.00",
      "volume": "500000.00",
      "buy_volume": "300000.00",
      "sell_volume": "200000.00",
      "trade_count": 1250
    }
  ]
}
```

### GET /api/v1/order-flow/{symbol}
Order Flow analysis para un símbolo.

**Parameters**:
- `symbol` (path): Trading pair
- `timeframe` (query): Timeframe (1m, 5m, 15m) - Default: 5m
- `periods` (query): Número de períodos - Default: 24

**Example**: `/api/v1/order-flow/BTCUSDT?timeframe=5m&periods=12`

**Response**:
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "5m",
  "data": [
    {
      "timestamp": "2025-06-17T16:25:00Z",
      "delta": "5000.00",
      "cumulative_delta": "25000.00",
      "volume": "100000.00",
      "buy_volume": "52500.00",
      "sell_volume": "47500.00",
      "imbalance_ratio": 1.11,
      "large_trades_count": 5
    }
  ]
}
```

## 🛠️ MCP Tools

WADM expone herramientas MCP para integración avanzada:

### get_volume_profile
Obtiene Volume Profile para análisis.

**Parameters**:
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "start_time": "2025-06-17T15:00:00Z"
}
```

### get_order_flow  
Obtiene Order Flow data.

**Parameters**:
```json
{
  "symbol": "BTCUSDT", 
  "timeframe": "5m",
  "periods": 24
}
```

### detect_liquidity_levels
Detecta niveles de liquidez importantes.

**Parameters**:
```json
{
  "symbol": "BTCUSDT",
  "sensitivity": "medium"
}
```

### get_market_structure
Análisis de estructura de mercado.

**Parameters**:
```json
{
  "symbol": "BTCUSDT",
  "analysis_depth": "comprehensive"
}
```

## 🔐 Authentication

Todos los endpoints (excepto health/ping) requieren autenticación:

```http
GET /api/v1/volume-profile/BTCUSDT
X-API-Key: tu_api_key_aqui
```

## ❌ Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid parameter",
  "message": "Invalid timeframe: 2h. Allowed: 1m, 5m, 15m, 30m, 1h, 4h, 1d",
  "code": "INVALID_PARAMETER"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Symbol INVALIDUSDT not found",
  "code": "SYMBOL_NOT_FOUND"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 1200 requests per hour exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 3600
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed",
  "code": "INTERNAL_ERROR",
  "request_id": "req_123456"
}
```

## 📊 Rate Limits

- **Default**: 1200 requests/hour per API key
- **Health endpoints**: Sin límite
- **MCP tools**: 100 calls/minute

## 🔧 Configuration

API behavior se controla via variables de entorno:

```bash
# Rate limiting
RATE_LIMIT_REQUESTS=1200
RATE_LIMIT_WINDOW=3600

# Data retention  
RAW_DATA_RETENTION=3600      # 1 hour
AGGREGATED_DATA_RETENTION=86400  # 24 hours

# Performance
MAX_RESPONSE_SIZE=10MB
QUERY_TIMEOUT=30
```

## 📝 OpenAPI Spec

Documentación interactiva disponible en:
- **Swagger UI**: `http://localhost:8920/docs`
- **ReDoc**: `http://localhost:8920/redoc`
- **OpenAPI JSON**: `http://localhost:8920/openapi.json`

---

**La API de WADM está diseñada para ser simple, rápida y confiable** ⚡
