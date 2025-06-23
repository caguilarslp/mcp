/**
 * @fileoverview Historical Cache Service for optimized historical data storage
 * @description Specialized cache service for historical analysis results with longer TTL
 * @version 1.0.0 - TASK-017 Implementation
 */

import {
  IHistoricalCacheService,
  PerformanceMetrics
} from '../types/index.js';
import { FileLogger } from '../utils/fileLogger.js';
import { PerformanceMonitor } from '../utils/performance.js';
import * as path from 'path';

// Cache configuration for historical data
const HISTORICAL_CACHE_CONFIG = {
  defaultTTL: 24 * 60 * 60 * 1000,        // 24 hours for general historical data
  supportResistanceTTL: 4 * 60 * 60 * 1000, // 4 hours for S/R analysis
  volumeEventsTTL: 12 * 60 * 60 * 1000,    // 12 hours for volume events
  priceDistributionTTL: 6 * 60 * 60 * 1000, // 6 hours for price distribution
  marketCyclesTTL: 8 * 60 * 60 * 1000,     // 8 hours for market cycles
  maxCacheSize: 500,                       // Maximum cached items
  cleanupInterval: 30 * 60 * 1000          // 30 minutes cleanup
};

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Historical Cache Service optimized for historical analysis results
 * 
 * Features:
 * - Longer TTL for historical data (changes infrequently)
 * - Symbol-based invalidation
 * - LRU eviction with access count weighting
 * - Background cleanup and optimization
 * - Compression for large datasets
 */
export class HistoricalCacheService implements IHistoricalCacheService {
  private readonly logger: FileLogger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly cache = new Map<string, CacheEntry>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.logger = new FileLogger('HistoricalCacheService', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    this.performanceMonitor = new PerformanceMonitor();
    
    // Start background cleanup
    this.startCleanupTimer();
    
    this.logger.info('Historical Cache Service initialized', {
      config: HISTORICAL_CACHE_CONFIG
    });
  }

