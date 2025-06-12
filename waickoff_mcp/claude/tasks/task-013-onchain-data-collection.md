# 🔗 TASK-013: Integración On-Chain Data Collection

## 📋 Resumen Ejecutivo

Implementar sistema de recolección de datos on-chain para detectar movimientos significativos de stablecoins, exchanges y ballenas que puedan indicar direcciones futuras del mercado crypto.

---

## 🎯 Scope de Implementación MCP

### **Datos On-Chain a Recopilar**

#### **1. Stablecoin Mints/Burns**
```typescript
interface StablecoinActivity {
  // Minteos significativos
  detectTetherMints(threshold: number): Promise<MintEvent[]>
  detectUSDCMints(threshold: number): Promise<MintEvent[]>
  detectBUSDActivity(): Promise<ActivityEvent[]>
  
  // Análisis de flujos
  getStablecoinFlow(timeframe: string): Promise<FlowSummary>
}

interface MintEvent {
  coin: 'USDT' | 'USDC' | 'BUSD' | 'DAI';
  amount: number;
  timestamp: number;
  txHash: string;
  fromAddress: string;
  significance: 'LOW' | 'MEDIUM' | 'HIGH';
  marketImpact: {
    estimatedBuyPressure: number;
    timeToMarket: string;
    confidence: number;
  };
}
```

#### **2. Exchange Flow Monitoring**
```typescript
interface ExchangeFlowMonitor {
  // Movimientos Exchange → Cold Wallet (bullish signal)
  detectExchangeToCold(exchange: string): Promise<ColdWalletMove[]>
  
  // Movimientos Cold → Exchange (potential sell pressure)
  detectColdToExchange(exchange: string): Promise<ExchangeInflow[]>
  
  // Hot wallet recharges (buying pressure)
  detectHotWalletRecharges(exchange: string): Promise<RechargeEvent[]>
}

interface ColdWalletMove {
  exchange: 'binance' | 'coinbase' | 'kraken' | 'bitfinex';
  asset: string;
  amount: number;
  usdValue: number;
  confidence: number;
  direction: 'to_cold' | 'from_cold';
  marketSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timestamp: number;
  txHash: string;
}
```

#### **3. Whale Movement Tracking**
```typescript
interface WhaleTracker {
  // Movimientos grandes (>$1M USD)
  detectLargeTransfers(threshold: number): Promise<WhaleTransaction[]>
  
  // Acumulación de ballenas conocidas
  trackKnownWhales(addresses: string[]): Promise<WhaleActivity[]>
  
  // Nuevas ballenas (addresses with sudden large activity)
  detectNewWhales(timeframe: string): Promise<NewWhaleAlert[]>
}

interface WhaleTransaction {
  fromAddress: string;
  toAddress: string;
  asset: string;
  amount: number;
  usdValue: number;
  timestamp: number;
  txHash: string;
  addressType: {
    from: 'exchange' | 'whale' | 'contract' | 'unknown';
    to: 'exchange' | 'whale' | 'contract' | 'unknown';
  };
  significance: {
    score: number;        // 1-100
    reasoning: string[];
    marketImpact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
}
```

---

## 🔌 APIs y Fuentes de Datos

### **Primary APIs para MCP**
```typescript
// 1. Blockchain APIs
interface OnChainAPIs {
  etherscan: {
    endpoint: 'https://api.etherscan.io/api';
    features: ['token_transfers', 'address_balance', 'transaction_list'];
  };
  
  polygonscan: {
    endpoint: 'https://api.polygonscan.com/api';
    features: ['USDC_polygon', 'matic_transfers'];
  };
  
  bscscan: {
    endpoint: 'https://api.bscscan.com/api';
    features: ['BUSD', 'BNB_transfers'];
  };
  
  tronscan: {
    endpoint: 'https://apilist.tronscan.org/api';
    features: ['USDT_tron', 'TRX_transfers'];
  };
}

// 2. Specialized Services
interface SpecializedAPIs {
  coingecko: {
    endpoint: 'https://api.coingecko.com/api/v3';
    features: ['coin_data', 'market_data', 'exchange_flows'];
    rateLimits: '50/min';
  };
  
  glassnode: {
    endpoint: 'https://api.glassnode.com/v1';
    features: ['exchange_flows', 'whale_alerts', 'stablecoin_metrics'];
    rateLimits: '1000/day';
    requiresKey: true;
  };
  
  whaleAlert: {
    endpoint: 'https://api.whale-alert.io/v1';
    features: ['recent_transactions', 'whale_list'];
    rateLimits: '60/min';
    requiresKey: true;
  };
}
```

