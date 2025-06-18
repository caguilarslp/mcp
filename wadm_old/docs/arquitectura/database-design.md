# 🗄️ WADM - Diseño de Base de Datos

## 📊 MongoDB Collections

### 1. **volume_profile**

Almacena perfiles de volumen agregados por timeframe.

```javascript
{
  "_id": "BTCUSDT_2025-06-15T14:30:00Z_1h",
  "symbol": "BTCUSDT",
  "exchange": "aggregated", // o "binance", "bybit"
  "timestamp": ISODate("2025-06-15T14:30:00Z"),
  "timeframe": "1h",
  "period_start": ISODate("2025-06-15T14:00:00Z"),
  "period_end": ISODate("2025-06-15T15:00:00Z"),
  
  "levels": {
    "104970.0": {
      "volume": 125.456,
      "buy_volume": 80.234,
      "sell_volume": 45.222,
      "trades": 1234,
      "avg_size": 0.102
    },
    "104971.0": {
      "volume": 98.765,
      "buy_volume": 50.123,
      "sell_volume": 48.642,
      "trades": 987,
      "avg_size": 0.100
    }
    // ... más niveles de precio
  },
  
  "summary": {
    "poc": 104971.0,           // Point of Control
    "vah": 104975.0,           // Value Area High
    "val": 104968.0,           // Value Area Low
    "value_area_volume": 450.123, // 70% del volumen total
    "total_volume": 642.891,
    "total_trades": 5432,
    "price_range": {
      "high": 104980.0,
      "low": 104960.0
    }
  },
  
  "metadata": {
    "created_at": ISODate("2025-06-15T15:00:05Z"),
    "processing_time_ms": 125,
    "data_sources": ["binance", "bybit"]
  }
}
```

**Índices**:
```javascript
db.volume_profile.createIndex({ "symbol": 1, "timestamp": -1 })
db.volume_profile.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 604800 }) // TTL 7 días
db.volume_profile.createIndex({ "symbol": 1, "timeframe": 1, "timestamp": -1 })
```

### 2. **order_flow**

Almacena snapshots de order flow cada X segundos.

```javascript
{
  "_id": "BTCUSDT_2025-06-15T14:30:05Z",
  "symbol": "BTCUSDT",
  "exchange": "aggregated",
  "timestamp": ISODate("2025-06-15T14:30:05Z"),
  "period_seconds": 5, // Ventana de tiempo
  
  "metrics": {
    "buy_volume": 45.678,
    "sell_volume": 32.456,
    "delta": 13.222,              // buy - sell
    "cumulative_delta": 1234.567, // Delta acumulado desde inicio sesión
    "trades_count": {
      "buy": 234,
      "sell": 198
    },
    "avg_trade_size": {
      "buy": 0.195,
      "sell": 0.164
    },
    "imbalance_ratio": 1.41      // buy_volume / sell_volume
  },
  
  "large_trades": [               // Trades > 0.1 BTC
    {
      "time": ISODate("2025-06-15T14:30:03.456Z"),
      "price": 104972.8,
      "volume": 0.37,
      "side": "Buy",
      "exchange": "binance"
    }
  ],
  
  "market_state": {
    "absorption_detected": false,
    "momentum": "bullish",
    "strength": 0.72              // 0-1 score
  },
  
  "metadata": {
    "created_at": ISODate("2025-06-15T14:30:06Z"),
    "data_complete": true
  }
}
```

**Índices**:
```javascript
db.order_flow.createIndex({ "symbol": 1, "timestamp": -1 })
db.order_flow.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 86400 }) // TTL 24h
db.order_flow.createIndex({ "symbol": 1, "metrics.delta": 1 }) // Para queries por delta
```

### 3. **api_keys**

Gestión de autenticación.

```javascript
{
  "_id": ObjectId("..."),
  "key_hash": "bcrypt_hash_here", // bcrypt hash del API key
  "name": "PC Principal",
  "created_at": ISODate("2025-06-15T00:00:00Z"),
  "last_used": ISODate("2025-06-15T14:30:00Z"),
  "active": true,
  
  "permissions": {
    "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"], // o ["*"] para todos
    "endpoints": ["volume_profile", "order_flow"],
    "rate_limit": 60  // requests per minute
  },
  
  "usage": {
    "total_requests": 12345,
    "requests_today": 234,
    "last_reset": ISODate("2025-06-15T00:00:00Z")
  },
  
  "metadata": {
    "ip_whitelist": [],  // Vacío = cualquier IP
    "notes": "Cliente principal de trading"
  }
}
```

**Índices**:
```javascript
db.api_keys.createIndex({ "key_hash": 1 }, { unique: true })
db.api_keys.createIndex({ "active": 1, "key_hash": 1 })
```

### 4. **system_metrics**

Métricas del sistema para monitoreo.

```javascript
{
  "_id": "metrics_2025-06-15T14:30:00Z",
  "timestamp": ISODate("2025-06-15T14:30:00Z"),
  "period": "1m",
  
  "collectors": {
    "binance": {
      "status": "healthy",
      "trades_processed": 3456,
      "errors": 0,
      "reconnections": 0,
      "latency_ms": 12
    },
    "bybit": {
      "status": "healthy",
      "trades_processed": 2890,
      "errors": 0,
      "reconnections": 1,
      "latency_ms": 15
    }
  },
  
  "processor": {
    "profiles_generated": 10,
    "orderflow_snapshots": 12,
    "processing_time_avg_ms": 45,
    "queue_size": 234
  },
  
  "mongodb": {
    "connections": 5,
    "operations_per_sec": 125,
    "storage_mb": 1234
  },
  
  "api": {
    "requests": 234,
    "avg_response_ms": 23,
    "errors": 0,
    "cache_hit_rate": 0.85
  }
}
```

**Índices**:
```javascript
db.system_metrics.createIndex({ "timestamp": -1 })
db.system_metrics.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 }) // TTL 30 días
```

## 🔧 Configuración MongoDB

### Replica Set Config:
```javascript
rs.initiate({
  _id: "wadm-rs",
  members: [
    { _id: 0, host: "mongodb:27017", priority: 1 }
  ]
})
```

### User Creation:
```javascript
db.createUser({
  user: "wadm_app",
  pwd: "secure_password_here",
  roles: [
    { role: "readWrite", db: "wadm" },
    { role: "dbAdmin", db: "wadm" }
  ]
})
```

### Performance Tuning:
```javascript
// Configuración para time-series workload
db.adminCommand({
  setParameter: 1,
  wiredTigerConcurrentReadTransactions: 128,
  wiredTigerConcurrentWriteTransactions: 128
})
```

## 📊 Estrategia de Particionamiento

Para escalar en el futuro:

1. **Sharding por Symbol**: 
   - Shard key: `{ symbol: 1, timestamp: 1 }`
   - Distribución uniforme por símbolo

2. **Archivado de Datos**:
   - Datos > 30 días → S3/Cold Storage
   - Resúmenes diarios permanentes

3. **Capped Collections** para logs:
   ```javascript
   db.createCollection("trade_logs", {
     capped: true,
     size: 1073741824, // 1GB
     max: 1000000      // 1M documentos
   })
   ```

---

*Última actualización: 15/06/2025*
