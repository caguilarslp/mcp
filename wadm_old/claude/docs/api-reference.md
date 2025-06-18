# API Reference - WADM

## 🎯 Overview

WADM expone una API REST completa para análisis de Volume Profile y Order Flow, junto con una interfaz MCP para integración avanzada con el ecosistema wAIckoff.

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
  "timestamp": "2025-06-17T21:15:00Z"
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

## 📈 Volume Profile API

### GET /volume-profile/current/{symbol}
Obtiene el volume profile actual para un símbolo.

**Parameters**:
- `symbol` (path): Trading pair (ej: BTCUSDT)
- `exchange` (query): Exchange (default: binance)
- `timeframe` (query): 5m, 15m, 30m, 1h, 4h, 1d (default: 1h)
- `value_area_percentage` (query): 50.0-95.0 (default: 70.0)

**Example**: `/volume-profile/current/BTCUSDT?timeframe=1h&exchange=binance`

**Response**:
```json
{
  "symbol": "BTCUSDT",
  "exchange": "binance",
  "timeframe": "1h",
  "start_time": "2025-06-17T20:00:00Z",
  "end_time": "2025-06-17T21:00:00Z",
  "poc": 50000.00,
  "vah": 50500.00,
  "val": 49500.00,
  "total_volume": 1500000.00,
  "value_area_volume": 1050000.00,
  "levels": [
    {
      "price": 50000.00,
      "volume": 500000.00,
      "percentage": 33.33
    },
    {
      "price": 50100.00,
      "volume": 300000.00,
      "percentage": 20.00
    }
  ]
}
```

### GET /volume-profile/historical/{symbol}
Obtiene histórico resumido de volume profiles.

**Parameters**:
- `symbol` (path): Trading pair
- `exchange` (query): Exchange (default: binance)
- `timeframe` (query): 5m, 15m, 30m, 1h, 4h, 1d (default: 1h)
- `periods` (query): 1-168 períodos (default: 24)

**Example**: `/volume-profile/historical/BTCUSDT?periods=12&timeframe=4h`

**Response**:
```json
[
  {
    "symbol": "BTCUSDT",
    "exchange": "binance",
    "timestamp": "2025-06-17T20:00:00Z",
    "poc": 50000.00,
    "vah": 50500.00,
    "val": 49500.00,
    "total_volume": 1500000.00
  },
  {
    "symbol": "BTCUSDT",
    "exchange": "binance", 
    "timestamp": "2025-06-17T16:00:00Z",
    "poc": 49800.00,
    "vah": 50300.00,
    "val": 49300.00,
    "total_volume": 1200000.00
  }
]
```

### GET /volume-profile/calculate/{symbol}
Calcula volume profile para un rango temporal específico.

**Parameters**:
- `symbol` (path): Trading pair
- `start_time` (query): ISO timestamp (requerido)
- `end_time` (query): ISO timestamp (requerido)
- `exchange` (query): Exchange (default: binance)
- `value_area_percentage` (query): 50.0-95.0 (default: 70.0)

**Example**: `/volume-profile/calculate/BTCUSDT?start_time=2025-06-17T10:00:00Z&end_time=2025-06-17T12:00:00Z`

**Response**: Same format as `/current/{symbol}`

### GET /volume-profile/symbols
Lista símbolos disponibles con metadata.

**Parameters**:
- `exchange` (query): Exchange filter (default: binance)

**Response**:
```json
[
  {
    "symbol": "BTCUSDT",
    "exchange": "binance",
    "last_update": "2025-06-17T21:15:00Z",
    "profiles_available": 24
  },
  {
    "symbol": "ETHUSDT", 
    "exchange": "binance",
    "last_update": "2025-06-17T21:15:00Z",
    "profiles_available": 24
  }
]
```

### GET /volume-profile/poc-levels/{symbol}
Obtiene niveles POC históricos para identificar soporte/resistencia.

**Parameters**:
- `symbol` (path): Trading pair
- `exchange` (query): Exchange (default: binance)
- `timeframe` (query): 1h, 4h, 1d (default: 1h)
- `lookback_periods` (query): 1-168 períodos (default: 24)

**Response**:
```json
{
  "symbol": "BTCUSDT",
  "exchange": "binance",
  "timeframe": "1h",
  "lookback_periods": 24,
  "poc_levels": [
    {
      "timestamp": "2025-06-17T20:00:00Z",
      "poc": 50000.00
    },
    {
      "timestamp": "2025-06-17T19:00:00Z", 
      "poc": 49950.00
    }
  ],
  "key_levels": [50000.00, 49950.00, 50100.00],
  "support_levels": [49500.00, 49800.00],
  "resistance_levels": [50200.00, 50500.00]
}
```

### GET /volume-profile/statistics/{symbol}
Estadísticas y métricas de volume profile.

**Parameters**:
- `symbol` (path): Trading pair
- `exchange` (query): Exchange (default: binance)
- `timeframe` (query): 1h, 4h, 1d (default: 1h)

