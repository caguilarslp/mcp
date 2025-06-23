/**
 * @fileoverview Volume Analyzer
 * @description Specialized analyzer for Wyckoff volume analysis with climax and dry-up detection
 * @version 2.0.0
 */

import type { OHLCV } from '../../../types/index.js';
import type { VolumeContext, ClimaxEvent, DryUpPeriod, VolumeEvent } from '../core/types.js';

/**
 * Analyzes volume in Wyckoff methodology context
 */
export class VolumeAnalyzer {

  /**
   * Analyze volume characteristics in Wyckoff context
   */
  async analyzeWyckoffVolume(
    symbol: string,
    timeframe: string,
    klines: OHLCV[]
  ): Promise<VolumeContext> {
    if (klines.length === 0) {
      return this.createEmptyVolumeContext();
    }

    // Calculate baseline volume metrics
    const avgVolume = this.calculateAverageVolume(klines);
    
    // Identify volume trend
    const overallTrend = this.identifyVolumeTrend(klines);
    
    // Detect climax events (buying/selling climaxes)
    const climaxEvents = this.detectClimaxEvents(klines, avgVolume);
    
    // Detect dry-up periods
    const dryUpPeriods = this.detectDryUpPeriods(klines, avgVolume);
    
    // Calculate current volume percentile
    const currentVolumeRank = this.calculateVolumePercentile(klines);
    
    // Generate comprehensive interpretation
    const interpretation = this.generateVolumeInterpretation(
      overallTrend, 
      climaxEvents, 
      dryUpPeriods, 
      currentVolumeRank,
      symbol,
      timeframe
    );

    return {
      overallTrend,
      climaxEvents,
      dryUpPeriods,
      avgVolumeInRange: avgVolume,
      currentVolumeRank,
      interpretation
    };
  }

  /**
   * Create empty volume context for error cases
   */
  createEmptyVolumeContext(): VolumeContext {
    return {
      overallTrend: 'stable',
      climaxEvents: [],
      dryUpPeriods: [],
      avgVolumeInRange: 0,
      currentVolumeRank: 50,
      interpretation: 'No volume analysis available - insufficient data'
    };
  }

  // ====================
  // PRIVATE ANALYSIS METHODS
  // ====================

  /**
   * Calculate average volume with outlier filtering
   */
  private calculateAverageVolume(klines: OHLCV[]): number {
    const volumes = klines.map(k => k.volume);
    
    // Remove extreme outliers (top and bottom 5%)
    const sortedVolumes = [...volumes].sort((a, b) => a - b);
    const startIndex = Math.floor(sortedVolumes.length * 0.05);
    const endIndex = Math.floor(sortedVolumes.length * 0.95);
    const filteredVolumes = sortedVolumes.slice(startIndex, endIndex);
    
    return filteredVolumes.reduce((sum, v) => sum + v, 0) / filteredVolumes.length;
  }

  /**
   * Identify overall volume trend using multiple methods
   */
  private identifyVolumeTrend(klines: OHLCV[]): 'increasing' | 'decreasing' | 'stable' {
    if (klines.length < 20) {
      return 'stable';
    }

    // Method 1: Compare recent vs earlier periods
    const recentPeriods = Math.min(10, Math.floor(klines.length / 3));
    const recentVolumes = klines.slice(-recentPeriods).map(k => k.volume);
    const earlierVolumes = klines.slice(-recentPeriods * 2, -recentPeriods).map(k => k.volume);
    
    const recentAvg = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const earlierAvg = earlierVolumes.reduce((sum, v) => sum + v, 0) / earlierVolumes.length;
    
    // Method 2: Linear regression on volume
    const regression = this.calculateVolumeRegression(klines);
    
    // Method 3: Moving average comparison
    const ma1 = this.calculateMovingAverage(klines.slice(-15).map(k => k.volume));
    const ma2 = this.calculateMovingAverage(klines.slice(-30, -15).map(k => k.volume));
    
    // Combine methods for robust determination
    let increasingSignals = 0;
    let decreasingSignals = 0;
    
    // Recent vs earlier comparison (30% weight)
    if (recentAvg > earlierAvg * 1.15) increasingSignals += 0.3;
    else if (recentAvg < earlierAvg * 0.85) decreasingSignals += 0.3;
    
    // Regression slope (40% weight)
    if (regression.slope > 0.1) increasingSignals += 0.4;
    else if (regression.slope < -0.1) decreasingSignals += 0.4;
    
    // Moving average comparison (30% weight)
    if (ma1 > ma2 * 1.1) increasingSignals += 0.3;
    else if (ma1 < ma2 * 0.9) decreasingSignals += 0.3;
    
    // Determine trend based on signal strength
    if (increasingSignals > 0.6) return 'increasing';
    if (decreasingSignals > 0.6) return 'decreasing';
    return 'stable';
  }

