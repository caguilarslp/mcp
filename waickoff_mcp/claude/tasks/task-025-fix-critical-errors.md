# TASK-025: Fix Errores Críticos de Producción

**Estado:** 🔴 URGENTE - Sistema parcialmente operativo
**Prioridad:** CRÍTICA
**Tiempo estimado:** 3-4 horas
**Fecha inicio:** 13/06/2025

## 🚨 Resumen de Errores

De los tests realizados, se detectaron **4 errores críticos** que afectan la funcionalidad core:

1. **Order Blocks Connection Error** - Herramienta completamente inoperativa
2. **Fibonacci Swing Detection Inversion** - Swing Low > Swing High
3. **SMC Zero Confluences** - Score 0/100 en todos los timeframes
4. **Order Blocks Zero Detection** - No detecta bloques en ningún símbolo

## 📋 Fases de Solución

### FASE 1: Fix Order Blocks Connection (45 min)
**Objetivo:** Resolver error de conexión upstream en detect_order_blocks

**Acciones:**
```typescript
// 1. Agregar timeout y retry logic en orderBlocksService.ts
const fetchWithRetry = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// 2. Validar respuesta antes de procesar
if (!klines || klines.length === 0) {
  throw new Error('No klines data received');
}

// 3. Agregar error handling específico
try {
  const klines = await this.marketDataService.getKlines(symbol, interval, 200);
} catch (error) {
  console.error(`Order Blocks fetch error: ${error.message}`);
  return { orderBlocks: [], metadata: { error: error.message } };
}
```

**Testing:**
- Probar con BTCUSDT, ETHUSDT, XRPUSDT
- Verificar en timeframes: 15m, 1h, 4h

### FASE 2: Fix Fibonacci Swing Detection (30 min)
**Objetivo:** Corregir inversión de swing points

**Acciones:**
```typescript
// 1. En fibonacciService.ts - Validar swing points
const validateSwings = (swingHigh: any, swingLow: any) => {
  // Asegurar que High > Low
  if (swingHigh.price <= swingLow.price) {
    // Intercambiar si están invertidos
    return { 
      swingHigh: swingLow, 
      swingLow: swingHigh,
      inverted: true 
    };
  }
  return { swingHigh, swingLow, inverted: false };
};

// 2. Mejorar detección de swings
const findSwingPoints = (candles: Candle[], minSwingSize: number) => {
  // Buscar el high y low REALES del período
  const high = candles.reduce((max, c) => c.high > max.high ? c : max);
  const low = candles.reduce((min, c) => c.low < min.low ? c : min);
  
  // Verificar orden temporal
  if (high.timestamp < low.timestamp) {
    // Uptrend: Low primero, luego High
    return { swingHigh: high, swingLow: low, trend: 'up' };
  } else {
    // Downtrend: High primero, luego Low
    return { swingHigh: high, swingLow: low, trend: 'down' };
  }
};
```

**Testing:**
- Verificar con ETHUSDT en múltiples timeframes
- Confirmar que High > Low siempre

### FASE 3: Fix SMC Confluence Detection (1 hora)
**Objetivo:** Resolver score 0/100 en confluencias

**Acciones:**
```typescript
// 1. En smartMoneyAnalysisService.ts - Relajar criterios
const analyzeConfluences = (orderBlocks: any[], fvgs: any[], bos: any[]) => {
  // Reducir distancia mínima para confluencias
  const CONFLUENCE_DISTANCE = 0.005; // 0.5% en lugar de 2%
  
  // Considerar confluencias parciales
  if (orderBlocks.length === 0 && fvgs.length > 0 && bos.length > 0) {
    // Confluencia FVG + BOS vale 60 puntos
    return { score: 60, type: 'partial' };
  }
  
  // Ajustar ponderación si falta algún componente
  const weights = {
    orderBlocks: orderBlocks.length > 0 ? 0.35 : 0,
    fvgs: fvgs.length > 0 ? 0.30 : 0,
    bos: bos.length > 0 ? 0.35 : 0
  };
  
  // Normalizar pesos
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalWeight > 0) {
    Object.keys(weights).forEach(key => {
      weights[key] = weights[key] / totalWeight;
    });
  }
};

// 2. Agregar fallback para símbolos sin confluencias
if (confluenceScore === 0) {
  // Buscar al menos coincidencias de 2 elementos
  const partialConfluences = findPartialConfluences(data);
  if (partialConfluences.length > 0) {
    confluenceScore = Math.min(50, partialConfluences.length * 10);
  }
}
```

