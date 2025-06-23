/**
 * @fileoverview Test Event Detector
 * @description Specialized detector for test events (retests of key levels)
 * @version 2.0.0
 */

import type { OHLCV } from '../../../types/index.js';
import type { TestEvent, TradingRange } from '../core/types.js';

/**
 * Detects test events in Wyckoff analysis
 */
export class TestEventDetector {

  /**
   * Detect test events of key levels
   */
  async detectTestEvents(
    symbol: string,
    timeframe: string,
    klines: OHLCV[],
    keyLevels: number[]
  ): Promise<TestEvent[]> {
    const tests: TestEvent[] = [];

    if (klines.length < 5 || keyLevels.length === 0) {
      return tests;
    }

    // Calculate average volume for context
    const avgVolume = klines.reduce((sum, k) => sum + k.volume, 0) / klines.length;

    // Analyze each key level for test events
    for (const level of keyLevels) {
      const levelTests = this.detectTestsOfLevel(klines, level, avgVolume);
      tests.push(...levelTests);
    }

    // Filter and rank tests by quality
    return this.filterAndRankTests(tests);
  }

  /**
   * Detect tests of a specific level
   */
  private detectTestsOfLevel(
    klines: OHLCV[],
    level: number,
    avgVolume: number
  ): TestEvent[] {
    const tests: TestEvent[] = [];
    const tolerance = level * 0.005; // 0.5% tolerance

    for (let i = 1; i < klines.length - 1; i++) {
      const current = klines[i];
      const prev = klines[i - 1];
      const next = klines[i + 1];

      // Check if current bar tested the level
      const testCandidate = this.analyzeTestCandidate(
        current,
        prev,
        next,
        level,
        tolerance,
        avgVolume,
        i
      );

      if (testCandidate) {
        tests.push(testCandidate);
      }
    }

    return tests;
  }

  /**
   * Analyze a potential test candidate
   */
  private analyzeTestCandidate(
    current: OHLCV,
    prev: OHLCV,
    next: OHLCV,
    level: number,
    tolerance: number,
    avgVolume: number,
    index: number
  ): TestEvent | null {
    // Check if price approached the level
    const lowDistance = Math.abs(current.low - level);
    const highDistance = Math.abs(current.high - level);
    const closeDistance = Math.abs(current.close - level);

    // Determine if this is a test (price came close to level)
    const isTest = lowDistance <= tolerance || 
                   highDistance <= tolerance || 
                   closeDistance <= tolerance;

    if (!isTest) {
      return null;
    }

    // Determine test type (support or resistance test)
    const isTestingSupport = current.low <= level + tolerance && level < current.close;
    const isTestingResistance = current.high >= level - tolerance && level > current.close;

    if (!isTestingSupport && !isTestingResistance) {
      return null; // Not a clear test
    }

    // Determine resulting action
    const resultingAction = this.determineResultingAction(current, next, level, tolerance);

    // Assess test quality
    const testQuality = this.assessTestQuality(
      current,
      prev,
      next,
      level,
      resultingAction,
      avgVolume
    );

    // Calculate significance
    const significance = this.calculateTestSignificance(
      testQuality,
      current.volume,
      avgVolume,
      resultingAction
    );

    // Determine test price (closest approach to level)
    let testPrice = current.close;
    if (lowDistance < closeDistance && lowDistance < highDistance) {
      testPrice = current.low;
    } else if (highDistance < closeDistance) {
      testPrice = current.high;
    }

    const test: TestEvent = {
      timestamp: new Date(current.timestamp),
      type: 'test',
      price: testPrice,
      volume: current.volume,
      significance,
      description: this.generateTestDescription(level, testPrice, resultingAction, testQuality, current.volume, avgVolume),
      context: {
        phaseAtTime: 'uncertain', // Would be determined by broader context
        relativeToRange: this.determineRelativePosition(current.close, level),
        volumeCharacter: this.classifyVolumeCharacter(current.volume, avgVolume)
      },
      levelTested: level,
      testQuality,
      volumeOnTest: current.volume,
      resultingAction
    };

    return test;
  }

  /**
   * Determine the action that resulted from the test
   */
  private determineResultingAction(
    current: OHLCV,
    next: OHLCV,
    level: number,
    tolerance: number
  ): 'bounce' | 'break' | 'stall' {
    const currentDistance = Math.abs(current.close - level);
    const nextDistance = Math.abs(next.close - level);

    // Check for bounce (moved away from level significantly)
    if (nextDistance > tolerance * 3) {
      // Check direction of bounce
      if ((current.close < level && next.close > current.close) || 
          (current.close > level && next.close < current.close)) {
        return 'bounce';
      }
    }

    // Check for break (moved through level significantly)
    if (nextDistance > tolerance * 2) {
      if ((current.close >= level && next.close < level - tolerance) ||
          (current.close <= level && next.close > level + tolerance)) {
        return 'break';
      }
    }

    // Default to stall if no clear bounce or break
    return 'stall';
  }

