/**
 * @fileoverview Market Data Service - Bybit API Integration
 * @description Modular service for fetching market data from Bybit API
 * @version 1.3.0
 */

import fetch from 'node-fetch';
import { 
  IMarketDataService, 
  MarketTicker, 
  Orderbook, 
  OHLCV, 
  MarketCategoryType,
  MarketDataError,
  PerformanceMetrics
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance.js';

export class BybitMarketDataService implements IMarketDataService {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;

  constructor(
    baseUrl: string = 'https://api.bybit.com',
    timeout: number = 10000,
    retryAttempts: number = 3
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retryAttempts = retryAttempts;
    this.logger = new Logger('BybitMarketDataService');
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Fetch ticker data for a trading pair
   */
  async getTicker(symbol: string, category: MarketCategoryType = 'spot'): Promise<MarketTicker> {
    return this.performanceMonitor.measure('getTicker', async () => {
      this.logger.info(`Fetching ticker for ${symbol} in ${category} market`);
      
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

        this.logger.info(`Successfully fetched ticker for ${symbol}: $${ticker.lastPrice}`);
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
   * Fetch orderbook data for a trading pair
   */
  async getOrderbook(
    symbol: string, 
    category: MarketCategoryType = 'spot', 
    limit: number = 25
  ): Promise<Orderbook> {
    return this.performanceMonitor.measure('getOrderbook', async () => {
      this.logger.info(`Fetching orderbook for ${symbol} with limit ${limit}`);
      
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

        this.logger.info(`Successfully fetched orderbook for ${symbol}: ${orderbook.bids.length} bids, ${orderbook.asks.length} asks`);
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
   * Fetch OHLCV candlestick data
   */
  async getKlines(
    symbol: string,
    interval: string = '60',
    limit: number = 200,
    category: MarketCategoryType = 'spot'
  ): Promise<OHLCV[]> {
    return this.performanceMonitor.measure('getKlines', async () => {
      this.logger.info(`Fetching ${limit} klines for ${symbol} with ${interval} interval`);
      
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

        this.logger.info(`Successfully fetched ${klines.length} klines for ${symbol}`);
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

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Bybit-MCP-Server/1.3.0',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Capture raw response text for debugging
      const rawText = await response.text();
      this.logger.jsonDebug(endpoint, rawText, 'response');

      let data: any;
      try {
        this.logger.jsonDebug(endpoint, rawText, 'parse');
        data = JSON.parse(rawText);
      } catch (parseError) {
        this.logger.jsonDebug(endpoint, rawText, 'error');
        this.logger.error(`JSON Parse Error for ${endpoint}:`, {
          parseError,
          rawText: rawText.substring(0, 100),
          rawLength: rawText.length,
          position5: rawText.charAt(5)
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
      // Use a simple time endpoint for health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/v5/market/time`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Bybit-MCP-Server/1.3.0',
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
   * Get service info
   */
  getServiceInfo() {
    return {
      name: 'BybitMarketDataService',
      version: '1.3.0',
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      uptime: process.uptime()
    };
  }
}