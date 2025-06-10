/**
 * Cache Manager Tests
 * Basic tests for TASK-009 Phase 2 implementation
 */

import { CacheManager } from '../src/services/cacheManager.js';
import { CacheKeys } from '../src/types/storage.js';

describe('CacheManager - TASK-009 Phase 2', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxEntries: 10,
      defaultTTL: 1000, // 1 second for testing
      cleanupInterval: 500, // 0.5 seconds
      maxMemoryUsage: 1024 * 1024, // 1MB
      enableStats: true
    });
  });

  afterEach(async () => {
    await cacheManager.clear();
    cacheManager.stopCleanupTimer();
  });

  describe('Basic CRUD Operations', () => {
    test('should set and get values', async () => {
      const testData = { symbol: 'BTCUSDT', price: 50000 };
      
      await cacheManager.set('test-key', testData);
      const retrieved = await cacheManager.get('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    test('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('non-existent');
      expect(result).toBeNull();
    });

    test('should check if key exists', async () => {
      await cacheManager.set('exists-key', 'value');
      
      expect(await cacheManager.has('exists-key')).toBe(true);
      expect(await cacheManager.has('missing-key')).toBe(false);
    });

    test('should delete keys', async () => {
      await cacheManager.set('delete-key', 'value');
      
      const deleted = await cacheManager.delete('delete-key');
      expect(deleted).toBe(true);
      expect(await cacheManager.has('delete-key')).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    test('should expire entries after TTL', async () => {
      await cacheManager.set('expire-key', 'value', 100); // 100ms TTL
      
      expect(await cacheManager.get('expire-key')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await cacheManager.get('expire-key')).toBeNull();
    });

    test('should use default TTL when not specified', async () => {
      await cacheManager.set('default-ttl', 'value'); // Uses default 1000ms
      
      expect(await cacheManager.get('default-ttl')).toBe('value');
      
      // Should still exist after 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(await cacheManager.get('default-ttl')).toBe('value');
    });
  });

  describe('Bulk Operations', () => {
    test('should set multiple values', async () => {
      const entries = [
        { key: 'bulk-1', value: 'value1' },
        { key: 'bulk-2', value: 'value2' },
        { key: 'bulk-3', value: 'value3' }
      ];
      
      await cacheManager.setMany(entries);
      
      expect(await cacheManager.get('bulk-1')).toBe('value1');
      expect(await cacheManager.get('bulk-2')).toBe('value2');
      expect(await cacheManager.get('bulk-3')).toBe('value3');
    });

    test('should get multiple values', async () => {
      await cacheManager.set('multi-1', 'value1');
      await cacheManager.set('multi-2', 'value2');
      
      const results = await cacheManager.getMany(['multi-1', 'multi-2', 'missing']);
      
      expect(results).toEqual([
        { key: 'multi-1', value: 'value1' },
        { key: 'multi-2', value: 'value2' },
        { key: 'missing', value: null }
      ]);
    });
  });

  describe('Pattern Operations', () => {
    test('should invalidate by pattern', async () => {
      await cacheManager.set('ticker:BTCUSDT:spot', 'btc-data');
      await cacheManager.set('ticker:ETHUSDT:spot', 'eth-data');
      await cacheManager.set('orderbook:BTCUSDT:spot', 'btc-orderbook');
      
      const invalidated = await cacheManager.invalidate('ticker:*');
      
      expect(invalidated).toBe(2);
      expect(await cacheManager.get('ticker:BTCUSDT:spot')).toBeNull();
      expect(await cacheManager.get('ticker:ETHUSDT:spot')).toBeNull();
      expect(await cacheManager.get('orderbook:BTCUSDT:spot')).toBe('btc-orderbook');
    });

    test('should get keys by pattern', async () => {
      await cacheManager.set('ticker:BTCUSDT', 'data1');
      await cacheManager.set('ticker:ETHUSDT', 'data2');
      await cacheManager.set('orderbook:BTCUSDT', 'data3');
      
      const tickerKeys = await cacheManager.getKeys('ticker:*');
      const allKeys = await cacheManager.getKeys();
      
      expect(tickerKeys).toContain('ticker:BTCUSDT');
      expect(tickerKeys).toContain('ticker:ETHUSDT');
      expect(tickerKeys).not.toContain('orderbook:BTCUSDT');
      expect(allKeys).toHaveLength(3);
    });
  });

  describe('Cache Statistics', () => {
    test('should track hit and miss rates', async () => {
      await cacheManager.set('stats-key', 'value');
      
      // Generate hits
      await cacheManager.get('stats-key');
      await cacheManager.get('stats-key');
      
      // Generate misses
      await cacheManager.get('missing-1');
      await cacheManager.get('missing-2');
      
      const stats = await cacheManager.getStats();
      
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(2);
      expect(stats.hitRate).toBe(50);
      expect(stats.missRate).toBe(50);
    });

    test('should provide memory usage estimates', async () => {
      const stats1 = await cacheManager.getStats();
      expect(stats1.totalMemoryUsage).toBe(0);
      
      await cacheManager.set('memory-test', 'some data for memory calculation');
      
      const stats2 = await cacheManager.getStats();
      expect(stats2.totalMemoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Cleanup and Maintenance', () => {
    test('should clean up expired entries', async () => {
      // Set entries with short TTL
      await cacheManager.set('cleanup-1', 'value1', 50);
      await cacheManager.set('cleanup-2', 'value2', 50);
      await cacheManager.set('cleanup-3', 'value3', 2000); // Long TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cleanedCount = await cacheManager.cleanup();
      
      expect(cleanedCount).toBe(2);
      expect(await cacheManager.get('cleanup-1')).toBeNull();
      expect(await cacheManager.get('cleanup-2')).toBeNull();
      expect(await cacheManager.get('cleanup-3')).toBe('value3');
    });

    test('should clear all entries', async () => {
      await cacheManager.set('clear-1', 'value1');
      await cacheManager.set('clear-2', 'value2');
      
      await cacheManager.clear();
      
      const stats = await cacheManager.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(await cacheManager.get('clear-1')).toBeNull();
      expect(await cacheManager.get('clear-2')).toBeNull();
    });
  });

  describe('Cache Key Builders', () => {
    test('should build consistent cache keys', () => {
      expect(CacheKeys.ticker('BTCUSDT')).toBe('ticker:BTCUSDT:spot');
      expect(CacheKeys.ticker('BTCUSDT', 'linear')).toBe('ticker:BTCUSDT:linear');
      
      expect(CacheKeys.orderbook('ETHUSDT')).toBe('orderbook:ETHUSDT:spot:25');
      expect(CacheKeys.orderbook('ETHUSDT', 'spot', 50)).toBe('orderbook:ETHUSDT:spot:50');
      
      expect(CacheKeys.klines('ADAUSDT')).toBe('klines:ADAUSDT:60:200:spot');
      expect(CacheKeys.klines('ADAUSDT', '15', 100, 'linear')).toBe('klines:ADAUSDT:15:100:linear');
      
      expect(CacheKeys.analysis('BTCUSDT', 'volatility', '1d')).toBe('analysis:BTCUSDT:volatility:1d');
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used entries when limit reached', async () => {
      // Fill cache to limit
      for (let i = 0; i < 10; i++) {
        await cacheManager.set(`key-${i}`, `value-${i}`);
      }
      
      // Access some entries to make them recently used
      await cacheManager.get('key-5');
      await cacheManager.get('key-8');
      
      // Add one more entry to trigger eviction
      await cacheManager.set('key-new', 'new-value');
      
      const stats = await cacheManager.getStats();
      expect(stats.totalEntries).toBe(10); // Should still be at limit
      
      // Recently accessed keys should still exist
      expect(await cacheManager.get('key-5')).toBe('value-5');
      expect(await cacheManager.get('key-8')).toBe('value-8');
      expect(await cacheManager.get('key-new')).toBe('new-value');
    });
  });
});

// Integration test with MarketDataService caching
describe('MarketDataService Cache Integration', () => {
  test('should integrate with MarketDataService for caching', async () => {
    // This test would require actual MarketDataService integration
    // For now, we'll just test the concept
    
    const mockCacheManager = new CacheManager();
    const cacheKey = CacheKeys.ticker('BTCUSDT', 'spot');
    
    // Simulate API response caching
    const mockApiResponse = {
      symbol: 'BTCUSDT',
      lastPrice: 50000,
      price24hPcnt: 2.5,
      timestamp: new Date().toISOString()
    };
    
    await mockCacheManager.set(cacheKey, mockApiResponse, 30000); // 30 second TTL
    
    const cachedData = await mockCacheManager.get(cacheKey);
    expect(cachedData).toEqual(mockApiResponse);
    
    await mockCacheManager.clear();
  });
});