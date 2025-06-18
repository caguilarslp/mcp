/**
 * @fileoverview Trading Range Analyzer
 * @description Specialized analyzer for trading range detection and quality assessment
 * @version 2.0.0
 */

import type { OHLCV } from '../../../types/index.js';
import type { TradingRange, VolumeContext } from '../core/types.js';

/**
 * Analyzes and detects trading ranges for Wyckoff analysis
 */
export class TradingRangeAnalyzer {

  /**
   * Comprehensive trading range analysis (TASK-030 FASE 3)
   */
  async analyzeTradingRange(
    symbol: string,
    timeframe: string,
    klines: OHLCV[],
    minPeriods: number
  ): Promise<{
    tradingRange: TradingRange | null;
    rangeQuality: 'excellent' | 'good' | 'poor' | 'invalid';
    confidence: number;
    keyLevels: { support: number; resistance: number; midpoint: number };
    volumeCharacteristics: any; // Would be VolumeContext but simplified for now
    recommendations: string[];
  }> {
    // Detect trading range
    const tradingRange = this.identifyTradingRange(klines, minPeriods);
    
    if (!tradingRange) {
      return {
        tradingRange: null,
        rangeQuality: 'invalid',
        confidence: 0,
        keyLevels: { support: 0, resistance: 0, midpoint: 0 },
        volumeCharacteristics: this.createEmptyVolumeContext(),
        recommendations: ['No clear trading range detected']
      };
    }

    // Determine range type based on context
    tradingRange.type = this.determineRangeType(klines, klines.slice(-tradingRange.duration));
    
    // Create simplified volume context (would use VolumeAnalyzer in full integration)
    const volumeContext = this.createBasicVolumeContext(klines);
    
    // Assess range quality
    const quality = this.assessRangeQuality(tradingRange, klines, volumeContext);
    
    return {
      tradingRange,
      rangeQuality: quality.grade,
      confidence: quality.confidence,
      keyLevels: {
        support: tradingRange.support,
        resistance: tradingRange.resistance,
        midpoint: (tradingRange.support + tradingRange.resistance) / 2
      },
      volumeCharacteristics: volumeContext,
      recommendations: quality.recommendations
    };
  }

  /**
   * Identify trading range from klines data
   */
  identifyTradingRange(klines: OHLCV[], minPeriods: number): TradingRange | null {
    if (klines.length < minPeriods) {
      return null;
    }

    // Look for consolidation in the most recent data
    const recentData = klines.slice(-Math.min(klines.length, minPeriods * 2));
    
    // Try multiple range detection methods
    let tradingRange = this.detectByPriceAction(recentData, minPeriods);
    
    if (!tradingRange) {
      tradingRange = this.detectByVolatility(recentData, minPeriods);
    }
    
    if (!tradingRange) {
      tradingRange = this.detectByTrendBreak(klines, recentData, minPeriods);
    }

    return tradingRange;
  }

