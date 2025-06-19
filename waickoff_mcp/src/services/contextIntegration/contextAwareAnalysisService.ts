/**
 * @fileoverview Context-Aware Analysis Service - TASK-040.4
 * @description Integrates hierarchical context with existing analysis methods
 * @version 1.0.0
 */

import { 
  MarketAnalysisEngine
} from '../../core/engine.js';
import { 
  ContextUpdateRequest,
  ContextQueryRequest,
  MasterContext,
  MasterContextLevel
} from '../../types/hierarchicalContext.js';
import { FileLogger } from '../../utils/fileLogger.js';

export interface ContextAwareAnalysisOptions {
  includeHistoricalContext?: boolean;
  updateContextAfterAnalysis?: boolean;
  contextLookbackDays?: number;
  confidenceThreshold?: number;
  symbol: string;
  timeframe?: string;
  periods?: number;
}

export interface ContextEnhancedAnalysis {
  originalAnalysis: any;
  historicalContext?: {
    summary: string;
    keyLevelsNearby: MasterContextLevel[];
    patternAlignments: Array<{
      historical: string;
      current: string;
      alignment: 'confirmed' | 'divergent' | 'neutral';
      confidence: number;
    }>;
    continuityScore: number;
    marketBiasAlignment: 'aligned' | 'divergent' | 'strengthening' | 'weakening';
  };
  contextConfidence: number;
  recommendations: {
    action: string;
    reason: string;
    confidence: number;
    riskAdjustment: 'increase' | 'decrease' | 'maintain';
  };
  metadata: {
    analysisTime: Date;
    contextDataAge: number;
    totalHistoricalLevels: number;
    totalHistoricalPatterns: number;
  };
}

