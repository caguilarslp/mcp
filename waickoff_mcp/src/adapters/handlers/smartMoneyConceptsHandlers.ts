/**
 * @fileoverview Smart Money Concepts MCP Handlers
 * @description MCP tool handlers for Smart Money Concepts analysis
 * @version 1.0.0 
 * @author Smart Money Concepts Team
 */

import { MCPServerResponse, ToolValidationResult, IMarketDataService, IAnalysisService, FairValueGap, MarketStructureAnalysis, StructureShiftValidation, MarketStructurePoint } from '../../types/index.js';
import { OrderBlocksService, OrderBlockAnalysis, OrderBlock } from '../../services/smartMoney/orderBlocks.js';
import { FairValueGapsService, FVGAnalysis, FVGStatistics } from '../../services/smartMoney/fairValueGaps.js';
import { BreakOfStructureService } from '../../services/smartMoney/breakOfStructure.js';

export class SmartMoneyConceptsHandlers {
  private orderBlocksService: OrderBlocksService;
  private fairValueGapsService: FairValueGapsService;
  private breakOfStructureService: BreakOfStructureService;
  private marketDataService: IMarketDataService;
  private analysisService: IAnalysisService;

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
          timestamp: analysis.timestamp.toISOString()
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

  // ====================
  // FORMATTING METHODS
  // ====================

