# TASK-005: Detección Wyckoff Básica

## 📋 Descripción
Implementar un sistema básico de análisis Wyckoff que detecte las fases fundamentales de acumulación y distribución, identificando springs, upthrusts y test events. Esta implementación sienta las bases para el análisis Wyckoff avanzado (TASK-018).

## 🎯 Objetivos
1. **Detectar fases de Wyckoff básicas** - Acumulación, Markup, Distribución, Markdown
2. **Identificar springs y upthrusts** - Falsos movimientos en rangos de consolidación
3. **Detectar test events** - Validación de niveles clave con volumen
4. **Analizar rangos de consolidación** - Trading ranges con soporte/resistencia claros
5. **Sistema de almacenamiento de patterns** - Guardar patterns detectados para análisis futuro

## 🔧 Componentes a Implementar

### 1. **WyckoffBasicService** (`src/services/wyckoffBasic.ts`)
```typescript
interface IWyckoffBasicService {
  // Fase principal de análisis
  analyzeWyckoffPhase(
    symbol: string, 
    timeframe: string,
    lookback?: number
  ): Promise<WyckoffPhaseAnalysis>;

  // Detectar rangos de consolidación (acumulación/distribución)
  detectTradingRange(
    symbol: string,
    timeframe: string,
    minPeriods?: number
  ): Promise<TradingRangeAnalysis>;

  // Identificar springs (falsos quiebres bajo soporte)
  detectSprings(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<SpringEvent[]>;

  // Identificar upthrusts (falsos quiebres sobre resistencia)
  detectUpthrusts(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<UpthrustEvent[]>;

  // Detectar test events (retest de niveles)
  detectTestEvents(
    symbol: string,
    timeframe: string,
    keyLevels: number[]
  ): Promise<TestEvent[]>;

  // Analizar volumen en el contexto Wyckoff
  analyzeWyckoffVolume(
    symbol: string,
    timeframe: string,
    events: WyckoffEvent[]
  ): Promise<VolumeContext>;
}
```

### 2. **Tipos de Datos Wyckoff**
```typescript
interface WyckoffPhaseAnalysis {
  symbol: string;
  timeframe: string;
  analysisDate: Date;
  currentPhase: WyckoffPhase;
  phaseConfidence: number; // 0-100
  phaseProgress: number; // 0-100 completion percentage
  tradingRange?: TradingRange;
  keyEvents: WyckoffEvent[];
  volumeCharacteristics: VolumeContext;
  interpretation: {
    bias: 'accumulation' | 'distribution' | 'trending' | 'uncertain';
    strength: 'weak' | 'moderate' | 'strong';
    implications: string[];
    nextExpectedEvents: string[];
  };
}

type WyckoffPhase = 
  | 'accumulation_phase_a'    // Selling climax, automatic reaction
  | 'accumulation_phase_b'    // Building cause, testing supply
  | 'accumulation_phase_c'    // Spring, last point of supply
  | 'accumulation_phase_d'    // Signs of strength appearing
  | 'accumulation_phase_e'    // Last point of support before markup
  | 'markup'                  // Trending phase up
  | 'distribution_phase_a'    // Preliminary supply, buying climax
  | 'distribution_phase_b'    // Building cause, testing demand
  | 'distribution_phase_c'    // Upthrust, last point of demand
  | 'distribution_phase_d'    // Signs of weakness appearing
  | 'distribution_phase_e'    // Last point of support before markdown
  | 'markdown'               // Trending phase down
  | 'reaccumulation'         // Secondary accumulation in uptrend
  | 'redistribution'         // Secondary distribution in downtrend
  | 'uncertain';             // No clear phase detected

interface TradingRange {
  startDate: Date;
  endDate?: Date;
  support: number;
  resistance: number;
  duration: number; // days
  width: number; // percentage range
  volumeProfile: {
    averageVolume: number;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
    significantEvents: VolumeEvent[];
  };
  strength: 'weak' | 'moderate' | 'strong';
  type: 'accumulation' | 'distribution' | 'consolidation';
}

interface WyckoffEvent {
  timestamp: Date;
  type: 'spring' | 'upthrust' | 'test' | 'shakeout' | 'jump_across_creek' | 'sign_of_strength' | 'sign_of_weakness';
  price: number;
  volume: number;
  significance: number; // 0-100
  description: string;
  context: {
    phaseAtTime: WyckoffPhase;
    relativeToRange: 'below_support' | 'at_support' | 'within_range' | 'at_resistance' | 'above_resistance';
    volumeCharacter: 'high' | 'normal' | 'low';
  };
}

interface SpringEvent extends WyckoffEvent {
  type: 'spring';
  penetrationDepth: number; // how far below support
  recoverySpeed: number; // how quickly it recovered
  volumeOnPenetration: number;
  volumeOnRecovery: number;
  isSuccessful: boolean; // did it lead to markup?
}

interface UpthrustEvent extends WyckoffEvent {
  type: 'upthrust';
  penetrationHeight: number; // how far above resistance
  rejectionSpeed: number; // how quickly it was rejected
  volumeOnPenetration: number;
  volumeOnRejection: number;
  isSuccessful: boolean; // did it lead to markdown?
}

interface TestEvent extends WyckoffEvent {
  type: 'test';
  levelTested: number;
  testQuality: 'good' | 'poor' | 'failed';
  volumeOnTest: number;
  resultingAction: 'bounce' | 'break' | 'stall';
}

interface VolumeContext {
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  climaxEvents: ClimaxEvent[];
  dryUpPeriods: DryUpPeriod[];
  avgVolumeInRange: number;
  currentVolumeRank: number; // percentile of current volume vs range
  interpretation: string;
}

interface ClimaxEvent {
  date: Date;
  type: 'buying_climax' | 'selling_climax';
  volume: number;
  priceAction: string;
  significance: number;
}

interface DryUpPeriod {
  startDate: Date;
  endDate: Date;
  averageVolume: number;
  significance: 'minor' | 'moderate' | 'major';
}
```

