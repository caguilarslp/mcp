# 💰 TASK-020: Smart Money Concepts (SMC) para Trading Algorítmico

## 🎯 Objetivo
Implementar conceptos de Smart Money (SMC) adaptados específicamente para trading algorítmico de alta frecuencia en crypto, proporcionando señales claras y cuantificables que los bots puedan ejecutar sin ambigüedad.

## 📋 Descripción
Smart Money Concepts representa el enfoque moderno del análisis institucional, complementando perfectamente Wyckoff con conceptos más granulares y orientados a la acción del precio. Esta implementación se enfoca en hacer SMC 100% algorítmico, eliminando la subjetividad típica del análisis manual.

## 🔧 Componentes a Implementar

### 1. **SmartMoneyConceptsService** (`src/services/smartMoneyConcepts.ts`)
Servicio principal que implementa todos los conceptos SMC de forma algorítmica:

#### **Order Blocks (OB)**
```typescript
interface OrderBlock {
  id: string;
  type: 'bullish' | 'bearish' | 'breaker';
  origin: {
    high: number;
    low: number;
    open: number;
    close: number;
    volume: number;
    timestamp: Date;
  };
  zone: {
    upper: number;      // Top of the OB zone
    lower: number;      // Bottom of the OB zone
    midpoint: number;   // 50% of the zone
  };
  strength: number;     // 0-100 based on volume and move
  mitigated: boolean;   // Has been tested/traded through
  mitigationTime?: Date;
  respectCount: number; // Times price respected this OB
  lastTest?: Date;
  validity: 'fresh' | 'tested' | 'broken';
}

interface OrderBlockAnalysis {
  activeBlocks: OrderBlock[];
  breakerBlocks: OrderBlock[];  // Mitigated OBs that flipped
  strongestBlock: OrderBlock;
  nearestBlock: {
    bullish?: OrderBlock;
    bearish?: OrderBlock;
  };
  confluenceWithLevels: Array<{
    orderBlock: OrderBlock;
    level: any; // S/R, Fibo, etc.
    type: string;
  }>;
}
```

**Algoritmos:**
- Identificación automática usando estructura de mercado
- Validación por volumen institucional (>1.5x average)
- Tracking de mitigación y flips (breaker blocks)
- Scoring basado en movimiento posterior y respetos

#### **Fair Value Gaps (FVG)**
```typescript
interface FairValueGap {
  id: string;
  type: 'bullish' | 'bearish';
  gap: {
    upper: number;
    lower: number;
    size: number;       // In price units
    sizePercent: number; // As % of price
  };
  created: Date;
  filled: boolean;
  fillPercent: number;  // 0-100
  fillTime?: Date;
  candlesFormed: number; // Candles since creation
  probability: {
    fill: number;       // 0-100 based on historical
    timeToFill: number; // Average candles to fill
  };
}

interface FairValueGapAnalysis {
  openGaps: FairValueGap[];
  filledGaps: FairValueGap[];
  nearestGap: {
    above?: FairValueGap;
    below?: FairValueGap;
  };
  gapStatistics: {
    avgFillRate: number;
    avgTimeToFill: number;
    bullishFillRate: number;
    bearishFillRate: number;
  };
  tradingBias: 'fill_gaps' | 'continue_momentum' | 'neutral';
}
```

**Algoritmos:**
- Detección de imbalances de 3 velas
- Cálculo de probabilidad de relleno basado en histórico
- Clasificación por tamaño y contexto
- Tracking de performance por tipo de gap

#### **Liquidity Concepts**
```typescript
interface LiquidityLevel {
  price: number;
  type: 'buy_side' | 'sell_side';
  strength: number;      // Based on stop density
  source: 'equal_highs' | 'equal_lows' | 'pivot' | 'round_number';
  touches: number;
  lastTouch: Date;
  swept: boolean;
  sweepTime?: Date;
  sweepType?: 'stop_hunt' | 'genuine_break';
}

interface LiquidityAnalysis {
  buySideLiquidity: LiquidityLevel[];   // Above current price
  sellSideLiquidity: LiquidityLevel[];  // Below current price
  recentSweeps: Array<{
    level: LiquidityLevel;
    timestamp: Date;
    priceAction: 'reversed' | 'continued';
    profitability: number; // If traded
  }>;
  liquidityVoid: {
    above: { start: number; end: number; };
    below: { start: number; end: number; };
  };
  huntProbability: {
    buyStops: number;   // 0-100
    sellStops: number;  // 0-100
  };
}
```

**Algoritmos:**
- Identificación de equal highs/lows (±0.05%)
- Estimación de densidad de stops
- Detección de stop hunts vs genuine breaks
- Análisis de liquidty grabs y reversiones

