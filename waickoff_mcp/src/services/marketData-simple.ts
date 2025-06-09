/**
 * @fileoverview Market Data Service - Simplified for MCP
 * @description Minimal logging to avoid Claude Desktop JSON errors
 * @version 1.3.4
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
import { PerformanceMonitor } from '../utils/performance.js';
import { simpleApiLogger } from '../utils/simpleApiLogger.js';

export class BybitMarketDataService implements IMarketDataService {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly performanceMonitor: PerformanceMonitor;

  constructor(
    baseUrl: string = 'https://api.bybit.com',
    timeout: number = 10000,
    retryAttempts: number = 3
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retryAttempts = retryAttempts;
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Fetch ticker data for a trading pair
   */
  async getTicker(symbol: string, category: MarketCategoryType = 'spot'): Promise<MarketTicker> {
    return this.performanceMonitor.measure('getTicker', async () => {
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

        return ticker;

      } catch (error) {
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

        return orderbook;

      } catch (error) {
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

        return klines;

      } catch (error) {
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
   * Make HTTP request to Bybit API with simplified logging
   */
  private async makeRequest(endpoint: string, attempt: number = 1): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();
    
    try {
      // Simple API logging - no complex objects
      simpleApiLogger.logApiRequest(endpoint, 'GET');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'waickoff_mcp-Server/1.3.4',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        simpleApiLogger.logApiResponse(endpoint, false, duration, response.status, `HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawText = await response.text();
      
      // Log successful response with basic info only
      simpleApiLogger.logApiResponse(endpoint, true, duration, response.status, undefined, rawText.length);

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        simpleApiLogger.logApiResponse(endpoint, false, duration, response.status, `JSON Parse Error`);
        throw new Error(`JSON Parse Error: ${parseError}`);
      }

      if (!data || typeof data !== 'object') {
        simpleApiLogger.logApiResponse(endpoint, false, duration, response.status, 'Invalid JSON structure');
        throw new Error('Invalid JSON response from API');
      }

      if (data.retCode !== 0) {
        const errorMsg = `Bybit API Error ${data.retCode}: ${data.retMsg}`;
        simpleApiLogger.logApiResponse(endpoint, false, duration, response.status, errorMsg);
        throw new Error(errorMsg);
      }

      return data.result;

    } catch (error) {
      const duration = Date.now() - startTime;
      simpleApiLogger.logApiResponse(endpoint, false, duration, undefined, (error as Error).message);
      
      // Retry logic
      if (attempt < this.retryAttempts && this.isRetryableError(error as Error)) {
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
        return false;
      }
      
      const data: any = await response.json();
      return data && typeof data === 'object';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service info
   */
  getServiceInfo() {
    return {
      name: 'BybitMarketDataService',
      version: '1.3.4',
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      uptime: process.uptime(),
      stats: simpleApiLogger.getStats()
    };
  }
}
