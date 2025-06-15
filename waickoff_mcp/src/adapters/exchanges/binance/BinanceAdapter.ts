/**
 * @fileoverview Binance Exchange Adapter - TASK-026 FASE 1
 * @description Binance API implementation following the common exchange interface
 * @version 1.0.0
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
  UnsupportedSymbolError,
  STANDARD_INTERVALS
} from '../common/IExchangeAdapter.js';

import { ICacheManager } from '../../../types/storage.js';

/**
 * Binance-specific configuration
 */
interface BinanceConfig extends BaseExchangeConfig {
  useTestnet: boolean;
  apiKey?: string;    // Optional for public endpoints
  apiSecret?: string; // Optional for public endpoints
}

/**
 * Binance API response types
 */
interface BinanceTickerResponse {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

interface BinanceOrderbookResponse {
  lastUpdateId: number;
  bids: string[][];
  asks: string[][];
}

interface BinanceKlineResponse {
  // Binance returns array format
  0: number;  // Open time
  1: string;  // Open price
  2: string;  // High price
  3: string;  // Low price
  4: string;  // Close price
  5: string;  // Volume
  6: number;  // Close time
  7: string;  // Quote asset volume
  8: number;  // Number of trades
  9: string;  // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

/**
 * Binance Exchange Adapter
 */
export class BinanceAdapter extends BaseExchangeAdapter {
  private supportedSymbols: Set<string> = new Set();
  private symbolsLastUpdated: Date = new Date(0);
  private readonly symbolsCacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config?: Partial<BinanceConfig>, cache?: ICacheManager) {
    const defaultConfig: BinanceConfig = {
      baseUrl: config?.useTestnet 
        ? 'https://testnet.binance.vision'
        : 'https://api.binance.com',
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
        requestsPerMinute: 1200,  // Binance weight limit is higher
        burstLimit: 10
      },
      useTestnet: false,
      ...config
    };

    const exchangeInfo: ExchangeInfo = {
      name: 'binance',
      displayName: 'Binance',
      weight: 0.6, // Higher weight due to larger volume
      baseUrl: defaultConfig.baseUrl,
      rateLimit: {
        requestsPerMinute: 1200,
        burstLimit: 10
      },
      capabilities: {
        spot: true,
        futures: true,
        options: false,
        websocket: true
      },
      regions: ['global'],
      version: '1.0.0'
    };

    super(defaultConfig, exchangeInfo, cache);
  }

