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
// UTILITY TYPES
// ====================

export type TimeInterval = '1' | '3' | '5' | '15' | '30' | '60' | '120' | '240' | '360' | '720' | 'D' | 'M' | 'W';
export type AnalysisPeriod = '1h' | '4h' | '1d' | '7d';
export type VolumeInterval = '1' | '5' | '15' | '30' | '60' | '240' | 'D';

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
// EXPORT ALL TYPES
// ====================

// Note: All types are already exported individually above