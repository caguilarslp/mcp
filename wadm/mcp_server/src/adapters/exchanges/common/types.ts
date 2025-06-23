/**
 * @fileoverview Multi-Exchange Types - TASK-026 FASE 1
 * @description Type definitions specific to multi-exchange operations
 * @version 1.0.0
 */

import {
  MarketTicker,
  Orderbook,
  OHLCV,
  MarketCategoryType
} from '../../../types/index.js';

import { IExchangeAdapter, ExchangeHealth, ExchangeInfo } from './IExchangeAdapter.js';

/**
 * Supported exchange identifiers - ENUM (not type)
 */
export enum SupportedExchange {
  BYBIT = 'bybit',
  BINANCE = 'binance'
}

/**
 * Aggregated ticker data from multiple exchanges
 */
export interface AggregatedTicker extends MarketTicker {
  exchanges: {
    [exchangeName: string]: {
      ticker: MarketTicker;
      weight: number;
      responseTime: number;
    };
  };
  weightedPrice: number;
  priceDeviation: number;      // Standard deviation across exchanges
  volumeTotal: number;         // Total volume across exchanges
  priceRange: {
    min: number;
    max: number;
    spread: number;
  };
  confidence: number;          // 0-100 based on data consistency
  timestamp: string;
}

/**
 * Composite orderbook from multiple exchanges
 */
export interface CompositeOrderbook extends Orderbook {
  exchanges: {
    [exchangeName: string]: {
      orderbook: Orderbook;
      weight: number;
      contribution: number;    // % of total liquidity
    };
  };
  aggregatedDepth: {
    totalBidVolume: number;
    totalAskVolume: number;
    weightedSpread: number;
    liquidityScore: number;
  };
  arbitrageOpportunities: ArbitrageOpportunity[];
  timestamp: string;
}

/**
 * Synchronized OHLCV data across exchanges
 */
export interface SynchronizedKlines {
  symbol: string;
  interval: string;
  exchanges: {
    [exchangeName: string]: {
      klines: OHLCV[];
      weight: number;
      dataQuality: number;     // 0-100 completeness score
    };
  };
  aggregatedKlines: OHLCV[];   // Volume-weighted aggregated data
  synchronizationGaps: {
    [exchangeName: string]: {
      missingPeriods: string[];
      dataLag: number;         // milliseconds behind
    };
  };
  confidence: number;
  timestamp: string;
}

/**
 * Arbitrage opportunity detection
 */
export interface ArbitrageOpportunity {
  type: 'price' | 'triangular' | 'statistical';
  buyExchange: string;
  sellExchange: string;
  symbol: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;              // percentage
  potentialProfit: number;     // percentage after fees
  volume: number;              // maximum tradeable volume
  timeWindow: number;          // estimated seconds opportunity will last
  confidence: number;          // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  fees: {
    buyFee: number;
    sellFee: number;
    totalFees: number;
  };
  timestamp: string;
}

/**
 * Exchange divergence detection
 */
export interface ExchangeDivergence {
  type: 'price' | 'volume' | 'structure' | 'momentum';
  symbol: string;
  leadExchange: string;        // Exchange leading the move
  lagExchange: string;         // Exchange lagging behind
  magnitude: number;           // Size of divergence (percentage)
  duration: number;            // How long divergence has persisted (minutes)
  opportunity: 'arbitrage' | 'momentum' | 'reversal' | 'none';
  confidence: number;          // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  priceTarget?: number;        // Expected convergence price
  timeToConvergence?: number;  // Estimated minutes
  historicalPattern?: {
    frequency: number;         // How often this pattern occurs
    averageResolution: number; // Average time to resolve (minutes)
    successRate: number;       // Historical success rate (percentage)
  };
  timestamp: string;
}

/**
 * Exchange dominance metrics
 */
export interface ExchangeDominance {
  symbol: string;
  timeframe: string;
  dominanceByExchange: {
    [exchangeName: string]: {
      volumeShare: number;     // % of total volume
      priceInfluence: number;  // Impact on aggregated price
      liquidityShare: number;  // % of total liquidity
      momentumLeadership: number; // How often it leads price moves
    };
  };
  marketLeader: string;        // Exchange with highest overall influence
  volumeMigration: {
    trend: 'centralizing' | 'decentralizing' | 'stable';
    rate: number;              // % change per period
    direction: string;         // Which exchange is gaining/losing share
  };
  institutionalPreference: {
    [exchangeName: string]: number; // 0-100 institutional usage score
  };
  timestamp: string;
}

/**
 * Multi-exchange aggregation configuration
 */
export interface AggregationConfig {
  weights: {
    [exchangeName: string]: number; // 0-1, must sum to 1
  };
  qualityThresholds: {
    minResponseTime: number;     // milliseconds
    maxErrorRate: number;        // errors per minute
    minDataCompleteness: number; // 0-100
  };
  arbitrageDetection: {
    enabled: boolean;
    minSpread: number;           // minimum % spread to consider
    maxLatency: number;          // max acceptable latency for opportunities
  };
  divergenceTracking: {
    enabled: boolean;
    priceThreshold: number;      // % price difference to flag
    volumeThreshold: number;     // % volume difference to flag
    durationThreshold: number;   // minutes before flagging persistent divergence
  };
  healthMonitoring: {
    checkInterval: number;       // seconds between health checks
    failureThreshold: number;    // consecutive failures before marking unhealthy
    recoveryThreshold: number;   // consecutive successes before marking healthy
  };
}

