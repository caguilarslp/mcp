/**
 * @fileoverview Core Market Analysis Engine
 * @description Central orchestrator for all market analysis operations
 * @version 1.3.0
 */

import {
  SystemConfig,
  MarketTicker,
  Orderbook,
  OHLCV,
  VolatilityAnalysis,
  VolumeAnalysis,
  VolumeDelta,
  SupportResistanceAnalysis,
  GridSuggestion,
  MarketCategoryType,
  PerformanceMetrics,
  ApiResponse,
  IMarketDataService,
  IAnalysisService,
  ITradingService,
  CacheStats,
  IAnalysisRepository,
  SavedAnalysis,
  Pattern,
  PatternCriteria,
  AnalysisQuery,
  RepositoryStats,
  AnalysisSummary as AnalysisSummaryType,
  AggregatedMetrics,
  Period,
  AnalysisType,
  TimezoneConfig,
  TemporalContext
} from '../types/index.js';

import { BybitMarketDataService } from '../services/marketData.js';
import { TechnicalAnalysisService } from '../services/analysis.js';
import { TradingService } from '../services/trading.js';
import { StorageService } from '../services/storage.js';
import { CacheManager } from '../services/cacheManager.js';
import { ICacheManager } from '../types/storage.js';
import { AnalysisRepository } from '../repositories/analysisRepository.js';
import { TimezoneManager, mexicoTimezone } from '../utils/timezone.js';

import { FileLogger } from '../utils/fileLogger.js';
import * as path from 'path';
import { PerformanceMonitor } from '../utils/performance.js';

// ====================
// STORAGE TYPES FOR AUTO-SAVE
// ====================

interface SavedAnalysisRecord {
  timestamp: number;
  symbol: string;
  analysisType: string;
  data: any;
  metadata: {
    version: string;
    source: string;
    engine: string;
    savedAt: string;
  };
}

export class MarketAnalysisEngine {
  private readonly logger: FileLogger;
  private readonly performanceMonitor: PerformanceMonitor;
  
  // Core services with dependency injection
  private readonly marketDataService: IMarketDataService;
  private readonly analysisService: IAnalysisService;
  private readonly tradingService: ITradingService;
  private readonly storageService: StorageService;
  private readonly analysisRepository: IAnalysisRepository;
  private readonly timezoneManager: TimezoneManager;
  
  // Configuration
  private config: SystemConfig;
  private timezoneConfig: TimezoneConfig;

