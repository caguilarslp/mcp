/**
 * @fileoverview Advanced Multi-Exchange MCP Handlers - TASK-026 FASE 4
 * @description Handlers for advanced multi-exchange features
 * @version 1.0.0
 */

import { 
  AdvancedMultiExchangeService,
  LiquidationCascade,
  AdvancedDivergence,
  EnhancedArbitrage,
  ExtendedExchangeDominance,
  CrossExchangeMarketStructure
} from '../../services/multiExchange/advancedMultiExchangeService.js';
import { MarketCategoryType } from '../../types/index.js';
import { ILogger, createLogger } from '../../utils/logger.js';

/**
 * Advanced Multi-Exchange Handlers
 */
export class AdvancedMultiExchangeHandlers {
  private logger: ILogger;
  private service: AdvancedMultiExchangeService;

  constructor(service: AdvancedMultiExchangeService) {
    this.logger = createLogger('AdvancedMultiExchangeHandlers');
    this.service = service;
  }

  /**
   * Handle liquidation cascade prediction
   */
  async handlePredictLiquidationCascade(args: {
    symbol: string;
    category?: MarketCategoryType;
  }): Promise<{
    cascade: LiquidationCascade;
    summary: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
      keyFactors: string[];
      timeToTrigger: string;
    };
  }> {
    try {
      const { symbol, category = 'spot' } = args;
      
      this.logger.info('Predicting liquidation cascade', { symbol, category });
      
      const cascade = await this.service.predictLiquidationCascade(symbol, category);
      
      // Generate summary and recommendations
      const riskLevel = this.determineRiskLevel(cascade);
      const recommendation = this.generateCascadeRecommendation(cascade, riskLevel);
      const keyFactors = this.extractKeyFactors(cascade);
      const timeToTrigger = this.formatTimeToTrigger(cascade);

      return {
        cascade,
        summary: {
          riskLevel,
          recommendation,
          keyFactors,
          timeToTrigger
        }
      };
    } catch (error) {
      this.logger.error('Failed to predict liquidation cascade', { error, args });
      throw error;
    }
  }

  /**
   * Handle advanced divergence detection
   */
  async handleDetectAdvancedDivergences(args: {
    symbol: string;
    category?: MarketCategoryType;
  }): Promise<{
    divergences: AdvancedDivergence[];
    summary: {
      totalDivergences: number;
      byType: { [key: string]: number };
      strongestDivergence: AdvancedDivergence | null;
      tradingOpportunities: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
  }> {
    try {
      const { symbol, category = 'spot' } = args;
      
      this.logger.info('Detecting advanced divergences', { symbol, category });
      
      const divergences = await this.service.detectAdvancedDivergences(symbol, category);
      
      // Generate summary
      const summary = this.generateDivergenceSummary(divergences);

      return {
        divergences,
        summary
      };
    } catch (error) {
      this.logger.error('Failed to detect advanced divergences', { error, args });
      throw error;
    }
  }

  /**
   * Handle enhanced arbitrage analysis
   */
  async handleAnalyzeEnhancedArbitrage(args: {
    symbol: string;
    category?: MarketCategoryType;
  }): Promise<{
    opportunities: EnhancedArbitrage[];
    summary: {
      totalOpportunities: number;
      byType: { [key: string]: number };
      bestOpportunity: EnhancedArbitrage | null;
      totalPotentialProfit: number;
      averageRiskLevel: string;
      recommendations: string[];
    };
  }> {
    try {
      const { symbol, category = 'spot' } = args;
      
      this.logger.info('Analyzing enhanced arbitrage', { symbol, category });
      
      const opportunities = await this.service.analyzeEnhancedArbitrage(symbol, category);
      
      // Generate summary
      const summary = this.generateArbitrageSummary(opportunities);

      return {
        opportunities,
        summary
      };
    } catch (error) {
      this.logger.error('Failed to analyze enhanced arbitrage', { error, args });
      throw error;
    }
  }

  /**
   * Handle extended dominance analysis
   */
  async handleAnalyzeExtendedDominance(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<{
    dominance: ExtendedExchangeDominance;
    summary: {
      currentLeader: string;
      leadershipStability: 'stable' | 'volatile' | 'changing';
      competitiveInsights: string[];
      tradingImplications: string[];
      nextLeaderPrediction: string;
    };
  }> {
    try {
      const { symbol, timeframe = '1h' } = args;
      
      this.logger.info('Analyzing extended dominance', { symbol, timeframe });
      
      const dominance = await this.service.analyzeExtendedDominance(symbol, timeframe);
      
      // Generate summary
      const summary = this.generateDominanceSummary(dominance);

      return {
        dominance,
        summary
      };
    } catch (error) {
      this.logger.error('Failed to analyze extended dominance', { error, args });
      throw error;
    }
  }

  /**
   * Handle cross-exchange market structure analysis
   */
  async handleAnalyzeCrossExchangeMarketStructure(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<{
    structure: CrossExchangeMarketStructure;
    summary: {
      consensusLevels: number;
      manipulationDetected: boolean;
      structuralHealth: 'healthy' | 'concerning' | 'critical';
      keyLevels: number[];
      tradingRecommendations: string[];
    };
  }> {
    try {
      const { symbol, timeframe = '1h' } = args;
      
      this.logger.info('Analyzing cross-exchange market structure', { symbol, timeframe });
      
      const structure = await this.service.analyzeCrossExchangeMarketStructure(symbol, timeframe);
      
      // Generate summary
      const summary = this.generateStructureSummary(structure);

      return {
        structure,
        summary
      };
    } catch (error) {
      this.logger.error('Failed to analyze cross-exchange market structure', { error, args });
      throw error;
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private determineRiskLevel(cascade: LiquidationCascade): 'low' | 'medium' | 'high' | 'critical' {
    const { probability, impact } = cascade;
    
    if (probability > 80 && impact.priceMovement > 10) return 'critical';
    if (probability > 60 && impact.priceMovement > 5) return 'high';
    if (probability > 40 && impact.priceMovement > 2) return 'medium';
    return 'low';
  }

  private generateCascadeRecommendation(
    cascade: LiquidationCascade, 
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): string {
    const { direction, probability } = cascade;
    
    switch (riskLevel) {
      case 'critical':
        return `URGENT: High probability (${probability}%) ${direction} liquidation cascade expected. Consider reducing positions and setting protective stops.`;
      case 'high':
        return `WARNING: Significant ${direction} liquidation cascade risk detected. Monitor closely and adjust position sizing.`;
      case 'medium':
        return `CAUTION: Moderate ${direction} liquidation cascade potential. Be prepared for increased volatility.`;
      default:
        return `LOW RISK: Minimal liquidation cascade threat. Normal trading conditions expected.`;
    }
  }

  private extractKeyFactors(cascade: LiquidationCascade): string[] {
    return cascade.riskFactors
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(factor => `${factor.factor}: ${factor.description}`);
  }

  private formatTimeToTrigger(cascade: LiquidationCascade): string {
    const duration = cascade.estimatedDuration;
    if (duration < 300) return 'Immediate (< 5 minutes)';
    if (duration < 1800) return 'Short term (5-30 minutes)';
    if (duration < 3600) return 'Medium term (30-60 minutes)';
    return 'Long term (> 1 hour)';
  }

  private generateDivergenceSummary(divergences: AdvancedDivergence[]): {
    totalDivergences: number;
    byType: { [key: string]: number };
    strongestDivergence: AdvancedDivergence | null;
    tradingOpportunities: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const byType: { [key: string]: number } = {};
    let strongestDivergence: AdvancedDivergence | null = null;
    let maxMagnitude = 0;

    // Count by type and find strongest
    for (const div of divergences) {
      byType[div.type] = (byType[div.type] || 0) + 1;
      
      if (div.magnitude > maxMagnitude) {
        maxMagnitude = div.magnitude;
        strongestDivergence = div;
      }
    }

    // Count trading opportunities
    const tradingOpportunities = divergences.filter(d => 
      d.tradingSignal.signal !== 'hold' && d.tradingSignal.strength > 50
    ).length;

    // Determine risk level
    const avgMagnitude = divergences.reduce((sum, d) => sum + d.magnitude, 0) / divergences.length;
    const riskLevel = avgMagnitude > 5 ? 'high' : avgMagnitude > 2 ? 'medium' : 'low';

    return {
      totalDivergences: divergences.length,
      byType,
      strongestDivergence,
      tradingOpportunities,
      riskLevel
    };
  }

  private generateArbitrageSummary(opportunities: EnhancedArbitrage[]): {
    totalOpportunities: number;
    byType: { [key: string]: number };
    bestOpportunity: EnhancedArbitrage | null;
    totalPotentialProfit: number;
    averageRiskLevel: string;
    recommendations: string[];
  } {
    const byType: { [key: string]: number } = {};
    let bestOpportunity: EnhancedArbitrage | null = null;
    let maxExpectedProfit = 0;

    // Count by type and find best
    for (const opp of opportunities) {
      byType[opp.type] = (byType[opp.type] || 0) + 1;
      
      if (opp.profitability.expected > maxExpectedProfit) {
        maxExpectedProfit = opp.profitability.expected;
        bestOpportunity = opp;
      }
    }

    // Calculate totals
    const totalPotentialProfit = opportunities.reduce((sum, opp) => 
      sum + opp.profitability.expected, 0
    );

    // Determine average risk level
    const riskLevels = opportunities.map(opp => opp.risks.regulatory);
    const highRisk = riskLevels.filter(r => r === 'high').length;
    const mediumRisk = riskLevels.filter(r => r === 'medium').length;
    
    let averageRiskLevel = 'low';
    if (highRisk > opportunities.length / 2) averageRiskLevel = 'high';
    else if (mediumRisk > opportunities.length / 2) averageRiskLevel = 'medium';

    // Generate recommendations
    const recommendations: string[] = [];
    if (opportunities.length > 0) {
      recommendations.push(`${opportunities.length} arbitrage opportunities detected`);
      if (bestOpportunity) {
        recommendations.push(`Best opportunity: ${bestOpportunity.type} with ${bestOpportunity.profitability.expected.toFixed(2)}% expected return`);
      }
      if (averageRiskLevel === 'high') {
        recommendations.push('High risk environment - proceed with caution');
      }
    } else {
      recommendations.push('No significant arbitrage opportunities detected');
    }

    return {
      totalOpportunities: opportunities.length,
      byType,
      bestOpportunity,
      totalPotentialProfit,
      averageRiskLevel,
      recommendations
    };
  }

  private generateDominanceSummary(dominance: ExtendedExchangeDominance): {
    currentLeader: string;
    leadershipStability: 'stable' | 'volatile' | 'changing';
    competitiveInsights: string[];
    tradingImplications: string[];
    nextLeaderPrediction: string;
  } {
    // Find current leader based on overall metrics
    const exchanges = Object.keys(dominance.dominanceMetrics);
    let currentLeader = exchanges[0];
    let maxScore = 0;

    for (const exchange of exchanges) {
      const metrics = dominance.dominanceMetrics[exchange];
      const score = (metrics.priceLeadership + metrics.volumeLeadership + metrics.liquidityDominance) / 3;
      if (score > maxScore) {
        maxScore = score;
        currentLeader = exchange;
      }
    }

    // Determine stability
    const volatility = dominance.marketDynamics.leadershipRotation.volatility;
    const leadershipStability: 'stable' | 'volatile' | 'changing' = 
      volatility < 0.3 ? 'stable' : volatility < 0.7 ? 'volatile' : 'changing';

    // Generate insights
    const competitiveInsights: string[] = [
      `Price discovery efficiency: ${dominance.marketDynamics.competitiveMetrics.priceDiscovery.toFixed(1)}%`,
      `Execution quality: ${dominance.marketDynamics.competitiveMetrics.executionQuality.toFixed(1)}%`,
      `Product innovation index: ${dominance.marketDynamics.competitiveMetrics.productInnovation.toFixed(1)}%`
    ];

    // Trading implications
    const tradingImplications: string[] = [
      `${currentLeader} currently leads the market`,
      `Leadership ${leadershipStability} - ${leadershipStability === 'stable' ? 'predictable conditions' : 'monitor for changes'}`,
      ...dominance.marketDynamics.flowPatterns.institutionalFlow.map(flow => `Institutional flow: ${flow}`)
    ];

    // Next leader prediction
    const nextLeaderPrediction = `${dominance.predictions.nextLeader.exchange} (${dominance.predictions.nextLeader.probability}% probability in ${Math.round(dominance.predictions.nextLeader.timeframe / 60)} minutes)`;

    return {
      currentLeader,
      leadershipStability,
      competitiveInsights,
      tradingImplications,
      nextLeaderPrediction
    };
  }

  private generateStructureSummary(structure: CrossExchangeMarketStructure): {
    consensusLevels: number;
    manipulationDetected: boolean;
    structuralHealth: 'healthy' | 'concerning' | 'critical';
    keyLevels: number[];
    tradingRecommendations: string[];
  } {
    const consensusLevels = structure.consensusLevels.length;
    const manipulationDetected = structure.manipulation.some(m => m.detected);
    
    // Determine structural health
    let structuralHealth: 'healthy' | 'concerning' | 'critical' = 'healthy';
    if (manipulationDetected) {
      const highConfidenceManipulation = structure.manipulation.some(m => m.confidence > 80);
      structuralHealth = highConfidenceManipulation ? 'critical' : 'concerning';
    }

    // Extract key levels
    const keyLevels = structure.consensusLevels
      .sort((a, b) => b.consensus - a.consensus)
      .slice(0, 5)
      .map(level => level.level);

    // Generate recommendations
    const tradingRecommendations: string[] = [];
    
    if (consensusLevels > 0) {
      tradingRecommendations.push(`${consensusLevels} consensus levels identified across exchanges`);
    }
    
    if (manipulationDetected) {
      const manipulationType = structure.manipulation.find(m => m.detected)?.type;
      tradingRecommendations.push(`⚠️ ${manipulationType} manipulation detected - exercise caution`);
    }
    
    if (keyLevels.length > 0) {
      tradingRecommendations.push(`Key levels to watch: ${keyLevels.map(l => l.toFixed(2)).join(', ')}`);
    }
    
    if (structure.institutionalLevels.accumulation.length > 0) {
      tradingRecommendations.push('Institutional accumulation zones identified');
    }

    return {
      consensusLevels,
      manipulationDetected,
      structuralHealth,
      keyLevels,
      tradingRecommendations
    };
  }
}

// Handler functions for MCP integration
export const predictLiquidationCascade = (service: AdvancedMultiExchangeService) => {
  const handlers = new AdvancedMultiExchangeHandlers(service);
  return (args: any) => handlers.handlePredictLiquidationCascade(args);
};

export const detectAdvancedDivergences = (service: AdvancedMultiExchangeService) => {
  const handlers = new AdvancedMultiExchangeHandlers(service);
  return (args: any) => handlers.handleDetectAdvancedDivergences(args);
};

export const analyzeEnhancedArbitrage = (service: AdvancedMultiExchangeService) => {
  const handlers = new AdvancedMultiExchangeHandlers(service);
  return (args: any) => handlers.handleAnalyzeEnhancedArbitrage(args);
};

export const analyzeExtendedDominance = (service: AdvancedMultiExchangeService) => {
  const handlers = new AdvancedMultiExchangeHandlers(service);
  return (args: any) => handlers.handleAnalyzeExtendedDominance(args);
};

export const analyzeCrossExchangeMarketStructure = (service: AdvancedMultiExchangeService) => {
  const handlers = new AdvancedMultiExchangeHandlers(service);
  return (args: any) => handlers.handleAnalyzeCrossExchangeMarketStructure(args);
};
