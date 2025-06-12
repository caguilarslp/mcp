/**
 * @fileoverview Core Market Analysis Engine
 * @description Central orchestrator for all market analysis operations
 * @version 1.3.0
 */

import type {
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
  IReportGenerator,
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
  TemporalContext,
  ReportOptions,
  GeneratedReport,
  ReportType,
  IHistoricalDataService,
  IHistoricalAnalysisService,
  IHistoricalCacheService,
  HistoricalKlines,
  HistoricalSupportResistance,
  VolumeEvent,
  MarketCycle,
  PriceDistribution,
  HistoricalTimeframe,
  ITrapDetectionService,
  TrapDetectionResult,
  TrapEvent,
  TrapStatistics,
  TrapConfig,
  BreakoutContext
} from '../types/index.js';

import { BybitMarketDataService } from '../services/marketData.js';
import { TechnicalAnalysisService } from '../services/analysis.js';
import { TradingService } from '../services/trading.js';
import { StorageService } from '../services/storage.js';
import { CacheManager } from '../services/cacheManager.js';
import { ICacheManager } from '../types/storage.js';
import { AnalysisRepository } from '../repositories/analysisRepository.js';
import { ReportGenerator } from '../services/reports/reportGenerator.js';
import { TimezoneManager, mexicoTimezone } from '../utils/timezone.js';
import { ConfigurationManager } from '../services/config/configurationManager.js';
import { HistoricalDataService } from '../services/historicalData.js';
import { HistoricalAnalysisService } from '../services/historicalAnalysis.js';
import { HistoricalCacheService } from '../services/historicalCache.js';
import { HybridStorageService } from '../services/storage/hybridStorageService.js';
import { TrapDetectionService } from '../services/trapDetection.js';
import { WyckoffBasicService, type IWyckoffBasicService } from '../services/wyckoffBasic.js';
import { WyckoffAdvancedService, type IWyckoffAdvancedService } from '../services/wyckoffAdvanced.js';

// TASK-019: Import new technical analysis services
import { FibonacciService, type FibonacciAnalysis } from '../services/fibonacci.js';
import { BollingerBandsService, type BollingerAnalysis } from '../services/bollingerBands.js';
import { ElliottWaveService, type ElliottWaveAnalysis } from '../services/elliottWave.js';
import { ComprehensiveTechnicalAnalysisService, type ComprehensiveTechnicalAnalysis } from '../services/technicalAnalysis.js';

