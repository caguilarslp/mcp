/**
 * @fileoverview Phase Analyzer
 * @description Specialized analyzer for Wyckoff phase classification and interpretation
 * @version 2.0.0
 */

import type { OHLCV, SupportResistanceAnalysis } from '../../../types/index.js';
import type { 
  WyckoffPhase, 
  WyckoffEvent, 
  VolumeContext, 
  TradingRange,
  WyckoffPhaseAnalysis
} from '../core/types.js';

/**
 * Analyzes and classifies Wyckoff phases
 */
export class PhaseAnalyzer {
  
  /**
   * Classify current Wyckoff phase based on market data and events
   */
  classifyWyckoffPhase(
    klines: OHLCV[],
    tradingRange: TradingRange | null,
    events: WyckoffEvent[],
    volumeContext: VolumeContext,
    srAnalysis: SupportResistanceAnalysis
  ): {
    phase: WyckoffPhase;
    confidence: number;
    progress: number;
    interpretation: WyckoffPhaseAnalysis['interpretation'];
  } {
    let phase: WyckoffPhase = 'uncertain';
    let confidence = 30;
    let progress = 0;

    if (tradingRange) {
      const result = this.analyzeRangeBasedPhase(tradingRange, events, volumeContext);
      phase = result.phase;
      confidence = result.confidence;
      progress = result.progress;
    } else {
      const result = this.analyzeTrendingPhase(klines, events, volumeContext);
      phase = result.phase;
      confidence = result.confidence;
      progress = result.progress;
    }

    // Generate interpretation
    const interpretation = this.generatePhaseInterpretation(phase, tradingRange, events, volumeContext);

    return {
      phase,
      confidence,
      progress,
      interpretation
    };
  }

  /**
   * Analyze phase when in trading range
   */
  private analyzeRangeBasedPhase(
    tradingRange: TradingRange,
    events: WyckoffEvent[],
    volumeContext: VolumeContext
  ): { phase: WyckoffPhase; confidence: number; progress: number } {
    const springs = events.filter(e => e.type === 'spring');
    const upthrusts = events.filter(e => e.type === 'upthrust');
    const tests = events.filter(e => e.type === 'test');

    let phase: WyckoffPhase;
    let confidence: number;
    let progress: number;

    if (tradingRange.type === 'accumulation') {
      const result = this.analyzeAccumulationPhase(springs, upthrusts, tests, volumeContext, tradingRange);
      phase = result.phase;
      confidence = result.confidence;
      progress = result.progress;
    } else if (tradingRange.type === 'distribution') {
      const result = this.analyzeDistributionPhase(springs, upthrusts, tests, volumeContext, tradingRange);
      phase = result.phase;
      confidence = result.confidence;
      progress = result.progress;
    } else {
      // Consolidation - determine bias
      if (springs.length > upthrusts.length) {
        phase = 'accumulation_phase_b';
        confidence = 50;
        progress = 30;
      } else if (upthrusts.length > springs.length) {
        phase = 'distribution_phase_b';
        confidence = 50;
        progress = 30;
      } else {
        phase = 'uncertain';
        confidence = 30;
        progress = 0;
      }
    }

    return { phase, confidence, progress };
  }

  /**
   * Analyze accumulation phases
   */
  private analyzeAccumulationPhase(
    springs: WyckoffEvent[],
    upthrusts: WyckoffEvent[],
    tests: WyckoffEvent[],
    volumeContext: VolumeContext,
    tradingRange: TradingRange
  ): { phase: WyckoffPhase; confidence: number; progress: number } {
    let phase: WyckoffPhase = 'accumulation_phase_a';
    let confidence = 40;
    let progress = 10;

    // Check for springs (Phase C indicators)
    if (springs.length > 0) {
      const successfulSprings = springs.filter(s => (s as any).isSuccessful);
      if (successfulSprings.length > 0) {
        phase = 'accumulation_phase_d'; // Post-spring, signs of strength
        confidence = 75;
        progress = 70;
      } else {
        phase = 'accumulation_phase_c'; // Spring detected
        confidence = 70;
        progress = 60;
      }
    }
    // Check for multiple tests without springs
    else if (tests.length >= 3) {
      const goodTests = tests.filter(t => (t as any).testQuality === 'good');
      if (goodTests.length >= 2) {
        phase = 'accumulation_phase_b'; // Building cause
        confidence = 65;
        progress = 40;
      }
    }
    // Check for volume characteristics
    else if (volumeContext.climaxEvents.length > 0) {
      const sellingClimaxEvents = volumeContext.climaxEvents.filter(c => c.type === 'selling_climax');
      if (sellingClimaxEvents.length > 0) {
        phase = 'accumulation_phase_a'; // Selling climax phase
        confidence = 60;
        progress = 20;
      }
    }

    // Enhance confidence based on volume context
    if (volumeContext.dryUpPeriods.length > 0) {
      confidence += 10; // Volume dry-up supports accumulation
    }
    if (volumeContext.overallTrend === 'decreasing') {
      confidence += 5; // Decreasing volume in range is bullish
    }

    // Check for signs leading to markup
    if (phase === 'accumulation_phase_d' && this.hasSignsOfStrength(tests, volumeContext)) {
      phase = 'accumulation_phase_e'; // Last point of support
      confidence = 80;
      progress = 85;
    }

    return { phase, confidence: Math.min(95, confidence), progress };
  }

