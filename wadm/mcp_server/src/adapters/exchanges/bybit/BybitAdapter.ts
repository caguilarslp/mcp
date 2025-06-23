/**
 * @fileoverview Bybit Exchange Adapter - Refactored for Multi-Exchange
 * @description Bybit API implementation following the common exchange interface
 * @version 2.0.0 (TASK-026 FASE 1 - Refactored from existing marketData.ts)
 */

import {
  MarketTicker,
  Orderbook,
  OHLCV,
  MarketCategoryType
} from '../../../types/index.js';

import {
  BaseExchangeAdapter
} from '../common/BaseExchangeAdapter.js';

import {
  ExchangeInfo,
  BaseExchangeConfig,
  ExchangeError,
  UnsupportedSymbolError
} from '../common/IExchangeAdapter.js';

import { ICacheManager } from '../../../types/storage.js';

/**
 * Bybit-specific configuration
 */
interface BybitConfig extends BaseExchangeConfig {
  useTestnet: boolean;
}

/**
 * Bybit API response wrapper
 */
interface BybitApiResponse<T> {
  retCode: number;
  retMsg: string;
  result: T;
  time: number;
}

/**
 * Bybit ticker response
 */
interface BybitTickerResult {
  list: Array<{
    symbol: string;
    lastPrice: string;
    price24hPcnt: string;
    highPrice24h: string;
    lowPrice24h: string;
    volume24h: string;
    bid1Price: string;
    ask1Price: string;
  }>;
}

/**
 * Bybit orderbook response  
 */
interface BybitOrderbookResult {
  s: string;  // symbol
  b: string[][]; // bids
  a: string[][]; // asks
  ts: number;    // timestamp
  u: number;     // update id
}

/**
 * Bybit klines response
 */
interface BybitKlinesResult {
  list: string[][]; // [timestamp, open, high, low, close, volume, ...]
}

/**
 * Bybit Exchange Info
 */
interface BybitExchangeInfoResult {
  list: Array<{
    symbol: string;
    status: string;
    baseCoin: string;
    quoteCoin: string;
  }>;
}

/**
 * Bybit Exchange Adapter - Refactored from existing marketData service
 */
