/**
 * @fileoverview Context-Aware Analysis Handlers - TASK-040.4
 * @description MCP handlers for context-aware analysis functionality
 * @version 1.0.0
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';
import { ContextAwareAnalysisService, ContextAwareAnalysisOptions } from '../../services/contextIntegration/contextAwareAnalysisService.js';

export class ContextAwareAnalysisHandlers {
  private contextAwareService: ContextAwareAnalysisService;
  private logger: FileLogger;

  constructor(
    private readonly engine: MarketAnalysisEngine
  ) {
    this.contextAwareService = new ContextAwareAnalysisService(engine);
    this.logger = new FileLogger('ContextAwareAnalysisHandlers');
  }

  /**
   * Perform technical analysis enhanced with hierarchical context
   */
  async handleAnalyzeWithHistoricalContext(args: {
    symbol: string;
    timeframe?: string;
    periods?: number;
    includeHistoricalContext?: boolean;
    updateContextAfterAnalysis?: boolean;
    contextLookbackDays?: number;
    confidenceThreshold?: number;
  }): Promise<MCPServerResponse> {
    try {
      // Validate required parameters
      if (!args.symbol || typeof args.symbol !== 'string') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'symbol is required and must be a string',
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      const options: ContextAwareAnalysisOptions = {
        symbol: args.symbol.toUpperCase(),
        timeframe: args.timeframe || '60',
        periods: args.periods || 100,
        includeHistoricalContext: args.includeHistoricalContext !== false,
        updateContextAfterAnalysis: args.updateContextAfterAnalysis !== false,
        contextLookbackDays: args.contextLookbackDays || 30,
        confidenceThreshold: args.confidenceThreshold || 60
      };

      const result = await this.contextAwareService.performContextAwareTechnicalAnalysis(options);
      
      const formattedResponse = this.formatContextAwareAnalysis(result, 'technical');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(formattedResponse, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Context-aware technical analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Perform complete analysis enhanced with hierarchical context
   */
  async handleCompleteAnalysisWithContext(args: {
    symbol: string;
    investment?: number;
    timeframe?: string;
    periods?: number;
    includeHistoricalContext?: boolean;
    updateContextAfterAnalysis?: boolean;
    contextLookbackDays?: number;
    confidenceThreshold?: number;
  }): Promise<MCPServerResponse> {
    try {
      // Validate required parameters
      if (!args.symbol || typeof args.symbol !== 'string') {
        return {
          content: [{
            type: 'text',
          text: JSON.stringify({
              error: 'symbol is required and must be a string',
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      const options: Partial<ContextAwareAnalysisOptions> = {
        timeframe: args.timeframe || '60',
        periods: args.periods || 100,
        includeHistoricalContext: args.includeHistoricalContext !== false,
        updateContextAfterAnalysis: args.updateContextAfterAnalysis !== false,
        contextLookbackDays: args.contextLookbackDays || 30,
        confidenceThreshold: args.confidenceThreshold || 60
      };

      const result = await this.contextAwareService.performContextAwareCompleteAnalysis(
        args.symbol.toUpperCase(),
        args.investment,
        options
      );
      
      const formattedResponse = this.formatContextAwareAnalysis(result, 'complete');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(formattedResponse, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Context-aware complete analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Format context-aware analysis response for MCP
   */
  private formatContextAwareAnalysis(
    result: any,
    analysisType: 'technical' | 'complete'
  ): any {
    const formatted: any = {
      analysisType: `context_aware_${analysisType}`,
      symbol: result.originalAnalysis.symbol || 'Unknown',
      timestamp: result.metadata.analysisTime.toISOString(),
      
      // Original analysis (condensed for readability)
      originalAnalysis: this.condenseOriginalAnalysis(result.originalAnalysis, analysisType),
      
      // Context confidence and metadata
      contextConfidence: `${result.contextConfidence}%`,
      contextDataAge: this.formatDataAge(result.metadata.contextDataAge),
      
      // Enhanced recommendations
      recommendations: {
        action: result.recommendations.action,
        reason: result.recommendations.reason,
        confidence: `${result.recommendations.confidence}%`,
        riskAdjustment: result.recommendations.riskAdjustment
      },

      // Historical context insights
      historicalContext: result.historicalContext ? {
        summary: result.historicalContext.summary,
        nearbyLevelsCount: result.historicalContext.keyLevelsNearby.length,
        keyLevels: result.historicalContext.keyLevelsNearby.slice(0, 3).map((level: any) => ({
          type: level.type,
          price: Number(level.level.toFixed(4)),
          strength: Number(level.strength.toFixed(1)),
          distance: `${Math.abs(result.originalAnalysis.ticker?.lastPrice - level.level || 0).toFixed(2)}`,
          lastSeen: this.formatTimeAgo(level.lastSeen)
        })),
        patternAlignments: result.historicalContext.patternAlignments.map((alignment: any) => ({
          historical: alignment.historical,
          current: alignment.current,
          alignment: alignment.alignment,
          confidence: `${alignment.confidence}%`
        })),
        marketBiasAlignment: result.historicalContext.marketBiasAlignment,
        continuityScore: `${result.historicalContext.continuityScore}%`
      } : null,

      // Context metadata
      contextMetadata: {
        totalHistoricalLevels: result.metadata.totalHistoricalLevels,
        totalHistoricalPatterns: result.metadata.totalHistoricalPatterns,
        dataFreshness: this.assessDataFreshness(result.metadata.contextDataAge)
      },

      // Key insights
      keyInsights: this.generateKeyInsights(result)
    };

    return formatted;
  }

  /**
   * Condense original analysis for better readability
   */
  private condenseOriginalAnalysis(originalAnalysis: any, analysisType: 'technical' | 'complete'): any {
    if (analysisType === 'complete') {
      return {
        summary: originalAnalysis.summary,
        marketData: {
          currentPrice: originalAnalysis.marketData?.ticker?.lastPrice,
          change24h: originalAnalysis.marketData?.ticker?.price24hPcnt,
          volume24h: originalAnalysis.marketData?.ticker?.volume24h
        },
        technicalSummary: {
          volatility: originalAnalysis.technicalAnalysis?.volatility ? 
            `${originalAnalysis.technicalAnalysis.volatility.volatilityPercent.toFixed(2)}%` : null,
          volumeTrend: originalAnalysis.technicalAnalysis?.volume?.trend,
          volumeDeltaBias: originalAnalysis.technicalAnalysis?.volumeDelta?.bias,
          criticalLevel: originalAnalysis.technicalAnalysis?.supportResistance?.criticalLevel ? {
            type: originalAnalysis.technicalAnalysis.supportResistance.criticalLevel.type,
            level: originalAnalysis.technicalAnalysis.supportResistance.criticalLevel.level.toFixed(4),
            distance: `${originalAnalysis.technicalAnalysis.supportResistance.criticalLevel.priceDistance.toFixed(2)}%`
          } : null
        },
        gridRecommendation: originalAnalysis.gridSuggestion ? {
          recommended: originalAnalysis.gridSuggestion.recommendation === 'recommended',
          confidence: `${originalAnalysis.gridSuggestion.confidence}%`
        } : null
      };
    } else {
      // Technical analysis format
      return {
        volatility: originalAnalysis.volatility ? {
          percent: `${originalAnalysis.volatility.volatilityPercent.toFixed(2)}%`,
          goodForGrid: originalAnalysis.volatility.isGoodForGrid,
          recommendation: originalAnalysis.volatility.recommendation
        } : null,
        volume: originalAnalysis.volume ? {
          trend: originalAnalysis.volume.trend,
          currentVsAvg: `${((originalAnalysis.volume.currentVolume / originalAnalysis.volume.avgVolume) * 100).toFixed(0)}%`,
          vwapPosition: originalAnalysis.volume.vwap.priceVsVwap
        } : null,
        volumeDelta: originalAnalysis.volumeDelta ? {
          bias: originalAnalysis.volumeDelta.bias,
          strength: `${originalAnalysis.volumeDelta.strength.toFixed(1)}%`,
          divergenceDetected: originalAnalysis.volumeDelta.divergence.detected
        } : null,
        supportResistance: originalAnalysis.supportResistance ? {
          resistancesFound: originalAnalysis.supportResistance.resistances.length,
          supportsFound: originalAnalysis.supportResistance.supports.length,
          criticalLevel: originalAnalysis.supportResistance.criticalLevel ? {
            type: originalAnalysis.supportResistance.criticalLevel.type,
            level: originalAnalysis.supportResistance.criticalLevel.level.toFixed(4),
            distance: `${originalAnalysis.supportResistance.criticalLevel.priceDistance.toFixed(2)}%`
          } : null
        } : null
      };
    }
  }

  /**
   * Format data age into human-readable format
   */
  private formatDataAge(ageMs: number): string {
    if (ageMs === 0) return 'N/A';
    
    const minutes = Math.floor(ageMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    return `${minutes}m ago`;
  }

  /**
   * Format time ago for level last seen
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    return this.formatDataAge(diffMs);
  }

  /**
   * Assess data freshness
   */
  private assessDataFreshness(ageMs: number): string {
    if (ageMs === 0) return 'no_data';
    
    const hours = ageMs / (1000 * 60 * 60);
    
    if (hours < 1) return 'very_fresh';
    if (hours < 6) return 'fresh';
    if (hours < 24) return 'recent';
    if (hours < 72) return 'stale';
    return 'very_stale';
  }

  /**
   * Generate key insights from context-aware analysis
   */
  private generateKeyInsights(result: any): string[] {
    const insights = [];

    // Context confidence insights
    if (result.contextConfidence >= 75) {
      insights.push('High confidence: Current analysis strongly aligns with historical patterns');
    } else if (result.contextConfidence <= 40) {
      insights.push('Low confidence: Current analysis diverges from historical patterns');
    } else {
      insights.push('Moderate confidence: Mixed signals between current and historical analysis');
    }

    // Historical levels insights
    if (result.historicalContext?.keyLevelsNearby.length >= 3) {
      insights.push(`Critical area detected: ${result.historicalContext.keyLevelsNearby.length} historical levels nearby`);
    } else if (result.historicalContext?.keyLevelsNearby.length === 0) {
      insights.push('Uncharted territory: No significant historical levels nearby');
    }

    // Pattern alignment insights
    const confirmedPatterns = result.historicalContext?.patternAlignments.filter((a: any) => a.alignment === 'confirmed').length || 0;
    const divergentPatterns = result.historicalContext?.patternAlignments.filter((a: any) => a.alignment === 'divergent').length || 0;
    
    if (confirmedPatterns > divergentPatterns) {
      insights.push(`Pattern confirmation: ${confirmedPatterns} signals align with historical trend`);
    } else if (divergentPatterns > 0) {
      insights.push(`Pattern divergence: ${divergentPatterns} signals contradict historical trend`);
    }

    // Market bias insights
    const biasAlignment = result.historicalContext?.marketBiasAlignment;
    if (biasAlignment === 'strengthening') {
      insights.push('Trend acceleration: Current signals strengthen historical bias');
    } else if (biasAlignment === 'divergent') {
      insights.push('Trend reversal potential: Current signals oppose historical bias');
    } else if (biasAlignment === 'weakening') {
      insights.push('Trend fatigue: Historical bias showing signs of weakness');
    }

    // Data quality insights
    if (result.metadata.totalHistoricalLevels < 5) {
      insights.push('Limited historical data: Analysis may be less reliable');
    } else if (result.metadata.totalHistoricalLevels >= 20) {
      insights.push('Rich historical data: Analysis benefits from extensive context');
    }

    // Risk adjustment insights
    if (result.recommendations.riskAdjustment === 'increase') {
      insights.push('Risk warning: Consider smaller position sizes or tighter stops');
    } else if (result.recommendations.riskAdjustment === 'decrease') {
      insights.push('Risk favorable: Historical alignment suggests lower risk');
    }

    return insights.slice(0, 5); // Limit to top 5 insights
  }
}
