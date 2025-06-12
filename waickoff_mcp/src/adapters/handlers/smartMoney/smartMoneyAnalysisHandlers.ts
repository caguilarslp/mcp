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

export class SmartMoneyAnalysisHandlers {
  private readonly logger = new Logger('SmartMoneyAnalysisHandlers');

  constructor(private readonly engine: MarketAnalysisEngine) {}

  /**
   * Create SmartMoneyAnalysisHandlers instance
   */
  static createSmartMoneyAnalysisHandlers(engine: MarketAnalysisEngine): SmartMoneyAnalysisHandlers {
    return new SmartMoneyAnalysisHandlers(engine);
  }

  /**
   * Handle Smart Money confluence analysis request
   */
  async handleAnalyzeSmartMoneyConfluence(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing Smart Money confluence analysis request', { symbol: args.symbol });
      
      const {
        symbol,
        timeframe = '60',
        lookback = 100
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for Smart Money confluence analysis');
      }
      
      const analysis = await this.engine.analyzeSmartMoneyConfluence(
        symbol,
        timeframe,
        lookback
      );
      
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
        }
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
   * Handle SMC market bias analysis request
   */
  async handleGetSMCMarketBias(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing SMC market bias analysis request', { symbol: args.symbol });
      
      const {
        symbol,
        timeframe = '60'
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for SMC market bias analysis');
      }
      
      const bias = await this.engine.getSMCMarketBias(
        symbol,
        timeframe
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
   * Handle SMC setup validation request
   */
  async handleValidateSMCSetup(args: {
    symbol: string;
    setupType: 'long' | 'short';
    entryPrice?: number;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing SMC setup validation request', { 
        symbol: args.symbol, 
        setupType: args.setupType 
      });
      
      const {
        symbol,
        setupType,
        entryPrice
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
        entryPrice
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
}