  /**
   * Detect climax events (volume spikes with significant price movement)
   */
  private detectClimaxEvents(klines: OHLCV[], avgVolume: number): ClimaxEvent[] {
    const climaxEvents: ClimaxEvent[] = [];
    const volumeThreshold = avgVolume * 2.5; // Minimum threshold for climax
    
    for (let i = 1; i < klines.length - 1; i++) {
      const current = klines[i];
      const prev = klines[i - 1];
      const next = klines[i + 1];
      
      // Volume spike criteria
      if (current.volume < volumeThreshold) continue;
      
      // Check if it's a local volume maximum
      if (current.volume <= prev.volume && current.volume <= next.volume) continue;
      
      // Calculate price movement and body characteristics
      const priceMove = ((current.close - current.open) / current.open) * 100;
      const bodyRatio = Math.abs(current.close - current.open) / (current.high - current.low);
      const range = ((current.high - current.low) / current.low) * 100;
      
      // Climax criteria: High volume + significant price movement
      if (Math.abs(priceMove) < 1.5 || range < 2) continue;
      
      // Determine climax type and quality
      const isClimaxEvent = this.validateClimaxEvent(current, prev, next, avgVolume);
      
      if (isClimaxEvent.isValid) {
        const climax: ClimaxEvent = {
          date: new Date(current.timestamp),
          type: isClimaxEvent.type,
          volume: current.volume,
          priceAction: `${priceMove.toFixed(2)}% ${priceMove > 0 ? 'rally' : 'decline'} on ${(current.volume / avgVolume).toFixed(1)}x volume`,
          significance: this.calculateClimaxSignificance(current, avgVolume, bodyRatio, range)
        };
        
        climaxEvents.push(climax);
      }
    }

    // Remove closely spaced climax events (keep the most significant)
    return this.filterClimaxEvents(climaxEvents);
  }

  /**
   * Detect dry-up periods (sustained low volume periods)
   */
  private detectDryUpPeriods(klines: OHLCV[], avgVolume: number): DryUpPeriod[] {
    const dryUpPeriods: DryUpPeriod[] = [];
    const lowVolumeThreshold = avgVolume * 0.6; // 60% of average
    
    let dryUpStart: Date | null = null;
    let dryUpVolumes: number[] = [];
    let consecutiveLowVolume = 0;
    
    for (let i = 0; i < klines.length; i++) {
      const current = klines[i];
      
      if (current.volume < lowVolumeThreshold) {
        if (!dryUpStart) {
          dryUpStart = new Date(current.timestamp);
          dryUpVolumes = [];
        }
        
        dryUpVolumes.push(current.volume);
        consecutiveLowVolume++;
      } else {
        // End of dry-up period
        if (dryUpStart && consecutiveLowVolume >= 3) {
          const avgDryUpVolume = dryUpVolumes.reduce((sum, v) => sum + v, 0) / dryUpVolumes.length;
          const significance = this.calculateDryUpSignificance(consecutiveLowVolume, avgDryUpVolume, avgVolume);
          
          dryUpPeriods.push({
            startDate: dryUpStart,
            endDate: new Date(klines[i - 1].timestamp),
            averageVolume: avgDryUpVolume,
            significance
          });
        }
        
        // Reset tracking
        dryUpStart = null;
        dryUpVolumes = [];
        consecutiveLowVolume = 0;
      }
    }
    
    // Handle dry-up period that extends to the end
    if (dryUpStart && consecutiveLowVolume >= 3) {
      const avgDryUpVolume = dryUpVolumes.reduce((sum, v) => sum + v, 0) / dryUpVolumes.length;
      const significance = this.calculateDryUpSignificance(consecutiveLowVolume, avgDryUpVolume, avgVolume);
      
      dryUpPeriods.push({
        startDate: dryUpStart,
        endDate: new Date(klines[klines.length - 1].timestamp),
        averageVolume: avgDryUpVolume,
        significance
      });
    }
    
    return dryUpPeriods;
  }

