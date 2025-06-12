/**
 * @fileoverview Smart Money Concepts MCP Handlers
 * @description MCP tool handlers for Smart Money Concepts analysis
 * @version 1.0.0 
 * @author Smart Money Concepts Team
 */

import { MCPServerResponse, ToolValidationResult, IMarketDataService, IAnalysisService, FairValueGap, MarketStructureAnalysis, StructureShiftValidation, MarketStructurePoint } from '../../types/index.js';
import { OrderBlocksService, OrderBlockAnalysis, OrderBlock } from '../../services/smartMoney/orderBlocks.js';
import { FairValueGapsService, FVGAnalysis, FVGStatistics } from '../../services/smartMoney/fairValueGaps.js';
import { BreakOfStructureService, StructuralBreak } from '../../services/smartMoney/breakOfStructure.js';

export class SmartMoneyConceptsHandlers {
  private orderBlocksService: OrderBlocksService;
  private fairValueGapsService: FairValueGapsService;
  private breakOfStructureService: BreakOfStructureService;
  private marketDataService: IMarketDataService;
  private analysisService: IAnalysisService;
  private smartMoneyAnalysisService: any;

  constructor(
    marketDataService: IMarketDataService,
    analysisService: IAnalysisService
  ) {
    this.marketDataService = marketDataService;
    this.analysisService = analysisService;
    this.orderBlocksService = new OrderBlocksService(
      marketDataService,
      analysisService
    );
    this.fairValueGapsService = new FairValueGapsService(
      marketDataService,
      analysisService
    );
    this.breakOfStructureService = new BreakOfStructureService();
  }

  // ====================
  // ORDER BLOCKS HANDLERS
  // ====================