  /**
   * Assess the quality of a detected trading range
   */
  assessRangeQuality(
    tradingRange: TradingRange,
    klines: OHLCV[],
    volumeContext: VolumeContext
  ): {
    grade: 'excellent' | 'good' | 'poor' | 'invalid';
    confidence: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Range width assessment (25 points)
    maxScore += 25;
    if (tradingRange.width < 5) {
      score += 25;
      recommendations.push('Excellent range width - tight consolidation ideal for Wyckoff analysis');
    } else if (tradingRange.width < 8) {
      score += 20;
      recommendations.push('Very good range width for accumulation/distribution patterns');
    } else if (tradingRange.width < 12) {
      score += 15;
      recommendations.push('Good range width - acceptable for pattern development');
    } else if (tradingRange.width < 18) {
      score += 8;
      recommendations.push('Moderate range width - pattern may be less reliable');
    } else if (tradingRange.width < 25) {
      score += 3;
      recommendations.push('Wide range - lower probability Wyckoff setup');
    } else {
      recommendations.push('Range too wide - not suitable for classic Wyckoff analysis');
    }

    // Duration assessment (20 points)
    maxScore += 20;
    if (tradingRange.duration >= 50) {
      score += 20;
      recommendations.push('Excellent duration - ample time to build substantial cause');
    } else if (tradingRange.duration >= 30) {
      score += 16;
      recommendations.push('Very good duration for cause building and pattern development');
    } else if (tradingRange.duration >= 20) {
      score += 12;
      recommendations.push('Good duration - sufficient for pattern formation');
    } else if (tradingRange.duration >= 15) {
      score += 8;
      recommendations.push('Moderate duration - pattern may need more time to develop');
    } else if (tradingRange.duration >= 10) {
      score += 4;
      recommendations.push('Short duration - early stage pattern, monitor for development');
    } else {
      score += 1;
      recommendations.push('Very short duration - pattern not yet established');
    }

    // Price action containment (20 points)
    maxScore += 20;
    const containmentScore = this.calculateContainmentScore(tradingRange, klines);
    score += Math.round(containmentScore * 0.2);
    
    if (containmentScore >= 90) {
      recommendations.push('Excellent price containment - very disciplined range behavior');
    } else if (containmentScore >= 80) {
      recommendations.push('Good price containment - range boundaries well respected');
    } else if (containmentScore >= 70) {
      recommendations.push('Moderate containment - some boundary violations but generally contained');
    } else {
      recommendations.push('Poor containment - frequent boundary violations reduce pattern reliability');
    }

    // Volume characteristics assessment (20 points)
    maxScore += 20;
    const volumeScore = this.assessVolumeCharacteristics(volumeContext, tradingRange);
    score += volumeScore;
    
    if (volumeScore >= 18) {
      recommendations.push('Excellent volume profile - strong institutional activity signs');
    } else if (volumeScore >= 14) {
      recommendations.push('Good volume characteristics support the range analysis');
    } else if (volumeScore >= 10) {
      recommendations.push('Moderate volume confirmation - some supporting evidence');
    } else {
      recommendations.push('Weak volume confirmation - limited institutional activity evidence');
    }

    // Range position in larger trend (15 points)
    maxScore += 15;
    const positionScore = this.assessRangePosition(tradingRange, klines);
    score += positionScore;
    
    if (positionScore >= 12) {
      recommendations.push('Excellent positioning - range located at key technical levels');
    } else if (positionScore >= 9) {
      recommendations.push('Good positioning supports the range significance');
    } else if (positionScore >= 6) {
      recommendations.push('Moderate positioning - some technical relevance');
    } else {
      recommendations.push('Poor positioning - range not at significant technical levels');
    }

    const confidence = (score / maxScore) * 100;
    
    let grade: 'excellent' | 'good' | 'poor' | 'invalid';
    if (confidence >= 85) {
      grade = 'excellent';
      recommendations.unshift('EXCELLENT: This is a high-quality Wyckoff range with strong institutional characteristics');
    } else if (confidence >= 70) {
      grade = 'good';
      recommendations.unshift('GOOD: This range shows solid Wyckoff characteristics and is tradeable');
    } else if (confidence >= 50) {
      grade = 'poor';
      recommendations.unshift('POOR: Range has some Wyckoff elements but lacks conviction - proceed with caution');
    } else {
      grade = 'invalid';
      recommendations.unshift('INVALID: Range does not meet minimum Wyckoff analysis criteria');
    }

    return { grade, confidence, recommendations };
  }