  /**
   * Calculate current volume percentile
   */
  private calculateVolumePercentile(klines: OHLCV[]): number {
    if (klines.length === 0) return 50;
    
    const currentVolume = klines[klines.length - 1].volume;
    const allVolumes = klines.map(k => k.volume);
    const sortedVolumes = [...allVolumes].sort((a, b) => a - b);
    
    const rank = sortedVolumes.findIndex(v => v >= currentVolume);
    return (rank / sortedVolumes.length) * 100;
  }

  /**
   * Generate comprehensive volume interpretation
   */
  private generateVolumeInterpretation(
    trend: 'increasing' | 'decreasing' | 'stable',
    climaxEvents: ClimaxEvent[],
    dryUpPeriods: DryUpPeriod[],
    currentRank: number,
    symbol: string,
    timeframe: string
  ): string {
    const insights: string[] = [];
    
    // Overall trend interpretation
    switch (trend) {
      case 'increasing':
        insights.push('Volume trend: INCREASING - Rising participation and institutional activity');
        break;
      case 'decreasing':
        insights.push('Volume trend: DECREASING - Declining participation, potential exhaustion or absorption');
        break;
      case 'stable':
        insights.push('Volume trend: STABLE - Consistent participation levels');
        break;
    }
    
    // Climax events interpretation
    if (climaxEvents.length > 0) {
      const recentClimax = climaxEvents[climaxEvents.length - 1];
      const buyingClimaxes = climaxEvents.filter(c => c.type === 'buying_climax').length;
      const sellingClimaxes = climaxEvents.filter(c => c.type === 'selling_climax').length;
      
      insights.push(`${climaxEvents.length} climax event(s) detected (${buyingClimaxes} buying, ${sellingClimaxes} selling)`);
      
      if (recentClimax.significance > 80) {
        insights.push(`SIGNIFICANT: Recent ${recentClimax.type.replace('_', ' ')} suggests institutional activity`);
      }
    } else {
      insights.push('No significant climax events - orderly price movement');
    }
    
    // Dry-up periods interpretation
    if (dryUpPeriods.length > 0) {
      const majorDryUps = dryUpPeriods.filter(d => d.significance === 'major').length;
      insights.push(`${dryUpPeriods.length} dry-up period(s) detected - potential absorption`);
      
      if (majorDryUps > 0) {
        insights.push('SIGNIFICANT: Major dry-up periods indicate institutional accumulation');
      }
    }
    
    // Current volume context
    if (currentRank >= 80) {
      insights.push(`ALERT: Current volume at ${currentRank.toFixed(0)}th percentile - HIGH activity`);
    } else if (currentRank <= 20) {
      insights.push(`Current volume at ${currentRank.toFixed(0)}th percentile - LOW activity`);
    }
    
    return insights.join(' | ');
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  /**
   * Calculate volume regression for trend analysis
   */
  private calculateVolumeRegression(klines: OHLCV[]): { slope: number; rSquared: number } {
    const volumes = klines.map(k => k.volume);
    const n = volumes.length;
    
    const xSum = (n * (n - 1)) / 2;
    const ySum = volumes.reduce((sum, v) => sum + v, 0);
    const xySum = volumes.reduce((sum, v, i) => sum + (i * v), 0);
    const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
    
    return { slope, rSquared: 0 };
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Validate if a volume spike qualifies as a climax event
   */
  private validateClimaxEvent(
    current: OHLCV, 
    prev: OHLCV, 
    next: OHLCV, 
    avgVolume: number
  ): { isValid: boolean; type: 'buying_climax' | 'selling_climax' } {
    const priceMove = current.close - current.open;
    const volumeRatio = current.volume / avgVolume;
    const bodyRatio = Math.abs(priceMove) / (current.high - current.low);
    
    // Minimum criteria for climax
    if (volumeRatio < 2 || bodyRatio < 0.4) {
      return { isValid: false, type: 'buying_climax' };
    }
    
    // Determine type based on price action
    const type: 'buying_climax' | 'selling_climax' = priceMove > 0 ? 'buying_climax' : 'selling_climax';
    const isValid = volumeRatio >= 2.5 && bodyRatio >= 0.5;
    
    return { isValid, type };
  }

  /**
   * Calculate climax significance score
   */
  private calculateClimaxSignificance(
    kline: OHLCV, 
    avgVolume: number, 
    bodyRatio: number, 
    range: number
  ): number {
    let significance = 0;
    
    const volumeRatio = kline.volume / avgVolume;
    if (volumeRatio >= 5) significance += 40;
    else if (volumeRatio >= 4) significance += 35;
    else if (volumeRatio >= 3) significance += 25;
    else significance += 15;
    
    if (bodyRatio >= 0.8) significance += 25;
    else if (bodyRatio >= 0.6) significance += 20;
    else significance += 15;
    
    if (range >= 5) significance += 20;
    else if (range >= 3) significance += 15;
    else significance += 10;
    
    const priceMove = Math.abs((kline.close - kline.open) / kline.open) * 100;
    if (priceMove >= 5) significance += 15;
    else if (priceMove >= 3) significance += 10;
    else significance += 5;
    
    return Math.min(100, significance);
  }

  /**
   * Calculate dry-up significance
   */
  private calculateDryUpSignificance(
    duration: number, 
    avgDryUpVolume: number, 
    overallAvgVolume: number
  ): 'minor' | 'moderate' | 'major' {
    const volumeRatio = avgDryUpVolume / overallAvgVolume;
    
    if (duration >= 7 && volumeRatio <= 0.4) return 'major';
    if (duration >= 5 && volumeRatio <= 0.5) return 'moderate';
    if (duration >= 3 && volumeRatio <= 0.6) return 'moderate';
    return 'minor';
  }

  /**
   * Filter closely spaced climax events
   */
  private filterClimaxEvents(climaxEvents: ClimaxEvent[]): ClimaxEvent[] {
    if (climaxEvents.length <= 1) return climaxEvents;
    
    const filtered: ClimaxEvent[] = [];
    
    for (let i = 0; i < climaxEvents.length; i++) {
      const current = climaxEvents[i];
      let hasMoreSignificantNearby = false;
      
      for (let j = Math.max(0, i - 3); j <= Math.min(climaxEvents.length - 1, i + 3); j++) {
        if (i === j) continue;
        
        const other = climaxEvents[j];
        const timeDiff = Math.abs(current.date.getTime() - other.date.getTime());
        const threePeriods = 3 * 24 * 60 * 60 * 1000;
        
        if (timeDiff <= threePeriods && other.significance > current.significance) {
          hasMoreSignificantNearby = true;
          break;
        }
      }
      
      if (!hasMoreSignificantNearby) {
        filtered.push(current);
      }
    }
    
    return filtered;
  }

  /**
   * Check if an event is recent
   */
  private isRecentEvent(eventDate: Date): boolean {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    return eventDate >= tenDaysAgo;
  }
}