  async handleDetectOrderBlocks(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
    minStrength?: number;
    includeBreakers?: boolean;
  }): Promise<MCPServerResponse> {
    try {
      const validation = this.validateDetectOrderBlocksArgs(args);
      if (!validation.isValid) {
        return {
          error: `Validation failed: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }

      const {
        symbol,
        timeframe = '60',
        lookback = 100,
        minStrength = 70,
        includeBreakers = true
      } = args;

      const analysis = await this.orderBlocksService.detectOrderBlocks(
        symbol,
        timeframe,
        lookback,
        minStrength,
        includeBreakers
      );

      const response = this.formatOrderBlockAnalysis(analysis);

      return {
        analysis: response,
        summary: this.generateOrderBlockSummary(analysis),
        metadata: {
          symbol,
          timeframe,
          totalActiveBlocks: analysis.activeBlocks.length,
          totalBreakerBlocks: analysis.breakerBlocks.length,
          marketBias: analysis.marketBias,
          strongestBlockStrength: analysis.strongestBlock?.strength || 0,
          timestamp: analysis.timestamp
        }
      };

    } catch (error) {
      return {
        error: `Order Blocks detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async handleValidateOrderBlock(args: {
    symbol: string;
    orderBlockId: string;
    storedBlocks: OrderBlock[];
  }): Promise<MCPServerResponse> {
    try {
      if (!args.symbol || !args.orderBlockId || !args.storedBlocks) {
        return {
          error: 'Missing required parameters: symbol, orderBlockId, storedBlocks',
          timestamp: new Date().toISOString()
        };
      }

      const { symbol, orderBlockId, storedBlocks } = args;

      const validationResult = await this.orderBlocksService.validateOrderBlock(
        symbol,
        orderBlockId,
        storedBlocks
      );

      return {
        validation: {
          valid: validationResult.valid,
          orderBlockId,
          reason: validationResult.reason,
          updatedBlock: validationResult.block ? this.formatOrderBlock(validationResult.block) : null
        },
        recommendation: this.generateValidationRecommendation(validationResult),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `Order Block validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async handleGetOrderBlockZones(args: {
    symbol: string;
    activeBlocks: OrderBlock[];
  }): Promise<MCPServerResponse> {
    try {
      if (!args.symbol || !args.activeBlocks) {
        return {
          error: 'Missing required parameters: symbol, activeBlocks',
          timestamp: new Date().toISOString()
        };
      }

      const { symbol, activeBlocks } = args;

      const ticker = await this.marketDataService.getTicker(symbol);
      const currentPrice = ticker.lastPrice;

      const zones = this.orderBlocksService.getOrderBlockZones(activeBlocks, currentPrice);

      return {
        zones: {
          strong: zones.strong.map((block: OrderBlock) => this.formatOrderBlockForZone(block, currentPrice)),
          medium: zones.medium.map((block: OrderBlock) => this.formatOrderBlockForZone(block, currentPrice)),
          weak: zones.weak.map((block: OrderBlock) => this.formatOrderBlockForZone(block, currentPrice)),
          nearby: zones.nearby.map((block: OrderBlock) => this.formatOrderBlockForZone(block, currentPrice))
        },
        currentPrice,
        statistics: {
          totalBlocks: activeBlocks.length,
          strongBlocks: zones.strong.length,
          mediumBlocks: zones.medium.length,
          weakBlocks: zones.weak.length,
          nearbyBlocks: zones.nearby.length,
          averageStrength: this.calculateAverageStrength(activeBlocks)
        },
        recommendations: this.generateZoneRecommendations(zones, currentPrice),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `Order Block zones analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ====================
  // FAIR VALUE GAPS HANDLERS
  // ====================

  async handleFindFairValueGaps(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
  }): Promise<MCPServerResponse> {
    try {
      const validation = this.validateFVGArgs(args);
      if (!validation.isValid) {
        return {
          error: `Validation failed: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }

      const {
        symbol,
        timeframe = '60',
        lookback = 100
      } = args;

      const analysis = await this.fairValueGapsService.findFairValueGaps(
        symbol,
        timeframe,
        lookback
      );

      const response = this.formatFVGAnalysis(analysis);

      return {
        analysis: response,
        summary: this.generateFVGSummary(analysis),
        metadata: {
          symbol,
          timeframe,
          totalOpenGaps: analysis.openGaps.length,
          totalFilledGaps: analysis.filledGaps.length,
          fillRate: analysis.statistics.fillRate,
          marketImbalance: analysis.marketImbalance.netImbalance,
          timestamp: analysis.timestamp.toISOString()
        }
      };

    } catch (error) {
      return {
        error: `Fair Value Gaps detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async handleAnalyzeFVGFilling(args: {
    symbol: string;
    timeframe?: string;
    lookbackDays?: number;
  }): Promise<MCPServerResponse> {
    try {
      if (!args.symbol || typeof args.symbol !== 'string') {
        return {
          error: 'symbol is required and must be a string',
          timestamp: new Date().toISOString()
        };
      }

      const {
        symbol,
        timeframe = '60',
        lookbackDays = 30
      } = args;

      const statistics = await this.fairValueGapsService.analyzeFVGFilling(
        symbol,
        timeframe,
        lookbackDays
      );

      const response = this.formatFVGStatistics(statistics);

      return {
        statistics: response,
        summary: this.generateFVGStatisticsSummary(statistics),
        insights: this.generateFVGInsights(statistics),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `FVG filling analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ====================
  // BREAK OF STRUCTURE HANDLERS
  // ====================

  async handleDetectBreakOfStructure(args: {
    symbol: string;
    timeframe?: string;
    lookback?: number;
  }): Promise<MCPServerResponse> {
    try {
      const validation = this.validateBOSArgs(args);
      if (!validation.isValid) {
        return {
          error: `Validation failed: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }

      const {
        symbol,
        timeframe = '60',
        lookback = 100
      } = args;

      const analysis = await this.breakOfStructureService.detectBreakOfStructure(
        symbol,
        timeframe,
        lookback
      );

      const response = this.formatMarketStructureAnalysis(analysis);

      return {
        analysis: response,
        summary: this.generateBOSSummary(analysis),
        metadata: {
          symbol,
          timeframe,
          totalActiveBreaks: analysis.activeBreaks.length,
          totalRecentBreaks: analysis.recentBreaks.length,
          marketBias: analysis.marketBias.direction,
          biasStrength: analysis.marketBias.strength,
          currentStructureType: analysis.currentStructure.type,
          tradingOpportunities: analysis.tradingOpportunities.length,
          timestamp: analysis.timestamp.toISOString()
        }
      };

    } catch (error) {
      return {
        error: `Break of Structure detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async handleAnalyzeMarketStructure(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<MCPServerResponse> {
    try {
      if (!args.symbol || typeof args.symbol !== 'string') {
        return {
          error: 'symbol is required and must be a string',
          timestamp: new Date().toISOString()
        };
      }

      const {
        symbol,
        timeframe = '60'
      } = args;

      const analysis = await this.breakOfStructureService.analyzeMarketStructure(
        symbol,
        timeframe
      );

      const response = this.formatMarketStructureAnalysis(analysis);

      return {
        marketStructure: response,
        summary: this.generateMarketStructureSummary(analysis),
        keyInsights: this.generateMarketStructureInsights(analysis),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `Market structure analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async handleValidateStructureShift(args: {
    symbol: string;
    breakId: string;
  }): Promise<MCPServerResponse> {
    try {
      if (!args.symbol || !args.breakId) {
        return {
          error: 'Missing required parameters: symbol, breakId',
          timestamp: new Date().toISOString()
        };
      }

      const { symbol, breakId } = args;

      const validation = await this.breakOfStructureService.validateStructureShift(
        symbol,
        breakId
      );

      const response = this.formatStructureShiftValidation(validation);

      return {
        validation: response,
        summary: this.generateValidationSummary(validation),
        recommendations: this.generateStructureValidationRecommendations(validation),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `Structure shift validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ====================
  // SMART MONEY INTEGRATION HANDLERS
  // ====================
  // NOTE: These handlers are now moved to smartMoneyAnalysisHandlers.ts
  // They are imported and used through the router system

  // ====================
  // VALIDATION METHODS
  // ====================

  private validateDetectOrderBlocksArgs(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.timeframe && !['5', '15', '30', '60', '240'].includes(args.timeframe)) {
      errors.push('timeframe must be one of: 5, 15, 30, 60, 240');
    }

    if (args.lookback && (typeof args.lookback !== 'number' || args.lookback < 50 || args.lookback > 500)) {
      errors.push('lookback must be a number between 50 and 500');
    }

    if (args.minStrength && (typeof args.minStrength !== 'number' || args.minStrength < 0 || args.minStrength > 100)) {
      errors.push('minStrength must be a number between 0 and 100');
    }

    if (args.includeBreakers && typeof args.includeBreakers !== 'boolean') {
      errors.push('includeBreakers must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateFVGArgs(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.timeframe && !['5', '15', '30', '60', '240'].includes(args.timeframe)) {
      errors.push('timeframe must be one of: 5, 15, 30, 60, 240');
    }

    if (args.lookback && (typeof args.lookback !== 'number' || args.lookback < 50 || args.lookback > 500)) {
      errors.push('lookback must be a number between 50 and 500');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateBOSArgs(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.timeframe && !['5', '15', '30', '60', '240'].includes(args.timeframe)) {
      errors.push('timeframe must be one of: 5, 15, 30, 60, 240');
    }

    if (args.lookback && (typeof args.lookback !== 'number' || args.lookback < 50 || args.lookback > 200)) {
      errors.push('lookback must be a number between 50 and 200');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateSmartMoneyArgs(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.timeframe && !['5', '15', '30', '60', '240'].includes(args.timeframe)) {
      errors.push('timeframe must be one of: 5, 15, 30, 60, 240');
    }

    if (args.lookback && (typeof args.lookback !== 'number' || args.lookback < 50 || args.lookback > 500)) {
      errors.push('lookback must be a number between 50 and 500');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ====================
  // HELPER METHODS (Order Blocks)
  // ====================

  private formatOrderBlockAnalysis(analysis: OrderBlockAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      currentPrice: analysis.currentPrice,
      activeBlocks: analysis.activeBlocks.map(block => this.formatOrderBlock(block)),
      breakerBlocks: analysis.breakerBlocks.map(block => this.formatOrderBlock(block)),
      marketBias: analysis.marketBias,
      keyLevels: analysis.keyLevels,
      statistics: analysis.statistics,
      strongestBlock: analysis.strongestBlock ? this.formatOrderBlock(analysis.strongestBlock) : null,
      tradingRecommendation: analysis.tradingRecommendation
    };
  }

  private generateOrderBlockSummary(analysis: OrderBlockAnalysis): any {
    const strongBlocks = analysis.activeBlocks.filter(block => block.strength >= 80);
    const nearPrice = analysis.activeBlocks.filter(block => {
      const distance = Math.abs(block.zone.midpoint - analysis.currentPrice) / analysis.currentPrice * 100;
      return distance <= 2; // Within 2%
    });

    return {
      totalBlocks: analysis.activeBlocks.length,
      strongBlocks: strongBlocks.length,
      nearPriceBlocks: nearPrice.length,
      marketBias: analysis.marketBias,
      dominantType: this.getDominantBlockType(analysis.activeBlocks),
      nextKeyLevel: this.getNextKeyLevel(analysis.activeBlocks, analysis.currentPrice),
      tradingOpportunity: this.assessOrderBlockOpportunity(analysis)
    };
  }

  private formatOrderBlock(block: OrderBlock): any {
    return {
      id: block.id,
      type: block.type,
      zone: {
        upper: Number(block.zone.upper.toFixed(4)),
        lower: Number(block.zone.lower.toFixed(4)),
        midpoint: Number(block.zone.midpoint.toFixed(4))
      },
      strength: Number(block.strength.toFixed(1)),
      validity: block.validity,
      respectCount: block.respectCount,
      createdAt: block.createdAt,
      lastTestedAt: block.lastTest,
      currentDistance: Number(block.currentDistance.toFixed(2)),
      institutionalSignals: {
        volumeMultiplier: Number(block.institutionalSignals.volumeMultiplier.toFixed(2)),
        orderFlowImbalance: Number(block.institutionalSignals.orderFlowImbalance.toFixed(2)),
        absorptionLevel: Number(block.institutionalSignals.absorptionLevel.toFixed(2))
      }
    };
  }

  private generateValidationRecommendation(validationResult: any): any {
    return {
      action: validationResult.valid ? 'monitor' : 'remove',
      reason: validationResult.reason,
      confidence: validationResult.confidence || 0,
      nextCheck: validationResult.nextCheck,
      tradingRelevance: validationResult.valid ? 'high' : 'low'
    };
  }

  private formatOrderBlockForZone(block: OrderBlock, currentPrice: number): any {
    const distance = Math.abs(block.zone.midpoint - currentPrice) / currentPrice * 100;
    
    return {
      ...this.formatOrderBlock(block),
      distanceFromPrice: Number(distance.toFixed(2)),
      priceRelation: block.zone.midpoint > currentPrice ? 'above' : 'below',
      priority: this.calculateBlockPriority(block, distance)
    };
  }

  private calculateAverageStrength(blocks: OrderBlock[]): number {
    if (blocks.length === 0) return 0;
    const totalStrength = blocks.reduce((sum, block) => sum + block.strength, 0);
    return Number((totalStrength / blocks.length).toFixed(1));
  }

  private generateZoneRecommendations(zones: any, currentPrice: number): any {
    const recommendations = [];
    
    if (zones.strong.length > 0) {
      const nearestStrong = zones.strong[0];
      recommendations.push({
        type: 'strong_level_watch',
        level: nearestStrong.zone.midpoint,
        action: nearestStrong.zone.midpoint > currentPrice ? 'watch_resistance' : 'watch_support',
        priority: 'high'
      });
    }
    
    if (zones.nearby.length > 0) {
      recommendations.push({
        type: 'immediate_reaction',
        count: zones.nearby.length,
        action: 'expect_price_reaction',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  // ====================
  // HELPER METHODS (Fair Value Gaps)
  // ====================

  private formatFVGAnalysis(analysis: FVGAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      currentPrice: analysis.currentPrice,
      openGaps: analysis.openGaps.map(gap => this.formatFairValueGap(gap)),
      filledGaps: analysis.filledGaps.slice(-10).map(gap => this.formatFairValueGap(gap)), // Last 10
      nearestGap: analysis.nearestGap ? this.formatFairValueGap(analysis.nearestGap) : null,
      statistics: analysis.statistics,
      marketImbalance: analysis.marketImbalance,
      tradingOpportunities: analysis.tradingOpportunities.slice(0, 5) // Top 5
    };
  }

  private generateFVGSummary(analysis: FVGAnalysis): any {
    const highProbabilityGaps = analysis.openGaps.filter(gap => gap.probability.fill >= 70);
    const nearbyGaps = analysis.openGaps.filter(gap => {
      const distance = Math.abs(gap.gap.midpoint - analysis.currentPrice) / analysis.currentPrice * 100;
      return distance <= 3; // Within 3%
    });

    return {
      totalOpenGaps: analysis.openGaps.length,
      highProbabilityGaps: highProbabilityGaps.length,
      nearbyGaps: nearbyGaps.length,
      fillRate: Number(analysis.statistics.fillRate.toFixed(1)),
      avgFillTime: Number(analysis.statistics.avgFillTime.toFixed(0)),
      marketImbalance: analysis.marketImbalance.netImbalance,
      imbalanceStrength: Number(analysis.marketImbalance.strength.toFixed(1)),
      bestOpportunity: analysis.tradingOpportunities[0] || null
    };
  }

  private formatFairValueGap(gap: FairValueGap): any {
    return {
      id: gap.id,
      type: gap.type,
      gap: {
        upper: Number(gap.gap.upper.toFixed(4)),
        lower: Number(gap.gap.lower.toFixed(4)),
        midpoint: Number(gap.gap.midpoint.toFixed(4)),
        size: Number(gap.gap.size.toFixed(4)),
        sizePercent: Number(gap.gap.sizePercent.toFixed(2))
      },
      status: gap.status,
      context: {
        trendDirection: gap.context.trendDirection,
        impulsiveMove: gap.context.impulsiveMove,
        significance: gap.context.significance
      },
      filling: {
        fillProgress: Number(gap.filling.fillProgress.toFixed(1)),
        firstTouch: gap.filling.firstTouch?.toISOString(),
        fullFillTime: gap.filling.fullFillTime?.toISOString()
      },
      probability: {
        fill: Number(gap.probability.fill.toFixed(1)),
        timeToFill: Number(gap.probability.timeToFill.toFixed(0)),
        confidence: Number(gap.probability.confidence.toFixed(1))
      },
      createdAt: gap.createdAt.toISOString()
    };
  }

  private formatFVGStatistics(statistics: FVGStatistics): any {
    return {
      symbol: statistics.symbol,
      period: statistics.period,
      totalGaps: statistics.totalGaps,
      fillStatistics: {
        filled: statistics.fillStatistics.filled,
        partially: statistics.fillStatistics.partially,
        unfilled: statistics.fillStatistics.unfilled,
        fillRate: Number(statistics.fillStatistics.fillRate.toFixed(1)),
        avgTimeToFill: Number(statistics.fillStatistics.avgTimeToFill.toFixed(0)),
        fastestFill: Number(statistics.fillStatistics.fastestFill.toFixed(0)),
        slowestFill: Number(statistics.fillStatistics.slowestFill.toFixed(0))
      },
      sizeDistribution: {
        small: statistics.sizeDistribution.small,
        medium: statistics.sizeDistribution.medium,
        large: statistics.sizeDistribution.large,
        avgSize: Number(statistics.sizeDistribution.avgSize.toFixed(4))
      },
      performance: {
        accuracy: Number(statistics.performance.accuracy.toFixed(1)),
        profitability: Number(statistics.performance.profitability.toFixed(1)),
        sharpeRatio: Number(statistics.performance.sharpeRatio.toFixed(2)),
        maxDrawdown: Number(statistics.performance.maxDrawdown.toFixed(1))
      }
    };
  }

  private generateFVGStatisticsSummary(statistics: FVGStatistics): any {
    return {
      overallPerformance: this.categorizePerformance(statistics.performance.accuracy),
      fillRateCategory: this.categorizeFillRate(statistics.fillStatistics.fillRate),
      avgFillTimeHours: Number((statistics.fillStatistics.avgTimeToFill / 60).toFixed(1)),
      bestSizeCategory: this.getBestSizeCategory(statistics.sizeDistribution),
      tradingRecommendation: this.generateFVGTradingRecommendation(statistics)
    };
  }

  private generateFVGInsights(statistics: FVGStatistics): string[] {
    const insights = [];
    
    if (statistics.fillStatistics.fillRate > 80) {
      insights.push('High fill rate suggests strong gap-filling tendency');
    }
    
    if (statistics.fillStatistics.avgTimeToFill < 240) { // Less than 4 hours
      insights.push('Gaps typically fill quickly - good for short-term trading');
    }
    
    if (statistics.performance.accuracy > 70) {
      insights.push('Gap analysis shows good predictive accuracy');
    }
    
    if (statistics.sizeDistribution.large > statistics.sizeDistribution.small) {
      insights.push('Larger gaps are more common - focus on significant imbalances');
    }
    
    return insights;
  }

  // ====================
  // HELPER METHODS (Break of Structure)
  // ====================

  private formatMarketStructureAnalysis(analysis: MarketStructureAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      currentPrice: analysis.currentPrice,
      trend: analysis.trend,
      structurePoints: analysis.structurePoints.map(point => this.formatStructurePoint(point)),
      activeBreaks: analysis.activeBreaks.map(breakItem => this.formatStructuralBreak(breakItem)),
      recentBreaks: analysis.recentBreaks.slice(-5).map(breakItem => this.formatStructuralBreak(breakItem)),
      currentStructure: analysis.currentStructure,
      marketBias: analysis.marketBias,
      nextDecisionPoints: analysis.nexteDecisionPoints?.slice(0, 3) || [],
      tradingOpportunities: analysis.tradingOpportunities.slice(0, 3)
    };
  }

  private generateBOSSummary(analysis: MarketStructureAnalysis): any {
    const recentBOS = analysis.activeBreaks.filter(b => b.type === 'BOS').length;
    const recentCHoCH = analysis.activeBreaks.filter(b => b.type === 'CHoCH').length;
    
    return {
      overallTrend: this.getOverallTrend(analysis.trend),
      structureStrength: Number(analysis.currentStructure.strength.toFixed(1)),
      activeBreaks: analysis.activeBreaks.length,
      recentBOS,
      recentCHoCH,
      marketBias: analysis.marketBias.direction,
      biasConfidence: Number(analysis.marketBias.confidence.toFixed(1)),
      tradingOpportunities: analysis.tradingOpportunities.length,
      nextMajorLevel: this.getNextMajorLevel(analysis)
    };
  }

  private generateMarketStructureSummary(analysis: MarketStructureAnalysis): any {
    return this.generateBOSSummary(analysis);
  }

  private generateMarketStructureInsights(analysis: MarketStructureAnalysis): string[] {
    const insights = [];
    
    if (analysis.marketBias.confidence > 80) {
      insights.push(`Strong ${analysis.marketBias.direction} bias with high confidence`);
    }
    
    if (analysis.activeBreaks.length > 3) {
      insights.push('Multiple active breaks suggest volatile market conditions');
    }
    
    if (analysis.currentStructure.strength > 80) {
      insights.push('Current structure is very strong and reliable');
    }
    
    if (analysis.tradingOpportunities.length > 0) {
      const bestOpp = analysis.tradingOpportunities[0];
      insights.push(`Best opportunity: ${bestOpp.type} ${bestOpp.direction} with ${bestOpp.confidence.toFixed(0)}% confidence`);
    }
    
    return insights;
  }

  private formatStructureShiftValidation(validation: StructureShiftValidation): any {
    return {
      isValid: validation.isValid,
      confidence: Number(validation.confidence.toFixed(1)),
      factors: {
        volumeConfirmation: Number(validation.factors.volumeConfirmation.toFixed(1)),
        priceAction: Number(validation.factors.priceAction.toFixed(1)),
        institutionalSignals: Number(validation.factors.institutionalSignals.toFixed(1)),
        timeConfirmation: Number(validation.factors.timeConfirmation.toFixed(1)),
        structuralIntegrity: Number(validation.factors.structuralIntegrity.toFixed(1))
      },
      warnings: validation.warnings,
      nextValidationTime: validation.nextValidationTime?.toISOString(),
      invalidationScenarios: validation.invalidationScenarios.slice(0, 3)
    };
  }

  private generateValidationSummary(validation: StructureShiftValidation): any {
    const avgFactor = (validation.factors.volumeConfirmation + 
                      validation.factors.priceAction + 
                      validation.factors.institutionalSignals + 
                      validation.factors.timeConfirmation + 
                      validation.factors.structuralIntegrity) / 5;
    
    return {
      overallStatus: validation.isValid ? 'valid' : 'invalid',
      confidence: Number(validation.confidence.toFixed(1)),
      averageFactorScore: Number(avgFactor.toFixed(1)),
      strongestFactor: this.getStrongestFactor(validation.factors),
      weakestFactor: this.getWeakestFactor(validation.factors),
      warningsCount: validation.warnings.length,
      riskLevel: this.assessValidationRisk(validation)
    };
  }

  private generateStructureValidationRecommendations(validation: StructureShiftValidation): any[] {
    const recommendations = [];
    
    if (validation.isValid && validation.confidence > 80) {
      recommendations.push({
        action: 'proceed_with_trading',
        reason: 'High confidence validation',
        priority: 'high'
      });
    } else if (validation.isValid && validation.confidence < 60) {
      recommendations.push({
        action: 'wait_for_confirmation',
        reason: 'Low confidence requires more confirmation',
        priority: 'medium'
      });
    }
    
    if (validation.warnings.length > 2) {
      recommendations.push({
        action: 'reduce_position_size',
        reason: 'Multiple warnings suggest higher risk',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  // ====================
  // UTILITY HELPER METHODS
  // ====================

  private formatStructurePoint(point: MarketStructurePoint): any {
    return {
      timestamp: point.timestamp.toISOString(),
      price: Number(point.price.toFixed(4)),
      type: point.type,
      strength: Number(point.strength.toFixed(1)),
      volume: point.volume,
      confirmed: point.confirmed,
      index: point.index
    };
  }

  private formatStructuralBreak(breakItem: StructuralBreak): any {
    return {
      id: breakItem.id,
      type: breakItem.type,
      direction: breakItem.direction,
      breakPoint: {
        timestamp: breakItem.breakPoint.timestamp.toISOString(),
        price: Number(breakItem.breakPoint.price.toFixed(4)),
        volume: breakItem.breakPoint.volume
      },
      significance: breakItem.significance,
      confirmation: breakItem.confirmation,
      targets: {
        conservative: Number(breakItem.targets.conservative.toFixed(4)),
        normal: Number(breakItem.targets.normal.toFixed(4)),
        aggressive: Number(breakItem.targets.aggressive.toFixed(4))
      },
      invalidationLevel: Number(breakItem.invalidationLevel.toFixed(4)),
      probability: Number(breakItem.probability.toFixed(1)),
      createdAt: breakItem.createdAt.toISOString()
    };
  }

  private getDominantBlockType(blocks: OrderBlock[]): string {
    const bullish = blocks.filter(b => b.type === 'bullish').length;
    const bearish = blocks.filter(b => b.type === 'bearish').length;
    return bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral';
  }

  private getNextKeyLevel(blocks: OrderBlock[], currentPrice: number): number | null {
    const sortedBlocks = blocks
      .map(block => ({ price: block.zone.midpoint, distance: Math.abs(block.zone.midpoint - currentPrice) }))
      .sort((a, b) => a.distance - b.distance);
    
    return sortedBlocks.length > 0 ? sortedBlocks[0].price : null;
  }

  private assessOrderBlockOpportunity(analysis: OrderBlockAnalysis): string {
    const strongBlocks = analysis.activeBlocks.filter(b => b.strength >= 75).length;
    const nearPrice = analysis.activeBlocks.filter(b => {
      const distance = Math.abs(b.zone.midpoint - analysis.currentPrice) / analysis.currentPrice * 100;
      return distance <= 2;
    }).length;
    
    if (strongBlocks >= 2 && nearPrice >= 1) return 'high';
    if (strongBlocks >= 1 || nearPrice >= 1) return 'medium';
    return 'low';
  }

  private calculateBlockPriority(block: OrderBlock, distance: number): string {
    if (block.strength >= 80 && distance <= 1) return 'very_high';
    if (block.strength >= 70 && distance <= 2) return 'high';
    if (block.strength >= 60 && distance <= 5) return 'medium';
    return 'low';
  }

  private categorizePerformance(accuracy: number): string {
    if (accuracy >= 80) return 'excellent';
    if (accuracy >= 70) return 'good';
    if (accuracy >= 60) return 'fair';
    return 'poor';
  }

  private categorizeFillRate(fillRate: number): string {
    if (fillRate >= 90) return 'very_high';
    if (fillRate >= 80) return 'high';
    if (fillRate >= 70) return 'moderate';
    return 'low';
  }

  private getBestSizeCategory(distribution: any): string {
    const { small, medium, large } = distribution;
    if (large >= medium && large >= small) return 'large';
    if (medium >= small) return 'medium';
    return 'small';
  }

  private generateFVGTradingRecommendation(statistics: FVGStatistics): string {
    if (statistics.performance.accuracy > 75 && statistics.fillStatistics.fillRate > 80) {
      return 'highly_recommended';
    }
    if (statistics.performance.accuracy > 65 && statistics.fillStatistics.fillRate > 70) {
      return 'recommended';
    }
    if (statistics.performance.accuracy > 55) {
      return 'cautious';
    }
    return 'not_recommended';
  }

  private getOverallTrend(trend: any): string {
    const { shortTerm, mediumTerm, longTerm } = trend;
    if (shortTerm === mediumTerm && mediumTerm === longTerm) {
      return `strong_${shortTerm}`;
    }
    if ((shortTerm === 'bullish' && mediumTerm === 'bullish') || 
        (mediumTerm === 'bullish' && longTerm === 'bullish')) {
      return 'bullish';
    }
    if ((shortTerm === 'bearish' && mediumTerm === 'bearish') || 
        (mediumTerm === 'bearish' && longTerm === 'bearish')) {
      return 'bearish';
    }
    return 'mixed';
  }

  private getNextMajorLevel(analysis: MarketStructureAnalysis): number | null {
    if (analysis.nexteDecisionPoints && analysis.nexteDecisionPoints.length > 0) {
      return analysis.nexteDecisionPoints[0].level;
    }
    return null;
  }

  private getStrongestFactor(factors: any): string {
    const entries = Object.entries(factors) as [string, number][];
    return entries.reduce((max, [key, value]) => value > max.value ? { key, value } : max, 
                         { key: '', value: -1 }).key;
  }

  private getWeakestFactor(factors: any): string {
    const entries = Object.entries(factors) as [string, number][];
    return entries.reduce((min, [key, value]) => value < min.value ? { key, value } : min, 
                         { key: '', value: 101 }).key;
  }

  private assessValidationRisk(validation: StructureShiftValidation): string {
    if (validation.confidence > 80 && validation.warnings.length === 0) return 'low';
    if (validation.confidence > 60 && validation.warnings.length <= 1) return 'medium';
    return 'high';
  }
}