export class BybitAdapter extends BaseExchangeAdapter {
  private supportedSymbols: Set<string> = new Set();
  private symbolsLastUpdated: Date = new Date(0);
  private readonly symbolsCacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config?: Partial<BybitConfig>, cache?: ICacheManager) {
    const defaultConfig: BybitConfig = {
      baseUrl: config?.useTestnet 
        ? 'https://api-testnet.bybit.com'
        : 'https://api.bybit.com',
      timeout: 10000,
      retryAttempts: 3,
      enableCache: true,
      cacheTTL: {
        ticker: 30 * 1000,      // 30 seconds
        orderbook: 15 * 1000,   // 15 seconds  
        klines: 5 * 60 * 1000   // 5 minutes
      },
      rateLimit: {
        enabled: true,
        requestsPerMinute: 600,   // Bybit public rate limit
        burstLimit: 5
      },
      useTestnet: false,
      ...config
    };

    const exchangeInfo: ExchangeInfo = {
      name: 'bybit',
      displayName: 'Bybit',
      weight: 0.4, // Lower weight compared to Binance
      baseUrl: defaultConfig.baseUrl,
      rateLimit: {
        requestsPerMinute: 600,
        burstLimit: 5
      },
      capabilities: {
        spot: true,
        futures: true,
        options: true,
        websocket: true
      },
      regions: ['global'],
      version: '2.0.0'
    };

    super(defaultConfig, exchangeInfo, cache);
  }

  async getTicker(symbol: string, category: MarketCategoryType = 'spot'): Promise<MarketTicker> {
    this.validateSymbol(symbol);
    const normalizedSymbol = this.normalizeSymbol(symbol);

    const cacheKey = `bybit:ticker:${normalizedSymbol}:${category}`;
    
    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const endpoint = `/v5/market/tickers?category=${category}&symbol=${normalizedSymbol}`;
        
        const response = await this.makeRequest<BybitApiResponse<BybitTickerResult>>(
          endpoint,
          {},
          'getTicker'
        );

        if (response.retCode !== 0) {
          throw new ExchangeError(
            `Bybit API Error ${response.retCode}: ${response.retMsg}`,
            'bybit',
            'API_ERROR',
            symbol
          );
        }

        if (!response.result.list || response.result.list.length === 0) {
          throw new UnsupportedSymbolError('bybit', symbol);
        }

        return this.mapTickerResponse(response.result.list[0]);
      },
      this.config.cacheTTL.ticker
    );
  }

  async getOrderbook(
    symbol: string, 
    category: MarketCategoryType = 'spot', 
    limit: number = 25
  ): Promise<Orderbook> {
    this.validateSymbol(symbol);
    const normalizedSymbol = this.normalizeSymbol(symbol);

    // Bybit supports specific limits
    const validLimit = this.getValidOrderbookLimit(limit);

    const cacheKey = `bybit:orderbook:${normalizedSymbol}:${category}:${validLimit}`;
    
    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const endpoint = `/v5/market/orderbook?category=${category}&symbol=${normalizedSymbol}&limit=${validLimit}`;
        
        const response = await this.makeRequest<BybitApiResponse<BybitOrderbookResult>>(
          endpoint,
          {},
          'getOrderbook'
        );

        if (response.retCode !== 0) {
          throw new ExchangeError(
            `Bybit API Error ${response.retCode}: ${response.retMsg}`,
            'bybit',
            'API_ERROR',
            symbol
          );
        }

        return this.mapOrderbookResponse(response.result, symbol);
      },
      this.config.cacheTTL.orderbook
    );
  }

  async getKlines(
    symbol: string,
    interval: string = '60',
    limit: number = 200,
    category: MarketCategoryType = 'spot'
  ): Promise<OHLCV[]> {
    this.validateSymbol(symbol);
    const normalizedSymbol = this.normalizeSymbol(symbol);

    // Bybit limit max is 1000 for most endpoints
    const validLimit = Math.min(limit, 1000);

    const cacheKey = `bybit:klines:${normalizedSymbol}:${interval}:${validLimit}:${category}`;
    
    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const endpoint = `/v5/market/kline?category=${category}&symbol=${normalizedSymbol}&interval=${interval}&limit=${validLimit}`;
        
        const response = await this.makeRequest<BybitApiResponse<BybitKlinesResult>>(
          endpoint,
          {},
          'getKlines'
        );

        if (response.retCode !== 0) {
          throw new ExchangeError(
            `Bybit API Error ${response.retCode}: ${response.retMsg}`,
            'bybit',
            'API_ERROR',
            symbol
          );
        }

        return this.mapKlinesResponse(response.result.list);
      },
      this.config.cacheTTL.klines
    );
  }

  async getSupportedSymbols(category: MarketCategoryType = 'spot'): Promise<string[]> {
    // Cache symbols for 24 hours
    if (Date.now() - this.symbolsLastUpdated.getTime() < this.symbolsCacheTTL) {
      return Array.from(this.supportedSymbols);
    }

    try {
      const endpoint = `/v5/market/instruments-info?category=${category}`;
      
      const response = await this.makeRequest<BybitApiResponse<BybitExchangeInfoResult>>(
        endpoint,
        {},
        'getSupportedSymbols'
      );

      if (response.retCode !== 0) {
        throw new ExchangeError(
          `Bybit API Error ${response.retCode}: ${response.retMsg}`,
          'bybit',
          'API_ERROR'
        );
      }

      // Filter only active symbols
      const symbols = response.result.list
        .filter(s => s.status === 'Trading')
        .map(s => this.standardizeSymbol(s.symbol));

      this.supportedSymbols = new Set(symbols);
      this.symbolsLastUpdated = new Date();

      return Array.from(this.supportedSymbols);
    } catch (error) {
      this.logger.error('Failed to fetch supported symbols:', error);
      throw new ExchangeError(
        'Failed to fetch supported symbols',
        'bybit',
        'SYMBOLS_FETCH_FAILED',
        undefined,
        error as Error
      );
    }
  }

  normalizeSymbol(symbol: string): string {
    // Convert BTCUSDT to BTCUSDT (Bybit format is already standard)
    return symbol.replace('/', '').toUpperCase();
  }

  standardizeSymbol(exchangeSymbol: string): string {
    // Bybit symbols are already in standard format
    return exchangeSymbol.toUpperCase();
  }

  protected async performHealthCheckCall(): Promise<void> {
    const response = await this.makeRequest<BybitApiResponse<{ timeSecond: string; timeNano: string }>>(
      '/v5/market/time',
      {},
      'healthCheck'
    );

    if (response.retCode !== 0) {
      throw new ExchangeError(
        `Bybit health check failed: ${response.retMsg}`,
        'bybit',
        'HEALTH_CHECK_FAILED'
      );
    }
  }

  // Private helper methods

  private mapTickerResponse(tickerData: BybitTickerResult['list'][0]): MarketTicker {
    return {
      symbol: this.standardizeSymbol(tickerData.symbol),
      lastPrice: parseFloat(tickerData.lastPrice),
      price24hPcnt: parseFloat(tickerData.price24hPcnt),
      highPrice24h: parseFloat(tickerData.highPrice24h),
      lowPrice24h: parseFloat(tickerData.lowPrice24h),
      volume24h: parseFloat(tickerData.volume24h),
      bid1Price: parseFloat(tickerData.bid1Price),
      ask1Price: parseFloat(tickerData.ask1Price),
      timestamp: new Date().toISOString()
    };
  }

  private mapOrderbookResponse(result: BybitOrderbookResult, symbol: string): Orderbook {
    const bids = result.b.map(bid => ({
      price: parseFloat(bid[0]),
      size: parseFloat(bid[1])
    }));

    const asks = result.a.map(ask => ({
      price: parseFloat(ask[0]),
      size: parseFloat(ask[1])
    }));

    const spread = asks.length > 0 && bids.length > 0 
      ? asks[0].price - bids[0].price 
      : 0;

    return {
      symbol: this.standardizeSymbol(symbol),
      bids,
      asks,
      timestamp: new Date().toISOString(),
      spread
    };
  }

  private mapKlinesResponse(klinesList: string[][]): OHLCV[] {
    // Sort chronologically (oldest first) - Bybit returns newest first
    const sortedKlines = [...klinesList].reverse();
    
    return sortedKlines.map(kline => ({
      timestamp: new Date(parseInt(kline[0])).toISOString(),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));
  }

  private getValidOrderbookLimit(limit: number): number {
    // Bybit supports these specific limits
    const validLimits = [1, 25, 50, 100, 200];
    
    // Find the closest valid limit
    return validLimits.reduce((prev, curr) => 
      Math.abs(curr - limit) < Math.abs(prev - limit) ? curr : prev
    );
  }
}

/**
 * Factory function to create Bybit adapter
 */
export function createBybitAdapter(
  config?: Partial<BybitConfig>, 
  cache?: ICacheManager
): BybitAdapter {
  return new BybitAdapter(config, cache);
}

/**
 * Default Bybit configuration
 */
export const DEFAULT_BYBIT_CONFIG: BybitConfig = {
  baseUrl: 'https://api.bybit.com',
  timeout: 10000,
  retryAttempts: 3,
  enableCache: true,
  cacheTTL: {
    ticker: 30 * 1000,
    orderbook: 15 * 1000,
    klines: 5 * 60 * 1000
  },
  rateLimit: {
    enabled: true,
    requestsPerMinute: 600,
    burstLimit: 5
  },
  useTestnet: false
};
