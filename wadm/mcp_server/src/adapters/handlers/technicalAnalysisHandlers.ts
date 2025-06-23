/**
 * @fileoverview Technical Analysis MCP Handlers
 * @description Handlers for Fibonacci, Bollinger Bands, Elliott Wave and integrated analysis
 * @version 1.0.0
 * @author wAIckoff MCP Team
 */

import { MCPServerResponse } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { MarketAnalysisEngine } from '../../core/engine.js';

export class TechnicalAnalysisHandlers {
  private readonly logger = new Logger('TechnicalAnalysisHandlers');

  constructor(private readonly engine: MarketAnalysisEngine) {}

  /**
   * Handle Fibonacci analysis request
   */
  async handleCalculateFibonacciLevels(args: {
    symbol: string;
    timeframe?: string;
    retracementLevels?: number[];
    extensionLevels?: number[];
    minSwingSize?: number;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing Fibonacci levels calculation request', { symbol: args.symbol });
      
      const {
        symbol,
        timeframe = '60',
        retracementLevels,
        extensionLevels,
        minSwingSize
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for Fibonacci analysis');
      }
      
      // Prepare custom config
      const customConfig: any = {};
      if (retracementLevels) customConfig.retracementLevels = retracementLevels;
      if (extensionLevels) customConfig.extensionLevels = extensionLevels;
      if (minSwingSize) customConfig.minSwingSize = minSwingSize;
      
      const analysis = await this.engine.calculateFibonacciLevels(
        symbol,
        timeframe,
        Object.keys(customConfig).length > 0 ? customConfig : undefined
      );
      
      return this.formatSuccessResponse({
        analysis,
        summary: {
          symbol: analysis.symbol,
          currentPrice: analysis.currentPrice,
          trend: analysis.trend,
          keyLevelsCount: analysis.keyLevels.length,
          confidence: analysis.confidence,
          validity: analysis.validity,
          nextTargets: analysis.currentPosition.nextTargets.slice(0, 3).map(t => ({
            level: t.level,
            price: t.price,
            distance: t.distance.toFixed(2) + '%',
            type: t.type
          })),
          swingPoints: {
            high: {
              price: analysis.swingHigh.price,
              time: analysis.swingHigh.timestamp,
              strength: analysis.swingHigh.strength.toFixed(1)
            },
            low: {
              price: analysis.swingLow.price,
              time: analysis.swingLow.timestamp,
              strength: analysis.swingLow.strength.toFixed(1)
            }
          }
        }
      });
      
    } catch (error) {
      this.logger.error('Fibonacci levels calculation failed', {
        symbol: args.symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.formatErrorResponse(
        `Fibonacci analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle Bollinger Bands analysis request
   */
  async handleAnalyzeBollingerBands(args: {
    symbol: string;
    timeframe?: string;
    period?: number;
    standardDeviation?: number;
    includeSignals?: boolean;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing Bollinger Bands analysis request', { symbol: args.symbol });
      
      const {
        symbol,
        timeframe = '60',
        period,
        standardDeviation,
        includeSignals = true
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for Bollinger Bands analysis');
      }
      
      // Prepare custom config
      const customConfig: any = {};
      if (period) customConfig.period = period;
      if (standardDeviation) customConfig.standardDeviation = standardDeviation;
      
      const analysis = await this.engine.analyzeBollingerBands(
        symbol,
        timeframe,
        Object.keys(customConfig).length > 0 ? customConfig : undefined
      );
      
      const response: any = {
        analysis,
        summary: {
          symbol: analysis.symbol,
          currentPrice: analysis.currentPrice,
          currentBands: {
            upper: analysis.currentBands.upper.toFixed(2),
            middle: analysis.currentBands.middle.toFixed(2),
            lower: analysis.currentBands.lower.toFixed(2),
            bandwidth: analysis.currentBands.bandwidth.toFixed(2) + '%',
            position: analysis.currentBands.position.toFixed(1) + '%'
          },
          squeeze: {
            isActive: analysis.squeeze.isActive,
            duration: analysis.squeeze.duration,
            intensity: analysis.squeeze.intensity.toFixed(1),
            breakoutProbability: analysis.squeeze.breakoutProbability.toFixed(1) + '%',
            expectedDirection: analysis.squeeze.expectedDirection
          },
          volatility: {
            current: analysis.volatility.current.toFixed(1) + 'th percentile',
            trend: analysis.volatility.trend,
            isAtLow: analysis.volatility.extremes.isAtLow,
            isAtHigh: analysis.volatility.extremes.isAtHigh
          },
          pattern: {
            type: analysis.pattern.type,
            confidence: analysis.pattern.confidence.toFixed(1),
            actionable: analysis.pattern.actionable,
            description: analysis.pattern.description
          }
        }
      };
      
      if (includeSignals) {
        response.signals = {
          signal: analysis.signals.signal,
          strength: analysis.signals.strength,
          reasoning: analysis.signals.reasoning,
          confluence: analysis.signals.confluence
        };
      }
      
      return this.formatSuccessResponse(response);
      
    } catch (error) {
      this.logger.error('Bollinger Bands analysis failed', {
        symbol: args.symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.formatErrorResponse(
        `Bollinger Bands analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle Elliott Wave analysis request
   */
  async handleDetectElliottWaves(args: {
    symbol: string;
    timeframe?: string;
    minWaveLength?: number;
    strictRules?: boolean;
    includeProjections?: boolean;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing Elliott Wave analysis request', { symbol: args.symbol });
      
      const {
        symbol,
        timeframe = '60',
        minWaveLength,
        strictRules,
        includeProjections = true
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for Elliott Wave analysis');
      }
      
      // Prepare custom config
      const customConfig: any = {};
      if (minWaveLength) customConfig.minWaveLength = minWaveLength;
      if (strictRules !== undefined) customConfig.strictRules = strictRules;
      
      const analysis = await this.engine.detectElliottWaves(
        symbol,
        timeframe,
        Object.keys(customConfig).length > 0 ? customConfig : undefined
      );
      
      const response: any = {
        analysis,
        summary: {
          symbol: analysis.symbol,
          currentPrice: analysis.currentPrice,
          currentSequence: {
            type: analysis.currentSequence.type,
            wavesCount: analysis.currentSequence.waves.length,
            isComplete: analysis.currentSequence.isComplete,
            degree: analysis.currentSequence.degree,
            validity: analysis.currentSequence.validity.toFixed(1)
          },
          currentWave: {
            position: analysis.currentWave.position,
            nextExpected: analysis.currentWave.nextExpected
          },
          ruleValidation: {
            overallValidity: analysis.ruleValidation.overallValidity.toFixed(1),
            wave2Rule: analysis.ruleValidation.wave2Rule,
            wave3Rule: analysis.ruleValidation.wave3Rule,
            wave4Rule: analysis.ruleValidation.wave4Rule
          },
          signals: {
            signal: analysis.signals.signal,
            strength: analysis.signals.strength,
            waveContext: analysis.signals.waveContext,
            riskLevel: analysis.signals.riskLevel,
            reasoning: analysis.signals.reasoning
          },
          confidence: analysis.confidence,
          dataQuality: analysis.dataQuality
        }
      };
      
      if (includeProjections && analysis.projections.length > 0) {
        response.projections = analysis.projections.map(proj => ({
          targetWave: proj.targetWave,
          targets: {
            conservative: proj.targets.conservative.toFixed(2),
            normal: proj.targets.normal.toFixed(2),
            extended: proj.targets.extended.toFixed(2)
          },
          probability: proj.probability.toFixed(1) + '%',
          fibonacciRatios: proj.fibonacciRatios.slice(0, 3)
        }));
      }
      
      return this.formatSuccessResponse(response);
      
    } catch (error) {
      this.logger.error('Elliott Wave analysis failed', {
        symbol: args.symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.formatErrorResponse(
        `Elliott Wave analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle technical confluences analysis request
   */
  async handleFindTechnicalConfluences(args: {
    symbol: string;
    timeframe?: string;
    indicators?: string[];
    minConfluenceStrength?: number;
    distanceTolerance?: number;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('Processing technical confluences analysis request', { symbol: args.symbol });
      
      const {
        symbol,
        timeframe = '60',
        indicators,
        minConfluenceStrength,
        distanceTolerance
      } = args;
      
      if (!symbol) {
        return this.formatErrorResponse('Symbol is required for confluence analysis');
      }
      
      // Prepare custom config
      const customConfig: any = {};
      if (minConfluenceStrength) {
        customConfig.confluence = { minStrength: minConfluenceStrength };
      }
      if (distanceTolerance) {
        if (!customConfig.confluence) customConfig.confluence = {};
        customConfig.confluence.distanceTolerance = distanceTolerance;
      }
      
      // Enable/disable indicators based on request
      if (indicators) {
        customConfig.fibonacci = { enabled: indicators.includes('fibonacci') };
        customConfig.bollingerBands = { enabled: indicators.includes('bollinger') };
        customConfig.elliottWave = { enabled: indicators.includes('elliott') };
      }
      
      const analysis = await this.engine.findTechnicalConfluences(
        symbol,
        timeframe,
        Object.keys(customConfig).length > 0 ? customConfig : undefined
      );
      
      return this.formatSuccessResponse({
        analysis,
        summary: {
          symbol: analysis.symbol,
          currentPrice: analysis.currentPrice,
          confluencesFound: analysis.confluences.length,
          actionableConfluences: analysis.confluences.filter(c => c.actionable).length,
          marketStructure: {
            trend: analysis.marketStructure.trend,
            phase: analysis.marketStructure.phase,
            volatility: analysis.marketStructure.volatility,
            momentum: analysis.marketStructure.momentum
          },
          keyConfluences: analysis.confluences
            .filter(c => c.actionable)
            .slice(0, 5)
            .map(c => ({
              level: c.level.toFixed(2),
              type: c.type,
              indicators: c.indicators,
              strength: c.strength.toFixed(1),
              distance: c.distance.toFixed(2) + '%'
            })),
          signals: {
            immediate: {
              signal: analysis.signals.immediate.signal,
              strength: analysis.signals.immediate.strength,
              confidence: analysis.signals.immediate.confidence
            },
            shortTerm: {
              signal: analysis.signals.shortTerm.signal,
              strength: analysis.signals.shortTerm.strength,
              confidence: analysis.signals.shortTerm.confidence
            },
            mediumTerm: {
              signal: analysis.signals.mediumTerm.signal,
              strength: analysis.signals.mediumTerm.strength,
              confidence: analysis.signals.mediumTerm.confidence
            }
          },
          riskAssessment: {
            overall: analysis.riskAssessment.overall,
            factorsCount: analysis.riskAssessment.factors.length,
            opportunitiesCount: analysis.riskAssessment.opportunities.length,
            warningsCount: analysis.riskAssessment.warnings.length
          },
          confidence: analysis.confidence,
          recommendedTimeframe: analysis.recommendedTimeframe
        }
      });
      
    } catch (error) {
      this.logger.error('Technical confluences analysis failed', {
        symbol: args.symbol,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.formatErrorResponse(
        `Technical confluences analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
