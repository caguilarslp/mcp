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

import { FileLogger } from '../utils/fileLogger.js';
import * as path from 'path';
import { PerformanceMonitor } from '../utils/performance.js';
import { StorageService } from '../services/storage.js';

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
  
  // Core services
  private readonly marketDataService: BybitMarketDataService;
  private readonly analysisService: TechnicalAnalysisService;
  private readonly tradingService: TradingService;
  private readonly storageService: StorageService;
  
  // Configuration
  private config: SystemConfig;

  constructor(config?: Partial<SystemConfig>) {
    this.logger = new FileLogger('MarketAnalysisEngine', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
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
    this.storageService = new StorageService();
    
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

        // AUTO-SAVE: Simple and direct implementation
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

        // AUTO-SAVE: Simple and direct implementation
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
   * Get analysis history using simple fs operations
   */
  async getAnalysisHistory(
    symbol: string,
    limit: number = 10,
    analysisType?: string
  ): Promise<ApiResponse<any[]>> {
    return this.performanceMonitor.measure('getAnalysisHistory', async () => {
      try {
        this.logger.info(`🔥 INCOMING REQUEST: getAnalysisHistory for ${symbol}`);

        // Simple, direct file operations
        const fs = await import('fs/promises');
        const path = await import('path');
        const { existsSync } = await import('fs');
        
        // Build directory path
        // Use project directory instead of process.cwd()
        const projectRoot = 'D:\\projects\\mcp\\waickoff_mcp';
        const storageDir = path.join(projectRoot, 'storage', 'analysis', symbol);
        
        // Check if directory exists
        if (!existsSync(storageDir)) {
          this.logger.info(`✅ COMPLETED: getAnalysisHistory for ${symbol} (0 files - directory doesn't exist)`);
          return this.createSuccessResponse([]);
        }

        // Read directory contents
        const files = await fs.readdir(storageDir);
        this.logger.info(`📁 Found ${files.length} files in ${storageDir}`);
        
        // Filter by analysis type if specified
        const filteredFiles = analysisType ? 
          files.filter(file => file.startsWith(`${analysisType}_`)) : 
          files;
        
        this.logger.info(`🔎 After filtering: ${filteredFiles.length} files`);
        
        // Load and sort by timestamp
        const analyses: any[] = [];
        for (const file of filteredFiles.slice(0, Math.min(limit * 2, 50))) {
          try {
            const filePath = path.join(storageDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            if (data && data.timestamp) {
              analyses.push({
                file: `analysis/${symbol}/${file}`,
                timestamp: data.timestamp,
                symbol: data.symbol,
                analysisType: data.analysisType,
                created: new Date(data.timestamp).toISOString(),
                metadata: data.metadata
              });
            }
          } catch (fileError) {
            this.logger.error(`Failed to read file ${file}:`, fileError);
            // Continue with other files
          }
        }

        // Sort by timestamp (newest first) and limit
        const sortedAnalyses = analyses
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);

        this.logger.info(`✅ COMPLETED: getAnalysisHistory for ${symbol} (${sortedAnalyses.length} files)`);
        return this.createSuccessResponse(sortedAnalyses);

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