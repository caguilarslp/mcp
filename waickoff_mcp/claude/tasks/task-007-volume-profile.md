# 📊 TASK-007: Volume Profile & Market Profile Profesional

## 🎯 Objetivo
Implementar un sistema completo de Volume Profile y Market Profile para análisis de estructura de mercado basado en volumen por precio, proporcionando insights institucionales sobre zonas de alto interés y niveles clave de trading.

## 📋 Descripción Detallada
El Volume Profile es una herramienta avanzada que muestra la actividad de trading en cada nivel de precio durante un período específico. A diferencia del volumen tradicional que muestra actividad en el tiempo, el Volume Profile muestra dónde ocurrió la mayor actividad por PRECIO, revelando zonas de interés institucional.

## 🔧 Componentes a Implementar

### 1. **VolumeProfileService** (`src/services/volumeProfile.ts`)

#### **Core Volume Profile Calculation**
```typescript
interface VolumeProfile {
  profileType: 'fixed' | 'session' | 'visible';
  priceRange: {
    high: number;
    low: number;
    bins: number;  // Number of price levels
  };
  volumeDistribution: VolumeNode[];
  statistics: ProfileStatistics;
  marketStructure: MarketStructure;
}

interface VolumeNode {
  price: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  percentOfTotal: number;
  isHVN: boolean;  // High Volume Node
  isLVN: boolean;  // Low Volume Node
  delta: number;   // Buy - Sell volume
}

interface ProfileStatistics {
  poc: {                    // Point of Control
    price: number;
    volume: number;
    strength: number;       // 0-100
  };
  valueArea: {
    high: number;           // VAH - Value Area High
    low: number;            // VAL - Value Area Low
    volumePercent: number;  // Usually 70%
    priceRange: number;
  };
  volumeNodes: {
    hvns: VolumeNode[];     // High Volume Nodes
    lvns: VolumeNode[];     // Low Volume Nodes
  };
  balance: {
    buyVolume: number;
    sellVolume: number;
    ratio: number;
    interpretation: 'accumulation' | 'distribution' | 'balanced';
  };
}
```

#### **TPO (Time Price Opportunity) Profile**
```typescript
interface TPOProfile {
  letters: Map<number, string[]>;  // Price -> ['A', 'B', 'C'...]
  rotations: Rotation[];
  initialBalance: {
    high: number;
    low: number;
    extension: 'above' | 'below' | 'none';
  };
  profile: {
    shape: 'P' | 'b' | 'D' | 'B' | 'I';  // Profile shapes
    development: 'normal' | 'abnormal';
    trend: 'up' | 'down' | 'balanced';
  };
}

interface Rotation {
  period: string;  // 'A', 'B', 'C'...
  high: number;
  low: number;
  direction: 'up' | 'down';
  volume: number;
}
```

#### **Advanced Analysis Features**
```typescript
interface VolumeProfileAnalysis {
  // Naked POCs (untested POCs from previous sessions)
  nakedPOCs: Array<{
    price: number;
    date: Date;
    tested: boolean;
    strength: number;
  }>;
  
  // Volume clusters
  volumeClusters: Array<{
    priceRange: { high: number; low: number; };
    totalVolume: number;
    significance: 'major' | 'minor';
    interpretation: string;
  }>;
  
  // Migration patterns
  pocMigration: {
    direction: 'up' | 'down' | 'stable';
    speed: number;  // POCs per period
    trend: 'accelerating' | 'decelerating' | 'steady';
  };
  
  // Composite profiles
  compositeProfile: {
    daily: VolumeProfile;
    weekly: VolumeProfile;
    monthly: VolumeProfile;
    confluence: ConfluenceLevel[];
  };
}

interface ConfluenceLevel {
  price: number;
  timeframes: string[];
  totalVolume: number;
  score: number;  // 0-100
  type: 'support' | 'resistance' | 'neutral';
}
```

