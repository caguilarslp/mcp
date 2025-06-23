/**
 * Cache Handlers for MCP Adapter
 * Handles cache-related MCP tool operations
 */

import { MarketAnalysisEngine } from '../core/engine.js';
import { MarketCategoryType, MCPServerResponse } from '../types/index.js';
import { FileLogger } from '../utils/fileLogger.js';
import * as path from 'path';

export class CacheHandlers {
  private readonly logger: FileLogger;
  private readonly engine: MarketAnalysisEngine;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('CacheHandlers', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: false,
      enableRotation: true
    });
  }

  /**
   * Handle get_cache_stats MCP tool
   */
  async handleGetCacheStats(args: any): Promise<MCPServerResponse> {
    try {
      const stats = await this.engine.getCacheStats();
      
      const formattedStats = {
        cache_performance: {
          total_entries: stats.totalEntries,
          hit_rate: `${stats.hitRate.toFixed(2)}%`,
          miss_rate: `${stats.missRate.toFixed(2)}%`,
          memory_usage: `${Math.round(stats.totalMemoryUsage / 1024)} KB`,
        },
        cache_health: {
          total_hits: stats.totalHits,
          total_misses: stats.totalMisses,
          oldest_entry_age: stats.totalEntries > 0 ? 
            `${Math.round((Date.now() - stats.oldestEntry) / 1000)} seconds` : 'N/A',
          newest_entry_age: stats.totalEntries > 0 ? 
            `${Math.round((Date.now() - stats.newestEntry) / 1000)} seconds` : 'N/A'
        },
        cache_entries_by_ttl: {
          expired: stats.entriesByTTL.expired,
          expiring_soon: stats.entriesByTTL.expiringSoon,
          fresh: stats.entriesByTTL.fresh
        },
        recommendations: this.generateCacheRecommendations(stats)
      };

      return this.createSuccessResponse(formattedStats);
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return this.createErrorResponse('get_cache_stats', error as Error);
    }
  }

  /**
   * Handle clear_cache MCP tool
   */
  async handleClearCache(args: any): Promise<MCPServerResponse> {
    const confirm = args?.confirm as boolean;
    
    if (!confirm) {
      return this.createSuccessResponse({
        warning: 'Cache clearing requires confirmation',
        message: 'Set confirm=true to proceed with clearing all cached data',
        impact: 'Next API requests will be slower until cache is repopulated'
      });
    }

    try {
      await this.engine.clearCache();
      
      const result = {
        success: true,
        message: 'All cached market data has been cleared',
        timestamp: new Date().toISOString(),
        next_requests_impact: 'Slower response times until cache repopulation'
      };

      return this.createSuccessResponse(result);
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      return this.createErrorResponse('clear_cache', error as Error);
    }
  }

  /**
   * Handle invalidate_cache MCP tool
   */
  async handleInvalidateCache(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const category = args?.category as MarketCategoryType;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    try {
      const invalidatedCount = await this.engine.invalidateCache(symbol, category);
      
      const result = {
        symbol,
        category: category || 'all categories',
        invalidated_entries: invalidatedCount,
        message: `Invalidated ${invalidatedCount} cache entries for ${symbol}`,
        timestamp: new Date().toISOString()
      };

      return this.createSuccessResponse(result);
    } catch (error) {
      this.logger.error('Failed to invalidate cache:', error);
      return this.createErrorResponse('invalidate_cache', error as Error);
    }
  }

  /**
   * Generate cache performance recommendations
   */
  private generateCacheRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    
    if (stats.hitRate < 50) {
      recommendations.push('Low hit rate detected - consider increasing TTL values');
    }
    
    if (stats.entriesByTTL.expired > stats.totalEntries * 0.2) {
      recommendations.push('High number of expired entries - cache cleanup recommended');
    }
    
    if (stats.totalMemoryUsage > 25 * 1024 * 1024) { // 25MB
      recommendations.push('High memory usage - consider reducing TTL or clearing old entries');
    }
    
    if (stats.totalEntries === 0) {
      recommendations.push('Cache is empty - first requests will populate cache');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }
    
    return recommendations;
  }

  /**
   * Create success response for MCP
   */
  private createSuccessResponse(data: any): MCPServerResponse {
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
      
      const cleanData = JSON.parse(jsonString);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(cleanData, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Data serialization error: ${String(data)}`
        }]
      };
    }
  }

  /**
   * Create error response for MCP
   */
  private createErrorResponse(toolName: string, error: Error): MCPServerResponse {
    this.logger.error(`Tool ${toolName} failed:`, error);
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error.message}`
      }]
    };
  }
}