#### **Market Structure**
```typescript
interface MarketStructure {
  trend: 'bullish' | 'bearish' | 'ranging';
  lastBOS: {              // Break of Structure
    price: number;
    timestamp: Date;
    type: 'bullish' | 'bearish';
    strength: number;
  };
  lastCHoCH?: {           // Change of Character
    price: number;
    timestamp: Date;
    from: 'bullish' | 'bearish';
    to: 'bullish' | 'bearish';
  };
  swingPoints: Array<{
    type: 'high' | 'low';
    price: number;
    timestamp: Date;
    broken: boolean;
    classification: 'HH' | 'HL' | 'LH' | 'LL';
  }>;
  structureStrength: number; // 0-100
  microStructure: MarketStructure; // Lower timeframe
}

interface DisplacementAnalysis {
  recentDisplacement?: {
    direction: 'up' | 'down';
    magnitude: number;    // In ATR units
    candles: number;      // Candles to complete
    volume: number;       // Volume ratio vs average
    timestamp: Date;
  };
  displacementHistory: Array<{
    displacement: any;
    followThrough: boolean;
    profitability: number;
  }>;
  probabilityStats: {
    upDisplacementSuccess: number;
    downDisplacementSuccess: number;
  };
}
```

**Algoritmos:**
- BOS detection con confirmación de cierre
- CHoCH identification para cambios de tendencia
- Clasificación automática de swing points
- Displacement detection usando ATR y volumen

### 2. **SMC Trading Setups**
```typescript
interface SMCSetup {
  id: string;
  type: 'ob_reversal' | 'fvg_fill' | 'liquidity_grab' | 'bos_retest' | 'displacement_continuation';
  confidence: number;     // 0-100
  entry: {
    price: number;
    type: 'limit' | 'stop';
    reason: string;
  };
  stopLoss: {
    price: number;
    reason: string;
    atrMultiple: number;
  };
  takeProfit: Array<{
    price: number;
    percentage: number;   // % of position
    reason: string;
  }>;
  riskRewardRatio: number;
  timeframe: string;
  expiry: Date;          // Setup invalidation time
  backtestStats?: {
    winRate: number;
    avgRR: number;
    occurrences: number;
  };
}
```

### 3. **SmartMoneyConceptsHandlers** (`src/adapters/handlers/smartMoneyConceptsHandlers.ts`)
Handlers MCP siguiendo el patrón establecido.

## 🛠️ Herramientas MCP Nuevas

### 1. **detect_order_blocks**
```typescript
{
  name: "detect_order_blocks",
  description: "Identify and classify institutional order blocks",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      timeframe: { type: "string", enum: ["5", "15", "60", "240"] },
      lookback: { type: "number", default: 100 },
      minStrength: { type: "number", default: 70 },
      includeBreakers: { type: "boolean", default: true }
    },
    required: ["symbol"]
  }
}
```

### 2. **find_fair_value_gaps**
```typescript
{
  name: "find_fair_value_gaps",
  description: "Find FVGs with fill probability analysis",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      timeframe: { type: "string", enum: ["1", "5", "15", "60"] },
      minGapSize: { type: "number", default: 0.1 }, // As % of price
      onlyUnfilled: { type: "boolean", default: false },
      includeStats: { type: "boolean", default: true }
    },
    required: ["symbol"]
  }
}
```

### 3. **analyze_liquidity_levels**
```typescript
{
  name: "analyze_liquidity_levels",
  description: "Analyze buy/sell side liquidity and stop hunt probability",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      timeframe: { type: "string", enum: ["15", "60", "240"] },
      radius: { type: "number", default: 2 }, // % from current price
      minTouches: { type: "number", default: 2 }
    },
    required: ["symbol"]
  }
}
```

### 4. **track_market_structure**
```typescript
{
  name: "track_market_structure",
  description: "Track BOS, CHoCH and structure changes",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      timeframe: { type: "string", enum: ["5", "15", "60", "240"] },
      includeMicroStructure: { type: "boolean", default: true },
      detectDisplacement: { type: "boolean", default: true }
    },
    required: ["symbol"]
  }
}
```

### 5. **detect_smc_setups**
```typescript
{
  name: "detect_smc_setups",
  description: "Detect complete SMC trading setups ready to execute",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      timeframes: { type: "array", items: { type: "string" } },
      setupTypes: { 
        type: "array",
        items: { 
          type: "string",
          enum: ["ob_reversal", "fvg_fill", "liquidity_grab", "bos_retest", "displacement"]
        }
      },
      minConfidence: { type: "number", default: 70 },
      riskPercent: { type: "number", default: 1 }
    },
    required: ["symbol"]
  }
}
```

## 📊 Optimización para Trading Algorítmico

### **Bot-Specific Features:**