  /**
   * Assess the quality of the test
   */
  private assessTestQuality(
    current: OHLCV,
    prev: OHLCV,
    next: OHLCV,
    level: number,
    resultingAction: 'bounce' | 'break' | 'stall',
    avgVolume: number
  ): 'good' | 'poor' | 'failed' {
    let qualityScore = 0;
    let maxScore = 0;

    // Action quality (40 points)
    maxScore += 40;
    switch (resultingAction) {
      case 'bounce':
        qualityScore += 40; // Clean bounce is excellent
        break;
      case 'break':
        qualityScore += 10; // Break means level failed
        break;
      case 'stall':
        qualityScore += 20; // Stall is neutral
        break;
    }

    // Volume characteristics (30 points)
    maxScore += 30;
    const volumeRatio = current.volume / avgVolume;
    if (resultingAction === 'bounce') {
      // For bounces, lower volume is better (absorption)
      if (volumeRatio < 0.8) qualityScore += 30;
      else if (volumeRatio < 1.2) qualityScore += 20;
      else qualityScore += 10;
    } else {
      // For breaks, higher volume confirms the move
      if (volumeRatio > 1.5) qualityScore += 25;
      else if (volumeRatio > 1.0) qualityScore += 15;
      else qualityScore += 5;
    }

    // Price action precision (30 points)
    maxScore += 30;
    const precision = this.calculateTestPrecision(current, level);
    if (precision > 0.8) qualityScore += 30;
    else if (precision > 0.6) qualityScore += 20;
    else if (precision > 0.4) qualityScore += 10;
    else qualityScore += 5;

    const finalScore = (qualityScore / maxScore) * 100;

    if (finalScore >= 70) return 'good';
    if (finalScore >= 40) return 'poor';
    return 'failed';
  }

  /**
   * Calculate test precision (how close price came to the level)
   */
  private calculateTestPrecision(kline: OHLCV, level: number): number {
    const range = kline.high - kline.low;
    if (range === 0) return 1; // Perfect precision if no range

    // Find closest approach to level
    let closestDistance = Math.abs(kline.close - level);
    closestDistance = Math.min(closestDistance, Math.abs(kline.high - level));
    closestDistance = Math.min(closestDistance, Math.abs(kline.low - level));

    // Calculate precision as inverse of distance relative to range
    const precisionRatio = 1 - (closestDistance / range);
    return Math.max(0, Math.min(1, precisionRatio));
  }

  /**
   * Calculate test significance score
   */
  private calculateTestSignificance(
    testQuality: 'good' | 'poor' | 'failed',
    volume: number,
    avgVolume: number,
    resultingAction: 'bounce' | 'break' | 'stall'
  ): number {
    let significance = 0;

    // Base score from quality (0-50 points)
    switch (testQuality) {
      case 'good': significance += 50; break;
      case 'poor': significance += 25; break;
      case 'failed': significance += 10; break;
    }

    // Volume component (0-25 points)
    const volumeRatio = volume / avgVolume;
    if (resultingAction === 'bounce') {
      // For bounces, lower volume is more significant
      if (volumeRatio < 0.7) significance += 25;
      else if (volumeRatio < 1.0) significance += 20;
      else if (volumeRatio < 1.5) significance += 15;
      else significance += 10;
    } else if (resultingAction === 'break') {
      // For breaks, higher volume is more significant
      if (volumeRatio > 2.0) significance += 25;
      else if (volumeRatio > 1.5) significance += 20;
      else if (volumeRatio > 1.0) significance += 15;
      else significance += 10;
    } else {
      // Stall - moderate volume is neutral
      significance += 15;
    }

    // Action component (0-25 points)
    switch (resultingAction) {
      case 'bounce': significance += 25; break; // Most significant
      case 'break': significance += 20; break;  // Also significant
      case 'stall': significance += 10; break;  // Less significant
    }

    return Math.min(100, significance);
  }