### **Rate Limiting Strategy**
```typescript
interface RateLimitingConfig {
  etherscan: {
    requestsPerSecond: 5;
    batchSize: 1;
    backoffMultiplier: 2;
  };
  
  coingecko: {
    requestsPerMinute: 50;
    cacheMinutes: 5;
    priorityEndpoints: ['exchange_flows'];
  };
  
  whaleAlert: {
    requestsPerMinute: 60;
    cacheMinutes: 2;
    webhookPreferred: true;
  };
}
```

---

## 🏗️ Arquitectura de Implementación

### **Service Layer**
```typescript
// src/services/onchainData.ts
export class OnChainDataService implements IOnChainDataService {
  constructor(
    private rateLimiter: RateLimiter,
    private cacheManager: CacheManager,
    private logger: Logger,
    private config: OnChainConfig
  ) {}
  
  // Stablecoin monitoring
  async getStablecoinMints(hours: number = 24): Promise<MintEvent[]>
  async getStablecoinFlows(symbol: string): Promise<FlowSummary>
  
  // Exchange flow monitoring  
  async getExchangeFlows(exchange: string): Promise<ExchangeFlow[]>
  async detectSignificantMoves(threshold: number): Promise<SignificantMove[]>
  
  // Whale tracking
  async getWhaleTransactions(minUSD: number): Promise<WhaleTransaction[]>
  async trackAddressActivity(address: string): Promise<AddressActivity>
}
```

### **Handlers Integration**
```typescript
// src/adapters/handlers/onchainHandlers.ts
export class OnChainHandlers {
  constructor(
    private onchainService: IOnChainDataService,
    private logger: Logger
  ) {}
  
  async handleGetStablecoinMints(args: any): Promise<ApiResponse<MintEvent[]>>
  async handleGetExchangeFlows(args: any): Promise<ApiResponse<ExchangeFlow[]>>
  async handleGetWhaleActivity(args: any): Promise<ApiResponse<WhaleTransaction[]>>
  async handleTrackAddress(args: any): Promise<ApiResponse<AddressActivity>>
}
```

### **Nuevas Herramientas MCP**
```typescript
// Stablecoin monitoring
get_stablecoin_mints: {
  coin?: 'USDT' | 'USDC' | 'BUSD' | 'all';
  hours?: number;          // default 24
  minAmount?: number;      // minimum USD value
}

get_stablecoin_flows: {
  timeframe: '1h' | '4h' | '24h' | '7d';
  breakdown?: boolean;     // by coin type
}

// Exchange flows
get_exchange_flows: {
  exchange: 'binance' | 'coinbase' | 'kraken' | 'all';
  direction?: 'inflow' | 'outflow' | 'both';
  hours?: number;
  minUSD?: number;
}

detect_significant_moves: {
  minUSD: number;          // minimum transaction size
  hours?: number;          // lookback period
  assetType?: 'BTC' | 'ETH' | 'stablecoin' | 'all';
}

// Whale tracking
get_whale_transactions: {
  minUSD: number;          // minimum $1M recommended
  hours?: number;
  asset?: string;          // specific asset filter
  includeExchanges?: boolean;
}

track_whale_address: {
  address: string;
  network: 'ethereum' | 'bsc' | 'polygon' | 'tron';
}

// Historical analysis
get_onchain_summary: {
  timeframe: '1h' | '4h' | '24h' | '7d';
  includeWhales?: boolean;
  includeExchanges?: boolean;
  includeStablecoins?: boolean;
}
```

---

## 📊 Data Processing y Signals

### **Signal Generation**
```typescript
interface OnChainSignal {
  type: 'STABLECOIN_MINT' | 'EXCHANGE_OUTFLOW' | 'WHALE_ACCUMULATION';
  strength: number;        // 1-100
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeframe: string;       // expected impact timeframe
  description: string;
  data: any;              // raw data supporting signal
  confidence: number;      // 1-100
}

// Signal examples
const signals = [
  {
    type: 'STABLECOIN_MINT',
    strength: 85,
    direction: 'BULLISH',
    timeframe: '2-6 hours',
    description: 'Tether minted $500M, historically leads to buying pressure',
    confidence: 80
  },
  
  {
    type: 'EXCHANGE_OUTFLOW', 
    strength: 70,
    direction: 'BULLISH',
    timeframe: '1-3 days',
    description: 'Binance cold storage received 2,500 BTC, reducing sell pressure',
    confidence: 75
  },
  
  {
    type: 'WHALE_ACCUMULATION',
    strength: 60,
    direction: 'BULLISH', 
    timeframe: '1-7 days',
    description: '3 whale addresses accumulated 15,000 ETH in last 4 hours',
    confidence: 65
  }
];
```

