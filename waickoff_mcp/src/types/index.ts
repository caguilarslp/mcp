/**
 * @fileoverview Core types and interfaces for the Bybit Market Analysis System
 * @description Centralized type definitions for all market data, analysis results, and system interfaces
 * @version 1.3.0
 * @author Bybit MCP Team
 */

// Import storage types
import type {
  IStorageService,
  FileMetadata,
  StorageConfig,
  StorageStats,
  StorageCategory,
  ICacheManager,
  CacheStats,
  CacheEntry,
  CacheConfig
} from './storage.js';

// ====================
// BOLLINGER BANDS ANALYSIS TYPES (TASK-023)
// ====================

export interface BollingerTargets {
  conservative: number;    // Target conservador (ej: 50% hacia media)
  normal: number;         // Target normal (ej: media móvil) 
  aggressive: number;     // Target agresivo (ej: banda opuesta)
  probability: {
    conservative: number; // Probabilidad 0-100
    normal: number;
    aggressive: number;
  };
}

export interface BollingerTargetConfig {
  minMovementPercent: number;      // 0.5% mínimo
  conservativeRatio: number;       // 0.3 (30% hacia media)
  aggressiveMultiplier: number;    // 1.27 para extensiones
  probabilityWeights: {
    volatility: number;            // Peso de volatilidad en probabilidad
    position: number;              // Peso de posición en banda  
    momentum: number;              // Peso de momentum
  };
}

// ====================
// MCP HANDLER TYPES
// ====================

export interface ToolHandler {
  (
    args: any
  ): Promise<MCPServerResponse>;
}

export interface ToolValidationResult {
  isValid: boolean;
  errors: string[];
}

// ====================
// CORE MARKET DATA TYPES
// ====================

export interface MarketTicker {
  symbol: string;
  lastPrice: number;
  price24hPcnt: number;
  highPrice24h: number;
  lowPrice24h: number;
  volume24h: number;
  bid1Price: number;
  ask1Price: number;
  timestamp: string;
}

export interface OrderbookLevel {
  price: number;
  size: number;
}

export interface Orderbook {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp: string;
  spread: number;
}

export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketCategory {
  spot: 'spot';
  linear: 'linear';
  inverse: 'inverse';
}

export type MarketCategoryType = keyof MarketCategory;

// ====================
// ANALYSIS RESULT TYPES
// ====================

export interface VolatilityAnalysis {
  symbol: string;
  period: string;
  currentPrice: number;
  highestPrice: number;
  lowestPrice: number;
  volatilityPercent: number;
  isGoodForGrid: boolean;
  recommendation: 'proceed' | 'wait' | 'high_risk';
  confidence: number;
}

export interface VolumeAnalysis {
  symbol: string;
  interval: string;
  avgVolume: number;
  currentVolume: number;
  maxVolume: number;
  minVolume: number;
  volumeSpikes: VolumeSpike[];
  vwap: VWAPData;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface VolumeSpike {
  timestamp: string;
  volume: number;
  multiplier: number;
  price: number;
}

export interface VWAPData {
  current: number;
  priceVsVwap: 'above' | 'below';
  difference: number;
}

export interface VolumeDelta {
  symbol: string;
  interval: string;
  current: number;
  average: number;
  bias: 'buyer' | 'seller' | 'neutral';
  strength: number;
  cumulativeDelta: number;
  divergence: DivergenceData;
  marketPressure: MarketPressure;
}

export interface DivergenceData {
  detected: boolean;
  type: string;
  signal: 'bullish_reversal' | 'bearish_reversal' | 'trend_confirmed';
}

export interface MarketPressure {
  bullishCandles: number;
  bearishCandles: number;
  bullishPercent: number;
  trend: 'strong_buying' | 'strong_selling' | 'balanced';
}

// ====================
// SUPPORT/RESISTANCE TYPES
// ====================

export interface SupportResistanceLevel {
  level: number;
  type: 'support' | 'resistance';
  strength: number;
  touches: number;
  volumeConfirmation: number;
  lastTouchTime: string;
  priceDistance: number;
  confidence: 'very_strong' | 'strong' | 'moderate' | 'weak';
}

export interface SupportResistanceAnalysis {
  symbol: string;
  interval: string;
  currentPrice: number;
  resistances: SupportResistanceLevel[];
  supports: SupportResistanceLevel[];
  criticalLevel: SupportResistanceLevel;
  gridConfig: GridConfiguration;
  statistics: SRStatistics;
}

export interface SRStatistics {
  totalPivotsFound: number;
  priceRangeAnalyzed: {
    high: number;
    low: number;
  };
  avgVolume: number;
  periodsAnalyzed: number;
  sensitivityUsed: number;
}

// ====================
// GRID TRADING TYPES
// ====================

export interface GridSuggestion {
  symbol: string;
  currentPrice: number;
  suggestedRange: {
    lower: number;
    upper: number;
  };
  gridLevels: number[];
  investment: number;
  pricePerGrid: number;
  potentialProfit: string;
  volatility24h: number;
  recommendation: 'recommended' | 'wait' | 'high_risk';
  confidence: number;
}

export interface GridConfiguration {
  optimalLowerBound: number;
  optimalUpperBound: number;
  keyLevels: number[];
  recommendedGridCount: number;
  recommendation: string;
}

// ====================
// TECHNICAL ANALYSIS TYPES
// ====================

export interface Pivot {
  index: number;
  price: number;
  timestamp: string;
  volume: number;
  type: 'support' | 'resistance';
  strength: number;
}

export interface TechnicalIndicators {
  vwap: number;
  sma: number[];
  ema: number[];
  rsi: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
}

// ====================
// API RESPONSE TYPES
// ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  executionTime?: number;
}