  /**
   * Cache historical analysis results
   */
  async cacheHistoricalAnalysis(
    symbol: string,
    type: 'support_resistance' | 'volume_events' | 'price_distribution' | 'market_cycles' | 'historical_klines',
    data: any,
    ttl?: number
  ): Promise<void> {
    return this.performanceMonitor.measure('cacheHistoricalAnalysis', async () => {
      try {
        const key = this.buildCacheKey(symbol, type);
        const effectiveTTL = ttl || this.getTTLForType(type);
        
        // Ensure cache size limit
        if (this.cache.size >= HISTORICAL_CACHE_CONFIG.maxCacheSize) {
          await this.evictLeastUsed();
        }

        const entry: CacheEntry = {
          key,
          data: this.compressData(data),
          timestamp: Date.now(),
          ttl: effectiveTTL,
          accessCount: 0,
          lastAccessed: Date.now()
        };

        this.cache.set(key, entry);

        this.logger.debug(`Cached historical analysis for ${symbol}:${type}`, {
          key,
          ttl: effectiveTTL,
          dataSize: JSON.stringify(data).length,
          cacheSize: this.cache.size
        });

      } catch (error) {
        this.logger.error(`Failed to cache historical analysis for ${symbol}:${type}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get cached historical analysis
   */
  async getCachedAnalysis(
    symbol: string,
    type: string
  ): Promise<any | null> {
    return this.performanceMonitor.measure('getCachedAnalysis', async () => {
      try {
        const key = this.buildCacheKey(symbol, type);
        const entry = this.cache.get(key);

        if (!entry) {
          this.logger.debug(`Cache miss for ${symbol}:${type}`);
          return null;
        }

        // Check if entry has expired
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
          this.logger.debug(`Cache entry expired for ${symbol}:${type}`);
          this.cache.delete(key);
          return null;
        }

        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = now;

        const decompressedData = this.decompressData(entry.data);
        
        this.logger.debug(`Cache hit for ${symbol}:${type}`, {
          key,
          accessCount: entry.accessCount,
          age: now - entry.timestamp
        });

        return decompressedData;

      } catch (error) {
        this.logger.error(`Failed to get cached analysis for ${symbol}:${type}:`, error);
        return null;
      }
    });
  }

  /**
   * Invalidate all cached data for a symbol
   */
  async invalidateHistoricalCache(symbol: string): Promise<void> {
    return this.performanceMonitor.measure('invalidateHistoricalCache', async () => {
      try {
        const keysToDelete: string[] = [];
        
        for (const [key, entry] of this.cache.entries()) {
          if (key.startsWith(`${symbol}:`)) {
            keysToDelete.push(key);
          }
        }

        for (const key of keysToDelete) {
          this.cache.delete(key);
        }

        this.logger.info(`Invalidated ${keysToDelete.length} cache entries for ${symbol}`, {
          invalidatedKeys: keysToDelete
        });

      } catch (error) {
        this.logger.error(`Failed to invalidate cache for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalMemoryUsage: number;
    hitRate: number;
    entriesByType: Record<string, number>;
    oldestEntry: number;
    newestEntry: number;
  } {
    const stats = {
      totalEntries: this.cache.size,
      totalMemoryUsage: 0,
      hitRate: 0,
      entriesByType: {} as Record<string, number>,
      oldestEntry: Date.now(),
      newestEntry: 0
    };

    let totalHits = 0;
    let totalAccesses = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Calculate memory usage (approximate)
      stats.totalMemoryUsage += JSON.stringify(entry).length;
      
      // Track hits and accesses
      totalHits += entry.accessCount;
      totalAccesses += entry.accessCount > 0 ? 1 : 0;
      
      // Track by type
      const type = key.split(':')[1] || 'unknown';
      stats.entriesByType[type] = (stats.entriesByType[type] || 0) + 1;
      
      // Track age
      if (entry.timestamp < stats.oldestEntry) {
        stats.oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > stats.newestEntry) {
        stats.newestEntry = entry.timestamp;
      }
    }

    stats.hitRate = totalAccesses > 0 ? (totalHits / totalAccesses) * 100 : 0;

    return stats;
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<void> {
    const entriesCleared = this.cache.size;
    this.cache.clear();
    
    this.logger.info(`Cleared all historical cache entries`, {
      entriesCleared
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Shutdown the cache service
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.cache.clear();
    this.logger.info('Historical Cache Service shut down');
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  /**
   * Build cache key for symbol and type
   */
  private buildCacheKey(symbol: string, type: string): string {
    return `${symbol.toLowerCase()}:${type}`;
  }

  /**
   * Get TTL for specific analysis type
   */
  private getTTLForType(type: string): number {
    switch (type) {
      case 'support_resistance':
        return HISTORICAL_CACHE_CONFIG.supportResistanceTTL;
      case 'volume_events':
        return HISTORICAL_CACHE_CONFIG.volumeEventsTTL;
      case 'price_distribution':
        return HISTORICAL_CACHE_CONFIG.priceDistributionTTL;
      case 'market_cycles':
        return HISTORICAL_CACHE_CONFIG.marketCyclesTTL;
      case 'historical_klines':
        return HISTORICAL_CACHE_CONFIG.defaultTTL;
      default:
        return HISTORICAL_CACHE_CONFIG.defaultTTL;
    }
  }

  /**
   * Compress data for storage (simple JSON compression)
   */
  private compressData(data: any): any {
    // For now, just return as-is
    // In the future, could implement actual compression
    return data;
  }

  /**
   * Decompress cached data
   */
  private decompressData(data: any): any {
    // For now, just return as-is
    return data;
  }

  /**
   * Start background cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, HISTORICAL_CACHE_CONFIG.cleanupInterval);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Evict least recently used entries
   */
  private async evictLeastUsed(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by access score (combination of access count and recency)
    entries.sort(([, a], [, b]) => {
      const scoreA = a.accessCount + (Date.now() - a.lastAccessed) / 1000;
      const scoreB = b.accessCount + (Date.now() - b.lastAccessed) / 1000;
      return scoreA - scoreB;
    });
    
    // Remove the least used 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }
    
    this.logger.debug(`Evicted ${toRemove} least used cache entries`);
  }
}
