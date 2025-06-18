/**
 * @fileoverview Context Management Handlers
 * @description MCP handlers for context management operations
 * @module adapters/handlers/contextHandlers
 * @version 1.0.0
 */

import { MCPServerResponse } from '../../types/index.js';

import { ContextAwareRepository } from '../../services/context/contextRepository.js';
import { ContextSummary } from '../../services/context/contextSummaryService.js';

type MCPHandlers = Record<string, (args: any) => Promise<any>>;
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ContextHandlers');
const repository = new ContextAwareRepository();
const contextService = repository.getContextService();

/**
 * Format successful response for MCP
 */
function formatSuccessResponse(data: any): MCPServerResponse {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        data
      }, null, 2)
    }]
  };
}

/**
 * Format error response for MCP
 */
function formatErrorResponse(message: string): MCPServerResponse {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      }, null, 2)
    }]
  };
}

/**
 * Context management handlers
 */
export const contextHandlers: MCPHandlers = {
  /**
   * Get compressed context for a symbol
   */
  get_analysis_context: async (args: any) => {
    const { symbol, format = 'compressed' } = args;
    
    try {
      let data: any;
      
      switch (format) {
        case 'compressed':
          const compressed = await contextService.getUltraCompressedContext(symbol);
          data = {
            symbol,
            format,
            context: compressed,
            timestamp: new Date().toISOString()
          };
          break;
          
        case 'detailed':
          const detailed = await contextService.getMultiTimeframeContext(symbol);
          data = {
            symbol,
            format,
            timeframes: detailed,
            timestamp: new Date().toISOString()
          };
          break;
          
        case 'summary':
          const mtf = await contextService.getMultiTimeframeContext(symbol);
          const summary = {
            symbol,
            format,
            overview: {} as any,
            timestamp: new Date().toISOString()
          };
          
          // Create overview
          const trends = { bullish: 0, bearish: 0, neutral: 0 };
          let totalConfidence = 0;
          let count = 0;
          
          for (const [tf, context] of Object.entries(mtf)) {
            trends[context.trend_summary.direction]++;
            totalConfidence += context.recommendations_summary.confidence;
            count++;
          }
          
          summary.overview = {
            dominant_trend: Object.entries(trends)
              .sort(([, a], [, b]) => b - a)[0][0],
            trend_distribution: trends,
            average_confidence: count > 0 ? totalConfidence / count : 0,
            timeframes_analyzed: count
          };
          
          data = summary;
          break;
          
        default:
          throw new Error(`Invalid format: ${format}`);
      }
      
      return formatSuccessResponse(data);
      
    } catch (error) {
      logger.error(`Failed to get context for ${symbol}:`, error);
      return formatErrorResponse(`Failed to get context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get context for specific timeframe
   */
  get_timeframe_context: async (args: any) => {
    const { symbol, timeframe } = args;
    
    try {
      const context = await contextService.getContextSummary(symbol, timeframe);
      
      if (!context) {
        return formatSuccessResponse({
          symbol,
          timeframe,
          message: 'No context data available for this symbol/timeframe',
          timestamp: new Date().toISOString()
        });
      }
      
      return formatSuccessResponse({
        symbol,
        timeframe,
        context,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to get timeframe context:`, error);
      return formatErrorResponse(`Failed to get timeframe context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Add analysis to context
   */
  add_analysis_context: async (args: any) => {
    const { symbol, timeframe, analysis, type = 'technical' } = args;
    
    try {
      await contextService.addAnalysis(symbol, timeframe, analysis, type);
      
      return formatSuccessResponse({
        success: true,
        symbol,
        timeframe,
        type,
        message: 'Analysis added to context successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to add analysis context:`, error);
      return formatErrorResponse(`Failed to add analysis context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get multi-timeframe context
   */
  get_multi_timeframe_context: async (args: any) => {
    const { symbol, timeframes = ['5', '15', '60', '240', 'D'] } = args;
    
    try {
      const contexts: Record<string, any> = {};
      
      for (const tf of timeframes) {
        const context = await contextService.getContextSummary(symbol, tf);
        if (context) {
          contexts[tf] = {
            trend: context.trend_summary.direction,
            strength: context.trend_summary.strength,
            confidence: context.recommendations_summary.confidence,
            key_levels: context.key_levels,
            patterns: Object.keys(context.pattern_frequency).length,
            last_updated: context.metadata.last_updated
          };
        }
      }
      
      // Generate alignment score
      const trends = Object.values(contexts).map(c => c.trend);
      const alignedTrends = trends.filter(t => t === trends[0]).length;
      const alignmentScore = trends.length > 0 ? alignedTrends / trends.length : 0;
      
      return formatSuccessResponse({
        symbol,
        timeframes: contexts,
        alignment: {
          score: alignmentScore,
          interpretation: alignmentScore > 0.8 ? 'Strong' : 
                         alignmentScore > 0.5 ? 'Moderate' : 'Weak'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to get multi-timeframe context:`, error);
      return formatErrorResponse(`Failed to get multi-timeframe context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Update context configuration
   */
  update_context_config: async (args: any) => {
    try {
      const currentConfig = contextService['config'];
      const newConfig = { ...currentConfig, ...args };
      
      // Update config
      contextService['config'] = newConfig;
      
      return formatSuccessResponse({
        success: true,
        config: newConfig,
        message: 'Context configuration updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to update context config:`, error);
      return formatErrorResponse(`Failed to update context config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Clean up old context data
   */
  cleanup_context: async (args: any) => {
    const { force = false } = args;
    
    try {
      const result = await contextService.cleanup();
      
      return formatSuccessResponse({
        success: true,
        cleaned_entries: result,
        message: `Cleaned up ${result} old context entries`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to cleanup context:`, error);
      return formatErrorResponse(`Failed to cleanup context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get context statistics
   */
  get_context_stats: async (args: any) => {
    const { symbol } = args;
    
    try {
      // Get all context files
      const storage = contextService['storage'];
      const entryFiles = await storage.list('context/entries');
      const summaryFiles = await storage.list('context/summaries');
      
      let stats = {
        total_entries: 0,
        total_summaries: summaryFiles.length,
        symbols: new Set<string>(),
        timeframes: new Set<string>(),
        total_size: 0,
        average_compression_ratio: 0
      };
      
      // Analyze entries
      for (const file of entryFiles) {
        const entries = await storage.load(`context/entries/${file}`);
        if (entries && Array.isArray(entries)) {
          stats.total_entries += entries.length;
          
          entries.forEach((entry: any) => {
            stats.symbols.add(entry.symbol);
            stats.timeframes.add(entry.timeframe);
            stats.total_size += entry.size_bytes || 0;
          });
        }
      }
      
      // Analyze summaries
      let totalCompressionRatio = 0;
      let summaryCount = 0;
      
      for (const file of summaryFiles) {
        const summary = await storage.load(`context/summaries/${file}`);
        if (summary) {
          const summaryData = summary as ContextSummary;
          totalCompressionRatio += summaryData.metadata?.compression_ratio || 0;
          summaryCount++;
        }
      }
      
      stats.average_compression_ratio = summaryCount > 0 
        ? totalCompressionRatio / summaryCount 
        : 0;
      
      return formatSuccessResponse({
        stats: {
          total_entries: stats.total_entries,
          total_summaries: stats.total_summaries,
          unique_symbols: stats.symbols.size,
          unique_timeframes: stats.timeframes.size,
          total_size_mb: (stats.total_size / 1024 / 1024).toFixed(2),
          average_compression_ratio: stats.average_compression_ratio.toFixed(2),
          symbols: Array.from(stats.symbols),
          timeframes: Array.from(stats.timeframes)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to get context stats:`, error);
      return formatErrorResponse(`Failed to get context stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};
