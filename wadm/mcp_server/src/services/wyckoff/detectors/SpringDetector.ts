/**
 * @fileoverview Spring Detector
 * @description Specialized detector for spring events (false breakdowns below support)
 * @version 2.0.0
 */

import type { OHLCV } from '../../../types/index.js';
import type { SpringEvent, TradingRange } from '../core/types.js';

/**
 * Detects spring events in Wyckoff analysis
 */
export class SpringDetector {

  /**
   * Detect spring events within a trading range
   */
  async detectSprings(
    symbol: string,
    timeframe: string,
    klines: OHLCV[],
    tradingRange: TradingRange
  ): Promise<SpringEvent[]> {
    const springs: SpringEvent[] = [];

    if (klines.length < 10 || !tradingRange) {
      return springs;
    }

    // Calculate average volume for the trading range period
    const rangeKlines = this.getKlinesInRange(klines, tradingRange);
    const avgVolume = rangeKlines.reduce((sum, k) => sum + k.volume, 0) / rangeKlines.length;

    // Look for potential spring events
    for (let i = 2; i < klines.length - 2; i++) {
      const springCandidate = this.analyzeSpringCandidate(
        klines, 
        i, 
        tradingRange, 
        avgVolume
      );

      if (springCandidate) {
        springs.push(springCandidate);
      }
    }

    // Filter and rank springs by quality
    return this.filterAndRankSprings(springs);
  }

  /**
   * Analyze a potential spring candidate at a specific index
   */
  private analyzeSpringCandidate(
    klines: OHLCV[],
    index: number,
    tradingRange: TradingRange,
    avgVolume: number
  ): SpringEvent | null {
    const current = klines[index];
    const prev = klines[index - 1];
    const next = klines[index + 1];
    const next2 = klines[index + 2];

    // Basic spring criteria: Low breaks below support but closes above
    const supportLevel = tradingRange.support;
    const tolerance = supportLevel * 0.002; // 0.2% tolerance

    // Check if the low penetrated support
    if (current.low >= supportLevel - tolerance) {
      return null; // No penetration
    }

    // Check if the close recovered above support
    if (current.close <= supportLevel) {
      return null; // No recovery within the same period
    }

    // Calculate penetration metrics
    const penetrationDepth = ((supportLevel - current.low) / supportLevel) * 100;
    const recoveryWithinBar = ((current.close - current.low) / current.low) * 100;

    // Validate penetration depth (should be meaningful but not too deep)
    if (penetrationDepth < 0.2 || penetrationDepth > 5) {
      return null; // Too shallow or too deep
    }

    // Analyze recovery characteristics
    const recoveryAnalysis = this.analyzeRecovery(klines, index, supportLevel);
    if (!recoveryAnalysis.isValid) {
      return null;
    }

    // Volume analysis
    const volumeAnalysis = this.analyzeSpringVolume(current, avgVolume, penetrationDepth);

    // Context analysis
    const context = this.analyzeSpringContext(klines, index, tradingRange);

    // Calculate significance
    const significance = this.calculateSpringSignificance(
      penetrationDepth,
      recoveryAnalysis.speed,
      volumeAnalysis,
      context
    );

    // Evaluate success probability
    const isSuccessful = this.evaluateSpringSuccess(klines, index, tradingRange);

    const spring: SpringEvent = {
      timestamp: new Date(current.timestamp),
      type: 'spring',
      price: current.low,
      volume: current.volume,
      significance,
      description: this.generateSpringDescription(penetrationDepth, recoveryAnalysis.speed, volumeAnalysis),
      context: {
        phaseAtTime: 'accumulation_phase_c',
        relativeToRange: 'below_support',
        volumeCharacter: volumeAnalysis.character
      },
      penetrationDepth,
      recoverySpeed: recoveryAnalysis.speed,
      volumeOnPenetration: current.volume,
      volumeOnRecovery: recoveryAnalysis.recoveryVolume,
      isSuccessful
    };

    return spring;
  }

