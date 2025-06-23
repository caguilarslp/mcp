/**
 * @fileoverview Historical Analysis Handlers for MCP integration
 * @description Specialized handlers for historical analysis tools
 * @version 1.0.0 - TASK-017 Implementation
 */

import {
  IHistoricalDataService,
  IHistoricalAnalysisService,
  IHistoricalCacheService,
  HistoricalKlines,
  HistoricalSupportResistance,
  VolumeEvent,
  MarketCycle,
  PriceDistribution,
  HistoricalTimeframe,
  ApiResponse,
  MCPServerResponse,
  PerformanceMetrics
} from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';
import { PerformanceMonitor } from '../../utils/performance.js';
import * as path from 'path';

/**
 * Historical Analysis Handlers for MCP Tools
 * 
 * Provides specialized handlers for:
 * - Historical klines fetching
 * - Historical support/resistance analysis
 * - Volume anomaly detection
 * - Price distribution analysis
 * - Market cycle identification
 * - Historical data summaries
 */
export class HistoricalAnalysisHandlers {
  private readonly logger: FileLogger;
  private readonly performanceMonitor: PerformanceMonitor;

  constructor(
    private readonly historicalDataService: IHistoricalDataService,
    private readonly historicalAnalysisService: IHistoricalAnalysisService,
    private readonly historicalCacheService: IHistoricalCacheService
  ) {
    this.logger = new FileLogger('HistoricalAnalysisHandlers', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    this.performanceMonitor = new PerformanceMonitor();
    
    this.logger.info('Historical Analysis Handlers initialized');
  }

  /**
   * Handle get_historical_klines tool
   */
  async handleGetHistoricalKlines(args: {
    symbol: string;
    interval: HistoricalTimeframe;
    startTime?: number;
    endTime?: number;
    useCache?: boolean;
  }): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleGetHistoricalKlines', async () => {
      try {
        const { symbol, interval, startTime, endTime, useCache = true } = args;

        this.logger.info(`🔥 INCOMING REQUEST: get_historical_klines for ${symbol}`, {
          interval,
          startTime: startTime ? new Date(startTime) : 'inception',
          endTime: endTime ? new Date(endTime) : 'now',
          useCache
        });

        // Validate inputs
        if (!symbol) {
          throw new Error('Symbol is required');
        }

        if (!['D', 'W', 'M'].includes(interval)) {
          throw new Error('Interval must be D (daily), W (weekly), or M (monthly)');
        }

        // Check cache first
        let result: HistoricalKlines | null = null;
        if (useCache) {
          const cacheKey = `${symbol}_${interval}_${startTime || 'inception'}_${endTime || 'now'}`;
          result = await this.historicalCacheService.getCachedAnalysis(symbol, `historical_klines_${cacheKey}`);
        }

        // Fetch from API if not cached
        if (!result) {
          result = await this.historicalDataService.getHistoricalKlines(
            symbol,
            interval,
            startTime,
            endTime
          );

          // Cache the result
          if (useCache && result) {
            const cacheKey = `${symbol}_${interval}_${startTime || 'inception'}_${endTime || 'now'}`;
            await this.historicalCacheService.cacheHistoricalAnalysis(
              symbol,
              `historical_klines_${cacheKey}` as any,
              result
            );
          }
        }

        const response = this.formatSuccessResponse(result, 'Historical klines data retrieved successfully');

        this.logger.info(`✅ COMPLETED: get_historical_klines for ${symbol}`, {
          dataPoints: result.dataPoints,
          timeRange: `${result.startTime} to ${result.endTime}`,
          missingDataRanges: result.metadata.missingData.length
        });

        return response;

      } catch (error) {
        this.logger.error(`❌ FAILED: get_historical_klines:`, error);
        return this.formatErrorResponse(`Failed to get historical klines: ${error}`);
      }
    });
  }

  /**
   * Handle analyze_historical_sr tool
   */
  async handleAnalyzeHistoricalSR(args: {
    symbol: string;
    timeframe: HistoricalTimeframe;
    minTouches?: number;
    tolerance?: number;
    volumeWeight?: boolean;
    recencyBias?: number;
    useCache?: boolean;
  }): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleAnalyzeHistoricalSR', async () => {
      try {
        const { 
          symbol, 
          timeframe, 
          minTouches = 3, 
          tolerance = 0.5, 
          volumeWeight = true, 
          recencyBias = 0.1, 
          useCache = true 
        } = args;

        this.logger.info(`🔥 INCOMING REQUEST: analyze_historical_sr for ${symbol}`, {
          timeframe,
          minTouches,
          tolerance,
          volumeWeight,
          recencyBias,
          useCache
        });

        // Validate inputs
        if (!symbol) {
          throw new Error('Symbol is required');
        }

        if (!['D', 'W', 'M'].includes(timeframe)) {
          throw new Error('Timeframe must be D (daily), W (weekly), or M (monthly)');
        }

        // Check cache first
        let result: HistoricalSupportResistance | null = null;
        if (useCache) {
          result = await this.historicalCacheService.getCachedAnalysis(symbol, 'support_resistance');
        }

        // Analyze if not cached
        if (!result) {
          result = await this.historicalAnalysisService.analyzeHistoricalSupportResistance(
            symbol,
            timeframe,
            { minTouches, tolerance, volumeWeight, recencyBias }
          );

          // Cache the result
          if (useCache && result) {
            await this.historicalCacheService.cacheHistoricalAnalysis(
              symbol,
              'support_resistance',
              result
            );
          }
        }

        const response = this.formatSuccessResponse(result, 'Historical support/resistance analysis completed');

        this.logger.info(`✅ COMPLETED: analyze_historical_sr for ${symbol}`, {
          totalLevels: result.levels.length,
          majorLevels: result.majorLevels.length,
          strongestLevel: result.statistics.strongestLevel?.significance || 0
        });

        return response;

      } catch (error) {
        this.logger.error(`❌ FAILED: analyze_historical_sr:`, error);
        return this.formatErrorResponse(`Failed to analyze historical S/R: ${error}`);
      }
    });
  }

  /**
   * Handle identify_volume_anomalies tool
   */
  async handleIdentifyVolumeAnomalies(args: {
    symbol: string;
    timeframe: 'D' | 'W';
    threshold?: number;
    useCache?: boolean;
  }): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleIdentifyVolumeAnomalies', async () => {
      try {
        const { symbol, timeframe, threshold = 2.5, useCache = true } = args;

        this.logger.info(`🔥 INCOMING REQUEST: identify_volume_anomalies for ${symbol}`, {
          timeframe,
          threshold,
          useCache
        });

        // Validate inputs
        if (!symbol) {
          throw new Error('Symbol is required');
        }

        if (!['D', 'W'].includes(timeframe)) {
          throw new Error('Timeframe must be D (daily) or W (weekly)');
        }

        // Check cache first
        let result: VolumeEvent[] | null = null;
        if (useCache) {
          result = await this.historicalCacheService.getCachedAnalysis(symbol, 'volume_events');
        }

        // Analyze if not cached
        if (!result) {
          result = await this.historicalAnalysisService.identifyVolumeEvents(
            symbol,
            timeframe,
            threshold
          );

          // Cache the result
          if (useCache && result) {
            await this.historicalCacheService.cacheHistoricalAnalysis(
              symbol,
              'volume_events',
              result
            );
          }
        }

        const response = this.formatSuccessResponse(result, 'Volume anomalies identified successfully');

        this.logger.info(`✅ COMPLETED: identify_volume_anomalies for ${symbol}`, {
          totalEvents: result.length,
          spikes: result.filter(e => e.type === 'spike').length,
          accumulation: result.filter(e => e.type === 'accumulation').length,
          distribution: result.filter(e => e.type === 'distribution').length,
          droughts: result.filter(e => e.type === 'drought').length
        });

        return response;

      } catch (error) {
        this.logger.error(`❌ FAILED: identify_volume_anomalies:`, error);
        return this.formatErrorResponse(`Failed to identify volume anomalies: ${error}`);
      }
    });
  }

  /**
   * Handle get_price_distribution tool
   */
  async handleGetPriceDistribution(args: {
    symbol: string;
    timeframe: 'D' | 'W';
    useCache?: boolean;
  }): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleGetPriceDistribution', async () => {
      try {
        const { symbol, timeframe, useCache = true } = args;

        this.logger.info(`🔥 INCOMING REQUEST: get_price_distribution for ${symbol}`, {
          timeframe,
          useCache
        });

        // Validate inputs
        if (!symbol) {
          throw new Error('Symbol is required');
        }

        if (!['D', 'W'].includes(timeframe)) {
          throw new Error('Timeframe must be D (daily) or W (weekly)');
        }

        // Check cache first
        let result: PriceDistribution | null = null;
        if (useCache) {
          result = await this.historicalCacheService.getCachedAnalysis(symbol, 'price_distribution');
        }

        // Analyze if not cached
        if (!result) {
          result = await this.historicalAnalysisService.analyzePriceDistribution(
            symbol,
            timeframe
          );

          // Cache the result
          if (useCache && result) {
            await this.historicalCacheService.cacheHistoricalAnalysis(
              symbol,
              'price_distribution',
              result
            );
          }
        }

        const response = this.formatSuccessResponse(result, 'Price distribution analysis completed');

        this.logger.info(`✅ COMPLETED: get_price_distribution for ${symbol}`, {
          totalVolume: result.totalVolume,
          pointOfControl: result.valueArea.pointOfControl,
          valueAreaRange: result.valueArea.high - result.valueArea.low,
          buckets: result.priceRanges.length
        });

        return response;

      } catch (error) {
        this.logger.error(`❌ FAILED: get_price_distribution:`, error);
        return this.formatErrorResponse(`Failed to get price distribution: ${error}`);
      }
    });
  }

  /**
   * Handle identify_market_cycles tool
   */
  async handleIdentifyMarketCycles(args: {
    symbol: string;
    useCache?: boolean;
  }): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleIdentifyMarketCycles', async () => {
      try {
        const { symbol, useCache = true } = args;

        this.logger.info(`🔥 INCOMING REQUEST: identify_market_cycles for ${symbol}`, {
          useCache
        });

        // Validate inputs
        if (!symbol) {
          throw new Error('Symbol is required');
        }

        // Check cache first
        let result: MarketCycle[] | null = null;
        if (useCache) {
          result = await this.historicalCacheService.getCachedAnalysis(symbol, 'market_cycles');
        }

        // Analyze if not cached
        if (!result) {
          result = await this.historicalAnalysisService.identifyMarketCycles(symbol);

          // Cache the result
          if (useCache && result) {
            await this.historicalCacheService.cacheHistoricalAnalysis(
              symbol,
              'market_cycles' as any,
              result
            );
          }
        }

        const response = this.formatSuccessResponse(result, 'Market cycles identified successfully');

        this.logger.info(`✅ COMPLETED: identify_market_cycles for ${symbol}`, {
          totalCycles: result.length,
          bullCycles: result.filter(c => c.type === 'bull').length,
          bearCycles: result.filter(c => c.type === 'bear').length,
          accumulationCycles: result.filter(c => c.type === 'accumulation').length,
          distributionCycles: result.filter(c => c.type === 'distribution').length
        });

        return response;

      } catch (error) {
        this.logger.error(`❌ FAILED: identify_market_cycles:`, error);
        return this.formatErrorResponse(`Failed to identify market cycles: ${error}`);
      }
    });
  }

  /**
   * Handle get_historical_summary tool
   */
  async handleGetHistoricalSummary(args: {
    symbol: string;
    timeframe?: HistoricalTimeframe;
    useCache?: boolean;
  }): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleGetHistoricalSummary', async () => {
      try {
        const { symbol, timeframe = 'D', useCache = true } = args;

        this.logger.info(`🔥 INCOMING REQUEST: get_historical_summary for ${symbol}`, {
          timeframe,
          useCache
        });

        // Validate inputs
        if (!symbol) {
          throw new Error('Symbol is required');
        }

        // Generate comprehensive summary with safe Promise handling
        let historicalKlines: any, supportResistance: any, volumeEvents: any[] = [], priceDistribution: any, marketCycles: any[] = [];
        
        try {
          historicalKlines = await this.historicalDataService.getHistoricalKlines(symbol, timeframe);
          supportResistance = await this.historicalAnalysisService.analyzeHistoricalSupportResistance(symbol, timeframe, {});
        } catch (error) {
          this.logger.error(`Failed to get basic historical data for ${symbol}:`, error);
          throw error;
        }
        
        try {
          const volumeTimeframe = timeframe === 'M' ? 'W' : 'D';
          volumeEvents = await this.historicalAnalysisService.identifyVolumeEvents(symbol, volumeTimeframe as 'D' | 'W', 2.5);
          priceDistribution = await this.historicalAnalysisService.analyzePriceDistribution(symbol, volumeTimeframe as 'D' | 'W');
          marketCycles = await this.historicalAnalysisService.identifyMarketCycles(symbol);
        } catch (error) {
          this.logger.warn(`Some historical analysis failed for ${symbol}, using fallbacks:`, error);
          // Provide fallback data
          volumeEvents = [];
          priceDistribution = {
            symbol,
            timeframe: timeframe === 'M' ? 'W' : 'D',
            analysisDate: new Date(),
            totalVolume: 0,
            priceRanges: [],
            valueArea: { high: 0, low: 0, pointOfControl: 0 },
            statistics: { mean: 0, median: 0, standardDeviation: 0, skewness: 0 }
          };
          marketCycles = [];
        }

        const summary = {
          symbol,
          timeframe,
          analysisDate: new Date(),
          dataOverview: {
            totalDataPoints: historicalKlines.dataPoints,
            dataRange: {
              start: historicalKlines.startTime,
              end: historicalKlines.endTime
            },
            inceptionDate: historicalKlines.metadata.inceptionDate,
            totalDays: historicalKlines.metadata.totalDays,
            missingDataRanges: historicalKlines.metadata.missingData.length
          },
          keyLevels: {
            totalLevels: supportResistance.levels.length,
            majorLevels: supportResistance.majorLevels.slice(0, 5), // Top 5
            strongestLevel: supportResistance.statistics.strongestLevel,
            priceRange: supportResistance.statistics.priceRange
          },
          volumeAnalysis: {
            totalEvents: volumeEvents.length,
            significantEvents: volumeEvents.filter((e: any) => e.significance > 3).length,
            eventBreakdown: {
              spikes: volumeEvents.filter((e: any) => e.type === 'spike').length,
              accumulation: volumeEvents.filter((e: any) => e.type === 'accumulation').length,
              distribution: volumeEvents.filter((e: any) => e.type === 'distribution').length,
              droughts: volumeEvents.filter((e: any) => e.type === 'drought').length
            },
            topEvents: volumeEvents.slice(0, 3) // Top 3 most significant
          },
          priceStructure: {
            valueArea: priceDistribution.valueArea,
            distribution: {
              mean: priceDistribution.statistics.mean,
              median: priceDistribution.statistics.median,
              standardDeviation: priceDistribution.statistics.standardDeviation,
              skewness: priceDistribution.statistics.skewness
            },
            dominantPriceRanges: priceDistribution.priceRanges.slice(0, 5) // Top 5 by volume
          },
          marketCycles: {
            totalCycles: marketCycles.length,
            cycleBreakdown: {
              bull: marketCycles.filter((c: any) => c.type === 'bull').length,
              bear: marketCycles.filter((c: any) => c.type === 'bear').length,
              accumulation: marketCycles.filter((c: any) => c.type === 'accumulation').length,
              distribution: marketCycles.filter((c: any) => c.type === 'distribution').length
            },
            currentCycle: marketCycles.find((c: any) => !c.endDate), // Ongoing cycle
            recentCycles: marketCycles.slice(-3) // Last 3 cycles
          },
          insights: this.generateHistoricalInsights(
            supportResistance,
            volumeEvents,
            priceDistribution,
            marketCycles
          )
        };

        const response = this.formatSuccessResponse(summary, 'Historical summary generated successfully');

        this.logger.info(`✅ COMPLETED: get_historical_summary for ${symbol}`, {
          totalLevels: summary.keyLevels.totalLevels,
          totalEvents: summary.volumeAnalysis.totalEvents,
          totalCycles: summary.marketCycles.totalCycles,
          insights: summary.insights.length
        });

        return response;

      } catch (error) {
        this.logger.error(`❌ FAILED: get_historical_summary:`, error);
        return this.formatErrorResponse(`Failed to get historical summary: ${error}`);
      }
    });
  }

  /**
   * Get performance metrics for all handlers
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  /**
   * Format successful response
   */
  private formatSuccessResponse(data: any, message: string): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message,
          data,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  /**
   * Format error response
   */
  private formatErrorResponse(error: string): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  /**
   * Generate historical insights
   */
  private generateHistoricalInsights(
    supportResistance: HistoricalSupportResistance,
    volumeEvents: VolumeEvent[],
    priceDistribution: PriceDistribution,
    marketCycles: MarketCycle[]
  ): string[] {
    const insights: string[] = [];

    // Support/Resistance insights
    if (supportResistance.majorLevels.length > 0) {
      const strongestLevel = supportResistance.majorLevels[0];
      insights.push(
        `Strongest ${strongestLevel.type} level at $${strongestLevel.price.toFixed(4)} ` +
        `with ${strongestLevel.touches} touches and ${strongestLevel.significance.toFixed(1)}% significance`
      );
    }

    // Volume insights
    const significantEvents = volumeEvents.filter(e => e.significance > 3);
    if (significantEvents.length > 0) {
      insights.push(
        `${significantEvents.length} significant volume events detected, ` +
        `with the most significant being ${significantEvents[0].type} on ${significantEvents[0].date.toDateString()}`
      );
    }

    // Price distribution insights
    if (priceDistribution.valueArea.pointOfControl) {
      insights.push(
        `Point of Control (highest volume) at $${priceDistribution.valueArea.pointOfControl.toFixed(4)}, ` +
        `with Value Area between $${priceDistribution.valueArea.low.toFixed(4)} - $${priceDistribution.valueArea.high.toFixed(4)}`
      );
    }

    // Market cycle insights
    const ongoingCycle = marketCycles.find(c => !c.endDate);
    if (ongoingCycle) {
      insights.push(
        `Currently in ${ongoingCycle.type} cycle lasting ${ongoingCycle.duration} days ` +
        `with ${ongoingCycle.priceChange.toFixed(1)}% price change`
      );
    }

    // Statistical insights
    const bullCycles = marketCycles.filter(c => c.type === 'bull');
    const bearCycles = marketCycles.filter(c => c.type === 'bear');
    if (bullCycles.length > 0 && bearCycles.length > 0) {
      const avgBullDuration = bullCycles.reduce((sum, c) => sum + c.duration, 0) / bullCycles.length;
      const avgBearDuration = bearCycles.reduce((sum, c) => sum + c.duration, 0) / bearCycles.length;
      insights.push(
        `Historical pattern: Bull cycles average ${avgBullDuration.toFixed(0)} days, ` +
        `Bear cycles average ${avgBearDuration.toFixed(0)} days`
      );
    }

    return insights;
  }
}