export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// MCP Server Response type for compatibility
export interface MCPServerResponse {
  [key: string]: unknown;
  _meta?: { [key: string]: unknown } | undefined;
}

// ====================
// SERVICE INTERFACES
// ====================

export interface IMarketDataService {
  getTicker(symbol: string, category?: MarketCategoryType): Promise<MarketTicker>;
  getOrderbook(symbol: string, category?: MarketCategoryType, limit?: number): Promise<Orderbook>;
  getKlines(symbol: string, interval?: string, limit?: number, category?: MarketCategoryType): Promise<OHLCV[]>;
  healthCheck(): Promise<boolean>;
  getPerformanceMetrics(): PerformanceMetrics[];
  // Cache management methods
  getCacheStats(): Promise<CacheStats>;
  invalidateCache(symbol: string, category?: MarketCategoryType): Promise<number>;
  clearCache(): Promise<void>;
}

export interface IAnalysisService {
  analyzeVolatility(symbol: string, period?: string): Promise<VolatilityAnalysis>;
  analyzeVolume(symbol: string, interval?: string, periods?: number): Promise<VolumeAnalysis>;
  analyzeVolumeDelta(symbol: string, interval?: string, periods?: number): Promise<VolumeDelta>;
  identifySupportResistance(symbol: string, interval?: string, periods?: number, sensitivity?: number): Promise<SupportResistanceAnalysis>;
  getPerformanceMetrics(): PerformanceMetrics[];
}

export interface ITradingService {
  suggestGridLevels(symbol: string, investment: number, gridCount?: number, category?: MarketCategoryType): Promise<GridSuggestion>;
  optimizeGridParameters(symbol: string, investment: number, targetReturn: number, riskTolerance: string): Promise<any>;
  getPerformanceMetrics(): PerformanceMetrics[];
}

// ====================
// CONFIGURATION TYPES
// ====================

export interface SystemConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  analysis: {
    defaultSensitivity: number;
    defaultPeriods: number;
    volumeThresholdMultiplier: number;
  };
  grid: {
    defaultGridCount: number;
    minVolatility: number;
    maxVolatility: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enablePerformanceTracking: boolean;
  };
}

// ====================
// ERROR TYPES
// ====================

