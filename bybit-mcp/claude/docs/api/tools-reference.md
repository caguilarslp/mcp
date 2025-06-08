# 📡 Bybit MCP Server - API Reference

## 🔌 Available Tools

### **📊 Market Data Tools**

#### `get_ticker`
Get current price and 24h statistics for a trading pair.

**Parameters:**
- `symbol` (required): Trading pair (e.g., "BTCUSDT", "XRPUSDT")
- `category` (optional): Market category ("spot", "linear", "inverse"). Default: "spot"

**Example:**
```javascript
await get_ticker({
  symbol: "XRPUSDT",
  category: "spot"
});
```

**Response:**
```json
{
  "symbol": "XRPUSDT",
  "precio_actual": "$2.2866",
  "cambio_24h": "3.45%",
  "maximo_24h": "$2.3420",
  "minimo_24h": "$2.1890",
  "volumen_24h": "145892374.2",
  "bid": "$2.2864",
  "ask": "$2.2868",
  "spread": "$0.0004"
}
```

---

#### `get_orderbook`
Get order book depth for market analysis.

**Parameters:**
- `symbol` (required): Trading pair
- `category` (optional): Market category. Default: "spot"
- `limit` (optional): Number of levels. Default: 25

**Example:**
```javascript
await get_orderbook({
  symbol: "XRPUSDT",
  limit: 10
});
```

**Response:**
```json
{
  "symbol": "XRPUSDT",
  "bids": [
    {"precio": "$2.2864", "cantidad": "1250.5"},
    {"precio": "$2.2860", "cantidad": "890.2"}
  ],
  "asks": [
    {"precio": "$2.2868", "cantidad": "1100.8"},
    {"precio": "$2.2872", "cantidad": "750.3"}
  ],
  "spread": "$0.0004",
  "profundidad_bid": 25,
  "profundidad_ask": 25
}
```

---

#### `get_klines`
Get OHLCV candlestick data for technical analysis.

**Parameters:**
- `symbol` (required): Trading pair
- `interval` (optional): Timeframe ("1", "5", "15", "30", "60", "240", "D"). Default: "60"
- `limit` (optional): Number of candles. Default: 200
- `category` (optional): Market category. Default: "spot"

**Example:**
```javascript
await get_klines({
  symbol: "XRPUSDT",
  interval: "60",
  limit: 100
});
```

**Response:**
```json
{
  "symbol": "XRPUSDT",
  "interval": "60",
  "datos_recientes": [
    {
      "timestamp": "2025-06-08T17:00:00.000Z",
      "open": 2.2850,
      "high": 2.2890,
      "low": 2.2830,
      "close": 2.2866,
      "volume": 125430.5
    }
  ],
  "total_velas": 100,
  "rango_precio": {
    "maximo": 2.3420,
    "minimo": 2.1890
  }
}
```

---

### **📈 Analysis Tools**

#### `analyze_volatility`
Analyze price volatility to determine optimal grid trading timing.

**Parameters:**
- `symbol` (required): Trading pair
- `period` (optional): Analysis period ("1h", "4h", "1d", "7d"). Default: "1d"

**Example:**
```javascript
await analyze_volatility({
  symbol: "XRPUSDT",
  period: "1d"
});
```

**Response:**
```json
{
  "symbol": "XRPUSDT",
  "periodo_analisis": "1d",
  "precio_actual": "$2.2866",
  "precio_maximo": "$2.3420",
  "precio_minimo": "$2.1890",
  "volatilidad": "6.68%",
  "evaluacion": {
    "bueno_para_grid": true,
    "razon": "Volatilidad óptima para grid trading",
    "recomendacion": "Proceder con grid trading"
  }
}
```

---

#### `get_volume_analysis`
Analyze volume patterns with VWAP and anomaly detection.

**Parameters:**
- `symbol` (required): Trading pair
- `interval` (optional): Timeframe ("1", "5", "15", "30", "60", "240", "D"). Default: "60"
- `periods` (optional): Number of periods to analyze. Default: 24

**Example:**
```javascript
await get_volume_analysis({
  symbol: "XRPUSDT",
  interval: "60",
  periods: 24
});
```

**Response:**
```json
{
  "symbol": "XRPUSDT",
  "analisis_volumen": {
    "volumen_promedio": "125430.50",
    "volumen_actual": "142850.30",
    "comparacion_promedio": "114%"
  },
  "picos_volumen": [
    {
      "tiempo": "2025-06-08T15:00:00.000Z",
      "volumen": "188145.20",
      "multiplicador": "1.5x promedio",
      "precio": "2.2890"
    }
  ],
  "vwap": {
    "actual": "2.2855",
    "precio_vs_vwap": "Por encima",
    "diferencia": "0.048%"
  }
}
```

---

#### `get_volume_delta`
Calculate Volume Delta (buying vs selling pressure).

**Parameters:**
- `symbol` (required): Trading pair
- `interval` (optional): Timeframe ("1", "5", "15", "30", "60"). Default: "5"
- `periods` (optional): Number of periods. Default: 60

**Example:**
```javascript
await get_volume_delta({
  symbol: "XRPUSDT",
  interval: "5",
  periods: 60
});
```

**Response:**
```json
{
  "symbol": "XRPUSDT",
  "volume_delta_reciente": {
    "delta_actual": "15230.40",
    "delta_promedio_10": "8450.20",
    "sesgo": "Comprador",
    "fuerza_sesgo": "12.1%"
  },
  "divergencias": {
    "detectada": false,
    "tipo": "Sin divergencia",
    "señal": "Tendencia confirmada"
  }
}
```

---