**Testing:**
- Probar con BTCUSDT, ETHUSDT, XRPUSDT
- Verificar en diferentes condiciones de mercado

### FASE 4: Fix Order Blocks Detection Parameters (45 min)
**Objetivo:** Ajustar parámetros para detectar bloques

**Acciones:**
```typescript
// 1. En orderBlocksService.ts - Relajar criterios
const DEFAULT_CONFIG = {
  minStrength: 50,      // Reducir de 70 a 50
  lookback: 200,        // Aumentar de 100 a 200
  volumeThreshold: 1.2, // Reducir de 1.5 a 1.2
  priceThreshold: 0.003 // Reducir de 0.005 a 0.003 (0.3%)
};

// 2. Mejorar algoritmo de detección
const detectOrderBlocks = (candles: Candle[], config: Config) => {
  const blocks = [];
  
  // Buscar movimientos institucionales (>1% en una vela)
  for (let i = 2; i < candles.length - 2; i++) {
    const candle = candles[i];
    const priceMove = Math.abs(candle.close - candle.open) / candle.open;
    
    if (priceMove > 0.01 && candle.volume > avgVolume * 1.2) {
      // Posible Order Block
      blocks.push(createOrderBlock(candle, candles, i));
    }
  }
  
  // Si no hay bloques con criterios estrictos, usar criterios relajados
  if (blocks.length === 0) {
    return detectWithRelaxedCriteria(candles, config);
  }
  
  return blocks;
};

// 3. Agregar método de detección alternativo
const detectWithRelaxedCriteria = (candles: Candle[], config: Config) => {
  // Buscar zonas de consolidación seguidas de movimiento
  const consolidationZones = findConsolidationZones(candles);
  return consolidationZones.map(zone => ({
    ...zone,
    strength: zone.strength * 0.7, // Reducir strength
    type: 'potential' // Marcar como potencial
  }));
};
```

**Testing:**
- Probar con múltiples símbolos volátiles
- Verificar detección en tendencias y rangos

### FASE 5: Testing Integral y Validación (30 min)
**Objetivo:** Verificar que todos los fixes funcionan correctamente

**Tests a ejecutar:**
1. **Order Blocks + Volume Delta** en BTCUSDT
2. **Elliott Wave + Fibonacci** en ETHUSDT  
3. **Multi-timeframe SMC** en BTCUSDT (15m, 1h, 4h)
4. **SMC + Wyckoff + Confluences** en XLMUSDT

**Criterios de éxito:**
- Order Blocks detecta al menos 1 bloque por símbolo
- Fibonacci siempre muestra High > Low
- SMC Confluences score > 0 en al menos 50% de casos
- Sin errores de conexión en ninguna herramienta

## 📝 Notas de Implementación

### Prioridad de fixes:
1. **Order Blocks Connection** - Crítico, bloquea análisis institucional
2. **SMC Confluences** - Crítico, sin esto no hay señales
3. **Fibonacci Swings** - Importante, afecta precisión
4. **Order Blocks Detection** - Importante, mejora calidad

### Consideraciones:
- Mantener backward compatibility
- Agregar logs detallados para debugging
- Documentar cambios en parámetros
- Crear tests unitarios para cada fix

## 🎯 Resultado Esperado

Al completar esta tarea:
- ✅ Sistema 100% operativo sin errores de conexión
- ✅ Detección confiable de Order Blocks
- ✅ Fibonacci con swings correctos
- ✅ SMC Confluences generando scores válidos
- ✅ Tests pasando en múltiples símbolos/timeframes

**Tiempo total estimado: 3-4 horas**