export class MarketDataError extends Error {
  constructor(
    message: string,
    public code: string,
    public symbol?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    public analysisType: string,
    public symbol?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

// ====================
// TEMPORAL CONTEXT TYPES
// ====================

export interface TimezoneConfig {
  userTimezone: string;
  tradingSession: '24h' | 'market_hours';
  dateFormat: 'ISO' | 'local';
}

export interface TemporalContext {
  userTimezone: string;
  requestedTime: string; // En zona usuario
  utcTime: string;       // Para APIs  
  sessionContext: 'asia_session' | 'london_session' | 'ny_session' | 'london_ny_overlap' | 'off_hours';
  daysAgo?: number;
}

export interface AnalysisRequest {
  symbol: string;
  timeframe?: string;
  timezone?: string;
  localTime?: string;
  daysAgo?: number;
  context?: TemporalContext;
}

// ====================
// ENHANCED ANALYSIS TYPES WITH TIMEZONE
// ====================

export interface TimestampedAnalysis {
  analysis: any;
  temporalContext: TemporalContext;
  userFriendlyTime: string;
  tradingSession: string;
}

// ====================
// HISTORICAL ANALYSIS TYPES (TASK-017)
// ====================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface HistoricalKlines {
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

export interface HistoricalLevel {
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

export interface HistoricalSupportResistance {
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

export interface VolumeEvent {
  date: Date;
  type: 'spike' | 'drought' | 'accumulation' | 'distribution';
  volume: number;
  volumeRatio: number;  // vs average
  priceChange: number;
  significance: number;
  context?: string;     // e.g., "Listing announcement", "Major news"
}

export interface MarketCycle {
  type: 'bull' | 'bear' | 'accumulation' | 'distribution';
  startDate: Date;
  endDate?: Date;
  duration: number;     // days
  priceChange: number;  // percentage
  volumeProfile: 'increasing' | 'decreasing' | 'stable';
  keyLevels: number[]; // Important S/R during cycle
}

export interface PriceDistribution {
  symbol: string;
  timeframe: string;
  analysisDate: Date;
  totalVolume: number;
  priceRanges: {
    price: number;
    volume: number;
    percentage: number;
    frequency: number;
  }[];
  valueArea: {
    high: number;
    low: number;
    pointOfControl: number;
  };
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    skewness: number;
  };
}

// Historical Data Service Interface
export interface IHistoricalDataService {
  getHistoricalKlines(
    symbol: string,
    interval: 'D' | 'W' | 'M',
    startTime?: number,
    endTime?: number
  ): Promise<HistoricalKlines>;
  
  getSymbolInceptionDate(symbol: string): Promise<Date>;
  
  getHistoricalKlinesBatched(
    symbol: string,
    interval: string,
    batchSize: number
  ): AsyncGenerator<OHLCV[], void, unknown>;
}

// Historical Analysis Service Interface
export interface IHistoricalAnalysisService {
  analyzeHistoricalSupportResistance(
    symbol: string,
    timeframe: 'D' | 'W' | 'M',
    options: {
      minTouches?: number;
      tolerance?: number;
      volumeWeight?: boolean;
      recencyBias?: number;
    }
  ): Promise<HistoricalSupportResistance>;
  
  identifyVolumeEvents(
    symbol: string,
    timeframe: 'D' | 'W',
    threshold: number
  ): Promise<VolumeEvent[]>;
  
  analyzePriceDistribution(
    symbol: string,
    timeframe: 'D' | 'W'
  ): Promise<PriceDistribution>;
  
  identifyMarketCycles(
    symbol: string
  ): Promise<MarketCycle[]>;
}

// Historical Cache Service Interface
export interface IHistoricalCacheService {
cacheHistoricalAnalysis(
symbol: string,
type: 'support_resistance' | 'volume_events' | 'price_distribution' | 'market_cycles' | 'historical_klines',
data: any,
ttl?: number
): Promise<void>;

getCachedAnalysis(
symbol: string,
type: string
): Promise<any | null>;

invalidateHistoricalCache(symbol: string): Promise<void>;
  
    getCacheStats(): {
      totalEntries: number;
      totalMemoryUsage: number;
      hitRate: number;
      entriesByType: Record<string, number>;
      oldestEntry: number;
      newestEntry: number;
    };
    
    clearCache(): Promise<void>;
  }

// ====================
// UTILITY TYPES
// ====================

export type TimeInterval = '1' | '3' | '5' | '15' | '30' | '60' | '120' | '240' | '360' | '720' | 'D' | 'M' | 'W';
export type AnalysisPeriod = '1h' | '4h' | '1d' | '7d';
export type VolumeInterval = '1' | '5' | '15' | '30' | '60' | '240' | 'D';
export type HistoricalTimeframe = 'D' | 'W' | 'M';

// ====================
// SMART MONEY CONCEPTS TYPES (TASK-020)
// ====================

export interface SmartMoneyConfluence {
  id: string;
  types: Array<'orderBlock' | 'fairValueGap' | 'breakOfStructure'>;
  priceLevel: number;
  strength: number;
  zone: {
    upper: number;
    lower: number;
    midpoint: number;
  };
  components: {
    orderBlock?: OrderBlock;
    fairValueGap?: FairValueGap;
    structuralBreak?: StructuralBreak;
  };
  alignment: 'bullish' | 'bearish' | 'mixed';
  validUntil: string;
  description: string;
}

export interface SMCMarketBias {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  confidence: number;
  reasoning: string[];
  components: {
    orderBlockBias: 'bullish' | 'bearish' | 'neutral';
    fvgBias: 'bullish' | 'bearish' | 'neutral';
    structureBias: 'bullish' | 'bearish' | 'neutral';
  };
  confluenceSupport?: {
    strong: number;
    moderate: number;
    weak: number;
  };
  institutionalAlignment?: number;
  keyInfluencers?: string[];
  nextUpdateTime?: Date;
}

export interface SMCSetupValidation {
  isValid: boolean;
  setupScore: number;
  factors: {
    directionalAlignment: number;
    confluenceQuality: number;
    structureAlignment: number;
    institutionalPresence: number;
    riskRewardRatio: number;
  };
  optimalEntry: {
    price: number;
    zone: { min: number; max: number };
    reasoning: string;
  };
  riskManagement: {
    stopLoss: number;
    takeProfits: number[];
    positionSize: number;
    maxRisk: number;
    riskRewardRatio: number;
  };
  warnings: string[];
  alternativeScenarios: Array<{
    scenario: string;
    probability: number;
    action: string;
  }>;
  confidence: number;
  timestamp: string;
}

export interface SmartMoneyAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  confluences: SmartMoneyConfluence[];
  premiumDiscountZones: {
    premium: { start: number; end: number };
    discount: { start: number; end: number };
    equilibrium: number;
    currentZone: 'premium' | 'discount' | 'equilibrium';
  };
  institutionalActivity: {
    score: number;
    signals: string[];
    footprint: {
      orderBlockActivity: number;
      fvgCreation: number;
      structuralManipulation: number;
      confluenceStrength: number;
    };
    interpretation: string;
  };
  marketBias: SMCMarketBias;
  tradingRecommendations: Array<{
    action: 'buy' | 'sell' | 'wait';
    reasoning: string;
    entryZone: { min: number; max: number };
    targets: number[];
    stopLoss: number;
    confidence: number;
    timeframe: string;
  }>;
  keyLevels: Array<{
    price: number;
    type: string;
    strength: number;
    description: string;
  }>;
  statistics: {
    totalConfluences: number;
    strongConfluences: number;
    activeOrderBlocks: number;
    openFVGs: number;
    recentBOS: number;
    overallConfidence: number;
  };
  rawAnalysis: {
    orderBlocks: OrderBlockAnalysis;
    fairValueGaps: FVGAnalysis;
    breakOfStructure: MarketStructureAnalysis;
  };
  timestamp: Date | string;
}

export interface SMCConfig {
  confluenceThreshold: number;
  minConfluenceScore: number;
  biasStrengthThreshold: number;
  setupValidationMinScore: number;
  weights: {
    orderBlock: number;
    fairValueGap: number;
    breakOfStructure: number;
  };
  premiumDiscountThreshold: number;
  institutionalActivityThreshold: number;
}

// ====================
// FUTURE INTEGRATION TYPES (Waickoff AI)
// ====================

export interface LLMAnalysisRequest {
  symbol: string;
  analysisType: 'wyckoff' | 'pattern' | 'sentiment' | 'forecast';
  marketData: OHLCV[];
  technicalIndicators: TechnicalIndicators;
  context?: string;
}

export interface LLMAnalysisResponse {
  analysis: string;
  confidence: number;
  signals: string[];
  recommendation: 'buy' | 'sell' | 'hold' | 'wait';
  reasoning: string;
}

// ====================
// FASTAPI INTEGRATION TYPES
// ====================

export interface FastAPIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: string;
  params?: Record<string, any>;
}

export interface RestAPIResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  timestamp: string;
  version: string;
}

