/**
 * @fileoverview Wyckoff Basic Handlers
 * @description MCP handlers for Wyckoff basic analysis functionality
 * @version 1.0.0
 */

import type { MarketAnalysisEngine } from '../../core/engine.js';
import type { MCPServerResponse } from '../../types/index.js';
import type { WyckoffPhaseAnalysis, TradingRangeAnalysis, SpringEvent, UpthrustEvent, TestEvent, VolumeContext } from '../../services/wyckoffBasic.js';
import { ContextAwareRepository } from '../../services/context/contextRepository.js';
import { Logger } from '../../utils/logger.js';

/**
 * Wyckoff Basic Analysis Handlers (Enhanced with Context - TASK-027 FASE 3)
 */
export class WyckoffBasicHandlers {
  private readonly contextRepository: ContextAwareRepository;
  private readonly logger: Logger;

  constructor(private engine: MarketAnalysisEngine) {
    this.contextRepository = new ContextAwareRepository();
    this.logger = new Logger('WyckoffBasicHandlers');
  }

  /**
   * Handle Wyckoff phase analysis request
   */
  async handleAnalyzeWyckoffPhase(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60', lookback = 100 } = args;

      if (!symbol) {
        return this.formatErrorResponse('Symbol is required');
      }

      const analysis = await this.engine.wyckoffBasicService.analyzeWyckoffPhase(
        symbol,
        timeframe,
        lookback
      );

      // Enhanced response with context (TASK-027 FASE 3)
      const enhancedResponse = await this.enhanceWithContext(analysis, symbol, timeframe, 'wyckoff_phase');

      return this.formatSuccessResponse(enhancedResponse, 'Wyckoff phase analysis completed');

    } catch (error) {
      return this.formatErrorResponse(`Failed to analyze Wyckoff phase: ${error}`);
    }
  }

  /**
   * Handle trading range detection request
   */
  async handleDetectTradingRange(args: {
    symbol: string;
    timeframe?: string;
    minPeriods?: number;
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60', minPeriods = 20 } = args;

      if (!symbol) {
        return this.formatErrorResponse('Symbol is required');
      }

      const analysis = await this.engine.wyckoffBasicService.detectTradingRange(
        symbol,
        timeframe,
        minPeriods
      );

      // Enhanced response with context (TASK-027 FASE 3)
      const enhancedResponse = await this.enhanceWithContext(analysis, symbol, timeframe, 'trading_range');

      return this.formatSuccessResponse(enhancedResponse, 'Trading range detection completed');

    } catch (error) {
      return this.formatErrorResponse(`Failed to detect trading range: ${error}`);
    }
  }

  /**
   * Handle Wyckoff events detection request
   */
  async handleFindWyckoffEvents(args: {
    symbol: string;
    timeframe?: string;
    eventTypes?: string[];
    lookback?: number;
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60', eventTypes = ['spring', 'upthrust', 'test'], lookback = 100 } = args;

      if (!symbol) {
        return this.formatErrorResponse('Symbol is required');
      }

      // First get the trading range
      const tradingRangeAnalysis = await this.engine.wyckoffBasicService.detectTradingRange(
        symbol,
        timeframe,
        20
      );

      const events: any[] = [];

      // Detect springs if requested
      if (eventTypes.includes('spring') && tradingRangeAnalysis.tradingRange) {
        const springs = await this.engine.wyckoffBasicService.detectSprings(
          symbol,
          timeframe,
          tradingRangeAnalysis.tradingRange
        );
        events.push(...springs);
      }

      // Detect upthrusts if requested
      if (eventTypes.includes('upthrust') && tradingRangeAnalysis.tradingRange) {
        const upthrusts = await this.engine.wyckoffBasicService.detectUpthrusts(
          symbol,
          timeframe,
          tradingRangeAnalysis.tradingRange
        );
        events.push(...upthrusts);
      }

      // Detect test events if requested
      if (eventTypes.includes('test') && tradingRangeAnalysis.tradingRange) {
        const keyLevels = [
          tradingRangeAnalysis.tradingRange.support,
          tradingRangeAnalysis.tradingRange.resistance
        ];
        const tests = await this.engine.wyckoffBasicService.detectTestEvents(
          symbol,
          timeframe,
          keyLevels
        );
        events.push(...tests);
      }

      // Sort events by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const result = {
        symbol,
        timeframe,
        totalEvents: events.length,
        eventTypes: eventTypes,
        tradingRange: tradingRangeAnalysis.tradingRange,
        events: events
      };

      return this.formatSuccessResponse(result, `Found ${events.length} Wyckoff events`);

    } catch (error) {
      return this.formatErrorResponse(`Failed to find Wyckoff events: ${error}`);
    }
  }

  /**
   * Handle Wyckoff volume analysis request
   */
  async handleAnalyzeWyckoffVolume(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60', lookback = 100 } = args;

      if (!symbol) {
        return this.formatErrorResponse('Symbol is required');
      }

      // Get klines data
      const klinesResponse = await this.engine.getKlines(symbol, timeframe, lookback);
      
      if (!klinesResponse.success || !klinesResponse.data) {
        return this.formatErrorResponse('Failed to get klines data for Wyckoff volume analysis');
      }
      
      const klines = klinesResponse.data;
      
      // Analyze volume in Wyckoff context
      const volumeContext = await this.engine.wyckoffBasicService.analyzeWyckoffVolume(
        symbol,
        timeframe,
        klines
      );

      const result = {
        symbol,
        timeframe,
        totalPeriods: klines.length,
        volumeAnalysis: volumeContext
      };

      return this.formatSuccessResponse(result, 'Wyckoff volume analysis completed');

    } catch (error) {
      return this.formatErrorResponse(`Failed to analyze Wyckoff volume: ${error}`);
    }
  }

  /**
   * Handle Wyckoff interpretation request
   */
  async handleGetWyckoffInterpretation(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60' } = args;

      if (!symbol) {
        return this.formatErrorResponse('Symbol is required');
      }

      // Get full Wyckoff analysis
      const analysis = await this.engine.wyckoffBasicService.analyzeWyckoffPhase(
        symbol,
        timeframe
      );

      // Extract key interpretation elements
      const interpretation = {
        symbol,
        timeframe,
        currentPhase: analysis.currentPhase,
        phaseConfidence: analysis.phaseConfidence,
        phaseProgress: analysis.phaseProgress,
        bias: analysis.interpretation.bias,
        strength: analysis.interpretation.strength,
        implications: analysis.interpretation.implications,
        nextExpectedEvents: analysis.interpretation.nextExpectedEvents,
        tradingRange: analysis.tradingRange ? {
          support: analysis.tradingRange.support,
          resistance: analysis.tradingRange.resistance,
          width: analysis.tradingRange.width,
          type: analysis.tradingRange.type,
          quality: analysis.tradingRange.strength
        } : null,
        keyEvents: analysis.keyEvents.map(event => ({
          type: event.type,
          timestamp: event.timestamp,
          significance: event.significance,
          description: event.description
        })),
        volumeInsights: analysis.volumeCharacteristics.interpretation
      };

      return this.formatSuccessResponse(interpretation, 'Wyckoff interpretation generated');

    } catch (error) {
      return this.formatErrorResponse(`Failed to get Wyckoff interpretation: ${error}`);
    }
  }

  /**
   * Handle phase progression tracking request
   */
  async handleTrackPhaseProgression(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60' } = args;

      if (!symbol) {
        return this.formatErrorResponse('Symbol is required');
      }

      // Get current phase analysis
      const currentAnalysis = await this.engine.wyckoffBasicService.analyzeWyckoffPhase(
        symbol,
        timeframe
      );

      // Try to get historical progression (simplified version)
      const progression = {
        symbol,
        timeframe,
        currentPhase: {
          phase: currentAnalysis.currentPhase,
          confidence: currentAnalysis.phaseConfidence,
          progress: currentAnalysis.phaseProgress,
          duration: currentAnalysis.tradingRange?.duration || 0
        },
        phaseTimeline: this.generatePhaseTimeline(currentAnalysis.currentPhase, currentAnalysis.phaseProgress),
        nextMilestones: this.getNextMilestones(currentAnalysis.currentPhase, currentAnalysis.phaseProgress),
        riskFactors: this.identifyRiskFactors(currentAnalysis),
        recommendations: this.generateProgressionRecommendations(currentAnalysis)
      };

      return this.formatSuccessResponse(progression, 'Phase progression tracking completed');

    } catch (error) {
      return this.formatErrorResponse(`Failed to track phase progression: ${error}`);
    }
  }

  /**
   * Handle Wyckoff setup validation request
   */
  async handleValidateWyckoffSetup(args: {
    symbol: string;
    timeframe?: string;
    tradingDirection?: 'long' | 'short';
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60', tradingDirection } = args;

      if (!symbol) {
        return this.formatErrorResponse('Symbol is required');
      }

      // Get full Wyckoff analysis
      const analysis = await this.engine.wyckoffBasicService.analyzeWyckoffPhase(
        symbol,
        timeframe
      );

      // Validate setup based on current phase and direction
      const validation = this.validateTradingSetup(analysis, tradingDirection);

      const result = {
        symbol,
        timeframe,
        tradingDirection,
        currentPhase: analysis.currentPhase,
        validation: validation.isValid,
        confidence: validation.confidence,
        score: validation.score,
        strengths: validation.strengths,
        weaknesses: validation.weaknesses,
        entryConditions: validation.entryConditions,
        riskManagement: validation.riskManagement,
        recommendation: validation.recommendation
      };

      return this.formatSuccessResponse(result, 'Wyckoff setup validation completed');

    } catch (error) {
      return this.formatErrorResponse(`Failed to validate Wyckoff setup: ${error}`);
    }
  }

  // ====================
  // CONTEXT ENHANCEMENT METHODS (TASK-027 FASE 3)
  // ====================

  /**
   * Enhance analysis response with historical context
   */
  private async enhanceWithContext(
    analysis: any, 
    symbol: string, 
    timeframe: string, 
    analysisType: string
  ): Promise<any> {
    try {
      // Get historical context for this symbol/timeframe
      const contextService = this.contextRepository.getContextService();
      const historicalContext = await contextService.getContextSummary(symbol, timeframe);
      
      if (!historicalContext) {
        this.logger.info(`No historical context available for ${symbol}/${timeframe}`);
        return {
          analysis,
          context: {
            message: 'No historical context available',
            first_analysis: true
          }
        };
      }

      // Extract relevant context insights
      const contextInsights = {
        historical_trend: historicalContext.trend_summary,
        pattern_frequency: historicalContext.pattern_frequency,
        key_levels_stability: this.assessLevelStability(historicalContext.key_levels.support.concat(historicalContext.key_levels.resistance)),
        recommendation_consistency: {
          confidence: historicalContext.recommendations_summary.confidence,
          most_common: historicalContext.recommendations_summary.bias
        },
        // market_regime: historicalContext.market_regime, // Not available in ContextSummary
        last_updated: historicalContext.metadata.last_updated,
        data_points: historicalContext.analysis_count
      };

      // Generate contextual insights specific to Wyckoff analysis
      const wyckoffContextInsights = this.generateWyckoffContextInsights(
        analysis, 
        historicalContext, 
        analysisType
      );

      return {
        analysis,
        context: {
          historical: contextInsights,
          wyckoff_insights: wyckoffContextInsights,
          continuity_score: this.calculateContinuityScore(analysis, historicalContext)
        }
      };

    } catch (error) {
      this.logger.warn(`Failed to enhance with context for ${symbol}:`, error);
      return {
        analysis,
        context: {
          error: 'Context enhancement failed',
          message: 'Analysis provided without historical context'
        }
      };
    }
  }

  /**
   * Generate Wyckoff-specific context insights
   */
  private generateWyckoffContextInsights(
    currentAnalysis: any, 
    historicalContext: any, 
    analysisType: string
  ): any {
    const insights: any = {
      pattern_persistence: 'unknown',
      phase_stability: 'unknown',
      volume_behavior: 'unknown',
      trading_range_evolution: 'unknown'
    };

    // Analyze pattern persistence in historical data
    if (historicalContext.pattern_frequency) {
      const wyckoffPatterns = Object.keys(historicalContext.pattern_frequency)
        .filter(pattern => pattern.includes('wyckoff') || pattern.includes('accumulation') || pattern.includes('distribution'));
      
      if (wyckoffPatterns.length > 0) {
        insights.pattern_persistence = wyckoffPatterns.length > 2 ? 'high' : 'moderate';
        insights.dominant_patterns = wyckoffPatterns;
      }
    }

    // Assess phase stability
    if (currentAnalysis.currentPhase && historicalContext.trend_summary) {
      const currentBias = currentAnalysis.interpretation?.bias;
      const historicalDirection = historicalContext.trend_summary.direction;
      
      insights.phase_stability = currentBias === historicalDirection ? 'consistent' : 'transitioning';
    }

    // Assess volume behavior consistency
    if (currentAnalysis.volumeCharacteristics && historicalContext.key_levels) {
      insights.volume_behavior = currentAnalysis.volumeCharacteristics.climaxEvents?.length > 0 ? 
        'active' : 'subdued';
    }

    // Trading range evolution
    if (analysisType === 'trading_range' && currentAnalysis.tradingRange) {
      insights.trading_range_evolution = {
        current_width: currentAnalysis.tradingRange.width,
        quality: currentAnalysis.tradingRange.strength,
        historical_significance: this.assessRangeHistoricalSignificance(
          currentAnalysis.tradingRange, 
          historicalContext.key_levels.support.concat(historicalContext.key_levels.resistance)
        )
      };
    }

    return insights;
  }

  /**
   * Calculate continuity score between current analysis and historical context
   */
  private calculateContinuityScore(currentAnalysis: any, historicalContext: any): number {
    let score = 50; // Base score
    let factors = 0;

    // Trend consistency
    if (currentAnalysis.interpretation?.bias && historicalContext.trend_summary?.direction) {
      const consistent = currentAnalysis.interpretation.bias === historicalContext.trend_summary.direction;
      score += consistent ? 20 : -10;
      factors++;
    }

    // Phase confidence vs historical confidence
    if (currentAnalysis.phaseConfidence && historicalContext.recommendations_summary?.confidence) {
      const confidenceDiff = Math.abs(currentAnalysis.phaseConfidence - historicalContext.recommendations_summary.confidence);
      score += confidenceDiff < 20 ? 15 : confidenceDiff < 40 ? 0 : -15;
      factors++;
    }

    // Volume pattern consistency
    if (currentAnalysis.volumeCharacteristics && historicalContext.pattern_frequency) {
      const hasVolumeEvents = currentAnalysis.volumeCharacteristics.climaxEvents?.length > 0;
      const historicalVolumePatterns = Object.keys(historicalContext.pattern_frequency)
        .some(pattern => pattern.includes('volume') || pattern.includes('climax'));
      
      score += hasVolumeEvents === historicalVolumePatterns ? 15 : -5;
      factors++;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Assess stability of key levels over time
   */
  private assessLevelStability(keyLevels: any[]): string {
    if (!keyLevels || keyLevels.length === 0) return 'unknown';
    
    // Simple assessment based on number of levels
    if (keyLevels.length >= 5) return 'well_established';
    if (keyLevels.length >= 3) return 'moderate';
    return 'developing';
  }

  /**
   * Assess historical significance of current trading range
   */
  private assessRangeHistoricalSignificance(tradingRange: any, historicalLevels: number[]): string {
    if (!historicalLevels || historicalLevels.length === 0) return 'unknown';

    // Check if current range levels align with historical key levels
    const supportNearHistorical = historicalLevels.some(level => 
      Math.abs(level - tradingRange.support) / tradingRange.support < 0.02
    );
    
    const resistanceNearHistorical = historicalLevels.some(level => 
      Math.abs(level - tradingRange.resistance) / tradingRange.resistance < 0.02
    );

    if (supportNearHistorical && resistanceNearHistorical) return 'high';
    if (supportNearHistorical || resistanceNearHistorical) return 'moderate';
    return 'new_formation';
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  private generatePhaseTimeline(phase: string, progress: number): any[] {
    const timeline = [];
    
    if (phase.includes('accumulation')) {
      timeline.push(
        { phase: 'accumulation_phase_a', status: 'completed', description: 'Selling climax and automatic reaction' },
        { phase: 'accumulation_phase_b', status: progress > 20 ? 'completed' : 'current', description: 'Building cause, testing supply' },
        { phase: 'accumulation_phase_c', status: progress > 40 ? 'completed' : progress > 20 ? 'current' : 'pending', description: 'Spring - last point of supply' },
        { phase: 'accumulation_phase_d', status: progress > 60 ? 'completed' : progress > 40 ? 'current' : 'pending', description: 'Signs of strength' },
        { phase: 'accumulation_phase_e', status: progress > 80 ? 'completed' : progress > 60 ? 'current' : 'pending', description: 'Last point of support' },
        { phase: 'markup', status: progress > 90 ? 'current' : 'pending', description: 'Uptrend phase' }
      );
    } else if (phase.includes('distribution')) {
      timeline.push(
        { phase: 'distribution_phase_a', status: 'completed', description: 'Buying climax and automatic reaction' },
        { phase: 'distribution_phase_b', status: progress > 20 ? 'completed' : 'current', description: 'Building cause, testing demand' },
        { phase: 'distribution_phase_c', status: progress > 40 ? 'completed' : progress > 20 ? 'current' : 'pending', description: 'Upthrust - last point of demand' },
        { phase: 'distribution_phase_d', status: progress > 60 ? 'completed' : progress > 40 ? 'current' : 'pending', description: 'Signs of weakness' },
        { phase: 'distribution_phase_e', status: progress > 80 ? 'completed' : progress > 60 ? 'current' : 'pending', description: 'Last point of supply' },
        { phase: 'markdown', status: progress > 90 ? 'current' : 'pending', description: 'Downtrend phase' }
      );
    } else {
      timeline.push({ phase, status: 'current', description: 'Current phase' });
    }
    
    return timeline;
  }

  private getNextMilestones(phase: string, progress: number): string[] {
    const milestones = [];
    
    if (phase.includes('accumulation')) {
      if (progress < 40) {
        milestones.push('Look for spring or successful test of support');
      } else if (progress < 60) {
        milestones.push('Watch for signs of strength on rallies');
      } else if (progress < 80) {
        milestones.push('Monitor for last point of support');
      } else {
        milestones.push('Prepare for markup phase breakout');
      }
    } else if (phase.includes('distribution')) {
      if (progress < 40) {
        milestones.push('Look for upthrust or failed test of resistance');
      } else if (progress < 60) {
        milestones.push('Watch for signs of weakness on declines');
      } else if (progress < 80) {
        milestones.push('Monitor for last point of supply');
      } else {
        milestones.push('Prepare for markdown phase breakdown');
      }
    }
    
    return milestones;
  }

  private identifyRiskFactors(analysis: WyckoffPhaseAnalysis): string[] {
    const risks = [];
    
    if (analysis.phaseConfidence < 60) {
      risks.push('Low phase confidence - pattern may not be fully developed');
    }
    
    if (analysis.tradingRange && analysis.tradingRange.width > 20) {
      risks.push('Wide trading range - lower probability setup');
    }
    
    if (analysis.volumeCharacteristics.climaxEvents.length === 0) {
      risks.push('No climax events detected - institutional participation unclear');
    }
    
    if (analysis.keyEvents.length < 2) {
      risks.push('Few key events - pattern validation limited');
    }
    
    return risks;
  }

  private generateProgressionRecommendations(analysis: WyckoffPhaseAnalysis): string[] {
    const recommendations = [];
    
    if (analysis.interpretation.bias === 'accumulation') {
      recommendations.push('Monitor for spring events or successful tests of support');
      recommendations.push('Look for volume dry-up on tests');
      recommendations.push('Watch for signs of strength on rallies');
    } else if (analysis.interpretation.bias === 'distribution') {
      recommendations.push('Monitor for upthrust events or failed tests of resistance');
      recommendations.push('Look for high volume on rallies with poor price progress');
      recommendations.push('Watch for signs of weakness on declines');
    }
    
    recommendations.push('Maintain risk management discipline');
    recommendations.push('Consider position sizing based on phase confidence');
    
    return recommendations;
  }

  private validateTradingSetup(analysis: WyckoffPhaseAnalysis, direction?: 'long' | 'short'): {
    isValid: boolean;
    confidence: number;
    score: number;
    strengths: string[];
    weaknesses: string[];
    entryConditions: string[];
    riskManagement: string[];
    recommendation: string;
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const entryConditions: string[] = [];
    const riskManagement: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Phase alignment with direction (30 points)
    maxScore += 30;
    if (direction === 'long' && analysis.interpretation.bias === 'accumulation') {
      score += 30;
      strengths.push('Phase aligned with long direction');
    } else if (direction === 'short' && analysis.interpretation.bias === 'distribution') {
      score += 30;
      strengths.push('Phase aligned with short direction');
    } else if (direction && analysis.interpretation.bias === 'trending') {
      score += 20;
      strengths.push('Trending phase supports directional bias');
    } else if (direction) {
      weaknesses.push('Phase not aligned with intended direction');
    }

    // Phase confidence (25 points)
    maxScore += 25;
    if (analysis.phaseConfidence >= 70) {
      score += 25;
      strengths.push('High phase confidence');
    } else if (analysis.phaseConfidence >= 50) {
      score += 15;
      strengths.push('Moderate phase confidence');
    } else {
      score += 5;
      weaknesses.push('Low phase confidence');
    }

    // Key events presence (20 points)
    maxScore += 20;
    if (analysis.keyEvents.length >= 3) {
      score += 20;
      strengths.push('Multiple key events detected');
    } else if (analysis.keyEvents.length >= 1) {
      score += 10;
      strengths.push('Some key events detected');
    } else {
      weaknesses.push('No significant events detected');
    }

    // Volume characteristics (15 points)
    maxScore += 15;
    if (analysis.volumeCharacteristics.climaxEvents.length > 0) {
      score += 10;
      strengths.push('Climax events present');
    }
    if (analysis.volumeCharacteristics.dryUpPeriods.length > 0) {
      score += 5;
      strengths.push('Volume dry-up periods detected');
    }
    if (analysis.volumeCharacteristics.climaxEvents.length === 0 && analysis.volumeCharacteristics.dryUpPeriods.length === 0) {
      weaknesses.push('Limited volume confirmation');
    }

    // Trading range quality (10 points)
    maxScore += 10;
    if (analysis.tradingRange) {
      if (analysis.tradingRange.strength === 'strong') {
        score += 10;
        strengths.push('Strong trading range');
      } else if (analysis.tradingRange.strength === 'moderate') {
        score += 6;
        strengths.push('Moderate trading range');
      } else {
        score += 2;
        weaknesses.push('Weak trading range');
      }
    } else {
      weaknesses.push('No clear trading range');
    }

    // Generate entry conditions based on phase
    if (analysis.interpretation.bias === 'accumulation') {
      entryConditions.push('Wait for spring or successful test of support');
      entryConditions.push('Look for signs of strength on rallies');
      entryConditions.push('Enter on break above trading range resistance');
      riskManagement.push('Stop loss below spring low');
      riskManagement.push('Position size based on range width');
    } else if (analysis.interpretation.bias === 'distribution') {
      entryConditions.push('Wait for upthrust or failed test of resistance');
      entryConditions.push('Look for signs of weakness on declines');
      entryConditions.push('Enter on break below trading range support');
      riskManagement.push('Stop loss above upthrust high');
      riskManagement.push('Position size based on range width');
    } else {
      entryConditions.push('Wait for clear phase development');
      riskManagement.push('Use wider stops in uncertain phases');
    }

    // General risk management
    riskManagement.push('Risk no more than 1-2% of capital per trade');
    riskManagement.push('Monitor for phase changes that invalidate setup');

    const finalScore = (score / maxScore) * 100;
    const confidence = Math.min(95, finalScore);
    const isValid = finalScore >= 60;

    let recommendation: string;
    if (finalScore >= 80) {
      recommendation = 'Excellent setup - consider taking position';
    } else if (finalScore >= 70) {
      recommendation = 'Good setup - wait for optimal entry';
    } else if (finalScore >= 60) {
      recommendation = 'Marginal setup - proceed with caution';
    } else {
      recommendation = 'Poor setup - wait for better opportunity';
    }

    return {
      isValid,
      confidence,
      score: finalScore,
      strengths,
      weaknesses,
      entryConditions,
      riskManagement,
      recommendation
    };
  }

  /**
   * Format success response
   */
  private formatSuccessResponse(data: any, message?: string): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: message || 'Operation completed successfully',
          data,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  /**
   * Format error response
   */
  private formatErrorResponse(error: string): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }
}