  /**
   * Analyze distribution phases
   */
  private analyzeDistributionPhase(
    springs: WyckoffEvent[],
    upthrusts: WyckoffEvent[],
    tests: WyckoffEvent[],
    volumeContext: VolumeContext,
    tradingRange: TradingRange
  ): { phase: WyckoffPhase; confidence: number; progress: number } {
    let phase: WyckoffPhase = 'distribution_phase_a';
    let confidence = 40;
    let progress = 10;

    // Check for upthrusts (Phase C indicators)
    if (upthrusts.length > 0) {
      const successfulUpthrusts = upthrusts.filter(u => (u as any).isSuccessful);
      if (successfulUpthrusts.length > 0) {
        phase = 'distribution_phase_d'; // Post-upthrust, signs of weakness
        confidence = 75;
        progress = 70;
      } else {
        phase = 'distribution_phase_c'; // Upthrust detected
        confidence = 70;
        progress = 60;
      }
    }
    // Check for multiple tests without upthrusts
    else if (tests.length >= 3) {
      const poorTests = tests.filter(t => (t as any).testQuality === 'poor' || (t as any).testQuality === 'failed');
      if (poorTests.length >= 2) {
        phase = 'distribution_phase_b'; // Building cause
        confidence = 65;
        progress = 40;
      }
    }
    // Check for volume characteristics
    else if (volumeContext.climaxEvents.length > 0) {
      const buyingClimaxEvents = volumeContext.climaxEvents.filter(c => c.type === 'buying_climax');
      if (buyingClimaxEvents.length > 0) {
        phase = 'distribution_phase_a'; // Buying climax phase
        confidence = 60;
        progress = 20;
      }
    }

    // Enhance confidence based on volume context
    if (volumeContext.overallTrend === 'increasing') {
      confidence += 10; // Increasing volume with poor progress is bearish
    }
    if (volumeContext.climaxEvents.length > 1) {
      confidence += 5; // Multiple climax events suggest distribution
    }

    // Check for signs leading to markdown
    if (phase === 'distribution_phase_d' && this.hasSignsOfWeakness(tests, volumeContext)) {
      phase = 'distribution_phase_e'; // Last point of supply
      confidence = 80;
      progress = 85;
    }

    return { phase, confidence: Math.min(95, confidence), progress };
  }

  /**
   * Analyze trending phases (markup/markdown)
   */
  private analyzeTrendingPhase(
    klines: OHLCV[],
    events: WyckoffEvent[],
    volumeContext: VolumeContext
  ): { phase: WyckoffPhase; confidence: number; progress: number } {
    if (klines.length < 20) {
      return { phase: 'uncertain', confidence: 20, progress: 0 };
    }

    const recent20 = klines.slice(-20);
    const recent10 = klines.slice(-10);
    
    const trendChange20 = ((recent20[recent20.length - 1].close - recent20[0].close) / recent20[0].close) * 100;
    const trendChange10 = ((recent10[recent10.length - 1].close - recent10[0].close) / recent10[0].close) * 100;

    let phase: WyckoffPhase = 'uncertain';
    let confidence = 30;
    let progress = 50;

    if (trendChange20 > 15) {
      phase = 'markup';
      confidence = 60;
      
      // Check for potential reaccumulation
      if (Math.abs(trendChange10) < 5 && events.length > 0) {
        phase = 'reaccumulation';
        confidence = 55;
        progress = 30; // Reaccumulation is temporary pause
      }
    } else if (trendChange20 < -15) {
      phase = 'markdown';
      confidence = 60;
      
      // Check for potential redistribution
      if (Math.abs(trendChange10) < 5 && events.length > 0) {
        phase = 'redistribution';
        confidence = 55;
        progress = 30; // Redistribution is temporary pause
      }
    }

    // Volume confirmation
    if (volumeContext.overallTrend === 'increasing' && phase === 'markup') {
      confidence += 15; // Volume supports uptrend
    } else if (volumeContext.overallTrend === 'decreasing' && phase === 'markdown') {
      confidence += 10; // Volume divergence in downtrend can be normal
    }

    return { phase, confidence: Math.min(95, confidence), progress };
  }

