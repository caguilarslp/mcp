/**
 * @fileoverview MCPHandlers Unit Tests - Main Orchestrator
 * @description Test delegation pattern and modular architecture
 * @version 1.4.0 - TASK-004
 */

import { MCPHandlers } from '../../src/adapters/mcp-handlers';
import { MarketAnalysisEngine } from '../../src/core/engine';
import { MarketDataHandlers } from '../../src/adapters/handlers/marketDataHandlers';
import { AnalysisRepositoryHandlers } from '../../src/adapters/handlers/analysisRepositoryHandlers';
import { ReportGeneratorHandlers } from '../../src/adapters/handlers/reportGeneratorHandlers';
import { CacheHandlers } from '../../src/adapters/cacheHandlers';
import { MCPServerResponse } from '../../src/types/index';
import { createMockEngine } from '../test-utils';

// Mock all dependencies
jest.mock('../../src/core/engine');
jest.mock('../../src/adapters/handlers/marketDataHandlers');
jest.mock('../../src/adapters/handlers/analysisRepositoryHandlers');
jest.mock('../../src/adapters/handlers/reportGeneratorHandlers');
jest.mock('../../src/adapters/cacheHandlers');
jest.mock('../../src/utils/fileLogger');

describe('MCPHandlers - Delegation Pattern', () => {
  let mcpHandlers: MCPHandlers;
  let mockEngine: ReturnType<typeof createMockEngine>;
  let mockMarketDataHandlers: jest.Mocked<MarketDataHandlers>;
  let mockAnalysisRepositoryHandlers: jest.Mocked<AnalysisRepositoryHandlers>;
  let mockReportGeneratorHandlers: jest.Mocked<ReportGeneratorHandlers>;
  let mockCacheHandlers: jest.Mocked<CacheHandlers>;

  beforeEach(() => {
    // Mock engine using test utils
    mockEngine = createMockEngine();

    // Mock specialized handlers
    mockMarketDataHandlers = {
      handleGetTicker: jest.fn(),
      handleGetOrderbook: jest.fn(),
      handleGetMarketData: jest.fn()
    } as any;

    mockAnalysisRepositoryHandlers = {
      handleGetAnalysisById: jest.fn(),
      handleGetLatestAnalysis: jest.fn(),
      handleSearchAnalyses: jest.fn(),
      handleGetAnalysisSummary: jest.fn(),
      handleGetAggregatedMetrics: jest.fn(),
      handleFindPatterns: jest.fn(),
      handleGetRepositoryStats: jest.fn()
    } as any;

    mockReportGeneratorHandlers = {
      handleGenerateReport: jest.fn(),
      handleGenerateDailyReport: jest.fn(),
      handleGenerateWeeklyReport: jest.fn(),
      handleGenerateSymbolReport: jest.fn(),
      handleGeneratePerformanceReport: jest.fn(),
      handleGetReport: jest.fn(),
      handleListReports: jest.fn(),
      handleExportReport: jest.fn()
    } as any;

    mockCacheHandlers = {
      handleGetCacheStats: jest.fn(),
      handleClearCache: jest.fn(),
      handleInvalidateCache: jest.fn()
    } as any;

    // Mock constructors to return our mocked handlers
    (MarketDataHandlers as jest.MockedClass<typeof MarketDataHandlers>).mockImplementation(() => mockMarketDataHandlers);
    (AnalysisRepositoryHandlers as jest.MockedClass<typeof AnalysisRepositoryHandlers>).mockImplementation(() => mockAnalysisRepositoryHandlers);
    (ReportGeneratorHandlers as jest.MockedClass<typeof ReportGeneratorHandlers>).mockImplementation(() => mockReportGeneratorHandlers);
    (CacheHandlers as jest.MockedClass<typeof CacheHandlers>).mockImplementation(() => mockCacheHandlers);

    mcpHandlers = new MCPHandlers(mockEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize all specialized handlers', () => {
      expect(MarketDataHandlers).toHaveBeenCalledWith(mockEngine, expect.anything());
      expect(AnalysisRepositoryHandlers).toHaveBeenCalledWith(mockEngine, expect.anything());
      expect(ReportGeneratorHandlers).toHaveBeenCalledWith(mockEngine, expect.anything());
      expect(CacheHandlers).toHaveBeenCalledWith(mockEngine);
    });
  });

  describe('Market Data Handler Delegation', () => {
    it('should delegate handleGetTicker to MarketDataHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"symbol": "BTCUSDT", "price": 45000}' }]
      };

      mockMarketDataHandlers.handleGetTicker.mockResolvedValue(mockResponse);

      const args = { symbol: 'BTCUSDT' };
      const result = await mcpHandlers.handleGetTicker(args);

      expect(mockMarketDataHandlers.handleGetTicker).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });

    it('should delegate handleGetOrderbook to MarketDataHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"symbol": "BTCUSDT", "bids": [], "asks": []}' }]
      };

      mockMarketDataHandlers.handleGetOrderbook.mockResolvedValue(mockResponse);

      const args = { symbol: 'BTCUSDT', limit: 25 };
      const result = await mcpHandlers.handleGetOrderbook(args);

      expect(mockMarketDataHandlers.handleGetOrderbook).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });

    it('should delegate handleGetMarketData to MarketDataHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"symbol": "BTCUSDT", "ticker": {}, "orderbook": {}}' }]
      };

      mockMarketDataHandlers.handleGetMarketData.mockResolvedValue(mockResponse);

      const args = { symbol: 'BTCUSDT' };
      const result = await mcpHandlers.handleGetMarketData(args);

      expect(mockMarketDataHandlers.handleGetMarketData).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });
  });

  describe('Analysis Repository Handler Delegation', () => {
    it('should delegate handleGetAnalysisById to AnalysisRepositoryHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"analysis": {"id": "uuid-123"}}' }]
      };

      mockAnalysisRepositoryHandlers.handleGetAnalysisById.mockResolvedValue(mockResponse);

      const args = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const result = await mcpHandlers.handleGetAnalysisById(args);

      expect(mockAnalysisRepositoryHandlers.handleGetAnalysisById).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });

    it('should delegate handleSearchAnalyses to AnalysisRepositoryHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"search_results": {"total": 5}}' }]
      };

      mockAnalysisRepositoryHandlers.handleSearchAnalyses.mockResolvedValue(mockResponse);

      const args = { symbol: 'BTCUSDT', limit: 10 };
      const result = await mcpHandlers.handleSearchAnalyses(args);

      expect(mockAnalysisRepositoryHandlers.handleSearchAnalyses).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });

    it('should delegate handleGetRepositoryStats to AnalysisRepositoryHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"repository_stats": {"totalAnalyses": 150}}' }]
      };

      mockAnalysisRepositoryHandlers.handleGetRepositoryStats.mockResolvedValue(mockResponse);

      const args = {};
      const result = await mcpHandlers.handleGetRepositoryStats(args);

      expect(mockAnalysisRepositoryHandlers.handleGetRepositoryStats).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });
  });

  describe('Report Generator Handler Delegation', () => {
    it('should delegate handleGenerateReport to ReportGeneratorHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"report": {"id": "report-123"}}' }]
      };

      mockReportGeneratorHandlers.handleGenerateReport.mockResolvedValue(mockResponse);

      const args = { type: 'daily', symbol: 'BTCUSDT' };
      const result = await mcpHandlers.handleGenerateReport(args);

      expect(mockReportGeneratorHandlers.handleGenerateReport).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });

    it('should delegate handleListReports to ReportGeneratorHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"reports": []}' }]
      };

      mockReportGeneratorHandlers.handleListReports.mockResolvedValue(mockResponse);

      const args = { limit: 10 };
      const result = await mcpHandlers.handleListReports(args);

      expect(mockReportGeneratorHandlers.handleListReports).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });
  });

  describe('Cache Handler Delegation', () => {
    it('should delegate handleGetCacheStats to CacheHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"cache_stats": {"hit_rate": 85}}' }]
      };

      mockCacheHandlers.handleGetCacheStats.mockResolvedValue(mockResponse);

      const args = {};
      const result = await mcpHandlers.handleGetCacheStats(args);

      expect(mockCacheHandlers.handleGetCacheStats).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });

    it('should delegate handleClearCache to CacheHandlers', async () => {
      const mockResponse: MCPServerResponse = {
        content: [{ type: 'text', text: '{"cache_cleared": true}' }]
      };

      mockCacheHandlers.handleClearCache.mockResolvedValue(mockResponse);

      const args = { confirm: true };
      const result = await mcpHandlers.handleClearCache(args);

      expect(mockCacheHandlers.handleClearCache).toHaveBeenCalledWith(args);
      expect(result).toBe(mockResponse);
    });
  });

  describe('Direct Engine Handlers (Non-delegated)', () => {
    it('should handle analyzeVolatility directly with engine', async () => {
      mockEngine.performTechnicalAnalysis = jest.fn().mockResolvedValue({
        success: true,
        data: {
          volatility: {
            symbol: 'BTCUSDT',
            period: '1d',
            currentPrice: 45000,
            highestPrice: 46000,
            lowestPrice: 44000,
            volatilityPercent: 4.5,
            isGoodForGrid: true,
            recommendation: 'proceed',
            confidence: 85
          }
        },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT', period: '1d' };
      const result = await mcpHandlers.handleAnalyzeVolatility(args);

      expect(mockEngine.performTechnicalAnalysis).toHaveBeenCalledWith('BTCUSDT', {
        includeVolatility: true,
        includeVolume: false,
        includeVolumeDelta: false,
        includeSupportResistance: false
      });

      expect(result.content[0].type).toBe('text');
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.symbol).toBe('BTCUSDT');
      expect(responseData.volatilidad).toBe('4.50%');
    });

    it('should handle performTechnicalAnalysis with comprehensive options', async () => {
      mockEngine.performTechnicalAnalysis = jest.fn().mockResolvedValue({
        success: true,
        data: {
          volatility: { volatilityPercent: 4.5, isGoodForGrid: true, recommendation: 'proceed', confidence: 85 },
          volume: { trend: 'increasing', vwap: { priceVsVwap: 'above', difference: 2.1 } },
          volumeDelta: { bias: 'buyer', strength: 75, divergence: { detected: false } },
          supportResistance: { resistances: [{ level: 46000 }], supports: [{ level: 44000 }] }
        },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = {
        symbol: 'BTCUSDT',
        includeVolatility: true,
        includeVolume: true,
        includeVolumeDelta: true,
        includeSupportResistance: true
      };

      const result = await mcpHandlers.handlePerformTechnicalAnalysis(args);

      expect(mockEngine.performTechnicalAnalysis).toHaveBeenCalledWith('BTCUSDT', {
        includeVolatility: true,
        includeVolume: true,
        includeVolumeDelta: true,
        includeSupportResistance: true,
        timeframe: '60',
        periods: 100
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.symbol).toBe('BTCUSDT');
      expect(responseData.volatility).toBeDefined();
      expect(responseData.volume).toBeDefined();
      expect(responseData.volume_delta).toBeDefined();
      expect(responseData.support_resistance).toBeDefined();
    });

    it('should handle getCompleteAnalysis with optional investment', async () => {
      mockEngine.getCompleteAnalysis = jest.fn().mockResolvedValue({
        success: true,
        data: {
          summary: { recommendation: 'BUY', confidence: 90, riskLevel: 'medium', keyPoints: ['High volatility'] },
          marketData: { ticker: { lastPrice: 45000, price24hPcnt: 2.5 } },
          technicalAnalysis: { volatility: { volatilityPercent: 4.5, isGoodForGrid: true } },
          gridSuggestion: { recommendation: 'recommended', confidence: 85 }
        },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT', investment: 1000 };
      const result = await mcpHandlers.handleGetCompleteAnalysis(args);

      expect(mockEngine.getCompleteAnalysis).toHaveBeenCalledWith('BTCUSDT', 1000);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.symbol).toBe('BTCUSDT');
      expect(responseData.summary.recommendation).toBe('BUY');
      expect(responseData.technical_indicators).toBeDefined();
    });
  });

  describe('Error Handling in Delegation', () => {
    it('should propagate errors from specialized handlers', async () => {
      mockMarketDataHandlers.handleGetTicker.mockRejectedValue(new Error('Network timeout'));

      const args = { symbol: 'BTCUSDT' };

      await expect(mcpHandlers.handleGetTicker(args)).rejects.toThrow('Network timeout');
    });

    it('should handle engine errors in direct handlers', async () => {
      mockEngine.performTechnicalAnalysis = jest.fn().mockResolvedValue({
        success: false,
        error: 'Analysis service unavailable',
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };

      await expect(mcpHandlers.handleAnalyzeVolatility(args)).rejects.toThrow('Analysis service unavailable');
    });
  });

  describe('Response Helper Methods', () => {
    it('should create clean success responses', async () => {
      mockEngine.performTechnicalAnalysis = jest.fn().mockResolvedValue({
        success: true,
        data: {
          volatility: {
            symbol: 'BTCUSDT',
            volatilityPercent: 4.5,
            isGoodForGrid: true,
            recommendation: 'proceed',
            confidence: 85
          }
        },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };
      const result = await mcpHandlers.handleAnalyzeVolatility(args);

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      // Should be valid JSON
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    it('should filter problematic values in responses', async () => {
      // Create data with function and undefined values
      const dataWithProblematicValues = {
        symbol: 'BTCUSDT',
        validValue: 45000,
        undefinedValue: undefined,
        functionValue: () => 'test',
        complexObject: new Date(),
        nestedObject: {
          normalValue: 'test',
          undefinedNested: undefined
        }
      };

      mockEngine.performTechnicalAnalysis = jest.fn().mockResolvedValue({
        success: true,
        data: { volatility: dataWithProblematicValues },
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'BTCUSDT' };
      const result = await mcpHandlers.handleAnalyzeVolatility(args);

      const responseData = JSON.parse(result.content[0].text);
      
      // Should handle problematic values gracefully
      expect(responseData).toBeDefined();
      expect(typeof responseData).toBe('object');
    });
  });

  describe('System Health Integration', () => {
    it('should integrate with system health monitoring', async () => {
      mockEngine.getSystemHealth = jest.fn().mockResolvedValue({
        status: 'healthy',
        version: '1.4.0',
        uptime: 3600000, // 1 hour in ms
        services: {
          marketData: true,
          analysis: true,
          trading: true
        }
      });

      mockEngine.getPerformanceMetrics = jest.fn().mockReturnValue([
        { functionName: 'getTicker', executionTime: 150, success: true, timestamp: '2024-06-10T12:00:00.000Z' },
        { functionName: 'analyzeVolatility', executionTime: 250, success: true, timestamp: '2024-06-10T12:01:00.000Z' }
      ]);

      const result = await mcpHandlers.handleGetSystemHealth({});

      expect(mockEngine.getSystemHealth).toHaveBeenCalled();
      expect(mockEngine.getPerformanceMetrics).toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.system_status).toBe('HEALTHY');
      expect(responseData.version).toBe('1.4.0');
      expect(responseData.performance.total_requests).toBe(2);
    });
  });
});
