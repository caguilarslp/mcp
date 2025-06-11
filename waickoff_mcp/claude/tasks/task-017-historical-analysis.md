# TASK-017: Sistema de Análisis Histórico Completo

## 📋 Descripción
Implementar un sistema completo de análisis histórico que permita obtener y analizar datos desde los inicios de un par de trading, con enfoque en timeframes largos (diario/semanal) para establecer una base sólida de soportes/resistencias históricos y patrones de volumen significativos.

## 🎯 Objetivos
1. **Obtener datos históricos completos** desde el inicio del par
2. **Analizar soportes/resistencias históricos** en múltiples timeframes
3. **Identificar volúmenes significativos** y eventos de mercado importantes
4. **Crear base de conocimiento histórico** para mejorar análisis actuales
5. **Optimizar almacenamiento** de datos históricos para consultas rápidas

## 🔧 Componentes a Implementar

### 1. **HistoricalDataService** (`src/services/historicalData.ts`)
```typescript
interface IHistoricalDataService {
  // Fetch historical data from inception
  getHistoricalKlines(
    symbol: string,
    interval: 'D' | 'W' | 'M',  // Daily, Weekly, Monthly
    startTime?: number,          // Unix timestamp (optional, defaults to inception)
    endTime?: number            // Unix timestamp (optional, defaults to now)
  ): Promise<HistoricalKlines>;

  // Get market inception date
  getSymbolInceptionDate(symbol: string): Promise<Date>;

  // Fetch in batches for large datasets
  getHistoricalKlinesBatched(
    symbol: string,
    interval: string,
    batchSize: number
  ): AsyncGenerator<OHLCV[], void, unknown>;
}
```

### 2. **HistoricalAnalysisService** (`src/services/historicalAnalysis.ts`)
```typescript
interface IHistoricalAnalysisService {
  // Analyze historical support/resistance
  analyzeHistoricalSupportResistance(
    symbol: string,
    timeframe: 'D' | 'W' | 'M',
    options: {
      minTouches?: number;      // Minimum touches to consider valid
      tolerance?: number;       // Price tolerance percentage
      volumeWeight?: boolean;   // Weight by volume
      recencyBias?: number;     // Weight recent levels more
    }
  ): Promise<HistoricalSupportResistance>;

  // Identify significant volume events
  identifyVolumeEvents(
    symbol: string,
    timeframe: 'D' | 'W',
    threshold: number           // Standard deviations above mean
  ): Promise<VolumeEvent[]>;

  // Analyze price ranges and distributions
  analyzePriceDistribution(
    symbol: string,
    timeframe: 'D' | 'W'
  ): Promise<PriceDistribution>;

  // Identify major market cycles
  identifyMarketCycles(
    symbol: string
  ): Promise<MarketCycle[]>;
}
```

### 3. **HistoricalCacheService** (`src/services/historicalCache.ts`)
```typescript
interface IHistoricalCacheService {
  // Cache historical analysis results
  cacheHistoricalAnalysis(
    symbol: string,
    type: 'support_resistance' | 'volume_events' | 'price_distribution',
    data: any,
    ttl?: number
  ): Promise<void>;

  // Get cached analysis
  getCachedAnalysis(
    symbol: string,
    type: string
  ): Promise<any | null>;

  // Invalidate historical cache
  invalidateHistoricalCache(symbol: string): Promise<void>;
}
```

### 4. **Nuevas Herramientas MCP**
- `get_historical_klines` - Obtener velas históricas completas
- `analyze_historical_sr` - Analizar S/R históricos con scoring
- `identify_volume_anomalies` - Detectar eventos de volumen anómalos
- `get_price_distribution` - Obtener distribución de precios histórica
- `identify_market_cycles` - Identificar ciclos de mercado (bull/bear)
- `get_historical_summary` - Resumen ejecutivo de análisis histórico

## 📊 Estructuras de Datos

### HistoricalKlines
```typescript
interface HistoricalKlines {
  symbol: string;
  interval: string;
  startTime: Date;
  endTime: Date;
  dataPoints: number;
  klines: OHLCV[];
  metadata: {
    inceptionDate: Date;
    totalDays: number;
    missingData: DateRange[];
  };
}
```

### HistoricalSupportResistance
```typescript
interface HistoricalSupportResistance {
  symbol: string;
  timeframe: string;
  analysisDate: Date;
  levels: HistoricalLevel[];
  majorLevels: HistoricalLevel[];  // Top 10 most significant
  statistics: {
    totalLevelsFound: number;
    averageTouches: number;
    strongestLevel: HistoricalLevel;
    priceRange: { min: number; max: number };
  };
}

interface HistoricalLevel {
  price: number;
  type: 'support' | 'resistance' | 'both';
  touches: number;
  firstSeen: Date;
  lastSeen: Date;
  timesTested: number;
  timesHeld: number;
  timesBroken: number;
  averageVolume: number;
  significance: number;  // 0-100 score
  currentDistance: number; // % from current price
}
```

