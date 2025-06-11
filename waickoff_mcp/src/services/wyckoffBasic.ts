/**
 * @fileoverview Wyckoff Basic Analysis Service
 * @description Implements basic Wyckoff methodology for phase detection and market structure analysis
 * @version 1.0.0
 */

import type {
  OHLCV,
  VolumeAnalysis,
  SupportResistanceAnalysis,
  IMarketDataService,
  IAnalysisService,
  PerformanceMetrics,
  IHistoricalAnalysisService
} from '../types/index.js';

import { PerformanceMonitor } from '../utils/performance.js';
import { FileLogger } from '../utils/fileLogger.js';
import * as path from 'path';

// ====================
// WYCKOFF TYPES
// ====================

export type WyckoffPhase = 
  | 'accumulation_phase_a'    // Selling climax, automatic reaction
  | 'accumulation_phase_b'    // Building cause, testing supply
  | 'accumulation_phase_c'    // Spring, last point of supply
  | 'accumulation_phase_d'    // Signs of strength appearing
  | 'accumulation_phase_e'    // Last point of support before markup
  | 'markup'                  // Trending phase up
  | 'distribution_phase_a'    // Preliminary supply, buying climax
  | 'distribution_phase_b'    // Building cause, testing demand
  | 'distribution_phase_c'    // Upthrust, last point of demand
  | 'distribution_phase_d'    // Signs of weakness appearing
  | 'distribution_phase_e'    // Last point of support before markdown
  | 'markdown'               // Trending phase down
  | 'reaccumulation'         // Secondary accumulation in uptrend
  | 'redistribution'         // Secondary distribution in downtrend
  | 'uncertain';             // No clear phase detected

export interface WyckoffPhaseAnalysis {
  symbol: string;
  timeframe: string;
  analysisDate: Date;
  currentPhase: WyckoffPhase;
  phaseConfidence: number; // 0-100
  phaseProgress: number; // 0-100 completion percentage
  tradingRange?: TradingRange;
  keyEvents: WyckoffEvent[];
  volumeCharacteristics: VolumeContext;
  interpretation: {
    bias: 'accumulation' | 'distribution' | 'trending' | 'uncertain';
    strength: 'weak' | 'moderate' | 'strong';
    implications: string[];
    nextExpectedEvents: string[];
  };
}

export interface TradingRange {
  startDate: Date;
  endDate?: Date;
  support: number;
  resistance: number;
  duration: number; // days
  width: number; // percentage range
  volumeProfile: {
    averageVolume: number;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
    significantEvents: VolumeEvent[];
  };
  strength: 'weak' | 'moderate' | 'strong';
  type: 'accumulation' | 'distribution' | 'consolidation';
}

export interface WyckoffEvent {
  timestamp: Date;
  type: 'spring' | 'upthrust' | 'test' | 'shakeout' | 'jump_across_creek' | 'sign_of_strength' | 'sign_of_weakness';
  price: number;
  volume: number;
  significance: number; // 0-100
  description: string;
  context: {
    phaseAtTime: WyckoffPhase;
    relativeToRange: 'below_support' | 'at_support' | 'within_range' | 'at_resistance' | 'above_resistance';
    volumeCharacter: 'high' | 'normal' | 'low';
  };
}

export interface SpringEvent extends WyckoffEvent {
  type: 'spring';
  penetrationDepth: number; // how far below support
  recoverySpeed: number; // how quickly it recovered
  volumeOnPenetration: number;
  volumeOnRecovery: number;
  isSuccessful: boolean; // did it lead to markup?
}

export interface UpthrustEvent extends WyckoffEvent {
  type: 'upthrust';
  penetrationHeight: number; // how far above resistance
  rejectionSpeed: number; // how quickly it was rejected
  volumeOnPenetration: number;
  volumeOnRejection: number;
  isSuccessful: boolean; // did it lead to markdown?
}

export interface TestEvent extends WyckoffEvent {
  type: 'test';
  levelTested: number;
  testQuality: 'good' | 'poor' | 'failed';
  volumeOnTest: number;
  resultingAction: 'bounce' | 'break' | 'stall';
}

export interface VolumeContext {
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  climaxEvents: ClimaxEvent[];
  dryUpPeriods: DryUpPeriod[];
  avgVolumeInRange: number;
  currentVolumeRank: number; // percentile of current volume vs range
  interpretation: string;
}

