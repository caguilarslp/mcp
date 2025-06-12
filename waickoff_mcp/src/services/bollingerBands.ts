/**
 * @fileoverview Bollinger Bands Analysis Service
 * @description Advanced Bollinger Bands analysis with squeeze detection and divergences
 * @version 1.0.0
 * @author wAIckoff MCP Team
 */

import { OHLCV, MarketTicker } from '../types/index.js';
import { BybitMarketDataService } from './marketData.js';
import { Logger } from '../utils/logger.js';

export interface BollingerBands {
  upper: number;
  middle: number;    // SMA
  lower: number;
  bandwidth: number; // (upper - lower) / middle * 100
  position: number;  // Where price is within bands (0-100)
}

export interface BollingerSqueeze {
  isActive: boolean;
  duration: number;           // How many periods squeeze has been active
  intensity: number;          // 0-100 (100 = tightest squeeze)
  breakoutProbability: number; // 0-100 likelihood of breakout
  expectedDirection?: 'up' | 'down' | 'unknown';
}

export interface BollingerWalk {
  isWalking: boolean;
  direction: 'upper' | 'lower' | 'none';
  duration: number;           // Periods of walking
  strength: 'weak' | 'moderate' | 'strong';
  integrityBreaches: number; // How many times price left the band
}

export interface BollingerDivergence {
  type: 'bullish' | 'bearish' | 'none';
  strength: number;          // 0-100
  periods: number;           // How many periods divergence has been building
  confirmation: boolean;     // Whether divergence is confirmed
}

export interface BollingerPattern {
  type: 'squeeze_setup' | 'breakout' | 'reversal' | 'trend_continuation' | 'consolidation';
  confidence: number;        // 0-100
  description: string;
  actionable: boolean;       // Whether pattern provides trading signal
  targetPrice?: number;      // Expected target if available
  stopLoss?: number;         // Suggested stop loss
}

export interface BollingerAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  
  // Current Bollinger Bands values
  currentBands: BollingerBands;
  
  // Historical band analysis
  bandHistory: BollingerBands[];
  
  // Squeeze analysis
  squeeze: BollingerSqueeze;
  
  // Walking the bands analysis
  walk: BollingerWalk;
  
  // Divergence analysis
  divergence: BollingerDivergence;
  
  // Pattern recognition
  pattern: BollingerPattern;
  
  // Volatility analysis
  volatility: {
    current: number;        // Current volatility percentile
    trend: 'expanding' | 'contracting' | 'stable';
    extremes: {
      isAtLow: boolean;     // At historical low volatility
      isAtHigh: boolean;    // At historical high volatility
    };
  };
  
  // Trading signals
  signals: {
    signal: 'buy' | 'sell' | 'hold' | 'wait';
    strength: number;       // 0-100
    reasoning: string;
    confluence: string[];   // Other indicators supporting signal
  };
  
  // Analysis metadata
  analysisTime: string;
  period: number;           // Bollinger Bands period used
  standardDeviation: number; // Standard deviation multiplier used
  confidence: number;       // Overall analysis confidence
}

export interface BollingerConfig {
  period: number;              // Default 20
  standardDeviation: number;   // Default 2.0
  squeezePeriods: number;      // Periods to confirm squeeze
  walkingPeriods: number;      // Periods to confirm walking
  volatilityLookback: number;  // Periods for volatility analysis
  divergencePeriods: number;   // Periods for divergence detection
}

export class BollingerBandsService {
  private readonly logger = new Logger('BollingerBandsService');
  private readonly defaultConfig: BollingerConfig = {
    period: 20,
    standardDeviation: 2.0,
    squeezePeriods: 5,
    walkingPeriods: 3,
    volatilityLookback: 100,
    divergencePeriods: 14
  };