// ====================
// PERFORMANCE MONITORING
// ====================

export interface PerformanceMetrics {
  functionName: string;
  executionTime: number;
  memoryUsage: number;
  timestamp: string;
  success: boolean;
  errorType?: string;
}

// ====================
// STORAGE TYPES RE-EXPORTS
// ====================

export type {
  IStorageService,
  FileMetadata,
  StorageConfig,
  StorageStats,
  StorageCategory,
  ICacheManager,
  CacheStats,
  CacheEntry,
  CacheConfig,
  // Analysis Repository types
  IAnalysisRepository,
  AnalysisType,
  SavedAnalysis,
  AnalysisSummary,
  Pattern,
  PatternCriteria,
  Period,
  AggregatedMetrics,
  AnalysisQuery,
  RepositoryStats,
  // Report Generator types
  IReportGenerator,
  ReportType,
  ReportFormat,
  ReportOptions,
  ReportSection,
  ChartData,
  TableData,
  GeneratedReport
} from './storage.js';

// ====================
// CONFIGURATION TYPES
// ====================

export interface UserTimezoneConfig {
  default: string;
  autoDetect: boolean;
  preferredSessions?: string[];
}

export interface UserTradingConfig {
  defaultTimeframe: string;
  alertTimes?: string[];
}

export interface UserDisplayConfig {
  dateFormat: string;
  use24Hour: boolean;
  locale: string;
}

export interface UserConfig {
  timezone: UserTimezoneConfig;
  trading: UserTradingConfig;
  display: UserDisplayConfig;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimezoneDetectionResult {
  detected: string;
  method: 'system' | 'env' | 'intl' | 'default';
  confidence: number;
  fallback: string;
}

// Configuration Manager interface
export interface IConfigurationManager {
  getUserConfig(): Promise<UserConfig>;
  setUserTimezone(timezone: string, autoDetect?: boolean): Promise<UserConfig>;
  detectTimezone(): Promise<TimezoneDetectionResult>;
  updateConfig(updates: {
    timezone?: Partial<UserTimezoneConfig>;
    trading?: Partial<UserTradingConfig>;
    display?: Partial<UserDisplayConfig>;
  }): Promise<UserConfig>;
  resetConfig(): Promise<UserConfig>;
  validateConfig(): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }>;
  getConfigPath(): string;
  configExists(): Promise<boolean>;
}

// Re-export ConfigurationManager class
export { ConfigurationManager } from '../services/config/configurationManager.js';

// Re-export EnvironmentConfig class
export { EnvironmentConfig, environmentConfig } from '../services/config/environmentConfig.js';

// ====================
// TRAP DETECTION TYPES (TASK-012)
// ====================

export interface TrapTrigger {
  type: 'VOLUME' | 'ORDERBOOK' | 'PRICE_ACTION' | 'DIVERGENCE' | 'MOMENTUM';
  description: string;
  weight: number;      // Peso en la decisión final (0-100)
  value: number;       // Valor específico del trigger
  threshold: number;   // Umbral que se cruzó
  timestamp: number;
}

export interface TrapAnalysis {
  symbol: string;
  trapType: 'bull_trap' | 'bear_trap';
  probability: number;          // 0-100% probabilidad de trampa
  confidence: number;           // 0-100% confianza en detección
  triggers: TrapTrigger[];      // Señales que indican trampa
  priceTargets: number[];       // Niveles objetivo del movimiento
  timeWindow: string;           // Ventana de tiempo esperada
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  actionable: boolean;          // Si es accionable para trading
  keyLevel: number;             // Nivel S/R que se rompió
  currentPrice: number;         // Precio actual
  timestamp: string;
}

export interface TrapEvent {
  id: string;
  symbol: string;
  trapType: 'bull_trap' | 'bear_trap';
  detectedAt: string;
  resolvedAt?: string;
  keyLevel: number;
  breakoutPrice: number;
  currentPrice: number;
  maxPriceReached: number;
  actualTimeWindow: number;     // minutos que duró
  wasCorrect: boolean;
  triggers: TrapTrigger[];
  outcome: {
    priceReturned: boolean;
    targetHit: boolean;
    maxDrawdown: number;
    finalResult: 'confirmed_trap' | 'false_alarm' | 'ongoing';
  };
}