### 3. **Algoritmos de Detección**
```typescript
// Pseudocode para detectar fases Wyckoff

1. Detectar Trading Range
   - Identificar períodos de consolidación (precio oscila entre S/R)
   - Mínimo 20-30 períodos de duración
   - Ratio alto/bajo del rango < 20% para considerarlo consolidación
   - Volumen debe mostrar características específicas

2. Clasificar Tipo de Rango
   - Acumulación: Después de downtrend, volumen en lows, tests exitosos
   - Distribución: Después de uptrend, volumen en highs, upthrusts
   - Consolidación: En medio de trend, características neutras

3. Identificar Events Específicos
   Spring Detection:
   - Precio penetra soporte con volumen
   - Recuperación rápida de vuelta al rango
   - Volumen debe "secar" en la penetración vs recuperación
   
   Upthrust Detection:
   - Precio penetra resistencia con volumen alto
   - Rechazo rápido de vuelta al rango
   - Volumen alto en penetración, menor en rechazo

   Test Detection:
   - Aproximación a nivel clave (S/R)
   - Volumen debe ser menor que en eventos previos
   - Resultado: bounce (exitoso) o break (fallido)

4. Análisis de Volumen
   - Comparar volumen en eventos clave
   - Identificar "dry up" periods (volumen decreciente)
   - Detectar climax (volumen excepcional con reversión)

5. Determinar Fase Actual
   - Mapear eventos a fases Wyckoff clásicas
   - Considerar secuencia temporal de eventos
   - Evaluar calidad y cantidad de tests/springs/upthrusts
```

### 4. **Nuevas Herramientas MCP**
- `analyze_wyckoff_phase` - Análisis completo de fase Wyckoff actual
- `detect_trading_range` - Identificar rangos de consolidación
- `find_wyckoff_events` - Buscar springs, upthrusts, tests en datos
- `analyze_wyckoff_volume` - Análisis de volumen en contexto Wyckoff
- `get_wyckoff_interpretation` - Interpretación y bias del análisis
- `track_phase_progression` - Seguimiento de progreso de fase actual
- `validate_wyckoff_setup` - Validar setup antes de trading

### 5. **WyckoffBasicHandlers** (`src/adapters/handlers/wyckoffBasicHandlers.ts`)
```typescript
export class WyckoffBasicHandlers {
  constructor(private engine: MarketAnalysisEngine) {}

  async handleAnalyzeWyckoffPhase(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
  }): Promise<MCPServerResponse> {
    // Implementation
  }

  async handleDetectTradingRange(args: {
    symbol: string;
    timeframe?: string;
    minPeriods?: number;
  }): Promise<MCPServerResponse> {
    // Implementation
  }

  async handleFindWyckoffEvents(args: {
    symbol: string;
    timeframe?: string;
    eventTypes?: string[];
    lookback?: number;
  }): Promise<MCPServerResponse> {
    // Implementation
  }

  async handleAnalyzeWyckoffVolume(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
  }): Promise<MCPServerResponse> {
    // Implementation
  }

  async handleGetWyckoffInterpretation(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<MCPServerResponse> {
    // Implementation
  }

  async handleTrackPhaseProgression(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<MCPServerResponse> {
    // Implementation
  }

  async handleValidateWyckoffSetup(args: {
    symbol: string;
    timeframe?: string;
    tradingDirection?: 'long' | 'short';
  }): Promise<MCPServerResponse> {
    // Implementation
  }
}
```

## 📊 Integración con Sistema Existente

### **Aprovechamiento de Funcionalidades Existentes**
- **Support/Resistance Analysis**: Base para identificar trading ranges
- **Volume Analysis**: Contexto para eventos Wyckoff
- **Historical Analysis (TASK-017)**: Datos históricos para patrones largos
- **Analysis Repository**: Almacenamiento automático de patterns detectados