  constructor(
    config?: Partial<SystemConfig>,
    // Dependency injection - services can be injected for testing
    marketDataService?: IMarketDataService,
    analysisService?: IAnalysisService,
    tradingService?: ITradingService,
    cacheManager?: ICacheManager,
    timezoneConfig?: Partial<TimezoneConfig>
  ) {
    this.logger = new FileLogger('MarketAnalysisEngine', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize configuration with defaults
    this.config = this.mergeConfig(config);
    this.timezoneConfig = {
      userTimezone: 'America/Mexico_City',
      tradingSession: '24h',
      dateFormat: 'local',
      ...timezoneConfig
    };
    
    // Initialize timezone manager
    this.timezoneManager = new TimezoneManager(this.timezoneConfig.userTimezone);
    
    // Initialize services with dependency injection
    const cache = cacheManager || new CacheManager();
    
    this.marketDataService = marketDataService || new BybitMarketDataService(
      this.config.api.baseUrl,
      this.config.api.timeout,
      this.config.api.retryAttempts,
      cache  // Inject cache manager
    );
    
    this.analysisService = analysisService || new TechnicalAnalysisService(this.marketDataService);
    this.tradingService = tradingService || new TradingService(this.marketDataService, this.analysisService);
    this.storageService = new StorageService();
    
    // Initialize analysis repository
    const projectRoot = 'D:\\projects\\mcp\\waickoff_mcp';
    this.analysisRepository = new AnalysisRepository(
      this.storageService,
      path.join(projectRoot, 'storage')
    );
    
    this.logger.info('Market Analysis Engine initialized with timezone support and Analysis Repository', {
      timezone: this.timezoneConfig.userTimezone,
      currentTime: this.timezoneManager.getUserNow(),
      repositoryEnabled: true
    });
  }

  // ====================
  // PUBLIC API METHODS
  // ====================

  /**
   * Get comprehensive market data for a symbol
   */
  async getMarketData(
    symbol: string,
    category: MarketCategoryType = 'spot'
  ): Promise<ApiResponse<{
    ticker: MarketTicker;
    orderbook: Orderbook;
    recentKlines: OHLCV[];
  }>> {
    return this.performanceMonitor.measure('getMarketData', async () => {
      try {
        this.logger.info(`Fetching comprehensive market data for ${symbol}`);

        const [ticker, orderbook, klines] = await Promise.all([
          this.marketDataService.getTicker(symbol, category),
          this.marketDataService.getOrderbook(symbol, category, 25),
          this.marketDataService.getKlines(symbol, '60', 24, category)
        ]);

        return this.createSuccessResponse({
          ticker,
          orderbook,
          recentKlines: klines
        });

      } catch (error) {
        this.logger.error(`Failed to get market data for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to fetch market data: ${error}`);
      }
    });
  }

  /**
   * Perform comprehensive technical analysis
   */
  async performTechnicalAnalysis(
    symbol: string,
    options: {
      includeVolatility?: boolean;
      includeVolume?: boolean;
      includeVolumeDelta?: boolean;
      includeSupportResistance?: boolean;
      timeframe?: string;
      periods?: number;
    } = {}
  ): Promise<ApiResponse<{
    volatility?: VolatilityAnalysis;
    volume?: VolumeAnalysis;
    volumeDelta?: VolumeDelta;
    supportResistance?: SupportResistanceAnalysis;
  }>> {
    return this.performanceMonitor.measure('performTechnicalAnalysis', async () => {
      try {
        this.logger.info(`🔥 INCOMING REQUEST: performTechnicalAnalysis for ${symbol}`);

        const {
          includeVolatility = true,
          includeVolume = true,
          includeVolumeDelta = true,
          includeSupportResistance = true,
          timeframe = '60',
          periods = 100
        } = options;

        const analysisPromises: Promise<any>[] = [];
        const analysisKeys: string[] = [];

        if (includeVolatility) {
          analysisPromises.push(this.analysisService.analyzeVolatility(symbol, '1d'));
          analysisKeys.push('volatility');
        }

        if (includeVolume) {
          analysisPromises.push(this.analysisService.analyzeVolume(symbol, timeframe, Math.min(periods, 48)));
          analysisKeys.push('volume');
        }

        if (includeVolumeDelta) {
          analysisPromises.push(this.analysisService.analyzeVolumeDelta(symbol, '5', Math.min(periods, 60)));
          analysisKeys.push('volumeDelta');
        }

        if (includeSupportResistance) {
          analysisPromises.push(this.analysisService.identifySupportResistance(symbol, timeframe, periods));
          analysisKeys.push('supportResistance');
        }

        const results = await Promise.all(analysisPromises);
        
        const analysis: any = {};
        results.forEach((result, index) => {
          analysis[analysisKeys[index]] = result;
        });

        // Save to Analysis Repository
        const analysisId = await this.analysisRepository.saveAnalysis(
          symbol,
          'technical_analysis' as AnalysisType,
          analysis,
          [`timeframe:${timeframe}`, `periods:${periods}`]
        );

        this.logger.info(`✅ Analysis saved with ID: ${analysisId}`);

        // AUTO-SAVE: Legacy simple implementation (for backward compatibility)
        await this.autoSaveAnalysis(symbol, 'technical_analysis', analysis);

        this.logger.info(`✅ COMPLETED: performTechnicalAnalysis for ${symbol}`);
        return this.createSuccessResponse(analysis);

      } catch (error) {
        this.logger.error(`❌ FAILED: Technical analysis for ${symbol}:`, error);
        return this.createErrorResponse(`Technical analysis failed: ${error}`);
      }
    });
  }

  /**
   * Get intelligent grid trading suggestions
   */
  async getGridTradingSuggestions(
    symbol: string,
    investment: number,
    options: {
      gridCount?: number;
      category?: MarketCategoryType;
      riskTolerance?: 'low' | 'medium' | 'high';
      optimize?: boolean;
    } = {}
  ): Promise<ApiResponse<GridSuggestion | any>> {
    return this.performanceMonitor.measure('getGridTradingSuggestions', async () => {
      try {
        this.logger.info(`Generating grid suggestions for ${symbol} with $${investment}`);

        const {
          gridCount = this.config.grid.defaultGridCount,
          category = 'spot',
          riskTolerance = 'medium',
          optimize = false
        } = options;

        let result: GridSuggestion | any;

        if (optimize) {
          // Use advanced optimization
          result = await this.tradingService.optimizeGridParameters(
            symbol,
            investment,
            5, // 5% target return
            riskTolerance
          );
        } else {
          // Use standard grid suggestion
          result = await this.tradingService.suggestGridLevels(
            symbol,
            investment,
            gridCount,
            category
          );
        }

        return this.createSuccessResponse(result);

      } catch (error) {
        this.logger.error(`Grid suggestion failed for ${symbol}:`, error);
        return this.createErrorResponse(`Grid suggestion failed: ${error}`);
      }
    });
  }

  /**
   * Comprehensive market analysis combining all features
   */
  async getCompleteAnalysis(
    symbol: string,
    investment?: number
  ): Promise<ApiResponse<{
    marketData: any;
    technicalAnalysis: any;
    gridSuggestion?: GridSuggestion;
    summary: {
      recommendation: 'buy' | 'sell' | 'hold' | 'wait';
      confidence: number;
      keyPoints: string[];
      riskLevel: 'low' | 'medium' | 'high';
    };
  }>> {
    return this.performanceMonitor.measure('getCompleteAnalysis', async () => {
      try {
        this.logger.info(`🔥 INCOMING REQUEST: getCompleteAnalysis for ${symbol}`);

        // Get all data in parallel
        const [marketDataResponse, technicalAnalysisResponse] = await Promise.all([
          this.getMarketData(symbol),
          this.performTechnicalAnalysis(symbol)
        ]);

        if (!marketDataResponse.success || !technicalAnalysisResponse.success) {
          throw new Error('Failed to fetch required data');
        }

        const marketData = marketDataResponse.data!;
        const technicalAnalysis = technicalAnalysisResponse.data!;

        // Generate grid suggestion if investment provided
        let gridSuggestion: GridSuggestion | undefined;
        if (investment && investment > 0) {
          const gridResponse = await this.getGridTradingSuggestions(symbol, investment);
          if (gridResponse.success) {
            gridSuggestion = gridResponse.data as GridSuggestion;
          }
        }

        // Generate summary and recommendation
        const summary = this.generateAnalysisSummary(
          marketData,
          technicalAnalysis,
          gridSuggestion
        );

        const completeAnalysis = {
          marketData,
          technicalAnalysis,
          gridSuggestion,
          summary
        };

        // Save complete analysis to repository
        const analysisId = await this.analysisRepository.saveAnalysis(
          symbol,
          'complete_analysis' as AnalysisType,
          completeAnalysis,
          investment ? [`investment:${investment}`] : []
        );

        this.logger.info(`✅ Complete analysis saved with ID: ${analysisId}`);

        // AUTO-SAVE: Legacy simple implementation (for backward compatibility)
        await this.autoSaveAnalysis(symbol, 'complete_analysis', completeAnalysis);

        this.logger.info(`✅ COMPLETED: getCompleteAnalysis for ${symbol}`);
        return this.createSuccessResponse(completeAnalysis);

      } catch (error) {
        this.logger.error(`❌ FAILED: Complete analysis for ${symbol}:`, error);
        return this.createErrorResponse(`Complete analysis failed: ${error}`);
      }
    });
  }

  // ====================
  // ANALYSIS REPOSITORY METHODS
  // ====================

  /**
   * Get analysis by ID
   */
  async getAnalysisById(id: string): Promise<ApiResponse<SavedAnalysis | null>> {
    try {
      const analysis = await this.analysisRepository.getAnalysisById(id);
      return this.createSuccessResponse(analysis);
    } catch (error) {
      this.logger.error(`Failed to get analysis by ID ${id}:`, error);
      return this.createErrorResponse(`Failed to get analysis: ${error}`);
    }
  }

  /**
   * Get latest analysis for a symbol
   */
  async getLatestAnalysis(
    symbol: string,
    type: AnalysisType
  ): Promise<ApiResponse<SavedAnalysis | null>> {
    try {
      const analysis = await this.analysisRepository.getLatestAnalysis(symbol, type);
      return this.createSuccessResponse(analysis);
    } catch (error) {
      this.logger.error(`Failed to get latest analysis for ${symbol}/${type}:`, error);
      return this.createErrorResponse(`Failed to get latest analysis: ${error}`);
    }
  }

  /**
   * Search analyses with complex query
   */
  async searchAnalyses(query: AnalysisQuery): Promise<ApiResponse<SavedAnalysis[]>> {
    try {
      const analyses = await this.analysisRepository.searchAnalyses(query);
      return this.createSuccessResponse(analyses);
    } catch (error) {
      this.logger.error('Failed to search analyses:', error);
      return this.createErrorResponse(`Failed to search analyses: ${error}`);
    }
  }

  /**
   * Get analysis summary for a symbol
   */
  async getAnalysisSummary(
    symbol: string,
    period?: Period
  ): Promise<ApiResponse<AnalysisSummaryType>> {
    try {
      const summary = await this.analysisRepository.getAnalysisSummary(symbol, period);
      return this.createSuccessResponse(summary);
    } catch (error) {
      this.logger.error(`Failed to get analysis summary for ${symbol}:`, error);
      return this.createErrorResponse(`Failed to get summary: ${error}`);
    }
  }

  /**
   * Get aggregated metrics
   */
  async getAggregatedMetrics(
    symbol: string,
    metric: string,
    period: Period
  ): Promise<ApiResponse<AggregatedMetrics>> {
    try {
      const metrics = await this.analysisRepository.getAggregatedMetrics(symbol, metric, period);
      return this.createSuccessResponse(metrics);
    } catch (error) {
      this.logger.error(`Failed to get aggregated metrics for ${symbol}/${metric}:`, error);
      return this.createErrorResponse(`Failed to get metrics: ${error}`);
    }
  }

  /**
   * Find patterns
   */
  async findPatterns(criteria: PatternCriteria): Promise<ApiResponse<Pattern[]>> {
    try {
      const patterns = await this.analysisRepository.findPatterns(criteria);
      return this.createSuccessResponse(patterns);
    } catch (error) {
      this.logger.error('Failed to find patterns:', error);
      return this.createErrorResponse(`Failed to find patterns: ${error}`);
    }
  }

  /**
   * Get repository statistics
   */
  async getRepositoryStats(): Promise<ApiResponse<RepositoryStats>> {
    try {
      const stats = await this.analysisRepository.getRepositoryStats();
      return this.createSuccessResponse(stats);
    } catch (error) {
      this.logger.error('Failed to get repository stats:', error);
      return this.createErrorResponse(`Failed to get stats: ${error}`);
    }
  }

  /**
   * Get analysis by ID (exposed for MCP handlers)
   */
  async getAnalysisByIdHandler(id: string): Promise<ApiResponse<SavedAnalysis | null>> {
    return this.getAnalysisById(id);
  }

  /**
   * Get latest analysis (exposed for MCP handlers)
   */
  async getLatestAnalysisHandler(
    symbol: string,
    type: AnalysisType
  ): Promise<ApiResponse<SavedAnalysis | null>> {
    return this.getLatestAnalysis(symbol, type);
  }

  /**
   * Search analyses (exposed for MCP handlers)
   */
  async searchAnalysesHandler(query: AnalysisQuery): Promise<ApiResponse<SavedAnalysis[]>> {
    return this.searchAnalyses(query);
  }

  /**
   * Get analysis summary (exposed for MCP handlers)
   */
  async getAnalysisSummaryHandler(
    symbol: string,
    period?: Period
  ): Promise<ApiResponse<AnalysisSummaryType>> {
    return this.getAnalysisSummary(symbol, period);
  }

  /**
   * Get aggregated metrics (exposed for MCP handlers)
   */
  async getAggregatedMetricsHandler(
    symbol: string,
    metric: string,
    period: Period
  ): Promise<ApiResponse<AggregatedMetrics>> {
    return this.getAggregatedMetrics(symbol, metric, period);
  }

  /**
   * Find patterns (exposed for MCP handlers)
   */
  async findPatternsHandler(criteria: PatternCriteria): Promise<ApiResponse<Pattern[]>> {
    return this.findPatterns(criteria);
  }

  /**
   * Get repository stats (exposed for MCP handlers)
   */
  async getRepositoryStatsHandler(): Promise<ApiResponse<RepositoryStats>> {
    return this.getRepositoryStats();
  }

  // ====================
  // ANALYSIS HELPERS
  // ====================

  /**
   * Generate intelligent summary and recommendation
   */
  private generateAnalysisSummary(
    marketData: any,
    technicalAnalysis: any,
    gridSuggestion?: GridSuggestion
  ): {
    recommendation: 'buy' | 'sell' | 'hold' | 'wait';
    confidence: number;
    keyPoints: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    
    const keyPoints: string[] = [];
    let bullishSignals = 0;
    let bearishSignals = 0;
    let neutralSignals = 0;

    // Analyze volatility
    if (technicalAnalysis.volatility) {
      const vol = technicalAnalysis.volatility;
      if (vol.isGoodForGrid) {
        keyPoints.push(`Volatility at ${vol.volatilityPercent.toFixed(1)}% - Good for grid trading`);
        neutralSignals++;
      } else if (vol.volatilityPercent < 3) {
        keyPoints.push(`Low volatility (${vol.volatilityPercent.toFixed(1)}%) - Limited trading opportunities`);
        neutralSignals++;
      } else {
        keyPoints.push(`High volatility (${vol.volatilityPercent.toFixed(1)}%) - Increased risk`);
        bearishSignals++;
      }
    }

    // Analyze volume
    if (technicalAnalysis.volume) {
      const vol = technicalAnalysis.volume;
      const currentVsAvg = (vol.currentVolume / vol.avgVolume) * 100;
      
      if (currentVsAvg > 150) {
        keyPoints.push(`High volume activity (${currentVsAvg.toFixed(0)}% of average)`);
        bullishSignals++;
      } else if (currentVsAvg < 70) {
        keyPoints.push(`Low volume activity (${currentVsAvg.toFixed(0)}% of average)`);
        bearishSignals++;
      }

      const currentPrice = marketData.ticker.lastPrice;
      if (vol.vwap.priceVsVwap === 'above' && Math.abs(vol.vwap.difference) > 1) {
        keyPoints.push(`Price ${vol.vwap.difference.toFixed(1)}% above VWAP - Potential resistance`);
        bearishSignals++;
      } else if (vol.vwap.priceVsVwap === 'below' && Math.abs(vol.vwap.difference) > 1) {
        keyPoints.push(`Price ${Math.abs(vol.vwap.difference).toFixed(1)}% below VWAP - Potential support`);
        bullishSignals++;
      }
    }

    // Analyze volume delta
    if (technicalAnalysis.volumeDelta) {
      const delta = technicalAnalysis.volumeDelta;
      
      if (delta.bias === 'buyer' && delta.strength > 10) {
        keyPoints.push(`Strong buying pressure (${delta.strength.toFixed(1)}% bias)`);
        bullishSignals++;
      } else if (delta.bias === 'seller' && delta.strength > 10) {
        keyPoints.push(`Strong selling pressure (${delta.strength.toFixed(1)}% bias)`);
        bearishSignals++;
      }

      if (delta.divergence.detected) {
        keyPoints.push(`Volume divergence detected - ${delta.divergence.signal.replace('_', ' ')}`);
        if (delta.divergence.signal.includes('bullish')) {
          bullishSignals++;
        } else {
          bearishSignals++;
        }
      }
    }

    // Analyze support/resistance
    if (technicalAnalysis.supportResistance) {
      const sr = technicalAnalysis.supportResistance;
      const criticalLevel = sr.criticalLevel;
      
      if (criticalLevel) {
        const distance = criticalLevel.priceDistance;
        if (criticalLevel.type === 'resistance' && distance < 3) {
          keyPoints.push(`Near strong resistance at $${criticalLevel.level.toFixed(4)} (${distance.toFixed(1)}% away)`);
          bearishSignals++;
        } else if (criticalLevel.type === 'support' && distance < 3) {
          keyPoints.push(`Near strong support at $${criticalLevel.level.toFixed(4)} (${distance.toFixed(1)}% away)`);
          bullishSignals++;
        }
      }
    }

    // Analyze grid suggestion
    if (gridSuggestion) {
      if (gridSuggestion.recommendation === 'recommended') {
        keyPoints.push(`Grid trading recommended with ${gridSuggestion.confidence}% confidence`);
        neutralSignals++;
      } else if (gridSuggestion.recommendation === 'high_risk') {
        keyPoints.push('Grid trading carries high risk in current conditions');
        bearishSignals++;
      }
    }

    // Generate recommendation
    const totalSignals = bullishSignals + bearishSignals + neutralSignals;
    const bullishRatio = bullishSignals / Math.max(totalSignals, 1);
    const bearishRatio = bearishSignals / Math.max(totalSignals, 1);

    let recommendation: 'buy' | 'sell' | 'hold' | 'wait';
    let confidence: number;
    let riskLevel: 'low' | 'medium' | 'high';

    if (bullishRatio > 0.6) {
      recommendation = 'buy';
      confidence = Math.round(bullishRatio * 100);
    } else if (bearishRatio > 0.6) {
      recommendation = 'sell';
      confidence = Math.round(bearishRatio * 100);
    } else if (neutralSignals > bullishSignals + bearishSignals) {
      recommendation = 'hold';
      confidence = Math.round((neutralSignals / totalSignals) * 100);
    } else {
      recommendation = 'wait';
      confidence = 50;
    }

    // Determine risk level
    const volatilityPercent = technicalAnalysis.volatility?.volatilityPercent || 10;
    if (volatilityPercent < 5) {
      riskLevel = 'low';
    } else if (volatilityPercent < 15) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      recommendation,
      confidence: Math.min(confidence, 95), // Cap at 95%
      keyPoints,
      riskLevel
    };
  }

