/**
 * @fileoverview Trading Service - Grid Trading and Strategy Engine
 * @description Modular service for trading strategies and grid suggestions
 * @version 1.3.0
 */

import {
  ITradingService,
  GridSuggestion,
  MarketCategoryType,
  IMarketDataService,
  IAnalysisService,
  PerformanceMetrics
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance.js';
import { MathUtils } from '../utils/math.js';

export class TradingService implements ITradingService {
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly mathUtils: MathUtils;

  constructor(
    private marketDataService: IMarketDataService,
    private analysisService: IAnalysisService
  ) {
    this.logger = new Logger('TradingService');
    this.performanceMonitor = new PerformanceMonitor();
    this.mathUtils = new MathUtils();
  }

  /**
   * Suggest optimal grid trading levels based on market analysis
   */
  async suggestGridLevels(
    symbol: string,
    investment: number,
    gridCount: number = 10,
    category: MarketCategoryType = 'spot'
  ): Promise<GridSuggestion> {
    return this.performanceMonitor.measure('suggestGridLevels', async () => {
      this.logger.info(`Generating grid suggestions for ${symbol} with $${investment} investment`);

      try {
        // Get current market data
        const ticker = await this.marketDataService.getTicker(symbol, category);
        const currentPrice = ticker.lastPrice;

        // Get volatility analysis for grid suitability
        const volatilityAnalysis = await this.analysisService.analyzeVolatility(symbol, '1d');
        
        // Get support/resistance levels for intelligent bounds
        const srAnalysis = await this.analysisService.identifySupportResistance(symbol);

        // Determine grid range based on multiple factors
        const gridRange = this.calculateOptimalGridRange(
          currentPrice,
          volatilityAnalysis,
          srAnalysis
        );

        // Generate grid levels
        const gridLevels = this.generateGridLevels(
          gridRange.lower,
          gridRange.upper,
          gridCount
        );

        // Calculate investment per grid
        const pricePerGrid = investment / gridCount;

        // Estimate potential profit
        const potentialProfit = this.estimateGridProfit(
          currentPrice,
          gridLevels,
          pricePerGrid,
          volatilityAnalysis.volatilityPercent
        );

        // Determine recommendation
        const recommendation = this.determineGridRecommendation(
          volatilityAnalysis,
          investment,
          currentPrice
        );

        // Calculate confidence score
        const confidence = this.calculateGridConfidence(
          volatilityAnalysis,
          srAnalysis,
          gridRange
        );

        const gridSuggestion: GridSuggestion = {
          symbol,
          currentPrice,
          suggestedRange: gridRange,
          gridLevels,
          investment,
          pricePerGrid,
          potentialProfit,
          volatility24h: volatilityAnalysis.volatilityPercent,
          recommendation,
          confidence
        };

        this.logger.info(`Grid suggestion for ${symbol}: ${recommendation} with ${confidence}% confidence`);
        return gridSuggestion;

      } catch (error) {
        this.logger.error(`Failed to generate grid suggestions for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Calculate optimal grid range based on market analysis
   */
  private calculateOptimalGridRange(
    currentPrice: number,
    volatilityAnalysis: any,
    srAnalysis: any
  ): { lower: number; upper: number } {
    
    // Method 1: Volatility-based range
    const volatilityPercent = volatilityAnalysis.volatilityPercent;
    const baseRange = Math.max(5, Math.min(volatilityPercent * 0.8, 15)); // 5-15% range
    
    const volatilityLower = currentPrice * (1 - baseRange / 100);
    const volatilityUpper = currentPrice * (1 + baseRange / 100);

    // Method 2: Support/Resistance based range
    let srLower = volatilityLower;
    let srUpper = volatilityUpper;

    if (srAnalysis.supports.length > 0) {
      const strongestSupport = srAnalysis.supports[0];
      if (strongestSupport.level < currentPrice) {
        srLower = Math.max(strongestSupport.level, currentPrice * 0.85); // Don't go below 15%
      }
    }

    if (srAnalysis.resistances.length > 0) {
      const strongestResistance = srAnalysis.resistances[0];
      if (strongestResistance.level > currentPrice) {
        srUpper = Math.min(strongestResistance.level, currentPrice * 1.15); // Don't go above 15%
      }
    }

    // Method 3: Hybrid approach (weighted average)
    const volatilityWeight = 0.6;
    const srWeight = 0.4;

    const lower = (volatilityLower * volatilityWeight) + (srLower * srWeight);
    const upper = (volatilityUpper * volatilityWeight) + (srUpper * srWeight);

    // Ensure minimum range of 2%
    const range = upper - lower;
    const minRange = currentPrice * 0.02;
    
    if (range < minRange) {
      const adjustment = (minRange - range) / 2;
      return {
        lower: Math.max(lower - adjustment, currentPrice * 0.90),
        upper: Math.min(upper + adjustment, currentPrice * 1.10)
      };
    }

    return {
      lower: this.mathUtils.round(lower),
      upper: this.mathUtils.round(upper)
    };
  }

  /**
   * Generate evenly spaced grid levels
   */
  private generateGridLevels(lower: number, upper: number, gridCount: number): number[] {
    const levels: number[] = [];
    const step = (upper - lower) / gridCount;

    for (let i = 0; i <= gridCount; i++) {
      levels.push(this.mathUtils.round(lower + (step * i)));
    }

    return levels;
  }

  /**
   * Estimate potential profit from grid trading
   */
  private estimateGridProfit(
    currentPrice: number,
    gridLevels: number[],
    pricePerGrid: number,
    volatilityPercent: number
  ): string {
    
    // Base assumptions
    const avgSpread = 0.001; // 0.1% average spread
    const tradingFees = 0.001; // 0.1% per trade
    const profitPerTrade = avgSpread - (tradingFees * 2); // Subtract buy and sell fees
    
    // Estimate trades per day based on volatility
    const volatilityFactor = Math.min(volatilityPercent / 10, 2); // Cap at 2x
    const tradesPerDay = gridLevels.length * 0.3 * volatilityFactor; // 30% of grids trade per day
    
    // Calculate daily profit
    const avgTradeSize = pricePerGrid / currentPrice; // Amount of base asset
    const dailyProfit = tradesPerDay * avgTradeSize * currentPrice * profitPerTrade;
    
    return `$${this.mathUtils.round(dailyProfit, 2)}/day estimated`;
  }

  /**
   * Determine grid trading recommendation
   */
  private determineGridRecommendation(
    volatilityAnalysis: any,
    investment: number,
    currentPrice: number
  ): 'recommended' | 'wait' | 'high_risk' {
    
    const { volatilityPercent, isGoodForGrid } = volatilityAnalysis;
    
    // Risk factors
    const isHighVolatility = volatilityPercent > 20;
    const isLowVolatility = volatilityPercent < 3;
    const isSmallInvestment = investment < 100; // Less than $100
    const isLargeInvestment = investment > 10000; // More than $10k
    
    if (isLowVolatility) {
      return 'wait';
    }
    
    if (isHighVolatility && isLargeInvestment) {
      return 'high_risk';
    }
    
    if (isGoodForGrid && !isSmallInvestment) {
      return 'recommended';
    }
    
    return 'wait';
  }

  /**
   * Calculate confidence score for grid suggestion
   */
  private calculateGridConfidence(
    volatilityAnalysis: any,
    srAnalysis: any,
    gridRange: { lower: number; upper: number }
  ): number {
    
    let confidence = 0;
    
    // Volatility confidence (40%)
    const volatilityScore = volatilityAnalysis.confidence || 50;
    confidence += (volatilityScore * 0.4);
    
    // S/R confidence (30%)
    const hasStrongSR = srAnalysis.supports.length > 0 && srAnalysis.resistances.length > 0;
    const srScore = hasStrongSR ? 80 : 50;
    confidence += (srScore * 0.3);
    
    // Range validation (20%)
    const rangePercent = ((gridRange.upper - gridRange.lower) / ((gridRange.upper + gridRange.lower) / 2)) * 100;
    const isGoodRange = rangePercent >= 3 && rangePercent <= 15;
    const rangeScore = isGoodRange ? 85 : 60;
    confidence += (rangeScore * 0.2);
    
    // Data quality (10%)
    const dataQualityScore = 75; // Base score, could be enhanced with more metrics
    confidence += (dataQualityScore * 0.1);
    
    return Math.round(this.mathUtils.clamp(confidence, 0, 100));
  }

  /**
   * Advanced grid optimization using machine learning-like approach
   */
  async optimizeGridParameters(
    symbol: string,
    investment: number,
    targetReturn: number,
    riskTolerance: 'low' | 'medium' | 'high'
  ): Promise<{
    optimalGridCount: number;
    optimalRange: { lower: number; upper: number };
    expectedReturn: number;
    riskScore: number;
  }> {
    return this.performanceMonitor.measure('optimizeGridParameters', async () => {
      this.logger.info(`Optimizing grid parameters for ${symbol} with ${riskTolerance} risk tolerance`);

      // Get comprehensive market analysis
      const [ticker, volatility, srAnalysis, volumeAnalysis] = await Promise.all([
        this.marketDataService.getTicker(symbol),
        this.analysisService.analyzeVolatility(symbol, '7d'),
        this.analysisService.identifySupportResistance(symbol, '60', 100, 3),
        this.analysisService.analyzeVolume(symbol, '60', 48)
      ]);

      const currentPrice = ticker.lastPrice;

      // Risk tolerance parameters
      const riskParams = {
        low: { maxVolatility: 10, minGrids: 15, maxRange: 8 },
        medium: { maxVolatility: 20, minGrids: 10, maxRange: 12 },
        high: { maxVolatility: 35, minGrids: 8, maxRange: 20 }
      };

      const params = riskParams[riskTolerance];

      // Test different grid configurations
      const configurations = [];
      
      for (let gridCount = params.minGrids; gridCount <= 20; gridCount++) {
        for (let rangePercent = 3; rangePercent <= params.maxRange; rangePercent += 1) {
          const range = {
            lower: currentPrice * (1 - rangePercent / 200),
            upper: currentPrice * (1 + rangePercent / 200)
          };

          const config = await this.evaluateGridConfiguration(
            symbol,
            currentPrice,
            investment,
            gridCount,
            range,
            volatility,
            srAnalysis
          );

          configurations.push(config);
        }
      }

      // Find optimal configuration based on risk-adjusted return
      const optimal = configurations.reduce((best, current) => {
        const currentScore = current.expectedReturn - (current.riskScore * (riskTolerance === 'low' ? 2 : riskTolerance === 'medium' ? 1.5 : 1));
        const bestScore = best.expectedReturn - (best.riskScore * (riskTolerance === 'low' ? 2 : riskTolerance === 'medium' ? 1.5 : 1));
        
        return currentScore > bestScore ? current : best;
      });

      this.logger.info(`Optimal grid for ${symbol}: ${optimal.optimalGridCount} grids with ${optimal.expectedReturn.toFixed(2)}% expected return`);
      
      return optimal;
    });
  }

  /**
   * Evaluate a specific grid configuration
   */
  private async evaluateGridConfiguration(
    symbol: string,
    currentPrice: number,
    investment: number,
    gridCount: number,
    range: { lower: number; upper: number },
    volatilityAnalysis: any,
    srAnalysis: any
  ) {
    // Monte Carlo simulation for return estimation
    const simulationRuns = 1000;
    const returns: number[] = [];

    for (let i = 0; i < simulationRuns; i++) {
      const simulatedReturn = this.simulateGridTrading(
        currentPrice,
        range,
        gridCount,
        volatilityAnalysis.volatilityPercent
      );
      returns.push(simulatedReturn);
    }

    const expectedReturn = this.mathUtils.mean(returns);
    const returnVolatility = this.mathUtils.standardDeviation(returns);
    
    // Risk score calculation
    const riskScore = this.calculateRiskScore(
      range,
      currentPrice,
      gridCount,
      volatilityAnalysis,
      srAnalysis
    );

    return {
      optimalGridCount: gridCount,
      optimalRange: range,
      expectedReturn,
      riskScore,
      returnVolatility
    };
  }

  /**
   * Monte Carlo simulation for grid trading
   */
  private simulateGridTrading(
    currentPrice: number,
    range: { lower: number; upper: number },
    gridCount: number,
    volatilityPercent: number
  ): number {
    
    // Simplified simulation - in reality this would be much more complex
    const rangePercent = ((range.upper - range.lower) / currentPrice) * 100;
    const efficiency = Math.min(volatilityPercent / rangePercent, 2); // How well volatility matches range
    
    // Base return from grid completions
    const baseReturn = efficiency * 0.5; // 0.5% per full grid cycle
    
    // Random factor for market uncertainty
    const randomFactor = (Math.random() - 0.5) * 0.3; // ±15% randomness
    
    return baseReturn + randomFactor;
  }

  /**
   * Calculate risk score for a grid configuration
   */
  private calculateRiskScore(
    range: { lower: number; upper: number },
    currentPrice: number,
    gridCount: number,
    volatilityAnalysis: any,
    srAnalysis: any
  ): number {
    
    let riskScore = 0;
    
    // Range risk (wider ranges = higher risk)
    const rangePercent = ((range.upper - range.lower) / currentPrice) * 100;
    riskScore += Math.min(rangePercent * 2, 40);
    
    // Volatility risk
    const volatilityRisk = Math.min(volatilityAnalysis.volatilityPercent, 30);
    riskScore += volatilityRisk;
    
    // S/R coverage risk (ranges not aligned with S/R = higher risk)
    const srCoverage = this.calculateSRCoverage(range, srAnalysis);
    riskScore += (1 - srCoverage) * 20;
    
    // Grid density risk (too few grids = higher risk)
    const gridDensity = gridCount / rangePercent;
    if (gridDensity < 1) {
      riskScore += 10;
    }
    
    return Math.min(riskScore, 100);
  }

  /**
   * Calculate how well the grid range covers important S/R levels
   */
  private calculateSRCoverage(
    range: { lower: number; upper: number },
    srAnalysis: any
  ): number {
    
    const allLevels = [...srAnalysis.supports, ...srAnalysis.resistances];
    const coveredLevels = allLevels.filter(level => 
      level.level >= range.lower && level.level <= range.upper
    );
    
    return allLevels.length > 0 ? coveredLevels.length / allLevels.length : 0.5;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get service info
   */
  getServiceInfo() {
    return {
      name: 'TradingService',
      version: '1.3.0',
      capabilities: [
        'grid_level_suggestions',
        'parameter_optimization',
        'risk_assessment',
        'monte_carlo_simulation'
      ],
      uptime: process.uptime()
    };
  }
}