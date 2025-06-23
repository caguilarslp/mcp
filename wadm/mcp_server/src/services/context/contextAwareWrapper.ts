/**
 * Context-Aware Analysis Wrapper
 * Integrates persistent context with all analysis services
 */

import { globalContext } from './persistentContext.js';
import { Logger } from '../../utils/logger.js';

export class ContextAwareAnalysisWrapper {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('ContextAwareAnalysis');
  }

  /**
   * Wrapper for any analysis function to add context
   */
  async wrapWithContext<T extends { symbol: string; timeframe?: string }>(
    analysisName: string,
    analysisFunction: () => Promise<T>,
    extractSummaryData: (result: T) => any
  ): Promise<T & { historicalContext?: any }> {
    const startTime = Date.now();
    
    // Execute the analysis
    const result = await analysisFunction();
    
    // Get historical context
    const timeframe = result.timeframe || '60';
    const historicalContext = globalContext.getContext(result.symbol, timeframe, 90);
    
    this.logger.info(
      `Context loaded for ${result.symbol}: ${historicalContext.summary?.totalAnalyses || 0} historical analyses`
    );
    
    // Save to context
    const summaryData = extractSummaryData(result);
    await globalContext.addEntry({
      symbol: result.symbol,
      timeframe,
      type: analysisName,
      data: summaryData,
      summary: this.generateSummary(analysisName, result)
    });
    
    // Return enhanced result
    return {
      ...result,
      historicalContext: historicalContext.summary
    };
  }

  /**
   * Get comprehensive market context for a symbol
   */
  async getMarketContext(symbol: string, timeframe: string = '60'): Promise<{
    recentAnalyses: any[];
    keyLevels: number[];
    dominantBias: string;
    confidenceScore: number;
    lastUpdate: Date;
  }> {
    const context = globalContext.getContext(symbol, timeframe, 90);
    
    // Extract key information
    const recentAnalyses = context.daily.slice(-10);
    const keyLevels = context.summary?.historicalKeyLevels || [];
    const dominantBias = context.summary?.dominantHistoricalBias || 'neutral';
    
    // Calculate confidence based on data quantity and consistency
    const confidenceScore = this.calculateContextConfidence(context);
    
    return {
      recentAnalyses,
      keyLevels,
      dominantBias,
      confidenceScore,
      lastUpdate: context.summary?.lastUpdated || new Date()
    };
  }

  /**
   * Merge multiple analysis results with context
   */
  async mergeAnalysesWithContext(
    symbol: string,
    analyses: { type: string; data: any }[]
  ): Promise<{
    symbol: string;
    timestamp: Date;
    analyses: any[];
    unifiedBias: string;
    confidence: number;
    historicalAlignment: number;
  }> {
    const context = globalContext.getContext(symbol, '60', 90);
    
    // Count biases from current analyses
    const biasCount = new Map<string, number>();
    analyses.forEach(analysis => {
      const bias = this.extractBias(analysis);
      if (bias) {
        biasCount.set(bias, (biasCount.get(bias) || 0) + 1);
      }
    });
    
    // Determine unified bias
    let unifiedBias = 'neutral';
    let maxCount = 0;
    biasCount.forEach((count, bias) => {
      if (count > maxCount) {
        maxCount = count;
        unifiedBias = bias;
      }
    });
    
    // Calculate historical alignment
    const historicalBias = context.summary?.dominantHistoricalBias || 'neutral';
    const historicalAlignment = unifiedBias === historicalBias ? 100 : 
                               this.areBiasesCompatible(unifiedBias, historicalBias) ? 50 : 0;
    
    // Calculate overall confidence
    const confidence = this.calculateUnifiedConfidence(
      analyses, 
      historicalAlignment,
      context.summary?.totalAnalyses || 0
    );
    
    return {
      symbol,
      timestamp: new Date(),
      analyses,
      unifiedBias,
      confidence,
      historicalAlignment
    };
  }

  /**
   * Clear old context data (maintenance)
   */
  async performContextMaintenance(): Promise<void> {
    this.logger.info('Performing context maintenance...');
    await globalContext.clearOldData();
    this.logger.info('Context maintenance completed');
  }

  // Private helper methods
  
  private generateSummary(analysisType: string, result: any): string {
    switch (analysisType) {
      case 'technical_analysis':
        return `${result.marketBias || 'neutral'} bias with ${result.confidence || 0}% confidence`;
      case 'volume_analysis':
        return `Volume ${result.trend || 'stable'}, ${result.volumeSpikes?.length || 0} spikes detected`;
      case 'support_resistance':
        return `${result.resistances?.length || 0} resistances, ${result.supports?.length || 0} supports`;
      default:
        return `${analysisType} completed`;
    }
  }

  private calculateContextConfidence(context: any): number {
    const dataPoints = (context.daily?.length || 0) + 
                      (context.weekly?.length || 0) * 5 + 
                      (context.monthly?.length || 0) * 20;
    
    // More data = higher confidence, max at 100 data points
    const dataConfidence = Math.min(dataPoints, 100);
    
    // Check consistency
    const biasDistribution = context.summary?.biasDistribution || {};
    const totalBiases = Object.values(biasDistribution).reduce((sum: number, count: any) => sum + count, 0);
    const dominantBiasCount = Math.max(...Object.values(biasDistribution).map(v => Number(v)), 0);
    const consistency = totalBiases > 0 ? (dominantBiasCount / totalBiases) * 100 : 0;
    
    // Combined confidence
    return Math.round((dataConfidence * 0.6 + consistency * 0.4));
  }

  private extractBias(analysis: { type: string; data: any }): string | null {
    const data = analysis.data;
    
    // Try different bias fields
    if (data.marketBias) return data.marketBias;
    if (data.bias) return data.bias;
    if (data.trend) return data.trend;
    if (data.signal) return data.signal;
    
    return null;
  }

  private areBiasesCompatible(bias1: string, bias2: string): boolean {
    const bullishTerms = ['bullish', 'long', 'buy', 'uptrend', 'strong_buying'];
    const bearishTerms = ['bearish', 'short', 'sell', 'downtrend', 'strong_selling'];
    
    const isBias1Bullish = bullishTerms.some(term => bias1.toLowerCase().includes(term));
    const isBias1Bearish = bearishTerms.some(term => bias1.toLowerCase().includes(term));
    
    const isBias2Bullish = bullishTerms.some(term => bias2.toLowerCase().includes(term));
    const isBias2Bearish = bearishTerms.some(term => bias2.toLowerCase().includes(term));
    
    // Compatible if both bullish or both bearish
    return (isBias1Bullish && isBias2Bullish) || (isBias1Bearish && isBias2Bearish);
  }

  private calculateUnifiedConfidence(
    analyses: any[], 
    historicalAlignment: number,
    historicalDataPoints: number
  ): number {
    // Extract individual confidences
    const confidences = analyses
      .map(a => a.data.confidence || a.data.strength || 50)
      .filter(c => typeof c === 'number');
    
    // Average confidence from current analyses
    const avgConfidence = confidences.length > 0 ? 
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 50;
    
    // Weight based on historical data
    const historicalWeight = Math.min(historicalDataPoints / 100, 0.3); // Max 30% weight
    
    // Combined confidence
    const combined = avgConfidence * (1 - historicalWeight) + 
                    historicalAlignment * historicalWeight;
    
    return Math.round(Math.max(0, Math.min(100, combined)));
  }
}

// Export singleton instance
export const contextAwareAnalysis = new ContextAwareAnalysisWrapper();
