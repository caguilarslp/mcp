/**
 * @fileoverview Trap Detection Service for Bull/Bear Trap Identification
 * @description Advanced algorithms to detect bull traps and bear traps in real-time
 * @version 1.0.0
 * @author wAIckoff MCP Team
 */

import type {
  ITrapDetectionService,
  IMarketDataService,
  IAnalysisService,
  TrapDetectionResult,
  TrapAnalysis,
  TrapEvent,
  TrapConfig,
  TrapStatistics,
  TrapTrigger,
  BreakoutContext,
  SupportResistanceLevel,
  MarketTicker,
  Orderbook,
  OHLCV,
  VolumeDelta,
  PerformanceMetrics
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance.js';

/**
 * TrapDetectionService - Detects bull and bear traps using multiple signals
 * 
 * Bull Trap: False breakout above resistance with low volume/momentum
 * Bear Trap: False breakdown below support with hidden accumulation
 */
export class TrapDetectionService implements ITrapDetectionService {
  private config: TrapConfig;
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;

  constructor(
    private marketDataService: IMarketDataService,
    private analysisService: IAnalysisService,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('TrapDetectionService');
    this.performanceMonitor = new PerformanceMonitor();
    
    // Default configuration
    this.config = {
      sensitivity: 'medium',
      volumeThreshold: 0.75,        // 75% of average volume required
      orderbookDepthRatio: 0.30,    // 30% minimum depth ratio
      timeWindowMinutes: 240,       // 4 hours analysis window
      minimumBreakout: 0.2,         // 0.2% minimum breakout to analyze
      confidenceThreshold: 60       // 60% confidence threshold for alerts
    };
  }

  /**
   * Detect bull trap (false breakout above resistance)
   */
  async detectBullTrap(symbol: string, sensitivity: 'low' | 'medium' | 'high' = 'medium'): Promise<TrapDetectionResult> {
    return this.performanceMonitor.measure('detectBullTrap', async () => {
      try {
        this.logger.info(`Detecting bull trap for ${symbol} with ${sensitivity} sensitivity`);
        
        // First, validate if there's a breakout situation
        const breakoutContext = await this.validateBreakout(symbol);
        if (!breakoutContext || breakoutContext.breakoutDirection !== 'up') {
          return {
            hasTrap: false,
            breakoutContext: breakoutContext || await this.createEmptyBreakoutContext(symbol)
          };
        }

        // Analyze trap signals
        const analysis = await this.analyzeBullTrapSignals(symbol, breakoutContext, sensitivity);
        
        return {
          hasTrap: analysis.actionable,
          analysis: analysis.actionable ? analysis : undefined,
          breakoutContext,
          nextAnalysisTime: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        };

      } catch (error) {
        this.logger.error('Error detecting bull trap:', error);
        throw error;
      }
    });
  }

  /**
   * Detect bear trap (false breakdown below support)
   */
  async detectBearTrap(symbol: string, sensitivity: 'low' | 'medium' | 'high' = 'medium'): Promise<TrapDetectionResult> {
    return this.performanceMonitor.measure('detectBearTrap', async () => {
      try {
        this.logger.info(`Detecting bear trap for ${symbol} with ${sensitivity} sensitivity`);
        
        // Validate breakout situation
        const breakoutContext = await this.validateBreakout(symbol);
        if (!breakoutContext || breakoutContext.breakoutDirection !== 'down') {
          return {
            hasTrap: false,
            breakoutContext: breakoutContext || await this.createEmptyBreakoutContext(symbol)
          };
        }

        // Analyze trap signals
        const analysis = await this.analyzeBearTrapSignals(symbol, breakoutContext, sensitivity);
        
        return {
          hasTrap: analysis.actionable,
          analysis: analysis.actionable ? analysis : undefined,
          breakoutContext,
          nextAnalysisTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };

      } catch (error) {
        this.logger.error('Error detecting bear trap:', error);
        throw error;
      }
    });
  }

  /**
   * Analyze bull trap signals
   */
  private async analyzeBullTrapSignals(
    symbol: string, 
    breakoutContext: BreakoutContext, 
    sensitivity: string
  ): Promise<TrapAnalysis> {
    const triggers: TrapTrigger[] = [];
    let probability = 0;
    const currentPrice = breakoutContext.breakoutPrice;

    // 1. Volume Analysis - Key signal for bull traps
    const volumeRatio = breakoutContext.volumeAtBreakout / breakoutContext.avgVolume;
    if (volumeRatio < this.getSensitivityThreshold(sensitivity, 'volume')) {
      const weight = 35;
      triggers.push({
        type: 'VOLUME',
        description: `Breakout with ${(volumeRatio * 100).toFixed(0)}% of average volume`,
        weight,
        value: volumeRatio,
        threshold: this.getSensitivityThreshold(sensitivity, 'volume'),
        timestamp: Date.now()
      });
      probability += weight;
    }

    // 2. Orderbook Depth Analysis
    const orderbook = await this.marketDataService.getOrderbook(symbol);
    const depthRatio = this.calculateDepthAboveLevel(orderbook, breakoutContext.level.level);
    if (depthRatio < this.config.orderbookDepthRatio) {
      const weight = 25;
      triggers.push({
        type: 'ORDERBOOK',
        description: `Weak orderbook depth (${(depthRatio * 100).toFixed(1)}%) above resistance`,
        weight,
        value: depthRatio,
        threshold: this.config.orderbookDepthRatio,
        timestamp: Date.now()
      });
      probability += weight;
    }

    // 3. Volume Delta Analysis - Selling pressure during breakout
    const volumeDelta = await this.analysisService.analyzeVolumeDelta(symbol, '5', 6);
    const negativeDeltaCount = this.countNegativeDeltas(volumeDelta);
    if (negativeDeltaCount >= 4) { // 4 out of 6 candles with selling pressure
      const weight = 20;
      triggers.push({
        type: 'DIVERGENCE',
        description: `${negativeDeltaCount}/6 candles show selling pressure during breakout`,
        weight,
        value: negativeDeltaCount,
        threshold: 4,
        timestamp: Date.now()
      });
      probability += weight;
    }

    // 4. Momentum Analysis - Weak momentum on breakout
    const klines = await this.marketDataService.getKlines(symbol, '15', 10);
    const momentum = this.calculateMomentum(klines);
    if (momentum < 0.1) {
      const weight = 15;
      triggers.push({
        type: 'MOMENTUM',
        description: `Weak breakout momentum: ${(momentum * 100).toFixed(1)}%`,
        weight,
        value: momentum,
        threshold: 0.1,
        timestamp: Date.now()
      });
      probability += weight;
    }

    // 5. Price Action - Already showing weakness
    const priceWeakness = this.analyzePriceWeakness(klines, breakoutContext.level.level);
    if (priceWeakness.isWeak) {
      const weight = 10;
      triggers.push({
        type: 'PRICE_ACTION',
        description: priceWeakness.description,
        weight,
        value: priceWeakness.value,
        threshold: priceWeakness.threshold,
        timestamp: Date.now()
      });
      probability += weight;
    }

    // Calculate targets and time window
    const targets = this.calculateBullTrapTargets(breakoutContext);
    const timeWindow = this.calculateTimeWindow(triggers);
    const confidence = Math.min(triggers.length * 20, 100);
    
    return {
      symbol,
      trapType: 'bull_trap',
      probability: Math.min(probability, 95),
      confidence,
      triggers,
      priceTargets: targets,
      timeWindow,
      riskLevel: probability > 70 ? 'HIGH' : probability > 40 ? 'MEDIUM' : 'LOW',
      actionable: probability >= this.config.confidenceThreshold && triggers.length >= 3,
      keyLevel: breakoutContext.level.level,
      currentPrice,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze bear trap signals
   */
  private async analyzeBearTrapSignals(
    symbol: string, 
    breakoutContext: BreakoutContext, 
    sensitivity: string
  ): Promise<TrapAnalysis> {
    const triggers: TrapTrigger[] = [];
    let probability = 0;
    const currentPrice = breakoutContext.breakoutPrice;

    // 1. Volume Analysis - Insufficient volume on breakdown
    const volumeRatio = breakoutContext.volumeAtBreakout / breakoutContext.avgVolume;
    if (volumeRatio < this.getSensitivityThreshold(sensitivity, 'volume_bear')) {
      const weight = 30;
      triggers.push({
        type: 'VOLUME',
        description: `Breakdown with only ${(volumeRatio * 100).toFixed(0)}% of average volume`,
        weight,
        value: volumeRatio,
        threshold: this.getSensitivityThreshold(sensitivity, 'volume_bear'),
        timestamp: Date.now()
      });
      probability += weight;
    }

    // 2. Volume Delta - Accumulation during breakdown
    const volumeDelta = await this.analysisService.analyzeVolumeDelta(symbol, '5', 6);
    const positiveDeltaCount = this.countPositiveDeltas(volumeDelta);
    if (positiveDeltaCount >= 3) { // Hidden buying
      const weight = 35;
      triggers.push({
        type: 'DIVERGENCE',
        description: `Hidden accumulation: ${positiveDeltaCount}/6 candles show buying during breakdown`,
        weight,
        value: positiveDeltaCount,
        threshold: 3,
        timestamp: Date.now()
      });
      probability += weight;
    }

    // 3. Orderbook Analysis - Large walls below support
    const orderbook = await this.marketDataService.getOrderbook(symbol);
    const wallsBelow = this.detectLargeWallsBelow(orderbook, breakoutContext.level.level);
    if (wallsBelow.count > 0) {
      const weight = 25;
      triggers.push({
        type: 'ORDERBOOK',
        description: `${wallsBelow.count} large walls below support level`,
        weight,
        value: wallsBelow.totalSize,
        threshold: wallsBelow.avgSize * 2,
        timestamp: Date.now()
      });
      probability += weight;
    }

    // 4. Historical Level Strength - Strong support level
    const levelStrength = breakoutContext.level.strength;
    if (levelStrength > 75) {
      const weight = 15;
      triggers.push({
        type: 'PRICE_ACTION',
        description: `Breaking very strong support (${levelStrength}% strength)`,
        weight,
        value: levelStrength,
        threshold: 75,
        timestamp: Date.now()
      });
      probability += weight;
    }

    // Calculate targets and analysis
    const targets = this.calculateBearTrapTargets(breakoutContext);
    const timeWindow = this.calculateTimeWindow(triggers);
    const confidence = Math.min(triggers.length * 20, 100);
    
    return {
      symbol,
      trapType: 'bear_trap',
      probability: Math.min(probability, 95),
      confidence,
      triggers,
      priceTargets: targets,
      timeWindow,
      riskLevel: probability > 70 ? 'HIGH' : probability > 40 ? 'MEDIUM' : 'LOW',
      actionable: probability >= this.config.confidenceThreshold && triggers.length >= 3,
      keyLevel: breakoutContext.level.level,
      currentPrice,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate if there's a breakout situation worthy of analysis
   */
  async validateBreakout(symbol: string): Promise<BreakoutContext | null> {
    try {
      // Get current market data
      const ticker = await this.marketDataService.getTicker(symbol);
      const currentPrice = ticker.lastPrice;
      
      // Get support/resistance levels
      const srAnalysis = await this.analysisService.identifySupportResistance(symbol, '15', 100, 2);
      
      // Find the most relevant level being tested
      const relevantLevel = this.findMostRelevantLevel(currentPrice, srAnalysis.supports, srAnalysis.resistances);
      if (!relevantLevel) {
        return null;
      }

      // Check if there's actually a breakout (minimum threshold)
      const breakoutPercent = Math.abs((currentPrice - relevantLevel.level) / relevantLevel.level * 100);
      if (breakoutPercent < this.config.minimumBreakout) {
        return null;
      }

      // Get volume data
      const klines = await this.marketDataService.getKlines(symbol, '15', 20);
      const currentVolume = klines[klines.length - 1]?.volume || 0;
      const avgVolume = klines.slice(-10).reduce((sum, k) => sum + k.volume, 0) / 10;

      return {
        symbol,
        level: relevantLevel,
        breakoutPrice: currentPrice,
        breakoutTime: new Date().toISOString(),
        breakoutDirection: currentPrice > relevantLevel.level ? 'up' : 'down',
        volumeAtBreakout: currentVolume,
        avgVolume,
        priceChange: breakoutPercent,
        timeFromLevel: this.calculateTimeFromLevel(relevantLevel)
      };

    } catch (error) {
      this.logger.error('Error validating breakout:', error);
      return null;
    }
  }

  /**
   * Get trap history for backtesting and analysis
   */
  async getTrapHistory(symbol: string, days: number, trapType?: 'bull' | 'bear' | 'both'): Promise<TrapEvent[]> {
    // This would typically read from storage
    // For now, return empty array - would be implemented with storage service
    this.logger.info(`Getting trap history for ${symbol} (${days} days, type: ${trapType})`);
    return [];
  }

  /**
   * Get trap statistics for performance analysis
   */
  async getTrapStatistics(symbol: string, period: string): Promise<TrapStatistics> {
    // Mock statistics - would be calculated from historical data
    return {
      symbol,
      period,
      totalTrapsDetected: 0,
      bullTraps: 0,
      bearTraps: 0,
      accuracy: 0,
      falsePositives: 0,
      avgDetectionTime: 0,
      mostCommonTriggers: [],
      profitability: {
        totalTrades: 0,
        profitableTrades: 0,
        avgReturn: 0,
        maxDrawdown: 0
      }
    };
  }

  /**
   * Configure trap detection parameters
   */
  async configureTrapDetection(config: Partial<TrapConfig>): Promise<TrapConfig> {
    this.config = { ...this.config, ...config };
    this.logger.info('Trap detection configuration updated:', this.config);
    return this.config;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async createEmptyBreakoutContext(symbol: string): Promise<BreakoutContext> {
    const ticker = await this.marketDataService.getTicker(symbol);
    return {
      symbol,
      level: {
        level: ticker.lastPrice,
        type: 'resistance',
        strength: 0,
        touches: 0,
        volumeConfirmation: 0,
        lastTouchTime: new Date().toISOString(),
        priceDistance: 0,
        confidence: 'weak'
      },
      breakoutPrice: ticker.lastPrice,
      breakoutTime: new Date().toISOString(),
      breakoutDirection: 'up',
      volumeAtBreakout: 0,
      avgVolume: 0,
      priceChange: 0,
      timeFromLevel: 0
    };
  }

  private findMostRelevantLevel(currentPrice: number, supports: SupportResistanceLevel[], resistances: SupportResistanceLevel[]): SupportResistanceLevel | null {
    const allLevels = [...supports, ...resistances];
    
    // Sort by proximity to current price
    allLevels.sort((a, b) => 
      Math.abs(a.level - currentPrice) - Math.abs(b.level - currentPrice)
    );

    // Find the closest level that's actually being tested (within 0.5%)
    for (const level of allLevels) {
      const distance = Math.abs((level.level - currentPrice) / currentPrice * 100);
      if (distance <= 0.5) {
        return level;
      }
    }

    return null;
  }

  private calculateDepthAboveLevel(orderbook: Orderbook, level: number): number {
    const relevantAsks = orderbook.asks.filter(ask => ask.price > level);
    const totalAskDepth = relevantAsks.reduce((sum, ask) => sum + ask.size, 0);
    const totalBidDepth = orderbook.bids.reduce((sum, bid) => sum + bid.size, 0);
    
    return totalAskDepth / (totalAskDepth + totalBidDepth);
  }

  private countNegativeDeltas(volumeDelta: VolumeDelta): number {
    // This would analyze the individual candle deltas
    // For now, use the overall bias
    return volumeDelta.bias === 'seller' ? 4 : volumeDelta.bias === 'neutral' ? 2 : 1;
  }

  private countPositiveDeltas(volumeDelta: VolumeDelta): number {
    return volumeDelta.bias === 'buyer' ? 4 : volumeDelta.bias === 'neutral' ? 2 : 1;
  }

  private calculateMomentum(klines: OHLCV[]): number {
    if (klines.length < 3) return 0;
    
    const recent = klines.slice(-3);
    const priceChanges = recent.map((k, i) => 
      i > 0 ? (k.close - recent[i-1].close) / recent[i-1].close : 0
    ).slice(1);
    
    return priceChanges.reduce((sum, change) => sum + Math.abs(change), 0) / priceChanges.length;
  }

  private analyzePriceWeakness(klines: OHLCV[], level: number): { isWeak: boolean; description: string; value: number; threshold: number } {
    if (klines.length < 2) {
      return { isWeak: false, description: 'Insufficient data', value: 0, threshold: 0 };
    }

    const lastCandle = klines[klines.length - 1];
    const prevCandle = klines[klines.length - 2];
    
    // Check for immediate weakness after breakout
    const isRed = lastCandle.close < lastCandle.open;
    const hasLongWick = (lastCandle.high - lastCandle.close) / lastCandle.close > 0.002;
    const volumeDecline = lastCandle.volume < prevCandle.volume;
    
    if (isRed && hasLongWick && volumeDecline) {
      return {
        isWeak: true,
        description: 'Red candle with long upper wick after breakout',
        value: (lastCandle.high - lastCandle.close) / lastCandle.close,
        threshold: 0.002
      };
    }

    return { isWeak: false, description: 'No immediate weakness', value: 0, threshold: 0 };
  }

  private detectLargeWallsBelow(orderbook: Orderbook, level: number): { count: number; totalSize: number; avgSize: number } {
    const relevantBids = orderbook.bids.filter(bid => bid.price < level);
    const avgSize = relevantBids.reduce((sum, bid) => sum + bid.size, 0) / relevantBids.length;
    const largeWalls = relevantBids.filter(bid => bid.size > avgSize * 2);
    
    return {
      count: largeWalls.length,
      totalSize: largeWalls.reduce((sum, wall) => sum + wall.size, 0),
      avgSize
    };
  }

  private calculateBullTrapTargets(context: BreakoutContext): number[] {
    const keyLevel = context.level.level;
    return [
      keyLevel,                     // Return to resistance
      keyLevel * 0.995,            // Below resistance
      keyLevel * 0.985             // Next potential support
    ];
  }

  private calculateBearTrapTargets(context: BreakoutContext): number[] {
    const keyLevel = context.level.level;
    return [
      keyLevel,                     // Return to support
      keyLevel * 1.005,            // Above support
      keyLevel * 1.015             // Next potential resistance
    ];
  }

  private calculateTimeWindow(triggers: TrapTrigger[]): string {
    const highPriorityTriggers = triggers.filter(t => t.weight >= 25).length;
    
    if (highPriorityTriggers >= 2) {
      return '15-60 minutes';
    } else if (triggers.length >= 3) {
      return '1-4 hours';
    } else {
      return '2-8 hours';
    }
  }

  private calculateTimeFromLevel(level: SupportResistanceLevel): number {
    const lastTouch = new Date(level.lastTouchTime);
    const now = new Date();
    return Math.floor((now.getTime() - lastTouch.getTime()) / (1000 * 60)); // minutes
  }

  private getSensitivityThreshold(sensitivity: string, type: string): number {
    const thresholds = {
      volume: { low: 0.6, medium: 0.75, high: 0.9 },
      volume_bear: { low: 0.7, medium: 0.85, high: 1.0 }
    };

    return thresholds[type as keyof typeof thresholds]?.[sensitivity as keyof typeof thresholds.volume] || 0.75;
  }
}