export interface TrapConfig {
  sensitivity: 'low' | 'medium' | 'high';
  volumeThreshold: number;        // Multiplicador volumen promedio
  orderbookDepthRatio: number;    // Ratio profundidad mínima
  timeWindowMinutes: number;      // Ventana máxima análisis
  minimumBreakout: number;        // % mínimo breakout para analizar
  confidenceThreshold: number;    // Confianza mínima para alertar
}

export interface TrapStatistics {
  symbol: string;
  period: string;
  totalTrapsDetected: number;
  bullTraps: number;
  bearTraps: number;
  accuracy: number;               // % de trampas correctamente identificadas
  falsePositives: number;
  avgDetectionTime: number;       // minutos promedio detección
  mostCommonTriggers: string[];
  profitability: {
    totalTrades: number;
    profitableTrades: number;
    avgReturn: number;
    maxDrawdown: number;
  };
}

export interface BreakoutContext {
  symbol: string;
  level: SupportResistanceLevel;
  breakoutPrice: number;
  breakoutTime: string;
  breakoutDirection: 'up' | 'down';
  volumeAtBreakout: number;
  avgVolume: number;
  priceChange: number;
  timeFromLevel: number;          // minutos desde último toque del nivel
}

export interface TrapDetectionResult {
  hasTrap: boolean;
  analysis?: TrapAnalysis;
  breakoutContext: BreakoutContext;
  nextAnalysisTime?: string;      // Cuándo revisar nuevamente
}

// Trap Detection Service Interface
export interface ITrapDetectionService {
  detectBullTrap(symbol: string, sensitivity?: 'low' | 'medium' | 'high'): Promise<TrapDetectionResult>;
  detectBearTrap(symbol: string, sensitivity?: 'low' | 'medium' | 'high'): Promise<TrapDetectionResult>;
  getTrapHistory(
    symbol: string, 
    days: number, 
    trapType?: 'bull' | 'bear' | 'both'
  ): Promise<TrapEvent[]>;
  getTrapStatistics(symbol: string, period: string): Promise<TrapStatistics>;
  configureTrapDetection(config: Partial<TrapConfig>): Promise<TrapConfig>;
  validateBreakout(symbol: string): Promise<BreakoutContext | null>;
  getPerformanceMetrics(): PerformanceMetrics[];
}

// ====================
// ORDER BLOCKS TYPES (TASK-020)
// ====================

namespace __deprecated_SM {

export interface OrderBlockZone {
  upper: number;
  lower: number;
  midpoint: number;
}

export interface OrderBlock {
  id: string;
  symbol: string;
  type: 'bullish' | 'bearish' | 'breaker';
  zone: OrderBlockZone;
  strength: number;           // 0-100 score
  validity: 'fresh' | 'tested' | 'mitigated' | 'breaker';
  respectCount: number;       // Número de veces respetado
  createdAt: string;
  lastTestedAt?: string;
  mitigatedAt?: string;
  volumeAtCreation: number;
  priceMovement: {
    distance: number;         // Distancia del movimiento posterior
    percentage: number;       // Porcentaje del movimiento
    timeToTarget: number;     // Tiempo en alcanzar objetivo (minutos)
  };
  institutionalSignals: {
    volumeMultiplier: number; // Multiplicador vs volumen promedio
    orderFlowImbalance: number; // Desequilibrio en orderflow
    absorptionLevel: number;   // Nivel de absorción detectado
  };
  currentDistance: number;   // Distancia actual del precio
  priceAtCreation: number;
  marketStructure: {
    swingHigh?: number;
    swingLow?: number;
    structureBreak: boolean;
  };
}

export interface OrderBlockAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  activeBlocks: OrderBlock[];
  nearestBlock?: OrderBlock;
  marketBias: 'bullish' | 'bearish' | 'neutral';
  keyLevels: {
    strongSupport: number[];
    strongResistance: number[];
  };
  statistics: {
    totalBlocks: number;
    freshBlocks: number;
    mitigatedBlocks: number;
    breakerBlocks: number;
    avgRespectRate: number;
  };
  tradingRecommendation: {
    action: 'buy' | 'sell' | 'wait' | 'monitor';
    confidence: number;
    reason: string;
    targets: number[];
    stopLoss?: number;
  };
}

export interface OrderBlockCreationContext {
  priceAction: {
    impulsiveMove: boolean;
    moveDistance: number;
    moveSpeed: number;        // Velocidad del movimiento
  };
  volumeProfile: {
    volumeSpike: boolean;
    volumeRatio: number;
    institutionalFootprint: boolean;
  };
  marketStructure: {
    structureBreak: boolean;
    liquidityGrab: boolean;
    failedPattern: boolean;
  };
}

export interface OrderBlockValidation {
  isValid: boolean;
  confidence: number;
  factors: {
    timeDecay: number;        // Deterioro por tiempo
    testCount: number;        // Número de pruebas
    volumeConfirmation: number; // Confirmación volumétrica
    structuralIntegrity: number; // Integridad estructural
  };
  nextExpiration?: string;   // Cuándo revisar validez
}

