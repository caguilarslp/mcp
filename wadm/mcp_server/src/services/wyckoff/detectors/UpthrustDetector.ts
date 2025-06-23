/**
 * @fileoverview Upthrust Detector
 * @description Specialized detector for upthrust events (false breakouts above resistance)
 * @version 2.0.0
 */

import type { OHLCV } from '../../../types/index.js';
import type { UpthrustEvent, TradingRange } from '../core/types.js';

/**
 * Detects upthrust events in Wyckoff analysis
 */
export class UpthrustDetector {

  /**
   * Detect upthrust events within a trading range
   */
  async detectUpthrusts(
    symbol: string,
    timeframe: string,
    klines: OHLCV[],
    tradingRange: TradingRange
  ): Promise<UpthrustEvent[]> {
    const upthrusts: UpthrustEvent[] = [];

    if (klines.length < 10 || !tradingRange) {
      return upthrusts;
    }

    // Calculate average volume for the trading range period
    const rangeKlines = this.getKlinesInRange(klines, tradingRange);
    const avgVolume = rangeKlines.reduce((sum, k) => sum + k.volume, 0) / rangeKlines.length;

    // Look for potential upthrust events
    for (let i = 2; i < klines.length - 2; i++) {
      const upthrustCandidate = this.analyzeUpthrustCandidate(
        klines, 
        i, 
        tradingRange, 
        avgVolume
      );

      if (upthrustCandidate) {
        upthrusts.push(upthrustCandidate);
      }
    }

    // Filter and rank upthrusts by quality
    return this.filterAndRankUpthrusts(upthrusts);
  }

  /**
   * Analyze a potential upthrust candidate at a specific index
   */
  private analyzeUpthrustCandidate(
    klines: OHLCV[],
    index: number,
    tradingRange: TradingRange,
    avgVolume: number
  ): UpthrustEvent | null {
    const current = klines[index];
    const prev = klines[index - 1];
    const next = klines[index + 1];

    // Basic upthrust criteria: High breaks above resistance but closes below
    const resistanceLevel = tradingRange.resistance;
    const tolerance = resistanceLevel * 0.002; // 0.2% tolerance

    // Check if the high penetrated resistance
    if (current.high <= resistanceLevel + tolerance) {
      return null; // No penetration
    }

    // Check if the close was rejected below resistance
    if (current.close >= resistanceLevel) {
      return null; // No rejection within the same period
    }

    // Calculate penetration metrics
    const penetrationHeight = ((current.high - resistanceLevel) / resistanceLevel) * 100;
    const rejectionWithinBar = ((current.high - current.close) / current.high) * 100;

    // Validate penetration height (should be meaningful but not too extreme)
    if (penetrationHeight < 0.2 || penetrationHeight > 5) {
      return null; // Too small or too large
    }

    // Analyze rejection characteristics
    const rejectionAnalysis = this.analyzeRejection(klines, index, resistanceLevel);
    if (!rejectionAnalysis.isValid) {
      return null;
    }

    // Volume analysis
    const volumeAnalysis = this.analyzeUpthrustVolume(current, avgVolume, penetrationHeight);

    // Context analysis
    const context = this.analyzeUpthrustContext(klines, index, tradingRange);

    // Calculate significance
    const significance = this.calculateUpthrustSignificance(
      penetrationHeight,
      rejectionAnalysis.speed,
      volumeAnalysis,
      context
    );

    // Evaluate success probability
    const isSuccessful = this.evaluateUpthrustSuccess(klines, index, tradingRange);

    const upthrust: UpthrustEvent = {
      timestamp: new Date(current.timestamp),
      type: 'upthrust',
      price: current.high,
      volume: current.volume,
      significance,
      description: this.generateUpthrustDescription(penetrationHeight, rejectionAnalysis.speed, volumeAnalysis),
      context: {
        phaseAtTime: 'distribution_phase_c',
        relativeToRange: 'above_resistance',
        volumeCharacter: volumeAnalysis.character
      },
      penetrationHeight,
      rejectionSpeed: rejectionAnalysis.speed,
      volumeOnPenetration: current.volume,
      volumeOnRejection: rejectionAnalysis.rejectionVolume,
      isSuccessful
    };

    return upthrust;
  }

