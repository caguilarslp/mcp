/**
 * @fileoverview Elliott Wave Analysis Service
 * @description Automated Elliott Wave detection with rule validation and projection
 * @version 1.2.0
 * @author wAIckoff MCP Team
 * @updated TASK-021 FASE 1A-1B-2A-2B: Elliott Wave Complete
 */

import { OHLCV, MarketTicker } from '../types/index.js';
import { BybitMarketDataService } from './marketData.js';
import { Logger } from '../utils/logger.js';

export interface ElliottWave {
  number: number;           // Wave number (1-5 for impulsive, A-C for corrective)
  type: 'impulsive' | 'corrective';
  subType: 'motive' | 'diagonal' | 'zigzag' | 'flat' | 'triangle' | 'complex';
  startIndex: number;       // Start index in price data
  endIndex: number;         // End index in price data
  startPrice: number;       // Start price
  endPrice: number;         // End price
  startTime: string;        // Start timestamp
  endTime: string;          // End timestamp
  length: number;           // Price movement length
  duration: number;         // Duration in periods
  fibRatio?: number;        // Fibonacci ratio relative to previous wave
  confidence: number;       // 0-100 confidence in wave identification
}

export interface WaveSequence {
  type: 'impulsive' | 'corrective';
  waves: ElliottWave[];
  isComplete: boolean;
  degree: 'subminuette' | 'minuette' | 'minute' | 'minor' | 'intermediate' | 'primary';
  startTime: string;
  endTime?: string;
  validity: number;         // 0-100 validity based on Elliott rules
}

export interface WaveProjection {
  targetWave: number;       // Which wave is being projected
  targets: {
    conservative: number;   // Conservative target
    normal: number;         // Normal target
    extended: number;       // Extended target
  };
  fibonacciRatios: {
    ratio: number;
    price: number;
    description: string;
  }[];
  timeProjection?: {
    minPeriods: number;
    maxPeriods: number;
    estimatedCompletion: string;
  };
  probability: number;      // 0-100 probability of reaching targets
}

export interface ElliottWaveAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  
  // Current wave count
  currentSequence: WaveSequence;
  
  // Historical sequences found
  historicalSequences: WaveSequence[];
  
  // Current wave position
  currentWave: {
    wave: ElliottWave | null;
    position: 'beginning' | 'middle' | 'end' | 'uncertain';
    nextExpected: string;     // Description of next expected wave
  };
  
  // Wave projections
  projections: WaveProjection[];
  
  // Rule validation
  ruleValidation: {
    wave2Rule: boolean;       // Wave 2 never retraces more than 100% of wave 1
    wave3Rule: boolean;       // Wave 3 is never the shortest
    wave4Rule: boolean;       // Wave 4 doesn't overlap wave 1
    alternationRule: boolean; // Waves 2 and 4 alternate in form
    channelRule: boolean;     // Waves follow parallel channel
    overallValidity: number;  // 0-100 overall rule compliance
  };
  
  // Trading signals
  signals: {
    signal: 'buy' | 'sell' | 'hold' | 'wait';
    strength: number;         // 0-100
    reasoning: string;
    waveContext: string;      // Where we are in the Elliott cycle
    riskLevel: 'low' | 'medium' | 'high';
  };
  
  // Analysis metadata
  analysisTime: string;
  confidence: number;        // Overall analysis confidence
  dataQuality: number;      // Quality of underlying data
}

export interface ElliottConfig {
  minWaveLength: number;     // Minimum wave length in %
  maxLookback: number;       // Maximum periods to analyze
  fibonacciTolerances: {     // Tolerance for Fibonacci ratios
    ratio618: number;        // ±% tolerance for 0.618
    ratio382: number;        // ±% tolerance for 0.382
    ratio236: number;        // ±% tolerance for 0.236
  };
  degreeThresholds: {        // Price movement thresholds for wave degrees
    subminuette: number;     // < 2%
    minuette: number;        // 2-5%
    minute: number;          // 5-15%
    minor: number;           // 15-50%
    intermediate: number;    // > 50%
  };
  timeConsistency: boolean;  // Enforce time consistency rules
  strictRules: boolean;      // Enforce strict Elliott rules
}

interface Pivot {
  index: number;
  price: number;
  type: 'high' | 'low';
  timestamp: string;
  strength: number;
  priceMove: number;        // % move from previous pivot
  volumeWeight: number;     // Volume significance
}

export class ElliottWaveService {
  private readonly logger = new Logger('ElliottWaveService');
  private readonly defaultConfig: ElliottConfig = {
    minWaveLength: 1.0,       // 1% minimum move
    maxLookback: 200,
    fibonacciTolerances: {
      ratio618: 10,           // ±10% tolerance
      ratio382: 15,           // ±15% tolerance
      ratio236: 20            // ±20% tolerance
    },
    degreeThresholds: {
      subminuette: 2,
      minuette: 5,
      minute: 15,
      minor: 50,
      intermediate: 100
    },
    timeConsistency: true,
    strictRules: true
  };