export interface OrderBlockConfig {
  minVolumeMultiplier: number;     // 1.5x volumen promedio mínimo
  minMovementPercent: number;      // 0.5% movimiento mínimo
  maxTestCount: number;            // Máximo número de pruebas antes de invalidar
  timeDecayHours: number;          // Horas para deterioro temporal
  institutionalThreshold: number;   // Umbral para señales institucionales
  breakerConversionRatio: number;  // Ratio para conversión a breaker
}

// Order Blocks Service Interface
export interface IOrderBlocksService {
  detectOrderBlocks(
    symbol: string,
    timeframe?: string,
    lookback?: number
  ): Promise<OrderBlockAnalysis>;
  
  validateOrderBlock(
    symbol: string,
    blockId: string
  ): Promise<OrderBlockValidation>;
  
  getOrderBlockZones(
    symbol: string,
    minStrength?: number,
    includeBreakers?: boolean
  ): Promise<OrderBlock[]>;
  
  trackOrderBlockMitigation(
    symbol: string,
    blockId: string
  ): Promise<{
    isMitigated: boolean;
    mitigationType: 'full' | 'partial' | 'none';
    timestamp?: string;
  }>;
  
  configureOrderBlocks(config: Partial<OrderBlockConfig>): Promise<OrderBlockConfig>;
  
  getPerformanceMetrics(): PerformanceMetrics[];
}

// ====================
// FAIR VALUE GAPS TYPES (TASK-020 FASE 2)
// ====================

export interface FairValueGap {
  id: string;
  type: 'bullish' | 'bearish';
  formation: {
    beforeCandle: OHLCV;
    gapCandle: OHLCV;
    afterCandle: OHLCV;
    timestamp: Date;
    candleIndex: number;
  };
  gap: {
    upper: number;
    lower: number;
    size: number;
    sizePercent: number;
    midpoint: number;
  };
  context: {
    trendDirection: 'up' | 'down' | 'sideways';
    impulsiveMove: boolean;
    volumeProfile: number;
    atr: number;
    significance: 'high' | 'medium' | 'low';
  };
  status: 'open' | 'partially_filled' | 'filled' | 'expired';
  filling: {
    fillProgress: number;
    firstTouch?: Date;
    fullFillTime?: Date;
    partialFills: Array<{
      timestamp: Date;
      price: number;
      fillPercentage: number;
    }>;
  };
  probability: {
    fill: number;
    timeToFill: number;
    confidence: number;
    factors: {
      size: number;
      trend: number;
      volume: number;
      age: number;
    };
  };
  targetZones: {
    conservative: number;
    normal: number;
    complete: number;
  };
  createdAt: Date;
  expirationTime?: Date;
}

export interface FVGAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  openGaps: FairValueGap[];
  filledGaps: FairValueGap[];
  nearestGap?: FairValueGap;
  statistics: {
    totalGapsDetected: number;
    openGaps: number;
    filledGaps: number;
    avgFillTime: number;
    fillRate: number;
    avgGapSize: number;
  };
  marketImbalance: {
    bullishGaps: number;
    bearishGaps: number;
    netImbalance: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  };
  tradingOpportunities?: any;
  timestamp: string;
}

export interface FVGConfig {
  minGapSize: number;
  maxGapSize: number;
  minVolumeRatio: number;
  maxGapAge: number;
  fillThreshold: number;
  significanceThresholds: {
    high: number;
    medium: number;
    low: number;
  };
  probabilityWeights: {
    size: number;
    trend: number;
    volume: number;
    age: number;
  };
}

