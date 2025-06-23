/**
 * @fileoverview Historical Data Service for obtaining historical market data
 * @description Service for fetching historical klines data with batching and rate limiting
 * @version 1.0.0 - TASK-017 Implementation
 */

import {
  IHistoricalDataService,
  HistoricalKlines,
  OHLCV,
  MarketCategoryType,
  DateRange,
  PerformanceMetrics
} from '../types/index.js';
import { FileLogger } from '../utils/fileLogger.js';
import { PerformanceMonitor } from '../utils/performance.js';
import * as path from 'path';

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 120,  // Bybit public limit
  requestsInterval: 60000,    // 1 minute in ms
  batchDelay: 500,           // 500ms between batches
  maxRetries: 3,
  retryDelay: 1000          // 1 second
};

/**
 * Historical Data Service for comprehensive market data analysis
 * 
 * Features:
 * - Fetches historical data from symbol inception
 * - Intelligent batching for large datasets
 * - Rate limiting to respect API limits
 * - Missing data detection and reporting
 * - Comprehensive error handling and retries
 */
export class HistoricalDataService implements IHistoricalDataService {
  private readonly logger: FileLogger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly baseUrl: string;
  
  // Rate limiting tracking
  private requestTimes: number[] = [];
  private isRateLimited = false;
  