  /**
   * Analyze rejection characteristics after penetration
   */
  private analyzeRejection(
    klines: OHLCV[],
    upthrustIndex: number,
    resistanceLevel: number
  ): { isValid: boolean; speed: number; rejectionVolume: number } {
    const upthrustBar = klines[upthrustIndex];
    let rejectionVolume = upthrustBar.volume;
    let rejectionSpeed = 0;

    // Check immediate rejection (within the same bar)
    const immediateRejection = ((upthrustBar.high - upthrustBar.close) / upthrustBar.high) * 100;
    
    // Check rejection in subsequent bars
    let cumulativeRejection = immediateRejection;
    let periodsToRejection = 0;
    let fullRejection = false;

    for (let i = upthrustIndex + 1; i < Math.min(klines.length, upthrustIndex + 5); i++) {
      const current = klines[i];
      periodsToRejection++;
      rejectionVolume += current.volume;

      if (current.close < resistanceLevel) {
        fullRejection = true;
        const totalMove = ((upthrustBar.high - current.close) / upthrustBar.high) * 100;
        rejectionSpeed = totalMove / periodsToRejection;
        break;
      }
    }

    // Valid rejection criteria
    const isValid = fullRejection && periodsToRejection <= 3 && rejectionSpeed > 1;

    return {
      isValid,
      speed: rejectionSpeed,
      rejectionVolume: rejectionVolume / (periodsToRejection + 1) // Average volume during rejection
    };
  }

  /**
   * Analyze volume characteristics of the upthrust
   */
  private analyzeUpthrustVolume(
    upthrustBar: OHLCV,
    avgVolume: number,
    penetrationHeight: number
  ): { character: 'high' | 'normal' | 'low'; ratio: number; quality: 'excellent' | 'good' | 'poor' } {
    const volumeRatio = upthrustBar.volume / avgVolume;
    
    let character: 'high' | 'normal' | 'low';
    let quality: 'excellent' | 'good' | 'poor';

    if (volumeRatio > 1.5) {
      character = 'high';
      // High volume on upthrust is generally bearish (selling into strength)
      quality = 'excellent';
    } else if (volumeRatio > 0.8) {
      character = 'normal';
      quality = 'good';
    } else {
      character = 'low';
      // Low volume on upthrust can indicate lack of genuine demand
      quality = penetrationHeight < 1.5 ? 'good' : 'poor';
    }

    return { character, ratio: volumeRatio, quality };
  }

  /**
   * Analyze the context around the upthrust
   */
  private analyzeUpthrustContext(
    klines: OHLCV[],
    upthrustIndex: number,
    tradingRange: TradingRange
  ): {
    priorTests: number;
    timeInRange: number;
    priorStrength: boolean;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
    priceProgress: 'good' | 'poor';
  } {
    // Count prior tests of resistance
    const rangeKlines = this.getKlinesInRange(klines, tradingRange);
    const resistanceLevel = tradingRange.resistance;
    const tolerance = resistanceLevel * 0.01; // 1% tolerance

    let priorTests = 0;
    for (let i = 0; i < upthrustIndex && i < rangeKlines.length; i++) {
      const kline = rangeKlines[i];
      if (Math.abs(kline.high - resistanceLevel) <= tolerance) {
        priorTests++;
      }
    }

    // Time spent in range before upthrust
    const timeInRange = Math.min(upthrustIndex, rangeKlines.length);

    // Check for prior signs of strength
    const recentBars = klines.slice(Math.max(0, upthrustIndex - 5), upthrustIndex);
    const priorStrength = recentBars.some(bar => 
      bar.close > bar.open && bar.high > resistanceLevel * 0.99
    );

    // Volume trend analysis
    const recentVolumes = recentBars.map(bar => bar.volume);
    const avgRecentVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const olderVolumes = klines.slice(Math.max(0, upthrustIndex - 10), upthrustIndex - 5).map(bar => bar.volume);
    const avgOlderVolume = olderVolumes.reduce((sum, v) => sum + v, 0) / olderVolumes.length;

    let volumeTrend: 'increasing' | 'decreasing' | 'stable';
    if (avgRecentVolume > avgOlderVolume * 1.1) {
      volumeTrend = 'increasing';
    } else if (avgRecentVolume < avgOlderVolume * 0.9) {
      volumeTrend = 'decreasing';
    } else {
      volumeTrend = 'stable';
    }

    // Analyze price progress during rallies
    const rallyBars = recentBars.filter(bar => bar.close > bar.open);
    const avgRallyRange = rallyBars.length > 0 ? 
      rallyBars.reduce((sum, bar) => sum + ((bar.high - bar.low) / bar.low), 0) / rallyBars.length : 0;
    
    const priceProgress = avgRallyRange > 0.02 ? 'good' : 'poor'; // 2% threshold

    return {
      priorTests,
      timeInRange,
      priorStrength,
      volumeTrend,
      priceProgress
    };
  }