export interface FVGStatistics {
  symbol: string;
  period: string;
  totalGaps: number;
  fillStatistics: {
    filled: number;
    partially: number;
    unfilled: number;
    fillRate: number;
    avgTimeToFill: number;
    fastestFill: number;
    slowestFill: number;
  };
  sizeDistribution: {
    small: number;
    medium: number;
    large: number;
    avgSize: number;
  };
  contextAnalysis: {
    inTrend: number;
    inConsolidation: number;
    afterNews: number;
    institutional: number;
  };
  performance: {
    accuracy: number;
    profitability: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

// Fair Value Gaps Service Interface
export interface IFairValueGapsService {
  findFairValueGaps(
    symbol: string,
    timeframe?: string,
    lookback?: number
  ): Promise<FVGAnalysis>;
  
  analyzeFVGFilling(
    symbol: string,
    timeframe?: string,
    lookbackDays?: number
  ): Promise<FVGStatistics>;
  
  getFilteredGaps(
    gaps: FairValueGap[],
    filters: {
      type?: 'bullish' | 'bearish';
      status?: 'open' | 'filled';
      minSize?: number;
      maxDistance?: number;
      currentPrice: number;
    }
  ): FairValueGap[];
  
  updateConfig(config: Partial<FVGConfig>): FVGConfig;
  getConfig(): FVGConfig;
  getPerformanceMetrics(): PerformanceMetrics[];
}

// ====================
// BREAK OF STRUCTURE TYPES (TASK-020 FASE 3)
// ====================

export interface MarketStructurePoint {
  timestamp: Date;
  price: number;
  type: 'higher_high' | 'lower_high' | 'higher_low' | 'lower_low';
  strength: number;        // 0-100 score basado en volumen y contexto
  volume: number;
  confirmed: boolean;
  index: number;           // Índice en los datos OHLCV
}

export interface StructuralBreak {
  id: string;
  type: 'BOS' | 'CHoCH';   // Break of Structure vs Change of Character
  direction: 'bullish' | 'bearish';
  breakPoint: {
    timestamp: Date;
    price: number;
    volume: number;
    index: number;
  };
  previousStructure: {
    pattern: 'higher_highs' | 'lower_lows' | 'consolidation';
    duration: number;      // Duración en periodos
    strength: number;      // Fuerza de la estructura previa
  };
  significance: 'major' | 'minor' | 'false';
  confirmation: {
    volumeConfirmed: boolean;
    followThrough: boolean;     // Si hubo seguimiento del movimiento
    retestLevel?: number;       // Precio de retest si aplica
    retestTime?: Date;
  };
  institutionalFootprint: {
    orderBlockPresent: boolean;
    fvgPresent: boolean;
    liquidityGrab: boolean;
    absorptionDetected: boolean;
  };
  targets: {
    conservative: number;
    normal: number;
    aggressive: number;
  };
  invalidationLevel: number;   // Nivel que invalidaría el BOS
  probability: number;         // 0-100 probabilidad de continuación
  createdAt: Date;
  resolvedAt?: Date;
  outcome?: 'success' | 'failure' | 'pending';
}

export interface MarketStructureAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  trend: {
    shortTerm: 'bullish' | 'bearish' | 'sideways';
    mediumTerm: 'bullish' | 'bearish' | 'sideways';
    longTerm: 'bullish' | 'bearish' | 'sideways';
    confidence: number;
  };
  structurePoints: MarketStructurePoint[];
  activeBreaks: StructuralBreak[];
  recentBreaks: StructuralBreak[];
  currentStructure: {
    type: 'uptrend' | 'downtrend' | 'range' | 'transition' | 'sideways';
    strength: number;
    duration: number;          // Periodos desde inicio
    keyLevels: number[];       // Niveles estructurales clave
  };
  marketBias: {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;          // 0-100
    confidence: number;        // 0-100
    reasoning: string[];
  };
  tradingOpportunities?: any;
  nexteDecisionPoints?: any;
  timestamp: Date | string;
}

export interface StructureShiftValidation {
  isValid: boolean;
  confidence: number;
  factors: {
    volumeConfirmation: number;    // 0-100
    priceAction: number;           // 0-100
    institutionalSignals: number;  // 0-100
    timeConfirmation: number;      // 0-100
    structuralIntegrity: number;   // 0-100
  };
  warnings: string[];
  nextValidationTime?: Date;
  invalidationScenarios: Array<{
    trigger: string;
    price: number;
    probability: number;
  }>;
}

export interface BOSConfig {
  minBreakDistance: number;      // % mínimo para considerar ruptura
  volumeThreshold: number;       // Multiplicador volumen promedio
  confirmationPeriods: number;   // Periodos para confirmar ruptura
  retestTolerance: number;       // % tolerancia para retest
  structureMemory: number;       // Periodos de memoria estructural
  significanceThresholds: {
    major: number;               // Umbral para BOS mayor
    minor: number;               // Umbral para BOS menor
  };
  institutionalWeight: number;   // Peso de señales institucionales
}

// Break of Structure Service Interface
export interface IBreakOfStructureService {
  detectBreakOfStructure(
    symbol: string,
    timeframe?: string,
    lookback?: number
  ): Promise<MarketStructureAnalysis>;
  
  analyzeMarketStructure(
    symbol: string,
    timeframe?: string
  ): Promise<MarketStructureAnalysis>;
  
  validateStructureShift(
    symbol: string,
    breakId: string
  ): Promise<StructureShiftValidation>;
  
  getStructuralLevels(
    symbol: string,
    includeHistorical?: boolean
  ): Promise<{
    support: number[];
    resistance: number[];
    pivotPoints: MarketStructurePoint[];
  }>;
  
  trackStructureDevelopment(
    symbol: string,
    breakId: string
  ): Promise<{
    currentStatus: 'developing' | 'confirmed' | 'failed';
    progress: number;
    nextMilestone: string;
    timeToNextCheck: number;
  }>;
  