### **Historical Correlation**
```typescript
interface CorrelationAnalysis {
  // Correlate on-chain events with price movements
  analyzeStablecoinMintImpact(mintEvents: MintEvent[]): Promise<CorrelationResult>
  analyzeExchangeFlowImpact(flows: ExchangeFlow[]): Promise<CorrelationResult>
  analyzeWhaleImpact(transactions: WhaleTransaction[]): Promise<CorrelationResult>
}

interface CorrelationResult {
  correlation: number;     // -1 to 1
  avgTimeToImpact: number; // hours
  avgPriceImpact: number;  // percentage
  confidence: number;      // statistical confidence
  sampleSize: number;      // number of events analyzed
}
```

---

## ⏱️ Implementación Dividida en Fases Manejables

### **FASE 1: Infrastructure & Basic APIs (3-4h)**
**Objetivo:** Establecer base sólida con rate limiting y APIs básicas

**Componentes:**
- `OnChainDataService` base class con interfaces
- Rate limiter con backoff exponencial
- Cache manager específico para on-chain data
- Integración básica Etherscan + CoinGecko
- Error handling y retry logic

**Herramientas MCP:**
- `test_onchain_connection` - Verificar APIs funcionando
- `get_onchain_status` - Estado del sistema on-chain

**Entregables:**
- Sistema base funcionando
- Conexión a APIs verificada
- Cache y rate limiting operativos

---

### **FASE 2: Stablecoin Mint/Burn Detection (3h)**
**Objetivo:** Detectar minteos/burns de stablecoins como señal de liquidez

**Componentes:**
- `StablecoinMonitor` service
- USDT tracking (Ethereum + Tron)
- USDC tracking (Ethereum + Polygon)
- Mint/burn event classification
- Market impact estimation algorithm

**Herramientas MCP:**
- `get_stablecoin_mints` - Minteos recientes con impacto
- `get_stablecoin_flows` - Flujos netos por período
- `analyze_mint_impact` - Correlación histórica mint→precio

**Algoritmos:**
```typescript
// Clasificación de impacto
if (mintAmount > $1B) return 'EXTREME_BULLISH';
if (mintAmount > $500M) return 'STRONG_BULLISH';
if (mintAmount > $100M) return 'MODERATE_BULLISH';
// Time to market: typically 2-6h for Tether, 6-24h for USDC
```

**Métricas de éxito:**
- Detección de >90% de mints mayores
- Latencia <5 min desde mint hasta alerta

---

### **FASE 3: Exchange Flow Analysis (3h)**
**Objetivo:** Monitorear flujos exchange↔cold wallets como indicador de presión

**Componentes:**
- `ExchangeFlowTracker` service
- Known address database (Binance, Coinbase, Kraken)
- Hot/Cold wallet classification
- Net flow calculation
- Anomaly detection for large moves

**Herramientas MCP:**
- `get_exchange_flows` - Flujos por exchange
- `detect_significant_moves` - Movimientos anómalos
- `get_exchange_reserves` - Estimación de reservas

**Señales clave:**
```typescript
// BTC leaving exchanges = Bullish (HODLing)
if (netOutflow > 5000 BTC/day) signal = 'STRONG_BULLISH';
// BTC entering exchanges = Bearish (potential selling)
if (netInflow > 3000 BTC/day) signal = 'BEARISH_WARNING';
```

**Métricas de éxito:**
- Tracking >80% de volumen de top 5 exchanges
- Detección de movimientos >$10M en <10 min

---

### **FASE 4: Whale Behavior Tracking (3h)**
**Objetivo:** Identificar y seguir comportamiento de grandes holders

**Componentes:**
- `WhaleTracker` service  
- Whale address identification (>1000 BTC or >10K ETH)
- Accumulation/distribution patterns
- New whale emergence detection
- Whale clustering analysis

**Herramientas MCP:**
- `get_whale_transactions` - Transacciones >$1M
- `track_whale_address` - Seguimiento específico
- `analyze_whale_behavior` - Patrones de comportamiento
- `detect_whale_accumulation` - Zonas de acumulación

**Patrones detectables:**
```typescript
interface WhalePattern {
  type: 'accumulation' | 'distribution' | 'dormant_awakening';
  addresses: string[];
  totalValue: number;
  timespan: number;
  marketPhase: 'bottom' | 'top' | 'trending';
}
```

