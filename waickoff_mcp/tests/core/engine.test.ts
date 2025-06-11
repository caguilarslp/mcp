/**
 * @fileoverview Core Engine Unit Tests
 * @description Test MarketAnalysisEngine core business logic
 * @version 1.4.0 - TASK-004
 */

import { MarketAnalysisEngine } from '../../src/core/engine.js';
import { IMarketDataService, IAnalysisService, ITradingService } from '../../src/types/index.js';
import { MarketTicker, Orderbook, OHLCV, VolatilityAnalysis, VolumeAnalysis, SupportResistanceAnalysis } from '../../src/types/index.js';

// Mock services
const mockMarketDataService: jest.Mocked<IMarketDataService> = {
  getTicker: jest.fn(),
  getOrderbook: jest.fn(),
  getKlines: jest.fn(),
  healthCheck: jest.fn(),
  getPerformanceMetrics: jest.fn(),
  getCacheStats: jest.fn(),
  invalidateCache: jest.fn(),
  clearCache: jest.fn()
};

const mockAnalysisService: jest.Mocked<IAnalysisService> = {
  analyzeVolatility: jest.fn(),
  analyzeVolume: jest.fn(),
  analyzeVolumeDelta: jest.fn(),
  identifySupportResistance: jest.fn(),
  getPerformanceMetrics: jest.fn()
};

const mockTradingService: jest.Mocked<ITradingService> = {
  suggestGridLevels: jest.fn(),
  optimizeGridParameters: jest.fn(),
  getPerformanceMetrics: jest.fn()
};

