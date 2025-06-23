/**
 * @fileoverview Hierarchical Context Management Handlers
 * @description MCP handlers for hierarchical context management operations (TASK-040.3)
 * @module adapters/handlers/hierarchicalContextHandlers
 * @version 1.0.0
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';
import {
  SymbolInitializationRequest,
  ContextUpdateRequest,
  ContextQueryRequest
} from '../../types/hierarchicalContext.js';

export class HierarchicalContextHandlers {
  private readonly logger: FileLogger;
  private readonly engine: MarketAnalysisEngine;

  constructor(engine: MarketAnalysisEngine, logger: FileLogger) {
    this.engine = engine;
    this.logger = logger;
  }

  /**
   * Format successful response for MCP
   */
  private formatSuccessResponse(data: any): MCPServerResponse {
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
  private formatErrorResponse(message: string, details?: any): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: message,
          details,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  /**
   * Get master context for a symbol
   */
  async handleGetMasterContext(args: any): Promise<MCPServerResponse> {
    const { symbol } = args;
    
    try {
      this.logger.info(`Getting master context for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const masterContext = await hierarchicalManager.getMasterContext(symbol);
      
      return this.formatSuccessResponse({
        symbol,
        masterContext,
        dataFreshness: this.calculateDataFreshness(masterContext.lastUpdated),
        contextSummary: {
          totalLevels: masterContext.levels.length,
          totalPatterns: masterContext.patterns.length,
          criticalLevels: masterContext.levels.filter(l => l.significance === 'critical').length,
          lastUpdated: masterContext.lastUpdated,
          version: masterContext.version
        }
      });
      
    } catch (error) {
      this.logger.error(`Failed to get master context for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to get master context for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Initialize symbol context
   */
  async handleInitializeSymbolContext(args: any): Promise<MCPServerResponse> {
    const { symbol, autoUpdate = true, priority = 'medium', timeframes = ['15', '60', '240', 'D'] } = args;
    
    try {
      this.logger.info(`Initializing symbol context for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      
      const request: SymbolInitializationRequest = {
        symbol,
        autoUpdate,
        priority,
        timeframes
      };
      
      const result = await hierarchicalManager.initializeSymbol(request);
      
      return this.formatSuccessResponse({
        symbol,
        initializationResult: result,
        message: result.success 
          ? `Symbol ${symbol} initialized successfully`
          : `Failed to initialize symbol ${symbol}`,
        performance: {
          initializationTime: result.initializationTime,
          estimatedMemoryUsage: result.estimatedMemoryUsage
        }
      });
      
    } catch (error) {
      this.logger.error(`Failed to initialize symbol context for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to initialize symbol context for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Update context levels
   */
  async handleUpdateContextLevels(args: any): Promise<MCPServerResponse> {
    const { symbol, analysis, confidence = 60 } = args;
    
    try {
      this.logger.info(`Updating context levels for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      
      const request: ContextUpdateRequest = {
        symbol,
        analysis,
        analysisType: 'hierarchical_update',
        timeframe: analysis.timeframe || '60',
        confidence,
        metadata: {
          source: 'hierarchical_context_handler',
          executionTime: Date.now() - Date.now(),
          version: '1.0.0'
        }
      };
      
      const result = await hierarchicalManager.updateContext(request);
      
      return this.formatSuccessResponse({
        symbol,
        updateResult: result,
        changes: result.changes,
        message: result.success 
          ? `Context updated successfully for ${symbol}`
          : `Failed to update context for ${symbol}`,
        performance: {
          executionTime: result.executionTime,
          masterContextUpdated: result.masterContextUpdated
        }
      });
      
    } catch (error) {
      this.logger.error(`Failed to update context levels for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to update context levels for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Query master context with filtering
   */
  async handleQueryMasterContext(args: any): Promise<MCPServerResponse> {
    const { symbol, levelTypes, minConfidence, filters } = args;
    
    try {
      this.logger.info(`Querying master context for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      
      const request: ContextQueryRequest = {
        symbol,
        levelTypes,
        minConfidence,
        filters
      };
      
      const result = await hierarchicalManager.queryContext(request);
      
      return this.formatSuccessResponse({
        symbol,
        queryResult: result,
        contextSummary: result.contextSummary,
        recommendations: result.recommendations,
        metadata: result.metadata
      });
      
    } catch (error) {
      this.logger.error(`Failed to query master context for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to query master context for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Create context snapshot
   */
  async handleCreateContextSnapshot(args: any): Promise<MCPServerResponse> {
    const { symbol, period } = args;
    
    try {
      this.logger.info(`Creating ${period} snapshot for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const snapshot = await hierarchicalManager.createSnapshot(symbol, period);
      
      return this.formatSuccessResponse({
        symbol,
        period,
        snapshot,
        message: `${period} snapshot created successfully for ${symbol}`
      });
      
    } catch (error) {
      this.logger.error(`Failed to create snapshot for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to create ${period} snapshot for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get context snapshots
   */
  async handleGetContextSnapshots(args: any): Promise<MCPServerResponse> {
    const { symbol, period, limit = 10 } = args;
    
    try {
      this.logger.info(`Getting ${period} snapshots for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const snapshots = await hierarchicalManager.getSnapshots(symbol, period, limit);
      
      return this.formatSuccessResponse({
        symbol,
        period,
        snapshots,
        count: snapshots.length,
        message: `Retrieved ${snapshots.length} ${period} snapshots for ${symbol}`
      });
      
    } catch (error) {
      this.logger.error(`Failed to get snapshots for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to get ${period} snapshots for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Optimize symbol context
   */
  async handleOptimizeSymbolContext(args: any): Promise<MCPServerResponse> {
    const { symbol } = args;
    
    try {
      this.logger.info(`Optimizing context for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const result = await hierarchicalManager.optimizeSymbolContext(symbol);
      
      return this.formatSuccessResponse({
        symbol,
        optimizationResult: result,
        optimizations: result.optimizations,
        performance: result.performance,
        integrity: result.integrity,
        recommendations: result.recommendations,
        message: `Context optimization completed for ${symbol}`
      });
      
    } catch (error) {
      this.logger.error(`Failed to optimize context for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to optimize context for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate context integrity
   */
  async handleValidateContextIntegrity(args: any): Promise<MCPServerResponse> {
    const { symbol } = args;
    
    try {
      this.logger.info(`Validating context integrity for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const isValid = await hierarchicalManager.validateContextIntegrity(symbol);
      
      return this.formatSuccessResponse({
        symbol,
        integrityValid: isValid,
        message: isValid 
          ? `Context integrity validation passed for ${symbol}`
          : `Context integrity validation failed for ${symbol}`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error(`Failed to validate context integrity for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to validate context integrity for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get symbol configuration
   */
  async handleGetSymbolConfig(args: any): Promise<MCPServerResponse> {
    const { symbol } = args;
    
    try {
      this.logger.info(`Getting symbol config for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const config = await hierarchicalManager.getSymbolConfig(symbol);
      
      return this.formatSuccessResponse({
        symbol,
        config,
        message: `Configuration retrieved for ${symbol}`
      });
      
    } catch (error) {
      this.logger.error(`Failed to get symbol config for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to get symbol config for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Update symbol configuration
   */
  async handleUpdateSymbolConfig(args: any): Promise<MCPServerResponse> {
    const { symbol, configUpdates } = args;
    
    try {
      this.logger.info(`Updating symbol config for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const updatedConfig = await hierarchicalManager.updateSymbolConfig(symbol, configUpdates);
      
      return this.formatSuccessResponse({
        symbol,
        updatedConfig,
        configUpdates,
        message: `Configuration updated for ${symbol}`
      });
      
    } catch (error) {
      this.logger.error(`Failed to update symbol config for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to update symbol config for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get symbol list
   */
  async handleGetSymbolList(args: any): Promise<MCPServerResponse> {
    try {
      this.logger.info('Getting symbol list');
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const symbols = await hierarchicalManager.getSymbolList();
      
      return this.formatSuccessResponse({
        symbols,
        count: symbols.length,
        message: `Retrieved ${symbols.length} symbols with active context`
      });
      
    } catch (error) {
      this.logger.error('Failed to get symbol list:', error);
      return this.formatErrorResponse(
        'Failed to get symbol list',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Remove symbol context
   */
  async handleRemoveSymbolContext(args: any): Promise<MCPServerResponse> {
    const { symbol, archiveData = true } = args;
    
    try {
      this.logger.info(`Removing symbol context for ${symbol}`);
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const success = await hierarchicalManager.removeSymbol(symbol, archiveData);
      
      return this.formatSuccessResponse({
        symbol,
        removed: success,
        archived: archiveData,
        message: success 
          ? `Symbol context removed for ${symbol}${archiveData ? ' (archived)' : ''}`
          : `Failed to remove symbol context for ${symbol}`
      });
      
    } catch (error) {
      this.logger.error(`Failed to remove symbol context for ${symbol}:`, error);
      return this.formatErrorResponse(
        `Failed to remove symbol context for ${symbol}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Cleanup old context data
   */
  async handleCleanupOldContextData(args: any): Promise<MCPServerResponse> {
    const { symbol } = args;
    
    try {
      if (symbol) {
        this.logger.info(`Cleaning up old context data for ${symbol}`);
        
        const hierarchicalManager = this.engine.getHierarchicalContextManager();
        const bytesFreed = await hierarchicalManager.cleanupOldData(symbol);
        
        return this.formatSuccessResponse({
          symbol,
          bytesFreed,
          message: `Cleaned up ${bytesFreed} bytes of old data for ${symbol}`
        });
      } else {
        this.logger.info('Cleaning up old context data for all symbols');
        
        const hierarchicalManager = this.engine.getHierarchicalContextManager();
        const symbols = await hierarchicalManager.getSymbolList();
        
        let totalBytesFreed = 0;
        const results: Array<{ symbol: string; bytesFreed: number }> = [];
        
        for (const sym of symbols) {
          try {
            const bytesFreed = await hierarchicalManager.cleanupOldData(sym);
            totalBytesFreed += bytesFreed;
            results.push({ symbol: sym, bytesFreed });
          } catch (error) {
            this.logger.warn(`Failed to cleanup data for ${sym}:`, error);
            results.push({ symbol: sym, bytesFreed: 0 });
          }
        }
        
        return this.formatSuccessResponse({
          totalSymbols: symbols.length,
          totalBytesFreed,
          results,
          message: `Cleaned up ${totalBytesFreed} bytes across ${symbols.length} symbols`
        });
      }
      
    } catch (error) {
      this.logger.error('Failed to cleanup old context data:', error);
      return this.formatErrorResponse(
        'Failed to cleanup old context data',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get hierarchical performance metrics
   */
  async handleGetHierarchicalPerformanceMetrics(args: any): Promise<MCPServerResponse> {
    try {
      this.logger.info('Getting hierarchical performance metrics');
      
      const hierarchicalManager = this.engine.getHierarchicalContextManager();
      const metrics = await hierarchicalManager.getPerformanceMetrics();
      
      return this.formatSuccessResponse({
        performanceMetrics: metrics,
        summary: {
          totalSymbols: metrics.totalSymbols,
          memoryUsageGB: (metrics.totalMemoryUsage / 1024 / 1024 / 1024).toFixed(3),
          avgQueryTimeMs: metrics.avgQueryTime.toFixed(2),
          cacheHitRatePercent: metrics.cacheHitRate.toFixed(1),
          lastOptimization: metrics.lastOptimization
        },
        message: 'Performance metrics retrieved successfully'
      });
      
    } catch (error) {
      this.logger.error('Failed to get hierarchical performance metrics:', error);
      return this.formatErrorResponse(
        'Failed to get hierarchical performance metrics',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Helper method to calculate data freshness
   */
  private calculateDataFreshness(lastUpdated: Date): string {
    const now = new Date();
    const ageMs = now.getTime() - lastUpdated.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    
    if (ageHours < 1) return 'fresh';
    if (ageHours < 24) return 'recent';
    if (ageHours < 168) return 'week-old';
    return 'stale';
  }
}
