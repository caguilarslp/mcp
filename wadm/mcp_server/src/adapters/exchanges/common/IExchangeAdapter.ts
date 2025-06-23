/**
 * @fileoverview Exchange Adapter Interface - Multi-Exchange Support
 * @description Common interface for all exchange adapters to ensure consistency
 * @version 1.0.0 (TASK-026 FASE 1)
 */

import {
  MarketTicker,
  Orderbook,
  OHLCV,
  MarketCategoryType,
  PerformanceMetrics
} from '../../../types/index.js';

/**
 * Health status for exchange adapters
 */
export interface ExchangeHealth {
  isHealthy: boolean;
  latency: number;
  lastSuccessfulCall: Date;
  errorCount: number;
  errorRate: number;  // errors per minute
}

/**
 * Exchange metadata and configuration
 */
export interface ExchangeInfo {
  name: string;
  displayName: string;
  weight: number;           // Weight for aggregation (0-1)
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  capabilities: {
    spot: boolean;
    futures: boolean;
    options: boolean;
    websocket: boolean;
  };
  regions: string[];        // Geographical regions served
  version: string;
}

/**
 * Common interface that all exchange adapters must implement
 */
export interface IExchangeAdapter {
  /**
   * Get exchange information and capabilities
   */
  getExchangeInfo(): ExchangeInfo;

  /**
   * Get current ticker data for a symbol
   */
  getTicker(symbol: string, category?: MarketCategoryType): Promise<MarketTicker>;

  /**
   * Get orderbook depth for a symbol
   */
  getOrderbook(
    symbol: string, 
    category?: MarketCategoryType, 
    limit?: number
  ): Promise<Orderbook>;

  /**
   * Get historical OHLCV data
   */
  getKlines(
    symbol: string,
    interval?: string,
    limit?: number,
    category?: MarketCategoryType
  ): Promise<OHLCV[]>;

  /**
   * Check if the exchange is healthy and responsive
   */
  healthCheck(): Promise<ExchangeHealth>;

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): PerformanceMetrics[];

  /**
   * Get exchange name (unique identifier)
   */
  getName(): string;

  /**
   * Get exchange weight for aggregation calculations
   */
  getWeight(): number;

  /**
   * Normalize symbol format to exchange-specific format
   * @param symbol Standard symbol (e.g., BTCUSDT)
   * @returns Exchange-specific symbol format
   */
  normalizeSymbol(symbol: string): string;

  /**
   * Standardize symbol from exchange format to common format
   * @param exchangeSymbol Exchange-specific symbol
   * @returns Standard symbol format
   */
  standardizeSymbol(exchangeSymbol: string): string;

  /**
   * Get supported symbols for this exchange
   */
  getSupportedSymbols(category?: MarketCategoryType): Promise<string[]>;

  /**
   * Test connection with minimal API call
   */
  testConnection(): Promise<boolean>;

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): Promise<{
    remaining: number;
    reset: Date;
    limit: number;
  }>;

  /**
   * Handle graceful shutdown and cleanup
   */
  shutdown(): Promise<void>;
}

/**
 * Base configuration for all exchange adapters
 */
export interface BaseExchangeConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  enableCache: boolean;
  cacheTTL: {
    ticker: number;
    orderbook: number;
    klines: number;
  };
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
  };
}

/**
 * Error types specific to exchange operations
 */
export class ExchangeError extends Error {
  constructor(
    message: string,
    public exchangeName: string,
    public code: string,
    public symbol?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ExchangeError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends ExchangeError {
  constructor(
    exchangeName: string,
    retryAfter: number,
    symbol?: string
  ) {
    super(
      `Rate limit exceeded for ${exchangeName}. Retry after ${retryAfter}ms`,
      exchangeName,
      'RATE_LIMIT_EXCEEDED',
      symbol
    );
    this.retryAfter = retryAfter;
  }

  public retryAfter: number;
}

/**
 * Symbol not supported error
 */
export class UnsupportedSymbolError extends ExchangeError {
  constructor(exchangeName: string, symbol: string) {
    super(
      `Symbol ${symbol} is not supported by ${exchangeName}`,
      exchangeName,
      'UNSUPPORTED_SYMBOL',
      symbol
    );
  }
}

/**
 * Exchange maintenance mode error
 */
export class ExchangeMaintenanceError extends ExchangeError {
  constructor(exchangeName: string, estimatedDowntime?: number) {
    super(
      `${exchangeName} is currently under maintenance`,
      exchangeName,
      'MAINTENANCE_MODE'
    );
    this.estimatedDowntime = estimatedDowntime;
  }

  public estimatedDowntime?: number;
}

/**
 * Response time performance categories
 */
export enum PerformanceCategory {
  EXCELLENT = 'excellent',  // < 100ms
  GOOD = 'good',           // 100-300ms
  AVERAGE = 'average',     // 300-1000ms
  POOR = 'poor',           // 1000-3000ms
  CRITICAL = 'critical'    // > 3000ms
}

/**
 * Get performance category based on response time
 */
export function getPerformanceCategory(responseTime: number): PerformanceCategory {
  if (responseTime < 100) return PerformanceCategory.EXCELLENT;
  if (responseTime < 300) return PerformanceCategory.GOOD;
  if (responseTime < 1000) return PerformanceCategory.AVERAGE;
  if (responseTime < 3000) return PerformanceCategory.POOR;
  return PerformanceCategory.CRITICAL;
}

/**
 * Standard intervals mapping for different exchanges
 */
export const STANDARD_INTERVALS = {
  '1m': '1',
  '3m': '3',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '2h': '120',
  '4h': '240',
  '6h': '360',
  '12h': '720',
  '1d': 'D',
  '1w': 'W',
  '1M': 'M'
} as const;

export type StandardInterval = keyof typeof STANDARD_INTERVALS;
