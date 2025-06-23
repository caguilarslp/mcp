/**
 * @fileoverview Smart Money Analysis MCP Handlers (TASK-020 FASE 4)
 * @description Handlers for Smart Money Concepts confluence analysis
 * @version 1.0.0
 * @author wAIckoff MCP Team
 */

import {
  MCPServerResponse,
  ToolHandler,
  ToolValidationResult
} from '../../../types/index.js';
import { Logger } from '../../../utils/logger.js';
import { MarketAnalysisEngine } from '../../../core/engine.js';
import { ContextAwareRepository } from '../../../services/context/contextRepository.js';

export class SmartMoneyAnalysisHandlers {
  private readonly logger = new Logger('SmartMoneyAnalysisHandlers');
  private readonly contextAwareRepository: ContextAwareRepository;

  constructor(private readonly engine: MarketAnalysisEngine) {
    // Context-aware repository (TASK-027 FASE 2)
    this.contextAwareRepository = new ContextAwareRepository();
  }

  /**
   * Create SmartMoneyAnalysisHandlers instance
   */
  static createSmartMoneyAnalysisHandlers(engine: MarketAnalysisEngine): SmartMoneyAnalysisHandlers {
    return new SmartMoneyAnalysisHandlers(engine);
  }

  /**
   * Handle Smart Money confluence analysis request with multi-exchange support
   */
  async handleAnalyzeSmartMoneyConfluence(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
    useMultiExchange?: boolean;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing Smart Money confluence analysis request', { symbol: args.symbol });
      
      const {
        symbol,
        timeframe = '60',
        lookback = 100,
        useMultiExchange = false
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for Smart Money confluence analysis');
      }
      
      const analysis = await this.engine.analyzeSmartMoneyConfluence(
        symbol,
        timeframe,
        lookback,
        useMultiExchange
      );
      
      // Get historical context for enhanced response (TASK-027 FASE 2)
      let historicalContext = null;
      try {
        historicalContext = await this.contextAwareRepository.search(
          { symbol, type: 'smc' },
          { limit: 5 } // Last 5 SMC analyses
        );
        this.logger.info(`Retrieved ${historicalContext.length} historical SMC analyses for context`);
      } catch (contextError) {
        this.logger.warn(`Failed to retrieve historical context for ${symbol}:`, contextError);
      }
      
      return this.formatSuccessResponse({
        analysis,
        summary: {
          symbol: analysis.symbol,
          currentPrice: analysis.currentPrice,
          totalConfluences: analysis.confluences.length,
          strongConfluences: analysis.confluences.filter((c: any) => c.strength >= 70).length,
          marketBias: {
            direction: analysis.marketBias.direction,
            strength: analysis.marketBias.strength,
            confidence: analysis.marketBias.confidence
          },
          currentZone: analysis.premiumDiscountZones.currentZone,
          equilibrium: analysis.premiumDiscountZones.equilibrium,
          institutionalActivity: {
            score: analysis.institutionalActivity.score,
            interpretation: analysis.institutionalActivity.interpretation
          },
          keyLevels: analysis.keyLevels.slice(0, 5).map((level: any) => ({
            price: level.price,
            type: level.type,
            strength: level.strength,
            description: level.description
          })),
          tradingRecommendations: analysis.tradingRecommendations.filter((rec: any) => rec.confidence >= 70).slice(0, 3)
        },
        // Historical context for enhanced insights (TASK-027 FASE 2)
        historicalContext: historicalContext ? {
          previousAnalyses: historicalContext.length,
          recentTrends: this.extractHistoricalTrends(historicalContext),
          contextualInsights: this.generateContextualInsights(analysis, historicalContext)
        } : null
      });
      
    } catch (error) {
      this.logger.error('Smart Money confluence analysis failed', {
        symbol: args.symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.formatErrorResponse(
        `Smart Money confluence analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle SMC market bias analysis request with multi-exchange support
   */
  async handleGetSMCMarketBias(args: {
    symbol: string;
    timeframe?: string;
    useMultiExchange?: boolean;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing SMC market bias analysis request', { symbol: args.symbol });
      
      const {
        symbol,
        timeframe = '60',
        useMultiExchange = false
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for SMC market bias analysis');
      }
      
      const bias = await this.engine.getSMCMarketBias(
        symbol,
        timeframe,
        useMultiExchange
      );
      
      return this.formatSuccessResponse({
        marketBias: bias,
        summary: {
          symbol,
          direction: bias.direction,
          strength: bias.strength,
          confidence: bias.confidence,
          components: bias.components,
          keyInfluencers: bias.keyInfluencers || [],
          reasoning: bias.reasoning.slice(0, 5),
          nextUpdate: bias.nextUpdateTime?.toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error('SMC market bias analysis failed', {
        symbol: args.symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.formatErrorResponse(
        `SMC market bias analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle SMC setup validation request with multi-exchange support
   */
  async handleValidateSMCSetup(args: {
    symbol: string;
    setupType: 'long' | 'short';
    entryPrice?: number;
    useMultiExchange?: boolean;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing SMC setup validation request', { 
        symbol: args.symbol, 
        setupType: args.setupType 
      });
      
      const {
        symbol,
        setupType,
        entryPrice,
        useMultiExchange = false
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for SMC setup validation');
      }
      
      if (!setupType || !['long', 'short'].includes(setupType)) {
        return this.formatErrorResponse('Setup type must be either "long" or "short"');
      }
      
      const validation = await this.engine.validateSMCSetup(
        symbol,
        setupType,
        entryPrice,
        useMultiExchange
      );
      
      return this.formatSuccessResponse({
        validation,
        summary: {
          symbol,
          setupType,
          isValid: validation.isValid,
          setupScore: validation.setupScore,
          confidence: validation.confidence,
          optimalEntry: {
            price: validation.optimalEntry.price,
            zone: validation.optimalEntry.zone,
            reasoning: validation.optimalEntry.reasoning
          },
          riskManagement: {
            stopLoss: validation.riskManagement.stopLoss,
            takeProfits: validation.riskManagement.takeProfits.slice(0, 3),
            riskRewardRatio: validation.riskManagement.riskRewardRatio,
            maxRisk: validation.riskManagement.maxRisk
          },
          factors: {
            directionalAlignment: validation.factors.directionalAlignment,
            confluenceQuality: validation.factors.confluenceQuality,
            structureAlignment: validation.factors.structureAlignment,
            institutionalPresence: validation.factors.institutionalPresence,
            riskRewardRatio: validation.factors.riskRewardRatio
          },
          warnings: validation.warnings,
          alternativeScenarios: validation.alternativeScenarios.slice(0, 2)
        }
      });
      
    } catch (error) {
      this.logger.error('SMC setup validation failed', {
        symbol: args.symbol,
        setupType: args.setupType,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.formatErrorResponse(
        `SMC setup validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Format successful response
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
   * Format error response
   */
  private formatErrorResponse(message: string): MCPServerResponse {
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

  // ====================
  // HISTORICAL CONTEXT METHODS (TASK-027 FASE 2)
  // ====================

  /**
   * Extract historical trends from previous analyses
   */
  private extractHistoricalTrends(historicalContext: any[]): any {
    if (!historicalContext || historicalContext.length === 0) {
      return null;
    }

    try {
      const trends = {
        biasEvolution: this.analyzeBiasEvolution(historicalContext),
        confluenceGrowth: this.analyzeConfluenceGrowth(historicalContext),
        institutionalActivity: this.analyzeInstitutionalTrend(historicalContext)
      };

      return trends;
    } catch (error) {
      this.logger.warn('Failed to extract historical trends:', error);
      return null;
    }
  }

  /**
   * Generate contextual insights based on current analysis and historical data
   */
  private generateContextualInsights(currentAnalysis: any, historicalContext: any[]): string[] {
    const insights: string[] = [];

    try {
      // Compare current bias with historical trend
      const biasEvolution = this.analyzeBiasEvolution(historicalContext);
      if (biasEvolution && biasEvolution.trend !== 'stable') {
        if (currentAnalysis.marketBias.direction === biasEvolution.dominantBias) {
          insights.push(`Market bias ${currentAnalysis.marketBias.direction} aligns with recent ${biasEvolution.trend} trend`);
        } else {
          insights.push(`Market bias ${currentAnalysis.marketBias.direction} contrasts with recent ${biasEvolution.dominantBias} trend - potential reversal`);
        }
      }

      // Analyze confluence development
      const confluenceGrowth = this.analyzeConfluenceGrowth(historicalContext);
      if (confluenceGrowth) {
        if (currentAnalysis.confluences.length > confluenceGrowth.average) {
          insights.push(`Current confluence count (${currentAnalysis.confluences.length}) above recent average (${confluenceGrowth.average.toFixed(1)})`);
        } else if (currentAnalysis.confluences.length < confluenceGrowth.average * 0.7) {
          insights.push(`Lower confluence activity detected - market may be transitioning`);
        }
      }

      // Institutional activity comparison
      const institutionalTrend = this.analyzeInstitutionalTrend(historicalContext);
      if (institutionalTrend) {
        if (currentAnalysis.institutionalActivity.score > institutionalTrend.average + 10) {
          insights.push(`Increased institutional activity (+${(currentAnalysis.institutionalActivity.score - institutionalTrend.average).toFixed(0)} vs avg)`);
        } else if (currentAnalysis.institutionalActivity.score < institutionalTrend.average - 10) {
          insights.push(`Decreased institutional activity (-${(institutionalTrend.average - currentAnalysis.institutionalActivity.score).toFixed(0)} vs avg)`);
        }
      }

      // If no insights, add generic context
      if (insights.length === 0) {
        insights.push(`Analysis based on ${historicalContext.length} previous SMC analyses`);
      }

    } catch (error) {
      this.logger.warn('Failed to generate contextual insights:', error);
      insights.push('Historical context available but analysis failed');
    }

    return insights;
  }

  /**
   * Analyze bias evolution over time
   */
  private analyzeBiasEvolution(historicalContext: any[]): any {
    try {
      const biases = historicalContext
        .map(ctx => ctx.data?.marketBias?.direction)
        .filter(bias => bias);

      if (biases.length === 0) return null;

      const bullishCount = biases.filter(b => b === 'bullish').length;
      const bearishCount = biases.filter(b => b === 'bearish').length;
      const neutralCount = biases.filter(b => b === 'neutral').length;

      const dominantBias = bullishCount > bearishCount && bullishCount > neutralCount ? 'bullish' :
                          bearishCount > bullishCount && bearishCount > neutralCount ? 'bearish' : 'neutral';

      // Simple trend detection (last 3 vs first 3)
      const recent = biases.slice(-3);
      const earlier = biases.slice(0, 3);
      const recentBullish = recent.filter(b => b === 'bullish').length;
      const earlierBullish = earlier.filter(b => b === 'bullish').length;

      let trend = 'stable';
      if (recentBullish > earlierBullish) trend = 'increasingly_bullish';
      else if (recentBullish < earlierBullish) trend = 'increasingly_bearish';

      return {
        dominantBias,
        trend,
        distribution: { bullish: bullishCount, bearish: bearishCount, neutral: neutralCount }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze confluence growth patterns
   */
  private analyzeConfluenceGrowth(historicalContext: any[]): any {
    try {
      const confluenceCounts = historicalContext
        .map(ctx => ctx.data?.confluences?.length || 0)
        .filter(count => count >= 0);

      if (confluenceCounts.length === 0) return null;

      const average = confluenceCounts.reduce((sum, count) => sum + count, 0) / confluenceCounts.length;
      const max = Math.max(...confluenceCounts);
      const min = Math.min(...confluenceCounts);

      return { average, max, min, count: confluenceCounts.length };
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze institutional activity trends
   */
  private analyzeInstitutionalTrend(historicalContext: any[]): any {
    try {
      const institutionalScores = historicalContext
        .map(ctx => ctx.data?.institutionalActivity?.score || 0)
        .filter(score => score >= 0);

      if (institutionalScores.length === 0) return null;

      const average = institutionalScores.reduce((sum, score) => sum + score, 0) / institutionalScores.length;
      const max = Math.max(...institutionalScores);
      const min = Math.min(...institutionalScores);

      return { average, max, min, count: institutionalScores.length };
    } catch (error) {
      return null;
    }
  }
}