  async getTicker(symbol: string, category: MarketCategoryType = 'spot'): Promise<MarketTicker> {
    this.validateSymbol(symbol);
    const normalizedSymbol = this.normalizeSymbol(symbol);

    const cacheKey = `binance:ticker:${normalizedSymbol}:${category}`;
    
    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        let endpoint: string;
        
        switch (category) {
          case 'spot':
            endpoint = `/api/v3/ticker/24hr?symbol=${normalizedSymbol}`;
            break;
          case 'linear':
            endpoint = `/fapi/v1/ticker/24hr?symbol=${normalizedSymbol}`;
            break;
          default:
            throw new UnsupportedSymbolError('binance', `Category ${category} not supported`);
        }

        const response = await this.makeRequest<BinanceTickerResponse>(
          endpoint,
          {},
          'getTicker'
        );

        return this.mapTickerResponse(response);
      },
      this.config.cacheTTL.ticker
    );
  }

  async getOrderbook(
    symbol: string, 
    category: MarketCategoryType = 'spot', 
    limit: number = 100
  ): Promise<Orderbook> {
    this.validateSymbol(symbol);
    const normalizedSymbol = this.normalizeSymbol(symbol);

    // Binance supports specific limits: 5, 10, 20, 50, 100, 500, 1000, 5000
    const validLimit = this.getValidOrderbookLimit(limit);

    const cacheKey = `binance:orderbook:${normalizedSymbol}:${category}:${validLimit}`;
    
    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        let endpoint: string;
        
        switch (category) {
          case 'spot':
            endpoint = `/api/v3/depth?symbol=${normalizedSymbol}&limit=${validLimit}`;
            break;
          case 'linear':
            endpoint = `/fapi/v1/depth?symbol=${normalizedSymbol}&limit=${validLimit}`;
            break;
          default:
            throw new UnsupportedSymbolError('binance', `Category ${category} not supported`);
        }

        const response = await this.makeRequest<BinanceOrderbookResponse>(
          endpoint,
          {},
          'getOrderbook'
        );

        return this.mapOrderbookResponse(response, symbol);
      },
      this.config.cacheTTL.orderbook
    );
  }

  async getKlines(
    symbol: string,
    interval: string = '1h',
    limit: number = 500,
    category: MarketCategoryType = 'spot'
  ): Promise<OHLCV[]> {
    this.validateSymbol(symbol);
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const binanceInterval = this.mapInterval(interval);

    // Binance limit max is 1000
    const validLimit = Math.min(limit, 1000);

    const cacheKey = `binance:klines:${normalizedSymbol}:${binanceInterval}:${validLimit}:${category}`;
    
    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        let endpoint: string;
        
        switch (category) {
          case 'spot':
            endpoint = `/api/v3/klines?symbol=${normalizedSymbol}&interval=${binanceInterval}&limit=${validLimit}`;
            break;
          case 'linear':
            endpoint = `/fapi/v1/klines?symbol=${normalizedSymbol}&interval=${binanceInterval}&limit=${validLimit}`;
            break;
          default:
            throw new UnsupportedSymbolError('binance', `Category ${category} not supported`);
        }

        const response = await this.makeRequest<BinanceKlineResponse[]>(
          endpoint,
          {},
          'getKlines'
        );

        return this.mapKlinesResponse(response);
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
      let endpoint: string;
      
      switch (category) {
        case 'spot':
          endpoint = '/api/v3/exchangeInfo';
          break;
        case 'linear':
          endpoint = '/fapi/v1/exchangeInfo';
          break;
        default:
          throw new UnsupportedSymbolError('binance', `Category ${category} not supported`);
      }

      const response = await this.makeRequest<{ symbols: { symbol: string; status: string }[] }>(
        endpoint,
        {},
        'getSupportedSymbols'
      );

      // Filter only TRADING symbols
      const symbols = response.symbols
        .filter(s => s.status === 'TRADING')
        .map(s => this.standardizeSymbol(s.symbol));

      this.supportedSymbols = new Set(symbols);
      this.symbolsLastUpdated = new Date();

      return Array.from(this.supportedSymbols);
    } catch (error) {
      this.logger.error('Failed to fetch supported symbols:', error);
      throw new ExchangeError(
        'Failed to fetch supported symbols',
        'binance',
        'SYMBOLS_FETCH_FAILED',
        undefined,
        error as Error
      );
    }
  }

  normalizeSymbol(symbol: string): string {
    // Convert BTCUSDT to BTCUSDT (Binance format is already standard)
    return symbol.replace('/', '').toUpperCase();
  }

  standardizeSymbol(exchangeSymbol: string): string {
    // Binance symbols are already in standard format
    return exchangeSymbol.toUpperCase();
  }

  protected async performHealthCheckCall(): Promise<void> {
    await this.makeRequest<{ serverTime: number }>('/api/v3/time', {}, 'healthCheck');
  }

  // Private helper methods

  private mapTickerResponse(response: BinanceTickerResponse): MarketTicker {
    return {
      symbol: this.standardizeSymbol(response.symbol),
      lastPrice: parseFloat(response.lastPrice),
      price24hPcnt: parseFloat(response.priceChangePercent),
      highPrice24h: parseFloat(response.highPrice),
      lowPrice24h: parseFloat(response.lowPrice),
      volume24h: parseFloat(response.volume),
      bid1Price: parseFloat(response.bidPrice),
      ask1Price: parseFloat(response.askPrice),
      timestamp: new Date().toISOString()
    };
  }

  private mapOrderbookResponse(response: BinanceOrderbookResponse, symbol: string): Orderbook {
    const bids = response.bids.map(bid => ({
      price: parseFloat(bid[0]),
      size: parseFloat(bid[1])
    }));

    const asks = response.asks.map(ask => ({
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

  private mapKlinesResponse(response: BinanceKlineResponse[]): OHLCV[] {
    return response.map(kline => ({
      timestamp: new Date(kline[0]).toISOString(),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));
  }

  private getValidOrderbookLimit(limit: number): number {
    const validLimits = [5, 10, 20, 50, 100, 500, 1000, 5000];
    
    // Find the closest valid limit
    return validLimits.reduce((prev, curr) => 
      Math.abs(curr - limit) < Math.abs(prev - limit) ? curr : prev
    );
  }

  private mapInterval(standardInterval: string): string {
    // Map standard intervals to Binance intervals
    const intervalMap: { [key: string]: string } = {
      '1': '1m',
      '3': '3m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '120': '2h',
      '240': '4h',
      '360': '6h',
      '720': '12h',
      'D': '1d',
      'W': '1w',
      'M': '1M'
    };

    // If it's already in Binance format, return as-is
    if (Object.values(intervalMap).includes(standardInterval)) {
      return standardInterval;
    }

    // If it's in standard format, convert
    if (intervalMap[standardInterval]) {
      return intervalMap[standardInterval];
    }

    // Default fallback
    this.logger.warn(`Unknown interval ${standardInterval}, defaulting to 1h`);
    return '1h';
  }
}

/**
 * Factory function to create Binance adapter
 */
export function createBinanceAdapter(
  config?: Partial<BinanceConfig>, 
  cache?: ICacheManager
): BinanceAdapter {
  return new BinanceAdapter(config, cache);
}

/**
 * Default Binance configuration
 */
export const DEFAULT_BINANCE_CONFIG: BinanceConfig = {
  baseUrl: 'https://api.binance.com',
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
    requestsPerMinute: 1200,
    burstLimit: 10
  },
  useTestnet: false
};