**Response**:
```json
{
  "symbol": "BTCUSDT",
  "exchange": "binance",
  "timeframe": "1h",
  "last_updated": "2025-06-17T21:15:00Z",
  "statistics": {
    "average_poc": 50250.00,
    "poc_std_deviation": 125.50,
    "average_value_area_volume_pct": 72.30,
    "most_traded_price_range": {
      "min": 49800.00,
      "max": 50800.00
    },
    "volume_distribution_skew": 0.15,
    "price_range_efficiency": 0.68
  },
  "trends": {
    "poc_trend": "ascending",
    "value_area_trend": "expanding", 
    "volume_concentration": "high"
  }
}
```

## 📊 Order Flow API (Próximamente)

### GET /order-flow/current/{symbol}
Order Flow analysis en tiempo real.

### GET /order-flow/delta/{symbol}
Análisis de delta y delta acumulativo.

### GET /order-flow/absorption/{symbol}
Detección de eventos de absorción.

## 🛠️ MCP Tools

WADM expone herramientas MCP para integración avanzada:

### get_volume_profile
Obtiene Volume Profile completo para análisis.

**Parameters**:
```json
{
  "symbol": "BTCUSDT",
  "exchange": "binance",
  "timeframe": "1h",
  "periods": 1
}
```

**Returns**: Volume Profile data con niveles detallados

### get_real_time_volume_profile
Volume Profile en tiempo real.

**Parameters**:
```json
{
  "symbol": "BTCUSDT",
  "exchange": "binance", 
  "timeframe_minutes": 60
}
```

### get_historical_volume_profiles
Múltiples Volume Profiles históricos.

**Parameters**:
```json
{
  "symbol": "BTCUSDT",
  "exchange": "binance",
  "timeframe_minutes": 60,
  "periods": 24
}
```

### detect_poc_levels
Identifica niveles POC importantes.

**Parameters**:
```json
{
  "symbol": "BTCUSDT",
  "exchange": "binance",
  "lookback_periods": 48
}
```

### analyze_volume_distribution
Análisis avanzado de distribución de volumen.

**Parameters**:
```json
{
  "symbol": "BTCUSDT",
  "exchange": "binance",
  "analysis_type": "concentration"
}
```

## 🔐 Authentication

Todos los endpoints (excepto health) requieren autenticación:

```http
GET /volume-profile/current/BTCUSDT
X-API-Key: tu_api_key_aqui
```

## ❌ Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid parameter",
  "message": "Invalid timeframe: 2h. Allowed: 5m, 15m, 30m, 1h, 4h, 1d",
  "code": "INVALID_PARAMETER"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "No volume profile data available for BTCUSDT on binance",
  "code": "DATA_NOT_FOUND"
}
```

### 422 Validation Error
```json
{
  "error": "Validation error",
  "message": "start_time must be before end_time",
  "code": "VALIDATION_ERROR"
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
  "message": "Volume profile calculation failed",
  "code": "INTERNAL_ERROR",
  "request_id": "req_123456"
}
```

## 📊 Rate Limits

- **Volume Profile endpoints**: 600 requests/hour per API key
- **Statistics endpoints**: 120 requests/hour per API key
- **Health endpoints**: Sin límite
- **MCP tools**: 100 calls/minute

## 🎯 Volume Profile Concepts

### POC (Point of Control)
Nivel de precio donde se ejecutó el mayor volumen durante el período. Representa el precio de mayor interés institucional.

### VAH/VAL (Value Area High/Low)
Límites superior e inferior del área que contiene el 70% del volumen total, centrada alrededor del POC.

### Value Area
Zona donde se concentra el 70% de la actividad de trading. Útil para identificar:
- **Fair Value**: Rango de precios aceptado por el mercado
- **Support/Resistance**: VAL como soporte, VAH como resistencia
- **Market Balance**: Precio dentro del value area indica equilibrio

### Volume Distribution
Análisis de cómo se distribuye el volumen:
- **High Concentration**: Volumen concentrado en pocos niveles (institutional activity)
- **Low Concentration**: Volumen distribuido uniformemente (retail activity)
- **Price Efficiency**: Qué tan tight está el value area vs rango total

## 🔧 Configuration

API behavior se controla via variables de entorno:

```bash
# Volume Profile Settings
VP_DEFAULT_TIMEFRAME=1h
VP_DEFAULT_VALUE_AREA=70.0
VP_MAX_PERIODS=168
VP_CACHE_TTL_REALTIME=60
VP_CACHE_TTL_CALCULATED=300

# Rate limiting
RATE_LIMIT_VP_REQUESTS=600
RATE_LIMIT_STATS_REQUESTS=120
RATE_LIMIT_WINDOW=3600

# Performance
VP_MAX_PRICE_LEVELS=1000
VP_CALCULATION_TIMEOUT=30
```

## 📝 OpenAPI Spec

Documentación interactiva disponible en:
- **Swagger UI**: `http://localhost:8920/docs`
- **ReDoc**: `http://localhost:8920/redoc`
- **OpenAPI JSON**: `http://localhost:8920/openapi.json`

---

**La API de WADM está optimizada para análisis profesional de Volume Profile con precisión institucional** ⚡