describe('MarketAnalysisEngine', () => {
  let engine: MarketAnalysisEngine;

  beforeEach(() => {
    // Create engine with mocked services
    engine = new MarketAnalysisEngine(
      mockMarketDataService,
      mockAnalysisService,
      mockTradingService
    );
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Core Market Data Operations', () => {
    it('should get ticker data successfully', async () => {
      const mockTicker: MarketTicker = {
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        price24hPcnt: 2.5,
        highPrice24h: 46000,
        lowPrice24h: 44000,
        volume24h: 1000000,
        bid1Price: 44999,
        ask1Price: 45001,
        timestamp: '2024-06-10T12:00:00.000Z'
      };

      mockMarketDataService.getTicker.mockResolvedValue(mockTicker);

      const result = await engine.getTicker('BTCUSDT', 'spot');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTicker);
      expect(mockMarketDataService.getTicker).toHaveBeenCalledWith('BTCUSDT', 'spot');
    });

    it('should handle ticker service errors', async () => {
      mockMarketDataService.getTicker.mockRejectedValue(new Error('API timeout'));

      const result = await engine.getTicker('BTCUSDT', 'spot');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API timeout');
    });

    it('should get orderbook data successfully', async () => {
      const mockOrderbook: Orderbook = {
        symbol: 'BTCUSDT',
        bids: [
          { price: 44999, size: 1.5 },
          { price: 44998, size: 2.0 }
        ],
        asks: [
          { price: 45001, size: 1.2 },
          { price: 45002, size: 1.8 }
        ],
        timestamp: '2024-06-10T12:00:00.000Z',
        spread: 2
      };

      mockMarketDataService.getOrderbook.mockResolvedValue(mockOrderbook);

      const result = await engine.getOrderbook('BTCUSDT', 'spot', 25);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrderbook);
      expect(mockMarketDataService.getOrderbook).toHaveBeenCalledWith('BTCUSDT', 'spot', 25);
    });

    it('should get comprehensive market data', async () => {
      const mockTicker: MarketTicker = {
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        price24hPcnt: 2.5,
        highPrice24h: 46000,
        lowPrice24h: 44000,
        volume24h: 1000000,
        bid1Price: 44999,
        ask1Price: 45001,
        timestamp: '2024-06-10T12:00:00.000Z'
      };

      const mockOrderbook: Orderbook = {
        symbol: 'BTCUSDT',
        bids: [{ price: 44999, size: 1.5 }],
        asks: [{ price: 45001, size: 1.2 }],
        timestamp: '2024-06-10T12:00:00.000Z',
        spread: 2
      };

      const mockKlines: OHLCV[] = [
        {
          timestamp: '2024-06-10T12:00:00.000Z',
          open: 44800,
          high: 45200,
          low: 44700,
          close: 45000,
          volume: 1000
        }
      ];

      mockMarketDataService.getTicker.mockResolvedValue(mockTicker);
      mockMarketDataService.getOrderbook.mockResolvedValue(mockOrderbook);
      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);

      const result = await engine.getComprehensiveMarketData('BTCUSDT', 'spot');

      expect(result.success).toBe(true);
      expect(result.data?.ticker).toEqual(mockTicker);
      expect(result.data?.orderbook).toEqual(mockOrderbook);
      expect(result.data?.klines).toEqual(mockKlines);
    });

    it('should handle partial failures in comprehensive market data', async () => {
      const mockTicker: MarketTicker = {
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        price24hPcnt: 2.5,
        highPrice24h: 46000,
        lowPrice24h: 44000,
        volume24h: 1000000,
        bid1Price: 44999,
        ask1Price: 45001,
        timestamp: '2024-06-10T12:00:00.000Z'
      };

      mockMarketDataService.getTicker.mockResolvedValue(mockTicker);
      mockMarketDataService.getOrderbook.mockRejectedValue(new Error('Orderbook unavailable'));
      mockMarketDataService.getKlines.mockResolvedValue([]);

      const result = await engine.getComprehensiveMarketData('BTCUSDT', 'spot');

      expect(result.success).toBe(true);
      expect(result.data?.ticker).toEqual(mockTicker);
      expect(result.data?.orderbook).toBeNull();
      expect(result.data?.klines).toEqual([]);
    });
  });

  describe('Technical Analysis Operations', () => {
    it('should perform volatility analysis', async () => {
      const mockVolatilityAnalysis: VolatilityAnalysis = {
        symbol: 'BTCUSDT',
        period: '1d',
        currentPrice: 45000,
        highestPrice: 46000,
        lowestPrice: 44000,
        volatilityPercent: 4.5,
        isGoodForGrid: true,
        recommendation: 'proceed',
        confidence: 85
      };

      mockAnalysisService.analyzeVolatility.mockResolvedValue(mockVolatilityAnalysis);

      const result = await engine.performTechnicalAnalysis('BTCUSDT', {
        includeVolatility: true,
        includeVolume: false,
        includeVolumeDelta: false,
        includeSupportResistance: false
      });

      expect(result.success).toBe(true);
      expect(result.data?.volatility).toEqual(mockVolatilityAnalysis);
      expect(mockAnalysisService.analyzeVolatility).toHaveBeenCalledWith('BTCUSDT', '1d');
    });

    it('should perform comprehensive technical analysis', async () => {
      const mockVolatilityAnalysis: VolatilityAnalysis = {
        symbol: 'BTCUSDT',
        period: '1d',
        currentPrice: 45000,
        highestPrice: 46000,
        lowestPrice: 44000,
        volatilityPercent: 4.5,
        isGoodForGrid: true,
        recommendation: 'proceed',
        confidence: 85
      };

      const mockVolumeAnalysis: VolumeAnalysis = {
        symbol: 'BTCUSDT',
        interval: '60',
        avgVolume: 1000000,
        currentVolume: 1250000,
        maxVolume: 2000000,
        minVolume: 500000,
        volumeSpikes: [],
        vwap: { current: 45100, priceVsVwap: 'below', difference: -0.22 },
        trend: 'increasing'
      };

      const mockSRAnalysis: SupportResistanceAnalysis = {
        symbol: 'BTCUSDT',
        interval: '60',
        currentPrice: 45000,
        resistances: [
          {
            level: 46000,
            type: 'resistance',
            strength: 8.5,
            touches: 3,
            volumeConfirmation: 1.5,
            lastTouchTime: '2024-06-10T11:00:00.000Z',
            priceDistance: 2.22,
            confidence: 'strong'
          }
        ],
        supports: [
          {
            level: 44000,
            type: 'support',
            strength: 9.2,
            touches: 4,
            volumeConfirmation: 2.1,
            lastTouchTime: '2024-06-10T10:00:00.000Z',
            priceDistance: -2.27,
            confidence: 'very_strong'
          }
        ],
        criticalLevel: {
          level: 44000,
          type: 'support',
          strength: 9.2,
          touches: 4,
          volumeConfirmation: 2.1,
          lastTouchTime: '2024-06-10T10:00:00.000Z',
          priceDistance: -2.27,
          confidence: 'very_strong'
        },
        gridConfig: {
          optimalLowerBound: 44200,
          optimalUpperBound: 45800,
          keyLevels: [44200, 44600, 45000, 45400, 45800],
          recommendedGridCount: 8,
          recommendation: 'Optimal range for grid trading'
        },
        statistics: {
          totalPivotsFound: 12,
          priceRangeAnalyzed: { high: 46500, low: 43500 },
          avgVolume: 1000000,
          periodsAnalyzed: 100,
          sensitivityUsed: 2
        }
      };

      mockAnalysisService.analyzeVolatility.mockResolvedValue(mockVolatilityAnalysis);
      mockAnalysisService.analyzeVolume.mockResolvedValue(mockVolumeAnalysis);
      mockAnalysisService.identifySupportResistance.mockResolvedValue(mockSRAnalysis);

      const result = await engine.performTechnicalAnalysis('BTCUSDT', {
        includeVolatility: true,
        includeVolume: true,
        includeVolumeDelta: false,
        includeSupportResistance: true,
        timeframe: '60',
        periods: 100
      });

      expect(result.success).toBe(true);
      expect(result.data?.volatility).toEqual(mockVolatilityAnalysis);
      expect(result.data?.volume).toEqual(mockVolumeAnalysis);
      expect(result.data?.supportResistance).toEqual(mockSRAnalysis);

      expect(mockAnalysisService.analyzeVolatility).toHaveBeenCalledWith('BTCUSDT', '1d');
      expect(mockAnalysisService.analyzeVolume).toHaveBeenCalledWith('BTCUSDT', '60', 100);
      expect(mockAnalysisService.identifySupportResistance).toHaveBeenCalledWith('BTCUSDT', '60', 100, 2);
    });

    it('should handle analysis service errors gracefully', async () => {
      mockAnalysisService.analyzeVolatility.mockRejectedValue(new Error('Insufficient data'));

      const result = await engine.performTechnicalAnalysis('BTCUSDT', {
        includeVolatility: true,
        includeVolume: false,
        includeVolumeDelta: false,
        includeSupportResistance: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient data');
    });

    it('should handle partial analysis failures', async () => {
      const mockVolatilityAnalysis: VolatilityAnalysis = {
        symbol: 'BTCUSDT',
        period: '1d',
        currentPrice: 45000,
        highestPrice: 46000,
        lowestPrice: 44000,
        volatilityPercent: 4.5,
        isGoodForGrid: true,
        recommendation: 'proceed',
        confidence: 85
      };

      mockAnalysisService.analyzeVolatility.mockResolvedValue(mockVolatilityAnalysis);
      mockAnalysisService.analyzeVolume.mockRejectedValue(new Error('Volume data unavailable'));

      const result = await engine.performTechnicalAnalysis('BTCUSDT', {
        includeVolatility: true,
        includeVolume: true,
        includeVolumeDelta: false,
        includeSupportResistance: false
      });

      expect(result.success).toBe(true);
      expect(result.data?.volatility).toEqual(mockVolatilityAnalysis);
      expect(result.data?.volume).toBeUndefined();
    });
  });

  describe('Grid Trading Operations', () => {
    it('should suggest grid levels successfully', async () => {
      const mockGridSuggestion = {
        symbol: 'BTCUSDT',
        currentPrice: 45000,
        suggestedRange: { lower: 44000, upper: 46000 },
        gridLevels: [44000, 44200, 44400, 44600, 44800, 45000, 45200, 45400, 45600, 45800, 46000],
        investment: 1000,
        pricePerGrid: 100,
        potentialProfit: '2-4% per cycle',
        volatility24h: 4.5,
        recommendation: 'recommended' as const,
        confidence: 85
      };

      mockTradingService.suggestGridLevels.mockResolvedValue(mockGridSuggestion);

      const result = await engine.getGridTradingSuggestions('BTCUSDT', 1000, {
        gridCount: 10,
        category: 'spot',
        riskTolerance: 'medium',
        optimize: false
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGridSuggestion);
      expect(mockTradingService.suggestGridLevels).toHaveBeenCalledWith('BTCUSDT', 1000, 10, 'spot');
    });

    it('should handle grid trading service errors', async () => {
      mockTradingService.suggestGridLevels.mockRejectedValue(new Error('Insufficient volatility'));

      const result = await engine.getGridTradingSuggestions('BTCUSDT', 1000);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient volatility');
    });
  });

  describe('Complete Analysis Integration', () => {
    it('should perform complete analysis with all components', async () => {
      // Mock all required services
      const mockTicker: MarketTicker = {
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        price24hPcnt: 2.5,
        highPrice24h: 46000,
        lowPrice24h: 44000,
        volume24h: 1000000,
        bid1Price: 44999,
        ask1Price: 45001,
        timestamp: '2024-06-10T12:00:00.000Z'
      };

      const mockOrderbook: Orderbook = {
        symbol: 'BTCUSDT',
        bids: [{ price: 44999, size: 1.5 }],
        asks: [{ price: 45001, size: 1.2 }],
        timestamp: '2024-06-10T12:00:00.000Z',
        spread: 2
      };

      const mockVolatilityAnalysis: VolatilityAnalysis = {
        symbol: 'BTCUSDT',
        period: '1d',
        currentPrice: 45000,
        highestPrice: 46000,
        lowestPrice: 44000,
        volatilityPercent: 4.5,
        isGoodForGrid: true,
        recommendation: 'proceed',
        confidence: 85
      };

      const mockGridSuggestion = {
        symbol: 'BTCUSDT',
        currentPrice: 45000,
        suggestedRange: { lower: 44000, upper: 46000 },
        gridLevels: [44000, 45000, 46000],
        investment: 1000,
        pricePerGrid: 333.33,
        potentialProfit: '2-4% per cycle',
        volatility24h: 4.5,
        recommendation: 'recommended' as const,
        confidence: 85
      };

      mockMarketDataService.getTicker.mockResolvedValue(mockTicker);
      mockMarketDataService.getOrderbook.mockResolvedValue(mockOrderbook);
      mockAnalysisService.analyzeVolatility.mockResolvedValue(mockVolatilityAnalysis);
      mockTradingService.suggestGridLevels.mockResolvedValue(mockGridSuggestion);

      const result = await engine.getCompleteAnalysis('BTCUSDT', 1000);

      expect(result.success).toBe(true);
      expect(result.data?.summary).toBeDefined();
      expect(result.data?.marketData?.ticker).toEqual(mockTicker);
      expect(result.data?.marketData?.orderbook).toEqual(mockOrderbook);
      expect(result.data?.technicalAnalysis?.volatility).toEqual(mockVolatilityAnalysis);
      expect(result.data?.gridSuggestion).toEqual(mockGridSuggestion);

      // Verify summary generation
      expect(result.data?.summary.recommendation).toBeDefined();
      expect(result.data?.summary.confidence).toBeGreaterThan(0);
      expect(result.data?.summary.riskLevel).toBeDefined();
      expect(result.data?.summary.keyPoints).toBeInstanceOf(Array);
    });

    it('should handle complete analysis with missing investment', async () => {
      const mockTicker: MarketTicker = {
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        price24hPcnt: 2.5,
        highPrice24h: 46000,
        lowPrice24h: 44000,
        volume24h: 1000000,
        bid1Price: 44999,
        ask1Price: 45001,
        timestamp: '2024-06-10T12:00:00.000Z'
      };

      mockMarketDataService.getTicker.mockResolvedValue(mockTicker);
      mockMarketDataService.getOrderbook.mockResolvedValue({
        symbol: 'BTCUSDT',
        bids: [],
        asks: [],
        timestamp: '2024-06-10T12:00:00.000Z',
        spread: 0
      });

      const result = await engine.getCompleteAnalysis('BTCUSDT');

      expect(result.success).toBe(true);
      expect(result.data?.gridSuggestion).toBeUndefined();
      expect(result.data?.summary).toBeDefined();
    });
  });

  describe('System Health and Performance', () => {
    it('should report system health status', async () => {
      mockMarketDataService.healthCheck.mockResolvedValue(true);

      const health = await engine.getSystemHealth();

      expect(health.status).toBe('healthy');
      expect(health.version).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.services.marketData).toBe(true);
      expect(health.services.analysis).toBe(true);
      expect(health.services.trading).toBe(true);
    });

    it('should track performance metrics', async () => {
      // Perform some operations to generate metrics
      const mockTicker: MarketTicker = {
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        price24hPcnt: 2.5,
        highPrice24h: 46000,
        lowPrice24h: 44000,
        volume24h: 1000000,
        bid1Price: 44999,
        ask1Price: 45001,
        timestamp: '2024-06-10T12:00:00.000Z'
      };

      mockMarketDataService.getTicker.mockResolvedValue(mockTicker);

      await engine.getTicker('BTCUSDT', 'spot');

      const metrics = engine.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.engine).toBeInstanceOf(Array);
      expect(metrics.engine.length).toBeGreaterThan(0);

      const latestMetric = metrics.engine[metrics.engine.length - 1];
      expect(latestMetric.functionName).toBe('getTicker');
      expect(latestMetric.executionTime).toBeGreaterThan(0);
      expect(latestMetric.success).toBe(true);
    });

    it('should handle service health check failures', async () => {
      mockMarketDataService.healthCheck.mockResolvedValue(false);

      const health = await engine.getSystemHealth();

      expect(health.status).toBe('degraded');
      expect(health.services.marketData).toBe(false);
    });
  });

  describe('Error Boundary Testing', () => {
    it('should handle unexpected service errors', async () => {
      mockMarketDataService.getTicker.mockRejectedValue(new Error('Unexpected system error'));

      const result = await engine.getTicker('BTCUSDT', 'spot');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected system error');
      expect(result.timestamp).toBeDefined();
    });

    it('should maintain performance tracking on errors', async () => {
      mockAnalysisService.analyzeVolatility.mockRejectedValue(new Error('Service unavailable'));

      await engine.performTechnicalAnalysis('BTCUSDT', {
        includeVolatility: true,
        includeVolume: false,
        includeVolumeDelta: false,
        includeSupportResistance: false
      });

      const metrics = engine.getPerformanceMetrics();
      const errorMetric = metrics.engine.find(m => m.functionName === 'performTechnicalAnalysis');

      expect(errorMetric).toBeDefined();
      expect(errorMetric?.success).toBe(false);
      expect(errorMetric?.errorType).toContain('Error');
    });
  });

  describe('Service Integration Patterns', () => {
    it('should properly inject and use services', () => {
      // Verify that engine uses the injected services
      expect(engine).toBeDefined();

      // Test that engine delegates to the correct services
      engine.getTicker('BTCUSDT', 'spot');
      expect(mockMarketDataService.getTicker).toHaveBeenCalled();
    });

    it('should handle null/undefined service parameters gracefully', async () => {
      const result = await engine.getTicker('', 'spot');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Symbol is required');
    });
  });
});