  /**
   * Determine range type based on context
   */
  determineRangeType(allKlines: OHLCV[], rangeData: OHLCV[]): 'accumulation' | 'distribution' | 'consolidation' {
    // Look at the trend before the range
    const preRangeData = allKlines.slice(0, allKlines.length - rangeData.length);
    if (preRangeData.length < 10) {
      return 'consolidation';
    }

    const preRangeStart = preRangeData[Math.max(0, preRangeData.length - 20)].close;
    const preRangeEnd = preRangeData[preRangeData.length - 1].close;
    const trendChange = ((preRangeEnd - preRangeStart) / preRangeStart) * 100;

    // Check volume characteristics for additional context
    const preRangeVolume = preRangeData.slice(-10).reduce((sum, k) => sum + k.volume, 0) / 10;
    const rangeVolume = rangeData.reduce((sum, k) => sum + k.volume, 0) / rangeData.length;
    const volumeRatio = rangeVolume / preRangeVolume;

    // Strong downtrend before range suggests accumulation
    if (trendChange < -15) {
      return 'accumulation';
    }
    // Strong uptrend before range suggests distribution
    else if (trendChange > 15) {
      return 'distribution';
    }
    // Moderate trends - use volume for additional context
    else if (trendChange < -8 && volumeRatio < 0.8) {
      return 'accumulation'; // Downtrend with decreasing volume
    }
    else if (trendChange > 8 && volumeRatio > 1.2) {
      return 'distribution'; // Uptrend with increasing volume
    }
    else {
      return 'consolidation'; // Sideways or unclear
    }
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  /**
   * Detect range by price action patterns
   */
  private detectByPriceAction(recentData: OHLCV[], minPeriods: number): TradingRange | null {
    // Calculate support and resistance levels using multiple methods
    const support = this.findSupportLevel(recentData);
    const resistance = this.findResistanceLevel(recentData);
    
    if (!support || !resistance || support >= resistance) {
      return null;
    }

    const rangeWidth = ((resistance - support) / support) * 100;
    
    // Check if it's a valid consolidation (not too wide)
    if (rangeWidth > 25) {
      return null; // Too wide to be considered consolidation
    }

    // Count how many periods the price stayed within the range
    const tolerance = rangeWidth * 0.05; // 5% tolerance
    let periodsInRange = 0;
    
    for (const kline of recentData) {
      const adjustedSupport = support * (1 - tolerance / 100);
      const adjustedResistance = resistance * (1 + tolerance / 100);
      
      if (kline.low >= adjustedSupport && kline.high <= adjustedResistance) {
        periodsInRange++;
      }
    }

    // Require at least 60% of periods to be within range
    if (periodsInRange < recentData.length * 0.6) {
      return null;
    }

    return this.createTradingRange(recentData, support, resistance, rangeWidth);
  }

  /**
   * Detect range by volatility compression
   */
  private detectByVolatility(recentData: OHLCV[], minPeriods: number): TradingRange | null {
    if (recentData.length < 20) return null;

    // Calculate rolling volatility
    const volatilities: number[] = [];
    for (let i = 5; i < recentData.length; i++) {
      const period = recentData.slice(i - 5, i);
      const prices = period.map(k => k.close);
      const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
      volatilities.push(Math.sqrt(variance) / mean * 100);
    }

    const recentVolatility = volatilities.slice(-10).reduce((sum, v) => sum + v, 0) / 10;
    const historicalVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;

    // Look for volatility compression (recent vol < 70% of historical)
    if (recentVolatility < historicalVolatility * 0.7) {
      const lows = recentData.map(k => k.low);
      const highs = recentData.map(k => k.high);
      const support = Math.min(...lows);
      const resistance = Math.max(...highs);
      const rangeWidth = ((resistance - support) / support) * 100;

      if (rangeWidth > 0 && rangeWidth < 20) {
        return this.createTradingRange(recentData, support, resistance, rangeWidth);
      }
    }

    return null;
  }

  /**
   * Detect range by trend break analysis
   */
  private detectByTrendBreak(allKlines: OHLCV[], recentData: OHLCV[], minPeriods: number): TradingRange | null {
    if (allKlines.length < 50) return null;

    // Look for trend break followed by sideways movement
    const preRangeData = allKlines.slice(0, allKlines.length - recentData.length);
    const trendData = preRangeData.slice(-20);

    if (trendData.length < 10) return null;

    const trendStart = trendData[0].close;
    const trendEnd = trendData[trendData.length - 1].close;
    const trendStrength = Math.abs((trendEnd - trendStart) / trendStart) * 100;

    // Strong trend followed by sideways movement
    if (trendStrength > 10) {
      const recentTrendChange = Math.abs((recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close) * 100;
      
      // Sideways movement after trend
      if (recentTrendChange < trendStrength * 0.3) {
        const support = Math.min(...recentData.map(k => k.low));
        const resistance = Math.max(...recentData.map(k => k.high));
        const rangeWidth = ((resistance - support) / support) * 100;

        if (rangeWidth > 0 && rangeWidth < 18) {
          return this.createTradingRange(recentData, support, resistance, rangeWidth);
        }
      }
    }

    return null;
  }

  /**
   * Find support level using multiple detection methods
   */
  private findSupportLevel(data: OHLCV[]): number | null {
    const lows = data.map(k => k.low);
    
    // Method 1: Absolute minimum
    const absoluteMin = Math.min(...lows);
    
    // Method 2: Most touched level
    const touchCounts = new Map<number, number>();
    const tolerance = 0.01; // 1% tolerance
    
    for (const low of lows) {
      let found = false;
      for (const [level, count] of touchCounts) {
        if (Math.abs((low - level) / level) < tolerance) {
          touchCounts.set(level, count + 1);
          found = true;
          break;
        }
      }
      if (!found) {
        touchCounts.set(low, 1);
      }
    }

    // Find level with most touches (minimum 2)
    let mostTouchedLevel = absoluteMin;
    let maxTouches = 1;
    
    for (const [level, touches] of touchCounts) {
      if (touches > maxTouches) {
        maxTouches = touches;
        mostTouchedLevel = level;
      }
    }

    return maxTouches >= 2 ? mostTouchedLevel : absoluteMin;
  }

  /**
   * Find resistance level using multiple detection methods
   */
  private findResistanceLevel(data: OHLCV[]): number | null {
    const highs = data.map(k => k.high);
    
    // Method 1: Absolute maximum
    const absoluteMax = Math.max(...highs);
    
    // Method 2: Most touched level
    const touchCounts = new Map<number, number>();
    const tolerance = 0.01; // 1% tolerance
    
    for (const high of highs) {
      let found = false;
      for (const [level, count] of touchCounts) {
        if (Math.abs((high - level) / level) < tolerance) {
          touchCounts.set(level, count + 1);
          found = true;
          break;
        }
      }
      if (!found) {
        touchCounts.set(high, 1);
      }
    }

    // Find level with most touches (minimum 2)
    let mostTouchedLevel = absoluteMax;
    let maxTouches = 1;
    
    for (const [level, touches] of touchCounts) {
      if (touches > maxTouches) {
        maxTouches = touches;
        mostTouchedLevel = level;
      }
    }

    return maxTouches >= 2 ? mostTouchedLevel : absoluteMax;
  }

  /**
   * Create trading range object
   */
  private createTradingRange(
    data: OHLCV[], 
    support: number, 
    resistance: number, 
    width: number
  ): TradingRange {
    const averageVolume = data.reduce((sum, k) => sum + k.volume, 0) / data.length;
    
    return {
      startDate: new Date(data[0].timestamp),
      endDate: new Date(data[data.length - 1].timestamp),
      support,
      resistance,
      duration: data.length,
      width,
      volumeProfile: {
        averageVolume,
        volumeTrend: 'stable', // Simplified - would be enhanced with trend analysis
        significantEvents: [] // Would be populated with detected events
      },
      strength: width < 8 ? 'strong' : width < 15 ? 'moderate' : 'weak',
      type: 'consolidation' // Will be determined by context analysis
    };
  }

  /**
   * Calculate how well price action is contained within the range
   */
  private calculateContainmentScore(tradingRange: TradingRange, klines: OHLCV[]): number {
    const rangeData = klines.filter(k => 
      Number(k.timestamp) >= tradingRange.startDate.getTime() && 
      Number(k.timestamp) <= (tradingRange.endDate?.getTime() || Date.now())
    );

    if (rangeData.length === 0) return 0;

    let containedPeriods = 0;
    const tolerance = tradingRange.width * 0.02; // 2% tolerance
    const adjustedSupport = tradingRange.support * (1 - tolerance / 100);
    const adjustedResistance = tradingRange.resistance * (1 + tolerance / 100);

    for (const kline of rangeData) {
      if (kline.low >= adjustedSupport && kline.high <= adjustedResistance) {
        containedPeriods++;
      }
    }

    return (containedPeriods / rangeData.length) * 100;
  }

  /**
   * Assess volume characteristics for range quality
   */
  private assessVolumeCharacteristics(volumeContext: VolumeContext, tradingRange: TradingRange): number {
    let score = 0;

    // Dry-up periods (positive for accumulation, neutral for distribution)
    if (volumeContext.dryUpPeriods.length > 0) {
      const majorDryUps = volumeContext.dryUpPeriods.filter(d => d.significance === 'major').length;
      const moderateDryUps = volumeContext.dryUpPeriods.filter(d => d.significance === 'moderate').length;
      score += majorDryUps * 6 + moderateDryUps * 3; // Max 12 points
    }

    // Climax events (positive for both accumulation and distribution)
    if (volumeContext.climaxEvents.length > 0) {
      score += Math.min(6, volumeContext.climaxEvents.length * 2); // Max 6 points
    }

    // Volume trend relative to range type
    if (tradingRange.type === 'accumulation' && volumeContext.overallTrend === 'decreasing') {
      score += 2; // Decreasing volume in accumulation is bullish
    } else if (tradingRange.type === 'distribution' && volumeContext.overallTrend === 'increasing') {
      score += 2; // Increasing volume in distribution is bearish
    }

    return Math.min(20, score);
  }

  /**
   * Assess range position in larger market context
   */
  private assessRangePosition(tradingRange: TradingRange, klines: OHLCV[]): number {
    let score = 0;

    if (klines.length < 100) return 5; // Limited data

    // Check if range is near significant price levels
    const last100 = klines.slice(-100);
    const significantLows = this.findSignificantLevels(last100, 'low');
    const significantHighs = this.findSignificantLevels(last100, 'high');

    // Range support near significant low
    for (const level of significantLows) {
      if (Math.abs((tradingRange.support - level) / level) < 0.02) {
        score += 4;
        break;
      }
    }

    // Range resistance near significant high
    for (const level of significantHighs) {
      if (Math.abs((tradingRange.resistance - level) / level) < 0.02) {
        score += 4;
        break;
      }
    }

    // Range position in recent price action (middle is good)
    const recentHigh = Math.max(...last100.map(k => k.high));
    const recentLow = Math.min(...last100.map(k => k.low));
    const rangeMidpoint = (tradingRange.support + tradingRange.resistance) / 2;
    const positionInRange = (rangeMidpoint - recentLow) / (recentHigh - recentLow);

    // Ranges in middle 50% of recent action are more significant
    if (positionInRange >= 0.25 && positionInRange <= 0.75) {
      score += 4;
    } else if (positionInRange >= 0.15 && positionInRange <= 0.85) {
      score += 2;
    }

    // Bonus for ranges after significant moves
    const preRangeMove = this.calculatePreRangeMove(klines, tradingRange);
    if (Math.abs(preRangeMove) > 20) {
      score += 3; // Range after significant move is more meaningful
    }

    return Math.min(15, score);
  }

  /**
   * Find significant price levels in the data
   */
  private findSignificantLevels(data: OHLCV[], type: 'high' | 'low'): number[] {
    const levels: number[] = [];
    const prices = data.map(k => type === 'high' ? k.high : k.low);
    
    // Find local extremes with significance
    for (let i = 2; i < prices.length - 2; i++) {
      const price = prices[i];
      const isExtreme = type === 'high' 
        ? price > prices[i-1] && price > prices[i-2] && price > prices[i+1] && price > prices[i+2]
        : price < prices[i-1] && price < prices[i-2] && price < prices[i+1] && price < prices[i+2];
        
      if (isExtreme) {
        levels.push(price);
      }
    }

    return levels;
  }

  /**
   * Calculate the move that preceded the range
   */
  private calculatePreRangeMove(klines: OHLCV[], tradingRange: TradingRange): number {
    const rangeStartIndex = klines.findIndex(k => Number(k.timestamp) >= tradingRange.startDate.getTime());
    if (rangeStartIndex < 20) return 0;

    const preRangeData = klines.slice(Math.max(0, rangeStartIndex - 20), rangeStartIndex);
    if (preRangeData.length < 2) return 0;

    const moveStart = preRangeData[0].close;
    const moveEnd = preRangeData[preRangeData.length - 1].close;
    
    return ((moveEnd - moveStart) / moveStart) * 100;
  }
  
  /**
   * Create basic volume context for range analysis
   */
  private createBasicVolumeContext(klines: OHLCV[]): any {
    const avgVolume = klines.reduce((sum, k) => sum + k.volume, 0) / klines.length;
    const currentVolume = klines[klines.length - 1].volume;
    
    return {
      overallTrend: 'stable',
      climaxEvents: [],
      dryUpPeriods: [],
      avgVolumeInRange: avgVolume,
      currentVolumeRank: (currentVolume / avgVolume) * 50,
      interpretation: 'Basic volume analysis from TradingRangeAnalyzer'
    };
  }
  
  /**
   * Create empty volume context fallback
   */
  private createEmptyVolumeContext(): any {
    return {
      overallTrend: 'stable',
      climaxEvents: [],
      dryUpPeriods: [],
      avgVolumeInRange: 0,
      currentVolumeRank: 50,
      interpretation: 'No volume analysis available'
    };
  }
}