  /**
   * Calculate upthrust significance score
   */
  private calculateUpthrustSignificance(
    penetrationHeight: number,
    rejectionSpeed: number,
    volumeAnalysis: { character: string; ratio: number; quality: string },
    context: any
  ): number {
    let significance = 0;

    // Penetration height score (0-25 points)
    if (penetrationHeight > 0.5 && penetrationHeight < 2) {
      significance += 25; // Ideal penetration
    } else if (penetrationHeight <= 0.5) {
      significance += 15; // Too shallow
    } else if (penetrationHeight < 3) {
      significance += 20; // Acceptable
    } else {
      significance += 10; // Too high
    }

    // Rejection speed score (0-25 points)
    if (rejectionSpeed > 3) {
      significance += 25; // Very quick rejection
    } else if (rejectionSpeed > 2) {
      significance += 20; // Good rejection
    } else if (rejectionSpeed > 1) {
      significance += 15; // Moderate rejection
    } else {
      significance += 5; // Slow rejection
    }

    // Volume quality score (0-25 points)
    switch (volumeAnalysis.quality) {
      case 'excellent': significance += 25; break;
      case 'good': significance += 18; break;
      case 'poor': significance += 8; break;
    }

    // Context score (0-25 points)
    let contextScore = 0;
    
    // Prior tests (more tests = more significant upthrust)
    if (context.priorTests >= 3) contextScore += 8;
    else if (context.priorTests >= 2) contextScore += 6;
    else if (context.priorTests >= 1) contextScore += 4;
    
    // Time in range (longer = more significant)
    if (context.timeInRange >= 20) contextScore += 6;
    else if (context.timeInRange >= 10) contextScore += 4;
    else contextScore += 2;
    
    // Volume trend (increasing is bearish for upthrusts)
    if (context.volumeTrend === 'increasing') contextScore += 6;
    else if (context.volumeTrend === 'stable') contextScore += 4;
    else contextScore += 2;
    
    // Poor price progress makes upthrust more significant
    if (context.priceProgress === 'poor') contextScore += 5;
    else contextScore += 2;
    
    significance += Math.min(25, contextScore);

    return Math.min(100, significance);
  }

  /**
   * Evaluate if the upthrust was successful (led to markdown)
   */
  private evaluateUpthrustSuccess(
    klines: OHLCV[],
    upthrustIndex: number,
    tradingRange: TradingRange
  ): boolean {
    const supportLevel = tradingRange.support;
    const lookAheadPeriods = Math.min(15, klines.length - upthrustIndex - 1);

    // Check if price broke below support in subsequent periods
    for (let i = upthrustIndex + 1; i <= upthrustIndex + lookAheadPeriods; i++) {
      if (i >= klines.length) break;
      
      const kline = klines[i];
      if (kline.close < supportLevel) {
        return true; // Successful breakdown
      }
    }

    // Also check if price stayed below resistance and showed weakness
    let bearishBars = 0;
    let totalBars = 0;
    
    for (let i = upthrustIndex + 1; i <= upthrustIndex + Math.min(10, lookAheadPeriods); i++) {
      if (i >= klines.length) break;
      
      const kline = klines[i];
      totalBars++;
      
      if (kline.close < kline.open && kline.close < tradingRange.resistance * 0.99) {
        bearishBars++;
      }
    }

    // Consider it successful if majority of subsequent bars were bearish and below resistance
    return totalBars > 0 && (bearishBars / totalBars) > 0.6;
  }

  /**
   * Generate description for the upthrust event
   */
  private generateUpthrustDescription(
    penetrationHeight: number,
    rejectionSpeed: number,
    volumeAnalysis: { character: string; ratio: number; quality: string }
  ): string {
    const penetrationDesc = penetrationHeight < 1 ? 'shallow' : 
                           penetrationHeight < 2 ? 'moderate' : 'significant';
    
    const rejectionDesc = rejectionSpeed > 3 ? 'sharp' : 
                         rejectionSpeed > 2 ? 'quick' : 
                         rejectionSpeed > 1 ? 'moderate' : 'gradual';
    
    return `${penetrationDesc.charAt(0).toUpperCase() + penetrationDesc.slice(1)} upthrust: ` +
           `${penetrationHeight.toFixed(2)}% penetration above resistance with ${rejectionDesc} rejection ` +
           `(${rejectionSpeed.toFixed(1)}% speed) on ${volumeAnalysis.character} volume ` +
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
   * Filter and rank upthrusts by quality and significance
   */
  private filterAndRankUpthrusts(upthrusts: UpthrustEvent[]): UpthrustEvent[] {
    // Remove low-quality upthrusts
    const filteredUpthrusts = upthrusts.filter(upthrust => upthrust.significance >= 40);

    // Sort by significance (highest first)
    filteredUpthrusts.sort((a, b) => b.significance - a.significance);

    // Remove closely spaced upthrusts (keep the most significant)
    const finalUpthrusts: UpthrustEvent[] = [];
    const minTimeGap = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

    for (const upthrust of filteredUpthrusts) {
      const hasCloseUpthrust = finalUpthrusts.some(existing => 
        Math.abs(upthrust.timestamp.getTime() - existing.timestamp.getTime()) < minTimeGap
      );

      if (!hasCloseUpthrust) {
        finalUpthrusts.push(upthrust);
      }
    }

    return finalUpthrusts;
  }
}