/**
 * Multi-exchange registry for managing multiple adapters
 */
export interface ExchangeRegistry {
  adapters: Map<string, IExchangeAdapter>;
  configs: Map<string, AggregationConfig>;
  health: Map<string, ExchangeHealth>;
  
  // Registry management methods
  registerExchange(name: string, adapter: IExchangeAdapter): void;
  unregisterExchange(name: string): void;
  getAdapter(name: string): IExchangeAdapter | undefined;
  getAllAdapters(): IExchangeAdapter[];
  getHealthyAdapters(): IExchangeAdapter[];
  
  // Health monitoring
  updateHealth(name: string, health: ExchangeHealth): void;
  getAggregateHealth(): {
    totalExchanges: number;
    healthyExchanges: number;
    avgLatency: number;
    avgErrorRate: number;
  };
}

/**
 * Liquidation cascade prediction data
 */
export interface LiquidationCascade {
  symbol: string;
  liquidationLevels: {
    price: number;
    estimatedVolume: number;
    exchange: string;
    type: 'long' | 'short';
  }[];
  cascadeProbability: number;  // 0-100
  estimatedImpact: {
    priceMovement: number;     // % expected move
    duration: number;          // minutes
    volumeSpike: number;       // volume multiplier
  };
  triggerLevel: number;        // Price that would trigger cascade
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

/**
 * Cross-exchange manipulation detection
 */
export interface ManipulationDetection {
  type: 'spoofing' | 'wash_trading' | 'pump_dump' | 'stop_hunting';
  symbol: string;
  primaryExchange: string;     // Where manipulation is strongest
  secondaryExchanges: string[]; // Affected exchanges
  manipulationScore: number;   // 0-100 confidence score
  evidence: {
    priceAnomaly: boolean;
    volumeAnomaly: boolean;
    orderbookAnomaly: boolean;
    timingAnomaly: boolean;
  };
  estimatedDuration: number;   // minutes
  potentialTargets: number[];  // Price targets of manipulation
  riskForTraders: 'low' | 'medium' | 'high';
  recommendedAction: 'avoid' | 'monitor' | 'counter_trade' | 'follow';
  timestamp: string;
}

/**
 * Exchange correlation metrics
 */
export interface ExchangeCorrelation {
  symbol: string;
  timeframe: string;
  correlationMatrix: {
    [exchange1: string]: {
      [exchange2: string]: {
        priceCorrelation: number;    // -1 to 1
        volumeCorrelation: number;   // -1 to 1
        timeLag: number;             // milliseconds
        strength: 'weak' | 'moderate' | 'strong';
      };
    };
  };
  avgCorrelation: number;
  marketCohesion: number;        // How synchronized all exchanges are
  outlierExchanges: string[];    // Exchanges with unusual behavior
  timestamp: string;
}

/**
 * Multi-exchange analytics summary
 */
export interface MultiExchangeAnalytics {
  symbol: string;
  timeframe: string;
  
  // Aggregated data
  aggregatedTicker?: AggregatedTicker;
  compositeOrderbook?: CompositeOrderbook;
  synchronizedKlines?: SynchronizedKlines;
  
  // Market insights
  dominance: ExchangeDominance;
  correlation: ExchangeCorrelation;
  arbitrageOpportunities: ArbitrageOpportunity[];
  divergences: ExchangeDivergence[];
  
  // Risk assessment
  liquidationRisk?: LiquidationCascade;
  manipulationRisk?: ManipulationDetection;
  
  // Quality metrics
  dataQuality: {
    completeness: number;      // % of expected data received
    consistency: number;       // How consistent data is across exchanges
    timeliness: number;        // How fresh the data is
    reliability: number;       // Overall reliability score
  };
  
  timestamp: string;
}

/**
 * Exchange adapter factory interface
 */
export interface IExchangeAdapterFactory {
  createAdapter(exchangeName: string, config?: any): IExchangeAdapter;
  getSupportedExchanges(): string[];
  getDefaultConfig(exchangeName: string): any;
}

/**
 * Exchange-specific symbol mapping
 */
export interface SymbolMapping {
  standard: string;           // Standard format (BTCUSDT)
  exchange: string;           // Exchange-specific format
  category: MarketCategoryType;
  isActive: boolean;
  lastUpdated: Date;
}

/**
 * Symbol registry for cross-exchange compatibility
 */
export interface SymbolRegistry {
  mappings: Map<string, Map<string, SymbolMapping>>; // exchange -> symbol -> mapping
  
  // Registry methods
  addMapping(exchange: string, standard: string, exchangeSpecific: string): void;
  getMapping(exchange: string, symbol: string): SymbolMapping | undefined;
  standardizeSymbol(exchange: string, exchangeSymbol: string): string | undefined;
  normalizeSymbol(exchange: string, standardSymbol: string): string | undefined;
  getSupportedSymbols(exchange?: string): string[];
  
  // Batch operations
  updateMappings(exchange: string, mappings: SymbolMapping[]): void;
  validateSymbol(exchange: string, symbol: string): boolean;
}