export class ContextAwareAnalysisService {
  private logger: FileLogger;
  private engine: MarketAnalysisEngine;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('ContextAwareAnalysisService');
  }

  /**
   * Perform technical analysis enhanced with hierarchical context
   */
  async performContextAwareTechnicalAnalysis(
    options: ContextAwareAnalysisOptions
  ): Promise<ContextEnhancedAnalysis> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🔍 Starting context-aware technical analysis for ${options.symbol}`);
      
      // STEP 1: Load hierarchical context BEFORE analysis
      let historicalContext;
      let masterContext: MasterContext | null = null;
      
      if (options.includeHistoricalContext !== false) {
      try {
      masterContext = await this.engine.hierarchicalContextManager.getMasterContext(options.symbol);
      if (masterContext) {
      historicalContext = await this.extractRelevantHistoricalContext(
        masterContext, 
          options
        );
            this.logger.debug(`✅ Historical context loaded: ${historicalContext.keyLevelsNearby.length} nearby levels`);
          } else {
            this.logger.debug(`⚠️ No master context found for ${options.symbol}`);
            historicalContext = null;
          }
        } catch (error) {
          this.logger.warn(`⚠️ Could not load historical context for ${options.symbol}:`, error);
          historicalContext = null;
        }
      }

      // STEP 2: Perform the original technical analysis
      const originalAnalysisResponse = await this.engine.performTechnicalAnalysis(
        options.symbol,
        {
          includeVolatility: true,
          includeVolume: true,
          includeVolumeDelta: true,
          includeSupportResistance: true,
          timeframe: options.timeframe || '60',
          periods: options.periods || 100
        }
      );

      if (!originalAnalysisResponse.success) {
        throw new Error(originalAnalysisResponse.error || 'Technical analysis failed');
      }

      const originalAnalysis = originalAnalysisResponse.data!;

      // STEP 3: Compare with historical context
      let contextConfidence = 50; // Default neutral confidence
      let enhancedContext;

      if (historicalContext && masterContext) {
        enhancedContext = await this.compareWithHistoricalContext(
          originalAnalysis,
          historicalContext,
          masterContext,
          options
        );
        contextConfidence = enhancedContext.continuityScore;
      }

      // STEP 4: Generate enhanced recommendations
      const recommendations = this.generateContextAwareRecommendations(
        originalAnalysis,
        enhancedContext,
        contextConfidence
      );

      // STEP 5: Update hierarchical context (if enabled)
      if (options.updateContextAfterAnalysis !== false && masterContext) {
        try {
          await this.updateHierarchicalContext(
            options.symbol,
            originalAnalysis,
            contextConfidence,
            options,
            startTime,
            'technical_analysis'
          );
          this.logger.debug(`✅ Hierarchical context updated for ${options.symbol}`);
        } catch (error) {
          this.logger.warn(`⚠️ Failed to update hierarchical context for ${options.symbol}:`, error);
        }
      }

      const executionTime = Date.now() - startTime;
      
      const result: ContextEnhancedAnalysis = {
        originalAnalysis,
        historicalContext: enhancedContext,
        contextConfidence,
        recommendations,
        metadata: {
          analysisTime: new Date(),
          contextDataAge: masterContext ? 
            Date.now() - masterContext.lastUpdated.getTime() : 0,
          totalHistoricalLevels: masterContext?.levels.length || 0,
          totalHistoricalPatterns: masterContext?.patterns.length || 0
        }
      };

      this.logger.info(`✅ Context-aware analysis completed for ${options.symbol} in ${executionTime}ms`);
      return result;

    } catch (error) {
      this.logger.error(`❌ Context-aware analysis failed for ${options.symbol}:`, error);
      throw error;
    }
  }

  /**
   * Perform complete analysis enhanced with hierarchical context
   */
  async performContextAwareCompleteAnalysis(
    symbol: string,
    investment?: number,
    options: Partial<ContextAwareAnalysisOptions> = {}
  ): Promise<ContextEnhancedAnalysis> {
    const startTime = Date.now();
    const fullOptions: ContextAwareAnalysisOptions = {
      symbol,
      includeHistoricalContext: true,
      updateContextAfterAnalysis: true,
      contextLookbackDays: 30,
      confidenceThreshold: 60,
      ...options
    };

    try {
      this.logger.info(`🔍 Starting context-aware complete analysis for ${symbol}`);
      
      // Load historical context first
      let masterContext: MasterContext | null = null;
      let historicalContext;
      
      try {
      masterContext = await this.engine.hierarchicalContextManager.getMasterContext(symbol);
      if (masterContext) {
      historicalContext = await this.extractRelevantHistoricalContext(
        masterContext, 
          fullOptions
          );
        } else {
          this.logger.debug(`⚠️ No master context found for ${symbol}`);
          historicalContext = null;
        }
      } catch (error) {
        this.logger.warn(`⚠️ Could not load historical context for ${symbol}:`, error);
        historicalContext = null;
      }

      // Perform complete analysis
      const completeAnalysisResponse = await this.engine.getCompleteAnalysis(symbol, investment);
      
      if (!completeAnalysisResponse.success) {
        throw new Error(completeAnalysisResponse.error || 'Complete analysis failed');
      }

      const originalAnalysis = completeAnalysisResponse.data!;

      // Compare with historical context
      let contextConfidence = 50;
      let enhancedContext;

      if (historicalContext && masterContext) {
        enhancedContext = await this.compareWithHistoricalContext(
          originalAnalysis.technicalAnalysis,
          historicalContext,
          masterContext,
          fullOptions
        );
        contextConfidence = enhancedContext.continuityScore;
      }

      // Generate enhanced recommendations
      const recommendations = this.generateContextAwareRecommendations(
        originalAnalysis,
        enhancedContext,
        contextConfidence
      );

      // Update hierarchical context
      if (masterContext) {
        try {
          await this.updateHierarchicalContext(
            symbol,
            originalAnalysis.technicalAnalysis,
            contextConfidence,
            fullOptions,
            startTime,
            'complete_analysis'
          );
        } catch (error) {
          this.logger.warn(`⚠️ Failed to update hierarchical context for ${symbol}:`, error);
        }
      }

      const result: ContextEnhancedAnalysis = {
        originalAnalysis,
        historicalContext: enhancedContext,
        contextConfidence,
        recommendations,
        metadata: {
          analysisTime: new Date(),
          contextDataAge: masterContext ? 
            Date.now() - masterContext.lastUpdated.getTime() : 0,
          totalHistoricalLevels: masterContext?.levels.length || 0,
          totalHistoricalPatterns: masterContext?.patterns.length || 0
        }
      };

      this.logger.info(`✅ Context-aware complete analysis finished for ${symbol}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ Context-aware complete analysis failed for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Extract relevant historical context for current analysis
   */
  private async extractRelevantHistoricalContext(
    masterContext: MasterContext,
    options: ContextAwareAnalysisOptions
  ): Promise<any> {
    const lookbackMs = (options.contextLookbackDays || 30) * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - lookbackMs);

    // Filter recent levels
    const recentLevels = masterContext.levels.filter(level => 
      level.lastSeen > cutoffDate
    );

    // Get current price for proximity analysis
    const ticker = await this.engine.marketDataService.getTicker(options.symbol);
    const currentPrice = ticker.lastPrice;

    // Find levels nearby current price (within 5%)
    const keyLevelsNearby = recentLevels.filter(level => {
      const distance = Math.abs(level.level - currentPrice) / currentPrice * 100;
      return distance <= 5; // Within 5%
    }).sort((a, b) => {
      const distA = Math.abs(a.level - currentPrice);
      const distB = Math.abs(b.level - currentPrice);
      return distA - distB;
    });

    // Filter recent patterns
    const recentPatterns = masterContext.patterns.filter(pattern =>
      pattern.lastOccurrence > cutoffDate
    );

    return {
      keyLevelsNearby,
      recentPatterns,
      marketBias: masterContext.metrics.dominantTrend,
      trendConfidence: masterContext.metrics.trendConfidence,
      avgAnalysisConfidence: masterContext.metrics.keyStatistics.avgAnalysisConfidence,
      totalAnalyses: masterContext.metrics.totalAnalyses
    };
  }

  /**
   * Compare current analysis with historical context
   */
  private async compareWithHistoricalContext(
    currentAnalysis: any,
    historicalContext: any,
    masterContext: MasterContext,
    options: ContextAwareAnalysisOptions
  ): Promise<any> {
    
    // Analyze pattern alignments
    const patternAlignments = this.analyzePatternAlignments(
      currentAnalysis,
      historicalContext
    );

    // Calculate continuity score
    const continuityScore = this.calculateContinuityScore(
      currentAnalysis,
      historicalContext,
      patternAlignments
    );

    // Assess market bias alignment
    const marketBiasAlignment = this.assessMarketBiasAlignment(
      currentAnalysis,
      historicalContext
    );

    // Generate contextual summary
    const summary = this.generateContextualSummary(
      historicalContext,
      patternAlignments,
      continuityScore,
      marketBiasAlignment
    );

    return {
      summary,
      keyLevelsNearby: historicalContext.keyLevelsNearby,
      patternAlignments,
      continuityScore,
      marketBiasAlignment
    };
  }

  /**
   * Analyze how current patterns align with historical patterns
   */
  private analyzePatternAlignments(
    currentAnalysis: any,
    historicalContext: any
  ): Array<{
    historical: string;
    current: string;
    alignment: 'confirmed' | 'divergent' | 'neutral';
    confidence: number;
  }> {
    const alignments = [];

    // Volume trend alignment
    if (currentAnalysis.volume && historicalContext.marketBias) {
      const currentVolumeTrend = currentAnalysis.volume.trend;
      const historicalTrend = historicalContext.marketBias;
      
      let alignment: 'confirmed' | 'divergent' | 'neutral' = 'neutral';
      let confidence = 50;

      if (
        (currentVolumeTrend === 'increasing' && historicalTrend === 'bullish') ||
        (currentVolumeTrend === 'decreasing' && historicalTrend === 'bearish')
      ) {
        alignment = 'confirmed';
        confidence = 75;
      } else if (
        (currentVolumeTrend === 'increasing' && historicalTrend === 'bearish') ||
        (currentVolumeTrend === 'decreasing' && historicalTrend === 'bullish')
      ) {
        alignment = 'divergent';
        confidence = 70;
      }

      alignments.push({
        historical: `Historical bias: ${historicalTrend}`,
        current: `Volume trend: ${currentVolumeTrend}`,
        alignment,
        confidence
      });
    }

    // Volume delta alignment  
    if (currentAnalysis.volumeDelta && historicalContext.marketBias) {
      const currentBias = currentAnalysis.volumeDelta.bias;
      const historicalBias = historicalContext.marketBias;

      let alignment: 'confirmed' | 'divergent' | 'neutral' = 'neutral';
      let confidence = 60;

      if (
        (currentBias === 'buyer' && historicalBias === 'bullish') ||
        (currentBias === 'seller' && historicalBias === 'bearish')
      ) {
        alignment = 'confirmed';
        confidence = 80;
      } else if (
        (currentBias === 'buyer' && historicalBias === 'bearish') ||
        (currentBias === 'seller' && historicalBias === 'bullish')
      ) {
        alignment = 'divergent';
        confidence = 75;
      }

      alignments.push({
        historical: `Historical bias: ${historicalBias}`,
        current: `Volume delta bias: ${currentBias}`,
        alignment,
        confidence
      });
    }

    return alignments;
  }

  /**
   * Calculate continuity score based on historical alignment
   */
  private calculateContinuityScore(
    currentAnalysis: any,
    historicalContext: any,
    patternAlignments: any[]
  ): number {
    let score = 50; // Base neutral score
    
    // Factor in pattern alignments
    const confirmedAlignments = patternAlignments.filter(a => a.alignment === 'confirmed');
    const divergentAlignments = patternAlignments.filter(a => a.alignment === 'divergent');
    
    score += confirmedAlignments.length * 15; // +15 per confirmed alignment
    score -= divergentAlignments.length * 15; // -15 per divergent alignment

    // Factor in historical confidence
    if (historicalContext.avgAnalysisConfidence > 70) {
      score += 10;
    } else if (historicalContext.avgAnalysisConfidence < 50) {
      score -= 10;
    }

    // Factor in number of nearby historical levels
    const nearbyLevelsCount = historicalContext.keyLevelsNearby.length;
    if (nearbyLevelsCount >= 3) {
      score += 10; // Many levels suggest important area
    } else if (nearbyLevelsCount === 0) {
      score -= 5; // No historical levels
    }

    // Factor in total historical analyses
    if (historicalContext.totalAnalyses >= 20) {
      score += 5; // Good historical data
    } else if (historicalContext.totalAnalyses < 5) {
      score -= 10; // Limited historical data
    }

    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
  }

  /**
   * Assess how current market bias aligns with historical trend
   */
  private assessMarketBiasAlignment(
    currentAnalysis: any,
    historicalContext: any
  ): 'aligned' | 'divergent' | 'strengthening' | 'weakening' {
    const historicalBias = historicalContext.marketBias;
    const historicalConfidence = historicalContext.trendConfidence;

    // Determine current market bias from multiple signals
    let currentBullishSignals = 0;
    let currentBearishSignals = 0;

    if (currentAnalysis.volume) {
      if (currentAnalysis.volume.trend === 'increasing') currentBullishSignals++;
      if (currentAnalysis.volume.trend === 'decreasing') currentBearishSignals++;
    }

    if (currentAnalysis.volumeDelta) {
      if (currentAnalysis.volumeDelta.bias === 'buyer') currentBullishSignals++;
      if (currentAnalysis.volumeDelta.bias === 'seller') currentBearishSignals++;
    }

    if (currentAnalysis.supportResistance) {
      const criticalLevel = currentAnalysis.supportResistance.criticalLevel;
      if (criticalLevel) {
        if (criticalLevel.type === 'support' && criticalLevel.priceDistance < 3) {
          currentBullishSignals++;
        } else if (criticalLevel.type === 'resistance' && criticalLevel.priceDistance < 3) {
          currentBearishSignals++;
        }
      }
    }

    const currentBias = currentBullishSignals > currentBearishSignals ? 'bullish' : 
                       currentBearishSignals > currentBullishSignals ? 'bearish' : 'neutral';

    if (currentBias === historicalBias) {
      // Check if strengthening or just aligned
      const signalStrength = Math.abs(currentBullishSignals - currentBearishSignals);
      return signalStrength >= 2 ? 'strengthening' : 'aligned';
    } else if (currentBias === 'neutral') {
      return historicalConfidence > 70 ? 'weakening' : 'aligned';
    } else {
      return 'divergent';
    }
  }

  /**
   * Generate contextual summary for the analysis
   */
  private generateContextualSummary(
    historicalContext: any,
    patternAlignments: any[],
    continuityScore: number,
    marketBiasAlignment: string
  ): string {
    const parts = [];

    // Nearby levels summary
    if (historicalContext.keyLevelsNearby.length > 0) {
      const strongest = historicalContext.keyLevelsNearby[0];
      parts.push(`${historicalContext.keyLevelsNearby.length} historical levels nearby, strongest ${strongest.type} at ${strongest.level.toFixed(4)}`);
    } else {
      parts.push('No significant historical levels nearby');
    }

    // Pattern alignment summary
    const confirmedCount = patternAlignments.filter(a => a.alignment === 'confirmed').length;
    const divergentCount = patternAlignments.filter(a => a.alignment === 'divergent').length;
    
    if (confirmedCount > divergentCount) {
      parts.push(`${confirmedCount} patterns confirm historical trend`);
    } else if (divergentCount > confirmedCount) {
      parts.push(`${divergentCount} patterns diverge from historical trend`);
    } else {
      parts.push('Mixed signals vs historical patterns');
    }

    // Market bias alignment
    parts.push(`Market bias is ${marketBiasAlignment} with historical trend`);

    // Continuity assessment
    if (continuityScore >= 75) {
      parts.push('High continuity with historical analysis');
    } else if (continuityScore >= 55) {
      parts.push('Moderate continuity with historical analysis');
    } else {
      parts.push('Low continuity with historical analysis');
    }

    return parts.join('. ');
  }

  /**
   * Generate context-aware recommendations
   */
  private generateContextAwareRecommendations(
    analysis: any,
    historicalContext: any,
    contextConfidence: number
  ): {
    action: string;
    reason: string;
    confidence: number;
    riskAdjustment: 'increase' | 'decrease' | 'maintain';
  } {
    let action = 'monitor';
    let reason = 'Neutral signals from both current and historical analysis';
    let confidence = contextConfidence;
    let riskAdjustment: 'increase' | 'decrease' | 'maintain' = 'maintain';

    // Assess based on context confidence
    if (contextConfidence >= 75) {
      // High confidence - signals are aligned
      if (historicalContext?.marketBiasAlignment === 'strengthening') {
        action = 'consider_entry';
        reason = 'Current signals strengthen historical trend with high confidence';
        riskAdjustment = 'decrease';
      } else if (historicalContext?.marketBiasAlignment === 'aligned') {
        action = 'monitor_closely';
        reason = 'Current signals align with historical trend';
        riskAdjustment = 'maintain';
      }
    } else if (contextConfidence <= 40) {
      // Low confidence - divergent signals
      if (historicalContext?.marketBiasAlignment === 'divergent') {
        action = 'wait';
        reason = 'Current signals diverge significantly from historical trend';
        riskAdjustment = 'increase';
      } else if (historicalContext?.marketBiasAlignment === 'weakening') {
        action = 'reduce_exposure';
        reason = 'Historical trend is weakening, consider reducing positions';
        riskAdjustment = 'increase';
      }
    }

    // Adjust based on nearby historical levels
    if (historicalContext?.keyLevelsNearby?.length >= 3) {
      reason += '. Multiple historical levels nearby suggest important price area';
      if (action === 'consider_entry') {
        confidence = Math.min(confidence + 10, 95);
      }
    }

    // Adjust based on historical data quality
    if (historicalContext && historicalContext.totalAnalyses < 5) {
      reason += '. Limited historical data - exercise caution';
      riskAdjustment = 'increase';
      confidence = Math.max(confidence - 10, 20);
    }

    return {
      action,
      reason,
      confidence: Math.round(confidence),
      riskAdjustment
    };
  }

  /**
   * Update hierarchical context with new analysis results
   */
  private async updateHierarchicalContext(
    symbol: string,
    analysis: any,
    confidence: number,
    options: ContextAwareAnalysisOptions,
    startTime: number = Date.now(),
    analysisType: string = 'technical_analysis'
  ): Promise<void> {
    try {
      const updateRequest: ContextUpdateRequest = {
        symbol,
        analysis,
        analysisType,
        timeframe: options.timeframe || '60',
        confidence,
        metadata: {
          source: 'contextAwareAnalysisService',
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

      await this.engine.hierarchicalContextManager.updateContext(updateRequest);
      
      this.logger.debug(`Hierarchical context updated for ${symbol} with confidence ${confidence}`);
    } catch (error) {
      this.logger.error(`Failed to update hierarchical context for ${symbol}:`, error);
      throw error;
    }
  }
}