### VolumeEvent
```typescript
interface VolumeEvent {
  date: Date;
  type: 'spike' | 'drought' | 'accumulation' | 'distribution';
  volume: number;
  volumeRatio: number;  // vs average
  priceChange: number;
  significance: number;
  context?: string;     // e.g., "Listing announcement", "Major news"
}
```

### MarketCycle
```typescript
interface MarketCycle {
  type: 'bull' | 'bear' | 'accumulation' | 'distribution';
  startDate: Date;
  endDate?: Date;
  duration: number;     // days
  priceChange: number;  // percentage
  volumeProfile: 'increasing' | 'decreasing' | 'stable';
  keyLevels: number[]; // Important S/R during cycle
}
```

## 🔄 Algoritmos Clave

### 1. **Historical S/R Detection**
```typescript
// Pseudocode
1. Fetch all historical daily/weekly candles
2. Identify pivot highs/lows with configurable lookback
3. Group nearby pivots (tolerance: 0.5-1%)
4. Score each level by:
   - Number of touches
   - Volume at touches
   - Time span (first to last touch)
   - Success rate (held vs broken)
   - Recency (exponential decay)
5. Filter top N levels by significance
6. Calculate current relevance
```

### 2. **Volume Anomaly Detection**
```typescript
// Pseudocode
1. Calculate rolling volume statistics (mean, std dev)
2. Identify spikes > 2-3 standard deviations
3. Classify by price action:
   - High volume + price up = Accumulation
   - High volume + price down = Distribution
   - High volume + no change = Absorption
4. Correlate with known events if possible
5. Score by magnitude and price impact
```

### 3. **Market Cycle Identification**
```typescript
// Pseudocode
1. Apply trend detection on weekly timeframe
2. Identify major highs/lows (>20% moves)
3. Classify phases between highs/lows
4. Analyze volume patterns in each phase
5. Map Wyckoff phases if applicable
6. Calculate cycle statistics
```

## 📈 Beneficios Esperados

1. **Mejor contexto de mercado**: Entender dónde estamos en el ciclo histórico
2. **S/R más confiables**: Niveles probados durante años, no solo días
3. **Detección de patrones macro**: Identificar comportamientos recurrentes
4. **Mejor timing de entrada**: Conocer zonas históricamente significativas
5. **Risk management mejorado**: Evitar zonas de alto riesgo histórico

## 🚧 Consideraciones Técnicas

### Rate Limiting
- Bybit permite 120 requests/min para endpoints públicos
- Implementar throttling y batch processing
- Cache agresivo para datos históricos (no cambian)

### Almacenamiento
- Comprimir datos históricos (gzip)
- Índices por símbolo + timeframe
- Limpieza de datos antiguos no relevantes
- Considerar almacenamiento en formato binario para eficiencia

### Performance
- Lazy loading de datos históricos
- Procesamiento en background workers
- Análisis incremental (no recalcular todo)
- Pre-cálculo de niveles más importantes

## 📊 Métricas de Éxito

- **Cobertura histórica**: >95% de días desde inception
- **Tiempo de análisis**: <5s para análisis completo
- **Precisión S/R**: >70% de niveles históricos respetados
- **Detección de eventos**: >80% de eventos de volumen significativos
- **Memory footprint**: <100MB por símbolo analizado

## 🔗 Dependencias

- **StorageService**: Para persistir análisis históricos
- **CacheManager**: Para cache de resultados
- **AnalysisRepository**: Para guardar análisis históricos
- **MarketDataService**: Base para fetching de datos

## 📅 Estimación

- **Tiempo desarrollo**: 12-15 horas
- **Complejidad**: ALTA
- **Prioridad**: ALTA (base fundamental para análisis avanzados)
- **ROI**: Muy alto - mejora significativa en calidad de análisis

## 🎯 Entregables

1. **HistoricalDataService** completo con batching
2. **HistoricalAnalysisService** con todos los algoritmos
3. **6 nuevas herramientas MCP** funcionando
4. **Tests unitarios** para algoritmos críticos
5. **Documentación** de interpretación de resultados
6. **Ejemplos de uso** y mejores prácticas

---

## 📝 Notas de Implementación

### Fase 1: Data Collection (4h)
- Implementar HistoricalDataService
- Batching y rate limiting
- Herramienta get_historical_klines

### Fase 2: Core Analysis (6h)
- Implementar HistoricalAnalysisService
- Algoritmos S/R, Volume, Cycles
- Herramientas de análisis

### Fase 3: Integration & Testing (4h)
- Cache system
- Integration con Analysis Repository
- Tests y optimización

### Fase 4: Documentation (1h)
- Guías de uso
- Interpretación de resultados
- Ejemplos prácticos