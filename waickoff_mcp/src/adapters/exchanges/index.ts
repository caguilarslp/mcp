/**
 * @fileoverview Multi-Exchange System - Main Exports
 * @description Main entry point for all exchange-related functionality
 * @version 1.0.0 (TASK-026 FASE 1)
 */

// Common interfaces and base classes
export * from './common/index.js';

// Exchange adapters
export * from './binance/index.js';
export * from './bybit/index.js';

// Convenience imports
import { BinanceAdapter, createBinanceAdapter } from './binance/index.js';
import { BybitAdapter, createBybitAdapter } from './bybit/index.js';
import { IExchangeAdapter, SupportedExchange } from './common/index.js';
import { ICacheManager } from '../../types/storage.js';

/**
 * Exchange adapter factory implementation
 */
export class ExchangeAdapterFactory {
  private cache?: ICacheManager;

  constructor(cache?: ICacheManager) {
    this.cache = cache;
  }

  createAdapter(exchangeName: string, config?: any): IExchangeAdapter {
    switch (exchangeName.toLowerCase()) {
      case SupportedExchange.BINANCE:
        return createBinanceAdapter(config, this.cache);
      
      case SupportedExchange.BYBIT:
        return createBybitAdapter(config, this.cache);
      
      default:
        throw new Error(`Unsupported exchange: ${exchangeName}`);
    }
  }

  getSupportedExchanges(): string[] {
    return Object.values(SupportedExchange);
  }

  getDefaultConfig(exchangeName: string): any {
    switch (exchangeName.toLowerCase()) {
      case SupportedExchange.BINANCE:
        return {
          baseUrl: 'https://api.binance.com',
          timeout: 10000,
          retryAttempts: 3,
          enableCache: true,
          useTestnet: false
        };
      
      case SupportedExchange.BYBIT:
        return {
          baseUrl: 'https://api.bybit.com',
          timeout: 10000,
          retryAttempts: 3,
          enableCache: true,
          useTestnet: false
        };
      
      default:
        throw new Error(`No default config for exchange: ${exchangeName}`);
    }
  }
}

/**
 * Create exchange adapter factory
 */
export function createExchangeAdapterFactory(cache?: ICacheManager): ExchangeAdapterFactory {
  return new ExchangeAdapterFactory(cache);
}

/**
 * Quick adapter creation functions
 */
export const adapters = {
  binance: (config?: any, cache?: ICacheManager) => createBinanceAdapter(config, cache),
  bybit: (config?: any, cache?: ICacheManager) => createBybitAdapter(config, cache)
};

/**
 * Get all adapter creation functions
 */
export function getAllAdapterFactories() {
  return adapters;
}

/**
 * Test connection to all supported exchanges
 */
export async function testAllExchanges(cache?: ICacheManager): Promise<{
  [exchange: string]: {
    connected: boolean;
    latency?: number;
    error?: string;
  };
}> {
  const factory = createExchangeAdapterFactory(cache);
  const results: { [exchange: string]: any } = {};

  for (const exchangeName of factory.getSupportedExchanges()) {
    try {
      const adapter = factory.createAdapter(exchangeName);
      const startTime = Date.now();
      const connected = await adapter.testConnection();
      const latency = Date.now() - startTime;
      
      results[exchangeName] = {
        connected,
        latency: connected ? latency : undefined
      };
      
      await adapter.shutdown();
    } catch (error) {
      results[exchangeName] = {
        connected: false,
        error: (error as Error).message
      };
    }
  }

  return results;
}
