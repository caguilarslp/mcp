/**
 * @fileoverview Volume Delta Calculations Unit Tests
 * @description Test Volume Delta mathematical calculations and divergence detection
 * @version 1.4.0 - TASK-004
 */

import { AnalysisService } from '../../src/services/analysis';
import { OHLCV, VolumeDelta } from '../../src/types/index';

// Mock MarketDataService
const mockMarketDataService = {
  getKlines: jest.fn(),
  getPerformanceMetrics: jest.fn().mockReturnValue([])
};

describe('Volume Delta Calculations', () => {
  let analysisService: AnalysisService;

  beforeEach(() => {
    analysisService = new AnalysisService(mockMarketDataService as any);
    jest.clearAllMocks();
  });

  describe('Volume Delta Calculation Logic', () => {
    it('should calculate positive delta for bullish candles', async () => {
      const mockKlines: OHLCV[] = [
        // Bullish candles (close > open)
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44000, high: 45000, low: 43900, close: 44800, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44800, high: 45200, low: 44700, close: 45000, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45300, low: 44950, close: 45200, volume: 1100 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 3);

      expect(result.current).toBeGreaterThan(0);
      expect(result.bias).toBe('buyer');
      expect(result.cumulativeDelta).toBeGreaterThan(0);
    });

    it('should calculate negative delta for bearish candles', async () => {
      const mockKlines: OHLCV[] = [
        // Bearish candles (close < open)
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45100, low: 44200, close: 44400, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44400, high: 44500, low: 43800, close: 44000, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 44000, high: 44100, low: 43600, close: 43800, volume: 1100 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 3);

      expect(result.current).toBeLessThan(0);
      expect(result.bias).toBe('seller');
      expect(result.cumulativeDelta).toBeLessThan(0);
    });

    it('should handle mixed bullish and bearish candles', async () => {
      const mockKlines: OHLCV[] = [
        // Mixed candles
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45200, low: 44800, close: 45100, volume: 1000 }, // Bullish
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45100, high: 45150, low: 44700, close: 44900, volume: 1200 }, // Bearish
        { timestamp: '2024-06-10T10:00:00.000Z', open: 44900, high: 45300, low: 44800, close: 45200, volume: 1500 }, // Bullish, higher volume
        { timestamp: '2024-06-10T09:00:00.000Z', open: 45200, high: 45250, low: 44950, close: 45000, volume: 800 }   // Bearish
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 4);

      // Should reflect the net bias (more bullish volume due to higher volume on bullish candle)
      expect(result.bias).toBe('buyer');
      expect(Math.abs(result.average)).toBeGreaterThan(0);
    });
  });

  describe('Delta Strength Calculation', () => {
    it('should calculate higher strength for consistent bias', async () => {
      const consistentBullishKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44000, high: 45000, low: 43900, close: 44800, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44800, high: 45200, low: 44700, close: 45000, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45300, low: 44950, close: 45200, volume: 1100 },
        { timestamp: '2024-06-10T09:00:00.000Z', open: 45200, high: 45500, low: 45100, close: 45400, volume: 1300 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(consistentBullishKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 4);

      expect(result.strength).toBeGreaterThan(70); // High strength for consistent bias
      expect(result.bias).toBe('buyer');
      expect(result.marketPressure.trend).toBe('strong_buying');
    });

    it('should calculate lower strength for mixed bias', async () => {
      const mixedKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45100, low: 44900, close: 45050, volume: 1000 }, // Weak bullish
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45050, high: 45080, low: 44950, close: 45000, volume: 1000 }, // Weak bearish
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45070, low: 44980, close: 45030, volume: 1000 }, // Weak bullish
        { timestamp: '2024-06-10T09:00:00.000Z', open: 45030, high: 45060, low: 44970, close: 45000, volume: 1000 }  // Weak bearish
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mixedKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 4);

      expect(result.strength).toBeLessThan(30); // Low strength for mixed signals
      expect(result.bias).toBe('neutral');
      expect(result.marketPressure.trend).toBe('balanced');
    });
  });

  describe('Market Pressure Analysis', () => {
    it('should correctly count bullish and bearish candles', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T15:00:00.000Z', open: 45000, high: 45200, low: 44900, close: 45100, volume: 1000 }, // Bullish
        { timestamp: '2024-06-10T14:00:00.000Z', open: 45100, high: 45150, low: 44800, close: 44900, volume: 1200 }, // Bearish
        { timestamp: '2024-06-10T13:00:00.000Z', open: 44900, high: 45300, low: 44800, close: 45200, volume: 1500 }, // Bullish
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45200, high: 45250, low: 44950, close: 45000, volume: 800 },  // Bearish
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45000, high: 45400, low: 44950, close: 45300, volume: 1300 }, // Bullish
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45300, high: 45350, low: 45000, close: 45100, volume: 900 }   // Bearish
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 6);

      expect(result.marketPressure.bullishCandles).toBe(3);
      expect(result.marketPressure.bearishCandles).toBe(3);
      expect(result.marketPressure.bullishPercent).toBe(50);
    });

    it('should identify strong buying pressure', async () => {
      const strongBuyingKlines: OHLCV[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        open: 45000 + i * 50,
        high: 45000 + i * 50 + 200,
        low: 45000 + i * 50 - 50,
        close: 45000 + i * 50 + 150, // Consistently bullish
        volume: 1000 + i * 100
      }));

      mockMarketDataService.getKlines.mockResolvedValue(strongBuyingKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 10);

      expect(result.marketPressure.bullishPercent).toBeGreaterThan(80);
      expect(result.marketPressure.trend).toBe('strong_buying');
    });

    it('should identify strong selling pressure', async () => {
      const strongSellingKlines: OHLCV[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        open: 45000 - i * 50,
        high: 45000 - i * 50 + 50,
        low: 45000 - i * 50 - 200,
        close: 45000 - i * 50 - 150, // Consistently bearish
        volume: 1000 + i * 100
      }));

      mockMarketDataService.getKlines.mockResolvedValue(strongSellingKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 10);

      expect(result.marketPressure.bullishPercent).toBeLessThan(20);
      expect(result.marketPressure.trend).toBe('strong_selling');
    });
  });

  describe('Divergence Detection', () => {
    it('should detect bullish divergence (price down, volume delta up)', async () => {
      const divergenceKlines: OHLCV[] = [
        // Price trending down but with increasing buying pressure
        { timestamp: '2024-06-10T15:00:00.000Z', open: 45000, high: 45100, low: 44800, close: 44900, volume: 2000 }, // Bearish but high volume
        { timestamp: '2024-06-10T14:00:00.000Z', open: 44900, high: 45000, low: 44700, close: 44800, volume: 2200 }, // Bearish but higher volume
        { timestamp: '2024-06-10T13:00:00.000Z', open: 44800, high: 44900, low: 44600, close: 44700, volume: 2400 }, // Bearish but even higher volume
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44700, high: 44900, low: 44600, close: 44850, volume: 2600 }, // Bullish with high volume
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44850, high: 45000, low: 44750, close: 44950, volume: 2800 }  // Bullish with very high volume
      ];

      mockMarketDataService.getKlines.mockResolvedValue(divergenceKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 5);

      expect(result.divergence.detected).toBe(true);
      expect(result.divergence.signal).toBe('bullish_reversal');
    });

    it('should detect bearish divergence (price up, volume delta down)', async () => {
      const divergenceKlines: OHLCV[] = [
        // Price trending up but with decreasing buying pressure
        { timestamp: '2024-06-10T15:00:00.000Z', open: 44000, high: 44200, low: 43900, close: 44100, volume: 2000 }, // Bullish but high volume
        { timestamp: '2024-06-10T14:00:00.000Z', open: 44100, high: 44300, low: 44000, close: 44200, volume: 1800 }, // Bullish but lower volume
        { timestamp: '2024-06-10T13:00:00.000Z', open: 44200, high: 44400, low: 44100, close: 44300, volume: 1600 }, // Bullish but even lower volume
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44300, high: 44450, low: 44250, close: 44350, volume: 1400 }, // Bullish but low volume
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44350, high: 44500, low: 44300, close: 44450, volume: 1200 }  // Bullish but very low volume
      ];

      mockMarketDataService.getKlines.mockResolvedValue(divergenceKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 5);

      expect(result.divergence.detected).toBe(true);
      expect(result.divergence.signal).toBe('bearish_reversal');
    });

    it('should not detect divergence when price and volume align', async () => {
      const alignedKlines: OHLCV[] = [
        // Price and volume delta moving in same direction
        { timestamp: '2024-06-10T15:00:00.000Z', open: 44000, high: 44200, low: 43900, close: 44150, volume: 1000 }, // Bullish, normal volume
        { timestamp: '2024-06-10T14:00:00.000Z', open: 44150, high: 44350, low: 44100, close: 44300, volume: 1200 }, // Bullish, higher volume
        { timestamp: '2024-06-10T13:00:00.000Z', open: 44300, high: 44500, low: 44250, close: 44450, volume: 1400 }, // Bullish, even higher volume
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44450, high: 44650, low: 44400, close: 44600, volume: 1600 }, // Bullish, high volume
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44600, high: 44800, low: 44550, close: 44750, volume: 1800 }  // Bullish, highest volume
      ];

      mockMarketDataService.getKlines.mockResolvedValue(alignedKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 5);

      expect(result.divergence.detected).toBe(false);
      expect(result.divergence.signal).toBe('trend_confirmed');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero volume gracefully', async () => {
      const zeroVolumeKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45100, low: 44900, close: 45000, volume: 0 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45000, high: 45050, low: 44950, close: 45025, volume: 0 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45025, high: 45075, low: 44975, close: 45050, volume: 0 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(zeroVolumeKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 3);

      expect(result.current).toBe(0);
      expect(result.average).toBe(0);
      expect(result.bias).toBe('neutral');
      expect(result.cumulativeDelta).toBe(0);
    });

    it('should handle doji candles (open = close)', async () => {
      const dojiKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45100, low: 44900, close: 45000, volume: 1000 }, // Doji
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45000, high: 45050, low: 44950, close: 45000, volume: 1200 }, // Doji
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45025, low: 44975, close: 45000, volume: 1100 }  // Doji
      ];

      mockMarketDataService.getKlines.mockResolvedValue(dojiKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 3);

      expect(result.current).toBe(0);
      expect(result.bias).toBe('neutral');
      expect(result.marketPressure.bullishCandles).toBe(0);
      expect(result.marketPressure.bearishCandles).toBe(0);
    });

    it('should handle single candle data', async () => {
      const singleKline: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45200, low: 44800, close: 45100, volume: 1000 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(singleKline);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 1);

      expect(result.current).toBeGreaterThan(0); // Bullish candle
      expect(result.average).toEqual(result.current); // Only one data point
      expect(result.bias).toBe('buyer');
      expect(result.cumulativeDelta).toEqual(result.current);
    });
  });

  describe('Mathematical Accuracy', () => {
    it('should calculate cumulative delta correctly', async () => {
      const testKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45200, low: 44900, close: 45100, volume: 1000 }, // +100 delta
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45100, high: 45150, low: 44950, close: 45000, volume: 1200 }, // -120 delta
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45300, low: 44950, close: 45200, volume: 1500 }  // +300 delta
      ];

      mockMarketDataService.getKlines.mockResolvedValue(testKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 3);

      // Expected cumulative: +100 + (-120) + (+300) = +280
      const expectedCumulative = 1000 - 1200 + 1500; // Simplified calculation
      expect(result.cumulativeDelta).toBeCloseTo(expectedCumulative, 0);
    });

    it('should calculate percentage bias correctly', async () => {
      const testKlines: OHLCV[] = [
        { timestamp: '2024-06-10T15:00:00.000Z', open: 45000, high: 45200, low: 44900, close: 45100, volume: 1000 }, // Bullish
        { timestamp: '2024-06-10T14:00:00.000Z', open: 45100, high: 45300, low: 45000, close: 45200, volume: 1000 }, // Bullish
        { timestamp: '2024-06-10T13:00:00.000Z', open: 45200, high: 45300, low: 45000, close: 45100, volume: 1000 }, // Bearish
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45100, high: 45250, low: 44950, close: 45150, volume: 1000 }, // Bullish
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45150, high: 45300, low: 45050, close: 45200, volume: 1000 }  // Bullish
      ];

      mockMarketDataService.getKlines.mockResolvedValue(testKlines);

      const result = await analysisService.analyzeVolumeDelta('BTCUSDT', '60', 5);

      // 4 bullish out of 5 = 80%
      expect(result.marketPressure.bullishPercent).toBe(80);
      expect(result.marketPressure.bullishCandles).toBe(4);
      expect(result.marketPressure.bearishCandles).toBe(1);
    });
  });
});