  constructor(
    private readonly marketDataService: BybitMarketDataService,
    private config: ElliottConfig = {} as ElliottConfig
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Perform comprehensive Elliott Wave analysis
   */
  async analyzeElliottWave(
    symbol: string,
    timeframe: string = '60',
    customConfig?: Partial<ElliottConfig>
  ): Promise<ElliottWaveAnalysis> {
    const startTime = performance.now();
    
    try {
      const config = { ...this.config, ...customConfig };
      
      // Get price data
      const klines = await this.marketDataService.getKlines(
        symbol, 
        timeframe, 
        config.maxLookback
      );
      
      if (klines.length < 50) {
        throw new Error(`Insufficient data for Elliott Wave analysis: ${klines.length} periods`);
      }

      const ticker = await this.marketDataService.getTicker(symbol);
      
      // Detect significant pivot points - FASE 1A IMPLEMENTATION
      const pivots = this.detectPivotPoints(klines, config);
      
      if (pivots.length < 8) {
        throw new Error('Insufficient pivot points for Elliott Wave analysis');
      }
      
      // Find potential wave sequences
      const sequences = this.findWaveSequences(pivots, klines, config);
      
      // Validate sequences against Elliott rules
      const validatedSequences = this.validateSequences(sequences, config);
      
      // Find current active sequence
      const currentSequence = this.findCurrentSequence(validatedSequences, klines);
      
      // Analyze current wave position
      const currentWave = this.analyzeCurrentWavePosition(currentSequence, ticker.lastPrice);
      
      // Generate wave projections
      const projections = this.generateWaveProjections(currentSequence, klines, config);
      
      // Validate against Elliott rules
      const ruleValidation = this.validateElliottRules(currentSequence);
      
      // Generate trading signals
      const signals = this.generateElliottSignals(
        currentSequence,
        currentWave,
        projections,
        ruleValidation,
        ticker.lastPrice
      );
      
      // Calculate confidence metrics
      const confidence = this.calculateAnalysisConfidence(
        currentSequence,
        ruleValidation,
        pivots.length
      );
      
      const dataQuality = this.assessDataQuality(klines, pivots);

      const analysis: ElliottWaveAnalysis = {
        symbol,
        timeframe,
        currentPrice: ticker.lastPrice,
        currentSequence,
        historicalSequences: validatedSequences.slice(0, 5), // Keep last 5 sequences
        currentWave,
        projections,
        ruleValidation,
        signals,
        analysisTime: new Date().toISOString(),
        confidence,
        dataQuality
      };

      const executionTime = performance.now() - startTime;
      this.logger.info(`Elliott Wave analysis completed for ${symbol} in ${executionTime.toFixed(2)}ms`);
      
      return analysis;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.logger.error(`Elliott Wave analysis failed for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
        executionTime: executionTime.toFixed(2)
      });
      throw error;
    }
  }

  /**
   * FASE 1A: Enhanced pivot detection with multiple confirmation methods
   */
  private detectPivotPoints(klines: OHLCV[], config: ElliottConfig): Pivot[] {
    const pivots: Pivot[] = [];
    
    // Dynamic lookback based on volatility
    const volatility = this.calculateVolatility(klines);
    const baseLookback = Math.max(3, Math.floor(klines.length / 50));
    const lookback = Math.min(10, Math.max(baseLookback, Math.floor(volatility * 5)));
    
    // First pass: Detect all potential pivots
    const potentialPivots = this.detectBasicPivots(klines, lookback);
    
    // Second pass: Filter by significance
    const significantPivots = this.filterSignificantPivots(potentialPivots, klines, config);
    
    // Third pass: Merge nearby pivots
    const mergedPivots = this.mergeNearbyPivots(significantPivots, config.minWaveLength);
    
    // Fourth pass: Calculate pivot metrics
    for (let i = 0; i < mergedPivots.length; i++) {
      const pivot = mergedPivots[i];
      
      // Calculate price move from previous pivot
      let priceMove = 0;
      if (i > 0) {
        const prevPivot = mergedPivots[i - 1];
        priceMove = Math.abs((pivot.price - prevPivot.price) / prevPivot.price * 100);
      }
      
      // Calculate volume weight
      const volumeWeight = this.calculateVolumeWeight(pivot.index, klines, lookback);
      
      // Calculate comprehensive strength
      const strength = this.calculatePivotStrength(
        pivot.index,
        pivot.type,
        klines,
        lookback,
        priceMove,
        volumeWeight
      );
      
      pivots.push({
        ...pivot,
        priceMove,
        volumeWeight,
        strength
      });
    }
    
    // Sort by index to maintain chronological order
    pivots.sort((a, b) => a.index - b.index);
    
    // Log pivot detection results
    this.logger.debug(`Detected ${pivots.length} significant pivots with lookback ${lookback}`);
    
    return pivots;
  }

  /**
   * Detect basic pivot highs and lows
   */
  private detectBasicPivots(klines: OHLCV[], lookback: number): Pivot[] {
    const pivots: Pivot[] = [];
    
    for (let i = lookback; i < klines.length - lookback; i++) {
      const current = klines[i];
      let isHigh = true;
      let isLow = true;
      
      // Check if current is a pivot high or low
      for (let j = 1; j <= lookback; j++) {
        // Left side check
        if (i - j >= 0) {
          if (current.high <= klines[i - j].high) isHigh = false;
          if (current.low >= klines[i - j].low) isLow = false;
        }
        
        // Right side check
        if (i + j < klines.length) {
          if (current.high < klines[i + j].high) isHigh = false;
          if (current.low > klines[i + j].low) isLow = false;
        }
      }
      
      if (isHigh) {
        pivots.push({
          index: i,
          price: current.high,
          type: 'high',
          timestamp: current.timestamp,
          strength: 0,
          priceMove: 0,
          volumeWeight: 0
        });
      }
      
      if (isLow) {
        pivots.push({
          index: i,
          price: current.low,
          type: 'low',
          timestamp: current.timestamp,
          strength: 0,
          priceMove: 0,
          volumeWeight: 0
        });
      }
    }
    
    return pivots;
  }

  /**
   * Filter pivots by significance
   */
  private filterSignificantPivots(pivots: Pivot[], klines: OHLCV[], config: ElliottConfig): Pivot[] {
    const significantPivots: Pivot[] = [];
    
    for (let i = 0; i < pivots.length; i++) {
      const pivot = pivots[i];
      
      // Find previous opposite pivot
      let prevOppositePivot: Pivot | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (pivots[j].type !== pivot.type) {
          prevOppositePivot = pivots[j];
          break;
        }
      }
      
      if (prevOppositePivot) {
        const priceMove = Math.abs((pivot.price - prevOppositePivot.price) / prevOppositePivot.price * 100);
        
        // Only keep pivots with significant price moves
        if (priceMove >= config.minWaveLength) {
          significantPivots.push(pivot);
        }
      } else {
        // Keep first pivot
        significantPivots.push(pivot);
      }
    }
    
    return significantPivots;
  }

  /**
   * Merge nearby pivots of the same type
   */
  private mergeNearbyPivots(pivots: Pivot[], minWaveLength: number): Pivot[] {
    const mergedPivots: Pivot[] = [];
    let i = 0;
    
    while (i < pivots.length) {
      const currentPivot = pivots[i];
      const samTypePivots: Pivot[] = [currentPivot];
      
      // Collect consecutive pivots of the same type
      let j = i + 1;
      while (j < pivots.length && pivots[j].type === currentPivot.type) {
        samTypePivots.push(pivots[j]);
        j++;
      }
      
      // Merge if multiple pivots of same type
      if (samTypePivots.length > 1) {
        const mergedPivot = currentPivot.type === 'high'
          ? samTypePivots.reduce((max, p) => p.price > max.price ? p : max)
          : samTypePivots.reduce((min, p) => p.price < min.price ? p : min);
        
        mergedPivots.push(mergedPivot);
      } else {
        mergedPivots.push(currentPivot);
      }
      
      i = j;
    }
    
    return mergedPivots;
  }

  /**
   * Calculate market volatility
   */
  private calculateVolatility(klines: OHLCV[]): number {
    if (klines.length < 20) return 2;
    
    const returns: number[] = [];
    for (let i = 1; i < klines.length; i++) {
      const ret = Math.log(klines[i].close / klines[i - 1].close);
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Annual volatility percentage
    return stdDev * Math.sqrt(252) * 100;
  }

  /**
   * Calculate volume weight for a pivot
   */
  private calculateVolumeWeight(index: number, klines: OHLCV[], lookback: number): number {
    const start = Math.max(0, index - lookback);
    const end = Math.min(klines.length - 1, index + lookback);
    
    // Get average volume
    let totalVolume = 0;
    let count = 0;
    for (let i = start; i <= end; i++) {
      totalVolume += klines[i].volume;
      count++;
    }
    const avgVolume = totalVolume / count;
    
    // Calculate pivot volume relative to average
    const pivotVolume = klines[index].volume;
    const volumeRatio = pivotVolume / avgVolume;
    
    // Normalize to 0-100 scale
    return Math.min(100, volumeRatio * 50);
  }

  /**
   * Calculate comprehensive pivot strength
   */
  private calculatePivotStrength(
    index: number,
    type: 'high' | 'low',
    klines: OHLCV[],
    lookback: number,
    priceMove: number,
    volumeWeight: number
  ): number {
    const kline = klines[index];
    
    // 1. Price prominence (how much it stands out)
    let prominence = 0;
    const price = type === 'high' ? kline.high : kline.low;
    
    for (let i = Math.max(0, index - lookback); i <= Math.min(klines.length - 1, index + lookback); i++) {
      if (i === index) continue;
      
      const comparePrice = type === 'high' ? klines[i].high : klines[i].low;
      const diff = type === 'high' 
        ? (price - comparePrice) / comparePrice 
        : (comparePrice - price) / price;
      
      if (diff > 0) {
        prominence += diff * 100;
      }
    }
    prominence = prominence / (lookback * 2);
    
    // 2. Candlestick pattern strength
    const range = kline.high - kline.low;
    const body = Math.abs(kline.close - kline.open);
    const candleStrength = (body / range) * 100;
    
    // 3. Trend alignment
    const trendStrength = this.calculateTrendAlignment(index, type, klines, lookback);
    
    // 4. Time factor (more recent pivots slightly more important)
    const recency = (index / klines.length) * 20; // 0-20 points
    
    // Combine factors
    const strength = (
      prominence * 0.3 +
      candleStrength * 0.2 +
      trendStrength * 0.2 +
      volumeWeight * 0.2 +
      recency * 0.1
    );
    
    return Math.min(100, Math.max(0, strength));
  }

  /**
   * Calculate how well the pivot aligns with the trend
   */
  private calculateTrendAlignment(
    index: number,
    type: 'high' | 'low',
    klines: OHLCV[],
    lookback: number
  ): number {
    const start = Math.max(0, index - lookback);
    const end = Math.min(klines.length - 1, index + lookback);
    
    // Simple trend calculation using linear regression
    const prices: number[] = [];
    const indices: number[] = [];
    
    for (let i = start; i <= end; i++) {
      prices.push(klines[i].close);
      indices.push(i);
    }
    
    // Calculate slope
    const n = prices.length;
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = prices.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * prices[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgPrice = sumY / n;
    const normalizedSlope = (slope / avgPrice) * 100;
    
    // Check if pivot aligns with trend
    if ((type === 'high' && normalizedSlope > 0) || (type === 'low' && normalizedSlope < 0)) {
      return Math.min(100, Math.abs(normalizedSlope) * 10);
    } else {
      return Math.min(100, Math.abs(normalizedSlope) * 5); // Less weight for counter-trend
    }
  }

  /**
   * Assess data quality based on gaps and consistency
   */
  private assessDataQuality(klines: OHLCV[], pivots: Pivot[]): number {
    let quality = 100;
    
    // Check for data gaps
    for (let i = 1; i < klines.length; i++) {
      const timeDiff = new Date(klines[i].timestamp).getTime() - new Date(klines[i-1].timestamp).getTime();
      const expectedDiff = 60 * 60 * 1000; // 1 hour for hourly data
      
      if (timeDiff > expectedDiff * 2) {
        quality -= 5;
      }
    }
    
    // Check pivot distribution
    const avgPivotDistance = klines.length / pivots.length;
    if (avgPivotDistance > 25) {
      quality -= 10; // Too few pivots
    } else if (avgPivotDistance < 5) {
      quality -= 15; // Too many pivots (noisy)
    }
    
    // Check for price anomalies
    for (let i = 1; i < klines.length; i++) {
      const priceChange = Math.abs((klines[i].close - klines[i-1].close) / klines[i-1].close);
      if (priceChange > 0.1) { // 10% change in one period
        quality -= 2;
      }
    }
    
    return Math.max(0, quality);
  }

  /**
   * FASE 1B: Find wave sequences from pivots using Elliott Wave patterns
   */
  private findWaveSequences(pivots: Pivot[], klines: OHLCV[], config: ElliottConfig): WaveSequence[] {
    const sequences: WaveSequence[] = [];
    
    // Need at least 6 pivots for a basic 5-wave pattern
    if (pivots.length < 6) return sequences;
    
    // Try to identify impulsive (5-wave) patterns
    for (let i = 0; i <= pivots.length - 6; i++) {
      const impulsiveSeq = this.tryImpulsivePattern(pivots.slice(i, i + 10), klines, config);
      if (impulsiveSeq && impulsiveSeq.waves.length >= 3) {
        sequences.push(impulsiveSeq);
      }
    }
    
    // Try to identify corrective (3-wave) patterns
    for (let i = 0; i <= pivots.length - 4; i++) {
      const correctiveSeq = this.tryCorrectivePattern(pivots.slice(i, i + 6), klines, config);
      if (correctiveSeq && correctiveSeq.waves.length >= 2) {
        sequences.push(correctiveSeq);
      }
    }
    
    // Sort by validity and remove overlapping sequences
    return this.filterOverlappingSequences(sequences);
  }

  /**
   * Try to identify an impulsive 5-wave pattern
   */
  private tryImpulsivePattern(pivots: Pivot[], klines: OHLCV[], config: ElliottConfig): WaveSequence | null {
    if (pivots.length < 6) return null;
    
    const waves: ElliottWave[] = [];
    const startPivot = pivots[0];
    
    // Expected pattern: Low-High-Low-High-Low-High (or inverse)
    const isUptrend = startPivot.type === 'low';
    
    // Wave 1
    if (pivots[0].type !== (isUptrend ? 'low' : 'high') ||
        pivots[1].type !== (isUptrend ? 'high' : 'low')) {
      return null;
    }
    
    const wave1 = this.createWave(1, 'impulsive', 'motive', pivots[0], pivots[1], klines);
    if (!wave1 || Math.abs(wave1.length) < config.minWaveLength) return null;
    waves.push(wave1);
    
    // Wave 2
    if (pivots[2].type !== (isUptrend ? 'low' : 'high')) return null;
    
    const wave2 = this.createWave(2, 'impulsive', 'motive', pivots[1], pivots[2], klines);
    if (!wave2) return null;
    
    // Check Wave 2 rule: cannot retrace more than 100% of Wave 1
    const wave2Retracement = Math.abs(wave2.length / wave1.length);
    if (wave2Retracement > 1.0) return null;
    waves.push(wave2);
    
    // Wave 3
    if (pivots[3].type !== (isUptrend ? 'high' : 'low')) return null;
    
    const wave3 = this.createWave(3, 'impulsive', 'motive', pivots[2], pivots[3], klines);
    if (!wave3 || Math.abs(wave3.length) < Math.abs(wave1.length) * 0.618) return null;
    waves.push(wave3);
    
    // Wave 4 (if exists)
    if (pivots.length > 4 && pivots[4].type === (isUptrend ? 'low' : 'high')) {
      const wave4 = this.createWave(4, 'impulsive', 'motive', pivots[3], pivots[4], klines);
      if (wave4) {
        // Check Wave 4 rule: cannot overlap Wave 1
        const wave4Low = isUptrend ? pivots[4].price : pivots[3].price;
        const wave1High = isUptrend ? pivots[1].price : pivots[0].price;
        
        if ((isUptrend && wave4Low <= wave1High) || (!isUptrend && wave4Low >= wave1High)) {
          waves.push(wave4);
          
          // Wave 5 (if exists)
          if (pivots.length > 5 && pivots[5].type === (isUptrend ? 'high' : 'low')) {
            const wave5 = this.createWave(5, 'impulsive', 'motive', pivots[4], pivots[5], klines);
            if (wave5) waves.push(wave5);
          }
        }
      }
    }
    
    if (waves.length < 3) return null;
    
    // Calculate degree based on total price movement
    const totalMove = Math.abs((pivots[waves.length].price - pivots[0].price) / pivots[0].price * 100);
    const degree = this.determineDegree(totalMove, config);
    
    return {
      type: 'impulsive',
      waves,
      isComplete: waves.length === 5,
      degree,
      startTime: pivots[0].timestamp,
      endTime: pivots[waves.length].timestamp,
      validity: this.calculateSequenceValidity(waves, 'impulsive')
    };
  }

  /**
   * Try to identify a corrective 3-wave pattern
   */
  private tryCorrectivePattern(pivots: Pivot[], klines: OHLCV[], config: ElliottConfig): WaveSequence | null {
    if (pivots.length < 4) return null;
    
    const waves: ElliottWave[] = [];
    const startPivot = pivots[0];
    
    // Expected pattern: High-Low-High or Low-High-Low
    const isDownCorrection = startPivot.type === 'high';
    
    // Wave A
    if (pivots[1].type === startPivot.type) return null;
    
    const waveA = this.createWave('A'.charCodeAt(0), 'corrective', 'zigzag', pivots[0], pivots[1], klines);
    if (!waveA || Math.abs(waveA.length) < config.minWaveLength) return null;
    waves.push(waveA);
    
    // Wave B
    if (pivots.length > 2 && pivots[2].type === startPivot.type) {
      const waveB = this.createWave('B'.charCodeAt(0), 'corrective', 'zigzag', pivots[1], pivots[2], klines);
      if (waveB) {
        // Wave B typically retraces 38.2% to 61.8% of Wave A
        const retracementRatio = Math.abs(waveB.length / waveA.length);
        if (retracementRatio >= 0.2 && retracementRatio <= 0.9) {
          waves.push(waveB);
          
          // Wave C
          if (pivots.length > 3 && pivots[3].type !== startPivot.type) {
            const waveC = this.createWave('C'.charCodeAt(0), 'corrective', 'zigzag', pivots[2], pivots[3], klines);
            if (waveC) waves.push(waveC);
          }
        }
      }
    }
    
    if (waves.length < 2) return null;
    
    const totalMove = Math.abs((pivots[waves.length].price - pivots[0].price) / pivots[0].price * 100);
    const degree = this.determineDegree(totalMove, config);
    
    return {
      type: 'corrective',
      waves,
      isComplete: waves.length === 3,
      degree,
      startTime: pivots[0].timestamp,
      endTime: pivots[waves.length].timestamp,
      validity: this.calculateSequenceValidity(waves, 'corrective')
    };
  }

  /**
   * Create an Elliott Wave from two pivots
   */
  private createWave(
    number: number,
    type: 'impulsive' | 'corrective',
    subType: ElliottWave['subType'],
    startPivot: Pivot,
    endPivot: Pivot,
    klines: OHLCV[]
  ): ElliottWave {
    const length = ((endPivot.price - startPivot.price) / startPivot.price) * 100;
    const duration = endPivot.index - startPivot.index;
    
    // Calculate confidence based on pivot strengths and move size
    const avgStrength = (startPivot.strength + endPivot.strength) / 2;
    const moveSize = Math.abs(length);
    const confidence = Math.min(100, (avgStrength * 0.6 + Math.min(moveSize * 10, 40)));
    
    return {
      number,
      type,
      subType,
      startIndex: startPivot.index,
      endIndex: endPivot.index,
      startPrice: startPivot.price,
      endPrice: endPivot.price,
      startTime: startPivot.timestamp,
      endTime: endPivot.timestamp,
      length,
      duration,
      confidence
    };
  }

  /**
   * Determine wave degree based on price movement
   */
  private determineDegree(priceMove: number, config: ElliottConfig): WaveSequence['degree'] {
    if (priceMove >= config.degreeThresholds.intermediate) return 'intermediate';
    if (priceMove >= config.degreeThresholds.minor) return 'minor';
    if (priceMove >= config.degreeThresholds.minute) return 'minute';
    if (priceMove >= config.degreeThresholds.minuette) return 'minuette';
    return 'subminuette';
  }

  /**
   * Calculate sequence validity based on Elliott rules
   */
  private calculateSequenceValidity(waves: ElliottWave[], type: 'impulsive' | 'corrective'): number {
    let validity = 100;
    
    if (type === 'impulsive' && waves.length >= 3) {
      // Check Wave 3 is not the shortest
      const wave1Length = Math.abs(waves[0].length);
      const wave3Length = Math.abs(waves[2].length);
      
      if (wave3Length < wave1Length) {
        validity -= 30; // Major rule violation
      }
      
      // Check Wave 2 retracement
      if (waves.length >= 2) {
        const wave2Retracement = Math.abs(waves[1].length / waves[0].length);
        if (wave2Retracement > 0.786) validity -= 10;
        if (wave2Retracement < 0.236) validity -= 10;
      }
      
      // Check Wave 4 retracement
      if (waves.length >= 4) {
        const wave4Retracement = Math.abs(waves[3].length / waves[2].length);
        if (wave4Retracement > 0.618) validity -= 10;
        if (wave4Retracement < 0.236) validity -= 10;
      }
      
      // Bonus for complete 5-wave structure
      if (waves.length === 5) validity += 10;
    }
    
    if (type === 'corrective') {
      // Check typical corrective ratios
      if (waves.length >= 2) {
        const waveBRetracement = Math.abs(waves[1].length / waves[0].length);
        if (waveBRetracement >= 0.382 && waveBRetracement <= 0.618) {
          validity += 10;
        }
      }
      
      // Bonus for complete ABC structure
      if (waves.length === 3) validity += 10;
    }
    
    return Math.max(0, Math.min(100, validity));
  }

  /**
   * Filter overlapping sequences, keeping the most valid ones
   */
  private filterOverlappingSequences(sequences: WaveSequence[]): WaveSequence[] {
    // Sort by validity descending
    sequences.sort((a, b) => b.validity - a.validity);
    
    const filtered: WaveSequence[] = [];
    
    for (const seq of sequences) {
      let overlaps = false;
      
      for (const existing of filtered) {
        // Check if sequences overlap in time
        const seqStart = new Date(seq.startTime).getTime();
        const seqEnd = new Date(seq.endTime || seq.startTime).getTime();
        const existStart = new Date(existing.startTime).getTime();
        const existEnd = new Date(existing.endTime || existing.startTime).getTime();
        
        if ((seqStart >= existStart && seqStart <= existEnd) ||
            (seqEnd >= existStart && seqEnd <= existEnd) ||
            (seqStart <= existStart && seqEnd >= existEnd)) {
          overlaps = true;
          break;
        }
      }
      
      if (!overlaps) {
        filtered.push(seq);
      }
    }
    
    return filtered;
  }

  /**
   * Validate sequences against strict Elliott Wave rules
   */
  private validateSequences(sequences: WaveSequence[], config: ElliottConfig): WaveSequence[] {
    if (!config.strictRules) return sequences;
    
    return sequences.filter(seq => {
      if (seq.type === 'impulsive') {
        return this.validateImpulsiveSequence(seq);
      } else {
        return this.validateCorrectiveSequence(seq);
      }
    });
  }

  /**
   * Validate impulsive wave sequence
   */
  private validateImpulsiveSequence(seq: WaveSequence): boolean {
    if (seq.waves.length < 3) return false;
    
    const wave1 = seq.waves[0];
    const wave2 = seq.waves[1];
    const wave3 = seq.waves[2];
    
    // Wave 2 cannot retrace more than 100% of Wave 1
    if (Math.abs(wave2.length / wave1.length) > 1.0) return false;
    
    // Wave 3 cannot be the shortest
    if (Math.abs(wave3.length) < Math.abs(wave1.length)) return false;
    
    if (seq.waves.length >= 5) {
      const wave4 = seq.waves[3];
      const wave5 = seq.waves[4];
      
      // Wave 4 cannot overlap Wave 1 price territory
      const isUptrend = wave1.endPrice > wave1.startPrice;
      if (isUptrend) {
        if (wave4.endPrice <= wave1.endPrice) return false;
      } else {
        if (wave4.endPrice >= wave1.endPrice) return false;
      }
      
      // Wave 3 cannot be the shortest among 1, 3, and 5
      if (Math.abs(wave3.length) < Math.abs(wave5.length)) return false;
    }
    
    return true;
  }

  /**
   * Validate corrective wave sequence
   */
  private validateCorrectiveSequence(seq: WaveSequence): boolean {
    if (seq.waves.length < 2) return false;
    
    const waveA = seq.waves[0];
    const waveB = seq.waves[1];
    
    // Wave B typically doesn't exceed 100% of Wave A
    if (Math.abs(waveB.length / waveA.length) > 1.382) return false;
    
    if (seq.waves.length === 3) {
      const waveC = seq.waves[2];
      
      // Wave C often equals Wave A or is 1.618 times Wave A
      const cToARatio = Math.abs(waveC.length / waveA.length);
      
      // Allow some flexibility in the ratio
      if (cToARatio < 0.5 || cToARatio > 2.618) return false;
    }
    
    return true;
  }

  /**
   * Find the most recent active sequence
   */
  private findCurrentSequence(sequences: WaveSequence[], klines: OHLCV[]): WaveSequence {
    if (sequences.length === 0) {
      return {
        type: 'impulsive',
        waves: [],
        isComplete: false,
        degree: 'minuette',
        startTime: new Date().toISOString(),
        validity: 0
      };
    }
    
    // Sort by end time (most recent first)
    const sortedSequences = [...sequences].sort((a, b) => {
      const timeA = new Date(a.endTime || a.startTime).getTime();
      const timeB = new Date(b.endTime || b.startTime).getTime();
      return timeB - timeA;
    });
    
    // Find the most recent incomplete sequence or the most recent complete one
    const incompleteSeq = sortedSequences.find(seq => !seq.isComplete);
    return incompleteSeq || sortedSequences[0];
  }

  /**
   * FASE 2A: Analyze current position within Elliott Wave structure
   */
  private analyzeCurrentWavePosition(sequence: WaveSequence, currentPrice: number): ElliottWaveAnalysis['currentWave'] {
    if (!sequence || sequence.waves.length === 0) {
      return {
        wave: null,
        position: 'uncertain',
        nextExpected: 'Waiting for initial wave formation'
      };
    }

    const lastWave = sequence.waves[sequence.waves.length - 1];
    const isUptrend = sequence.waves[0].endPrice > sequence.waves[0].startPrice;
    
    // Determine position within current wave
    const priceRange = Math.abs(lastWave.endPrice - lastWave.startPrice);
    const currentDistance = Math.abs(currentPrice - lastWave.startPrice);
    const positionRatio = currentDistance / priceRange;
    
    let position: 'beginning' | 'middle' | 'end' | 'uncertain';
    if (positionRatio < 0.33) position = 'beginning';
    else if (positionRatio < 0.67) position = 'middle';
    else if (positionRatio <= 1.1) position = 'end';
    else position = 'uncertain';
    
    // Determine next expected wave
    let nextExpected = '';
    if (sequence.type === 'impulsive') {
      if (sequence.waves.length === 1) {
        nextExpected = 'Wave 2 correction expected (38.2%-61.8% retracement)';
      } else if (sequence.waves.length === 2) {
        nextExpected = 'Wave 3 impulse expected (strongest move, often 1.618x Wave 1)';
      } else if (sequence.waves.length === 3) {
        nextExpected = 'Wave 4 correction expected (typically 38.2%-50% of Wave 3)';
      } else if (sequence.waves.length === 4) {
        nextExpected = 'Wave 5 final impulse expected (often equals Wave 1 or 0.618x Wave 3)';
      } else {
        nextExpected = 'Impulsive sequence complete, correction phase likely';
      }
    } else {
      if (sequence.waves.length === 1) {
        nextExpected = 'Wave B correction expected (38.2%-78.6% retracement)';
      } else if (sequence.waves.length === 2) {
        nextExpected = 'Wave C impulse expected (often 1.0x or 1.618x Wave A)';
      } else {
        nextExpected = 'Corrective sequence complete, new impulse likely';
      }
    }
    
    return {
      wave: lastWave,
      position,
      nextExpected
    };
  }

  /**
   * FASE 2B: Generate wave projections based on Fibonacci ratios
   */
  private generateWaveProjections(sequence: WaveSequence, klines: OHLCV[], config: ElliottConfig): WaveProjection[] {
    const projections: WaveProjection[] = [];
    
    if (!sequence || sequence.waves.length === 0) return projections;
    
    const lastWave = sequence.waves[sequence.waves.length - 1];
    const isUptrend = sequence.waves[0].endPrice > sequence.waves[0].startPrice;
    
    if (sequence.type === 'impulsive') {
      if (sequence.waves.length === 1) {
        // Project Wave 2
        const wave1 = sequence.waves[0];
        projections.push(this.projectWave2(wave1, isUptrend));
      } else if (sequence.waves.length === 2) {
        // Project Wave 3
        const wave1 = sequence.waves[0];
        const wave2 = sequence.waves[1];
        projections.push(this.projectWave3(wave1, wave2, isUptrend));
      } else if (sequence.waves.length === 3) {
        // Project Wave 4
        const wave3 = sequence.waves[2];
        projections.push(this.projectWave4(wave3, isUptrend));
      } else if (sequence.waves.length === 4) {
        // Project Wave 5
        const wave1 = sequence.waves[0];
        const wave3 = sequence.waves[2];
        const wave4 = sequence.waves[3];
        projections.push(this.projectWave5(wave1, wave3, wave4, isUptrend));
      }
    } else {
      // Corrective projections
      if (sequence.waves.length === 1) {
        // Project Wave B
        const waveA = sequence.waves[0];
        projections.push(this.projectWaveB(waveA, isUptrend));
      } else if (sequence.waves.length === 2) {
        // Project Wave C
        const waveA = sequence.waves[0];
        const waveB = sequence.waves[1];
        projections.push(this.projectWaveC(waveA, waveB, isUptrend));
      }
    }
    
    return projections;
  }

  private projectWave2(wave1: ElliottWave, isUptrend: boolean): WaveProjection {
    const startPrice = wave1.endPrice;
    const wave1Length = Math.abs(wave1.endPrice - wave1.startPrice);
    
    const retracements = [
      { ratio: 0.236, description: 'Shallow correction' },
      { ratio: 0.382, description: 'Common correction' },
      { ratio: 0.5, description: 'Moderate correction' },
      { ratio: 0.618, description: 'Deep correction' },
      { ratio: 0.786, description: 'Very deep correction' }
    ];
    
    const fibonacciRatios = retracements.map(r => ({
      ratio: r.ratio,
      price: isUptrend ? startPrice - wave1Length * r.ratio : startPrice + wave1Length * r.ratio,
      description: r.description
    }));
    
    return {
      targetWave: 2,
      targets: {
        conservative: fibonacciRatios[1].price, // 0.382
        normal: fibonacciRatios[2].price,      // 0.5
        extended: fibonacciRatios[3].price      // 0.618
      },
      fibonacciRatios,
      timeProjection: {
        minPeriods: Math.floor(wave1.duration * 0.382),
        maxPeriods: Math.floor(wave1.duration * 1.0),
        estimatedCompletion: this.calculateTimeProjection(wave1.endTime, wave1.duration * 0.618)
      },
      probability: 75
    };
  }

  private projectWave3(wave1: ElliottWave, wave2: ElliottWave, isUptrend: boolean): WaveProjection {
    const startPrice = wave2.endPrice;
    const wave1Length = Math.abs(wave1.endPrice - wave1.startPrice);
    
    const extensions = [
      { ratio: 1.0, description: 'Equal to Wave 1' },
      { ratio: 1.272, description: 'Common extension' },
      { ratio: 1.618, description: 'Golden ratio extension' },
      { ratio: 2.0, description: 'Double Wave 1' },
      { ratio: 2.618, description: 'Extended Wave 3' }
    ];
    
    const fibonacciRatios = extensions.map(r => ({
      ratio: r.ratio,
      price: isUptrend ? startPrice + wave1Length * r.ratio : startPrice - wave1Length * r.ratio,
      description: r.description
    }));
    
    return {
      targetWave: 3,
      targets: {
        conservative: fibonacciRatios[0].price, // 1.0
        normal: fibonacciRatios[2].price,      // 1.618
        extended: fibonacciRatios[4].price      // 2.618
      },
      fibonacciRatios,
      timeProjection: {
        minPeriods: Math.floor(wave1.duration * 1.0),
        maxPeriods: Math.floor(wave1.duration * 2.618),
        estimatedCompletion: this.calculateTimeProjection(wave2.endTime, wave1.duration * 1.618)
      },
      probability: 85
    };
  }

  private projectWave4(wave3: ElliottWave, isUptrend: boolean): WaveProjection {
    const startPrice = wave3.endPrice;
    const wave3Length = Math.abs(wave3.endPrice - wave3.startPrice);
    
    const retracements = [
      { ratio: 0.236, description: 'Shallow correction' },
      { ratio: 0.382, description: 'Common correction' },
      { ratio: 0.5, description: 'Moderate correction' }
    ];
    
    const fibonacciRatios = retracements.map(r => ({
      ratio: r.ratio,
      price: isUptrend ? startPrice - wave3Length * r.ratio : startPrice + wave3Length * r.ratio,
      description: r.description
    }));
    
    return {
      targetWave: 4,
      targets: {
        conservative: fibonacciRatios[0].price, // 0.236
        normal: fibonacciRatios[1].price,      // 0.382
        extended: fibonacciRatios[2].price      // 0.5
      },
      fibonacciRatios,
      timeProjection: {
        minPeriods: Math.floor(wave3.duration * 0.382),
        maxPeriods: Math.floor(wave3.duration * 1.0),
        estimatedCompletion: this.calculateTimeProjection(wave3.endTime, wave3.duration * 0.618)
      },
      probability: 70
    };
  }

  private projectWave5(wave1: ElliottWave, wave3: ElliottWave, wave4: ElliottWave, isUptrend: boolean): WaveProjection {
    const startPrice = wave4.endPrice;
    const wave1Length = Math.abs(wave1.endPrice - wave1.startPrice);
    const wave3Length = Math.abs(wave3.endPrice - wave3.startPrice);
    
    const projections = [
      { ratio: 0.618, length: wave3Length * 0.618, description: '0.618 of Wave 3' },
      { ratio: 1.0, length: wave1Length, description: 'Equal to Wave 1' },
      { ratio: 1.618, length: wave1Length * 1.618, description: '1.618 of Wave 1' }
    ];
    
    const fibonacciRatios = projections.map(p => ({
      ratio: p.ratio,
      price: isUptrend ? startPrice + p.length : startPrice - p.length,
      description: p.description
    }));
    
    return {
      targetWave: 5,
      targets: {
        conservative: fibonacciRatios[0].price,
        normal: fibonacciRatios[1].price,
        extended: fibonacciRatios[2].price
      },
      fibonacciRatios,
      timeProjection: {
        minPeriods: Math.floor(wave1.duration * 0.618),
        maxPeriods: Math.floor(wave1.duration * 1.618),
        estimatedCompletion: this.calculateTimeProjection(wave4.endTime, wave1.duration)
      },
      probability: 65
    };
  }

  private projectWaveB(waveA: ElliottWave, isDownCorrection: boolean): WaveProjection {
    const startPrice = waveA.endPrice;
    const waveALength = Math.abs(waveA.endPrice - waveA.startPrice);
    
    const retracements = [
      { ratio: 0.382, description: 'Weak correction' },
      { ratio: 0.5, description: 'Normal correction' },
      { ratio: 0.618, description: 'Strong correction' },
      { ratio: 0.786, description: 'Deep correction' }
    ];
    
    const fibonacciRatios = retracements.map(r => ({
      ratio: r.ratio,
      price: isDownCorrection ? startPrice + waveALength * r.ratio : startPrice - waveALength * r.ratio,
      description: r.description
    }));
    
    return {
      targetWave: 'B'.charCodeAt(0),
      targets: {
        conservative: fibonacciRatios[0].price,
        normal: fibonacciRatios[1].price,
        extended: fibonacciRatios[2].price
      },
      fibonacciRatios,
      probability: 70
    };
  }

  private projectWaveC(waveA: ElliottWave, waveB: ElliottWave, isDownCorrection: boolean): WaveProjection {
    const startPrice = waveB.endPrice;
    const waveALength = Math.abs(waveA.endPrice - waveA.startPrice);
    
    const projections = [
      { ratio: 0.618, description: '0.618 of Wave A' },
      { ratio: 1.0, description: 'Equal to Wave A' },
      { ratio: 1.618, description: '1.618 of Wave A' }
    ];
    
    const fibonacciRatios = projections.map(p => ({
      ratio: p.ratio,
      price: isDownCorrection ? startPrice - waveALength * p.ratio : startPrice + waveALength * p.ratio,
      description: p.description
    }));
    
    return {
      targetWave: 'C'.charCodeAt(0),
      targets: {
        conservative: fibonacciRatios[0].price,
        normal: fibonacciRatios[1].price,
        extended: fibonacciRatios[2].price
      },
      fibonacciRatios,
      probability: 75
    };
  }

  private calculateTimeProjection(startTime: string, periods: number): string {
    const start = new Date(startTime);
    const hours = Math.floor(periods);
    start.setHours(start.getHours() + hours);
    return start.toISOString();
  }

  /**
   * Validate Elliott Wave rules comprehensively
   */
  private validateElliottRules(sequence: WaveSequence): ElliottWaveAnalysis['ruleValidation'] {
    if (!sequence || sequence.waves.length < 2) {
      return {
        wave2Rule: true,
        wave3Rule: true,
        wave4Rule: true,
        alternationRule: true,
        channelRule: true,
        overallValidity: 0
      };
    }

    let wave2Rule = true;
    let wave3Rule = true;
    let wave4Rule = true;
    let alternationRule = true;
    let channelRule = true;
    let violations = 0;

    if (sequence.type === 'impulsive' && sequence.waves.length >= 2) {
      const wave1 = sequence.waves[0];
      const wave2 = sequence.waves[1];
      
      // Wave 2 Rule
      const wave2Retracement = Math.abs(wave2.length / wave1.length);
      if (wave2Retracement > 1.0) {
        wave2Rule = false;
        violations += 2;
      }
      
      if (sequence.waves.length >= 3) {
        const wave3 = sequence.waves[2];
        
        // Wave 3 Rule
        if (Math.abs(wave3.length) < Math.abs(wave1.length)) {
          wave3Rule = false;
          violations += 2;
        }
        
        if (sequence.waves.length >= 5) {
          const wave4 = sequence.waves[3];
          const wave5 = sequence.waves[4];
          
          // Wave 4 Rule
          const isUptrend = wave1.endPrice > wave1.startPrice;
          if ((isUptrend && wave4.endPrice <= wave1.endPrice) || 
              (!isUptrend && wave4.endPrice >= wave1.endPrice)) {
            wave4Rule = false;
            violations += 2;
          }
          
          // Check Wave 3 is not shortest among 1, 3, 5
          const lengths = [Math.abs(wave1.length), Math.abs(wave3.length), Math.abs(wave5.length)];
          if (Math.abs(wave3.length) === Math.min(...lengths)) {
            wave3Rule = false;
            violations += 1;
          }
          
          // Alternation Rule
          const wave2IsSharp = Math.abs(wave2.length / wave1.length) > 0.618;
          const wave4IsSharp = Math.abs(wave4.length / wave3.length) > 0.5;
          if (wave2IsSharp === wave4IsSharp) {
            alternationRule = false;
            violations += 1;
          }
        }
      }
    }

    const overallValidity = Math.max(0, 100 - violations * 10);

    return {
      wave2Rule,
      wave3Rule,
      wave4Rule,
      alternationRule,
      channelRule,
      overallValidity
    };
  }

  /**
   * Generate trading signals based on Elliott Wave analysis
   */
  private generateElliottSignals(
    sequence: WaveSequence,
    currentWave: ElliottWaveAnalysis['currentWave'],
    projections: WaveProjection[],
    ruleValidation: ElliottWaveAnalysis['ruleValidation'],
    currentPrice: number
  ): ElliottWaveAnalysis['signals'] {
    if (!sequence || sequence.waves.length === 0 || ruleValidation.overallValidity < 50) {
      return {
        signal: 'hold',
        strength: 30,
        reasoning: 'Insufficient Elliott Wave structure or low validity',
        waveContext: 'Pattern not clear',
        riskLevel: 'high'
      };
    }

    const lastWave = sequence.waves[sequence.waves.length - 1];
    const isUptrend = sequence.waves[0].endPrice > sequence.waves[0].startPrice;
    let signal: 'buy' | 'sell' | 'hold' | 'wait' = 'hold';
    let strength = 50;
    let reasoning = '';
    let waveContext = '';
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';

    if (sequence.type === 'impulsive') {
      if (sequence.waves.length === 2 && currentWave.position === 'end') {
        // End of Wave 2 - Strong buy/sell for Wave 3
        signal = isUptrend ? 'buy' : 'sell';
        strength = 85;
        reasoning = 'Wave 3 starting - strongest and most profitable wave';
        waveContext = 'Beginning of Wave 3';
        riskLevel = 'low';
      } else if (sequence.waves.length === 4 && currentWave.position === 'end') {
        // End of Wave 4 - Buy/sell for Wave 5
        signal = isUptrend ? 'buy' : 'sell';
        strength = 70;
        reasoning = 'Wave 5 starting - final impulse wave';
        waveContext = 'Beginning of Wave 5';
        riskLevel = 'medium';
      } else if (sequence.waves.length === 5 && currentWave.position === 'end') {
        // End of Wave 5 - Reversal expected
        signal = isUptrend ? 'sell' : 'buy';
        strength = 75;
        reasoning = 'Impulse complete - correction expected';
        waveContext = 'End of 5-wave sequence';
        riskLevel = 'medium';
      } else if ((sequence.waves.length === 1 || sequence.waves.length === 3) && currentWave.position === 'end') {
        // End of impulse waves - wait for correction
        signal = 'wait';
        strength = 60;
        reasoning = 'Correction expected - wait for better entry';
        waveContext = `End of Wave ${sequence.waves.length}`;
        riskLevel = 'high';
      }
    } else {
      // Corrective sequence
      if (sequence.waves.length === 2 && currentWave.position === 'end') {
        // End of Wave B - Trade Wave C
        signal = sequence.waves[0].endPrice < sequence.waves[0].startPrice ? 'sell' : 'buy';
        strength = 70;
        reasoning = 'Wave C starting - final corrective wave';
        waveContext = 'Beginning of Wave C';
        riskLevel = 'medium';
      } else if (sequence.waves.length === 3 && currentWave.position === 'end') {
        // End of correction - New impulse expected
        signal = sequence.waves[0].endPrice < sequence.waves[0].startPrice ? 'buy' : 'sell';
        strength = 65;
        reasoning = 'Correction complete - new impulse expected';
        waveContext = 'End of ABC correction';
        riskLevel = 'medium';
      }
    }

    // Adjust strength based on rule validation
    strength = Math.floor(strength * (ruleValidation.overallValidity / 100));

    return {
      signal,
      strength,
      reasoning,
      waveContext,
      riskLevel
    };
  }

  private calculateAnalysisConfidence(sequence: WaveSequence, ruleValidation: ElliottWaveAnalysis['ruleValidation'], pivotCount: number): number {
    let confidence = 0;
    
    // Base confidence from pivot count
    if (pivotCount >= 20) confidence += 30;
    else if (pivotCount >= 15) confidence += 20;
    else if (pivotCount >= 10) confidence += 10;
    
    // Add rule validation score
    confidence += ruleValidation.overallValidity * 0.5;
    
    // Add sequence validity
    confidence += sequence.validity * 0.2;
    
    return Math.min(100, confidence);
  }
}
