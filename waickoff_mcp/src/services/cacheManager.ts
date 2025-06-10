/**
 * Cache Manager Implementation
 * High-performance in-memory cache with TTL and automatic cleanup
 */

import { 
  ICacheManager, 
  CacheEntry, 
  CacheStats, 
  CacheConfig 
} from '../types/storage.js';
import { FileLogger } from '../utils/fileLogger.js';
import { PerformanceMonitor } from '../utils/performance.js';
import * as path from 'path';

// Create singleton instances
const logger = new FileLogger('CacheManager', 'info', {
  logDir: path.join(process.cwd(), 'logs'),
  enableStackTrace: false,
  enableRotation: true
});
const performanceMonitor = new PerformanceMonitor();

export class CacheManager implements ICacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private stats: {
    totalHits: number;
    totalMisses: number;
  } = { totalHits: 0, totalMisses: 0 };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxEntries: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      enableStats: true,
      ...config
    };

    // Start automatic cleanup
    this.startCleanupTimer();
    
    logger.info(`Cache Manager initialized with config:`, {
      maxEntries: this.config.maxEntries,
      defaultTTL: this.config.defaultTTL,
      cleanupInterval: this.config.cleanupInterval
    });
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    return performanceMonitor.measure('cache.set', async () => {
      const now = Date.now();
      const entryTTL = ttl || this.config.defaultTTL;
      
      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: now,
        ttl: entryTTL,
        hits: 0,
        lastAccessed: now
      };

      // Check if we need to make space
      if (this.cache.size >= this.config.maxEntries) {
        await this.evictLRU();
      }

      this.cache.set(key, entry);
      logger.debug(`Cache SET: ${key} (TTL: ${entryTTL}ms)`);
    });
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return performanceMonitor.measure('cache.get', async () => {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;
      
      if (!entry) {
        this.stats.totalMisses++;
        logger.debug(`Cache MISS: ${key}`);
        return null;
      }

      // Check if expired
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.stats.totalMisses++;
        logger.debug(`Cache EXPIRED: ${key}`);
        return null;
      }

      // Update access stats
      entry.hits++;
      entry.lastAccessed = now;
      this.stats.totalHits++;
      
      logger.debug(`Cache HIT: ${key} (hits: ${entry.hits})`);
      return entry.value;
    });
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache DELETE: ${key}`);
    }
    return deleted;
  }

  /**
   * Set multiple values
   */
  async setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    return performanceMonitor.measure('cache.setMany', async () => {
      for (const entry of entries) {
        await this.set(entry.key, entry.value, entry.ttl);
      }
      logger.debug(`Cache SET_MANY: ${entries.length} entries`);
    });
  }

  /**
   * Get multiple values
   */
  async getMany<T>(keys: string[]): Promise<Array<{ key: string; value: T | null }>> {
    return performanceMonitor.measure('cache.getMany', async () => {
      const results: Array<{ key: string; value: T | null }> = [];
      
      for (const key of keys) {
        const value = await this.get<T>(key);
        results.push({ key, value });
      }
      
      logger.debug(`Cache GET_MANY: ${keys.length} keys requested`);
      return results;
    });
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const key of keys) {
      if (await this.delete(key)) {
        deletedCount++;
      }
    }
    
    logger.debug(`Cache DELETE_MANY: ${deletedCount}/${keys.length} deleted`);
    return deletedCount;
  }

  /**
   * Invalidate entries matching pattern
   */
  async invalidate(pattern: string): Promise<number> {
    return performanceMonitor.measure('cache.invalidate', async () => {
      const regex = new RegExp(
        pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
      );

      let invalidatedCount = 0;
      const keysToDelete: string[] = [];

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
        invalidatedCount++;
      }

      logger.info(`Cache INVALIDATE: ${invalidatedCount} entries matching pattern "${pattern}"`);
      return invalidatedCount;
    });
  }

  /**
   * Get all keys matching pattern
   */
  async getKeys(pattern?: string): Promise<string[]> {
    if (!pattern) {
      return Array.from(this.cache.keys());
    }

    const regex = new RegExp(
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
    );

    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    return performanceMonitor.measure('cache.cleanup', async () => {
      const now = Date.now();
      let cleanedCount = 0;
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
        cleanedCount++;
      }

      if (cleanedCount > 0) {
        logger.debug(`Cache CLEANUP: removed ${cleanedCount} expired entries`);
      }
      
      return cleanedCount;
    });
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.totalHits = 0;
    this.stats.totalMisses = 0;
    
    logger.info(`Cache CLEAR: removed ${size} entries`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    let totalMemoryUsage = 0;
    let oldestEntry = now;
    let newestEntry = 0;
    let expired = 0;
    let expiringSoon = 0;
    let fresh = 0;

    for (const entry of entries) {
      // Approximate memory usage (rough estimate)
      totalMemoryUsage += JSON.stringify(entry).length * 2; // Unicode is 2 bytes per char
      
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }

      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        expired++;
      } else if (entry.ttl - age < 60000) { // Expiring within 1 minute
        expiringSoon++;
      } else {
        fresh++;
      }
    }

    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = totalRequests > 0 ? (this.stats.totalHits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.stats.totalMisses / totalRequests) * 100 : 0;

    return {
      totalEntries: this.cache.size,
      totalMemoryUsage,
      hitRate,
      missRate,
      oldestEntry: entries.length > 0 ? oldestEntry : now,
      newestEntry: entries.length > 0 ? newestEntry : now,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      entriesByTTL: {
        expired,
        expiringSoon,
        fresh
      }
    };
  }

  /**
   * Get cache entry with metadata
   */
  async getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    return entry || null;
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    if (this.cache.size === 0) return;

    let lruKey = '';
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      logger.debug(`Cache EVICT_LRU: ${lruKey}`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup timer
   */
  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval) {
      this.startCleanupTimer();
    }
    
    logger.info('Cache configuration updated:', newConfig);
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();