  constructor(
    baseUrl: string = 'https://api.bybit.com',
    private readonly timeout: number = 15000
  ) {
    this.logger = new FileLogger('HistoricalDataService', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    this.performanceMonitor = new PerformanceMonitor();
    this.baseUrl = baseUrl;
    
    this.logger.info('Historical Data Service initialized', {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      rateLimitConfig: RATE_LIMIT_CONFIG
    });
  }

  /**
   * Get historical klines data for a symbol
   */
  async getHistoricalKlines(
    symbol: string,
    interval: 'D' | 'W' | 'M',
    startTime?: number,
    endTime?: number
  ): Promise<HistoricalKlines> {
    return this.performanceMonitor.measure('getHistoricalKlines', async () => {
      try {
        this.logger.info(`Fetching historical klines for ${symbol}`, {
          interval,
          startTime: startTime ? new Date(startTime) : 'inception',
          endTime: endTime ? new Date(endTime) : 'now'
        });

        // Determine actual start time (inception if not provided)
        let actualStartTime = startTime;
        if (!actualStartTime) {
          const inceptionDate = await this.getSymbolInceptionDate(symbol);
          actualStartTime = inceptionDate.getTime();
        }

        const actualEndTime = endTime || Date.now();
        
        // Validate time range
        if (actualStartTime >= actualEndTime) {
          throw new Error('Start time must be before end time');
        }

        // Fetch historical data in batches
        const allKlines: OHLCV[] = [];
        const missingDataRanges: DateRange[] = [];
        
        let currentStart = actualStartTime;
        let batchCount = 0;
        const maxBatchSize = this.getMaxBatchSize(interval);

        while (currentStart < actualEndTime) {
          // Calculate batch end time
          const batchEndTime = Math.min(
            currentStart + (maxBatchSize * this.getIntervalMs(interval)),
            actualEndTime
          );

          try {
            // Respect rate limits
            await this.enforceRateLimit();
            
            this.logger.debug(`Fetching batch ${++batchCount}`, {
              start: new Date(currentStart),
              end: new Date(batchEndTime),
              expectedRecords: Math.floor((batchEndTime - currentStart) / this.getIntervalMs(interval))
            });

            const batchKlines = await this.fetchKlinesBatch(
              symbol,
              interval,
              currentStart,
              batchEndTime
            );

            if (batchKlines.length > 0) {
              allKlines.push(...batchKlines);
            } else {
              // Track missing data
              missingDataRanges.push({
                start: new Date(currentStart),
                end: new Date(batchEndTime)
              });
            }

            // Move to next batch
            currentStart = batchEndTime;

          } catch (error) {
            this.logger.warn(`Batch ${batchCount} failed, tracking as missing data:`, error);
            missingDataRanges.push({
              start: new Date(currentStart),
              end: new Date(batchEndTime)
            });
            currentStart = batchEndTime;
          }
        }

        // Sort klines by timestamp
        allKlines.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Calculate metadata
        const inceptionDate = new Date(actualStartTime);
        const totalDays = Math.floor((actualEndTime - actualStartTime) / (24 * 60 * 60 * 1000));

        const result: HistoricalKlines = {
          symbol,
          interval,
          startTime: new Date(actualStartTime),
          endTime: new Date(actualEndTime),
          dataPoints: allKlines.length,
          klines: allKlines,
          metadata: {
            inceptionDate,
            totalDays,
            missingData: missingDataRanges
          }
        };

        this.logger.info(`Historical klines fetch completed for ${symbol}`, {
          dataPoints: allKlines.length,
          totalDays,
          missingDataRanges: missingDataRanges.length,
          batchesFetched: batchCount
        });

        return result;

      } catch (error) {
        this.logger.error(`Failed to fetch historical klines for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get symbol inception date (when trading started)
   */
  async getSymbolInceptionDate(symbol: string): Promise<Date> {
    return this.performanceMonitor.measure('getSymbolInceptionDate', async () => {
      try {
        this.logger.info(`Finding inception date for ${symbol}`);

        // Binary search approach to find inception date
        let minDate = new Date('2017-01-01'); // Crypto market general start
        let maxDate = new Date();
        
        let inceptionDate = maxDate;
        let attempts = 0;
        const maxAttempts = 20; // Prevent infinite loops

        while (minDate <= maxDate && attempts < maxAttempts) {
          attempts++;
          const midDate = new Date((minDate.getTime() + maxDate.getTime()) / 2);
          
          try {
            await this.enforceRateLimit();
            
            // Try to fetch 1 day of data at midpoint
            const testKlines = await this.fetchKlinesBatch(
              symbol,
              'D',
              midDate.getTime(),
              midDate.getTime() + (24 * 60 * 60 * 1000),
              1
            );

            if (testKlines.length > 0) {
              // Data exists at this point, try earlier
              inceptionDate = new Date(testKlines[0].timestamp);
              maxDate = new Date(midDate.getTime() - 1);
            } else {
              // No data, try later
              minDate = new Date(midDate.getTime() + 1);
            }

          } catch (error) {
            // API error, try later date
            minDate = new Date(midDate.getTime() + 1);
          }
        }

        this.logger.info(`Inception date found for ${symbol}:`, {
          inceptionDate,
          attempts
        });

        return inceptionDate;

      } catch (error) {
        this.logger.error(`Failed to find inception date for ${symbol}:`, error);
        // Fallback to a reasonable default
        return new Date('2020-01-01');
      }
    });
  }

  /**
   * Get historical klines in batches (async generator)
   */
  async* getHistoricalKlinesBatched(
    symbol: string,
    interval: string,
    batchSize: number
  ): AsyncGenerator<OHLCV[], void, unknown> {
    try {
      this.logger.info(`Starting batched fetch for ${symbol}`, {
        interval,
        batchSize
      });

      const inceptionDate = await this.getSymbolInceptionDate(symbol);
      const currentTime = Date.now();
      
      let currentStart = inceptionDate.getTime();
      let batchCount = 0;

      while (currentStart < currentTime) {
        const batchEndTime = Math.min(
          currentStart + (batchSize * this.getIntervalMs(interval)),
          currentTime
        );

        try {
          await this.enforceRateLimit();
          
          const batch = await this.fetchKlinesBatch(
            symbol,
            interval,
            currentStart,
            batchEndTime
          );

          if (batch.length > 0) {
            this.logger.debug(`Yielding batch ${++batchCount}:`, {
              records: batch.length,
              timeRange: {
                start: new Date(currentStart),
                end: new Date(batchEndTime)
              }
            });
            
            yield batch;
          }

          currentStart = batchEndTime;

        } catch (error) {
          this.logger.warn(`Batch failed, skipping:`, error);
          currentStart = batchEndTime;
        }
      }

      this.logger.info(`Batched fetch completed for ${symbol}`, {
        totalBatches: batchCount
      });

    } catch (error) {
      this.logger.error(`Batched fetch failed for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  /**
   * Fetch a single batch of klines
   */
  private async fetchKlinesBatch(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit: number = 200
  ): Promise<OHLCV[]> {
    const url = `${this.baseUrl}/v5/market/kline`;
    const params = new URLSearchParams({
      category: 'spot',
      symbol,
      interval,
      start: startTime.toString(),
      end: endTime.toString(),
      limit: Math.min(limit, 1000).toString() // API limit is 1000
    });

    let retries = 0;
    
    while (retries < RATE_LIMIT_CONFIG.maxRetries) {
      try {
        const response = await fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited, wait and retry
            this.isRateLimited = true;
            await this.sleep(RATE_LIMIT_CONFIG.retryDelay * (retries + 1));
            retries++;
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.retCode !== 0) {
          throw new Error(`Bybit API error: ${data.retMsg}`);
        }

        // Track successful request
        this.trackRequest();

        // Convert Bybit format to our format
        const klines: OHLCV[] = (data.result?.list || []).map((item: any[]) => ({
          timestamp: new Date(parseInt(item[0])).toISOString(),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5])
        }));

        return klines;

      } catch (error) {
        retries++;
        if (retries >= RATE_LIMIT_CONFIG.maxRetries) {
          throw error;
        }
        
        this.logger.warn(`Fetch attempt ${retries} failed, retrying:`, error);
        await this.sleep(RATE_LIMIT_CONFIG.retryDelay * retries);
      }
    }

    return [];
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    // Clean old request timestamps
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(
      time => now - time < RATE_LIMIT_CONFIG.requestsInterval
    );

    // Check if we're at the limit
    if (this.requestTimes.length >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = RATE_LIMIT_CONFIG.requestsInterval - (now - oldestRequest);
      
      if (waitTime > 0) {
        this.logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }

    // Add delay between batches if rate limited recently
    if (this.isRateLimited) {
      await this.sleep(RATE_LIMIT_CONFIG.batchDelay);
      this.isRateLimited = false;
    }
  }

  /**
   * Track a successful request
   */
  private trackRequest(): void {
    this.requestTimes.push(Date.now());
  }

  /**
   * Get maximum batch size for interval
   */
  private getMaxBatchSize(interval: string): number {
    switch (interval) {
      case 'D': return 365; // 1 year
      case 'W': return 104; // 2 years
      case 'M': return 60;  // 5 years
      default: return 200;
    }
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(interval: string): number {
    switch (interval) {
      case 'D': return 24 * 60 * 60 * 1000;        // 1 day
      case 'W': return 7 * 24 * 60 * 60 * 1000;    // 1 week
      case 'M': return 30 * 24 * 60 * 60 * 1000;   // 30 days (approximate)
      default: return 60 * 60 * 1000;               // 1 hour default
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
