# 🎯 Integración con wAIckoff MCP

## Visión General

Cloud MarketData actúa como fuente de datos en tiempo real para wAIckoff MCP, proporcionando Volume Profile y Order Flow calculados a partir de datos de múltiples exchanges.

## Arquitectura de Integración

```
┌─────────────────┐     MCP Protocol      ┌──────────────────┐
│  Cloud          │ ←─────────────────→   │   wAIckoff       │
│  MarketData     │                       │   MCP Server     │
│  (Provider)     │                       │   (Consumer)     │
└─────────────────┘                       └──────────────────┘
```

## Herramientas MCP Expuestas

### 1. Volume Profile Tools

#### get_volume_profile
```typescript
{
  name: "get_volume_profile",
  parameters: {
    symbol: string,        // "BTCUSDT"
    timeframe: string,     // "1h", "4h", "1d"
    lookback: number,      // períodos hacia atrás
    resolution: number     // niveles de precio
  },
  returns: {
    poc: number,          // Point of Control
    vah: number,          // Value Area High
    val: number,          // Value Area Low
    profile: Array<{
      price: number,
      volume: number,
      buyVolume: number,
      sellVolume: number
    }>
  }
}
```

#### get_volume_profile_history
```typescript
{
  name: "get_volume_profile_history",
  parameters: {
    symbol: string,
    startTime: number,    // timestamp
    endTime: number,      // timestamp
    interval: string      // "1m", "5m", "1h"
  }
}
```

### 2. Order Flow Tools

#### get_order_flow_metrics
```typescript
{
  name: "get_order_flow_metrics",
  parameters: {
    symbol: string,
    timeframe: string,
    lookback: number
  },
  returns: {
    delta: number,              // buy - sell volume
    cumulativeDelta: number,
    absorption: {
      bullish: Array<Level>,
      bearish: Array<Level>
    },
    imbalances: Array<{
      price: number,
      ratio: number,
      side: "buy" | "sell"
    }>
  }
}
```

#### stream_order_flow
```typescript
{
  name: "stream_order_flow",
  parameters: {
    symbol: string,
    subscribe: boolean
  },
  returns: EventStream<{
    timestamp: number,
    price: number,
    volume: number,
    side: string,
    delta: number,
    cumulativeDelta: number
  }>
}
```

### 3. Market Depth Tools

#### get_market_depth
```typescript
{
  name: "get_market_depth",
  parameters: {
    symbol: string,
    levels: number        // default 20
  },
  returns: {
    bids: Array<[price: number, volume: number]>,
    asks: Array<[price: number, volume: number]>,
    spread: number,
    midPrice: number,
    imbalance: number    // (bidVol - askVol) / (bidVol + askVol)
  }
}
```

## Configuración en wAIckoff

### 1. Agregar Cloud MarketData como servidor MCP

En `mcp_servers.json`:
```json
{
  "cloud-marketdata": {
    "command": "node",
    "args": ["cloud-marketdata-client.js"],
    "env": {
      "CLOUD_MARKETDATA_URL": "http://your-vps:8000",
      "API_KEY": "your-api-key"
    }
  }
}
```

### 2. Cliente MCP Local

Crear `cloud-marketdata-client.js`:
```javascript
import { MCPClient } from '@modelcontextprotocol/sdk';

class CloudMarketDataClient {
  constructor(config) {
    this.baseURL = config.url;
    this.apiKey = config.apiKey;
    this.mcp = new MCPClient();
  }

  async initialize() {
    // Registrar herramientas
    this.mcp.registerTool('get_volume_profile', this.getVolumeProfile.bind(this));
    this.mcp.registerTool('get_order_flow_metrics', this.getOrderFlowMetrics.bind(this));
    this.mcp.registerTool('get_market_depth', this.getMarketDepth.bind(this));
  }

  async getVolumeProfile(params) {
    const response = await fetch(`${this.baseURL}/mcp/volume-profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    return response.json();
  }
}
```

### 3. Uso en wAIckoff

```typescript
// En cualquier servicio de wAIckoff
class EnhancedAnalysisService {
  async analyzeWithRealData(symbol: string) {
    // Obtener Volume Profile de Cloud MarketData
    const volumeProfile = await this.mcp.call('get_volume_profile', {
      symbol,
      timeframe: '4h',
      lookback: 24,
      resolution: 50
    });

    // Obtener Order Flow
    const orderFlow = await this.mcp.call('get_order_flow_metrics', {
      symbol,
      timeframe: '1h',
      lookback: 24
    });

    // Combinar con análisis técnico existente
    const analysis = this.combineAnalysis(volumeProfile, orderFlow);
    
    return analysis;
  }
}
```

## Autenticación y Seguridad

### API Key Management
```yaml
# docker-compose.yml en Cloud MarketData
environment:
  - API_KEYS=key1:read,key2:read_write
  - RATE_LIMIT_PER_MINUTE=100
  - IP_WHITELIST=192.168.1.0/24
```

### Rate Limiting
- 100 requests/minuto por defecto
- Configurable por API key
- Burst allowance para streaming

## Monitoreo de Integración

### Métricas a Trackear
1. **Latencia end-to-end**: Desde request hasta response
2. **Error rate**: Por herramienta MCP
3. **Data freshness**: Edad de los datos servidos
4. **Usage patterns**: Qué herramientas se usan más

### Health Check Endpoint
```bash
GET /mcp/health
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": "72h",
  "tools": [
    {"name": "get_volume_profile", "calls_last_hour": 234},
    {"name": "get_order_flow_metrics", "calls_last_hour": 156}
  ]
}
```

## Troubleshooting

### Problemas Comunes

1. **Timeout en requests**
   - Verificar latencia de red VPS ↔ Local
   - Aumentar timeout en cliente MCP
   - Considerar cache local para datos frecuentes

2. **Datos desactualizados**
   - Verificar collectors están activos
   - Revisar logs de Cloud MarketData
   - Validar retención de datos

3. **Rate limit exceeded**
   - Implementar cache en wAIckoff
   - Solicitar aumento de límite
   - Usar batch requests cuando sea posible

### Comandos de Diagnóstico
```bash
# Verificar estado de Cloud MarketData
docker-compose ps
curl http://your-vps:8000/health

# Verificar conectividad desde wAIckoff
curl http://your-vps:8000/mcp/health

# Logs de integración
docker-compose logs -f app | grep MCP

# Test de herramientas MCP
docker-compose exec app python -c "
import requests
response = requests.post('http://localhost:8000/mcp/volume-profile', json={'symbol': 'BTCUSDT'})
print(response.json())
"
```

## Roadmap de Integración

### Fase 1 (Actual)
- ✅ Volume Profile básico
- ✅ Order Flow metrics
- ✅ Market Depth

### Fase 2
- [ ] Historical data API
- [ ] Custom indicators
- [ ] Multi-symbol queries

### Fase 3
- [ ] Machine Learning features
- [ ] Pattern detection
- [ ] Alerting system

---

*Para configuración detallada del cliente, ver `/examples/waickoff-integration/`*