  private formatOrderBlockAnalysis(analysis: OrderBlockAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      currentPrice: analysis.currentPrice,
      marketBias: analysis.marketBias,
      activeBlocks: analysis.activeBlocks.map((block: OrderBlock) => this.formatOrderBlock(block)),
      breakerBlocks: analysis.breakerBlocks.map((block: OrderBlock) => this.formatOrderBlock(block)),
      strongestBlock: analysis.strongestBlock ? this.formatOrderBlock(analysis.strongestBlock) : null,
      nearestBlocks: {
        bullish: analysis.nearestBlock.bullish ? 
          this.formatOrderBlock(analysis.nearestBlock.bullish) : null,
        bearish: analysis.nearestBlock.bearish ? 
          this.formatOrderBlock(analysis.nearestBlock.bearish) : null
      },
      timestamp: analysis.timestamp.toISOString()
    };
  }

  private formatOrderBlock(block: OrderBlock): any {
    return {
      id: block.id,
      type: block.type,
      zone: {
        upper: Number(block.zone.upper.toFixed(6)),
        lower: Number(block.zone.lower.toFixed(6)),
        midpoint: Number(block.zone.midpoint.toFixed(6)),
        sizePercent: Number(((block.zone.upper - block.zone.lower) / block.zone.midpoint * 100).toFixed(3))
      },
      strength: block.strength,
      validity: block.validity,
      respectCount: block.respectCount,
      mitigated: block.mitigated,
      mitigationTime: block.mitigationTime?.toISOString() || null,
      lastTest: block.lastTest?.toISOString() || null,
      origin: {
        timestamp: block.origin.timestamp.toISOString(),
        price: Number(((block.origin.high + block.origin.low) / 2).toFixed(6)),
        volume: block.origin.volume,
        candleIndex: block.origin.candleIndex
      },
      subsequentMove: {
        magnitude: Number(block.subsequentMove.magnitude.toFixed(2)),
        candles: block.subsequentMove.candles,
        maxPrice: Number(block.subsequentMove.maxPrice.toFixed(6))
      },
      createdAt: block.createdAt.toISOString()
    };
  }

  private formatOrderBlockForZone(block: OrderBlock, currentPrice: number): any {
    const distance = Math.abs(currentPrice - block.zone.midpoint);
    const distancePercent = (distance / currentPrice) * 100;

    return {
      ...this.formatOrderBlock(block),
      distanceFromPrice: {
        absolute: Number(distance.toFixed(6)),
        percent: Number(distancePercent.toFixed(3)),
        direction: currentPrice > block.zone.midpoint ? 'below' : 'above'
      }
    };
  }

  private formatFVGAnalysis(analysis: FVGAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      currentPrice: analysis.currentPrice,
      openGaps: analysis.openGaps.map(gap => this.formatFairValueGap(gap)),
      filledGaps: analysis.filledGaps.slice(0, 10).map(gap => this.formatFairValueGap(gap)),
      nearestGap: analysis.nearestGap ? this.formatFairValueGap(analysis.nearestGap) : null,
      statistics: {
        totalGapsDetected: analysis.statistics.totalGapsDetected,
        openGaps: analysis.statistics.openGaps,
        filledGaps: analysis.statistics.filledGaps,
        avgFillTime: Number(analysis.statistics.avgFillTime.toFixed(1)),
        fillRate: Number(analysis.statistics.fillRate.toFixed(1)),
        avgGapSize: Number(analysis.statistics.avgGapSize.toFixed(3))
      },
      marketImbalance: {
        bullishGaps: analysis.marketImbalance.bullishGaps,
        bearishGaps: analysis.marketImbalance.bearishGaps,
        netImbalance: analysis.marketImbalance.netImbalance,
        strength: Number(analysis.marketImbalance.strength.toFixed(1))
      },
      tradingOpportunities: analysis.tradingOpportunities.map(opp => ({
        gap: this.formatFairValueGap(opp.gap),
        action: opp.action,
        confidence: opp.confidence,
        reasoning: opp.reasoning,
        entryZone: {
          min: Number(opp.entryZone.min.toFixed(6)),
          max: Number(opp.entryZone.max.toFixed(6))
        },
        targets: opp.targets.map(t => Number(t.toFixed(6))),
        stopLoss: opp.stopLoss ? Number(opp.stopLoss.toFixed(6)) : null
      })),
      timestamp: analysis.timestamp.toISOString()
    };
  }

  private formatFairValueGap(gap: FairValueGap): any {
    return {
      id: gap.id,
      type: gap.type,
      gap: {
        upper: Number(gap.gap.upper.toFixed(6)),
        lower: Number(gap.gap.lower.toFixed(6)),
        size: Number(gap.gap.size.toFixed(6)),
        sizePercent: Number(gap.gap.sizePercent.toFixed(3)),
        midpoint: Number(gap.gap.midpoint.toFixed(6))
      },
      context: {
        trendDirection: gap.context.trendDirection,
        impulsiveMove: gap.context.impulsiveMove,
        volumeProfile: Number(gap.context.volumeProfile.toFixed(2)),
        significance: gap.context.significance
      },
      status: gap.status,
      filling: {
        fillProgress: Number(gap.filling.fillProgress.toFixed(1)),
        firstTouch: gap.filling.firstTouch?.toISOString() || null,
        fullFillTime: gap.filling.fullFillTime?.toISOString() || null,
        partialFillsCount: gap.filling.partialFills.length
      },
      probability: {
        fill: gap.probability.fill,
        timeToFill: gap.probability.timeToFill,
        confidence: gap.probability.confidence,
        factors: gap.probability.factors
      },
      targetZones: {
        conservative: Number(gap.targetZones.conservative.toFixed(6)),
        normal: Number(gap.targetZones.normal.toFixed(6)),
        complete: Number(gap.targetZones.complete.toFixed(6))
      },
      createdAt: gap.createdAt.toISOString(),
      expirationTime: gap.expirationTime?.toISOString() || null
    };
  }

  private formatFVGStatistics(stats: FVGStatistics): any {
    return {
      symbol: stats.symbol,
      period: stats.period,
      totalGaps: stats.totalGaps,
      fillStatistics: {
        filled: stats.fillStatistics.filled,
        partially: stats.fillStatistics.partially,
        unfilled: stats.fillStatistics.unfilled,
        fillRate: Number(stats.fillStatistics.fillRate.toFixed(1)),
        avgTimeToFill: Number(stats.fillStatistics.avgTimeToFill.toFixed(1)),
        fastestFill: Number(stats.fillStatistics.fastestFill.toFixed(1)),
        slowestFill: Number(stats.fillStatistics.slowestFill.toFixed(1))
      },
      sizeDistribution: {
        small: stats.sizeDistribution.small,
        medium: stats.sizeDistribution.medium,
        large: stats.sizeDistribution.large,
        avgSize: Number(stats.sizeDistribution.avgSize.toFixed(3))
      },
      contextAnalysis: stats.contextAnalysis,
      performance: {
        accuracy: Number(stats.performance.accuracy.toFixed(1)),
        profitability: Number(stats.performance.profitability.toFixed(1)),
        sharpeRatio: Number(stats.performance.sharpeRatio.toFixed(2)),
        maxDrawdown: Number(stats.performance.maxDrawdown.toFixed(1))
      }
    };
  }

  // ====================
  // SUMMARY METHODS
  // ====================

  private generateOrderBlockSummary(analysis: OrderBlockAnalysis): string {
    const { activeBlocks, breakerBlocks, marketBias, strongestBlock } = analysis;
    
    let summary = `📊 **Order Blocks Analysis for ${analysis.symbol}**\n\n`;
    
    summary += `**Active Order Blocks:** ${activeBlocks.length}\n`;
    if (activeBlocks.length > 0) {
      const bullish = activeBlocks.filter((b: OrderBlock) => b.type === 'bullish').length;
      const bearish = activeBlocks.filter((b: OrderBlock) => b.type === 'bearish').length;
      summary += `• Bullish: ${bullish} | Bearish: ${bearish}\n`;
      
      const avgStrength = this.calculateAverageStrength(activeBlocks);
      summary += `• Average Strength: ${avgStrength.toFixed(1)}/100\n\n`;
    }

    if (breakerBlocks.length > 0) {
      summary += `**Breaker Blocks:** ${breakerBlocks.length}\n\n`;
    }

    summary += `**Market Bias:** ${marketBias.toUpperCase()}\n`;
    
    if (strongestBlock) {
      summary += `**Strongest Block:** ${strongestBlock.type.toUpperCase()} (${strongestBlock.strength}/100)\n`;
      summary += `• Zone: $${strongestBlock.zone.lower.toFixed(4)} - $${strongestBlock.zone.upper.toFixed(4)}\n`;
      summary += `• Respect Count: ${strongestBlock.respectCount}\n\n`;
    }

    summary += this.generateTradingRecommendations(analysis);

    return summary;
  }

  private generateFVGSummary(analysis: FVGAnalysis): string {
    const { openGaps, statistics, marketImbalance, nearestGap } = analysis;
    
    let summary = `📊 **Fair Value Gaps Analysis for ${analysis.symbol}**\n\n`;
    
    summary += `**Open Fair Value Gaps:** ${openGaps.length}\n`;
    if (openGaps.length > 0) {
      const bullish = openGaps.filter(g => g.type === 'bullish').length;
      const bearish = openGaps.filter(g => g.type === 'bearish').length;
      summary += `• Bullish: ${bullish} | Bearish: ${bearish}\n`;
      
      const avgSize = openGaps.reduce((sum, g) => sum + g.gap.sizePercent, 0) / openGaps.length;
      summary += `• Average Size: ${avgSize.toFixed(2)}%\n\n`;
    }

    summary += `**Fill Statistics:**\n`;
    summary += `• Fill Rate: ${statistics.fillRate.toFixed(1)}%\n`;
    summary += `• Average Fill Time: ${statistics.avgFillTime.toFixed(1)} hours\n\n`;

    summary += `**Market Imbalance:** ${marketImbalance.netImbalance.toUpperCase()}\n`;
    if (marketImbalance.strength > 20) {
      summary += `• Strength: ${marketImbalance.strength.toFixed(1)}% (${marketImbalance.netImbalance} bias)\n\n`;
    } else {
      summary += `• Balanced market structure\n\n`;
    }

    if (nearestGap) {
      const distance = Math.abs(analysis.currentPrice - nearestGap.gap.midpoint) / analysis.currentPrice * 100;
      summary += `**Nearest Gap:** ${nearestGap.type.toUpperCase()}\n`;
      summary += `• Distance: ${distance.toFixed(2)}% (${nearestGap.probability.fill}% fill probability)\n`;
      summary += `• Zone: $${nearestGap.gap.lower.toFixed(4)} - $${nearestGap.gap.upper.toFixed(4)}\n\n`;
    }

    if (analysis.tradingOpportunities.length > 0) {
      summary += `**Trading Opportunities:** ${analysis.tradingOpportunities.length}\n`;
      const bestOpp = analysis.tradingOpportunities[0];
      summary += `• Best: ${bestOpp.action.replace('_', ' ').toUpperCase()} (${bestOpp.confidence}% confidence)\n`;
      summary += `• Reasoning: ${bestOpp.reasoning}\n`;
    } else {
      summary += `**Trading Opportunities:** No immediate signals\n`;
    }

    return summary;
  }

  private generateFVGStatisticsSummary(stats: FVGStatistics): string {
    let summary = `📈 **FVG Historical Performance for ${stats.symbol}**\n\n`;
    
    summary += `**Period:** ${stats.period}\n`;
    summary += `**Total Gaps Analyzed:** ${stats.totalGaps}\n\n`;
    
    summary += `**Fill Performance:**\n`;
    summary += `• Fill Rate: ${stats.fillStatistics.fillRate.toFixed(1)}%\n`;
    summary += `• Average Fill Time: ${stats.fillStatistics.avgTimeToFill.toFixed(1)} hours\n`;
    summary += `• Fastest Fill: ${stats.fillStatistics.fastestFill.toFixed(1)} hours\n`;
    summary += `• Slowest Fill: ${stats.fillStatistics.slowestFill.toFixed(1)} hours\n\n`;
    
    summary += `**Size Distribution:**\n`;
    summary += `• Small (<0.5%): ${stats.sizeDistribution.small}\n`;
    summary += `• Medium (0.5-1.5%): ${stats.sizeDistribution.medium}\n`;
    summary += `• Large (>1.5%): ${stats.sizeDistribution.large}\n`;
    summary += `• Average Size: ${stats.sizeDistribution.avgSize.toFixed(2)}%\n\n`;
    
    summary += `**Trading Performance:**\n`;
    summary += `• Accuracy: ${stats.performance.accuracy.toFixed(1)}%\n`;
    summary += `• Profitability: ${stats.performance.profitability.toFixed(1)}%\n`;
    summary += `• Sharpe Ratio: ${stats.performance.sharpeRatio.toFixed(2)}\n`;
    summary += `• Max Drawdown: ${stats.performance.maxDrawdown.toFixed(1)}%\n`;
    
    return summary;
  }

  private generateFVGInsights(stats: FVGStatistics): string[] {
    const insights: string[] = [];

    if (stats.fillStatistics.fillRate > 80) {
      insights.push('🎯 High fill rate indicates reliable gap-filling behavior');
    } else if (stats.fillStatistics.fillRate < 50) {
      insights.push('⚠️ Low fill rate suggests gaps persist longer - consider fade strategies');
    }

    if (stats.fillStatistics.avgTimeToFill < 6) {
      insights.push('⚡ Quick gap filling detected - Consider short-term scalping opportunities');
    } else if (stats.fillStatistics.avgTimeToFill > 24) {
      insights.push('🕐 Slow gap filling - Gaps may provide longer-term directional bias');
    }

    const totalGaps = stats.sizeDistribution.small + stats.sizeDistribution.medium + stats.sizeDistribution.large;
    if (totalGaps > 0) {
      const largeGapPercent = (stats.sizeDistribution.large / totalGaps) * 100;
      if (largeGapPercent > 30) {
        insights.push('📏 High proportion of large gaps - Strong institutional activity detected');
      }
    }

    if (stats.contextAnalysis.institutional > stats.totalGaps * 0.4) {
      insights.push('🏦 Strong institutional footprint in gap formations');
    }

    if (stats.contextAnalysis.inTrend > stats.contextAnalysis.inConsolidation) {
      insights.push('📈 More gaps formed during trending markets - Follow trend direction');
    }

    if (stats.performance.accuracy > 75) {
      insights.push('✅ High accuracy indicates reliable FVG predictions');
    }

    if (stats.performance.sharpeRatio > 1.5) {
      insights.push('📊 Excellent risk-adjusted returns from FVG trading');
    }

    if (insights.length === 0) {
      insights.push('📊 Mixed FVG performance - Consider combining with other SMC concepts');
    }

    return insights;
  }

  private generateValidationRecommendation(validationResult: {
    valid: boolean;
    block?: OrderBlock;
    reason?: string;
  }): string {
    if (!validationResult.valid) {
      return `❌ **Order Block Invalid:** ${validationResult.reason}`;
    }

    if (validationResult.block) {
      const block = validationResult.block;
      let recommendation = `✅ **Order Block Valid**\n`;
      recommendation += `• Type: ${block.type.toUpperCase()}\n`;
      recommendation += `• Strength: ${block.strength}/100\n`;
      recommendation += `• Status: ${block.validity.toUpperCase()}\n`;

      if (block.validity === 'tested') {
        recommendation += `• Recently tested - Watch for reaction\n`;
      }

      return recommendation;
    }

    return '✅ Order Block remains valid';
  }

  private generateZoneRecommendations(
    zones: {
      strong: OrderBlock[];
      medium: OrderBlock[];
      weak: OrderBlock[];
      nearby: OrderBlock[];
    },
    currentPrice: number
  ): string[] {
    const recommendations: string[] = [];

    if (zones.strong.length > 0) {
      recommendations.push(`🎯 ${zones.strong.length} strong Order Block(s) identified - High probability reaction zones`);
    }

    if (zones.nearby.length > 0) {
      const nearbyBlock = zones.nearby[0];
      const direction = currentPrice > nearbyBlock.zone.midpoint ? 'below' : 'above';
      recommendations.push(`🔍 Price approaching Order Block ${direction} - Watch for ${nearbyBlock.type} reaction`);
    }

    const bullishBlocks = [...zones.strong, ...zones.medium].filter(b => b.type === 'bullish').length;
    const bearishBlocks = [...zones.strong, ...zones.medium].filter(b => b.type === 'bearish').length;

    if (bullishBlocks > bearishBlocks) {
      recommendations.push('📈 More bullish Order Blocks detected - Consider long bias');
    } else if (bearishBlocks > bullishBlocks) {
      recommendations.push('📉 More bearish Order Blocks detected - Consider short bias');
    }

    if (recommendations.length === 0) {
      recommendations.push('📊 No immediate Order Block signals - Monitor for new formations');
    }

    return recommendations;
  }

  private generateTradingRecommendations(analysis: OrderBlockAnalysis): string {
    const { activeBlocks, marketBias, nearestBlock } = analysis;
    
    if (activeBlocks.length === 0) {
      return '📈 **Trading Recommendation:** No active Order Blocks - Look for new formations\n';
    }

    let recommendations = '📈 **Trading Recommendations:**\n';

    switch (marketBias) {
      case 'bullish':
        recommendations += '• **Bias:** Look for long entries at bullish Order Blocks\n';
        break;
      case 'bearish':
        recommendations += '• **Bias:** Look for short entries at bearish Order Blocks\n';
        break;
      case 'neutral':
        recommendations += '• **Bias:** Neutral - Trade reactions at both bullish and bearish blocks\n';
        break;
    }

    if (nearestBlock.bullish || nearestBlock.bearish) {
      const nearest = nearestBlock.bullish && nearestBlock.bearish ?
        (Math.abs(analysis.currentPrice - nearestBlock.bullish.zone.midpoint) < 
         Math.abs(analysis.currentPrice - nearestBlock.bearish.zone.midpoint) ? 
         nearestBlock.bullish : nearestBlock.bearish) :
        (nearestBlock.bullish || nearestBlock.bearish)!;

      const distance = Math.abs(analysis.currentPrice - nearest.zone.midpoint) / analysis.currentPrice * 100;
      recommendations += `• **Nearest Block:** ${nearest.type.toUpperCase()} at $${nearest.zone.midpoint.toFixed(4)} (${distance.toFixed(2)}% away)\n`;
    }

    return recommendations;
  }

  private calculateAverageStrength(blocks: OrderBlock[]): number {
    if (blocks.length === 0) return 0;
    const total = blocks.reduce((sum: number, block: OrderBlock) => sum + block.strength, 0);
    return total / blocks.length;
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
  // BOS VALIDATION METHODS
  // ====================

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

  // ====================
  // BOS FORMATTING METHODS
  // ====================

  private formatMarketStructureAnalysis(analysis: MarketStructureAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      currentPrice: Number(analysis.currentPrice.toFixed(6)),
      trend: {
        shortTerm: analysis.trend.shortTerm,
        mediumTerm: analysis.trend.mediumTerm,
        longTerm: analysis.trend.longTerm,
        confidence: analysis.trend.confidence
      },
      structurePoints: analysis.structurePoints.slice(-20).map(point => this.formatStructurePoint(point)),
      activeBreaks: analysis.activeBreaks.map(breakStruct => this.formatStructuralBreak(breakStruct)),
      recentBreaks: analysis.recentBreaks.map(breakStruct => this.formatStructuralBreak(breakStruct)),
      currentStructure: {
        type: analysis.currentStructure.type,
        strength: analysis.currentStructure.strength,
        duration: analysis.currentStructure.duration,
        keyLevels: analysis.currentStructure.keyLevels.map(level => Number(level.toFixed(6)))
      },
      marketBias: {
        direction: analysis.marketBias.direction,
        strength: analysis.marketBias.strength,
        confidence: analysis.marketBias.confidence,
        reasoning: analysis.marketBias.reasoning
      },
      nextDecisionPoints: analysis.nexteDecisionPoints.slice(0, 5).map(point => ({
        level: Number(point.level.toFixed(6)),
        type: point.type,
        significance: point.significance,
        probability: point.probability
      })),
      tradingOpportunities: analysis.tradingOpportunities.slice(0, 3).map(opp => ({
        type: opp.type,
        direction: opp.direction,
        entryZone: {
          min: Number(opp.entryZone.min.toFixed(6)),
          max: Number(opp.entryZone.max.toFixed(6))
        },
        targets: opp.targets.map(t => Number(t.toFixed(6))),
        stopLoss: Number(opp.stopLoss.toFixed(6)),
        riskReward: Number(opp.riskReward.toFixed(2)),
        confidence: opp.confidence,
        reasoning: opp.reasoning
      })),
      timestamp: analysis.timestamp.toISOString()
    };
  }

  private formatStructurePoint(point: MarketStructurePoint): any {
    return {
      timestamp: point.timestamp.toISOString(),
      price: Number(point.price.toFixed(6)),
      type: point.type,
      strength: point.strength,
      volume: point.volume,
      confirmed: point.confirmed,
      index: point.index
    };
  }

  private formatStructuralBreak(structuralBreak: any): any {
    return {
      id: structuralBreak.id,
      type: structuralBreak.type,
      direction: structuralBreak.direction,
      breakPoint: {
        timestamp: structuralBreak.breakPoint.timestamp.toISOString(),
        price: Number(structuralBreak.breakPoint.price.toFixed(6)),
        volume: structuralBreak.breakPoint.volume,
        index: structuralBreak.breakPoint.index
      },
      previousStructure: {
        pattern: structuralBreak.previousStructure.pattern,
        duration: structuralBreak.previousStructure.duration,
        strength: structuralBreak.previousStructure.strength
      },
      significance: structuralBreak.significance,
      confirmation: {
        volumeConfirmed: structuralBreak.confirmation.volumeConfirmed,
        followThrough: structuralBreak.confirmation.followThrough,
        retestLevel: structuralBreak.confirmation.retestLevel ? 
          Number(structuralBreak.confirmation.retestLevel.toFixed(6)) : null,
        retestTime: structuralBreak.confirmation.retestTime?.toISOString() || null
      },
      institutionalFootprint: structuralBreak.institutionalFootprint,
      targets: {
        conservative: Number(structuralBreak.targets.conservative.toFixed(6)),
        normal: Number(structuralBreak.targets.normal.toFixed(6)),
        aggressive: Number(structuralBreak.targets.aggressive.toFixed(6))
      },
      invalidationLevel: Number(structuralBreak.invalidationLevel.toFixed(6)),
      probability: structuralBreak.probability,
      createdAt: structuralBreak.createdAt.toISOString(),
      resolvedAt: structuralBreak.resolvedAt?.toISOString() || null,
      outcome: structuralBreak.outcome || null
    };
  }

  private formatStructureShiftValidation(validation: StructureShiftValidation): any {
    return {
      isValid: validation.isValid,
      confidence: validation.confidence,
      factors: {
        volumeConfirmation: validation.factors.volumeConfirmation,
        priceAction: validation.factors.priceAction,
        institutionalSignals: validation.factors.institutionalSignals,
        timeConfirmation: validation.factors.timeConfirmation,
        structuralIntegrity: validation.factors.structuralIntegrity
      },
      warnings: validation.warnings,
      nextValidationTime: validation.nextValidationTime?.toISOString() || null,
      invalidationScenarios: validation.invalidationScenarios.map(scenario => ({
        trigger: scenario.trigger,
        price: Number(scenario.price.toFixed(6)),
        probability: scenario.probability
      }))
    };
  }

  // ====================
  // BOS SUMMARY METHODS
  // ====================

  private generateBOSSummary(analysis: MarketStructureAnalysis): string {
    const { symbol, activeBreaks, marketBias, currentStructure, tradingOpportunities } = analysis;
    
    let summary = `📊 **Break of Structure Analysis for ${symbol}**\n\n`;
    
    summary += `**Current Structure:** ${currentStructure.type.toUpperCase()}\n`;
    summary += `• Strength: ${currentStructure.strength}/100\n`;
    summary += `• Duration: ${currentStructure.duration} periods\n\n`;
    
    summary += `**Market Bias:** ${marketBias.direction.toUpperCase()}\n`;
    summary += `• Strength: ${marketBias.strength}/100\n`;
    summary += `• Confidence: ${marketBias.confidence}%\n\n`;
    
    if (activeBreaks.length > 0) {
      summary += `**Active Structural Breaks:** ${activeBreaks.length}\n`;
      const bosCount = activeBreaks.filter(b => b.type === 'BOS').length;
      const chochCount = activeBreaks.filter(b => b.type === 'CHoCH').length;
      summary += `• BOS: ${bosCount} | CHoCH: ${chochCount}\n`;
      
      const latestBreak = activeBreaks[activeBreaks.length - 1];
      if (latestBreak) {
        summary += `• Latest: ${latestBreak.type} ${latestBreak.direction.toUpperCase()} (${latestBreak.probability}% success probability)\n\n`;
      }
    } else {
      summary += `**Active Structural Breaks:** None\n\n`;
    }
    
    if (tradingOpportunities.length > 0) {
      summary += `**Trading Opportunities:** ${tradingOpportunities.length}\n`;
      const bestOpp = tradingOpportunities[0];
      summary += `• Best: ${bestOpp.type.toUpperCase()} ${bestOpp.direction.toUpperCase()}\n`;
      summary += `• Confidence: ${bestOpp.confidence}%\n`;
      summary += `• Risk/Reward: 1:${bestOpp.riskReward}\n`;
      summary += `• Reasoning: ${bestOpp.reasoning}\n\n`;
    } else {
      summary += `**Trading Opportunities:** No immediate signals\n\n`;
    }
    
    // Trend analysis
    const trends = [analysis.trend.shortTerm, analysis.trend.mediumTerm, analysis.trend.longTerm];
    const bullishTrends = trends.filter(t => t === 'bullish').length;
    const bearishTrends = trends.filter(t => t === 'bearish').length;
    
    summary += `**Multi-Timeframe Trend:**\n`;
    summary += `• Short: ${analysis.trend.shortTerm.toUpperCase()}\n`;
    summary += `• Medium: ${analysis.trend.mediumTerm.toUpperCase()}\n`;
    summary += `• Long: ${analysis.trend.longTerm.toUpperCase()}\n`;
    
    if (bullishTrends > bearishTrends) {
      summary += `• **Overall Bias:** BULLISH (${bullishTrends}/3 timeframes)\n`;
    } else if (bearishTrends > bullishTrends) {
      summary += `• **Overall Bias:** BEARISH (${bearishTrends}/3 timeframes)\n`;
    } else {
      summary += `• **Overall Bias:** MIXED (choppy conditions)\n`;
    }
    
    return summary;
  }

  private generateMarketStructureSummary(analysis: MarketStructureAnalysis): string {
    const { symbol, currentStructure, structurePoints, marketBias } = analysis;
    
    let summary = `🏗️ **Market Structure Analysis for ${symbol}**\n\n`;
    
    summary += `**Current Market Structure:**\n`;
    summary += `• Type: ${currentStructure.type.replace('_', ' ').toUpperCase()}\n`;
    summary += `• Strength: ${currentStructure.strength}/100\n`;
    summary += `• Duration: ${currentStructure.duration} periods\n\n`;
    
    // Structure points analysis
    const recentPoints = structurePoints.slice(-10);
    const higherHighs = recentPoints.filter(p => p.type === 'higher_high').length;
    const lowerLows = recentPoints.filter(p => p.type === 'lower_low').length;
    const higherLows = recentPoints.filter(p => p.type === 'higher_low').length;
    const lowerHighs = recentPoints.filter(p => p.type === 'lower_high').length;
    
    summary += `**Recent Structure Points (Last 10):**\n`;
    summary += `• Higher Highs: ${higherHighs}\n`;
    summary += `• Higher Lows: ${higherLows}\n`;
    summary += `• Lower Highs: ${lowerHighs}\n`;
    summary += `• Lower Lows: ${lowerLows}\n\n`;
    
    // Structural bias
    if (higherHighs > 0 && higherLows > 0 && lowerLows === 0) {
      summary += `**Structural Pattern:** BULLISH TREND (HH + HL pattern)\n`;
    } else if (lowerLows > 0 && lowerHighs > 0 && higherHighs === 0) {
      summary += `**Structural Pattern:** BEARISH TREND (LL + LH pattern)\n`;
    } else if (higherHighs > 0 && lowerLows > 0) {
      summary += `**Structural Pattern:** RANGE/CONSOLIDATION (Mixed HH/LL)\n`;
    } else {
      summary += `**Structural Pattern:** DEVELOPING (Insufficient data)\n`;
    }
    
    summary += `**Market Bias:** ${marketBias.direction.toUpperCase()} (${marketBias.strength}/100 strength)\n`;
    
    return summary;
  }

  private generateMarketStructureInsights(analysis: MarketStructureAnalysis): string[] {
    const insights: string[] = [];
    const { currentStructure, marketBias, activeBreaks, trend } = analysis;
    
    // Structure strength insights
    if (currentStructure.strength > 80) {
      insights.push('💪 Very strong market structure - High confidence in directional moves');
    } else if (currentStructure.strength < 40) {
      insights.push('⚠️ Weak market structure - Expect choppy price action');
    }
    
    // Bias alignment insights
    const trendsAligned = [trend.shortTerm, trend.mediumTerm, trend.longTerm]
      .filter(t => t === marketBias.direction).length;
    
    if (trendsAligned === 3) {
      insights.push('🎯 Perfect trend alignment across all timeframes - Strong directional bias');
    } else if (trendsAligned === 0) {
      insights.push('🌪️ No trend alignment - Conflicting signals across timeframes');
    }
    
    // Break insights
    if (activeBreaks.length > 3) {
      insights.push('📈 Multiple active breaks detected - High volatility expected');
    }
    
    const recentChoCH = activeBreaks.filter(b => b.type === 'CHoCH' && 
      Date.now() - b.createdAt.getTime() < 24 * 60 * 60 * 1000).length;
    
    if (recentChoCH > 0) {
      insights.push('🔄 Recent Change of Character detected - Potential trend shift in progress');
    }
    
    // Structure duration insights
    if (currentStructure.duration > 50) {
      insights.push('⏰ Long-lasting structure - Mature phase, watch for exhaustion');
    } else if (currentStructure.duration < 10) {
      insights.push('🌱 New structure forming - Early development phase');
    }
    
    // Bias confidence insights
    if (marketBias.confidence > 85) {
      insights.push('✅ High confidence market bias - Clear directional opportunity');
    } else if (marketBias.confidence < 50) {
      insights.push('❓ Low confidence bias - Wait for clearer signals');
    }
    
    if (insights.length === 0) {
      insights.push('📊 Market structure analysis complete - Monitor for new developments');
    }
    
    return insights;
  }

  private generateValidationSummary(validation: StructureShiftValidation): string {
    let summary = `🔍 **Structure Shift Validation**\n\n`;
    
    summary += `**Overall Validity:** ${validation.isValid ? '✅ VALID' : '❌ INVALID'}\n`;
    summary += `**Confidence:** ${validation.confidence.toFixed(1)}%\n\n`;
    
    summary += `**Validation Factors:**\n`;
    summary += `• Volume Confirmation: ${validation.factors.volumeConfirmation.toFixed(1)}%\n`;
    summary += `• Price Action: ${validation.factors.priceAction.toFixed(1)}%\n`;
    summary += `• Institutional Signals: ${validation.factors.institutionalSignals.toFixed(1)}%\n`;
    summary += `• Time Confirmation: ${validation.factors.timeConfirmation.toFixed(1)}%\n`;
    summary += `• Structural Integrity: ${validation.factors.structuralIntegrity.toFixed(1)}%\n\n`;
    
    if (validation.warnings.length > 0) {
      summary += `**Warnings:**\n`;
      validation.warnings.forEach(warning => {
        summary += `⚠️ ${warning}\n`;
      });
      summary += '\n';
    }
    
    if (validation.invalidationScenarios.length > 0) {
      summary += `**Invalidation Scenarios:**\n`;
      validation.invalidationScenarios.forEach(scenario => {
        summary += `• ${scenario.trigger}: ${scenario.price.toFixed(4)} (${scenario.probability}% probability)\n`;
      });
    }
    
    return summary;
  }

  private generateStructureValidationRecommendations(validation: StructureShiftValidation): string[] {
    const recommendations: string[] = [];
    
    if (validation.isValid) {
      if (validation.confidence > 80) {
        recommendations.push('🎯 High confidence validation - Structure shift confirmed');
        recommendations.push('📈 Consider position sizing based on strong validation');
      } else if (validation.confidence > 60) {
        recommendations.push('✅ Moderate confidence validation - Structure shift likely');
        recommendations.push('⚖️ Use conservative position sizing');
      } else {
        recommendations.push('⚠️ Low confidence validation - Wait for stronger confirmation');
      }
    } else {
      recommendations.push('❌ Structure shift not validated - Avoid new positions');
      recommendations.push('🔍 Monitor for re-validation or alternative setups');
    }
    
    // Factor-specific recommendations
    if (validation.factors.volumeConfirmation < 60) {
      recommendations.push('📊 Volume confirmation weak - Wait for volume surge');
    }
    
    if (validation.factors.institutionalSignals > 80) {
      recommendations.push('🏦 Strong institutional signals detected - High probability move');
    }
    
    if (validation.factors.timeConfirmation < 50) {
      recommendations.push('⏰ Time confirmation pending - Allow more development time');
    }
    
    if (validation.warnings.length > 2) {
      recommendations.push('⚠️ Multiple warnings present - Exercise extra caution');
    }
    
    if (validation.invalidationScenarios.some(s => s.probability > 30)) {
      recommendations.push('🛡️ High invalidation risk - Use tight stop losses');
    }
    
    return recommendations;
  }
}