1. **Eliminación de Subjetividad**
   - Reglas matemáticas claras para cada concepto
   - No "zonas aproximadas" - precios exactos
   - Timeframes óptimos pre-definidos (15m-4h para crypto)

2. **Entry/Exit Precisos**
   ```typescript
   interface SMCBotSignal {
     action: 'buy' | 'sell' | 'close';
     confidence: number;
     entryPrice: number;
     entryType: 'market' | 'limit' | 'stop';
     stopLoss: number;
     takeProfits: number[];
     maxHoldTime: number;  // In minutes
     setupId: string;      // For tracking
   }
   ```

3. **Risk Management Integrado**
   - Position sizing basado en estructura
   - Stops dinámicos según volatilidad
   - Partial profits en niveles clave

4. **Performance Tracking**
   ```typescript
   interface SMCPerformanceMetrics {
     bySetupType: Record<string, {
       count: number;
       winRate: number;
       avgWin: number;
       avgLoss: number;
       profitFactor: number;
       avgHoldTime: number;
     }>;
     byTimeframe: Record<string, any>;
     byMarketCondition: Record<string, any>;
   }
   ```

## 🔄 Integración con Análisis Existente

### **Sinergia con Wyckoff:**
- Order Blocks = Zonas de acumulación/distribución Wyckoff
- Liquidity Grabs = Springs/Upthrusts Wyckoff
- Market Structure = Fases Wyckoff
- Displacement = Movimientos de Composite Man

### **Validación Cruzada:**
```typescript
interface SMCWyckoffConfluence {
  orderBlock?: OrderBlock;
  wyckoffPhase?: string;
  wyckoffEvent?: string;
  volumeProfile?: any;
  confluenceScore: number;
  interpretation: string;
}
```

## 🧪 Testing Strategy

### **Unit Tests:**
- `tests/services/smartMoneyConcepts.test.ts`
  - Order block identification accuracy
  - FVG detection and stats
  - Market structure classification
  - Setup generation logic

### **Backtesting Framework:**
```typescript
interface SMCBacktest {
  symbol: string;
  period: { start: Date; end: Date; };
  setupTypes: string[];
  results: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    trades: SMCTrade[];
  };
}
```

## 📈 Beneficios Esperados

1. **Perspectiva Institucional**
   - Ver el mercado como lo ven los market makers
   - Identificar zonas de interés institucional
   - Anticipar movimientos de liquidez

2. **Setups de Alta Probabilidad**
   - 70%+ win rate en backtests
   - R:R mínimo 1:2
   - Confirmación multi-concepto

3. **Ejecución Algorítmica**
   - 0% discrecionalidad
   - Entradas/salidas precisas
   - Risk management automático

## 🚀 Plan de Implementación

### **Fase 1: Core SMC Engine (5h)**
1. Implementar Order Block detection
2. Desarrollar FVG identification
3. Crear Liquidity analysis system
4. Build Market Structure tracker

### **Fase 2: Setup Generation (3h)**
1. Combinar conceptos en setups
2. Calcular entries/exits precisos
3. Integrar risk management
4. Agregar backtesting stats

### **Fase 3: MCP Integration (2h)**
1. Crear SmartMoneyConceptsHandlers
2. Definir 5 herramientas MCP
3. Integrar con Core Engine
4. Testing completo

## 📝 Criterios de Éxito

- [ ] 5 herramientas MCP SMC funcionando
- [ ] Order blocks con 85%+ accuracy
- [ ] FVG fill probability ±10% accurate
- [ ] Liquidity sweeps detectados en tiempo real
- [ ] Market structure sin lag
- [ ] Setups con backtested 70%+ win rate
- [ ] Integration con Wyckoff completa
- [ ] <200ms por análisis completo

## 🔗 Dependencias

- **Market Data Service** para price action
- **Volume Delta Service** para confirmación institucional
- **Wyckoff Service** para contexto de mercado
- **Technical Analysis Service** para confluencias
- **Historical Data Service** para backtesting

## 📚 Referencias Algorítmicas

### **Order Block Detection:**
```python
# Pseudocódigo
if candle.close > candle.open:  # Bullish
    if next_candle.low > candle.high:  # Gap up
        if volume > avg_volume * 1.5:
            if subsequent_move > ATR * 2:
                return BullishOrderBlock
```

### **FVG Identification:**
```python
# Fair Value Gap
gap_size = candle[1].low - candle[-1].high  # Bullish FVG
if gap_size > 0 and gap_size > price * 0.001:  # 0.1% minimum
    return FairValueGap(
        upper=candle[1].low,
        lower=candle[-1].high,
        probability=calculate_fill_probability()
    )
```

---

*Esta especificación proporciona un framework completo para implementar Smart Money Concepts de forma 100% algorítmica, eliminando la subjetividad y optimizando para ejecución automatizada.*
