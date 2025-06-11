/**
 * @fileoverview CacheHandlers Unit Tests
 * @description Test cache management handlers
 * @version 1.4.0 - TASK-004
 */

import { CacheHandlers } from '../../src/adapters/cacheHandlers.js';
import { MarketAnalysisEngine } from '../../src/core/engine.js';
import { CacheStats } from '../../src/types/index.js';

// Mock dependencies
jest.mock('../../src/core/engine.js');

describe('CacheHandlers', () => {
  let handlers: CacheHandlers;
  let mockEngine: jest.Mocked<MarketAnalysisEngine>;

  beforeEach(() => {
    mockEngine = new MarketAnalysisEngine() as jest.Mocked<MarketAnalysisEngine>;
    handlers = new CacheHandlers(mockEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetCacheStats', () => {
    it('should return cache statistics with recommendations', async () => {
      const mockCacheStats: CacheStats = {
        totalKeys: 150,
        memoryUsage: 2048,
        hitRate: 85.5,
        missRate: 14.5,
        size: 150,
        maxSize: 1000,
        ttlDistribution: {
          expired: 5,
          fresh: 140,
          expiringSoon: 5
        },
        keysByCategory: {
          'ticker:': 50,
          'orderbook:': 45,
          'klines:': 30,
          'analysis:': 25
        }
      };

      mockEngine.getCacheStats = jest.fn().mockResolvedValue({
        success: true,
        data: mockCacheStats,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await handlers.handleGetCacheStats({});

      expect(mockEngine.getCacheStats).toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.cache_performance.hit_rate).toBe('85.5%');
      expect(responseData.cache_performance.miss_rate).toBe('14.5%');
      expect(responseData.memory_usage.current_mb).toBe(2);
      expect(responseData.memory_usage.utilization).toBe('15.0%');
      expect(responseData.recommendations).toBeInstanceOf(Array);
    });

    it('should provide low hit rate recommendations', async () => {
      const mockCacheStats: CacheStats = {
        totalKeys: 50,
        memoryUsage: 512,
        hitRate: 45.0, // Low hit rate
        missRate: 55.0,
        size: 50,
        maxSize: 1000,
        ttlDistribution: {
          expired: 20,
          fresh: 25,
          expiringSoon: 5
        },
        keysByCategory: {
          'ticker:': 25,
          'orderbook:': 25
        }
      };

      mockEngine.getCacheStats = jest.fn().mockResolvedValue({
        success: true,
        data: mockCacheStats,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await handlers.handleGetCacheStats({});

      const responseData = JSON.parse(result.content[0].text);
      const recommendations = responseData.recommendations;

      expect(recommendations).toContain('Hit rate below 70% - consider optimizing cache TTL values');
      expect(recommendations).toContain('High number of expired keys detected - consider cleanup');
    });

    it('should provide high memory usage recommendations', async () => {
      const mockCacheStats: CacheStats = {
        totalKeys: 900,
        memoryUsage: 8192, // High memory usage
        hitRate: 90.0,
        missRate: 10.0,
        size: 900,
        maxSize: 1000,
        ttlDistribution: {
          expired: 50,
          fresh: 800,
          expiringSoon: 50
        },
        keysByCategory: {
          'ticker:': 300,
          'orderbook:': 300,
          'klines:': 300
        }
      };

      mockEngine.getCacheStats = jest.fn().mockResolvedValue({
        success: true,
        data: mockCacheStats,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await handlers.handleGetCacheStats({});

      const responseData = JSON.parse(result.content[0].text);
      const recommendations = responseData.recommendations;

      expect(recommendations).toContain('Cache size over 80% - consider increasing max size or reducing TTL');
      expect(recommendations).toContain('Memory usage over 5MB - monitor for memory leaks');
    });

    it('should handle cache stats service errors', async () => {
      mockEngine.getCacheStats = jest.fn().mockResolvedValue({
        success: false,
        error: 'Cache service unavailable',
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      await expect(handlers.handleGetCacheStats({})).rejects.toThrow('Cache service unavailable');
    });
  });

  describe('handleClearCache', () => {
    it('should clear cache with confirmation', async () => {
      mockEngine.clearCache = jest.fn().mockResolvedValue({
        success: true,
        data: { cleared: true, keysRemoved: 150 },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { confirm: true };
      const result = await handlers.handleClearCache(args);

      expect(mockEngine.clearCache).toHaveBeenCalledWith(true);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.cache_cleared).toBe(true);
      expect(responseData.keys_removed).toBe(150);
      expect(responseData.warning).toContain('All cached data has been permanently removed');
    });

    it('should require confirmation before clearing', async () => {
      const args = { confirm: false };

      await expect(handlers.handleClearCache(args)).rejects.toThrow('Confirmation required');
    });

    it('should require confirmation parameter', async () => {
      const args = {};

      await expect(handlers.handleClearCache(args)).rejects.toThrow('Confirmation required');
    });

    it('should handle cache clear service errors', async () => {
      mockEngine.clearCache = jest.fn().mockResolvedValue({
        success: false,
        error: 'Cache clear failed',
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { confirm: true };

      await expect(handlers.handleClearCache(args)).rejects.toThrow('Cache clear failed');
    });
  });

  describe('handleInvalidateCache', () => {
    it('should invalidate cache for specific symbol', async () => {
      mockEngine.invalidateCache = jest.fn().mockResolvedValue({
        success: true,
        data: { invalidated: true, keysRemoved: 25 },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };
      const result = await handlers.handleInvalidateCache(args);

      expect(mockEngine.invalidateCache).toHaveBeenCalledWith('BTCUSDT', undefined);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.cache_invalidated).toBe(true);
      expect(responseData.symbol).toBe('BTCUSDT');
      expect(responseData.keys_removed).toBe(25);
    });

    it('should invalidate cache for symbol and category', async () => {
      mockEngine.invalidateCache = jest.fn().mockResolvedValue({
        success: true,
        data: { invalidated: true, keysRemoved: 10 },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'ETHUSDT', category: 'spot' };
      const result = await handlers.handleInvalidateCache(args);

      expect(mockEngine.invalidateCache).toHaveBeenCalledWith('ETHUSDT', 'spot');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.symbol).toBe('ETHUSDT');
      expect(responseData.category).toBe('spot');
      expect(responseData.keys_removed).toBe(10);
    });

    it('should require symbol parameter', async () => {
      const args = {};

      await expect(handlers.handleInvalidateCache(args)).rejects.toThrow('Symbol is required');
    });

    it('should handle no keys found for invalidation', async () => {
      mockEngine.invalidateCache = jest.fn().mockResolvedValue({
        success: true,
        data: { invalidated: true, keysRemoved: 0 },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'NONEXISTENT' };
      const result = await handlers.handleInvalidateCache(args);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.keys_removed).toBe(0);
      expect(responseData.message).toContain('No cache entries found');
    });

    it('should handle cache invalidation service errors', async () => {
      mockEngine.invalidateCache = jest.fn().mockResolvedValue({
        success: false,
        error: 'Cache invalidation failed',
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };

      await expect(handlers.handleInvalidateCache(args)).rejects.toThrow('Cache invalidation failed');
    });
  });

  describe('Response Formatting', () => {
    it('should format memory usage in MB consistently', async () => {
      const testCases = [
        { bytes: 1024, expectedMB: 1 },
        { bytes: 2048, expectedMB: 2 },
        { bytes: 1536, expectedMB: 1.5 },
        { bytes: 512, expectedMB: 0.5 }
      ];

      for (const testCase of testCases) {
        const mockStats: CacheStats = {
          totalKeys: 100,
          memoryUsage: testCase.bytes,
          hitRate: 85,
          missRate: 15,
          size: 100,
          maxSize: 1000,
          ttlDistribution: { expired: 0, fresh: 100, expiringSoon: 0 },
          keysByCategory: {}
        };

        mockEngine.getCacheStats = jest.fn().mockResolvedValue({
          success: true,
          data: mockStats,
          timestamp: '2024-06-10T12:00:00.000Z'
        });

        const result = await handlers.handleGetCacheStats({});
        const responseData = JSON.parse(result.content[0].text);

        expect(responseData.memory_usage.current_mb).toBe(testCase.expectedMB);
      }
    });

    it('should format percentages consistently', async () => {
      const mockStats: CacheStats = {
        totalKeys: 100,
        memoryUsage: 1024,
        hitRate: 87.5555, // Should round to 87.6%
        missRate: 12.4445, // Should round to 12.4%
        size: 750,
        maxSize: 1000,
        ttlDistribution: { expired: 0, fresh: 100, expiringSoon: 0 },
        keysByCategory: {}
      };

      mockEngine.getCacheStats = jest.fn().mockResolvedValue({
        success: true,
        data: mockStats,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await handlers.handleGetCacheStats({});
      const responseData = JSON.parse(result.content[0].text);

      expect(responseData.cache_performance.hit_rate).toBe('87.6%');
      expect(responseData.cache_performance.miss_rate).toBe('12.4%');
      expect(responseData.memory_usage.utilization).toBe('75.0%');
    });
  });

  describe('Error Handling', () => {
    it('should handle engine rejections gracefully', async () => {
      mockEngine.getCacheStats = jest.fn().mockRejectedValue(new Error('Service temporarily unavailable'));

      await expect(handlers.handleGetCacheStats({})).rejects.toThrow('Service temporarily unavailable');
    });

    it('should validate required parameters', async () => {
      // Test invalidateCache without symbol
      await expect(handlers.handleInvalidateCache({})).rejects.toThrow('Symbol is required');

      // Test clearCache without confirmation
      await expect(handlers.handleClearCache({})).rejects.toThrow('Confirmation required');
      await expect(handlers.handleClearCache({ confirm: false })).rejects.toThrow('Confirmation required');
    });
  });

  describe('Recommendations Logic', () => {
    it('should generate appropriate recommendations for optimal cache', async () => {
      const optimalStats: CacheStats = {
        totalKeys: 500,
        memoryUsage: 2048, // 2MB
        hitRate: 92.0, // Excellent hit rate
        missRate: 8.0,
        size: 500,
        maxSize: 1000,
        ttlDistribution: {
          expired: 10, // Low expired count
          fresh: 480,
          expiringSoon: 10
        },
        keysByCategory: {
          'ticker:': 200,
          'orderbook:': 150,
          'klines:': 100,
          'analysis:': 50
        }
      };

      mockEngine.getCacheStats = jest.fn().mockResolvedValue({
        success: true,
        data: optimalStats,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await handlers.handleGetCacheStats({});
      const responseData = JSON.parse(result.content[0].text);

      expect(responseData.recommendations).toContain('Cache performance is optimal');
    });
  });
});