  /**
   * Analyze recovery characteristics after penetration
   */
  private analyzeRecovery(
    klines: OHLCV[],
    springIndex: number,
    supportLevel: number
  ): { isValid: boolean; speed: number; recoveryVolume: number } {
    const springBar = klines[springIndex];
    let recoveryVolume = springBar.volume;
    let recoverySpeed = 0;

    // Check immediate recovery (within the same bar)
    const immediateRecovery = ((springBar.close - springBar.low) / springBar.low) * 100;
    
    // Check recovery in subsequent bars
    let cumulativeRecovery = immediateRecovery;
    let periodsToRecovery = 0;
    let fullRecovery = false;

    for (let i = springIndex + 1; i < Math.min(klines.length, springIndex + 5); i++) {
      const current = klines[i];
      periodsToRecovery++;
      recoveryVolume += current.volume;

      if (current.close > supportLevel) {
        fullRecovery = true;
        const totalMove = ((current.close - springBar.low) / springBar.low) * 100;
        recoverySpeed = totalMove / periodsToRecovery;
        break;
      }
    }

    // Valid recovery criteria
    const isValid = fullRecovery && periodsToRecovery <= 3 && recoverySpeed > 1;

    return {
      isValid,
      speed: recoverySpeed,
      recoveryVolume: recoveryVolume / (periodsToRecovery + 1) // Average volume during recovery
    };
  }

  /**
   * Analyze volume characteristics of the spring
   */
  private analyzeSpringVolume(
    springBar: OHLCV,
    avgVolume: number,
    penetrationDepth: number
  ): { character: 'high' | 'normal' | 'low'; ratio: number; quality: 'excellent' | 'good' | 'poor' } {
    const volumeRatio = springBar.volume / avgVolume;
    
    let character: 'high' | 'normal' | 'low';
    let quality: 'excellent' | 'good' | 'poor';

    if (volumeRatio > 1.5) {
      character = 'high';
      // High volume on spring can be good (absorption) or bad (genuine selling)
      // Context matters: deeper penetration with high volume is more concerning
      quality = penetrationDepth < 2 ? 'excellent' : 'good';
    } else if (volumeRatio > 0.8) {
      character = 'normal';
      quality = 'good';
    } else {
      character = 'low';
      // Low volume on spring is generally bullish (lack of selling pressure)
      quality = 'excellent';
    }

    return { character, ratio: volumeRatio, quality };
  }

  /**
   * Analyze the context around the spring
   */
  private analyzeSpringContext(
    klines: OHLCV[],
    springIndex: number,
    tradingRange: TradingRange
  ): {
    priorTests: number;
    timeInRange: number;
    priorWeakness: boolean;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    // Count prior tests of support
    const rangeKlines = this.getKlinesInRange(klines, tradingRange);
    const supportLevel = tradingRange.support;
    const tolerance = supportLevel * 0.01; // 1% tolerance

    let priorTests = 0;
    for (let i = 0; i < springIndex && i < rangeKlines.length; i++) {
      const kline = rangeKlines[i];
      if (Math.abs(kline.low - supportLevel) <= tolerance) {
        priorTests++;
      }
    }

    // Time spent in range before spring
    const timeInRange = Math.min(springIndex, rangeKlines.length);

    // Check for prior signs of weakness
    const recentBars = klines.slice(Math.max(0, springIndex - 5), springIndex);
    const priorWeakness = recentBars.some(bar => 
      bar.close < bar.open && bar.low < supportLevel * 1.01
    );

    // Volume trend analysis
    const recentVolumes = recentBars.map(bar => bar.volume);
    const avgRecentVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const olderVolumes = klines.slice(Math.max(0, springIndex - 10), springIndex - 5).map(bar => bar.volume);
    const avgOlderVolume = olderVolumes.reduce((sum, v) => sum + v, 0) / olderVolumes.length;

    let volumeTrend: 'increasing' | 'decreasing' | 'stable';
    if (avgRecentVolume > avgOlderVolume * 1.1) {
      volumeTrend = 'increasing';
    } else if (avgRecentVolume < avgOlderVolume * 0.9) {
      volumeTrend = 'decreasing';
    } else {
      volumeTrend = 'stable';
    }

    return {
      priorTests,
      timeInRange,
      priorWeakness,
      volumeTrend
    };
  }