### **Datos de Entrada Requeridos**
- OHLCV data para análisis de precio
- Niveles de soporte/resistencia existentes
- Análisis de volumen existente
- Datos históricos para context temporal

### **Integración con Core Engine**
```typescript
// Agregar al MarketAnalysisEngine
export class MarketAnalysisEngine {
  // ... existing code ...
  
  // Wyckoff Basic Service
  public readonly wyckoffBasicService: IWyckoffBasicService;
  
  constructor(/* params */) {
    // ... existing initialization ...
    
    // Initialize Wyckoff Basic Service
    this.wyckoffBasicService = new WyckoffBasicService(
      this.marketDataService,
      this.analysisService,
      this.historicalAnalysisService
    );
  }
  
  // New Wyckoff methods
  async analyzeWyckoffPhase(symbol: string, timeframe?: string): Promise<ApiResponse<WyckoffPhaseAnalysis>> {
    // Implementation
  }
  
  async detectTradingRange(symbol: string, timeframe?: string): Promise<ApiResponse<TradingRangeAnalysis>> {
    // Implementation
  }
  
  // ... other Wyckoff methods
}
```

## 📈 Beneficios Esperados

1. **Identificación temprana de acumulación/distribución**: Detectar antes que el mercado salga del rango
2. **Mejor timing de entrada**: Springs y tests dan puntos de entrada precisos
3. **Reducción de falsas señales**: Wyckoff context valida otros indicadores
4. **Base para análisis avanzado**: Fundamento para TASK-018 (Wyckoff Avanzado)
5. **Almacenamiento de knowledge**: Patterns guardados para backtesting y mejora

## 🚧 Consideraciones Técnicas

### **Dependencias**
- **Support/Resistance Analysis**: Necesita niveles S/R existentes
- **Volume Analysis**: Para contexto de volumen en eventos
- **Historical Data**: Para detectar patrones de largo plazo
- **Analysis Repository**: Para guardar patterns detectados

### **Parámetros Configurables**
- Mínima duración de trading range (default: 20 períodos)
- Sensibilidad de detección (affects spring/upthrust triggers)
- Volumen threshold para eventos significativos
- Timeframes soportados (60min, 4h, D, W)

### **Performance Considerations**
- Análisis puede ser CPU intensivo para grandes datasets
- Cache de resultados intermedios (trading ranges detectados)
- Procesamiento incremental cuando sea posible
- Límites de lookback para evitar timeouts

## 📊 Métricas de Éxito

- **Detección de Trading Ranges**: >85% de ranges obvios detectados correctamente
- **Springs/Upthrusts**: >70% correlación con movimientos subsecuentes
- **Phase Classification**: >75% precisión vs análisis manual
- **Integration**: 100% compatible con sistema existente
- **Performance**: <3 segundos para análisis completo
- **Storage**: Patterns guardados correctamente en Analysis Repository

## 🔗 Preparación para TASK-018 (Wyckoff Avanzado)

Esta implementación básica sienta las bases para:
- **Composite Man Detection**: Events básicos son input para detección avanzada
- **Multi-timeframe Analysis**: Structure para expandir a múltiples TFs
- **Cause & Effect**: Trading ranges son "cause" para projecciones
- **Nested Structures**: Ranges básicos pueden contener sub-structures

## 📅 Estimación

- **Tiempo desarrollo**: 6 horas
- **Complejidad**: MEDIA-ALTA
- **Prioridad**: ALTA (después de TASK-017 Historical Analysis)
- **ROI**: Alto para traders que usan Wyckoff methodology

## 🎯 Entregables

1. **WyckoffBasicService** completo con todos los algoritmos
2. **7 nuevas herramientas MCP** para análisis Wyckoff básico
3. **Integration completa** con Core Engine y Analysis Repository
4. **Tests unitarios** para algoritmos críticos de detección
5. **Documentación de interpretación** para cada fase y evento
6. **Storage automático** de patterns en Analysis Repository

---

## 📝 Notas de Implementación

### Fase 1: Service y Types (2h)
- Crear WyckoffBasicService con interfaces
- Definir todos los tipos de datos Wyckoff
- Algoritmo básico de trading range detection

### Fase 2: Event Detection (2h)
- Algoritmos de spring/upthrust detection
- Test event identification
- Volume context analysis

### Fase 3: Phase Analysis (1.5h)
- Lógica de clasificación de fases
- Integration con S/R y volume analysis
- Interpretation y recommendations

### Fase 4: MCP Integration (0.5h)
- WyckoffBasicHandlers implementation
- Integration con mcp-handlers.ts
- Testing con herramientas MCP

## 🔮 Extensiones Futuras

- **Machine Learning**: Entrenar modelos para mejorar detección
- **Pattern Recognition**: Detectar patterns Wyckoff específicos
- **Alert System**: Notificaciones en eventos críticos
- **Backtesting**: Validar efectividad histórica de signals
- **Chart Annotations**: Marcar events en gráficos para visualización