  constructor(
    private readonly marketDataService: BybitMarketDataService,
    private config: BollingerConfig = {} as BollingerConfig
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Perform comprehensive Bollinger Bands analysis
   */
  async analyzeBollingerBands(
    symbol: string,
    timeframe: string = '60',
    customConfig?: Partial<BollingerConfig>
  ): Promise<BollingerAnalysis> {
    const startTime = performance.now();
    
    try {
      const config = { ...this.config, ...customConfig };
      
      // Get price data - need extra periods for calculations
      const requiredPeriods = Math.max(config.volatilityLookback, 200);
      const klines = await this.marketDataService.getKlines(
        symbol, 
        timeframe, 
        requiredPeriods
      );
      
      if (klines.length < config.period + 20) {
        throw new Error(`Insufficient data for Bollinger analysis: ${klines.length} periods`);
      }

      const ticker = await this.marketDataService.getTicker(symbol);
      
      // Calculate Bollinger Bands for all periods
      const bandHistory = this.calculateBollingerBands(klines, config);
      const currentBands = bandHistory[bandHistory.length - 1];
      
      // Analyze squeeze conditions
      const squeeze = this.analyzeSqueeze(bandHistory, config);
      
      // Analyze walking the bands
      const walk = this.analyzeWalking(klines, bandHistory, config);
      
      // Detect divergences
      const divergence = this.analyzeDivergence(klines, bandHistory, config);
      
      // Volatility analysis
      const volatility = this.analyzeVolatility(bandHistory, config);
      
      // Pattern recognition
      const pattern = this.recognizePattern(
        klines, 
        bandHistory, 
        squeeze, 
        walk, 
        divergence, 
        volatility
      );
      
      // Generate trading signals
      const signals = this.generateSignals(
        ticker.lastPrice,
        currentBands,
        squeeze,
        walk,
        divergence,
        pattern,
        volatility
      );
      
      // Calculate overall confidence
      const confidence = this.calculateConfidence(
        squeeze,
        walk,
        divergence,
        pattern,
        bandHistory.length
      );

      const analysis: BollingerAnalysis = {
        symbol,
        timeframe,
        currentPrice: ticker.lastPrice,
        currentBands,
        bandHistory: bandHistory.slice(-50), // Last 50 periods for history
        squeeze,
        walk,
        divergence,
        pattern,
        volatility,
        signals,
        analysisTime: new Date().toISOString(),
        period: config.period,
        standardDeviation: config.standardDeviation,
        confidence
      };

      const executionTime = performance.now() - startTime;
      this.logger.info(`Bollinger Bands analysis completed for ${symbol} in ${executionTime.toFixed(2)}ms`);
      
      return analysis;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.logger.error(`Bollinger Bands analysis failed for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
        executionTime: executionTime.toFixed(2)
      });
      throw error;
    }
  }

  /**
   * Calculate Bollinger Bands for price data
   */
  private calculateBollingerBands(klines: OHLCV[], config: BollingerConfig): BollingerBands[] {
    const bands: BollingerBands[] = [];
    
    for (let i = config.period - 1; i < klines.length; i++) {
      // Get period data for SMA and standard deviation
      const periodPrices = klines.slice(i - config.period + 1, i + 1).map(k => k.close);
      
      // Calculate Simple Moving Average (middle band)
      const middle = periodPrices.reduce((sum, price) => sum + price, 0) / periodPrices.length;
      
      // Calculate Standard Deviation
      const variance = periodPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / periodPrices.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate upper and lower bands
      const upper = middle + (stdDev * config.standardDeviation);
      const lower = middle - (stdDev * config.standardDeviation);
      
      // Calculate bandwidth (volatility measure)
      const bandwidth = ((upper - lower) / middle) * 100;
      
      // Calculate price position within bands
      const currentPrice = klines[i].close;
      const position = ((currentPrice - lower) / (upper - lower)) * 100;
      
      bands.push({
        upper,
        middle,
        lower,
        bandwidth,
        position: Math.max(0, Math.min(100, position))
      });
    }
    
    return bands;
  }

  /**
   * Analyze squeeze conditions
   */
  private analyzeSqueeze(bandHistory: BollingerBands[], config: BollingerConfig): BollingerSqueeze {
    if (bandHistory.length < config.squeezePeriods + 20) {
      return {
        isActive: false,
        duration: 0,
        intensity: 0,
        breakoutProbability: 0
      };
    }

    // Calculate historical bandwidth percentiles
    const bandwidths = bandHistory.map(b => b.bandwidth);
    const sortedBandwidths = [...bandwidths].sort((a, b) => a - b);
    const percentile20 = sortedBandwidths[Math.floor(sortedBandwidths.length * 0.2)];
    const currentBandwidth = bandwidths[bandwidths.length - 1];
    
    // Squeeze is active when bandwidth is in bottom 20%
    const isActive = currentBandwidth <= percentile20;
    
    // Calculate squeeze duration
    let duration = 0;
    for (let i = bandwidths.length - 1; i >= 0 && bandwidths[i] <= percentile20; i--) {
      duration++;
    }
    
    // Calculate intensity (how tight the squeeze is)
    const minBandwidth = sortedBandwidths[0];
    const intensity = isActive ? 
      Math.min(100, ((percentile20 - currentBandwidth) / (percentile20 - minBandwidth)) * 100) : 0;
    
    // Breakout probability increases with duration and intensity
    let breakoutProbability = 0;
    if (isActive) {
      breakoutProbability = Math.min(100, (duration * 5) + (intensity * 0.5));
    }
    
    // Try to predict direction based on price action within bands
    let expectedDirection: 'up' | 'down' | 'unknown' = 'unknown';
    if (isActive && bandHistory.length >= 10) {
      const recentPositions = bandHistory.slice(-10).map(b => b.position);
      const avgPosition = recentPositions.reduce((sum, pos) => sum + pos, 0) / recentPositions.length;
      
      if (avgPosition > 60) {
        expectedDirection = 'up';
      } else if (avgPosition < 40) {
        expectedDirection = 'down';
      }
    }

    return {
      isActive,
      duration,
      intensity,
      breakoutProbability,
      expectedDirection
    };
  }

  /**
   * Analyze walking the bands pattern
   */
  private analyzeWalking(
    klines: OHLCV[], 
    bandHistory: BollingerBands[], 
    config: BollingerConfig
  ): BollingerWalk {
    if (bandHistory.length < config.walkingPeriods + 5) {
      return {
        isWalking: false,
        direction: 'none',
        duration: 0,
        strength: 'weak',
        integrityBreaches: 0
      };
    }

    const recentBands = bandHistory.slice(-config.walkingPeriods);
    const recentKlines = klines.slice(klines.length - config.walkingPeriods);
    
    // Check for upper band walking
    let upperWalking = true;
    let lowerWalking = true;
    let upperBreaches = 0;
    let lowerBreaches = 0;
    
    for (let i = 0; i < recentBands.length; i++) {
      const price = recentKlines[i].close;
      const bands = recentBands[i];
      
      // For upper walking, price should stay near or above upper band
      if (price < bands.upper * 0.98) { // Allow 2% tolerance
        upperWalking = false;
      }
      if (price < bands.upper) {
        upperBreaches++;
      }
      
      // For lower walking, price should stay near or below lower band
      if (price > bands.lower * 1.02) { // Allow 2% tolerance
        lowerWalking = false;
      }
      if (price > bands.lower) {
        lowerBreaches++;
      }
    }
    
    let isWalking = false;
    let direction: 'upper' | 'lower' | 'none' = 'none';
    let integrityBreaches = 0;
    
    if (upperWalking) {
      isWalking = true;
      direction = 'upper';
      integrityBreaches = upperBreaches;
    } else if (lowerWalking) {
      isWalking = true;
      direction = 'lower';
      integrityBreaches = lowerBreaches;
    }
    
    // Calculate duration if walking
    let duration = 0;
    if (isWalking) {
      const targetBand = direction === 'upper' ? 'upper' : 'lower';
      
      for (let i = bandHistory.length - 1; i >= 0; i--) {
        const price = klines[klines.length - (bandHistory.length - i)].close;
        const bands = bandHistory[i];
        
        const isNearBand = targetBand === 'upper' ? 
          price >= bands.upper * 0.98 : 
          price <= bands.lower * 1.02;
        
        if (isNearBand) {
          duration++;
        } else {
          break;
        }
      }
    }
    
    // Determine strength based on duration and integrity
    let strength: 'weak' | 'moderate' | 'strong' = 'weak';
    if (isWalking) {
      const integrityPercent = (1 - integrityBreaches / config.walkingPeriods) * 100;
      
      if (duration >= 10 && integrityPercent > 80) {
        strength = 'strong';
      } else if (duration >= 5 && integrityPercent > 60) {
        strength = 'moderate';
      }
    }

    return {
      isWalking,
      direction,
      duration,
      strength,
      integrityBreaches
    };
  }

  /**
   * Analyze price-band divergences
   */
  private analyzeDivergence(
    klines: OHLCV[], 
    bandHistory: BollingerBands[], 
    config: BollingerConfig
  ): BollingerDivergence {
    if (bandHistory.length < config.divergencePeriods + 10) {
      return {
        type: 'none',
        strength: 0,
        periods: 0,
        confirmation: false
      };
    }

    const lookbackPeriods = Math.min(config.divergencePeriods, bandHistory.length - 5);
    const recentKlines = klines.slice(-lookbackPeriods);
    const recentBands = bandHistory.slice(-lookbackPeriods);
    
    // Find price highs/lows and corresponding band positions
    const priceHighs: { index: number; price: number; position: number }[] = [];
    const priceLows: { index: number; price: number; position: number }[] = [];
    
    for (let i = 2; i < recentKlines.length - 2; i++) {
      const current = recentKlines[i];
      const isHigh = recentKlines[i-1].high < current.high && 
                     recentKlines[i+1].high < current.high &&
                     recentKlines[i-2].high < current.high && 
                     recentKlines[i+2].high < current.high;
      
      const isLow = recentKlines[i-1].low > current.low && 
                    recentKlines[i+1].low > current.low &&
                    recentKlines[i-2].low > current.low && 
                    recentKlines[i+2].low > current.low;
      
      if (isHigh) {
        priceHighs.push({
          index: i,
          price: current.high,
          position: recentBands[i].position
        });
      }
      
      if (isLow) {
        priceLows.push({
          index: i,
          price: current.low,
          position: recentBands[i].position
        });
      }
    }
    
    let divergenceType: 'bullish' | 'bearish' | 'none' = 'none';
    let strength = 0;
    let periods = 0;
    let confirmation = false;
    
    // Check for bearish divergence (higher highs in price, lower positions in bands)
    if (priceHighs.length >= 2) {
      const lastTwo = priceHighs.slice(-2);
      if (lastTwo[1].price > lastTwo[0].price && lastTwo[1].position < lastTwo[0].position) {
        divergenceType = 'bearish';
        strength = Math.min(100, (lastTwo[0].position - lastTwo[1].position) * 2);
        periods = lastTwo[1].index - lastTwo[0].index;
        
        // Confirmation if recent price shows weakness
        const recentPrice = recentKlines[recentKlines.length - 1].close;
        confirmation = recentPrice < lastTwo[1].price * 0.98;
      }
    }
    
    // Check for bullish divergence (lower lows in price, higher positions in bands)
    if (priceLows.length >= 2 && divergenceType === 'none') {
      const lastTwo = priceLows.slice(-2);
      if (lastTwo[1].price < lastTwo[0].price && lastTwo[1].position > lastTwo[0].position) {
        divergenceType = 'bullish';
        strength = Math.min(100, (lastTwo[1].position - lastTwo[0].position) * 2);
        periods = lastTwo[1].index - lastTwo[0].index;
        
        // Confirmation if recent price shows strength
        const recentPrice = recentKlines[recentKlines.length - 1].close;
        confirmation = recentPrice > lastTwo[1].price * 1.02;
      }
    }

    return {
      type: divergenceType,
      strength,
      periods,
      confirmation
    };
  }

  /**
   * Analyze volatility patterns
   */
  private analyzeVolatility(
    bandHistory: BollingerBands[], 
    config: BollingerConfig
  ): BollingerAnalysis['volatility'] {
    const lookback = Math.min(config.volatilityLookback, bandHistory.length);
    const recentBandwidths = bandHistory.slice(-lookback).map(b => b.bandwidth);
    const currentBandwidth = recentBandwidths[recentBandwidths.length - 1];
    
    // Calculate percentile of current volatility
    const sortedBandwidths = [...recentBandwidths].sort((a, b) => a - b);
    let percentileRank = 0;
    for (let i = 0; i < sortedBandwidths.length; i++) {
      if (sortedBandwidths[i] <= currentBandwidth) {
        percentileRank = (i / sortedBandwidths.length) * 100;
      }
    }
    
    // Determine trend
    const recentTrend = recentBandwidths.slice(-10);
    const firstHalf = recentTrend.slice(0, 5).reduce((sum, b) => sum + b, 0) / 5;
    const secondHalf = recentTrend.slice(5).reduce((sum, b) => sum + b, 0) / 5;
    
    let trend: 'expanding' | 'contracting' | 'stable';
    const change = (secondHalf - firstHalf) / firstHalf * 100;
    
    if (Math.abs(change) < 5) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'expanding';
    } else {
      trend = 'contracting';
    }
    
    // Check for extremes
    const isAtLow = percentileRank <= 20;
    const isAtHigh = percentileRank >= 80;

    return {
      current: percentileRank,
      trend,
      extremes: {
        isAtLow,
        isAtHigh
      }
    };
  }

  /**
   * Recognize Bollinger Band patterns
   */
  private recognizePattern(
    klines: OHLCV[],
    bandHistory: BollingerBands[],
    squeeze: BollingerSqueeze,
    walk: BollingerWalk,
    divergence: BollingerDivergence,
    volatility: BollingerAnalysis['volatility']
  ): BollingerPattern {
    let pattern: BollingerPattern;
    
    // Squeeze setup pattern
    if (squeeze.isActive && squeeze.breakoutProbability > 60) {
      pattern = {
        type: 'squeeze_setup',
        confidence: squeeze.breakoutProbability,
        description: `Bollinger squeeze active for ${squeeze.duration} periods. High breakout probability.`,
        actionable: true,
        targetPrice: squeeze.expectedDirection === 'up' ? 
          bandHistory[bandHistory.length - 1].upper * 1.02 :
          squeeze.expectedDirection === 'down' ?
          bandHistory[bandHistory.length - 1].lower * 0.98 : undefined
      };
    }
    // Walking the bands pattern
    else if (walk.isWalking && walk.strength !== 'weak') {
      pattern = {
        type: 'trend_continuation',
        confidence: walk.strength === 'strong' ? 80 : 60,
        description: `Price walking the ${walk.direction} band for ${walk.duration} periods. Strong trend.`,
        actionable: walk.strength === 'strong',
        targetPrice: walk.direction === 'upper' ?
          bandHistory[bandHistory.length - 1].upper * 1.05 :
          bandHistory[bandHistory.length - 1].lower * 0.95
      };
    }
    // Divergence reversal pattern
    else if (divergence.type !== 'none' && divergence.confirmation && divergence.strength > 50) {
      pattern = {
        type: 'reversal',
        confidence: divergence.strength,
        description: `${divergence.type} divergence confirmed. Potential reversal signal.`,
        actionable: true,
        targetPrice: divergence.type === 'bullish' ?
          bandHistory[bandHistory.length - 1].middle * 1.03 :
          bandHistory[bandHistory.length - 1].middle * 0.97
      };
    }
    // Volatility extremes
    else if (volatility.extremes.isAtLow && volatility.trend === 'contracting') {
      pattern = {
        type: 'consolidation',
        confidence: 70,
        description: 'Volatility at historical lows. Expect breakout soon.',
        actionable: false
      };
    }
    // Default consolidation
    else {
      pattern = {
        type: 'consolidation',
        confidence: 40,
        description: 'No clear Bollinger pattern detected. Market in consolidation.',
        actionable: false
      };
    }

    return pattern;
  }

  /**
   * Generate trading signals based on all analyses
   */
  private generateSignals(
    currentPrice: number,
    currentBands: BollingerBands,
    squeeze: BollingerSqueeze,
    walk: BollingerWalk,
    divergence: BollingerDivergence,
    pattern: BollingerPattern,
    volatility: BollingerAnalysis['volatility']
  ): BollingerAnalysis['signals'] {
    let signal: 'buy' | 'sell' | 'hold' | 'wait' = 'hold';
    let strength = 0;
    let reasoning = '';
    let confluence: string[] = [];

    // Priority 1: Squeeze breakout
    if (squeeze.isActive && squeeze.breakoutProbability > 70) {
      if (squeeze.expectedDirection === 'up') {
        signal = 'buy';
        strength = Math.min(90, squeeze.breakoutProbability);
        reasoning = 'Bollinger squeeze with upward bias. High breakout probability.';
        confluence.push('Squeeze breakout');
      } else if (squeeze.expectedDirection === 'down') {
        signal = 'sell';
        strength = Math.min(90, squeeze.breakoutProbability);
        reasoning = 'Bollinger squeeze with downward bias. High breakout probability.';
        confluence.push('Squeeze breakout');
      } else {
        signal = 'wait';
        strength = squeeze.breakoutProbability;
        reasoning = 'Bollinger squeeze active but direction unclear. Wait for breakout.';
      }
    }
    // Priority 2: Walking the bands
    else if (walk.isWalking && walk.strength === 'strong') {
      if (walk.direction === 'upper') {
        signal = 'buy';
        strength = 75;
        reasoning = `Strong uptrend confirmed by ${walk.duration} periods of upper band walking.`;
        confluence.push('Upper band walk');
      } else {
        signal = 'sell';
        strength = 75;
        reasoning = `Strong downtrend confirmed by ${walk.duration} periods of lower band walking.`;
        confluence.push('Lower band walk');
      }
    }
    // Priority 3: Confirmed divergence
    else if (divergence.type !== 'none' && divergence.confirmation) {
      if (divergence.type === 'bullish') {
        signal = 'buy';
        strength = Math.min(80, divergence.strength);
        reasoning = 'Bullish divergence confirmed. Potential upward reversal.';
        confluence.push('Bullish divergence');
      } else {
        signal = 'sell';
        strength = Math.min(80, divergence.strength);
        reasoning = 'Bearish divergence confirmed. Potential downward reversal.';
        confluence.push('Bearish divergence');
      }
    }
    // Priority 4: Band extremes
    else if (currentBands.position <= 5 && volatility.current > 50) {
      signal = 'buy';
      strength = 60;
      reasoning = 'Price at lower band extreme with elevated volatility. Bounce expected.';
      confluence.push('Lower band extreme');
    }
    else if (currentBands.position >= 95 && volatility.current > 50) {
      signal = 'sell';
      strength = 60;
      reasoning = 'Price at upper band extreme with elevated volatility. Pullback expected.';
      confluence.push('Upper band extreme');
    }
    // Default: Hold or wait
    else {
      if (volatility.extremes.isAtLow) {
        signal = 'wait';
        strength = 30;
        reasoning = 'Low volatility environment. Wait for clearer direction.';
      } else {
        signal = 'hold';
        strength = 20;
        reasoning = 'No clear Bollinger signals. Maintain current position.';
      }
    }

    // Add pattern confluence
    if (pattern.actionable && pattern.confidence > 60) {
      confluence.push(`${pattern.type} pattern`);
      strength = Math.min(100, strength + 10);
    }

    return {
      signal,
      strength,
      reasoning,
      confluence
    };
  }

  /**
   * Calculate overall analysis confidence
   */
  private calculateConfidence(
    squeeze: BollingerSqueeze,
    walk: BollingerWalk,
    divergence: BollingerDivergence,
    pattern: BollingerPattern,
    dataLength: number
  ): number {
    let confidence = 0;
    let factors = 0;

    // Data quality factor
    const dataQuality = Math.min(100, (dataLength / 200) * 100);
    confidence += dataQuality * 0.2;
    factors += 0.2;

    // Pattern confidence
    if (pattern.actionable) {
      confidence += pattern.confidence * 0.3;
      factors += 0.3;
    }

    // Squeeze confidence
    if (squeeze.isActive) {
      confidence += squeeze.intensity * 0.2;
      factors += 0.2;
    }

    // Walking confidence
    if (walk.isWalking) {
      const walkConfidence = walk.strength === 'strong' ? 90 : 
                            walk.strength === 'moderate' ? 70 : 40;
      confidence += walkConfidence * 0.15;
      factors += 0.15;
    }

    // Divergence confidence
    if (divergence.type !== 'none') {
      const divConfidence = divergence.confirmation ? divergence.strength : divergence.strength * 0.5;
      confidence += divConfidence * 0.15;
      factors += 0.15;
    }

    // Normalize to actual factors used
    return factors > 0 ? Math.min(100, confidence / factors) : 50;
  }
}