  /**
   * Check for signs of strength in accumulation
   */
  private hasSignsOfStrength(tests: WyckoffEvent[], volumeContext: VolumeContext): boolean {
    const recentTests = tests.slice(-3); // Last 3 tests
    const goodTests = recentTests.filter(t => (t as any).testQuality === 'good');
    
    // Signs of strength: good tests with decreasing volume
    return goodTests.length >= 2 && volumeContext.overallTrend === 'decreasing';
  }

  /**
   * Check for signs of weakness in distribution
   */
  private hasSignsOfWeakness(tests: WyckoffEvent[], volumeContext: VolumeContext): boolean {
    const recentTests = tests.slice(-3); // Last 3 tests
    const poorTests = recentTests.filter(t => (t as any).testQuality === 'poor' || (t as any).testQuality === 'failed');
    
    // Signs of weakness: poor tests with increasing volume or multiple failures
    return poorTests.length >= 2 || volumeContext.climaxEvents.length > 2;
  }

  /**
   * Generate comprehensive phase interpretation
   */
  private generatePhaseInterpretation(
    phase: WyckoffPhase,
    tradingRange: TradingRange | null,
    events: WyckoffEvent[],
    volumeContext: VolumeContext
  ): WyckoffPhaseAnalysis['interpretation'] {
    const implications: string[] = [];
    const nextExpectedEvents: string[] = [];
    let bias: 'accumulation' | 'distribution' | 'trending' | 'uncertain' = 'uncertain';
    let strength: 'weak' | 'moderate' | 'strong' = 'moderate';

    switch (phase) {
      case 'accumulation_phase_a':
        bias = 'accumulation';
        implications.push('Potential selling climax occurred - smart money beginning to accumulate');
        implications.push('Weak hands selling to strong hands at low prices');
        nextExpectedEvents.push('Secondary test of lows with less volume');
        nextExpectedEvents.push('Automatic reaction bounce from oversold levels');
        strength = volumeContext.climaxEvents.length > 0 ? 'moderate' : 'weak';
        break;

      case 'accumulation_phase_b':
        bias = 'accumulation';
        implications.push('Building cause phase - smart money testing supply');
        implications.push('Multiple tests of support show absorption of supply');
        implications.push('Trading range developing as accumulation progresses');
        nextExpectedEvents.push('Spring event or successful test of support');
        nextExpectedEvents.push('Signs of strength on rallies from support');
        strength = events.length >= 3 ? 'moderate' : 'weak';
        break;

      case 'accumulation_phase_c':
        bias = 'accumulation';
        implications.push('Spring detected - last major shakeout by smart money');
        implications.push('Weak hands being shaken out before markup');
        implications.push('Classic Wyckoff spring indicates accumulation completion');
        nextExpectedEvents.push('Sign of strength rally above trading range');
        nextExpectedEvents.push('Last point of support before sustained advance');
        strength = 'strong';
        break;

      case 'accumulation_phase_d':
        bias = 'accumulation';
        implications.push('Signs of strength appearing - demand overcoming supply');
        implications.push('Smart money showing their hand with strong rallies');
        implications.push('Background conditions improving for markup');
        nextExpectedEvents.push('Last point of support test');
        nextExpectedEvents.push('Jump across the creek - breakout above resistance');
        strength = 'strong';
        break;

      case 'accumulation_phase_e':
        bias = 'accumulation';
        implications.push('Last point of support - final accumulation opportunity');
        implications.push('Smart money making final preparations for markup');
        implications.push('Risk/reward heavily favors long positions');
        nextExpectedEvents.push('Sign of strength breakout above resistance');
        nextExpectedEvents.push('Sustained markup phase beginning');
        strength = 'strong';
        break;

      case 'distribution_phase_a':
        bias = 'distribution';
        implications.push('Preliminary supply detected - smart money beginning to distribute');
        implications.push('Buying climax may have occurred at high prices');
        implications.push('Strong hands selling to weak hands');
        nextExpectedEvents.push('Automatic reaction from buying climax');
        nextExpectedEvents.push('Secondary rally with less enthusiasm');
        strength = volumeContext.climaxEvents.length > 0 ? 'moderate' : 'weak';
        break;

      case 'distribution_phase_b':
        bias = 'distribution';
        implications.push('Building cause phase - smart money testing demand');
        implications.push('Multiple tests of resistance show distribution of supply');
        implications.push('Trading range developing as distribution progresses');
        nextExpectedEvents.push('Upthrust event or failed test of resistance');
        nextExpectedEvents.push('Signs of weakness on declines from resistance');
        strength = events.length >= 3 ? 'moderate' : 'weak';
        break;

      case 'distribution_phase_c':
        bias = 'distribution';
        implications.push('Upthrust detected - last major bull trap by smart money');
        implications.push('Weak hands being trapped before markdown');
        implications.push('Classic Wyckoff upthrust indicates distribution completion');
        nextExpectedEvents.push('Sign of weakness decline below trading range');
        nextExpectedEvents.push('Last point of supply before sustained decline');
        strength = 'strong';
        break;

      case 'distribution_phase_d':
        bias = 'distribution';
        implications.push('Signs of weakness appearing - supply overcoming demand');
        implications.push('Smart money showing distribution with weak rallies');
        implications.push('Background conditions deteriorating for markdown');
        nextExpectedEvents.push('Last point of supply test');
        nextExpectedEvents.push('Ice through support - breakdown below support');
        strength = 'strong';
        break;

      case 'distribution_phase_e':
        bias = 'distribution';
        implications.push('Last point of supply - final distribution opportunity');
        implications.push('Smart money making final preparations for markdown');
        implications.push('Risk/reward heavily favors short positions');
        nextExpectedEvents.push('Sign of weakness breakdown below support');
        nextExpectedEvents.push('Sustained markdown phase beginning');
        strength = 'strong';
        break;

      case 'markup':
        bias = 'trending';
        implications.push('Uptrend in progress - demand exceeding supply');
        implications.push('Smart money campaign successful, public participating');
        implications.push('Trend likely to continue until distribution begins');
        nextExpectedEvents.push('Potential secondary accumulation (reaccumulation)');
        nextExpectedEvents.push('Eventual distribution at higher levels');
        strength = volumeContext.overallTrend === 'increasing' ? 'strong' : 'moderate';
        break;

      case 'markdown':
        bias = 'trending';
        implications.push('Downtrend in progress - supply exceeding demand');
        implications.push('Smart money campaign successful, public selling');
        implications.push('Trend likely to continue until accumulation begins');
        nextExpectedEvents.push('Potential secondary distribution (redistribution)');
        nextExpectedEvents.push('Eventual accumulation at lower levels');
        strength = volumeContext.overallTrend === 'decreasing' ? 'moderate' : 'strong';
        break;

      case 'reaccumulation':
        bias = 'accumulation';
        implications.push('Secondary accumulation in uptrend - pause to gather strength');
        implications.push('Smart money accumulating more at higher but still favorable levels');
        implications.push('Temporary consolidation before trend continuation');
        nextExpectedEvents.push('Breakout above reaccumulation range');
        nextExpectedEvents.push('Continuation of markup phase');
        strength = 'moderate';
        break;

      case 'redistribution':
        bias = 'distribution';
        implications.push('Secondary distribution in downtrend - pause to distribute more');
        implications.push('Smart money distributing remaining positions at lower levels');
        implications.push('Temporary consolidation before trend continuation');
        nextExpectedEvents.push('Breakdown below redistribution range');
        nextExpectedEvents.push('Continuation of markdown phase');
        strength = 'moderate';
        break;

      default:
        implications.push('Phase not clearly defined - market in transition');
        implications.push('Monitor price and volume for pattern development');
        nextExpectedEvents.push('Watch for trading range development');
        nextExpectedEvents.push('Look for accumulation or distribution signs');
        strength = 'weak';
    }

    // Adjust strength based on volume context
    if (volumeContext.climaxEvents.length > 1) {
      strength = strength === 'weak' ? 'moderate' : 'strong';
    } else if (volumeContext.dryUpPeriods.length > 0 && bias === 'accumulation') {
      strength = strength === 'weak' ? 'moderate' : strength;
    }

    return {
      bias,
      strength,
      implications,
      nextExpectedEvents
    };
  }
}