  /**
   * Generate description for the test event
   */
  private generateTestDescription(
    level: number,
    testPrice: number,
    resultingAction: 'bounce' | 'break' | 'stall',
    testQuality: 'good' | 'poor' | 'failed',
    volume: number,
    avgVolume: number
  ): string {
    const levelStr = level.toFixed(4);
    const testPriceStr = testPrice.toFixed(4);
    const volumeRatio = (volume / avgVolume).toFixed(1);
    
    const distance = Math.abs(testPrice - level);
    const distancePercent = ((distance / level) * 100).toFixed(3);
    
    let actionDesc = '';
    switch (resultingAction) {
      case 'bounce':
        actionDesc = testPrice < level ? 'bounced from support' : 'rejected at resistance';
        break;
      case 'break':
        actionDesc = testPrice < level ? 'broke below support' : 'broke above resistance';
        break;
      case 'stall':
        actionDesc = 'stalled near level';
        break;
    }

    return `Test of ${levelStr}: Price touched ${testPriceStr} (${distancePercent}% from level) ` +
           `and ${actionDesc} with ${testQuality} quality on ${volumeRatio}x average volume`;
  }

  /**
   * Determine relative position to range
   */
  private determineRelativePosition(
    price: number, 
    level: number
  ): 'below_support' | 'at_support' | 'within_range' | 'at_resistance' | 'above_resistance' {
    const tolerance = level * 0.01; // 1% tolerance

    if (price < level - tolerance) return 'below_support';
    if (price > level + tolerance) return 'above_resistance';
    if (Math.abs(price - level) <= tolerance) {
      return price <= level ? 'at_support' : 'at_resistance';
    }
    return 'within_range';
  }

  /**
   * Classify volume character
   */
  private classifyVolumeCharacter(volume: number, avgVolume: number): 'high' | 'normal' | 'low' {
    const ratio = volume / avgVolume;
    if (ratio > 1.5) return 'high';
    if (ratio < 0.7) return 'low';
    return 'normal';
  }

  /**
   * Filter and rank tests by quality and significance
   */
  private filterAndRankTests(tests: TestEvent[]): TestEvent[] {
    // Remove very low quality tests
    const filteredTests = tests.filter(test => 
      test.significance >= 20 && test.testQuality !== 'failed'
    );

    // Sort by significance (highest first)
    filteredTests.sort((a, b) => b.significance - a.significance);

    // Remove closely spaced tests of the same level (keep the most significant)
    const finalTests: TestEvent[] = [];
    const minTimeGap = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
    const levelTolerance = 0.01; // 1% level tolerance

    for (const test of filteredTests) {
      const hasCloseTest = finalTests.some(existing => {
        const timeDiff = Math.abs(test.timestamp.getTime() - existing.timestamp.getTime());
        const levelDiff = Math.abs((test.levelTested - existing.levelTested) / test.levelTested);
        
        return timeDiff < minTimeGap && levelDiff < levelTolerance;
      });

      if (!hasCloseTest) {
        finalTests.push(test);
      }
    }

    // Limit to most significant tests (max 10 per analysis)
    return finalTests.slice(0, 10);
  }

  /**
   * Analyze test pattern for multiple tests of the same level
   */
  analyzeTestPattern(tests: TestEvent[], level: number): {
    testCount: number;
    averageQuality: number;
    trend: 'strengthening' | 'weakening' | 'stable';
    lastTest: TestEvent | null;
  } {
    const levelTolerance = level * 0.01; // 1% tolerance
    const levelTests = tests.filter(test => 
      Math.abs(test.levelTested - level) <= levelTolerance
    );

    if (levelTests.length === 0) {
      return {
        testCount: 0,
        averageQuality: 0,
        trend: 'stable',
        lastTest: null
      };
    }

    // Sort by timestamp
    levelTests.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate average quality
    const qualityScores = levelTests.map(test => {
      switch (test.testQuality) {
        case 'good': return 100;
        case 'poor': return 50;
        case 'failed': return 0;
      }
    });
    const averageQuality = qualityScores.reduce((sum: number, score) => sum + score, 0) / qualityScores.length;

    // Determine trend
    let trend: 'strengthening' | 'weakening' | 'stable' = 'stable';
    if (levelTests.length >= 3) {
      const recent = levelTests.slice(-2);
      const earlier = levelTests.slice(0, -2);
      
      const recentAvgQuality = recent.reduce((sum, test) => {
        const score = test.testQuality === 'good' ? 100 : test.testQuality === 'poor' ? 50 : 0;
        return sum + score;
      }, 0) / recent.length;
      
      const earlierAvgQuality = earlier.reduce((sum, test) => {
        const score = test.testQuality === 'good' ? 100 : test.testQuality === 'poor' ? 50 : 0;
        return sum + score;
      }, 0) / earlier.length;

      if (recentAvgQuality > earlierAvgQuality + 20) {
        trend = 'strengthening';
      } else if (recentAvgQuality < earlierAvgQuality - 20) {
        trend = 'weakening';
      }
    }

    return {
      testCount: levelTests.length,
      averageQuality,
      trend,
      lastTest: levelTests[levelTests.length - 1]
    };
  }
}