#### `identify_support_resistance`
Identify dynamic support and resistance levels with strength scoring.

**Parameters:**
- `symbol` (required): Trading pair
- `interval` (optional): Timeframe ("15", "30", "60", "240", "D"). Default: "60"
- `periods` (optional): Number of periods to analyze. Default: 100
- `category` (optional): Market category. Default: "spot"
- `sensitivity` (optional): Pivot detection sensitivity (1-5). Default: 2

**Example:**
```javascript
await identify_support_resistance({
  symbol: "XRPUSDT",
  interval: "60",
  periods: 100,
  sensitivity: 2
});
```

**Response:**
```json
{
  "symbol": "XRPUSDT",
  "precio_actual": "$2.2866",
  "analisis_niveles": {
    "resistencias": [
      {
        "nivel": "$2.3250",
        "fuerza": "84.6",
        "toques": 3,
        "distancia_precio": "1.68%",
        "confirmacion_volumen": "1.4x promedio",
        "ultimo_toque": "2025-06-08T14:00:00.000Z",
        "evaluacion": "Muy fuerte"
      }
    ],
    "soportes": [
      {
        "nivel": "$2.2267",
        "fuerza": "78.2",
        "toques": 2,
        "distancia_precio": "2.62%",
        "confirmacion_volumen": "1.2x promedio",
        "ultimo_toque": "2025-06-08T12:00:00.000Z",
        "evaluacion": "Fuerte"
      }
    ]
  },
  "nivel_critico": {
    "tipo": "resistance",
    "precio": "$2.3250",
    "distancia": "1.68%",
    "fuerza": "84.6",
    "accion_sugerida": "Posible zona de toma de ganancias"
  },
  "configuracion_grid": {
    "zona_optima_inferior": "$2.2267",
    "zona_optima_superior": "$2.3250",
    "niveles_clave_grid": ["$2.3250", "$2.2890", "$2.2580", "$2.2267"],
    "recomendacion": "Niveles identificados - Grid recomendado"
  }
}
```

---

### **🎯 Trading Tools**

#### `suggest_grid_levels`
Generate intelligent grid trading suggestions based on volatility analysis.

**Parameters:**
- `symbol` (required): Trading pair
- `investment` (required): Amount to invest in USD
- `gridCount` (optional): Number of grid levels. Default: 10
- `category` (optional): Market category. Default: "spot"

**Example:**
```javascript
await suggest_grid_levels({
  symbol: "XRPUSDT",
  investment: 1000,
  gridCount: 8
});
```

**Response:**
```json
{
  "symbol": "XRPUSDT",
  "currentPrice": 2.2866,
  "suggestedRange": {
    "lower": 2.1723,
    "upper": 2.4009
  },
  "gridLevels": [2.1723, 2.2009, 2.2295, 2.2581, 2.2866, 2.3152, 2.3438, 2.3724, 2.4009],
  "investment": 1000,
  "pricePerGrid": 125.00,
  "potentialProfit": "$3.45/día estimado",
  "volatilidad_24h": "6.68%",
  "recomendacion": "Alta volatilidad - Grid recomendado"
}
```

---

## 🔧 Common Usage Patterns

### **Complete Market Analysis Workflow**
```javascript
// 1. Get current market data
const ticker = await get_ticker({symbol: "XRPUSDT"});

// 2. Analyze volatility for grid suitability
const volatility = await analyze_volatility({symbol: "XRPUSDT", period: "1d"});

// 3. Get support/resistance levels
const sr = await identify_support_resistance({symbol: "XRPUSDT", periods: 100});

// 4. Analyze volume patterns
const volume = await get_volume_analysis({symbol: "XRPUSDT", periods: 24});

// 5. Check volume delta for bias
const delta = await get_volume_delta({symbol: "XRPUSDT", periods: 60});

// 6. Generate grid suggestions
const grid = await suggest_grid_levels({symbol: "XRPUSDT", investment: 1000});
```

### **Quick Support/Resistance Check**
```javascript
const levels = await identify_support_resistance({
  symbol: "XRPUSDT",
  sensitivity: 3  // More sensitive detection
});

// Check critical level
console.log(`Critical level: ${levels.nivel_critico.precio}`);
console.log(`Distance: ${levels.nivel_critico.distancia}`);
```

### **Volume Divergence Detection**
```javascript
const delta = await get_volume_delta({
  symbol: "XRPUSDT",
  interval: "15",  // 15-minute timeframe
  periods: 40
});

if (delta.divergencias.detectada) {
  console.log(`Divergence detected: ${delta.divergencias.señal}`);
}
```

---

## ⚠️ Error Handling

### **Common Error Responses**
```json
{
  "content": [{
    "type": "text",
    "text": "Error ejecutando get_ticker: Invalid symbol format"
  }]
}
```

### **Error Types**
- **Invalid Symbol**: Symbol not found or wrong format
- **API Limit**: Rate limiting by Bybit API
- **Network Error**: Connection issues
- **Invalid Parameters**: Missing required parameters or wrong types

### **Best Practices**
- Always validate symbol format before calling
- Handle rate limiting gracefully
- Check for error responses in tool output
- Use appropriate timeframes for analysis

---

## 📊 Rate Limits & Performance

### **Bybit API Limits**
- Public endpoints: 10 requests/second
- No authentication required for current tools
- Automatic error handling for rate limits

### **Performance Tips**
- Use appropriate `limit` parameters to reduce data transfer
- Cache results when possible (implement in your application)
- Use longer intervals for historical analysis
- Combine multiple tool calls efficiently

---

*API Reference maintained as part of the project documentation system*
*Last updated: 08/06/2025 | Version: v1.2.1*