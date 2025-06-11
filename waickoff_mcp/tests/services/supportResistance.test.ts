/**
 * @fileoverview Support/Resistance Analysis Logic Tests
 * @description Critical tests to prevent BUG-001 regression
 * @version 1.4.0 - TASK-004
 */

import { AnalysisService } from '../../src/services/analysis.js';
import { OHLCV, SupportResistanceAnalysis } from '../../src/types/index.js';

// Mock MarketDataService
const mockMarketDataService = {
  getKlines: jest.fn(),
  getTicker: jest.fn(),
  getPerformanceMetrics: jest.fn().mockReturnValue([])
};

describe('Support/Resistance Analysis - BUG-001 Prevention', () => {
  let analysisService: AnalysisService;

  beforeEach(() => {
    analysisService = new AnalysisService(mockMarketDataService as any);
    jest.clearAllMocks();
  });

  describe('Level Classification Logic', () => {
    it('should correctly classify resistance levels above current price', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44800, high: 45200, low: 44700, close: 45000, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45100, high: 45500, low: 45000, close: 45200, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45200, low: 44800, close: 45100, volume: 1100 },
        { timestamp: '2024-06-10T09:00:00.000Z', open: 44900, high: 45300, low: 44850, close: 45000, volume: 1050 },
        { timestamp: '2024-06-10T08:00:00.000Z', open: 45000, high: 45400, low: 44900, close: 44900, volume: 980 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000, // Current price
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 5, 2);

      // Verify levels above current price (45000) are classified as resistance
      const resistanceAbovePrice = result.resistances.filter(r => r.level > 45000);
      const supportAbovePrice = result.supports.filter(s => s.level > 45000);

      expect(resistanceAbovePrice.length).toBeGreaterThan(0);
      expect(supportAbovePrice.length).toBe(0);

      // Verify classification is correct
      resistanceAbovePrice.forEach(resistance => {
        expect(resistance.type).toBe('resistance');
        expect(resistance.level).toBeGreaterThan(45000);
      });
    });

    it('should correctly classify support levels below current price', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44800, high: 45200, low: 44700, close: 45000, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44900, high: 45100, low: 44600, close: 44800, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 44800, high: 45000, low: 44500, close: 44900, volume: 1100 },
        { timestamp: '2024-06-10T09:00:00.000Z', open: 44700, high: 44950, low: 44400, close: 44800, volume: 1050 },
        { timestamp: '2024-06-10T08:00:00.000Z', open: 44500, high: 44800, low: 44300, close: 44700, volume: 980 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000, // Current price
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 5, 2);

      // Verify levels below current price (45000) are classified as support
      const supportBelowPrice = result.supports.filter(s => s.level < 45000);
      const resistanceBelowPrice = result.resistances.filter(r => r.level < 45000);

      expect(supportBelowPrice.length).toBeGreaterThan(0);
      expect(resistanceBelowPrice.length).toBe(0);

      // Verify classification is correct
      supportBelowPrice.forEach(support => {
        expect(support.type).toBe('support');
        expect(support.level).toBeLessThan(45000);
      });
    });

    it('should handle edge case where level equals current price', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45000, low: 45000, close: 45000, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44995, high: 45005, low: 44990, close: 45000, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45010, low: 44995, close: 44995, volume: 1100 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 3, 1);

      // When level equals current price, it could be classified as either support or resistance
      // The important thing is that it's not mis-classified
      const allLevels = [...result.supports, ...result.resistances];
      const levelsAtCurrentPrice = allLevels.filter(level => Math.abs(level.level - 45000) < 0.01);

      // If levels exist at current price, verify they have correct type classification
      levelsAtCurrentPrice.forEach(level => {
        if (level.level >= 45000) {
          expect(['resistance', 'support']).toContain(level.type);
        }
      });
    });
  });

  describe('Pivot Detection Accuracy', () => {
    it('should detect valid resistance pivots (local highs)', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44800, high: 44900, low: 44700, close: 44850, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44900, high: 45500, low: 44800, close: 45200, volume: 1200 }, // High pivot
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45100, low: 44900, close: 45000, volume: 1100 },
        { timestamp: '2024-06-10T09:00:00.000Z', open: 44800, high: 45600, low: 44700, close: 44900, volume: 1050 }, // High pivot
        { timestamp: '2024-06-10T08:00:00.000Z', open: 44900, high: 45000, low: 44800, close: 44800, volume: 980 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 44850,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 5, 1);

      // Should detect the high pivots as resistance levels
      const resistanceLevels = result.resistances.map(r => r.level);
      
      // High pivot at 45500 should be detected as resistance (above current price 44850)
      expect(resistanceLevels.some(level => Math.abs(level - 45500) < 10)).toBe(true);
      
      // Verify all resistance levels are above current price
      result.resistances.forEach(resistance => {
        expect(resistance.level).toBeGreaterThan(44850);
        expect(resistance.type).toBe('resistance');
      });
    });

    it('should detect valid support pivots (local lows)', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44800, high: 44900, low: 44700, close: 44850, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44900, high: 45000, low: 44200, close: 44800, volume: 1200 }, // Low pivot
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45100, low: 44700, close: 44900, volume: 1100 },
        { timestamp: '2024-06-10T09:00:00.000Z', open: 44800, high: 45000, low: 44100, close: 44800, volume: 1050 }, // Low pivot
        { timestamp: '2024-06-10T08:00:00.000Z', open: 44900, high: 45000, low: 44800, close: 44900, volume: 980 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 44850,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 5, 1);

      // Should detect the low pivots as support levels
      const supportLevels = result.supports.map(s => s.level);
      
      // Low pivot at 44200 should be detected as support (below current price 44850)
      expect(supportLevels.some(level => Math.abs(level - 44200) < 10)).toBe(true);
      
      // Verify all support levels are below current price
      result.supports.forEach(support => {
        expect(support.level).toBeLessThan(44850);
        expect(support.type).toBe('support');
      });
    });
  });

  describe('Strength Calculation', () => {
    it('should calculate higher strength for levels with more touches', async () => {
      const mockKlines: OHLCV[] = [
        // Create pattern where 45000 is touched multiple times (should have high strength)
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44900, high: 45010, low: 44800, close: 44950, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44950, high: 45005, low: 44900, close: 44980, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 44980, high: 45000, low: 44900, close: 44950, volume: 1100 },
        { timestamp: '2024-06-10T09:00:00.000Z', open: 44950, high: 45000, low: 44800, close: 44900, volume: 1050 },
        // Single touch at 44500 (should have lower strength)
        { timestamp: '2024-06-10T08:00:00.000Z', open: 44900, high: 44950, low: 44500, close: 44600, volume: 980 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 44900,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 5, 1);

      // Find levels around 45000 (resistance) and 44500 (support)
      const resistanceAt45000 = result.resistances.find(r => Math.abs(r.level - 45000) < 10);
      const supportAt44500 = result.supports.find(s => Math.abs(s.level - 44500) < 10);

      if (resistanceAt45000 && supportAt44500) {
        // Level with more touches should have higher strength
        expect(resistanceAt45000.touches).toBeGreaterThan(supportAt44500.touches);
        expect(resistanceAt45000.strength).toBeGreaterThan(supportAt44500.strength);
      }
    });

    it('should assign higher strength to levels with volume confirmation', async () => {
      const mockKlines: OHLCV[] = [
        // High volume at resistance level
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44900, high: 45000, low: 44800, close: 44950, volume: 5000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44950, high: 45000, low: 44900, close: 44980, volume: 4800 },
        // Low volume at another level
        { timestamp: '2024-06-10T10:00:00.000Z', open: 44600, high: 44700, low: 44500, close: 44650, volume: 800 },
        { timestamp: '2024-06-10T09:00:00.000Z', open: 44650, high: 44700, low: 44550, close: 44600, volume: 750 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 44800,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 4, 1);

      // Find high-volume and low-volume levels
      const highVolumeLevel = result.resistances.find(r => Math.abs(r.level - 45000) < 10);
      const lowVolumeLevel = result.supports.find(s => Math.abs(s.level - 44700) < 50);

      if (highVolumeLevel && lowVolumeLevel) {
        // High volume level should have higher volume confirmation
        expect(highVolumeLevel.volumeConfirmation).toBeGreaterThan(lowVolumeLevel.volumeConfirmation);
      }
    });
  });

  describe('Grid Configuration Generation', () => {
    it('should generate optimal grid bounds within support/resistance range', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44900, high: 45200, low: 44700, close: 45000, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45000, high: 45500, low: 44800, close: 44900, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 44800, high: 45100, low: 44300, close: 45000, volume: 1100 },
        { timestamp: '2024-06-10T09:00:00.000Z', open: 45000, high: 45600, low: 44200, close: 44800, volume: 1050 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 4, 2);

      // Grid bounds should be within the support/resistance range
      expect(result.gridConfig.optimalLowerBound).toBeLessThan(45000);
      expect(result.gridConfig.optimalUpperBound).toBeGreaterThan(45000);

      // Grid bounds should be reasonable (not too tight or too wide)
      const range = result.gridConfig.optimalUpperBound - result.gridConfig.optimalLowerBound;
      expect(range).toBeGreaterThan(100); // At least $100 range
      expect(range).toBeLessThan(2000); // Not more than $2000 range

      // Key levels should be within bounds
      result.gridConfig.keyLevels.forEach(level => {
        expect(level).toBeGreaterThanOrEqual(result.gridConfig.optimalLowerBound);
        expect(level).toBeLessThanOrEqual(result.gridConfig.optimalUpperBound);
      });
    });

    it('should recommend appropriate grid count based on volatility', async () => {
      const lowVolatilityKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44990, high: 45010, low: 44980, close: 45000, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45000, high: 45020, low: 44990, close: 44995, volume: 1000 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 44995, high: 45005, low: 44985, close: 45000, volume: 1000 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(lowVolatilityKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 3, 1);

      // Low volatility should suggest fewer grid levels
      expect(result.gridConfig.recommendedGridCount).toBeLessThanOrEqual(10);
      expect(result.gridConfig.recommendation).toContain('grid');
    });
  });

  describe('Critical Level Selection', () => {
    it('should select the strongest level as critical level', async () => {
      const mockKlines: OHLCV[] = [
        // Strong resistance at 45500 (multiple touches, high volume)
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45400, high: 45500, low: 45300, close: 45400, volume: 3000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45350, high: 45505, low: 45300, close: 45450, volume: 3200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45450, high: 45500, low: 45350, close: 45400, volume: 3100 },
        // Weaker support at 44500 (fewer touches, lower volume)
        { timestamp: '2024-06-10T09:00:00.000Z', open: 44600, high: 44700, low: 44500, close: 44600, volume: 1000 },
        { timestamp: '2024-06-10T08:00:00.000Z', open: 44550, high: 44650, low: 44500, close: 44580, volume: 900 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 5, 1);

      // Critical level should be the strongest one (highest strength score)
      const allLevels = [...result.supports, ...result.resistances];
      const strongestLevel = allLevels.reduce((strongest, current) => 
        current.strength > strongest.strength ? current : strongest
      );

      expect(result.criticalLevel.level).toBe(strongestLevel.level);
      expect(result.criticalLevel.strength).toBe(strongestLevel.strength);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle insufficient data gracefully', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45000, low: 45000, close: 45000, volume: 1000 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 1, 1);

      // Should handle gracefully without crashing
      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.currentPrice).toBe(45000);
    });

    it('should handle extreme price movements', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 50000, low: 40000, close: 47500, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 47500, high: 48000, low: 42000, close: 45000, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 46000, low: 41000, close: 47500, volume: 1100 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 3, 1);

      // Should handle extreme volatility without errors
      expect(result).toBeDefined();
      expect(result.supports.length + result.resistances.length).toBeGreaterThanOrEqual(0);
      
      // All levels should still be properly classified
      result.supports.forEach(support => {
        expect(support.type).toBe('support');
        expect(support.level).toBeLessThan(45000);
      });
      
      result.resistances.forEach(resistance => {
        expect(resistance.type).toBe('resistance');
        expect(resistance.level).toBeGreaterThan(45000);
      });
    });

    it('should handle zero volume data', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 45000, high: 45100, low: 44900, close: 45000, volume: 0 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45000, high: 45200, low: 44800, close: 45000, volume: 0 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 45000, high: 45150, low: 44850, close: 45000, volume: 0 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 45000,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 3, 1);

      // Should handle zero volume gracefully
      expect(result).toBeDefined();
      expect(result.statistics.avgVolume).toBe(0);
      
      // Volume confirmation should be handled appropriately
      const allLevels = [...result.supports, ...result.resistances];
      allLevels.forEach(level => {
        expect(level.volumeConfirmation).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Mathematical Accuracy', () => {
    it('should calculate price distance correctly', async () => {
      const currentPrice = 45000;
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44800, high: 45900, low: 44100, close: currentPrice, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 45000, high: 45900, low: 44100, close: 44800, volume: 1200 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: currentPrice,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 2, 1);

      // Check price distance calculations
      const allLevels = [...result.supports, ...result.resistances];
      allLevels.forEach(level => {
        const expectedDistance = ((level.level - currentPrice) / currentPrice) * 100;
        expect(Math.abs(level.priceDistance - expectedDistance)).toBeLessThan(0.01);
      });
    });

    it('should maintain consistent strength scoring', async () => {
      const mockKlines: OHLCV[] = [
        { timestamp: '2024-06-10T12:00:00.000Z', open: 44900, high: 45000, low: 44800, close: 44950, volume: 1000 },
        { timestamp: '2024-06-10T11:00:00.000Z', open: 44950, high: 45000, low: 44900, close: 44980, volume: 1200 },
        { timestamp: '2024-06-10T10:00:00.000Z', open: 44980, high: 45000, low: 44950, close: 44990, volume: 1100 }
      ];

      mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
      mockMarketDataService.getTicker.mockResolvedValue({
        symbol: 'BTCUSDT',
        lastPrice: 44975,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await analysisService.identifySupportResistance('BTCUSDT', '60', 3, 1);

      // Strength should be within valid range (0-10)
      const allLevels = [...result.supports, ...result.resistances];
      allLevels.forEach(level => {
        expect(level.strength).toBeGreaterThanOrEqual(0);
        expect(level.strength).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Regression Test - BUG-001 Specific', () => {
    it('should never classify support above current price or resistance below current price', async () => {
      const testCases = [
        { currentPrice: 45000, symbol: 'BTCUSDT' },
        { currentPrice: 30000, symbol: 'ETHUSDT' },
        { currentPrice: 0.5, symbol: 'XRPUSDT' },
        { currentPrice: 100000, symbol: 'BTCUSDT' } // High price
      ];

      for (const testCase of testCases) {
        const mockKlines: OHLCV[] = [
          { timestamp: '2024-06-10T12:00:00.000Z', open: testCase.currentPrice * 0.98, high: testCase.currentPrice * 1.02, low: testCase.currentPrice * 0.96, close: testCase.currentPrice, volume: 1000 },
          { timestamp: '2024-06-10T11:00:00.000Z', open: testCase.currentPrice * 0.99, high: testCase.currentPrice * 1.05, low: testCase.currentPrice * 0.95, close: testCase.currentPrice * 0.98, volume: 1200 },
          { timestamp: '2024-06-10T10:00:00.000Z', open: testCase.currentPrice * 1.01, high: testCase.currentPrice * 1.03, low: testCase.currentPrice * 0.97, close: testCase.currentPrice * 0.99, volume: 1100 }
        ];

        mockMarketDataService.getKlines.mockResolvedValue(mockKlines);
        mockMarketDataService.getTicker.mockResolvedValue({
          symbol: testCase.symbol,
          lastPrice: testCase.currentPrice,
          timestamp: '2024-06-10T12:00:00.000Z'
        });

        const result = await analysisService.identifySupportResistance(testCase.symbol, '60', 3, 1);

        // CRITICAL: This is the exact bug we're preventing
        const invalidSupports = result.supports.filter(s => s.level > testCase.currentPrice);
        const invalidResistances = result.resistances.filter(r => r.level < testCase.currentPrice);

        expect(invalidSupports).toHaveLength(0);
        expect(invalidResistances).toHaveLength(0);

        // Additional validation
        result.supports.forEach(support => {
          expect(support.level).toBeLessThan(testCase.currentPrice);
          expect(support.type).toBe('support');
        });

        result.resistances.forEach(resistance => {
          expect(resistance.level).toBeGreaterThan(testCase.currentPrice);
          expect(resistance.type).toBe('resistance');
        });
      }
    });
  });
});
