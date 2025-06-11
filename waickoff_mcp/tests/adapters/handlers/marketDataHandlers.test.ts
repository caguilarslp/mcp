/**
 * @fileoverview MarketDataHandlers Unit Tests
 * @description Test MarketDataHandlers delegation pattern and error handling
 * @version 1.4.0 - TASK-004
 */

import { MarketDataHandlers } from '../../../src/adapters/handlers/marketDataHandlers';
import { MarketAnalysisEngine } from '../../../src/core/engine';
import { FileLogger } from '../../../src/utils/fileLogger';
import { MarketTicker, Orderbook, OHLCV, MCPServerResponse } from '../../../src/types/index';
import { createMockEngine, MockedMarketAnalysisEngine } from '../../test-utils';

// Mock dependencies
jest.mock('../../../src/core/engine');
jest.mock('../../../src/utils/fileLogger');

describe('MarketDataHandlers', () => {
  let handlers: MarketDataHandlers;
  let mockEngine: MockedMarketAnalysisEngine;
  let mockLogger: jest.Mocked<FileLogger>;

  beforeEach(() => {
    // Create mocked engine
    mockEngine = createMockEngine();
    
    // Create mocked logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    } as any;

    // Initialize handlers with mocked dependencies
    handlers = new MarketDataHandlers(mockEngine, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetTicker', () => {
    it('should handle successful ticker request', async () => {
      // Mock successful engine response
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

      mockEngine.getTicker = jest.fn().mockResolvedValue({
        success: true,
        data: mockTicker,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = {
        symbol: 'BTCUSDT',
        category: 'spot'
      };

      // Execute handler
      const result: MCPServerResponse = await handlers.handleGetTicker(args);

      // Verify engine was called correctly
      expect(mockEngine.getTicker).toHaveBeenCalledWith('BTCUSDT', 'spot');

      // Verify response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      // Parse response text and verify data
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.symbol).toBe('BTCUSDT');
      expect(responseData.current_price).toBe('$45,000.0000');
      expect(responseData.change_24h).toBe('+2.50%');
    });

    it('should handle missing symbol parameter', async () => {
      const args = {}; // Missing symbol

      await expect(handlers.handleGetTicker(args)).rejects.toThrow('Symbol is required');
    });

    it('should handle engine error', async () => {
      mockEngine.getTicker = jest.fn().mockResolvedValue({
        success: false,
        error: 'API timeout',
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };

      await expect(handlers.handleGetTicker(args)).rejects.toThrow('API timeout');
    });

    it('should use default category when not provided', async () => {
      const mockTicker: MarketTicker = {
        symbol: 'ETHUSDT',
        lastPrice: 3000,
        price24hPcnt: -1.2,
        highPrice24h: 3100,
        lowPrice24h: 2950,
        volume24h: 500000,
        bid1Price: 2999,
        ask1Price: 3001,
        timestamp: '2024-06-10T12:00:00.000Z'
      };

      mockEngine.getTicker = jest.fn().mockResolvedValue({
        success: true,
        data: mockTicker,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'ETHUSDT' };

      await handlers.handleGetTicker(args);

      expect(mockEngine.getTicker).toHaveBeenCalledWith('ETHUSDT', 'spot');
    });
  });

  describe('handleGetOrderbook', () => {
    it('should handle successful orderbook request', async () => {
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

      mockEngine.getOrderbook = jest.fn().mockResolvedValue({
        success: true,
        data: mockOrderbook,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = {
        symbol: 'BTCUSDT',
        category: 'spot',
        limit: 25
      };

      const result = await handlers.handleGetOrderbook(args);

      expect(mockEngine.getOrderbook).toHaveBeenCalledWith('BTCUSDT', 'spot', 25);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.symbol).toBe('BTCUSDT');
      expect(responseData.spread).toBe('$2.00');
      expect(responseData.bids).toHaveLength(2);
      expect(responseData.asks).toHaveLength(2);
    });

    it('should use default parameters', async () => {
      const mockOrderbook: Orderbook = {
        symbol: 'ETHUSDT',
        bids: [{ price: 2999, size: 1.0 }],
        asks: [{ price: 3001, size: 1.0 }],
        timestamp: '2024-06-10T12:00:00.000Z',
        spread: 2
      };

      mockEngine.getOrderbook = jest.fn().mockResolvedValue({
        success: true,
        data: mockOrderbook,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'ETHUSDT' };

      await handlers.handleGetOrderbook(args);

      expect(mockEngine.getOrderbook).toHaveBeenCalledWith('ETHUSDT', 'spot', 25);
    });
  });

  describe('handleGetMarketData', () => {
    it('should handle successful market data request', async () => {
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

      mockEngine.getComprehensiveMarketData = jest.fn().mockResolvedValue({
        success: true,
        data: {
          ticker: mockTicker,
          orderbook: mockOrderbook,
          klines: mockKlines
        },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };

      const result = await handlers.handleGetMarketData(args);

      expect(mockEngine.getComprehensiveMarketData).toHaveBeenCalledWith('BTCUSDT', 'spot');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.symbol).toBe('BTCUSDT');
      expect(responseData.ticker).toBeDefined();
      expect(responseData.orderbook).toBeDefined();
      expect(responseData.recent_klines).toBeDefined();
    });

    it('should handle comprehensive market data failure', async () => {
      mockEngine.getComprehensiveMarketData = jest.fn().mockResolvedValue({
        success: false,
        error: 'Market data unavailable',
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };

      await expect(handlers.handleGetMarketData(args)).rejects.toThrow('Market data unavailable');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockEngine.getTicker = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const args = { symbol: 'BTCUSDT' };

      await expect(handlers.handleGetTicker(args)).rejects.toThrow('Network timeout');
    });

    it('should handle malformed responses', async () => {
      mockEngine.getTicker = jest.fn().mockResolvedValue({
        success: false,
        error: 'Invalid response format',
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'INVALID_SYMBOL' };

      await expect(handlers.handleGetTicker(args)).rejects.toThrow('Invalid response format');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate symbol parameter presence', async () => {
      const testCases = [
        {},
        { symbol: '' },
        { symbol: null },
        { symbol: undefined }
      ];

      for (const args of testCases) {
        await expect(handlers.handleGetTicker(args)).rejects.toThrow('Symbol is required');
        await expect(handlers.handleGetOrderbook(args)).rejects.toThrow('Symbol is required');
        await expect(handlers.handleGetMarketData(args)).rejects.toThrow('Symbol is required');
      }
    });

    it('should handle valid categories', async () => {
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

      mockEngine.getTicker = jest.fn().mockResolvedValue({
        success: true,
        data: mockTicker,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const categories = ['spot', 'linear', 'inverse'];

      for (const category of categories) {
        const args = { symbol: 'BTCUSDT', category };
        await handlers.handleGetTicker(args);
        expect(mockEngine.getTicker).toHaveBeenCalledWith('BTCUSDT', category);
      }
    });
  });

  describe('Response Formatting', () => {
    it('should format ticker responses consistently', async () => {
      const mockTicker: MarketTicker = {
        symbol: 'BTCUSDT',
        lastPrice: 45123.456789,
        price24hPcnt: -2.345678,
        highPrice24h: 46000.123,
        lowPrice24h: 44000.789,
        volume24h: 1234567.89,
        bid1Price: 45122.111,
        ask1Price: 45124.999,
        timestamp: '2024-06-10T12:00:00.000Z'
      };

      mockEngine.getTicker = jest.fn().mockResolvedValue({
        success: true,
        data: mockTicker,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };
      const result = await handlers.handleGetTicker(args);

      const responseData = JSON.parse(result.content[0].text);

      // Check price formatting
      expect(responseData.current_price).toBe('$45,123.4568');
      expect(responseData.change_24h).toBe('-2.35%');
      expect(responseData.volume_24h).toBe('1,234,567.89');

      // Check spread calculation
      const expectedSpread = (45124.999 - 45122.111).toFixed(4);
      expect(responseData.spread).toBe(`$${expectedSpread}`);
    });
  });
});
