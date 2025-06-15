/**
 * @fileoverview Exchange Adapters - Common Exports
 * @description Export all common interfaces and types for exchange adapters
 * @version 1.0.0 (TASK-026 FASE 1)
 */

// Common interfaces and types
export {
  IExchangeAdapter,
  ExchangeHealth,
  ExchangeInfo,
  BaseExchangeConfig,
  ExchangeError,
  RateLimitError,
  UnsupportedSymbolError,
  ExchangeMaintenanceError,
  PerformanceCategory,
  getPerformanceCategory,
  STANDARD_INTERVALS,
  StandardInterval
} from './IExchangeAdapter.js';

// Multi-exchange types
export type {
  AggregatedTicker,
  CompositeOrderbook,
  SynchronizedKlines,
  ArbitrageOpportunity,
  ExchangeDivergence,
  ExchangeDominance,
  AggregationConfig,
  ExchangeRegistry,
  LiquidationCascade,
  ManipulationDetection,
  ExchangeCorrelation,
  MultiExchangeAnalytics,
  IExchangeAdapterFactory,
  SymbolMapping,
  SymbolRegistry
} from './types.js';

// Export enum as value
export { SupportedExchange } from './types.js';

// Base adapter
export { BaseExchangeAdapter } from './BaseExchangeAdapter.js';

// Exchange aggregator
export { ExchangeAggregator } from './ExchangeAggregator.js';