export interface ClimaxEvent {
  date: Date;
  type: 'buying_climax' | 'selling_climax';
  volume: number;
  priceAction: string;
  significance: number;
}

export interface DryUpPeriod {
  startDate: Date;
  endDate: Date;
  averageVolume: number;
  significance: 'minor' | 'moderate' | 'major';
}

export interface VolumeEvent {
  date: Date;
  volume: number;
  type: 'spike' | 'dry_up' | 'climax';
  significance: number;
}

export interface TradingRangeAnalysis {
  tradingRange: TradingRange | null;
  rangeQuality: 'excellent' | 'good' | 'poor' | 'invalid';
  confidence: number;
  keyLevels: {
    support: number;
    resistance: number;
    midpoint: number;
  };
  volumeCharacteristics: VolumeContext;
  recommendations: string[];
}

// ====================
// SERVICE INTERFACE
// ====================

export interface IWyckoffBasicService {
  analyzeWyckoffPhase(
    symbol: string, 
    timeframe: string,
    lookback?: number
  ): Promise<WyckoffPhaseAnalysis>;

  detectTradingRange(
    symbol: string,
    timeframe: string,
    minPeriods?: number
  ): Promise<TradingRangeAnalysis>;

  detectSprings(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<SpringEvent[]>;

  detectUpthrusts(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<UpthrustEvent[]>;

  detectTestEvents(
    symbol: string,
    timeframe: string,
    keyLevels: number[]
  ): Promise<TestEvent[]>;

  analyzeWyckoffVolume(
    symbol: string,
    timeframe: string,
    klines: OHLCV[]
  ): Promise<VolumeContext>;

  getPerformanceMetrics(): PerformanceMetrics[];
}

// ====================
// SERVICE IMPLEMENTATION
// ====================

export class WyckoffBasicService implements IWyckoffBasicService {
  private readonly logger: FileLogger;
  private readonly performanceMonitor: PerformanceMonitor;

  constructor(
    private readonly marketDataService: IMarketDataService,
    private readonly analysisService: IAnalysisService,
    private readonly historicalAnalysisService?: IHistoricalAnalysisService
  ) {
    this.logger = new FileLogger('WyckoffBasicService', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Analyze current Wyckoff phase for a symbol
   */
  async analyzeWyckoffPhase(
    symbol: string, 
    timeframe: string = '60',
    lookback: number = 100
  ): Promise<WyckoffPhaseAnalysis> {
    return this.performanceMonitor.measure('analyzeWyckoffPhase', async () => {
      try {
        this.logger.info(`Analyzing Wyckoff phase for ${symbol} (${timeframe})`);

        // Get market data
        const klines = await this.marketDataService.getKlines(symbol, timeframe, lookback);
        
        // Get support/resistance analysis
        const srAnalysis = await this.analysisService.identifySupportResistance(symbol, timeframe, lookback);
        
        // Get volume analysis
        const volumeAnalysis = await this.analysisService.analyzeVolume(symbol, timeframe, Math.min(lookback, 48));

        // Detect trading range
        const tradingRangeAnalysis = await this.detectTradingRange(symbol, timeframe, 20);
        
        // Analyze volume in Wyckoff context
        const volumeContext = await this.analyzeWyckoffVolume(symbol, timeframe, klines);

        // Detect key Wyckoff events
        const keyEvents = await this.detectWyckoffEvents(symbol, timeframe, klines, tradingRangeAnalysis.tradingRange, srAnalysis);

        // Determine current phase
        const phaseAnalysis = this.classifyWyckoffPhase(
          klines,
          tradingRangeAnalysis.tradingRange,
          keyEvents,
          volumeContext,
          srAnalysis
        );

        const analysis: WyckoffPhaseAnalysis = {
          symbol,
          timeframe,
          analysisDate: new Date(),
          currentPhase: phaseAnalysis.phase,
          phaseConfidence: phaseAnalysis.confidence,
          phaseProgress: phaseAnalysis.progress,
          tradingRange: tradingRangeAnalysis.tradingRange || undefined,
          keyEvents,
          volumeCharacteristics: volumeContext,
          interpretation: phaseAnalysis.interpretation
        };

        this.logger.info(`Wyckoff analysis complete for ${symbol}: ${phaseAnalysis.phase} (${phaseAnalysis.confidence}% confidence)`);
        return analysis;

      } catch (error) {
        this.logger.error(`Failed to analyze Wyckoff phase for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Detect trading range (consolidation area)
   */
  async detectTradingRange(
    symbol: string,
    timeframe: string = '60',
    minPeriods: number = 20
  ): Promise<TradingRangeAnalysis> {
    return this.performanceMonitor.measure('detectTradingRange', async () => {
      try {
        this.logger.info(`Detecting trading range for ${symbol} (${timeframe})`);

        // Get market data with extra lookback for context
        const klines = await this.marketDataService.getKlines(symbol, timeframe, Math.min(minPeriods * 3, 200));
        
        if (klines.length < minPeriods) {
          return {
            tradingRange: null,
            rangeQuality: 'invalid',
            confidence: 0,
            keyLevels: { support: 0, resistance: 0, midpoint: 0 },
            volumeCharacteristics: await this.createEmptyVolumeContext(),
            recommendations: ['Insufficient data for trading range detection']
          };
        }

        // Detect consolidation periods
        const tradingRange = this.identifyTradingRange(klines, minPeriods);
        
        if (!tradingRange) {
          return {
            tradingRange: null,
            rangeQuality: 'invalid',
            confidence: 0,
            keyLevels: { support: 0, resistance: 0, midpoint: 0 },
            volumeCharacteristics: await this.createEmptyVolumeContext(),
            recommendations: ['No clear trading range detected']
          };
        }

        // Analyze volume characteristics
        const volumeContext = await this.analyzeWyckoffVolume(symbol, timeframe, klines);

        // Quality assessment
        const quality = this.assessRangeQuality(tradingRange, klines, volumeContext);
        
        const analysis: TradingRangeAnalysis = {
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

        this.logger.info(`Trading range detected for ${symbol}: ${tradingRange.support.toFixed(4)} - ${tradingRange.resistance.toFixed(4)} (${quality.grade})`);
        return analysis;

      } catch (error) {
        this.logger.error(`Failed to detect trading range for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Detect spring events (false breakdowns below support)
   */
  async detectSprings(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<SpringEvent[]> {
    return this.performanceMonitor.measure('detectSprings', async () => {
      try {
        const klines = await this.marketDataService.getKlines(symbol, timeframe, 100);
        const springs: SpringEvent[] = [];

        for (let i = 1; i < klines.length - 1; i++) {
          const current = klines[i];
          const next = klines[i + 1];
          
          // Check if price broke below support
          if (current.low < tradingRange.support && current.close > tradingRange.support) {
            const penetrationDepth = ((tradingRange.support - current.low) / tradingRange.support) * 100;
            
            // Check for quick recovery (next candle closes above support)
            if (next.close > tradingRange.support) {
              const recoverySpeed = ((next.close - current.low) / current.low) * 100;
              
              const spring: SpringEvent = {
                timestamp: new Date(current.timestamp),
                type: 'spring',
                price: current.low,
                volume: current.volume,
                significance: this.calculateSpringSignificance(penetrationDepth, recoverySpeed, current.volume),
                description: `Spring: ${penetrationDepth.toFixed(2)}% below support, recovered ${recoverySpeed.toFixed(2)}%`,
                context: {
                  phaseAtTime: 'accumulation_phase_c',
                  relativeToRange: 'below_support',
                  volumeCharacter: this.classifyVolumeCharacter(current.volume, tradingRange.volumeProfile.averageVolume)
                },
                penetrationDepth,
                recoverySpeed,
                volumeOnPenetration: current.volume,
                volumeOnRecovery: next.volume,
                isSuccessful: this.evaluateSpringSuccess(klines, i, tradingRange)
              };
              
              springs.push(spring);
            }
          }
        }

        this.logger.info(`Detected ${springs.length} spring events for ${symbol}`);
        return springs;

      } catch (error) {
        this.logger.error(`Failed to detect springs for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Detect upthrust events (false breakouts above resistance)
   */
  async detectUpthrusts(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<UpthrustEvent[]> {
    return this.performanceMonitor.measure('detectUpthrusts', async () => {
      try {
        const klines = await this.marketDataService.getKlines(symbol, timeframe, 100);
        const upthrusts: UpthrustEvent[] = [];

        for (let i = 1; i < klines.length - 1; i++) {
          const current = klines[i];
          const next = klines[i + 1];
          
          // Check if price broke above resistance
          if (current.high > tradingRange.resistance && current.close < tradingRange.resistance) {
            const penetrationHeight = ((current.high - tradingRange.resistance) / tradingRange.resistance) * 100;
            
            // Check for quick rejection (next candle closes below resistance)
            if (next.close < tradingRange.resistance) {
              const rejectionSpeed = ((current.high - next.close) / current.high) * 100;
              
              const upthrust: UpthrustEvent = {
                timestamp: new Date(current.timestamp),
                type: 'upthrust',
                price: current.high,
                volume: current.volume,
                significance: this.calculateUpthrustSignificance(penetrationHeight, rejectionSpeed, current.volume),
                description: `Upthrust: ${penetrationHeight.toFixed(2)}% above resistance, rejected ${rejectionSpeed.toFixed(2)}%`,
                context: {
                  phaseAtTime: 'distribution_phase_c',
                  relativeToRange: 'above_resistance',
                  volumeCharacter: this.classifyVolumeCharacter(current.volume, tradingRange.volumeProfile.averageVolume)
                },
                penetrationHeight,
                rejectionSpeed,
                volumeOnPenetration: current.volume,
                volumeOnRejection: next.volume,
                isSuccessful: this.evaluateUpthrustSuccess(klines, i, tradingRange)
              };
              
              upthrusts.push(upthrust);
            }
          }
        }

        this.logger.info(`Detected ${upthrusts.length} upthrust events for ${symbol}`);
        return upthrusts;

      } catch (error) {
        this.logger.error(`Failed to detect upthrusts for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Detect test events (retests of key levels)
   */
  async detectTestEvents(
    symbol: string,
    timeframe: string,
    keyLevels: number[]
  ): Promise<TestEvent[]> {
    return this.performanceMonitor.measure('detectTestEvents', async () => {
      try {
        const klines = await this.marketDataService.getKlines(symbol, timeframe, 100);
        const tests: TestEvent[] = [];

        for (const level of keyLevels) {
          for (let i = 1; i < klines.length - 1; i++) {
            const current = klines[i];
            const next = klines[i + 1];
            
            // Check if price tested the level (within 0.5% tolerance)
            const tolerance = level * 0.005;
            if (Math.abs(current.low - level) <= tolerance || Math.abs(current.high - level) <= tolerance) {
              
              // Determine resulting action
              let resultingAction: 'bounce' | 'break' | 'stall';
              if (current.low <= level && next.close > level + tolerance) {
                resultingAction = 'bounce';
              } else if (current.high >= level && next.close < level - tolerance) {
                resultingAction = 'bounce';
              } else if (Math.abs(next.close - level) > tolerance * 2) {
                resultingAction = 'break';
              } else {
                resultingAction = 'stall';
              }

              // Assess test quality
              const testQuality = this.assessTestQuality(current, level, resultingAction);

              const test: TestEvent = {
                timestamp: new Date(current.timestamp),
                type: 'test',
                price: current.low <= level ? current.low : current.high,
                volume: current.volume,
                significance: this.calculateTestSignificance(testQuality, current.volume),
                description: `Test of ${level.toFixed(4)}: ${resultingAction} with ${testQuality} quality`,
                context: {
                  phaseAtTime: 'uncertain',
                  relativeToRange: this.determineRelativePosition(current.close, level),
                  volumeCharacter: 'normal' // Would need range context for proper classification
                },
                levelTested: level,
                testQuality,
                volumeOnTest: current.volume,
                resultingAction
              };
              
              tests.push(test);
            }
          }
        }

        this.logger.info(`Detected ${tests.length} test events for ${symbol}`);
        return tests;

      } catch (error) {
        this.logger.error(`Failed to detect test events for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Analyze volume in Wyckoff context
   */
  async analyzeWyckoffVolume(
    symbol: string,
    timeframe: string,
    klines: OHLCV[]
  ): Promise<VolumeContext> {
    return this.performanceMonitor.measure('analyzeWyckoffVolume', async () => {
      try {
        if (klines.length === 0) {
          return this.createEmptyVolumeContext();
        }

        // Calculate average volume
        const avgVolume = klines.reduce((sum, k) => sum + k.volume, 0) / klines.length;
        
        // Identify volume trend
        const recentVolumes = klines.slice(-10).map(k => k.volume);
        const earlierVolumes = klines.slice(-20, -10).map(k => k.volume);
        const recentAvg = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
        const earlierAvg = earlierVolumes.reduce((sum, v) => sum + v, 0) / earlierVolumes.length;
        
        let overallTrend: 'increasing' | 'decreasing' | 'stable';
        if (recentAvg > earlierAvg * 1.2) {
          overallTrend = 'increasing';
        } else if (recentAvg < earlierAvg * 0.8) {
          overallTrend = 'decreasing';
        } else {
          overallTrend = 'stable';
        }

        // Detect climax events
        const climaxEvents: ClimaxEvent[] = [];
        for (let i = 1; i < klines.length - 1; i++) {
          const current = klines[i];
          if (current.volume > avgVolume * 3) {
            const priceAction = current.close > current.open ? 'buying_climax' : 'selling_climax';
            climaxEvents.push({
              date: new Date(current.timestamp),
              type: priceAction,
              volume: current.volume,
              priceAction: `${((current.close - current.open) / current.open * 100).toFixed(2)}% move`,
              significance: Math.min(100, (current.volume / avgVolume) * 20)
            });
          }
        }

        // Detect dry up periods
        const dryUpPeriods: DryUpPeriod[] = [];
        let dryUpStart: Date | null = null;
        let dryUpSum = 0;
        let dryUpCount = 0;

        for (let i = 0; i < klines.length; i++) {
          const current = klines[i];
          
          if (current.volume < avgVolume * 0.5) {
            if (!dryUpStart) {
              dryUpStart = new Date(current.timestamp);
            }
            dryUpSum += current.volume;
            dryUpCount++;
          } else {
            if (dryUpStart && dryUpCount >= 3) {
              dryUpPeriods.push({
                startDate: dryUpStart,
                endDate: new Date(klines[i - 1].timestamp),
                averageVolume: dryUpSum / dryUpCount,
                significance: dryUpCount > 7 ? 'major' : dryUpCount > 5 ? 'moderate' : 'minor'
              });
            }
            dryUpStart = null;
            dryUpSum = 0;
            dryUpCount = 0;
          }
        }

        // Current volume percentile
        const currentVolume = klines[klines.length - 1].volume;
        const sortedVolumes = [...klines.map(k => k.volume)].sort((a, b) => a - b);
        const currentVolumeRank = (sortedVolumes.findIndex(v => v >= currentVolume) / sortedVolumes.length) * 100;

        // Generate interpretation
        const interpretation = this.generateVolumeInterpretation(overallTrend, climaxEvents, dryUpPeriods, currentVolumeRank);

        return {
          overallTrend,
          climaxEvents,
          dryUpPeriods,
          avgVolumeInRange: avgVolume,
          currentVolumeRank,
          interpretation
        };

      } catch (error) {
        this.logger.error(`Failed to analyze Wyckoff volume for ${symbol}:`, error);
        return this.createEmptyVolumeContext();
      }
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  private async detectWyckoffEvents(
    symbol: string,
    timeframe: string,
    klines: OHLCV[],
    tradingRange: TradingRange | null,
    srAnalysis: SupportResistanceAnalysis
  ): Promise<WyckoffEvent[]> {
    const events: WyckoffEvent[] = [];

    if (tradingRange) {
      // Detect springs and upthrusts
      const springs = await this.detectSprings(symbol, timeframe, tradingRange);
      const upthrusts = await this.detectUpthrusts(symbol, timeframe, tradingRange);
      
      events.push(...springs);
      events.push(...upthrusts);
    }

    // Detect tests of key levels
    const keyLevels = [
      ...srAnalysis.supports.map(s => s.level),
      ...srAnalysis.resistances.map(r => r.level)
    ];
    
    if (keyLevels.length > 0) {
      const tests = await this.detectTestEvents(symbol, timeframe, keyLevels);
      events.push(...tests);
    }

    // Sort events by timestamp
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private identifyTradingRange(klines: OHLCV[], minPeriods: number): TradingRange | null {
    if (klines.length < minPeriods) {
      return null;
    }

    // Look for consolidation in the most recent data
    const recentData = klines.slice(-Math.min(klines.length, minPeriods * 2));
    
    // Calculate support and resistance levels
    const lows = recentData.map(k => k.low);
    const highs = recentData.map(k => k.high);
    
    const support = Math.min(...lows);
    const resistance = Math.max(...highs);
    const rangeWidth = ((resistance - support) / support) * 100;
    
    // Check if it's a valid consolidation (not too wide)
    if (rangeWidth > 25) {
      return null; // Too wide to be considered consolidation
    }

    // Count how many periods the price stayed within the range
    let periodsInRange = 0;
    for (const kline of recentData) {
      if (kline.low >= support * 0.995 && kline.high <= resistance * 1.005) {
        periodsInRange++;
      }
    }

    // Require at least 70% of periods to be within range
    if (periodsInRange < recentData.length * 0.7) {
      return null;
    }

    // Calculate volume profile
    const averageVolume = recentData.reduce((sum, k) => sum + k.volume, 0) / recentData.length;
    
    // Determine range type based on trend context
    const rangeType = this.determineRangeType(klines, recentData);

    return {
      startDate: new Date(recentData[0].timestamp),
      endDate: new Date(recentData[recentData.length - 1].timestamp),
      support,
      resistance,
      duration: recentData.length,
      width: rangeWidth,
      volumeProfile: {
        averageVolume,
        volumeTrend: 'stable', // Simplified for now
        significantEvents: [] // Would be populated with detected events
      },
      strength: rangeWidth < 10 ? 'strong' : rangeWidth < 20 ? 'moderate' : 'weak',
      type: rangeType
    };
  }

  private determineRangeType(allKlines: OHLCV[], rangeData: OHLCV[]): 'accumulation' | 'distribution' | 'consolidation' {
    // Look at the trend before the range
    const preRangeData = allKlines.slice(0, allKlines.length - rangeData.length);
    if (preRangeData.length < 10) {
      return 'consolidation';
    }

    const preRangeStart = preRangeData[0].close;
    const preRangeEnd = preRangeData[preRangeData.length - 1].close;
    const trendChange = ((preRangeEnd - preRangeStart) / preRangeStart) * 100;

    if (trendChange < -10) {
      return 'accumulation'; // After downtrend
    } else if (trendChange > 10) {
      return 'distribution'; // After uptrend
    } else {
      return 'consolidation'; // Sideways
    }
  }

  private classifyWyckoffPhase(
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
    // Simplified phase classification logic
    let phase: WyckoffPhase = 'uncertain';
    let confidence = 30;
    let progress = 0;

    if (tradingRange) {
      const springs = events.filter(e => e.type === 'spring');
      const upthrusts = events.filter(e => e.type === 'upthrust');
      const tests = events.filter(e => e.type === 'test');

      if (tradingRange.type === 'accumulation') {
        if (springs.length > 0) {
          phase = 'accumulation_phase_c';
          confidence = 70;
          progress = 60;
        } else if (tests.length > 2) {
          phase = 'accumulation_phase_b';
          confidence = 60;
          progress = 40;
        } else {
          phase = 'accumulation_phase_a';
          confidence = 50;
          progress = 20;
        }
      } else if (tradingRange.type === 'distribution') {
        if (upthrusts.length > 0) {
          phase = 'distribution_phase_c';
          confidence = 70;
          progress = 60;
        } else if (tests.length > 2) {
          phase = 'distribution_phase_b';
          confidence = 60;
          progress = 40;
        } else {
          phase = 'distribution_phase_a';
          confidence = 50;
          progress = 20;
        }
      }
    } else {
      // Check if we're in trending phase
      const recent20 = klines.slice(-20);
      const trendChange = ((recent20[recent20.length - 1].close - recent20[0].close) / recent20[0].close) * 100;
      
      if (trendChange > 15) {
        phase = 'markup';
        confidence = 60;
        progress = 50;
      } else if (trendChange < -15) {
        phase = 'markdown';
        confidence = 60;
        progress = 50;
      }
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
        implications.push('Potential selling climax occurred');
        implications.push('Smart money beginning to accumulate');
        nextExpectedEvents.push('Secondary test of lows');
        nextExpectedEvents.push('Automatic reaction bounce');
        break;

      case 'accumulation_phase_b':
        bias = 'accumulation';
        implications.push('Building cause phase - testing supply');
        implications.push('Multiple tests of support show absorption');
        nextExpectedEvents.push('Spring or successful test');
        nextExpectedEvents.push('Signs of strength on tests');
        break;

      case 'accumulation_phase_c':
        bias = 'accumulation';
        implications.push('Spring detected - last shakeout');
        implications.push('Strong hands absorbing weak hands');
        nextExpectedEvents.push('Sign of strength rally');
        nextExpectedEvents.push('Last point of support');
        strength = 'strong';
        break;

      case 'distribution_phase_a':
        bias = 'distribution';
        implications.push('Preliminary supply detected');
        implications.push('Smart money beginning to distribute');
        nextExpectedEvents.push('Buying climax');
        nextExpectedEvents.push('Automatic reaction');
        break;

      case 'distribution_phase_b':
        bias = 'distribution';
        implications.push('Building cause phase - testing demand');
        implications.push('Multiple tests of resistance show distribution');
        nextExpectedEvents.push('Upthrust or failed test');
        nextExpectedEvents.push('Signs of weakness on rallies');
        break;

      case 'distribution_phase_c':
        bias = 'distribution';
        implications.push('Upthrust detected - last bull trap');
        implications.push('Smart money distributing to weak hands');
        nextExpectedEvents.push('Sign of weakness decline');
        nextExpectedEvents.push('Last point of supply');
        strength = 'strong';
        break;

      case 'markup':
        bias = 'trending';
        implications.push('Uptrend in progress');
        implications.push('Demand exceeding supply');
        nextExpectedEvents.push('Potential reaccumulation');
        nextExpectedEvents.push('Continuation of uptrend');
        break;

      case 'markdown':
        bias = 'trending';
        implications.push('Downtrend in progress');
        implications.push('Supply exceeding demand');
        nextExpectedEvents.push('Potential redistribution');
        nextExpectedEvents.push('Continuation of downtrend');
        break;

      default:
        implications.push('Phase not clearly defined');
        nextExpectedEvents.push('Monitor for range development');
    }

    // Adjust strength based on volume context
    if (volumeContext.climaxEvents.length > 0) {
      strength = 'strong';
    } else if (volumeContext.dryUpPeriods.length > 0) {
      strength = strength === 'strong' ? 'moderate' : 'weak';
    }

    return {
      bias,
      strength,
      implications,
      nextExpectedEvents
    };
  }

  private assessRangeQuality(
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

    // Range width assessment (10 points)
    maxScore += 10;
    if (tradingRange.width < 8) {
      score += 10;
      recommendations.push('Excellent range width for accumulation/distribution');
    } else if (tradingRange.width < 15) {
      score += 7;
      recommendations.push('Good range width');
    } else if (tradingRange.width < 25) {
      score += 4;
      recommendations.push('Wide range - lower probability setup');
    } else {
      recommendations.push('Range too wide - not ideal for Wyckoff analysis');
    }

    // Duration assessment (10 points)
    maxScore += 10;
    if (tradingRange.duration >= 30) {
      score += 10;
      recommendations.push('Excellent duration - sufficient time to build cause');
    } else if (tradingRange.duration >= 15) {
      score += 7;
      recommendations.push('Good duration for pattern development');
    } else {
      score += 3;
      recommendations.push('Short duration - pattern may not be fully developed');
    }

    // Volume characteristics (10 points)
    maxScore += 10;
    if (volumeContext.dryUpPeriods.length > 0) {
      score += 8;
      recommendations.push('Volume dry-up periods detected - positive sign');
    }
    if (volumeContext.climaxEvents.length > 0) {
      score += 6;
      recommendations.push('Climax events detected - shows institutional activity');
    }
    if (score === 0) {
      score += 2;
      recommendations.push('Volume analysis inconclusive');
    }

    const confidence = (score / maxScore) * 100;
    
    let grade: 'excellent' | 'good' | 'poor' | 'invalid';
    if (confidence >= 80) {
      grade = 'excellent';
    } else if (confidence >= 65) {
      grade = 'good';
    } else if (confidence >= 40) {
      grade = 'poor';
    } else {
      grade = 'invalid';
    }

    return { grade, confidence, recommendations };
  }

  private calculateSpringSignificance(penetrationDepth: number, recoverySpeed: number, volume: number): number {
    let significance = 0;
    
    // Penetration depth (0-30 points)
    if (penetrationDepth > 0.5 && penetrationDepth < 3) {
      significance += 30; // Ideal spring depth
    } else if (penetrationDepth <= 0.5) {
      significance += 15; // Too shallow
    } else {
      significance += 10; // Too deep
    }
    
    // Recovery speed (0-30 points)
    if (recoverySpeed > 2) {
      significance += 30; // Quick recovery
    } else if (recoverySpeed > 1) {
      significance += 20;
    } else {
      significance += 10;
    }
    
    // Volume (0-40 points) - would need range context for proper calculation
    significance += 20; // Placeholder
    
    return Math.min(100, significance);
  }

  private calculateUpthrustSignificance(penetrationHeight: number, rejectionSpeed: number, volume: number): number {
    let significance = 0;
    
    // Penetration height (0-30 points)
    if (penetrationHeight > 0.5 && penetrationHeight < 3) {
      significance += 30; // Ideal upthrust height
    } else if (penetrationHeight <= 0.5) {
      significance += 15; // Too shallow
    } else {
      significance += 10; // Too high
    }
    
    // Rejection speed (0-30 points)
    if (rejectionSpeed > 2) {
      significance += 30; // Quick rejection
    } else if (rejectionSpeed > 1) {
      significance += 20;
    } else {
      significance += 10;
    }
    
    // Volume (0-40 points) - would need range context
    significance += 20; // Placeholder
    
    return Math.min(100, significance);
  }

  private calculateTestSignificance(testQuality: 'good' | 'poor' | 'failed', volume: number): number {
    let base = 0;
    switch (testQuality) {
      case 'good': base = 70; break;
      case 'poor': base = 40; break;
      case 'failed': base = 20; break;
    }
    
    // Volume would add/subtract from base
    return Math.min(100, base + 10); // Simplified
  }

  private assessTestQuality(kline: OHLCV, level: number, action: 'bounce' | 'break' | 'stall'): 'good' | 'poor' | 'failed' {
    if (action === 'bounce') {
      return 'good';
    } else if (action === 'stall') {
      return 'poor';
    } else {
      return 'failed';
    }
  }

  private classifyVolumeCharacter(volume: number, avgVolume: number): 'high' | 'normal' | 'low' {
    if (volume > avgVolume * 1.5) {
      return 'high';
    } else if (volume < avgVolume * 0.7) {
      return 'low';
    } else {
      return 'normal';
    }
  }

  private evaluateSpringSuccess(klines: OHLCV[], springIndex: number, tradingRange: TradingRange): boolean {
    // Look at next 5-10 candles to see if price moved above resistance
    const lookAhead = klines.slice(springIndex + 1, springIndex + 11);
    return lookAhead.some(k => k.close > tradingRange.resistance);
  }

  private evaluateUpthrustSuccess(klines: OHLCV[], upthrustIndex: number, tradingRange: TradingRange): boolean {
    // Look at next 5-10 candles to see if price moved below support
    const lookAhead = klines.slice(upthrustIndex + 1, upthrustIndex + 11);
    return lookAhead.some(k => k.close < tradingRange.support);
  }

  private determineRelativePosition(price: number, level: number): 'below_support' | 'at_support' | 'within_range' | 'at_resistance' | 'above_resistance' {
    // Simplified - would need range context for proper classification
    if (price < level) {
      return 'below_support';
    } else if (price > level) {
      return 'above_resistance';
    } else {
      return 'at_support';
    }
  }

  private generateVolumeInterpretation(
    trend: 'increasing' | 'decreasing' | 'stable',
    climax: ClimaxEvent[],
    dryUp: DryUpPeriod[],
    currentRank: number
  ): string {
    const parts: string[] = [];
    
    parts.push(`Volume trend: ${trend}`);
    
    if (climax.length > 0) {
      parts.push(`${climax.length} climax event(s) detected`);
    }
    
    if (dryUp.length > 0) {
      parts.push(`${dryUp.length} dry-up period(s) identified`);
    }
    
    parts.push(`Current volume at ${currentRank.toFixed(0)}th percentile`);
    
    return parts.join('. ') + '.';
  }

  private createEmptyVolumeContext(): VolumeContext {
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