  /**
   * Calculate spring significance score
   */
  private calculateSpringSignificance(
    penetrationDepth: number,
    recoverySpeed: number,
    volumeAnalysis: { character: string; ratio: number; quality: string },
    context: any
  ): number {
    let significance = 0;

    // Penetration depth score (0-25 points)
    if (penetrationDepth > 0.5 && penetrationDepth < 2) {
      significance += 25; // Ideal penetration
    } else if (penetrationDepth <= 0.5) {
      significance += 15; // Too shallow
    } else if (penetrationDepth < 3) {
      significance += 20; // Acceptable
    } else {
      significance += 10; // Too deep
    }

    // Recovery speed score (0-25 points)
    if (recoverySpeed > 3) {
      significance += 25; // Very quick recovery
    } else if (recoverySpeed > 2) {
      significance += 20; // Good recovery
    } else if (recoverySpeed > 1) {
      significance += 15; // Moderate recovery
    } else {
      significance += 5; // Slow recovery
    }

    // Volume quality score (0-25 points)
    switch (volumeAnalysis.quality) {
      case 'excellent': significance += 25; break;
      case 'good': significance += 18; break;
      case 'poor': significance += 8; break;
    }

    // Context score (0-25 points)
    let contextScore = 0;
    
    // Prior tests (more tests = more significant spring)
    if (context.priorTests >= 3) contextScore += 8;
    else if (context.priorTests >= 2) contextScore += 6;
    else if (context.priorTests >= 1) contextScore += 4;
    
    // Time in range (longer = more significant)
    if (context.timeInRange >= 20) contextScore += 7;
    else if (context.timeInRange >= 10) contextScore += 5;
    else contextScore += 2;
    
    // Volume trend (decreasing is bullish for springs)
    if (context.volumeTrend === 'decreasing') contextScore += 6;
    else if (context.volumeTrend === 'stable') contextScore += 4;
    else contextScore += 2;
    
    // Prior weakness makes spring more significant
    if (context.priorWeakness) contextScore += 4;
    
    significance += Math.min(25, contextScore);

    return Math.min(100, significance);
  }

  /**
   * Evaluate if the spring was successful (led to markup)
   */
  private evaluateSpringSuccess(
    klines: OHLCV[],
    springIndex: number,
    tradingRange: TradingRange
  ): boolean {
    const resistanceLevel = tradingRange.resistance;
    const lookAheadPeriods = Math.min(15, klines.length - springIndex - 1);

    // Check if price broke above resistance in subsequent periods
    for (let i = springIndex + 1; i <= springIndex + lookAheadPeriods; i++) {
      if (i >= klines.length) break;
      
      const kline = klines[i];
      if (kline.close > resistanceLevel) {
        return true; // Successful breakout
      }
    }

    // Also check if price stayed above support and showed strength
    let bullishBars = 0;
    let totalBars = 0;
    
    for (let i = springIndex + 1; i <= springIndex + Math.min(10, lookAheadPeriods); i++) {
      if (i >= klines.length) break;
      
      const kline = klines[i];
      totalBars++;
      
      if (kline.close > kline.open && kline.close > tradingRange.support * 1.01) {
        bullishBars++;
      }
    }

    // Consider it successful if majority of subsequent bars were bullish and above support
    return totalBars > 0 && (bullishBars / totalBars) > 0.6;
  }

  /**
   * Generate description for the spring event
   */
  private generateSpringDescription(
    penetrationDepth: number,
    recoverySpeed: number,
    volumeAnalysis: { character: string; ratio: number; quality: string }
  ): string {
    const penetrationDesc = penetrationDepth < 1 ? 'shallow' : 
                           penetrationDepth < 2 ? 'moderate' : 'deep';
    
    const recoveryDesc = recoverySpeed > 3 ? 'rapid' : 
                        recoverySpeed > 2 ? 'quick' : 
                        recoverySpeed > 1 ? 'moderate' : 'slow';
    
    return `${penetrationDesc.charAt(0).toUpperCase() + penetrationDesc.slice(1)} spring: ` +
           `${penetrationDepth.toFixed(2)}% penetration below support with ${recoveryDesc} recovery ` +
           `(${recoverySpeed.toFixed(1)}% speed) on ${volumeAnalysis.character} volume ` +
           `(${volumeAnalysis.ratio.toFixed(1)}x avg) - ${volumeAnalysis.quality} quality`;
  }

  /**
   * Get klines that fall within the trading range period
   */
  private getKlinesInRange(klines: OHLCV[], tradingRange: TradingRange): OHLCV[] {
    const startTime = tradingRange.startDate.getTime();
    const endTime = tradingRange.endDate ? tradingRange.endDate.getTime() : Date.now();
    
    return klines.filter(k => Number(k.timestamp) >= startTime && Number(k.timestamp) <= endTime);
  }

  /**
   * Filter and rank springs by quality and significance
   */
  private filterAndRankSprings(springs: SpringEvent[]): SpringEvent[] {
    // Remove low-quality springs
    const filteredSprings = springs.filter(spring => spring.significance >= 40);

    // Sort by significance (highest first)
    filteredSprings.sort((a, b) => b.significance - a.significance);

    // Remove closely spaced springs (keep the most significant)
    const finalSprings: SpringEvent[] = [];
    const minTimeGap = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

    for (const spring of filteredSprings) {
      const hasCloseSpring = finalSprings.some(existing => 
        Math.abs(spring.timestamp.getTime() - existing.timestamp.getTime()) < minTimeGap
      );

      if (!hasCloseSpring) {
        finalSprings.push(spring);
      }
    }

    return finalSprings;
  }
}
