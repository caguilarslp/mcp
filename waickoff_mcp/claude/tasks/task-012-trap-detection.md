# 🕵️ TASK-012: Detección de Trampas Alcistas y Bajistas

## 📋 Resumen Ejecutivo

Implementar algoritmos avanzados para detectar **bull traps** (trampas alcistas) y **bear traps** (trampas bajistas) en tiempo real, proporcionando alertas tempranas sobre movimientos falsos del mercado que podrían causar pérdidas significativas.

---

## 🎯 Definición Técnica

### **Bull Trap (Trampa Alcista)**
- **Definición**: Falso breakout por encima de resistencia que rápidamente regresa al rango
- **Características**: 
  - Breakout con volumen bajo
  - Precio regresa por debajo de resistencia en 1-4 velas
  - Orderbook muestra poca profundidad arriba del breakout
  - Volume Delta negativo durante el breakout

### **Bear Trap (Trampa Bajista)**
- **Definición**: Falso breakdown por debajo de soporte que rápidamente regresa al rango
- **Características**:
  - Breakdown con volumen bajo o artificial
  - Precio regresa por encima de soporte en 1-4 velas
  - Orderbook muestra acumulación en el breakdown
  - Volume Delta positivo durante el breakdown

---

## 🔧 Implementación Técnica

### **Arquitectura del Sistema**
```typescript
interface TrapDetector {
  // Detección en tiempo real
  detectBullTrap(symbol: string): Promise<TrapAnalysis>
  detectBearTrap(symbol: string): Promise<TrapAnalysis>
  
  // Análisis histórico
  findHistoricalTraps(symbol: string, days: number): Promise<TrapEvent[]>
  
  // Configuración de sensibilidad
  configureTrapSensitivity(config: TrapConfig): void
}

interface TrapAnalysis {
  probability: number;          // 0-100% probabilidad de trampa
  confidence: number;           // 0-100% confianza en detección
  triggers: TrapTrigger[];      // Señales que indican trampa
  priceTargets: number[];       // Niveles objetivo del movimiento
  timeWindow: string;           // Ventana de tiempo esperada
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  actionable: boolean;          // Si es accionable para trading
}

interface TrapTrigger {
  type: 'VOLUME' | 'ORDERBOOK' | 'PRICE_ACTION' | 'DIVERGENCE';
  description: string;
  weight: number;              // Peso en la decisión final
  timestamp: number;
}
```

### **Algoritmo de Detección Bull Trap**
```typescript
async detectBullTrap(symbol: string): Promise<TrapAnalysis> {
  const signals: TrapTrigger[] = [];
  let probability = 0;
  
  // 1. Verificar breakout de resistencia
  const resistance = await this.getKeyResistance(symbol);
  const currentPrice = await this.getCurrentPrice(symbol);
  const isBreakout = currentPrice > resistance.price;
  
  if (!isBreakout) return null; // No hay breakout
  
  // 2. Analizar volumen del breakout
  const breakoutVolume = await this.getBreakoutVolume(symbol);
  const avgVolume = await this.getAverageVolume(symbol, 20);
  
  if (breakoutVolume < avgVolume * 0.8) {
    signals.push({
      type: 'VOLUME',
      description: 'Breakout con volumen bajo',
      weight: 30,
      timestamp: Date.now()
    });
    probability += 30;
  }
  
  // 3. Analizar orderbook
  const orderbook = await this.getOrderbook(symbol);
  const depthRatio = this.calculateDepthAboveResistance(orderbook, resistance.price);
  
  if (depthRatio < 0.3) { // Poca profundidad arriba
    signals.push({
      type: 'ORDERBOOK',
      description: 'Orderbook débil encima de resistencia',
      weight: 25,
      timestamp: Date.now()
    });
    probability += 25;
  }
  
  // 4. Analizar Volume Delta
  const volumeDelta = await this.getVolumeDelta(symbol, 5); // últimas 5 velas
  const negativeDeltas = volumeDelta.filter(vd => vd.delta < 0).length;
  
  if (negativeDeltas >= 3) { // Mayoría con venta
    signals.push({
      type: 'DIVERGENCE',
      description: 'Volume Delta negativo durante breakout',
      weight: 20,
      timestamp: Date.now()
    });
    probability += 20;
  }
  
  // 5. Analizar velocidad del movimiento
  const priceChange = await this.getPriceChangeVelocity(symbol, 4); // 4 velas
  if (priceChange.velocity < 0.1) { // Movimiento lento
    signals.push({
      type: 'PRICE_ACTION',
      description: 'Breakout sin momentum',
      weight: 15,
      timestamp: Date.now()
    });
    probability += 15;
  }
  
  // 6. Calcular targets de retroceso
  const targets = [
    resistance.price,                    // Vuelta a resistencia
    resistance.price * 0.995,           // Debajo de resistencia
    await this.getNextSupport(symbol)   // Próximo soporte
  ];
  
  return {
    probability: Math.min(probability, 95), // Cap at 95%
    confidence: signals.length * 20,
    triggers: signals,
    priceTargets: targets,
    timeWindow: this.calculateTimeWindow(signals),
    riskLevel: probability > 70 ? 'HIGH' : probability > 40 ? 'MEDIUM' : 'LOW',
    actionable: probability > 60 && signals.length >= 3
  };
}
```