**Métricas de éxito:**
- Identificación de >70% de transacciones whale
- Correlación >60% entre acumulación whale y rallies

---

### **FASE 5: Signal Integration & Alerts (2h)**
**Objetivo:** Combinar todas las señales en sistema unificado

**Componentes:**
- `OnChainSignalAggregator` service
- Signal scoring y priorización  
- Confluencia multi-señal
- Alert generation system
- Historical correlation tracker

**Herramientas MCP:**
- `get_onchain_summary` - Resumen completo
- `get_onchain_signals` - Señales activas priorizadas
- `analyze_signal_confluence` - Confluencias detectadas

**Sistema de scoring:**
```typescript
interface CompositeSignal {
  components: {
    stablecoinMint?: SignalComponent;
    exchangeFlow?: SignalComponent;
    whaleActivity?: SignalComponent;
  };
  totalScore: number;       // 0-100
  direction: 'BULLISH' | 'BEARISH';
  confidence: number;       // 0-100
  timeHorizon: string;      // "2-6h", "1-3d", etc
  actionableInsight: string;
}
```

---

### **FASE 6: Testing & Optimization (1h)**
**Objetivo:** Validar sistema completo y optimizar performance

**Componentes:**
- Integration tests completos
- Performance optimization
- Alert accuracy validation
- Documentation y ejemplos

**Métricas finales:**
- Sistema completo <1s response time
- >80% señales verificables históricamente
- <20% false positive rate

---

### **Total: 15 horas (6 fases manejables)**

---

## 🎯 Beneficios y Casos de Uso

### **Trading Signals**
1. **Early BTC pump detection**: Grandes minteos USDT → Buying pressure en 2-6h
2. **Exchange accumulation**: BTC moving to cold storage → Reduced sell pressure
3. **Whale activity**: Large accumulation → Potential price support
4. **Sell pressure warnings**: Large cold→hot movements → Potential dumps

### **Risk Management**
- **Liquidity monitoring**: Stablecoin flows indicating available buying power
- **Exchange risk**: Large outflows indicating reduced exchange reserves
- **Market manipulation**: Coordinated whale movements

### **Market Timing**
- **Entry timing**: Wait for stablecoin deployment after mints
- **Exit timing**: Anticipate sells before large exchange inflows
- **Confirmation**: Use on-chain data to confirm technical signals

---

## 🔮 Integration con Analysis Repository

### **Pattern Storage**
```typescript
// Storage para on-chain patterns
interface OnChainPattern {
  type: 'mint_to_pump' | 'outflow_to_rally' | 'whale_accumulation';
  trigger: OnChainSignal;
  priceImpact: {
    timeToImpact: number;
    maxPriceChange: number;
    duration: number;
  };
  success: boolean;
  confidence: number;
}

// Historical pattern matching
async findSimilarOnChainEvents(
  currentEvent: OnChainSignal
): Promise<OnChainPattern[]> {
  // Search historical patterns similar to current event
  // Return success rate and typical price impact
}
```

---

## ⚠️ Limitations y Considerations

### **Technical Limitations**
- **Rate limits**: APIs limitadas, necesita caching agresivo
- **Data lag**: Blockchain confirmations causan delay de 1-15 minutos
- **Address identification**: Muchas addresses unknown, reducing accuracy
- **Network costs**: Multiple blockchain queries pueden ser costosas

### **Market Limitations**
- **False signals**: No todos los mints resultan en buying pressure
- **Timing uncertainty**: Impact timing puede variar significativamente
- **Market conditions**: Bear markets pueden negar señales bullish on-chain

### **Implementation Considerations**
- **API costs**: Algunas APIs premium necesarias para datos quality
- **Storage requirements**: Large datasets para historical analysis
- **Processing power**: Real-time monitoring requiere significant resources

---

## ✅ Success Metrics

### **Technical KPIs**
- **Data freshness**: <5 minutos para eventos críticos
- **API uptime**: >99% availability
- **False positive rate**: <30% para signals
- **Coverage**: >80% de major on-chain events detectados

### **Business KPIs**  
- **Signal accuracy**: >60% de signals resultan en predicted price movement
- **Early warning**: Average 2-4h advance notice vs market reaction
- **ROI impact**: 10-20% improvement en trading performance

---

*Documento creado: 10/06/2025*
*Prioridad: MEDIA - Implementación post TASK-012*
*Dependencias: Stable TASK-009 + TASK-012 foundation*