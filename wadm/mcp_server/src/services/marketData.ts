/**
 * @fileoverview Market Data Service - Bybit API Integration
 * @description Modular service for fetching market data from Bybit API
 * @version 1.3.4
 */

import fetch from 'node-fetch';
import * as path from 'path';
import { 
  IMarketDataService, 
  MarketTicker, 
  Orderbook, 
  OHLCV, 
  MarketCategoryType,
  MarketDataError,
  PerformanceMetrics
} from '../types/index.js';
import { CacheKeys, ICacheManager } from '../types/storage.js';
import { PerformanceMonitor } from '../utils/performance.js';
import { Logger } from '../utils/logger.js';
import { cacheManager } from './cacheManager.js';
// Integrated with Cache Manager for performance optimization

export class BybitMarketDataService implements IMarketDataService {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly logger: Logger;
  private readonly cache: ICacheManager;
  private readonly cacheTTL: {
    ticker: number;
    orderbook: number;
    klines: number;
  };

  constructor(
    baseUrl: string = 'https://api.bybit.com',
    timeout: number = 10000,
    retryAttempts: number = 3,
    cache?: ICacheManager
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retryAttempts = retryAttempts;
    this.performanceMonitor = new PerformanceMonitor();
    this.logger = new Logger('BybitMarketDataService');
    this.cache = cache || cacheManager;
    
    // Configure cache TTL for different data types
    this.cacheTTL = {
      ticker: 30 * 1000,    // 30 seconds - ticker updates frequently
      orderbook: 15 * 1000, // 15 seconds - orderbook updates very frequently
      klines: 5 * 60 * 1000 // 5 minutes - historical data doesn't change much
    };
    
    this.logger.info('BybitMarketDataService initialized with cache integration');
  }

  /**
   * Fetch ticker data for a trading pair with caching
   */
  async getTicker(symbol: string, category: MarketCategoryType = 'spot'): Promise<MarketTicker> {
    return this.performanceMonitor.measure('getTicker', async () => {
      const cacheKey = CacheKeys.ticker(symbol, category);
      
      // Try cache first
      const cachedTicker = await this.cache.get<MarketTicker>(cacheKey);
      if (cachedTicker) {
        this.logger.debug(`Cache HIT: Ticker for ${symbol}`);
        return cachedTicker;
      }
      
      this.logger.info(`Cache MISS: Fetching ticker for ${symbol} from API`);
      
      try {
        const endpoint = `/v5/market/tickers?category=${category}&symbol=${symbol}`;
        const result = await this.makeRequest(endpoint);
        
        if (!result.list || result.list.length === 0) {
          throw new MarketDataError(
            `No ticker data found for symbol ${symbol}`,
            'NO_DATA',
            symbol
          );
        }

        const tickerData = result.list[0];
        
        const ticker: MarketTicker = {
          symbol: tickerData.symbol,
          lastPrice: parseFloat(tickerData.lastPrice),
          price24hPcnt: parseFloat(tickerData.price24hPcnt),
          highPrice24h: parseFloat(tickerData.highPrice24h),
          lowPrice24h: parseFloat(tickerData.lowPrice24h),
          volume24h: parseFloat(tickerData.volume24h),
          bid1Price: parseFloat(tickerData.bid1Price),
          ask1Price: parseFloat(tickerData.ask1Price),
          timestamp: new Date().toISOString()
        };

        // Cache the result
        await this.cache.set(cacheKey, ticker, this.cacheTTL.ticker);
        
        this.logger.info(`Successfully fetched and cached ticker for ${symbol}: ${ticker.lastPrice}`);
        return ticker;

      } catch (error) {
        this.logger.error(`Failed to fetch ticker for ${symbol}:`, error);
        throw new MarketDataError(
          `Failed to fetch ticker data for ${symbol}`,
          'API_ERROR',
          symbol,
          error as Error
        );
      }
    });
  }

  /**
   * Fetch orderbook data for a trading pair with caching
   */
  async getOrderbook(
    symbol: string, 
    category: MarketCategoryType = 'spot', 
    limit: number = 25
  ): Promise<Orderbook> {
    return this.performanceMonitor.measure('getOrderbook', async () => {
      const cacheKey = CacheKeys.orderbook(symbol, category, limit);
      
      // Try cache first
      const cachedOrderbook = await this.cache.get<Orderbook>(cacheKey);
      if (cachedOrderbook) {
        this.logger.debug(`Cache HIT: Orderbook for ${symbol}`);
        return cachedOrderbook;
      }
      
      this.logger.info(`Cache MISS: Fetching orderbook for ${symbol} from API`);
      
      try {
        const endpoint = `/v5/market/orderbook?category=${category}&symbol=${symbol}&limit=${limit}`;
        const result = await this.makeRequest(endpoint);

        const orderbook: Orderbook = {
          symbol: result.s,
          bids: result.b.map((bid: string[]) => ({
            price: parseFloat(bid[0]),
            size: parseFloat(bid[1])
          })),
          asks: result.a.map((ask: string[]) => ({
            price: parseFloat(ask[0]),
            size: parseFloat(ask[1])
          })),
          timestamp: new Date().toISOString(),
          spread: parseFloat(result.a[0][0]) - parseFloat(result.b[0][0])
        };

        // Cache the result
        await this.cache.set(cacheKey, orderbook, this.cacheTTL.orderbook);
        
        this.logger.info(`Successfully fetched and cached orderbook for ${symbol}: ${orderbook.bids.length} bids, ${orderbook.asks.length} asks`);
        return orderbook;

      } catch (error) {
        this.logger.error(`Failed to fetch orderbook for ${symbol}:`, error);
        throw new MarketDataError(
          `Failed to fetch orderbook data for ${symbol}`,
          'API_ERROR',
          symbol,
          error as Error
        );
      }
    });
  }