### 2. **Market Profile Integration**
```typescript
interface MarketProfileService {
  // Session analysis
  analyzeSession(
    symbol: string,
    session: 'asian' | 'european' | 'american' | 'custom',
    date?: Date
  ): Promise<SessionProfile>;
  
  // Multi-session comparison
  compareProfiles(
    profiles: VolumeProfile[]
  ): ProfileComparison;
  
  // Auction theory application
  identifyAuctionPhase(): AuctionPhase;
  
  // Day type classification
  classifyDayType(): DayType;
}

interface SessionProfile {
  session: string;
  timeRange: { start: Date; end: Date; };
  profile: VolumeProfile;
  tpo: TPOProfile;
  auctionMetrics: {
    initiativeType: 'buyer' | 'seller' | 'balanced';
    rangeExtension: boolean;
    excessVolume: { high: number; low: number; };
  };
}

interface AuctionPhase {
  phase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
  confidence: number;
  signals: string[];
  expectedBehavior: string;
}

interface DayType {
  type: 'trend' | 'normal' | 'neutral' | 'volatile';
  characteristics: string[];
  tradingStrategy: string;
}
```

### 3. **VolumeProfileHandlers** (`src/adapters/handlers/volumeProfileHandlers.ts`)
Implementación de handlers MCP siguiendo el patrón establecido.

## 🛠️ Herramientas MCP Nuevas

### 1. **calculate_volume_profile**
```typescript
{
  name: "calculate_volume_profile",
  description: "Calculate complete volume profile with POC, Value Area, and HVN/LVN identification",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      period: { 
        type: "string", 
        enum: ["session", "day", "week", "month", "range"],
        default: "day"
      },
      bins: { 
        type: "number", 
        default: 24,
        minimum: 10,
        maximum: 100
      },
      valueAreaPercent: {
        type: "number",
        default: 70,
        minimum: 50,
        maximum: 90
      },
      includeDelta: {
        type: "boolean",
        default: true
      }
    },
    required: ["symbol"]
  }
}
```

### 2. **get_market_profile_tpo**
```typescript
{
  name: "get_market_profile_tpo",
  description: "Generate TPO (Time Price Opportunity) chart with market structure analysis",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      timeframe: {
        type: "string",
        enum: ["30min", "60min"],
        default: "30min"
      },
      session: {
        type: "string",
        enum: ["asian", "european", "american", "24h"],
        default: "24h"
      }
    },
    required: ["symbol"]
  }
}
```

### 3. **identify_volume_clusters**
```typescript
{
  name: "identify_volume_clusters",
  description: "Find significant volume clusters and naked POCs across multiple timeframes",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      lookback: {
        type: "number",
        default: 20,
        description: "Number of periods to analyze"
      },
      minClusterSize: {
        type: "number",
        default: 2.0,
        description: "Minimum volume multiplier for cluster"
      },
      includeNakedPOCs: {
        type: "boolean",
        default: true
      }
    },
    required: ["symbol"]
  }
}
```

### 4. **analyze_value_area_dynamics**
```typescript
{
  name: "analyze_value_area_dynamics",
  description: "Track value area migration and expansion/contraction patterns",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      periods: {
        type: "number",
        default: 10,
        description: "Number of periods to track"
      },
      alertOnBreakout: {
        type: "boolean",
        default: true
      }
    },
    required: ["symbol"]
  }
}
```

### 5. **get_composite_profile**
```typescript
{
  name: "get_composite_profile",
  description: "Generate composite volume profile across multiple timeframes",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      timeframes: {
        type: "array",
        items: { 
          type: "string",
          enum: ["day", "week", "month"]
        },
        default: ["day", "week"]
      },
      weightByRecency: {
        type: "boolean",
        default: true
      }
    },
    required: ["symbol"]
  }
}
```

### 6. **classify_market_day_type**
```typescript
{
  name: "classify_market_day_type",
  description: "Classify current day type based on volume profile shape and development",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      includeStrategy: {
        type: "boolean",
        default: true,
        description: "Include trading strategy for the day type"
      }
    },
    required: ["symbol"]
  }
}
```

