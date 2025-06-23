/**
 * @fileoverview Wyckoff Basic Analysis Service (Modular)
 * @description Main service coordinating Wyckoff analysis components
 * @version 2.0.0 - Modular Architecture
 */

import type {
  OHLCV,
  VolumeAnalysis,
  SupportResistanceAnalysis,
  IMarketDataService,
  IAnalysisService,
  PerformanceMetrics,
  IHistoricalAnalysisService
} from '../../../types/index.js';

import type {
  WyckoffPhaseAnalysis,
  TradingRangeAnalysis,
  SpringEvent,
  UpthrustEvent,
  TestEvent,
  VolumeContext,
  TradingRange,
  WyckoffEvent,
  IWyckoffBasicService
} from './types.js';

import { PerformanceMonitor } from '../../../utils/performance.js';
import { FileLogger } from '../../../utils/fileLogger.js';
import { ContextAwareRepository } from '../../context/contextRepository.js';

// Import specialized modules (TASK-030 FASE 3)
import { PhaseAnalyzer, TradingRangeAnalyzer, VolumeAnalyzer } from '../analyzers/index.js';
import { SpringDetector, UpthrustDetector, TestEventDetector } from '../detectors/index.js';

import * as path from 'path';

/**
 * Main Wyckoff Analysis Service
 * Coordinates between specialized analyzers and detectors
 */
export class WyckoffBasicService implements IWyckoffBasicService {
  private readonly logger: FileLogger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly contextAwareRepository: ContextAwareRepository;
  
  // Specialized modules (TASK-030 FASE 3)
  private readonly phaseAnalyzer: PhaseAnalyzer;
  private readonly tradingRangeAnalyzer: TradingRangeAnalyzer;
  private readonly volumeAnalyzer: VolumeAnalyzer;
  private readonly springDetector: SpringDetector;
  private readonly upthrustDetector: UpthrustDetector;
  private readonly testEventDetector: TestEventDetector;

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
    
    // Context-aware repository (TASK-027 FASE 2)
    this.contextAwareRepository = new ContextAwareRepository();
    
    // Initialize specialized modules (TASK-030 FASE 3)
    this.phaseAnalyzer = new PhaseAnalyzer();
    this.tradingRangeAnalyzer = new TradingRangeAnalyzer();
    this.volumeAnalyzer = new VolumeAnalyzer();
    this.springDetector = new SpringDetector();
    this.upthrustDetector = new UpthrustDetector();
    this.testEventDetector = new TestEventDetector();
    
    this.logger.info('WyckoffBasicService initialized with specialized modules (TASK-030 FASE 3)');
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

        // Determine current phase using PhaseAnalyzer (TASK-030 FASE 3)
        const phaseAnalysis = this.phaseAnalyzer.classifyWyckoffPhase(
          klines,
          tradingRangeAnalysis.tradingRange,
          keyEvents,
          volumeContext,
          srAnalysis
        );
        
        this.logger.info(`Phase analysis complete: ${phaseAnalysis.phase} (${phaseAnalysis.confidence}% confidence)`);

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