// TASK-020: Import Smart Money Concepts services
import { OrderBlocksService } from '../services/smartMoney/orderBlocks.js';

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
  public readonly marketDataService: IMarketDataService;
  public readonly analysisService: IAnalysisService;
  private readonly tradingService: ITradingService;
  private readonly storageService: StorageService;
  private readonly analysisRepository: IAnalysisRepository;
  private readonly reportGenerator: IReportGenerator;
  private readonly timezoneManager: TimezoneManager;
  private readonly configurationManager: ConfigurationManager;
  
  // Historical analysis services (TASK-017)
  public readonly historicalDataService: IHistoricalDataService;
  public readonly historicalAnalysisService: IHistoricalAnalysisService;
  public readonly historicalCacheService: IHistoricalCacheService;
  
  // Trap detection service (TASK-012)
  public readonly trapDetectionService: ITrapDetectionService;
  
  // Wyckoff Basic service (TASK-005)
  public readonly wyckoffBasicService: IWyckoffBasicService;
  
  // Wyckoff Advanced service (TASK-018)
  public readonly wyckoffAdvancedService: IWyckoffAdvancedService;
  
  // TASK-019: Technical Analysis Services
  public readonly fibonacciService: FibonacciService;
  public readonly bollingerBandsService: BollingerBandsService;
  public readonly elliottWaveService: ElliottWaveService;
  public readonly technicalAnalysisIntegrationService: ComprehensiveTechnicalAnalysisService;
  
  // TASK-020: Smart Money Concepts Services
  public readonly orderBlocksService: OrderBlocksService;
  
  // Hybrid storage service (TASK-015) - Optional
  public readonly hybridStorageService?: HybridStorageService;
  
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
    timezoneConfig?: Partial<TimezoneConfig>,
    configurationManager?: ConfigurationManager,
    hybridStorageService?: HybridStorageService,
    trapDetectionService?: ITrapDetectionService,
    wyckoffBasicService?: IWyckoffBasicService,
    wyckoffAdvancedService?: IWyckoffAdvancedService
  ) {
    this.logger = new FileLogger('MarketAnalysisEngine', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize configuration manager
    this.configurationManager = configurationManager || new ConfigurationManager();
    
    // Initialize configuration with defaults
    this.config = this.mergeConfig(config);
    
    // Initialize timezone configuration (will be updated by user config)
    this.timezoneConfig = {
      userTimezone: 'America/Mexico_City',
      tradingSession: '24h',
      dateFormat: 'local',
      ...timezoneConfig
    };
    
    // Initialize timezone manager (will be updated by loadUserConfiguration)
    this.timezoneManager = new TimezoneManager(this.timezoneConfig.userTimezone);
    
    // Load user configuration and update timezone asynchronously
    this.loadUserConfiguration().catch(error => {
      this.logger.warn('Failed to load user configuration on startup:', error);
    });
    
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
    
    // Initialize analysis repository with relative base path
    this.analysisRepository = new AnalysisRepository(
      this.storageService,
      './storage' // Relative path that matches StorageService basePath
    );
    
    // Initialize report generator
    this.reportGenerator = new ReportGenerator(
      this.analysisRepository,
      this.storageService,
      './storage'
    );
    
    // Initialize historical analysis services (TASK-017)
    this.historicalCacheService = new HistoricalCacheService();
    this.historicalDataService = new HistoricalDataService(
      this.config.api.baseUrl,
      this.config.api.timeout
    );
    this.historicalAnalysisService = new HistoricalAnalysisService(
      this.historicalDataService
    );
    
    // Initialize hybrid storage service (TASK-015) - Optional
    this.hybridStorageService = hybridStorageService;
    
    // Initialize trap detection service (TASK-012)
    this.trapDetectionService = trapDetectionService || new TrapDetectionService(
      this.marketDataService,
      this.analysisService
    );
    
    // Initialize Wyckoff Basic service (TASK-005)
    this.wyckoffBasicService = wyckoffBasicService || new WyckoffBasicService(
      this.marketDataService,
      this.analysisService,
      this.historicalAnalysisService
    );
    
    // Initialize Wyckoff Advanced service (TASK-018)
    this.wyckoffAdvancedService = wyckoffAdvancedService || new WyckoffAdvancedService(
      this.marketDataService,
      this.analysisService,
      this.wyckoffBasicService,
      this.historicalAnalysisService
    );
    
    // TASK-019: Initialize Technical Analysis Services
    this.fibonacciService = new FibonacciService(
      this.marketDataService as any,  // Cast interface to concrete for now
      this.analysisService as any  // Cast interface to concrete for now
    );
    
    this.bollingerBandsService = new BollingerBandsService(
      this.marketDataService as any  // Cast interface to concrete for now
    );
    
    this.elliottWaveService = new ElliottWaveService(
      this.marketDataService as any  // Cast interface to concrete for now
    );
    
    this.technicalAnalysisIntegrationService = new ComprehensiveTechnicalAnalysisService(
      this.marketDataService as any,  // Cast interface to concrete for now
      this.analysisService as any,    // Cast interface to concrete for now
      this.fibonacciService,
      this.bollingerBandsService,
      this.elliottWaveService
    );
    
    // TASK-020: Initialize Smart Money Concepts Services
    this.orderBlocksService = new OrderBlocksService(
      this.marketDataService as any,  // Cast interface to concrete for now
      this.analysisService as any     // Cast interface to concrete for now
    );
    
    this.logger.info('Market Analysis Engine initialized with timezone support, Analysis Repository, Report Generator, Trap Detection, Wyckoff Basic/Advanced, Technical Analysis Suite, and Smart Money Concepts', {
      timezone: this.timezoneConfig.userTimezone,
      currentTime: this.timezoneManager.getUserNow(),
      repositoryEnabled: true,
      reportGeneratorEnabled: true,
      configurationManagerEnabled: true,
      trapDetectionEnabled: true,
      wyckoffBasicEnabled: true,
      wyckoffAdvancedEnabled: true,
      fibonacciEnabled: true,
      bollingerBandsEnabled: true,
      elliottWaveEnabled: true,
      technicalAnalysisIntegrationEnabled: true,
      smartMoneyConceptsEnabled: true
    });
  }

  // ====================
  // PUBLIC API METHODS
  // ====================

  /**
   * Get ticker data for a symbol
   */
  async getTicker(
    symbol: string,
    category: MarketCategoryType = 'spot'
  ): Promise<ApiResponse<MarketTicker>> {
    return this.performanceMonitor.measure('getTicker', async () => {
      try {
        if (!symbol) {
          throw new Error('Symbol is required');
        }
        
        this.logger.info(`Fetching ticker for ${symbol}`);
        const ticker = await this.marketDataService.getTicker(symbol, category);
        return this.createSuccessResponse(ticker);
      } catch (error) {
        this.logger.error(`Failed to get ticker for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to fetch ticker: ${error}`);
      }
    });
  }

  /**
   * Get orderbook data for a symbol
   */
  async getOrderbook(
    symbol: string,
    category: MarketCategoryType = 'spot',
    limit: number = 25
  ): Promise<ApiResponse<Orderbook>> {
    return this.performanceMonitor.measure('getOrderbook', async () => {
      try {
        if (!symbol) {
          throw new Error('Symbol is required');
        }
        
        this.logger.info(`Fetching orderbook for ${symbol}`);
        const orderbook = await this.marketDataService.getOrderbook(symbol, category, limit);
        return this.createSuccessResponse(orderbook);
      } catch (error) {
        this.logger.error(`Failed to get orderbook for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to fetch orderbook: ${error}`);
      }
    });
  }

  /**
   * Get klines data for a symbol
   */
  async getKlines(
    symbol: string,
    interval: string = '60',
    limit: number = 24,
    category: MarketCategoryType = 'spot'
  ): Promise<ApiResponse<OHLCV[]>> {
    return this.performanceMonitor.measure('getKlines', async () => {
      try {
        if (!symbol) {
          throw new Error('Symbol is required');
        }
        
        this.logger.info(`Fetching klines for ${symbol}`);
        const klines = await this.marketDataService.getKlines(symbol, interval, limit, category);
        return this.createSuccessResponse(klines);
      } catch (error) {
        this.logger.error(`Failed to get klines for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to fetch klines: ${error}`);
      }
    });
  }

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

        this.logger.info(`✅ COMPLETED: getCompleteAnalysis for ${symbol}`);
        return this.createSuccessResponse(completeAnalysis);

      } catch (error) {
        this.logger.error(`❌ FAILED: Complete analysis for ${symbol}:`, error);
        return this.createErrorResponse(`Complete analysis failed: ${error}`);
      }
    });
  }

  // ====================
  // TRAP DETECTION METHODS (TASK-012)
  // ====================

  /**
   * Detect bull trap (false breakout above resistance)
   */
  async detectBullTrap(
    symbol: string,
    sensitivity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<ApiResponse<TrapDetectionResult>> {
    return this.performanceMonitor.measure('detectBullTrap', async () => {
      try {
        const result = await this.trapDetectionService.detectBullTrap(symbol, sensitivity);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to detect bull trap for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to detect bull trap: ${error}`);
      }
    });
  }

  /**
   * Detect bear trap (false breakdown below support)
   */
  async detectBearTrap(
    symbol: string,
    sensitivity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<ApiResponse<TrapDetectionResult>> {
    return this.performanceMonitor.measure('detectBearTrap', async () => {
      try {
        const result = await this.trapDetectionService.detectBearTrap(symbol, sensitivity);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to detect bear trap for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to detect bear trap: ${error}`);
      }
    });
  }

  /**
   * Get trap history for backtesting and analysis
   */
  async getTrapHistory(
    symbol: string,
    days: number,
    trapType?: 'bull' | 'bear' | 'both'
  ): Promise<ApiResponse<TrapEvent[]>> {
    return this.performanceMonitor.measure('getTrapHistory', async () => {
      try {
        const result = await this.trapDetectionService.getTrapHistory(symbol, days, trapType);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to get trap history for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to get trap history: ${error}`);
      }
    });
  }

  /**
   * Get trap statistics for performance analysis
   */
  async getTrapStatistics(
    symbol: string,
    period: string
  ): Promise<ApiResponse<TrapStatistics>> {
    return this.performanceMonitor.measure('getTrapStatistics', async () => {
      try {
        const result = await this.trapDetectionService.getTrapStatistics(symbol, period);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to get trap statistics for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to get trap statistics: ${error}`);
      }
    });
  }

  /**
   * Configure trap detection parameters
   */
  async configureTrapDetection(
    config: Partial<TrapConfig>
  ): Promise<ApiResponse<TrapConfig>> {
    return this.performanceMonitor.measure('configureTrapDetection', async () => {
      try {
        const result = await this.trapDetectionService.configureTrapDetection(config);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error('Failed to configure trap detection:', error);
        return this.createErrorResponse(`Failed to configure trap detection: ${error}`);
      }
    });
  }

  /**
   * Validate if there's a breakout situation
   */
  async validateBreakout(symbol: string): Promise<ApiResponse<BreakoutContext | null>> {
    return this.performanceMonitor.measure('validateBreakout', async () => {
      try {
        const result = await this.trapDetectionService.validateBreakout(symbol);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to validate breakout for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to validate breakout: ${error}`);
      }
    });
  }

  /**
   * Get trap detection performance metrics
   */
  getTrapDetectionPerformanceMetrics(): PerformanceMetrics[] {
    return this.trapDetectionService.getPerformanceMetrics();
  }

  // ====================
  // TECHNICAL ANALYSIS METHODS (TASK-019)
  // ====================

  /**
   * Calculate Fibonacci levels with automatic swing detection
   */
  async calculateFibonacciLevels(
    symbol: string,
    timeframe: string = '60',
    customConfig?: any
  ): Promise<FibonacciAnalysis> {
    return this.performanceMonitor.measure('calculateFibonacciLevels', async () => {
      try {
        const result = await this.fibonacciService.analyzeFibonacci(symbol, timeframe, customConfig);
        
        // Save to Analysis Repository
        await this.analysisRepository.saveAnalysis(
          symbol,
          'fibonacci_analysis' as any,
          result,
          [`timeframe:${timeframe}`]
        );
        
        return result;
      } catch (error) {
        this.logger.error(`Failed to calculate Fibonacci levels for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Analyze Bollinger Bands with squeeze detection
   */
  async analyzeBollingerBands(
    symbol: string,
    timeframe: string = '60',
    customConfig?: any
  ): Promise<BollingerAnalysis> {
    return this.performanceMonitor.measure('analyzeBollingerBands', async () => {
      try {
        const result = await this.bollingerBandsService.analyzeBollingerBands(symbol, timeframe, customConfig);
        
        // Save to Analysis Repository
        await this.analysisRepository.saveAnalysis(
          symbol,
          'bollinger_analysis' as any,
          result,
          [`timeframe:${timeframe}`]
        );
        
        return result;
      } catch (error) {
        this.logger.error(`Failed to analyze Bollinger Bands for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Detect Elliott Wave patterns
   */
  async detectElliottWaves(
    symbol: string,
    timeframe: string = '60',
    customConfig?: any
  ): Promise<ElliottWaveAnalysis> {
    return this.performanceMonitor.measure('detectElliottWaves', async () => {
      try {
        const result = await this.elliottWaveService.analyzeElliottWave(symbol, timeframe, customConfig);
        
        // Save to Analysis Repository
        await this.analysisRepository.saveAnalysis(
          symbol,
          'elliott_wave_analysis' as any,
          result,
          [`timeframe:${timeframe}`]
        );
        
        return result;
      } catch (error) {
        this.logger.error(`Failed to detect Elliott Waves for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Find technical confluences between multiple indicators
   */
  async findTechnicalConfluences(
    symbol: string,
    timeframe: string = '60',
    customConfig?: any
  ): Promise<ComprehensiveTechnicalAnalysis> {
    return this.performanceMonitor.measure('findTechnicalConfluences', async () => {
      try {
        const result = await this.technicalAnalysisIntegrationService.analyzeWithAllIndicators(
          symbol, 
          timeframe, 
          customConfig
        );
        
        // Save to Analysis Repository
        await this.analysisRepository.saveAnalysis(
          symbol,
          'comprehensive_technical_analysis' as any,
          result,
          [`timeframe:${timeframe}`, `confluences:${result.confluences.length}`]
        );
        
        return result;
      } catch (error) {
        this.logger.error(`Failed to find technical confluences for ${symbol}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get Technical Analysis Services performance metrics
   */
  getTechnicalAnalysisPerformanceMetrics(): {
    fibonacci: any[];
    bollingerBands: any[];
    elliottWave: any[];
    integration: any[];
  } {
    return {
      fibonacci: [], // FibonacciService doesn't have performance metrics yet
      bollingerBands: [], // BollingerBandsService doesn't have performance metrics yet
      elliottWave: [], // ElliottWaveService doesn't have performance metrics yet
      integration: [] // TechnicalAnalysisIntegrationService doesn't have performance metrics yet
    };
  }

  // ====================
  // WYCKOFF BASIC METHODS (TASK-005)
  // ====================

  /**
   * Analyze Wyckoff phase for a symbol
   */
  async analyzeWyckoffPhase(
    symbol: string,
    timeframe: string = '60',
    lookback: number = 100
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('analyzeWyckoffPhase', async () => {
      try {
        const result = await this.wyckoffBasicService.analyzeWyckoffPhase(symbol, timeframe, lookback);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to analyze Wyckoff phase for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to analyze Wyckoff phase: ${error}`);
      }
    });
  }

  /**
   * Detect trading range for Wyckoff analysis
   */
  async detectTradingRange(
    symbol: string,
    timeframe: string = '60',
    minPeriods: number = 20
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('detectTradingRange', async () => {
      try {
        const result = await this.wyckoffBasicService.detectTradingRange(symbol, timeframe, minPeriods);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to detect trading range for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to detect trading range: ${error}`);
      }
    });
  }

  /**
   * Get Wyckoff Basic service performance metrics
   */
  getWyckoffBasicPerformanceMetrics(): PerformanceMetrics[] {
    return this.wyckoffBasicService.getPerformanceMetrics();
  }

  // ====================
  // WYCKOFF ADVANCED METHODS (TASK-018)
  // ====================

  /**
   * Analyze Composite Man activity and institutional manipulation
   */
  async analyzeCompositeMan(
    symbol: string,
    timeframe: string = '60',
    lookback: number = 200
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('analyzeCompositeMan', async () => {
      try {
        const result = await this.wyckoffAdvancedService.analyzeCompositeMan(symbol, timeframe, lookback);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to analyze Composite Man for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to analyze Composite Man: ${error}`);
      }
    });
  }

  /**
   * Perform multi-timeframe Wyckoff analysis
   */
  async analyzeMultiTimeframeWyckoff(
    symbol: string,
    timeframes: string[] = ['15', '60', '240', 'D']
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('analyzeMultiTimeframeWyckoff', async () => {
      try {
        const result = await this.wyckoffAdvancedService.analyzeMultiTimeframe(symbol, timeframes);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to analyze multi-timeframe Wyckoff for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to analyze multi-timeframe Wyckoff: ${error}`);
      }
    });
  }

  /**
   * Calculate Cause & Effect relationships and price targets
   */
  async calculateCauseEffectTargets(
    symbol: string,
    timeframe: string = '60',
    lookback: number = 300
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('calculateCauseEffectTargets', async () => {
      try {
        const result = await this.wyckoffAdvancedService.calculateCauseEffect(symbol, timeframe, lookback);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to calculate cause & effect for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to calculate cause & effect: ${error}`);
      }
    });
  }

  /**
   * Analyze nested Wyckoff structures
   */
  async analyzeNestedWyckoffStructures(
    symbol: string,
    primaryTimeframe: string = '240',
    secondaryTimeframes: string[] = ['15', '60']
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('analyzeNestedWyckoffStructures', async () => {
      try {
        const result = await this.wyckoffAdvancedService.analyzeNestedStructures(
          symbol,
          primaryTimeframe,
          secondaryTimeframes
        );
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to analyze nested structures for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to analyze nested structures: ${error}`);
      }
    });
  }

  /**
   * Validate Wyckoff signal with advanced analysis
   */
  async validateWyckoffSignal(
    symbol: string,
    signal: any
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('validateWyckoffSignal', async () => {
      try {
        const result = await this.wyckoffAdvancedService.validateWyckoffSignal(symbol, signal);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to validate Wyckoff signal for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to validate Wyckoff signal: ${error}`);
      }
    });
  }

  /**
   * Track institutional flow and smart money activity
   */
  async trackInstitutionalFlow(
    symbol: string,
    timeframe: string = '60',
    lookback: number = 100
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('trackInstitutionalFlow', async () => {
      try {
        const result = await this.wyckoffAdvancedService.trackInstitutionalFlow(symbol, timeframe, lookback);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to track institutional flow for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to track institutional flow: ${error}`);
      }
    });
  }

  /**
   * Generate advanced Wyckoff insights
   */
  async generateWyckoffAdvancedInsights(
    symbol: string,
    analysisType: 'complete' | 'composite_man' | 'multi_timeframe' | 'cause_effect' | 'nested' = 'complete'
  ): Promise<ApiResponse<any>> {
    return this.performanceMonitor.measure('generateWyckoffAdvancedInsights', async () => {
      try {
        const result = await this.wyckoffAdvancedService.generateAdvancedInsights(symbol, analysisType);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to generate advanced insights for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to generate advanced insights: ${error}`);
      }
    });
  }

  /**
   * Get Wyckoff Advanced service performance metrics
   */
  getWyckoffAdvancedPerformanceMetrics(): PerformanceMetrics[] {
    return this.wyckoffAdvancedService.getPerformanceMetrics();
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
  // REPORT GENERATOR METHODS
  // ====================

  /**
   * Generate report (exposed for MCP handlers)
   */
  async generateReportHandler(options: ReportOptions): Promise<ApiResponse<GeneratedReport>> {
    try {
      const report = await this.reportGenerator.generateReport(options);
      return this.createSuccessResponse(report);
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      return this.createErrorResponse(`Failed to generate report: ${error}`);
    }
  }

  /**
   * Generate daily report (exposed for MCP handlers)
   */
  async generateDailyReportHandler(date?: Date): Promise<ApiResponse<GeneratedReport>> {
    try {
      const report = await this.reportGenerator.generateDailyReport(date);
      return this.createSuccessResponse(report);
    } catch (error) {
      this.logger.error('Failed to generate daily report:', error);
      return this.createErrorResponse(`Failed to generate daily report: ${error}`);
    }
  }

  /**
   * Generate weekly report (exposed for MCP handlers)
   */
  async generateWeeklyReportHandler(weekStartDate?: Date): Promise<ApiResponse<GeneratedReport>> {
    try {
      const report = await this.reportGenerator.generateWeeklyReport(weekStartDate);
      return this.createSuccessResponse(report);
    } catch (error) {
      this.logger.error('Failed to generate weekly report:', error);
      return this.createErrorResponse(`Failed to generate weekly report: ${error}`);
    }
  }

  /**
   * Generate symbol report (exposed for MCP handlers)
   */
  async generateSymbolReportHandler(symbol: string, period?: Period): Promise<ApiResponse<GeneratedReport>> {
    try {
      const report = await this.reportGenerator.generateSymbolReport(symbol, period);
      return this.createSuccessResponse(report);
    } catch (error) {
      this.logger.error(`Failed to generate symbol report for ${symbol}:`, error);
      return this.createErrorResponse(`Failed to generate symbol report: ${error}`);
    }
  }

  /**
   * Generate performance report (exposed for MCP handlers)
   */
  async generatePerformanceReportHandler(period?: Period): Promise<ApiResponse<GeneratedReport>> {
    try {
      const report = await this.reportGenerator.generatePerformanceReport(period);
      return this.createSuccessResponse(report);
    } catch (error) {
      this.logger.error('Failed to generate performance report:', error);
      return this.createErrorResponse(`Failed to generate performance report: ${error}`);
    }
  }

  /**
   * Get report by ID (exposed for MCP handlers)
   */
  async getReportHandler(id: string): Promise<ApiResponse<GeneratedReport | null>> {
    try {
      const report = await this.reportGenerator.getReport(id);
      return this.createSuccessResponse(report);
    } catch (error) {
      this.logger.error(`Failed to get report ${id}:`, error);
      return this.createErrorResponse(`Failed to get report: ${error}`);
    }
  }

  /**
   * List reports (exposed for MCP handlers)
   */
  async listReportsHandler(type?: ReportType, limit?: number): Promise<ApiResponse<GeneratedReport[]>> {
    try {
      const reports = await this.reportGenerator.listReports(type, limit);
      return this.createSuccessResponse(reports);
    } catch (error) {
      this.logger.error('Failed to list reports:', error);
      return this.createErrorResponse(`Failed to list reports: ${error}`);
    }
  }

  /**
   * Export report (exposed for MCP handlers)
   */
  async exportReportHandler(id: string, outputPath: string): Promise<ApiResponse<void>> {
    try {
      // Get report first
      const report = await this.reportGenerator.getReport(id);
      if (!report) {
        throw new Error(`Report not found: ${id}`);
      }
      
      await this.reportGenerator.exportReport(report, outputPath);
      return this.createSuccessResponse(undefined);
    } catch (error) {
      this.logger.error(`Failed to export report ${id}:`, error);
      return this.createErrorResponse(`Failed to export report: ${error}`);
    }
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
  // CONFIGURATION METHODS
  // ====================

  /**
   * Load user configuration and update timezone
   */
  private async loadUserConfiguration(): Promise<void> {
    try {
      const userConfig = await this.configurationManager.getUserConfig();
      
      // Update timezone configuration
      this.timezoneConfig.userTimezone = userConfig.timezone.default;
      
      // Create new timezone manager with user's timezone
      const newTimezoneManager = new TimezoneManager(userConfig.timezone.default);
      
      // Replace timezone manager (this is safe since TimezoneManager is stateless)
      (this as any).timezoneManager = newTimezoneManager;
      
      this.logger.info('User configuration loaded successfully', {
        timezone: userConfig.timezone.default,
        autoDetect: userConfig.timezone.autoDetect,
        version: userConfig.version
      });
      
    } catch (error) {
      this.logger.error('Failed to load user configuration:', error);
      // Continue with default timezone
    }
  }

  /**
   * Reload user configuration (for when config changes)
   */
  async reloadUserConfiguration(): Promise<void> {
    await this.loadUserConfiguration();
  }

  /**
   * Get configuration manager (exposed for MCP handlers)
   */
  getConfigurationManager(): ConfigurationManager {
    return this.configurationManager;
  }

  // ====================
  // HISTORICAL ANALYSIS METHODS (TASK-017)
  // ====================

  /**
   * Get historical klines data
   */
  async getHistoricalKlines(
    symbol: string,
    interval: HistoricalTimeframe,
    startTime?: number,
    endTime?: number
  ): Promise<ApiResponse<HistoricalKlines>> {
    return this.performanceMonitor.measure('getHistoricalKlines', async () => {
      try {
        const result = await this.historicalDataService.getHistoricalKlines(
          symbol,
          interval,
          startTime,
          endTime
        );
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to get historical klines for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to get historical klines: ${error}`);
      }
    });
  }

  /**
   * Analyze historical support/resistance levels
   */
  async analyzeHistoricalSupportResistance(
    symbol: string,
    timeframe: HistoricalTimeframe,
    options: {
      minTouches?: number;
      tolerance?: number;
      volumeWeight?: boolean;
      recencyBias?: number;
    } = {}
  ): Promise<ApiResponse<HistoricalSupportResistance>> {
    return this.performanceMonitor.measure('analyzeHistoricalSupportResistance', async () => {
      try {
        const result = await this.historicalAnalysisService.analyzeHistoricalSupportResistance(
          symbol,
          timeframe,
          options
        );
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to analyze historical S/R for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to analyze historical S/R: ${error}`);
      }
    });
  }

  /**
   * Identify volume events in historical data
   */
  async identifyVolumeEvents(
    symbol: string,
    timeframe: 'D' | 'W',
    threshold: number = 2.5
  ): Promise<ApiResponse<VolumeEvent[]>> {
    return this.performanceMonitor.measure('identifyVolumeEvents', async () => {
      try {
        const result = await this.historicalAnalysisService.identifyVolumeEvents(
          symbol,
          timeframe,
          threshold
        );
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to identify volume events for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to identify volume events: ${error}`);
      }
    });
  }

  /**
   * Analyze price distribution
   */
  async analyzePriceDistribution(
    symbol: string,
    timeframe: 'D' | 'W'
  ): Promise<ApiResponse<PriceDistribution>> {
    return this.performanceMonitor.measure('analyzePriceDistribution', async () => {
      try {
        const result = await this.historicalAnalysisService.analyzePriceDistribution(
          symbol,
          timeframe
        );
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to analyze price distribution for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to analyze price distribution: ${error}`);
      }
    });
  }

  /**
   * Identify market cycles
   */
  async identifyMarketCycles(symbol: string): Promise<ApiResponse<MarketCycle[]>> {
    return this.performanceMonitor.measure('identifyMarketCycles', async () => {
      try {
        const result = await this.historicalAnalysisService.identifyMarketCycles(symbol);
        return this.createSuccessResponse(result);
      } catch (error) {
        this.logger.error(`Failed to identify market cycles for ${symbol}:`, error);
        return this.createErrorResponse(`Failed to identify market cycles: ${error}`);
      }
    });
  }

  /**
   * Get historical cache statistics
   */
  getHistoricalCacheStats(): {
    totalEntries: number;
    totalMemoryUsage: number;
    hitRate: number;
    entriesByType: Record<string, number>;
    oldestEntry: number;
    newestEntry: number;
  } {
    return this.historicalCacheService.getCacheStats();
  }

  /**
   * Clear historical cache
   */
  async clearHistoricalCache(): Promise<void> {
    await this.historicalCacheService.clearCache();
  }

  /**
   * Invalidate historical cache for a symbol
   */
  async invalidateHistoricalCache(symbol: string): Promise<void> {
    await this.historicalCacheService.invalidateHistoricalCache(symbol);
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
