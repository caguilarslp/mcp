/**
 * @fileoverview Comprehensive Analysis Handlers - Complete technical analysis
 * @description Handles comprehensive technical analysis and complete market analysis
 * @version 1.0.0
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class ComprehensiveAnalysisHandlers {
  constructor(
    private readonly engine: MarketAnalysisEngine,
    private readonly logger: FileLogger
  ) {}

  async handlePerformTechnicalAnalysis(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const options = {
      includeVolatility: args?.includeVolatility ?? true,
      includeVolume: args?.includeVolume ?? true,
      includeVolumeDelta: args?.includeVolumeDelta ?? true,
      includeSupportResistance: args?.includeSupportResistance ?? true,
      timeframe: args?.timeframe || '60',
      periods: args?.periods || 100
    };

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.performTechnicalAnalysis(symbol, options);

    if (!response.success) {
      throw new Error(response.error || 'Failed to perform technical analysis');
    }

    // Format the comprehensive analysis
    const analysis = response.data!;
    const formattedAnalysis: any = { symbol };

    if (analysis.volatility) {
      formattedAnalysis.volatility = {
        percent: `${analysis.volatility.volatilityPercent.toFixed(2)}%`,
        good_for_grid: analysis.volatility.isGoodForGrid,
        recommendation: analysis.volatility.recommendation,
        confidence: `${analysis.volatility.confidence}%`
      };
    }

    if (analysis.volume) {
      formattedAnalysis.volume = {
        current_vs_average: `${((analysis.volume.currentVolume / analysis.volume.avgVolume) * 100).toFixed(0)}%`,
        trend: analysis.volume.trend,
        vwap_position: analysis.volume.vwap.priceVsVwap,
        vwap_difference: `${analysis.volume.vwap.difference.toFixed(2)}%`
      };
    }

    if (analysis.volumeDelta) {
      formattedAnalysis.volume_delta = {
        bias: analysis.volumeDelta.bias,
        strength: `${analysis.volumeDelta.strength.toFixed(1)}%`,
        divergence_detected: analysis.volumeDelta.divergence.detected,
        market_pressure: analysis.volumeDelta.marketPressure.trend
      };
    }

    if (analysis.supportResistance) {
      formattedAnalysis.support_resistance = {
        resistances_found: analysis.supportResistance.resistances.length,
        supports_found: analysis.supportResistance.supports.length,
        critical_level: {
          type: analysis.supportResistance.criticalLevel.type,
          price: `${analysis.supportResistance.criticalLevel.level.toFixed(4)}`,
          distance: `${analysis.supportResistance.criticalLevel.priceDistance.toFixed(2)}%`
        }
      };
    }

    // Enhanced response with context (TASK-027 FASE 3)
    try {
      const { ContextAwareRepository } = await import('../../services/context/contextRepository.js');
      const contextRepository = new ContextAwareRepository();
      const contextService = contextRepository.getContextService();
      const historicalContext = await contextService.getContextSummary(symbol, options.timeframe);
      
      if (historicalContext) {
        formattedAnalysis.context = {
          historical_trend: historicalContext.trend_summary.direction,
          trend_strength: historicalContext.trend_summary.strength,
          recommendation_consistency: historicalContext.recommendations_summary.confidence,
          key_levels_count: (historicalContext.key_levels.support.length + historicalContext.key_levels.resistance.length),
          analysis_count: historicalContext.analysis_count,
          continuity_note: this.assessTechnicalContinuity(analysis, historicalContext)
        };
      }
    } catch (contextError) {
      // Context enhancement failed, proceed without it
      this.logger?.info(`Context enhancement failed for ${symbol}: ${contextError}`);
    }

    return this.createSuccessResponse(formattedAnalysis);
  }

  async handleGetCompleteAnalysis(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const investment = args?.investment as number;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getCompleteAnalysis(symbol, investment);

    if (!response.success) {
      throw new Error(response.error || 'Failed to perform complete analysis');
    }

    const analysis = response.data!;
    
    const formattedAnalysis: any = {
      symbol,
      summary: {
        recommendation: analysis.summary.recommendation.toUpperCase(),
        confidence: `${analysis.summary.confidence}%`,
        risk_level: analysis.summary.riskLevel.toUpperCase(),
        key_points: analysis.summary.keyPoints
      },
      market_data: {
        current_price: `${analysis.marketData.ticker.lastPrice.toFixed(4)}`,
        change_24h: `${analysis.marketData.ticker.price24hPcnt.toFixed(2)}%`,
        volume_24h: analysis.marketData.ticker.volume24h.toString(),
        spread: `${analysis.marketData.orderbook.spread.toFixed(4)}`
      },
      technical_indicators: {
        volatility: analysis.technicalAnalysis.volatility ? {
          percent: `${analysis.technicalAnalysis.volatility.volatilityPercent.toFixed(2)}%`,
          suitable_for_grid: analysis.technicalAnalysis.volatility.isGoodForGrid
        } : null,
        volume_analysis: analysis.technicalAnalysis.volume ? {
          current_vs_avg: `${((analysis.technicalAnalysis.volume.currentVolume / analysis.technicalAnalysis.volume.avgVolume) * 100).toFixed(0)}%`,
          trend: analysis.technicalAnalysis.volume.trend
        } : null,
        support_resistance: analysis.technicalAnalysis.supportResistance ? {
          levels_found: analysis.technicalAnalysis.supportResistance.resistances.length + analysis.technicalAnalysis.supportResistance.supports.length,
          critical_distance: `${analysis.technicalAnalysis.supportResistance.criticalLevel.priceDistance.toFixed(2)}%`
        } : null
      }
    };

    if (analysis.gridSuggestion) {
      formattedAnalysis.grid_suggestion = {
        recommended: analysis.gridSuggestion.recommendation === 'recommended',
        confidence: `${analysis.gridSuggestion.confidence}%`,
        range: `${analysis.gridSuggestion.suggestedRange.lower.toFixed(4)} - ${analysis.gridSuggestion.suggestedRange.upper.toFixed(4)}`,
        potential_profit: analysis.gridSuggestion.potentialProfit
      };
    }

    return this.createSuccessResponse(formattedAnalysis);
  }

  /**
   * Assess continuity between current technical analysis and historical context
   */
  private assessTechnicalContinuity(analysis: any, historicalContext: any): string {
    if (!analysis || !historicalContext) return 'unknown';
    
    // Check volume trend consistency
    const currentVolumeTrend = analysis.volume?.trend;
    const historicalTrend = historicalContext.trend_summary?.direction;
    
    if (currentVolumeTrend === 'increasing' && historicalTrend === 'bullish') {
      return 'volume supports historical bullish trend';
    } else if (currentVolumeTrend === 'decreasing' && historicalTrend === 'bearish') {
      return 'volume supports historical bearish trend';
    } else if (currentVolumeTrend === 'stable') {
      return 'volume trend neutral - sideways action likely';
    }
    
    return 'current signals diverging from historical trend';
  }

  private createSuccessResponse(data: any): MCPServerResponse {
    // Ensure clean JSON serialization without complex objects
    let cleanData: any;
    
    try {
      // Convert to JSON and back to ensure clean serialization
      const jsonString = JSON.stringify(data, (key, value) => {
        // Filter out potentially problematic values
        if (typeof value === 'function' || value === undefined) {
          return '[FILTERED]';
        }
        if (typeof value === 'object' && value !== null) {
          // Ensure objects are plain and serializable
          if (value.constructor !== Object && value.constructor !== Array) {
            return '[COMPLEX_OBJECT]';
          }
        }
        return value;
      });
      
      cleanData = JSON.parse(jsonString);
    } catch (error) {
      // Fallback to simple string representation
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
