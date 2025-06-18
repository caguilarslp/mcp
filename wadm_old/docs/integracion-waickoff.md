# 🔗 WADM Integration Module

## 📋 Descripción

Este módulo integra los indicadores de WADM (Volume Profile y Order Flow) con el sistema wAIckoff MCP existente.

## 🏗️ Estructura

```
src/services/wadm/
├── wadmClient.ts         # Cliente para conectar con WADM API
├── wadmTypes.ts          # Tipos TypeScript
├── wadmHandlers.ts       # Handlers MCP
└── index.ts              # Exportaciones
```

## 🔧 Configuración

```typescript
// En .env
WADM_API_URL=https://tu-dominio.com:8920
WADM_API_KEY=tu-api-key-segura
WADM_CACHE_TTL=60 // segundos
```

## 📊 Nuevas Herramientas MCP

### Volume Profile
- `get_volume_profile` - POC, VAH, VAL en tiempo real
- `get_volume_distribution` - Distribución completa por precio

### Order Flow
- `get_order_flow` - Delta actual y acumulativo
- `get_order_imbalance` - Ratio buy/sell
- `get_large_trades` - Trades institucionales

## 🤖 Integración con Claude

Las herramientas WADM estarán disponibles para Claude junto con las existentes:

```typescript
// Ejemplo de uso combinado
const analysis = await handleGetCompleteAnalysis({ symbol: 'BTCUSDT' });
const volumeProfile = await handleGetVolumeProfile({ symbol: 'BTCUSDT' });
const orderFlow = await handleGetOrderFlow({ symbol: 'BTCUSDT' });

// Claude puede combinar todos los datos
const enrichedAnalysis = {
  ...analysis,
  volumeProfile,
  orderFlow,
  interpretation: await claude.interpret({
    technical: analysis,
    volume: volumeProfile,
    flow: orderFlow
  })
};
```

## 🚀 Beneficios

1. **Análisis más completo**: SMC + Wyckoff + Volume Profile + Order Flow
2. **Claude mejorado**: Más contexto para mejores interpretaciones
3. **Sin cambios breaking**: Extensión del sistema existente
4. **Cache inteligente**: Reduce llamadas a WADM API

---

*Módulo de integración WADM para wAIckoff MCP*