## 📊 Casos de Uso Avanzados

### **1. Institutional Trading Zones**
- Identificar zonas de alto volumen donde institucionales tienen posiciones
- Detectar acumulación/distribución basada en delta de volumen
- Predecir niveles de soporte/resistencia basados en volumen

### **2. Intraday Trading**
- Initial Balance y su extensión
- Identificar tipo de día temprano en la sesión
- Trading desde extremos de Value Area

### **3. Swing Trading**
- Naked POCs como targets magnéticos
- Confluencia de perfiles multi-timeframe
- Migración de value area para bias direccional

### **4. Risk Management**
- Stop loss en Low Volume Nodes (LVN)
- Take profit en High Volume Nodes (HVN)
- Position sizing basado en estructura de volumen

## 🔄 Integración con Análisis Existente

### **Confluencia con Wyckoff**
```typescript
interface WyckoffVolumeConfluence {
  wyckoffPhase: string;
  volumeProfileShape: string;
  interpretation: string;
  tradingBias: 'long' | 'short' | 'neutral';
  confidenceScore: number;
}

// Ejemplo: Acumulación Phase C + P-shaped profile = Strong buy signal
```

### **Validación con S/R Dinámicos**
```typescript
interface EnhancedSupportResistance {
  traditionalSR: SupportResistanceLevel[];
  volumeBasedSR: VolumeNode[];
  confluence: Array<{
    price: number;
    strength: number;
    sources: string[];
  }>;
}
```

## 🎨 Visualización (Descripción para UI futura)

### **Volume Profile Display**
```
Price | Volume Histogram        | Stats
------|------------------------|-------
100.5 | ████████████████████ | POC
100.4 | ███████████████      | 
100.3 | ████████████         | VAH
100.2 | ██████               |
100.1 | ███                  | 
100.0 | ██                   |
99.9  | ████                 |
99.8  | ██████████           | VAL
99.7  | ████████             |
```

### **TPO Chart**
```
Price | A B C D E F G H I J K L
------|------------------------
100.5 | D E F G H
100.4 | C D E F G H I
100.3 | B C D E F G H I J    <- POC
100.2 | A B C D E F G H I J K
100.1 | A B C D E F G H I J K L
100.0 | A B C D E F G H I J K
99.9  |   B C D E F G H I J
99.8  |     C D E F G H I
99.7  |       D E F G
```

## 🚀 Plan de Implementación Mejorado

### **Fase 1: Core Volume Profile (2h)**
- Algoritmo de cálculo de Volume Profile
- POC y Value Area identification
- HVN/LVN detection

### **Fase 2: TPO y Market Profile (1.5h)**
- TPO letter assignment
- Profile shape classification
- Day type identification

### **Fase 3: Advanced Features (1h)**
- Naked POC tracking
- Volume cluster analysis
- Multi-timeframe profiles

### **Fase 4: Integration (0.5h)**
- Wyckoff confluence
- S/R validation
- Signal generation

### **Total: 5 horas**

## 📈 Métricas de Éxito

- **Precisión POC**: ±0.1% del precio
- **Value Area**: 68-72% del volumen (1 std dev)
- **Performance**: <500ms para perfil diario
- **Naked POC hit rate**: >65% tested within 5 days
- **Day type accuracy**: >75% classification correctness

## 🔮 Futuras Mejoras

1. **Machine Learning Integration**
   - Pattern recognition en formas de perfil
   - Predicción de migración de POC
   - Clasificación automática de setups

2. **Order Flow Integration**
   - Delta acumulativo por nivel
   - Footprint charts
   - Absorption detection

3. **Multi-Asset Correlation**
   - Perfiles comparativos BTC/ETH
   - Dominancia analysis
   - Cross-asset volume flows

---

*Especificación actualizada: 11/06/2025*
*Prioridad: MEDIA-ALTA - Herramienta fundamental para análisis institucional*
*Dependencias: Historical Data Service + Market Data Service*