  /**
   * Fetch OHLCV candlestick data with caching
   */
  async getKlines(
    symbol: string,
    interval: string = '60',
    limit: number = 200,
    category: MarketCategoryType = 'spot'
  ): Promise<OHLCV[]> {
    return this.performanceMonitor.measure('getKlines', async () => {
      const cacheKey = CacheKeys.klines(symbol, interval, limit, category);
      
      // Try cache first
      const cachedKlines = await this.cache.get<OHLCV[]>(cacheKey);
      if (cachedKlines) {
        this.logger.debug(`Cache HIT: Klines for ${symbol}`);
        return cachedKlines;
      }
      
      this.logger.info(`Cache MISS: Fetching ${limit} klines for ${symbol} from API`);
      
      try {
        const endpoint = `/v5/market/kline?category=${category}&symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const result = await this.makeRequest(endpoint);

        const klines: OHLCV[] = result.list.map((kline: string[]) => ({
          timestamp: new Date(parseInt(kline[0])).toISOString(),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5])
        }));

        // Sort chronologically (oldest first)
        klines.reverse();

        // Cache the result
        await this.cache.set(cacheKey, klines, this.cacheTTL.klines);
        
        this.logger.info(`Successfully fetched and cached ${klines.length} klines for ${symbol}`);
        return klines;

      } catch (error) {
        this.logger.error(`Failed to fetch klines for ${symbol}:`, error);
        throw new MarketDataError(
          `Failed to fetch klines data for ${symbol}`,
          'API_ERROR',
          symbol,
          error as Error
        );
      }
    });
  }

  /**
   * Make HTTP request to Bybit API with error handling and retries
   */
  private async makeRequest(endpoint: string, attempt: number = 1): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      this.logger.debug(`Making request to: ${url} (attempt ${attempt})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Make regular fetch request without double-logging to avoid response conflicts
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'waickoff_mcp-Server/1.3.4',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Capture raw response text for debugging
      const rawText = await response.text();
      
      // Simplified logging - no complex objects to avoid MCP JSON parsing issues
      // this.logger.info(`API Response for ${endpoint}`, { ... }); // DISABLED

      let data: any;
      try {
        this.logger.debug(`Parsing JSON response for ${endpoint}`);
        data = JSON.parse(rawText);
      } catch (parseError) {
        this.logger.error(`JSON Parse Error for ${endpoint}:`, parseError);
        this.logger.error(`🚨 CRITICAL JSON Parse Error for ${endpoint}:`, {
          parseError,
          rawText: rawText.substring(0, 200),
          rawLength: rawText.length,
          endpoint
        });
        throw new Error(`JSON Parse Error: ${parseError}`);
      }

      // Validate JSON structure before processing
      if (!data || typeof data !== 'object') {
        this.logger.error(`Invalid JSON response structure from ${endpoint}:`, {
          dataType: typeof data,
          data: data
        });
        throw new Error('Invalid JSON response from API');
      }

      if (data.retCode !== 0) {
        throw new Error(`Bybit API Error ${data.retCode}: ${data.retMsg}`);
      }

      return data.result;

    } catch (error) {
      this.logger.error(`Request failed (attempt ${attempt}):`, error);
      
      // Retry logic
      if (attempt < this.retryAttempts && this.isRetryableError(error as Error)) {
        this.logger.info(`Retrying request in ${attempt * 1000}ms...`);
        await this.delay(attempt * 1000);
        return this.makeRequest(endpoint, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'AbortError'
    ];

    return retryableErrors.some(errType => 
      error.message.includes(errType) || error.name.includes(errType)
    );
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use a simple time endpoint for health check with enhanced logging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/v5/market/time`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'waickoff_mcp-Server/1.3.4',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        this.logger.warn(`Health check HTTP error: ${response.status}`);
        return false;
      }
      
      const data: any = await response.json();
      
      // Just check if we got a valid response
      return data && typeof data === 'object';
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await this.cache.getStats();
  }

  /**
   * Invalidate cache for a symbol
   */
  async invalidateCache(symbol: string, category?: MarketCategoryType): Promise<number> {
    const pattern = category ? `*:${symbol}:${category}*` : `*:${symbol}:*`;
    const invalidatedCount = await this.cache.invalidate(pattern);
    this.logger.info(`Invalidated ${invalidatedCount} cache entries for ${symbol}`);
    return invalidatedCount;
  }

  /**
   * Clear all market data cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.logger.info('Cleared all market data cache');
  }

  /**
   * Get service info with cache information
   */
  async getServiceInfo() {
    const cacheStats = await this.cache.getStats();
    return {
      name: 'BybitMarketDataService',
      version: '1.3.6',
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      uptime: process.uptime(),
      cache: {
        enabled: true,
        ttl: this.cacheTTL,
        stats: {
          entries: cacheStats.totalEntries,
          hitRate: cacheStats.hitRate.toFixed(2) + '%',
          memoryUsage: Math.round(cacheStats.totalMemoryUsage / 1024) + 'KB'
        }
      }
    };
  }
}