        // Save to Context-Aware Repository (TASK-027 FASE 2)
        try {
          const analysisId = await this.contextAwareRepository.saveAnalysisWithContext(
            `${symbol}_wyckoff_${timeframe}_${Date.now()}`,
            'wyckoff',
            { ...analysis, symbol, timeframe },
            { 
              symbol, 
              timeframe,
              tags: [
                `timeframe:${timeframe}`,
                `phase:${analysis.currentPhase}`,
                `confidence:${analysis.phaseConfidence}`,
                `progress:${analysis.phaseProgress}`,
                `bias:${analysis.interpretation.bias}`,
                `strength:${analysis.interpretation.strength}`,
                `events:${analysis.keyEvents.length}`,
                `range:${analysis.tradingRange ? 'detected' : 'none'}`
              ]
            }
          );
          this.logger.info(`Wyckoff analysis saved with context - ID: ${analysisId} (TASK-027 FASE 2)`);
        } catch (contextError) {
          this.logger.warn(`Failed to save Wyckoff analysis context for ${symbol}:`, contextError);
        }

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
   * Using TradingRangeAnalyzer (TASK-030 FASE 3)
   */
  async detectTradingRange(
    symbol: string,
    timeframe: string = '60',
    minPeriods: number = 20
  ): Promise<TradingRangeAnalysis> {
    return this.performanceMonitor.measure('detectTradingRange', async () => {
      try {
        this.logger.info(`Detecting trading range for ${symbol} (${timeframe}) - using TradingRangeAnalyzer`);

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

        // Delegate to TradingRangeAnalyzer (TASK-030 FASE 3)
        const analysis = await this.tradingRangeAnalyzer.analyzeTradingRange(
          symbol,
          timeframe,
          klines,
          minPeriods
        );

        this.logger.info(`Trading range analysis complete for ${symbol}: ${analysis.tradingRange ? 
          `${analysis.tradingRange.support.toFixed(4)} - ${analysis.tradingRange.resistance.toFixed(4)} (${analysis.rangeQuality})` : 
          'No range detected'}
        `);
        return analysis;

      } catch (error) {
        this.logger.error(`Failed to detect trading range for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Detect spring events (false breakdowns below support)
   * Using SpringDetector (TASK-030 FASE 3)
   */
  async detectSprings(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<SpringEvent[]> {
    return this.performanceMonitor.measure('detectSprings', async () => {
      try {
        this.logger.info(`Detecting springs for ${symbol} - using SpringDetector`);
        const klines = await this.marketDataService.getKlines(symbol, timeframe, 100);
        
        // Delegate to SpringDetector (TASK-030 FASE 3)
        const springs = await this.springDetector.detectSprings(symbol, timeframe, klines, tradingRange);

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
   * Using UpthrustDetector (TASK-030 FASE 3)
   */
  async detectUpthrusts(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<UpthrustEvent[]> {
    return this.performanceMonitor.measure('detectUpthrusts', async () => {
      try {
        this.logger.info(`Detecting upthrusts for ${symbol} - using UpthrustDetector`);
        const klines = await this.marketDataService.getKlines(symbol, timeframe, 100);
        
        // Delegate to UpthrustDetector (TASK-030 FASE 3)
        const upthrusts = await this.upthrustDetector.detectUpthrusts(symbol, timeframe, klines, tradingRange);

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
   * Using TestEventDetector (TASK-030 FASE 3)
   */
  async detectTestEvents(
    symbol: string,
    timeframe: string,
    keyLevels: number[]
  ): Promise<TestEvent[]> {
    return this.performanceMonitor.measure('detectTestEvents', async () => {
      try {
        this.logger.info(`Detecting test events for ${symbol} - using TestEventDetector`);
        const klines = await this.marketDataService.getKlines(symbol, timeframe, 100);
        
        // Delegate to TestEventDetector (TASK-030 FASE 3)
        const tests = await this.testEventDetector.detectTestEvents(symbol, timeframe, klines, keyLevels);

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
   * Using VolumeAnalyzer (TASK-030 FASE 3)
   */
  async analyzeWyckoffVolume(
    symbol: string,
    timeframe: string,
    klines: OHLCV[]
  ): Promise<VolumeContext> {
    if (klines.length === 0) {
      return this.createEmptyVolumeContext();
    }
    
    // Delegate to VolumeAnalyzer (TASK-030 FASE 3)
    return await this.volumeAnalyzer.analyzeWyckoffVolume(symbol, timeframe, klines);
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
      // Detect springs and upthrusts using specialized detectors (TASK-030 FASE 3)
      const springs = await this.detectSprings(symbol, timeframe, tradingRange);
      const upthrusts = await this.detectUpthrusts(symbol, timeframe, tradingRange);
      
      events.push(...springs);
      events.push(...upthrusts);
    }

    // Detect tests of key levels using specialized detector (TASK-030 FASE 3)
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

  // Helper methods - legacy logic moved to specialized modules (TASK-030 FASE 3)

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