### **Algoritmo de Detección Bear Trap**
```typescript
async detectBearTrap(symbol: string): Promise<TrapAnalysis> {
  const signals: TrapTrigger[] = [];
  let probability = 0;
  
  // 1. Verificar breakdown de soporte
  const support = await this.getKeySupport(symbol);
  const currentPrice = await this.getCurrentPrice(symbol);
  const isBreakdown = currentPrice < support.price;
  
  if (!isBreakdown) return null;
  
  // 2. Analizar volumen del breakdown
  const breakdownVolume = await this.getBreakdownVolume(symbol);
  const avgVolume = await this.getAverageVolume(symbol, 20);
  
  if (breakdownVolume < avgVolume * 0.9) {
    signals.push({
      type: 'VOLUME',
      description: 'Breakdown con volumen insuficiente',
      weight: 25,
      timestamp: Date.now()
    });
    probability += 25;
  }
  
  // 3. Detectar acumulación en breakdown
  const volumeDelta = await this.getVolumeDelta(symbol, 3);
  const positiveDeltas = volumeDelta.filter(vd => vd.delta > 0).length;
  
  if (positiveDeltas >= 2) {
    signals.push({
      type: 'DIVERGENCE',
      description: 'Acumulación durante breakdown',
      weight: 35,
      timestamp: Date.now()
    });
    probability += 35;
  }
  
  // 4. Analizar orderbook para wall hunters
  const orderbook = await this.getOrderbook(symbol);
  const wallsBelow = this.detectLargeWallsBelow(orderbook, support.price);
  
  if (wallsBelow.length > 0) {
    signals.push({
      type: 'ORDERBOOK',
      description: 'Walls grandes debajo de soporte',
      weight: 20,
      timestamp: Date.now()
    });
    probability += 20;
  }
  
  // 5. Detectar divergencia con RSI/MACD
  const technicalDivergence = await this.detectTechnicalDivergence(symbol);
  if (technicalDivergence.bullish) {
    signals.push({
      type: 'DIVERGENCE',
      description: 'Divergencia alcista en indicadores',
      weight: 20,
      timestamp: Date.now()
    });
    probability += 20;
  }
  
  const targets = [
    support.price,                       // Vuelta a soporte
    support.price * 1.005,              // Encima de soporte
    await this.getNextResistance(symbol) // Próxima resistencia
  ];
  
  return {
    probability: Math.min(probability, 95),
    confidence: signals.length * 20,
    triggers: signals,
    priceTargets: targets,
    timeWindow: this.calculateTimeWindow(signals),
    riskLevel: probability > 70 ? 'HIGH' : probability > 40 ? 'MEDIUM' : 'LOW',
    actionable: probability > 65 && signals.length >= 3
  };
}
```

---

## 🔗 Integración con Sistema Existente

### **Nuevos Servicios**
```typescript
// src/services/trapDetection.ts
export class TrapDetectionService implements ITrapDetectionService {
  constructor(
    private marketDataService: IMarketDataService,
    private analysisService: IAnalysisService,
    private logger: Logger
  ) {}
}

// src/adapters/handlers/trapDetectionHandlers.ts
export class TrapDetectionHandlers {
  async handleDetectBullTrap(args: any): Promise<ApiResponse<TrapAnalysis>>
  async handleDetectBearTrap(args: any): Promise<ApiResponse<TrapAnalysis>>
  async handleGetTrapHistory(args: any): Promise<ApiResponse<TrapEvent[]>>
}
```

