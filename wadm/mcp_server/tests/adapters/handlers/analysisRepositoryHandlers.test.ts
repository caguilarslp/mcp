/**
 * @fileoverview AnalysisRepositoryHandlers Unit Tests
 * @description Test Analysis Repository handlers for TASK-009 FASE 3
 * @version 1.4.0 - TASK-004
 */

import { AnalysisRepositoryHandlers } from '../../../src/adapters/handlers/analysisRepositoryHandlers';
import { MarketAnalysisEngine } from '../../../src/core/engine';
import { FileLogger } from '../../../src/utils/fileLogger';
import { MCPServerResponse, SavedAnalysis, AnalysisSummary, Pattern, RepositoryStats } from '../../../src/types/index';

// Mock dependencies
jest.mock('../../../src/core/engine');
jest.mock('../../../src/utils/fileLogger');

describe('AnalysisRepositoryHandlers', () => {
  let handlers: AnalysisRepositoryHandlers;
  let mockEngine: jest.Mocked<MarketAnalysisEngine>;
  let mockLogger: jest.Mocked<FileLogger>;

  beforeEach(() => {
    mockEngine = new MarketAnalysisEngine() as jest.Mocked<MarketAnalysisEngine>;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    } as any;

    handlers = new AnalysisRepositoryHandlers(mockEngine, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetAnalysisById', () => {
    it('should retrieve analysis by UUID', async () => {
      const mockAnalysis: SavedAnalysis = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        symbol: 'BTCUSDT',
        analysisType: 'technical_analysis',
        timestamp: '2024-06-10T12:00:00.000Z',
        data: {
          volatility: { volatilityPercent: 5.2, isGoodForGrid: true },
          volume: { trend: 'increasing', currentVolume: 1000 }
        },
        metadata: {
          version: '1.4.0',
          confidence: 85,
          tags: ['high_volatility', 'good_for_grid']
        }
      };

      mockEngine.getAnalysisById = jest.fn().mockResolvedValue({
        success: true,
        data: mockAnalysis,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const result: MCPServerResponse = await handlers.handleGetAnalysisById(args);

      expect(mockEngine.getAnalysisById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.analysis.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(responseData.analysis.symbol).toBe('BTCUSDT');
      expect(responseData.analysis.analysisType).toBe('technical_analysis');
    });

    it('should handle missing ID parameter', async () => {
      const args = {};
      await expect(handlers.handleGetAnalysisById(args)).rejects.toThrow('Analysis ID is required');
    });

    it('should handle invalid UUID format', async () => {
      const args = { id: 'invalid-uuid' };
      await expect(handlers.handleGetAnalysisById(args)).rejects.toThrow('Invalid UUID format');
    });

    it('should handle analysis not found', async () => {
      mockEngine.getAnalysisById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Analysis not found',
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { id: '550e8400-e29b-41d4-a716-446655440000' };
      await expect(handlers.handleGetAnalysisById(args)).rejects.toThrow('Analysis not found');
    });
  });

  describe('handleGetLatestAnalysis', () => {
    it('should retrieve latest analysis for symbol and type', async () => {
      const mockAnalysis: SavedAnalysis = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        symbol: 'ETHUSDT',
        analysisType: 'complete_analysis',
        timestamp: '2024-06-10T12:00:00.000Z',
        data: {
          summary: { recommendation: 'BUY', confidence: 90 },
          marketData: { ticker: { lastPrice: 3000 } }
        },
        metadata: {
          version: '1.4.0',
          confidence: 90,
          tags: ['complete', 'high_confidence']
        }
      };

      mockEngine.getLatestAnalysis = jest.fn().mockResolvedValue({
        success: true,
        data: mockAnalysis,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = {
        symbol: 'ETHUSDT',
        type: 'complete_analysis'
      };

      const result = await handlers.handleGetLatestAnalysis(args);

      expect(mockEngine.getLatestAnalysis).toHaveBeenCalledWith('ETHUSDT', 'complete_analysis');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.latest_analysis.symbol).toBe('ETHUSDT');
      expect(responseData.latest_analysis.analysisType).toBe('complete_analysis');
    });

    it('should handle missing required parameters', async () => {
      await expect(handlers.handleGetLatestAnalysis({})).rejects.toThrow('Symbol and analysis type are required');
      await expect(handlers.handleGetLatestAnalysis({ symbol: 'BTCUSDT' })).rejects.toThrow('Symbol and analysis type are required');
      await expect(handlers.handleGetLatestAnalysis({ type: 'technical_analysis' })).rejects.toThrow('Symbol and analysis type are required');
    });
  });

  describe('handleSearchAnalyses', () => {
    it('should search analyses with filters', async () => {
      const mockAnalyses: SavedAnalysis[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          symbol: 'BTCUSDT',
          analysisType: 'technical_analysis',
          timestamp: '2024-06-10T12:00:00.000Z',
          data: { volatility: { volatilityPercent: 4.5 } },
          metadata: { version: '1.4.0', confidence: 80 }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          symbol: 'BTCUSDT',
          analysisType: 'technical_analysis',
          timestamp: '2024-06-10T11:00:00.000Z',
          data: { volatility: { volatilityPercent: 5.1 } },
          metadata: { version: '1.4.0', confidence: 85 }
        }
      ];

      mockEngine.searchAnalyses = jest.fn().mockResolvedValue({
        success: true,
        data: mockAnalyses,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = {
        symbol: 'BTCUSDT',
        type: 'technical_analysis',
        dateFrom: '2024-06-10T00:00:00.000Z',
        dateTo: '2024-06-10T23:59:59.000Z',
        limit: 10
      };

      const result = await handlers.handleSearchAnalyses(args);

      expect(mockEngine.searchAnalyses).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        type: 'technical_analysis',
        dateFrom: '2024-06-10T00:00:00.000Z',
        dateTo: '2024-06-10T23:59:59.000Z',
        limit: 10,
        orderBy: 'timestamp',
        orderDirection: 'desc'
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.search_results.total).toBe(2);
      expect(responseData.search_results.analyses).toHaveLength(2);
    });

    it('should handle empty search results', async () => {
      mockEngine.searchAnalyses = jest.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'NONEXISTENT' };
      const result = await handlers.handleSearchAnalyses(args);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.search_results.total).toBe(0);
      expect(responseData.search_results.analyses).toHaveLength(0);
    });
  });

  describe('handleGetAnalysisSummary', () => {
    it('should get summary for symbol and period', async () => {
      const mockSummary: AnalysisSummary = {
        symbol: 'BTCUSDT',
        period: '1d',
        totalAnalyses: 24,
        analysisTypes: {
          technical_analysis: 12,
          complete_analysis: 8,
          volume_analysis: 4
        },
        averageConfidence: 82.5,
        trends: {
          volatility: { average: 4.8, trend: 'increasing' },
          volume: { average: 1250000, trend: 'stable' }
        },
        keyFindings: [
          'High volatility period detected',
          'Strong buying pressure in last 6 hours',
          'Support level holding at $44,000'
        ]
      };

      mockEngine.getAnalysisSummary = jest.fn().mockResolvedValue({
        success: true,
        data: mockSummary,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = {
        symbol: 'BTCUSDT',
        period: '1d'
      };

      const result = await handlers.handleGetAnalysisSummary(args);

      expect(mockEngine.getAnalysisSummary).toHaveBeenCalledWith('BTCUSDT', '1d');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.summary.symbol).toBe('BTCUSDT');
      expect(responseData.summary.totalAnalyses).toBe(24);
      expect(responseData.summary.averageConfidence).toBe(82.5);
    });

    it('should use default period when not provided', async () => {
      const mockSummary: AnalysisSummary = {
        symbol: 'ETHUSDT',
        period: '1d',
        totalAnalyses: 10,
        analysisTypes: { technical_analysis: 10 },
        averageConfidence: 75,
        trends: {},
        keyFindings: []
      };

      mockEngine.getAnalysisSummary = jest.fn().mockResolvedValue({
        success: true,
        data: mockSummary,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { symbol: 'ETHUSDT' };
      await handlers.handleGetAnalysisSummary(args);

      expect(mockEngine.getAnalysisSummary).toHaveBeenCalledWith('ETHUSDT', '1d');
    });
  });

  describe('handleFindPatterns', () => {
    it('should find patterns with criteria', async () => {
      const mockPatterns: Pattern[] = [
        {
          id: 'pattern_001',
          type: 'bull_trap',
          symbol: 'BTCUSDT',
          confidence: 85,
          timestamp: '2024-06-10T12:00:00.000Z',
          priceLevel: 45000,
          description: 'Bull trap detected at resistance level',
          metadata: {
            volume_confirmation: true,
            duration: '2h',
            strength: 'strong'
          }
        },
        {
          id: 'pattern_002',
          type: 'volume_divergence',
          symbol: 'BTCUSDT',
          confidence: 78,
          timestamp: '2024-06-10T10:00:00.000Z',
          priceLevel: 44800,
          description: 'Bullish volume divergence',
          metadata: {
            divergence_type: 'bullish',
            duration: '4h'
          }
        }
      ];

      mockEngine.findPatterns = jest.fn().mockResolvedValue({
        success: true,
        data: mockPatterns,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = {
        symbol: 'BTCUSDT',
        type: 'bull_trap',
        minConfidence: 80,
        dateFrom: '2024-06-10T00:00:00.000Z'
      };

      const result = await handlers.handleFindPatterns(args);

      expect(mockEngine.findPatterns).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        type: 'bull_trap',
        minConfidence: 80,
        dateFrom: '2024-06-10T00:00:00.000Z'
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.patterns.total).toBe(2);
      expect(responseData.patterns.found).toHaveLength(2);
    });

    it('should handle no patterns found', async () => {
      mockEngine.findPatterns = jest.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { minConfidence: 95 };
      const result = await handlers.handleFindPatterns(args);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.patterns.total).toBe(0);
      expect(responseData.patterns.found).toHaveLength(0);
    });
  });

  describe('handleGetRepositoryStats', () => {
    it('should get repository statistics', async () => {
      const mockStats: RepositoryStats = {
        totalAnalyses: 150,
        totalSize: 25 * 1024 * 1024, // 25MB
        analysesByType: {
          technical_analysis: 80,
          complete_analysis: 50,
          volume_analysis: 20
        },
        analysesBySymbol: {
          BTCUSDT: 75,
          ETHUSDT: 45,
          XRPUSDT: 30
        },
        oldestAnalysis: '2024-06-01T00:00:00.000Z',
        newestAnalysis: '2024-06-10T12:00:00.000Z',
        storageStats: {
          totalFiles: 150,
          totalSize: 25 * 1024 * 1024,
          sizeByCategory: {
            analysis: 20 * 1024 * 1024,
            patterns: 3 * 1024 * 1024,
            decisions: 2 * 1024 * 1024
          }
        }
      };

      mockEngine.getRepositoryStats = jest.fn().mockResolvedValue({
        success: true,
        data: mockStats,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await handlers.handleGetRepositoryStats({});

      expect(mockEngine.getRepositoryStats).toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.repository_stats.totalAnalyses).toBe(150);
      expect(responseData.repository_stats.totalSizeMB).toBe(25);
      expect(responseData.repository_stats.analysesByType.technical_analysis).toBe(80);
    });

    it('should handle empty repository', async () => {
      const mockEmptyStats: RepositoryStats = {
        totalAnalyses: 0,
        totalSize: 0,
        analysesByType: {},
        analysesBySymbol: {},
        oldestAnalysis: null,
        newestAnalysis: null,
        storageStats: {
          totalFiles: 0,
          totalSize: 0,
          sizeByCategory: {}
        }
      };

      mockEngine.getRepositoryStats = jest.fn().mockResolvedValue({
        success: true,
        data: mockEmptyStats,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const result = await handlers.handleGetRepositoryStats({});

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.repository_stats.totalAnalyses).toBe(0);
      expect(responseData.repository_stats.status).toBe('Empty repository');
    });
  });

  describe('Error Handling', () => {
    it('should handle engine errors gracefully', async () => {
      mockEngine.getAnalysisById = jest.fn().mockRejectedValue(new Error('Storage service unavailable'));

      const args = { id: '550e8400-e29b-41d4-a716-446655440000' };

      await expect(handlers.handleGetAnalysisById(args)).rejects.toThrow('Storage service unavailable');
    });

    it('should validate UUID format', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        'invalid-format-uuid',
        '550e8400-e29b-41d4-a716',  // incomplete
        ''
      ];

      for (const invalidId of invalidUUIDs) {
        const args = { id: invalidId };
        await expect(handlers.handleGetAnalysisById(args)).rejects.toThrow('Invalid UUID format');
      }
    });
  });

  describe('Response Formatting', () => {
    it('should format timestamps consistently', async () => {
      const mockAnalysis: SavedAnalysis = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        symbol: 'BTCUSDT',
        analysisType: 'technical_analysis',
        timestamp: '2024-06-10T12:30:45.123Z',
        data: { test: true },
        metadata: { version: '1.4.0', confidence: 80 }
      };

      mockEngine.getAnalysisById = jest.fn().mockResolvedValue({
        success: true,
        data: mockAnalysis,
        timestamp: '2024-06-10T12:00:00.000Z'
      });

      const args = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const result = await handlers.handleGetAnalysisById(args);

      const responseData = JSON.parse(result.content[0].text);
      
      // Check timestamp formatting
      expect(responseData.analysis.created).toBe('2024-06-10T12:30:45.123Z');
      expect(responseData.response_timestamp).toBe('2024-06-10T12:00:00.000Z');
    });
  });
});
