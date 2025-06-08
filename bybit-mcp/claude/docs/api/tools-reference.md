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

#### `get_market_data`
Get comprehensive market data (ticker + orderbook + recent klines).

**Parameters:**
- `symbol` (required): Trading pair
- `category` (optional): Market category. Default: "spot"

**Example:**
```javascript
await get_market_data({
  symbol: "XRPUSDT"
});
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

---

#### `analyze_volume`
Analyze volume patterns with VWAP and anomaly detection.

**Parameters:**
- `symbol` (required): Trading pair
- `interval` (optional): Timeframe ("1", "5", "15", "30", "60", "240", "D"). Default: "60"
- `periods` (optional): Number of periods to analyze. Default: 24

**Example:**
```javascript
await analyze_volume({
  symbol: "XRPUSDT",
  interval: "60",
  periods: 24
});
```

---

#### `analyze_volume_delta`
Calculate Volume Delta (buying vs selling pressure).

**Parameters:**
- `symbol` (required): Trading pair
- `interval` (optional): Timeframe ("1", "5", "15", "30", "60"). Default: "5"
- `periods` (optional): Number of periods. Default: 60

**Example:**
```javascript
await analyze_volume_delta({
  symbol: "XRPUSDT",
  interval: "5",
  periods: 60
});
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

---

#### `perform_technical_analysis`
Comprehensive technical analysis including all indicators.

**Parameters:**
- `symbol` (required): Trading pair
- `includeVolatility` (optional): Include volatility analysis. Default: true
- `includeVolume` (optional): Include volume analysis. Default: true
- `includeVolumeDelta` (optional): Include volume delta analysis. Default: true
- `includeSupportResistance` (optional): Include support/resistance analysis. Default: true
- `timeframe` (optional): Analysis timeframe. Default: "60"
- `periods` (optional): Number of periods to analyze. Default: 100

**Example:**
```javascript
await perform_technical_analysis({
  symbol: "XRPUSDT",
  timeframe: "60",
  periods: 100
});
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
- `riskTolerance` (optional): Risk tolerance level ("low", "medium", "high"). Default: "medium"
- `optimize` (optional): Use advanced optimization. Default: false

**Example:**
```javascript
await suggest_grid_levels({
  symbol: "XRPUSDT",
  investment: 1000,
  gridCount: 8
});
```

---

#### `get_complete_analysis`
Complete market analysis with summary and recommendations.

**Parameters:**
- `symbol` (required): Trading pair
- `investment` (optional): Investment amount for grid suggestions

**Example:**
```javascript
await get_complete_analysis({
  symbol: "XRPUSDT",
  investment: 2000
});
```

---

### **🔧 System Tools**

#### `get_system_health`
Get system health status and performance metrics.

**Parameters:**
- No parameters required

**Example:**
```javascript
await get_system_health();
```

**Response:**
```json
{
  "system_status": "HEALTHY",
  "version": "1.3.1",
  "uptime": "2 hours",
  "services": {
    "market_data": "ONLINE",
    "analysis": "ONLINE",
    "trading": "ONLINE"
  },
  "performance": {
    "total_requests": 145,
    "avg_response_time": "120ms",
    "success_rate": "98.5%"
  }
}
```

---

#### `get_debug_logs` 🔍 **NEW in v1.3.1**
Get debug logs for troubleshooting JSON errors and request issues.

**Parameters:**
- `logType` (optional): Type of logs ("all", "errors", "json_errors", "requests"). Default: "all"
- `limit` (optional): Number of log entries to return. Default: 50

**Example:**
```javascript
// Get all recent logs
await get_debug_logs({
  logType: "all",
  limit: 30
});

// Get only JSON parsing errors
await get_debug_logs({
  logType: "json_errors",
  limit: 10
});

// Get only HTTP/API errors
await get_debug_logs({
  logType: "errors",
  limit: 20
});
```

**Response:**
```json
{
  "summary": {
    "logType": "json_errors",
    "timestamp": "2025-06-08T20:45:00.000Z",
    "totalEntries": 3,
    "description": "JSON parsing error logs"
  },
  "api_requests": [
    {
      "requestId": "REQ-1717876515000-0002",
      "timestamp": "2025-06-08T20:45:15.000Z",
      "method": "GET",
      "url": "/v5/market/time",
      "status": 200,
      "error": null,
      "duration": "89ms",
      "jsonErrors": 1,
      "jsonErrorDetails": [
        {
          "attempt": 1,
          "error": "Expected ',' or ']' after array element in JSON at position 5",
          "errorPosition": 5,
          "context": "Direct parse failed",
          "dataPreview": "[{\"ti"
        }
      ]
    }
  ],
  "troubleshooting_info": {
    "common_json_errors": [
      {
        "error": "Expected ',' or ']' after array element in JSON at position 5",
        "likely_cause": "MCP SDK startup issue (known issue)",
        "resolution": "Error is suppressed in logger, doesn't affect functionality"
      }
    ],
    "next_steps": [
      "Check if errors are repeating",
      "Verify network connectivity to api.bybit.com",
      "Review raw response data in jsonErrorDetails"
    ]
  }
}
```

**Use Cases:**
- **Debugging JSON parsing errors**: Identify malformed API responses
- **Performance monitoring**: Track request durations and success rates
- **Error analysis**: Find patterns in HTTP and parsing errors
- **Troubleshooting**: Get guided help for common issues

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
*Last updated: 08/06/2025 | Version: v1.3.1*