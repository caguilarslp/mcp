/**
 * @fileoverview Base Exchange Adapter - Common functionality
 * @description Abstract base class with shared functionality for all exchange adapters
 * @version 1.0.0 (TASK-026 FASE 1)
 */

import {
  IExchangeAdapter,
  ExchangeHealth,
  ExchangeInfo,
  BaseExchangeConfig,
  ExchangeError,
  RateLimitError,
  getPerformanceCategory,
  PerformanceCategory
} from './IExchangeAdapter.js';

import {
  MarketTicker,
  Orderbook,
  OHLCV,
  MarketCategoryType,
  PerformanceMetrics
} from '../../../types/index.js';

import { ICacheManager } from '../../../types/storage.js';
import { PerformanceMonitor } from '../../../utils/performance.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  private requests: Date[] = [];
  private burstRequests: Date[] = [];

  constructor(
    private requestsPerMinute: number,
    private burstLimit: number
  ) {}

  async waitIfNeeded(): Promise<void> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneSecondAgo = new Date(now.getTime() - 1000);

    // Clean old requests
    this.requests = this.requests.filter(req => req > oneMinuteAgo);
    this.burstRequests = this.burstRequests.filter(req => req > oneSecondAgo);

    // Check burst limit
    if (this.burstRequests.length >= this.burstLimit) {
      const waitTime = 1000 - (now.getTime() - this.burstRequests[0].getTime());
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Check rate limit
    if (this.requests.length >= this.requestsPerMinute) {
      const waitTime = 60000 - (now.getTime() - this.requests[0].getTime());
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    this.requests.push(now);
    this.burstRequests.push(now);
  }

  getStatus(): { remaining: number; reset: Date; limit: number } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    // Clean old requests
    this.requests = this.requests.filter(req => req > oneMinuteAgo);
    
    return {
      remaining: Math.max(0, this.requestsPerMinute - this.requests.length),
      reset: new Date(now.getTime() + 60000),
      limit: this.requestsPerMinute
    };
  }
}

/**
 * Abstract base class for exchange adapters
 */
export abstract class BaseExchangeAdapter implements IExchangeAdapter {
  protected logger: Logger;
  protected performanceMonitor: PerformanceMonitor;
  protected rateLimiter?: RateLimiter;
  protected cache?: ICacheManager;
  
  // Health monitoring
  private lastSuccessfulCall: Date = new Date();
  private errorCount: number = 0;
  private latencyHistory: number[] = [];
  private isShuttingDown: boolean = false;

  // Error tracking for health metrics
  private recentErrors: Date[] = [];

  constructor(
    protected config: BaseExchangeConfig,
    protected exchangeInfo: ExchangeInfo,
    cache?: ICacheManager
  ) {
    this.logger = new Logger(`${exchangeInfo.name}Adapter`);
    this.performanceMonitor = new PerformanceMonitor();
    this.cache = cache;

    // Initialize rate limiter if enabled
    if (config.rateLimit.enabled) {
      this.rateLimiter = new RateLimiter(
        config.rateLimit.requestsPerMinute,
        config.rateLimit.burstLimit
      );
    }

    this.logger.info(`${exchangeInfo.displayName} adapter initialized`, {
      baseUrl: config.baseUrl,
      rateLimit: config.rateLimit.enabled,
      cache: !!cache
    });
  }

  // Abstract methods that must be implemented by specific exchanges
  abstract getTicker(symbol: string, category?: MarketCategoryType): Promise<MarketTicker>;
  abstract getOrderbook(symbol: string, category?: MarketCategoryType, limit?: number): Promise<Orderbook>;
  abstract getKlines(symbol: string, interval?: string, limit?: number, category?: MarketCategoryType): Promise<OHLCV[]>;
  abstract getSupportedSymbols(category?: MarketCategoryType): Promise<string[]>;
  abstract normalizeSymbol(symbol: string): string;
  abstract standardizeSymbol(exchangeSymbol: string): string;

  // Implemented common functionality
  
  getExchangeInfo(): ExchangeInfo {
    return { ...this.exchangeInfo };
  }

  getName(): string {
    return this.exchangeInfo.name;
  }