  // ====================
  // SYSTEM METHODS
  // ====================

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    uptime: number;
    version: string;
  }> {
    try {
      const [marketDataHealth] = await Promise.all([
        this.marketDataService.healthCheck()
      ]);

      const services = {
        marketData: marketDataHealth,
        analysis: true, // Analysis service is always available
        trading: true,  // Trading service is always available
        repository: true // Repository is always available
      };

      const allHealthy = Object.values(services).every(status => status);
      const status = allHealthy ? 'healthy' : 'degraded';

      return {
        status,
        services,
        uptime: process.uptime(),
        version: '1.3.6'
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        services: {
          marketData: false,
          analysis: false,
          trading: false,
          repository: false
        },
        uptime: process.uptime(),
        version: '1.3.6'
      };
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): {
    engine: PerformanceMetrics[];
    marketData: PerformanceMetrics[];
    analysis: PerformanceMetrics[];
    trading: PerformanceMetrics[];
  } {
    return {
      engine: this.performanceMonitor.getMetrics(),
      marketData: this.marketDataService.getPerformanceMetrics(),
      analysis: this.analysisService.getPerformanceMetrics(),
      trading: this.tradingService.getPerformanceMetrics()
    };
  }

  /**
   * Update system configuration
   */
  updateConfig(newConfig: Partial<SystemConfig>): void {
    this.config = this.mergeConfig(newConfig);
    this.logger.info('System configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): SystemConfig {
    return { ...this.config };
  }

  // ====================
  // TIMEZONE-AWARE ANALYSIS METHODS  
  // ====================

  /**
   * Get timezone information for debugging
   */
  getTimezoneInfo() {
    return this.timezoneManager.getTimezoneInfo();
  }

  /**
   * Perform analysis with temporal context (timezone-aware)
   */
  async performTemporalAnalysis(
    symbol: string,
    options: {
      daysAgo?: number;
      localTime?: string;
      includeVolatility?: boolean;
      includeVolume?: boolean;
      includeVolumeDelta?: boolean;
      includeSupportResistance?: boolean;
      timeframe?: string;
      periods?: number;
    } = {}
  ): Promise<ApiResponse<{
    analysis: any;
    temporalContext: TemporalContext;
    userFriendlyTime: string;
    tradingSession: string;
  }>> {
    return this.performanceMonitor.measure('performTemporalAnalysis', async () => {
      try {
        const {
          daysAgo = 0,
          localTime,
          includeVolatility = true,
          includeVolume = true,
          includeVolumeDelta = true,
          includeSupportResistance = true,
          timeframe = '60',
          periods = 100
        } = options;

        // Create temporal context
        let temporalContext: TemporalContext;
        
        if (daysAgo > 0) {
          const timeData = this.timezoneManager.getDaysAgo(daysAgo, 12); // Default 12:00 local
          temporalContext = {
            userTimezone: this.timezoneConfig.userTimezone,
            requestedTime: timeData.userTime,
            utcTime: timeData.utcTime.toISOString(),
            sessionContext: timeData.context as any,
            daysAgo
          };
        } else if (localTime) {
          const utcTime = this.timezoneManager.userToUTC(localTime);
          temporalContext = {
            userTimezone: this.timezoneConfig.userTimezone,
            requestedTime: localTime,
            utcTime: utcTime.toISOString(),
            sessionContext: 'current' as any
          };
        } else {
          // Current time
          const now = new Date();
          temporalContext = {
            userTimezone: this.timezoneConfig.userTimezone,
            requestedTime: this.timezoneManager.getUserNow(),
            utcTime: now.toISOString(),
            sessionContext: 'current' as any
          };
        }

        this.logger.info(`🕐 Temporal Analysis for ${symbol}`, {
          userTime: temporalContext.requestedTime,
          utcTime: temporalContext.utcTime,
          session: temporalContext.sessionContext
        });

        // Perform standard analysis (data is always in UTC from API)
        const analysisResponse = await this.performTechnicalAnalysis(symbol, {
          includeVolatility,
          includeVolume,
          includeVolumeDelta,
          includeSupportResistance,
          timeframe,
          periods
        });

        if (!analysisResponse.success) {
          throw new Error(analysisResponse.error || 'Analysis failed');
        }

        // Enhance analysis with temporal context
        const userFriendlyTime = this.timezoneManager.formatForDisplay(temporalContext.utcTime);
        const tradingSession = temporalContext.sessionContext;

        return this.createSuccessResponse({
          analysis: analysisResponse.data,
          temporalContext,
          userFriendlyTime,
          tradingSession
        });

      } catch (error) {
        this.logger.error(`❌ Temporal analysis failed for ${symbol}:`, error);
        return this.createErrorResponse(`Temporal analysis failed: ${error}`);
      }
    });
  }

  // ====================
  // CACHE MANAGEMENT METHODS
  // ====================

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      return await this.marketDataService.getCacheStats();
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      // Return empty stats on error
      return {
        totalEntries: 0,
        totalMemoryUsage: 0,
        hitRate: 0,
        missRate: 0,
        oldestEntry: Date.now(),
        newestEntry: Date.now(),
        totalHits: 0,
        totalMisses: 0,
        entriesByTTL: {
          expired: 0,
          expiringSoon: 0,
          fresh: 0
        }
      };
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.marketDataService.clearCache();
      this.logger.info('All cache cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a symbol
   */
  async invalidateCache(symbol: string, category?: MarketCategoryType): Promise<number> {
    try {
      const invalidatedCount = await this.marketDataService.invalidateCache(symbol, category);
      this.logger.info(`Invalidated ${invalidatedCount} cache entries for ${symbol}`);
      return invalidatedCount;
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for ${symbol}:`, error);
      throw error;
    }
  }

  // ====================
  // AUTO-SAVE METHODS
  // ====================

  /**
   * Auto-save analysis using simple fs.writeFile - LESSON-001 pattern
   */
  private async autoSaveAnalysis(
    symbol: string,
    analysisType: string,
    data: any
  ): Promise<void> {
    try {
      this.logger.info(`🔥 Starting auto-save for ${symbol} (${analysisType})`);
      
      // Simple, direct file operations
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Create simple timestamp-based filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // Use project directory instead of process.cwd()
      const projectRoot = 'D:\\projects\\mcp\\waickoff_mcp';
      const storageDir = path.join(projectRoot, 'storage', 'analysis', symbol);
      const filename = `${analysisType}_${timestamp}.json`;
      const fullPath = path.join(storageDir, filename);
      
      // Ensure directory exists
      await fs.mkdir(storageDir, { recursive: true });
      this.logger.info(`📁 Created directory: ${storageDir}`);
      
      // Create analysis record
      const analysisRecord = {
        timestamp: Date.now(),
        symbol,
        analysisType,
        data,
        metadata: {
          version: '1.3.5',
          source: 'waickoff_mcp',
          engine: 'MarketAnalysisEngine',
          savedAt: new Date().toISOString()
        }
      };
      
      // Direct fs.writeFile - simple and reliable
      await fs.writeFile(fullPath, JSON.stringify(analysisRecord, null, 2), 'utf8');
      
      this.logger.info(`✅ Auto-saved successfully: ${fullPath}`);
      
    } catch (error) {
      this.logger.error(`❌ Auto-save FAILED for ${symbol} (${analysisType}):`, error);
      // Don't re-throw - auto-save failure shouldn't break analysis
    }
  }

  /**
   * Get analysis history using Analysis Repository
   */
  async getAnalysisHistory(
    symbol: string,
    limit: number = 10,
    analysisType?: string
  ): Promise<ApiResponse<SavedAnalysis[]>> {
    return this.performanceMonitor.measure('getAnalysisHistory', async () => {
      try {
        this.logger.info(`🔥 INCOMING REQUEST: getAnalysisHistory for ${symbol}`);

        // Use Analysis Repository instead of direct file operations
        const analyses = await this.analysisRepository.getAnalysisHistory(
          symbol,
          analysisType as AnalysisType,
          limit
        );

        this.logger.info(`✅ COMPLETED: getAnalysisHistory for ${symbol} (${analyses.length} analyses)`);
        return this.createSuccessResponse(analyses);

      } catch (error) {
        this.logger.error(`❌ FAILED: getAnalysisHistory for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to get analysis history: ${error}`);
      }
    });
  }

  // ====================
  // PRIVATE HELPERS
  // ====================

  private mergeConfig(userConfig?: Partial<SystemConfig>): SystemConfig {
    const defaultConfig: SystemConfig = {
      api: {
        baseUrl: 'https://api.bybit.com',
        timeout: 10000,
        retryAttempts: 3
      },
      analysis: {
        defaultSensitivity: 2,
        defaultPeriods: 100,
        volumeThresholdMultiplier: 1.5
      },
      grid: {
        defaultGridCount: 10,
        minVolatility: 3,
        maxVolatility: 20
      },
      logging: {
        level: 'info',
        enablePerformanceTracking: true
      }
    };

    return {
      api: { ...defaultConfig.api, ...userConfig?.api },
      analysis: { ...defaultConfig.analysis, ...userConfig?.analysis },
      grid: { ...defaultConfig.grid, ...userConfig?.grid },
      logging: { ...defaultConfig.logging, ...userConfig?.logging }
    };
  }

  private createSuccessResponse<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  private createErrorResponse<T>(error: string): ApiResponse<T> {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
  }
}
