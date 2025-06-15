/**
 * @fileoverview Context Repository Integration
 * @description Extends repository pattern with context management
 * @module services/context/contextRepository
 * @version 1.0.0
 */

import { RepositoryService } from '../repository/repositoryService.js';
import { ContextSummaryService } from './contextSummaryService.js';
import { Logger } from '../../utils/logger.js';

/**
 * Extended repository with context management
 */
export class ContextAwareRepository extends RepositoryService {
  private contextService: ContextSummaryService;
  // Remove private logger declaration since it's inherited

  constructor() {
    super();
    this.contextService = new ContextSummaryService(this.storage);
    // logger is already initialized in parent class
  }

  /**
   * Save analysis with automatic context update
   */
  async saveAnalysisWithContext(
    id: string,
    type: string,
    data: any,
    metadata?: any
  ): Promise<string> {
    // Save to repository first
    const savedId = await this.saveAnalysis(id, type, data, metadata);
    
    // Extract symbol and timeframe from data
    const symbol = data.symbol || metadata?.symbol;
    const timeframe = data.timeframe || metadata?.timeframe || '60';
    
    if (symbol) {
      try {
        // Determine context type
        let contextType: 'technical' | 'smc' | 'wyckoff' | 'complete' = 'technical';
        
        if (type.includes('smc') || type.includes('smart_money')) {
          contextType = 'smc';
        } else if (type.includes('wyckoff')) {
          contextType = 'wyckoff';
        } else if (type.includes('complete')) {
          contextType = 'complete';
        }
        
        // Add to context
        await this.contextService.addAnalysis(
          symbol,
          timeframe,
          data,
          contextType
        );
        
        this.logger.debug(`Added analysis to context: ${symbol}/${timeframe}`);
      } catch (error) {
        this.logger.error('Failed to update context:', error);
        // Don't fail the save operation
      }
    }
    
    return savedId;
  }

  /**
   * Get analysis with context
   */
  async getAnalysisWithContext(id: string): Promise<{
    analysis: any;
    context?: string;
  } | null> {
    const analysis = await this.getAnalysis(id);
    if (!analysis) return null;
    
    const symbol = analysis.data?.symbol || analysis.metadata?.symbol;
    if (!symbol) {
      return { analysis };
    }
    
    try {
      const context = await this.contextService.getUltraCompressedContext(symbol);
      return { analysis, context };
    } catch (error) {
      this.logger.error('Failed to get context:', error);
      return { analysis };
    }
  }

  /**
   * Get latest analysis with full context
   */
  async getLatestWithContext(
    symbol: string,
    type: string
  ): Promise<{
    analysis: any;
    context?: string;
    multiTimeframe?: Record<string, any>;
  } | null> {
    const latest = await this.getLatest(symbol, type);
    if (!latest) return null;
    
    try {
      const context = await this.contextService.getUltraCompressedContext(symbol);
      const multiTimeframe = await this.contextService.getMultiTimeframeContext(symbol);
      
      return {
        analysis: latest,
        context,
        multiTimeframe
      };
    } catch (error) {
      this.logger.error('Failed to get context:', error);
      return { analysis: latest };
    }
  }

  /**
   * Search with context summaries
   */
  async searchWithContext(
    criteria: any,
    options?: any
  ): Promise<Array<{
    analysis: any;
    contextSummary?: string;
  }>> {
    const results = await this.search(criteria, options);
    
    // Add context summaries
    const enhanced = await Promise.all(
      results.map(async (result) => {
        const symbol = result.data?.symbol || result.metadata?.symbol;
        if (!symbol) {
          return { analysis: result };
        }
        
        try {
          const context = await this.contextService.getUltraCompressedContext(symbol);
          return {
            analysis: result,
            contextSummary: context.split('\n').slice(0, 5).join('\n') // First 5 lines
          };
        } catch {
          return { analysis: result };
        }
      })
    );
    
    return enhanced;
  }

  /**
   * Get context service for direct access
   */
  getContextService(): ContextSummaryService {
    return this.contextService;
  }

  /**
   * Clean up old data including context
   */
  async cleanup(daysOld?: number): Promise<{
    analyses: number;
    context: number;
  }> {
    const analysesDeleted = await this.vacuum(daysOld);
    const contextCleaned = await this.contextService.cleanup();
    
    return {
      analyses: analysesDeleted,
      context: contextCleaned
    };
  }
}