### **Nuevas Herramientas MCP**
```typescript
detect_bull_trap: {
  symbol: string;
  sensitivity?: 'low' | 'medium' | 'high';
}

detect_bear_trap: {
  symbol: string;
  sensitivity?: 'low' | 'medium' | 'high';
}

get_trap_history: {
  symbol: string;
  days: number;
  trapType?: 'bull' | 'bear' | 'both';
}

configure_trap_detection: {
  volumeThreshold: number;
  orderbookDepthRatio: number;
  timeWindowMinutes: number;
}
```

---

## 📊 Casos de Uso y Ejemplos

### **Ejemplo 1: Bull Trap BTC**
```
BTCUSDT rompe resistencia en 97,500
- Volumen: 60% del promedio ❌
- Orderbook: Poca profundidad arriba ❌  
- Volume Delta: -15M últimas 3 velas ❌
- Momentum: Breakout lento ❌

→ Probabilidad Bull Trap: 85%
→ Targets: 97,500 → 97,200 → 96,800
→ Timeframe: 1-4 horas
```

### **Ejemplo 2: Bear Trap ETH**
```
ETHUSDT rompe soporte en 3,400
- Volumen: 75% del promedio ⚠️
- Volume Delta: +8M durante breakdown ❌
- RSI: Divergencia alcista ❌
- Walls: 500 ETH wall en 3,380 ❌

→ Probabilidad Bear Trap: 75%
→ Targets: 3,400 → 3,420 → 3,450
→ Timeframe: 30min-2h
```

---

## 🎯 Beneficios y ROI

### **Beneficios de Trading**
- **Evitar pérdidas**: Identificar movimientos falsos antes de entrar
- **Contra-trading**: Tradear en dirección opuesta a la trampa
- **Risk management**: Mejor gestión de stops y targets
- **Timing**: Mejorar timing de entradas y salidas

### **Métricas de Éxito**
- **Precisión**: >70% de trampas detectadas correctamente
- **False positives**: <20% de alertas falsas
- **Time to detection**: <5 minutos desde el breakout/breakdown
- **ROI impact**: Mejora de 15-25% en performance de trading

---

## ⏱️ Cronograma de Implementación

### **Fase 1: Core Algorithm (3h)**
- Implementar TrapDetectionService
- Algoritmos básicos bull/bear trap
- Integration con marketData y analysis services

### **Fase 2: Handlers y Tools (2h)**
- TrapDetectionHandlers implementation
- Nuevas herramientas MCP
- Integration con MCPHandlers delegation

### **Fase 3: Testing y Refinement (2h)**
- Unit tests para algoritmos
- Backtesting con datos históricos
- Calibración de thresholds

### **Total: 7 horas**

---

## 🔮 Roadmap Futuro

### **Enhancements v2.0**
- **Machine Learning**: Modelos entrenados con datos históricos
- **Multi-timeframe**: Análisis en múltiples marcos temporales
- **Cross-asset**: Correlaciones entre diferentes assets
- **Sentiment integration**: Incorporar datos de redes sociales

### **Integration con FastAPI**
- **Advanced ML models**: Algoritmos más sofisticados
- **Real-time alerts**: Push notifications
- **Backtesting platform**: Simulación de estrategias
- **Portfolio integration**: Impacto en portfolio completo

---

## ✅ Criterios de Éxito

### **Técnicos**
- ✅ Compilación sin errores
- ✅ Tests unitarios >80% coverage
- ✅ Integration con arquitectura modular
- ✅ Performance <500ms por detección

### **Funcionales**
- ✅ Detección automática de trampas
- ✅ Alertas en tiempo real
- ✅ Histórico de trampas detectadas
- ✅ Configuración de sensibilidad

### **Business**
- ✅ Precisión >70% en detección
- ✅ Impacto positivo en trading performance
- ✅ Reducción de pérdidas por movimientos falsos
- ✅ Base sólida para features avanzadas

---

*Documento creado: 10/06/2025*
*Prioridad: ALTA - Implementación post TASK-009 FASE 3*