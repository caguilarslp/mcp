/**
 * @fileoverview Analysis Repository Handlers - MCP Tool Handlers for Analysis Repository (TASK-009 FASE 3)
 * @description Specialized handlers for analysis repository operations
 * @version 1.3.7
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class AnalysisRepositoryHandlers {
  constructor(
    private engine: MarketAnalysisEngine,
    private logger: FileLogger
  ) {}

  async handleGetAnalysisById(args: any): Promise<MCPServerResponse> {
    const id = args?.id as string;

    if (!id) {
      throw new Error('Analysis ID is required');
    }

    const response = await this.engine.getAnalysisByIdHandler(id);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get analysis by ID');
    }

    const analysis = response.data;
    
    if (!analysis) {
      return this.createSuccessResponse({
        found: false,
        message: `No analysis found with ID: ${id}`
      });
    }

    const formattedAnalysis = {
      found: true,
      id: analysis.id,
      symbol: analysis.symbol,
      type: analysis.analysisType,
      timestamp: new Date(analysis.timestamp).toISOString(),
      metadata: analysis.metadata,
      summary: analysis.summary,
      data_available: true
    };

    return this.createSuccessResponse(formattedAnalysis);
  }

  async handleGetLatestAnalysis(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const type = args?.type as string;

    if (!symbol || !type) {
      throw new Error('Symbol and type are required');
    }

    const response = await this.engine.getLatestAnalysisHandler(symbol, type as any);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get latest analysis');
    }

    const analysis = response.data;
    
    if (!analysis) {
      return this.createSuccessResponse({
        found: false,
        message: `No ${type} analysis found for ${symbol}`
      });
    }

    const formattedAnalysis = {
      found: true,
      id: analysis.id,
      symbol: analysis.symbol,
      type: analysis.analysisType,
      timestamp: new Date(analysis.timestamp).toISOString(),
      summary: analysis.summary,
      age: {
        seconds: Math.floor((Date.now() - analysis.timestamp) / 1000),
        minutes: Math.floor((Date.now() - analysis.timestamp) / 60000),
        hours: Math.floor((Date.now() - analysis.timestamp) / 3600000)
      }
    };

    return this.createSuccessResponse(formattedAnalysis);
  }

  async handleSearchAnalyses(args: any): Promise<MCPServerResponse> {
    const query = {
      symbol: args?.symbol,
      type: args?.type,
      dateFrom: args?.dateFrom ? new Date(args.dateFrom) : undefined,
      dateTo: args?.dateTo ? new Date(args.dateTo) : undefined,
      limit: args?.limit || 100,
      orderBy: args?.orderBy || 'timestamp',
      orderDirection: args?.orderDirection || 'desc'
    };

    const response = await this.engine.searchAnalysesHandler(query);

    if (!response.success) {
      throw new Error(response.error || 'Failed to search analyses');
    }

    const analyses = response.data!;
    
    const formattedResults = {
      total_found: analyses.length,
      query: {
        symbol: query.symbol || 'all',
        type: query.type || 'all',
        date_range: query.dateFrom && query.dateTo ? 
          `${query.dateFrom.toISOString()} to ${query.dateTo.toISOString()}` : 'all time',
        limit: query.limit,
        order: `${query.orderBy} ${query.orderDirection}`
      },
      results: analyses.map(analysis => ({
        id: analysis.id,
        symbol: analysis.symbol,
        type: analysis.analysisType,
        timestamp: new Date(analysis.timestamp).toISOString(),
        confidence: analysis.summary?.confidence || null,
        price: analysis.summary?.price || null,
        summary: analysis.summary
      }))
    };

    return this.createSuccessResponse(formattedResults);
  }

  async handleGetAnalysisSummary(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const period = (args?.period as string) || '1d';

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getAnalysisSummaryHandler(symbol, period as any);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get analysis summary');
    }

    const summary = response.data!;
    
    const formattedSummary = {
      symbol,
      period,
      summary: {
        price: summary.price,
        trend: summary.trend,
        key_levels: summary.keyLevels,
        patterns: summary.patterns || [],
        signals: summary.signals || [],
        confidence: summary.confidence || null
      }
    };

    return this.createSuccessResponse(formattedSummary);
  }

  async handleGetAggregatedMetrics(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const metric = args?.metric as string;
    const period = args?.period as string;

    if (!symbol || !metric || !period) {
      throw new Error('Symbol, metric, and period are required');
    }

    const response = await this.engine.getAggregatedMetricsHandler(symbol, metric, period as any);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get aggregated metrics');
    }

    const metrics = response.data!;
    
    const formattedMetrics = {
      symbol,
      metric,
      period,
      aggregation: {
        average: metrics.data.average,
        min: metrics.data.min,
        max: metrics.data.max,
        std_dev: metrics.data.stdDev,
        trend: metrics.data.trend,
        samples: metrics.data.samples
      }
    };

    return this.createSuccessResponse(formattedMetrics);
  }

  async handleFindPatterns(args: any): Promise<MCPServerResponse> {
    const criteria = {
      type: args?.type,
      symbol: args?.symbol,
      minConfidence: args?.minConfidence,
      dateFrom: args?.dateFrom ? new Date(args.dateFrom) : undefined,
      dateTo: args?.dateTo ? new Date(args.dateTo) : undefined
    };

    const response = await this.engine.findPatternsHandler(criteria);

    if (!response.success) {
      throw new Error(response.error || 'Failed to find patterns');
    }

    const patterns = response.data!;
    
    const formattedPatterns = {
      search_criteria: {
        type: criteria.type || 'all',
        symbol: criteria.symbol || 'all',
        min_confidence: criteria.minConfidence || 0,
        date_range: criteria.dateFrom && criteria.dateTo ? 
          `${criteria.dateFrom.toISOString()} to ${criteria.dateTo.toISOString()}` : 'all time'
      },
      patterns_found: patterns.length,
      patterns: patterns.map(pattern => ({
        id: pattern.id,
        type: pattern.type,
        symbol: pattern.symbol,
        confidence: pattern.confidence,
        timestamp: new Date(pattern.timestamp).toISOString(),
        description: pattern.description,
        related_analyses: pattern.relatedAnalyses || []
      }))
    };

    return this.createSuccessResponse(formattedPatterns);
  }

  async handleGetRepositoryStats(args: any): Promise<MCPServerResponse> {
    const response = await this.engine.getRepositoryStatsHandler();

    if (!response.success) {
      throw new Error(response.error || 'Failed to get repository stats');
    }

    const stats = response.data!;
    
    const formattedStats = {
      repository_stats: {
        total_analyses: stats.totalAnalyses,
        storage_usage: {
          total_size_mb: (stats.storageUsed / (1024 * 1024)).toFixed(2),
          total_analyses: stats.totalAnalyses,
          total_patterns: stats.totalPatterns,
          earliest_analysis: stats.dateRange.earliest.toISOString(),
          latest_analysis: stats.dateRange.latest.toISOString()
        },
        by_type: stats.analysesByType,
        by_symbol: stats.symbols,
        patterns_by_type: stats.patternsByType
      }
    };

    return this.createSuccessResponse(formattedStats);
  }

  private createSuccessResponse(data: any): MCPServerResponse {
    let cleanData: any;
    
    try {
      const jsonString = JSON.stringify(data, (key, value) => {
        if (typeof value === 'function' || value === undefined) {
          return '[FILTERED]';
        }
        if (typeof value === 'object' && value !== null) {
          if (value.constructor !== Object && value.constructor !== Array) {
            return '[COMPLEX_OBJECT]';
          }
        }
        return value;
      });
      
      cleanData = JSON.parse(jsonString);
    } catch (error) {
      cleanData = { result: 'Data serialization error', data: String(data) };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(cleanData, null, 2)
      }]
    };
  }
}