  updateConfig(config: Partial<BOSConfig>): BOSConfig;
  getBOSConfig(): BOSConfig;
  getPerformanceMetrics(): PerformanceMetrics[];
}

// ====================
// SMART MONEY ANALYSIS INTEGRATION TYPES (TASK-020 FASE 4)
// ====================

export interface SmartMoneyConfluence {
  id: string;
  types: Array<'orderBlock' | 'fairValueGap' | 'breakOfStructure'>;
  priceLevel: number;
  strength: number;           // 0-100 score de confluencia
  zone: {
    upper: number;
    lower: number;
    midpoint: number;
  };
  components: {
    orderBlock?: OrderBlock;
    fairValueGap?: FairValueGap;
    structuralBreak?: StructuralBreak;
  };
  alignment: 'bullish' | 'bearish' | 'mixed';
  validUntil: string;
  description: string;
}

export interface SMCMarketBias {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;           // 0-100
  confidence: number;         // 0-100
  reasoning: string[];
  components: {
    orderBlockBias: 'bullish' | 'bearish' | 'neutral';
    fvgBias: 'bullish' | 'bearish' | 'neutral';
    structureBias: 'bullish' | 'bearish' | 'neutral';
  };
  confluenceSupport?: {
    strong: number;
    moderate: number;
    weak: number;
  };
  institutionalAlignment?: number;
  keyInfluencers?: string[];
  nextUpdateTime?: Date;
}

export interface SMCSetupValidation {
  isValid: boolean;
  setupScore: number;         // 0-100
  factors: {
    directionalAlignment: number;
    confluenceQuality: number;
    structureAlignment: number;
    institutionalPresence: number;
    riskRewardRatio: number;
  };
  optimalEntry: {
    price: number;
    zone: { min: number; max: number };
    reasoning: string;
  };
  riskManagement: {
    stopLoss: number;
    takeProfits: number[];
    positionSize: number;
    maxRisk: number;
    riskRewardRatio: number;
  };
  warnings: string[];
  alternativeScenarios: Array<{
    scenario: string;
    probability: number;
    action: string;
  }>;
  confidence: number;
  timestamp: string;
}

export interface SmartMoneyAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  confluences: SmartMoneyConfluence[];
  premiumDiscountZones: {
    premium: { start: number; end: number };
    discount: { start: number; end: number };
    equilibrium: number;
    currentZone: 'premium' | 'discount' | 'equilibrium';
  };
  institutionalActivity: {
    score: number;
    signals: string[];
    footprint: {
      orderBlockActivity: number;
      fvgCreation: number;
      structuralManipulation: number;
      confluenceStrength: number;
    };
    interpretation: string;
  };
  marketBias: SMCMarketBias;
  tradingRecommendations: Array<{
    action: 'buy' | 'sell' | 'wait';
    reasoning: string;
    entryZone: { min: number; max: number };
    targets: number[];
    stopLoss: number;
    confidence: number;
    timeframe: string;
  }>;
  keyLevels: Array<{
    price: number;
    type: string;
    strength: number;
    description: string;
  }>;
  statistics: {
    totalConfluences: number;
    strongConfluences: number;
    activeOrderBlocks: number;
    openFVGs: number;
    recentBOS: number;
    overallConfidence: number;
  };
  rawAnalysis: {
    orderBlocks: OrderBlockAnalysis;
    fairValueGaps: FVGAnalysis;
    breakOfStructure: MarketStructureAnalysis;
  };
  timestamp: string;
}

export interface SMCConfig {
  confluenceThreshold: number;        // Distancia máxima para confluencia
  minConfluenceScore: number;         // Score mínimo para confluencia válida
  biasStrengthThreshold: number;      // Umbral para bias fuerte
  setupValidationMinScore: number;    // Score mínimo para setup válido
  weights: {
    orderBlock: number;               // Peso Order Blocks
    fairValueGap: number;             // Peso FVGs
    breakOfStructure: number;         // Peso BOS
  };
  premiumDiscountThreshold: number;   // Para determinar zonas premium/discount
  institutionalActivityThreshold: number; // Umbral actividad institucional
}

// Smart Money Analysis Service Interface
export interface ISmartMoneyAnalysisService {
  analyzeSmartMoneyConfluence(
    symbol: string,
    timeframe?: string,
    lookback?: number
  ): Promise<SmartMoneyAnalysis>;
  
  getSMCMarketBias(
    symbol: string,
    timeframe?: string
  ): Promise<SMCMarketBias>;
  
  validateSMCSetup(
    symbol: string,
    setupType: 'long' | 'short',
    entryPrice?: number
  ): Promise<SMCSetupValidation>;
  
  updateConfig(config: Partial<SMCConfig>): SMCConfig;
  getConfig(): SMCConfig;
  getPerformanceMetrics(): PerformanceMetrics[];
}

} // <-- close __deprecated_SM namespace

// ====================
// EXPORT ALL TYPES
// ====================

// Note: All types are already exported individually above

// Re-import canonical Smart Money service types and re-export them here so that
// every module can rely on a single unified definition. This avoids structural
// mismatches when the same logical model is declared in multiple places.

// Import types from SMC services
import type {
  OrderBlock as OrderBlockType,
  OrderBlockAnalysis as OrderBlockAnalysisType
} from '../services/smartMoney/orderBlocks.js';

import type {
  FairValueGap as FairValueGapType,
  FVGAnalysis as FVGAnalysisType
} from '../services/smartMoney/fairValueGaps.js';

import type {
  StructuralBreak as StructuralBreakType,
  MarketStructurePoint as MarketStructurePointType,
  MarketStructureAnalysis as MarketStructureAnalysisType
} from '../services/smartMoney/breakOfStructure.js';

// Re-export with proper names so downstream code can use types from this module
export type OrderBlock = OrderBlockType;
export type OrderBlockAnalysis = OrderBlockAnalysisType;
export type FairValueGap = FairValueGapType;
export type FVGAnalysis = FVGAnalysisType;
export type MarketStructurePoint = MarketStructurePointType;
export type MarketStructureAnalysis = MarketStructureAnalysisType;
export type StructuralBreak = StructuralBreakType;
export type StructureShiftValidation = __deprecated_SM.StructureShiftValidation;
export type BOSConfig = __deprecated_SM.BOSConfig;
export type IBreakOfStructureService = __deprecated_SM.IBreakOfStructureService;