  getWeight(): number {
    return this.exchangeInfo.weight;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  async getRateLimitStatus(): Promise<{ remaining: number; reset: Date; limit: number }> {
    if (!this.rateLimiter) {
      return {
        remaining: Infinity,
        reset: new Date(Date.now() + 60000),
        limit: Infinity
      };
    }
    
    return this.rateLimiter.getStatus();
  }

  async healthCheck(): Promise<ExchangeHealth> {
    const startTime = Date.now();
    
    try {
      // Perform a lightweight API call
      await this.performHealthCheckCall();
      
      const latency = Date.now() - startTime;
      this.updateLatency(latency);
      this.recordSuccessfulCall();
      
      return {
        isHealthy: true,
        latency,
        lastSuccessfulCall: this.lastSuccessfulCall,
        errorCount: this.errorCount,
        errorRate: this.calculateErrorRate()
      };
    } catch (error) {
      this.recordError();
      throw new ExchangeError(
        `Health check failed for ${this.exchangeInfo.name}`,
        this.exchangeInfo.name,
        'HEALTH_CHECK_FAILED',
        undefined,
        error as Error
      );
    }
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.logger.info(`Shutting down ${this.exchangeInfo.displayName} adapter`);
    
    // Clear any pending timeouts/intervals
    // Subclasses can override for specific cleanup
  }

  // Protected helper methods for subclasses

  /**
   * Make an HTTP request with common error handling and monitoring
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    operationName: string = 'request'
  ): Promise<T> {
    if (this.isShuttingDown) {
      throw new ExchangeError(
        'Adapter is shutting down',
        this.exchangeInfo.name,
        'SHUTTING_DOWN'
      );
    }

    // Apply rate limiting
    if (this.rateLimiter) {
      await this.rateLimiter.waitIfNeeded();
    }

    return this.performanceMonitor.measure(operationName, async () => {
      const url = `${this.config.baseUrl}${endpoint}`;
      const startTime = Date.now();

      try {
        this.logger.debug(`Making request to ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': `waickoff_mcp-Server/1.0.0-${this.exchangeInfo.name}`,
            'Accept': 'application/json',
            ...options.headers
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle rate limiting specifically
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new RateLimitError(
              this.exchangeInfo.name,
              retryAfter ? parseInt(retryAfter) * 1000 : 60000
            );
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const latency = Date.now() - startTime;
        
        this.updateLatency(latency);
        this.recordSuccessfulCall();

        return data;

      } catch (error) {
        this.recordError();
        
        if (error instanceof RateLimitError) {
          throw error;
        }

        throw new ExchangeError(
          `Request failed to ${this.exchangeInfo.name}: ${(error as Error).message}`,
          this.exchangeInfo.name,
          'REQUEST_FAILED',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Get data from cache or fetch from API
   */
  protected async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    if (!this.cache || !this.config.enableCache) {
      return fetchFunction();
    }

    const cached = await this.cache.get<T>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);
    const data = await fetchFunction();
    
    if (data) {
      await this.cache.set(cacheKey, data, ttl);
    }

    return data;
  }

  /**
   * Validate symbol format
   */
  protected validateSymbol(symbol: string): void {
    if (!symbol || typeof symbol !== 'string') {
      throw new ExchangeError(
        'Invalid symbol format',
        this.exchangeInfo.name,
        'INVALID_SYMBOL',
        symbol
      );
    }
  }

  /**
   * Retry logic for failed requests
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry rate limit errors - wait and try once more
        if (error instanceof RateLimitError) {
          if (attempt === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, error.retryAfter));
          continue;
        }

        // Don't retry certain errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }

        if (attempt === maxRetries) break;

        const waitTime = backoffMs * Math.pow(2, attempt - 1);
        this.logger.debug(`Retrying operation in ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  // Private helper methods

  /**
   * Perform exchange-specific health check call
   * Override in subclasses for exchange-specific implementation
   */
  protected abstract performHealthCheckCall(): Promise<void>;

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'INVALID_SYMBOL',
      'UNSUPPORTED_SYMBOL',
      'AUTHENTICATION_FAILED',
      'PERMISSION_DENIED'
    ];

    return nonRetryablePatterns.some(pattern => 
      error.message.includes(pattern) || error.name.includes(pattern)
    );
  }

  private updateLatency(latency: number): void {
    this.latencyHistory.push(latency);
    
    // Keep only last 100 latency measurements
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }

    const category = getPerformanceCategory(latency);
    if (category === PerformanceCategory.POOR || category === PerformanceCategory.CRITICAL) {
      this.logger.warn(`High latency detected: ${latency}ms (${category})`);
    }
  }

  private recordSuccessfulCall(): void {
    this.lastSuccessfulCall = new Date();
    // Reset error count on successful call
    if (this.errorCount > 0) {
      this.logger.info(`Recovered from errors, resetting error count from ${this.errorCount}`);
      this.errorCount = 0;
    }
  }

  private recordError(): void {
    this.errorCount++;
    this.recentErrors.push(new Date());
    
    // Clean errors older than 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    this.recentErrors = this.recentErrors.filter(err => err > oneMinuteAgo);
    
    this.logger.warn(`Error recorded. Total errors: ${this.errorCount}, Recent errors: ${this.recentErrors.length}`);
  }

  private calculateErrorRate(): number {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    this.recentErrors = this.recentErrors.filter(err => err > oneMinuteAgo);
    return this.recentErrors.length; // errors per minute
  }
}
