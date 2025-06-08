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
  ApiResponse
} from '../types/index.js';

import { BybitMarketDataService } from '../services/marketData.js';
import { TechnicalAnalysisService } from '../services/analysis.js';
import { TradingService } from '../services/trading.js';

import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance.js';

export class MarketAnalysisEngine {
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;
  
  // Core services
  private readonly marketDataService: BybitMarketDataService;
  private readonly analysisService: TechnicalAnalysisService;
  private readonly tradingService: TradingService;
  
  // Configuration
  private config: SystemConfig;

  constructor(config?: Partial<SystemConfig>) {
    this.logger = new Logger('MarketAnalysisEngine');
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize configuration with defaults
    this.config = this.mergeConfig(config);
    
    // Initialize services
    this.marketDataService = new BybitMarketDataService(
      this.config.api.baseUrl,
      this.config.api.timeout,
      this.config.api.retryAttempts
    );
    
    this.analysisService = new TechnicalAnalysisService(this.marketDataService);
    this.tradingService = new TradingService(this.marketDataService, this.analysisService);
    
    this.logger.info('Market Analysis Engine initialized');
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
        this.logger.info(`Performing technical analysis for ${symbol}`);

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

        return this.createSuccessResponse(analysis);

      } catch (error) {
        this.logger.error(`Technical analysis failed for ${symbol}:`, error);
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
        this.logger.info(`Performing complete analysis for ${symbol}`);

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

        return this.createSuccessResponse({
          marketData,
          technicalAnalysis,
          gridSuggestion,
          summary
        });

      } catch (error) {
        this.logger.error(`Complete analysis failed for ${symbol}:`, error);
        return this.createErrorResponse(`Complete analysis failed: ${error}`);
      }
    });
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
        trading: true   // Trading service is always available
      };

      const allHealthy = Object.values(services).every(status => status);
      const status = allHealthy ? 'healthy' : 'degraded';

      return {
        status,
        services,
        uptime: process.uptime(),
        version: '1.3.0'
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        services: {
          marketData: false,
          analysis: false,
          trading: false
        },
        uptime: process.uptime(),
        version: '1.3.0'
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