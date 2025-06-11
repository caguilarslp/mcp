/**
 * @fileoverview MCP Tool Handlers - Complete Modular Handler System
 * @description Unified handler system with proper modular architecture
 * @version 1.3.7
 */

import { MarketAnalysisEngine } from '../core/engine.js';
import { MCPServerResponse, MarketCategoryType } from '../types/index.js';
import { FileLogger } from '../utils/fileLogger.js';
import { MarketDataHandlers } from './handlers/marketDataHandlers.js';
import { AnalysisRepositoryHandlers } from './handlers/analysisRepositoryHandlers.js';
import { ReportGeneratorHandlers } from './handlers/reportGeneratorHandlers.js';
import { CacheHandlers } from './cacheHandlers.js';
import { ConfigurationHandlers } from './handlers/configurationHandlers.js';
import { HistoricalAnalysisHandlers } from './handlers/historicalAnalysisHandlers.js';
import { HybridStorageHandlers } from './handlers/hybridStorageHandlers.js';
import { JsonParseAttempt } from '../utils/requestLogger.js';
import * as path from 'path';

export class MCPHandlers {
  private readonly logger: FileLogger;
  private readonly engine: MarketAnalysisEngine;
  private readonly marketDataHandlers: MarketDataHandlers;
  private readonly analysisRepositoryHandlers: AnalysisRepositoryHandlers;
  private readonly reportGeneratorHandlers: ReportGeneratorHandlers;
  private readonly cacheHandlers: CacheHandlers;
  private readonly configurationHandlers: ConfigurationHandlers;
  private readonly historicalAnalysisHandlers: HistoricalAnalysisHandlers;
  private readonly hybridStorageHandlers?: HybridStorageHandlers;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('MCPHandlers', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });

    // Initialize modular handlers
    this.marketDataHandlers = new MarketDataHandlers(engine, this.logger);
    this.analysisRepositoryHandlers = new AnalysisRepositoryHandlers(engine, this.logger);
    this.reportGeneratorHandlers = new ReportGeneratorHandlers(engine, this.logger);
    this.cacheHandlers = new CacheHandlers(engine);
    this.configurationHandlers = new ConfigurationHandlers(engine.getConfigurationManager());
    this.historicalAnalysisHandlers = new HistoricalAnalysisHandlers(
      engine.historicalDataService,
      engine.historicalAnalysisService,
      engine.historicalCacheService
    );
    
    // Initialize Hybrid Storage Handlers if available (TASK-015)
    if (engine.hybridStorageService) {
      this.hybridStorageHandlers = new HybridStorageHandlers(engine.hybridStorageService);
      this.logger.info('Hybrid Storage Handlers initialized');
    }

    this.logger.info('MCP Handlers initialized with modular architecture', {
      hybridStorageEnabled: !!engine.hybridStorageService
    });
  }

  // ====================
  // MARKET DATA HANDLERS
  // ====================

  async handleGetTicker(args: any): Promise<MCPServerResponse> {
    return await this.marketDataHandlers.handleGetTicker(args);
  }

  async handleGetOrderbook(args: any): Promise<MCPServerResponse> {
    return await this.marketDataHandlers.handleGetOrderbook(args);
  }

  async handleGetMarketData(args: any): Promise<MCPServerResponse> {
    return await this.marketDataHandlers.handleGetMarketData(args);
  }

  // ====================
  // ANALYSIS HANDLERS
  // ====================

  async handleAnalyzeVolatility(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const period = (args?.period as string) || '1d';

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.performTechnicalAnalysis(symbol, {
      includeVolatility: true,
      includeVolume: false,
      includeVolumeDelta: false,
      includeSupportResistance: false
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to analyze volatility');
    }

    const volatilityAnalysis = response.data!.volatility!;
    
    const formattedAnalysis = {
      symbol: volatilityAnalysis.symbol,
      periodo_analisis: volatilityAnalysis.period,
      precio_actual: `$${volatilityAnalysis.currentPrice.toFixed(4)}`,
      precio_maximo: `$${volatilityAnalysis.highestPrice.toFixed(4)}`,
      precio_minimo: `$${volatilityAnalysis.lowestPrice.toFixed(4)}`,
      volatilidad: `${volatilityAnalysis.volatilityPercent.toFixed(2)}%`,
      evaluacion: {
        bueno_para_grid: volatilityAnalysis.isGoodForGrid,
        recomendacion: volatilityAnalysis.recommendation,
        confianza: `${volatilityAnalysis.confidence}%`
      }
    };

    return this.createSuccessResponse(formattedAnalysis);
  }

  async handleAnalyzeVolume(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const interval = (args?.interval as string) || '60';
    const periods = (args?.periods as number) || 24;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.performTechnicalAnalysis(symbol, {
      includeVolatility: false,
      includeVolume: true,
      includeVolumeDelta: false,
      includeSupportResistance: false,
      timeframe: interval,
      periods
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to analyze volume');
    }

    const volumeAnalysis = response.data!.volume!;
    
    const formattedAnalysis = {
      symbol: volumeAnalysis.symbol,
      interval: volumeAnalysis.interval,
      analisis_volumen: {
        volumen_promedio: volumeAnalysis.avgVolume.toFixed(2),
        volumen_actual: volumeAnalysis.currentVolume.toFixed(2),
        volumen_maximo: volumeAnalysis.maxVolume.toFixed(2),
        comparacion_promedio: `${((volumeAnalysis.currentVolume / volumeAnalysis.avgVolume) * 100).toFixed(0)}%`
      },
      picos_volumen: volumeAnalysis.volumeSpikes.map(spike => ({
        tiempo: spike.timestamp,
        volumen: spike.volume.toFixed(2),
        multiplicador: `${spike.multiplier.toFixed(1)}x promedio`,
        precio: `$${spike.price.toFixed(4)}`
      })),
      vwap: {
        actual: `$${volumeAnalysis.vwap.current.toFixed(4)}`,
        precio_vs_vwap: volumeAnalysis.vwap.priceVsVwap === 'above' ? 'Por encima' : 'Por debajo',
        diferencia: `${volumeAnalysis.vwap.difference.toFixed(2)}%`
      },
      tendencia_volumen: volumeAnalysis.trend === 'increasing' ? 'Incrementando' : 
                         volumeAnalysis.trend === 'decreasing' ? 'Disminuyendo' : 'Estable'
    };

    return this.createSuccessResponse(formattedAnalysis);
  }

  async handleAnalyzeVolumeDelta(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const interval = (args?.interval as string) || '5';
    const periods = (args?.periods as number) || 60;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.performTechnicalAnalysis(symbol, {
      includeVolatility: false,
      includeVolume: false,
      includeVolumeDelta: true,
      includeSupportResistance: false,
      timeframe: interval,
      periods
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to analyze volume delta');
    }

    const volumeDelta = response.data!.volumeDelta!;
    
    const formattedAnalysis = {
      symbol: volumeDelta.symbol,
      interval: volumeDelta.interval,
      volume_delta_reciente: {
        delta_actual: volumeDelta.current.toFixed(2),
        delta_promedio: volumeDelta.average.toFixed(2),
        sesgo: volumeDelta.bias === 'buyer' ? 'Comprador' : volumeDelta.bias === 'seller' ? 'Vendedor' : 'Neutral',
        fuerza_sesgo: `${volumeDelta.strength.toFixed(1)}%`
      },
      presion_mercado: {
        velas_alcistas: volumeDelta.marketPressure.bullishCandles,
        velas_bajistas: volumeDelta.marketPressure.bearishCandles,
        porcentaje_alcista: `${volumeDelta.marketPressure.bullishPercent.toFixed(0)}%`,
        tendencia: volumeDelta.marketPressure.trend === 'strong_buying' ? 'Fuerte presión compradora' :
                   volumeDelta.marketPressure.trend === 'strong_selling' ? 'Fuerte presión vendedora' : 'Mercado equilibrado'
      },
      delta_acumulativo: {
        actual: volumeDelta.cumulativeDelta.toFixed(2)
      },
      divergencias: {
        detectada: volumeDelta.divergence.detected,
        tipo: volumeDelta.divergence.type,
        señal: volumeDelta.divergence.signal === 'bullish_reversal' ? 'Posible reversión alcista' :
               volumeDelta.divergence.signal === 'bearish_reversal' ? 'Posible reversión bajista' : 'Tendencia confirmada'
      }
    };

    return this.createSuccessResponse(formattedAnalysis);
  }

  async handleIdentifySupportResistance(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const interval = (args?.interval as string) || '60';
    const periods = (args?.periods as number) || 100;
    const sensitivity = (args?.sensitivity as number) || 2;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.performTechnicalAnalysis(symbol, {
      includeVolatility: false,
      includeVolume: false,
      includeVolumeDelta: false,
      includeSupportResistance: true,
      timeframe: interval,
      periods
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to identify support/resistance');
    }

    const srAnalysis = response.data!.supportResistance!;
    
    // DEBUGGING LOG for BUG-004 - Log what we receive from analysis service
    this.logger.info(`MCP Handlers S/R Debug: CurrentPrice=${srAnalysis.currentPrice.toFixed(4)}`);
    this.logger.info(`MCP Handlers Resistances count: ${srAnalysis.resistances.length}`);
    this.logger.info(`MCP Handlers Supports count: ${srAnalysis.supports.length}`);
    
    srAnalysis.resistances.forEach((r, i) => {
      this.logger.info(`Resistance ${i}: ${r.level.toFixed(4)} (type: ${r.type})`);
    });
    
    srAnalysis.supports.forEach((s, i) => {
      this.logger.info(`Support ${i}: ${s.level.toFixed(4)} (type: ${s.type})`);
    });
    
    const formattedAnalysis = {
      symbol: srAnalysis.symbol,
      interval: srAnalysis.interval,
      precio_actual: `$${srAnalysis.currentPrice.toFixed(4)}`,
      analisis_niveles: {
        resistencias: srAnalysis.resistances.map(level => ({
          nivel: `$${level.level.toFixed(4)}`,
          fuerza: level.strength.toFixed(1),
          toques: level.touches,
          distancia_precio: `${level.priceDistance.toFixed(2)}%`,
          confirmacion_volumen: `${level.volumeConfirmation.toFixed(1)}x promedio`,
          ultimo_toque: level.lastTouchTime,
          evaluacion: level.confidence === 'very_strong' ? 'Muy fuerte' :
                      level.confidence === 'strong' ? 'Fuerte' : 
                      level.confidence === 'moderate' ? 'Moderado' : 'Débil'
        })),
        soportes: srAnalysis.supports.map(level => ({
          nivel: `$${level.level.toFixed(4)}`,
          fuerza: level.strength.toFixed(1),
          toques: level.touches,
          distancia_precio: `${level.priceDistance.toFixed(2)}%`,
          confirmacion_volumen: `${level.volumeConfirmation.toFixed(1)}x promedio`,
          ultimo_toque: level.lastTouchTime,
          evaluacion: level.confidence === 'very_strong' ? 'Muy fuerte' :
                      level.confidence === 'strong' ? 'Fuerte' : 
                      level.confidence === 'moderate' ? 'Moderado' : 'Débil'
        }))
      },
      nivel_critico: {
        tipo: srAnalysis.criticalLevel.type === 'resistance' ? 'resistance' : 'support',
        precio: `$${srAnalysis.criticalLevel.level.toFixed(4)}`,
        distancia: `${srAnalysis.criticalLevel.priceDistance.toFixed(2)}%`,
        fuerza: srAnalysis.criticalLevel.strength.toFixed(1),
        accion_sugerida: srAnalysis.criticalLevel.type === 'resistance' ? 
          'Posible zona de toma de ganancias' : 
          'Posible zona de compra/soporte'
      },
      configuracion_grid: {
        zona_optima_inferior: `$${srAnalysis.gridConfig.optimalLowerBound.toFixed(4)}`,
        zona_optima_superior: `$${srAnalysis.gridConfig.optimalUpperBound.toFixed(4)}`,
        niveles_clave_grid: srAnalysis.gridConfig.keyLevels.map(level => `$${level.toFixed(4)}`),
        grids_recomendados: srAnalysis.gridConfig.recommendedGridCount,
        recomendacion: srAnalysis.gridConfig.recommendation
      },
      estadisticas: {
        total_pivots_encontrados: srAnalysis.statistics.totalPivotsFound,
        rango_precio_analizado: `$${srAnalysis.statistics.priceRangeAnalyzed.low.toFixed(4)} - $${srAnalysis.statistics.priceRangeAnalyzed.high.toFixed(4)}`,
        volumen_promedio: srAnalysis.statistics.avgVolume.toFixed(2),
        periodos_analizados: srAnalysis.statistics.periodsAnalyzed,
        sensibilidad_usada: srAnalysis.statistics.sensitivityUsed
      }
    };

    return this.createSuccessResponse(formattedAnalysis);
  }

  async handleSuggestGridLevels(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const investment = args?.investment as number;
    const gridCount = (args?.gridCount as number) || 10;
    const category = (args?.category as MarketCategoryType) || 'spot';
    const riskTolerance = (args?.riskTolerance as 'low' | 'medium' | 'high') || 'medium';
    const optimize = (args?.optimize as boolean) || false;

    if (!symbol || !investment) {
      throw new Error('Symbol and investment are required');
    }

    const response = await this.engine.getGridTradingSuggestions(symbol, investment, {
      gridCount,
      category,
      riskTolerance,
      optimize
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to suggest grid levels');
    }

    const gridSuggestion = response.data!;
    
    let formattedSuggestion: any;

    if (optimize) {
      // Optimized suggestion format
      formattedSuggestion = {
        symbol,
        optimized: true,
        optimal_grid_count: gridSuggestion.optimalGridCount,
        suggested_range: {
          lower: `$${gridSuggestion.optimalRange.lower.toFixed(4)}`,
          upper: `$${gridSuggestion.optimalRange.upper.toFixed(4)}`
        },
        expected_return: `${gridSuggestion.expectedReturn.toFixed(2)}%`,
        risk_score: gridSuggestion.riskScore.toFixed(1),
        risk_tolerance: riskTolerance,
        investment: `$${investment}`
      };
    } else {
      // Standard suggestion format
      formattedSuggestion = {
        symbol,
        current_price: `$${gridSuggestion.currentPrice.toFixed(4)}`,
        suggested_range: {
          lower: `$${gridSuggestion.suggestedRange.lower.toFixed(4)}`,
          upper: `$${gridSuggestion.suggestedRange.upper.toFixed(4)}`
        },
        grid_levels: gridSuggestion.gridLevels.map((level: number) => `${level.toFixed(4)}`),
        investment: `$${gridSuggestion.investment}`,
        price_per_grid: `$${gridSuggestion.pricePerGrid.toFixed(2)}`,
        potential_profit: gridSuggestion.potentialProfit,
        volatility_24h: `${gridSuggestion.volatility24h.toFixed(2)}%`,
        recommendation: gridSuggestion.recommendation === 'recommended' ? 'Recomendado' :
                        gridSuggestion.recommendation === 'wait' ? 'Esperar' : 'Alto riesgo',
        confidence: `${gridSuggestion.confidence}%`
      };
    }

    return this.createSuccessResponse(formattedSuggestion);
  }

  async handlePerformTechnicalAnalysis(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const options = {
      includeVolatility: args?.includeVolatility ?? true,
      includeVolume: args?.includeVolume ?? true,
      includeVolumeDelta: args?.includeVolumeDelta ?? true,
      includeSupportResistance: args?.includeSupportResistance ?? true,
      timeframe: args?.timeframe || '60',
      periods: args?.periods || 100
    };

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.performTechnicalAnalysis(symbol, options);

    if (!response.success) {
      throw new Error(response.error || 'Failed to perform technical analysis');
    }

    // Format the comprehensive analysis
    const analysis = response.data!;
    const formattedAnalysis: any = { symbol };

    if (analysis.volatility) {
      formattedAnalysis.volatility = {
        percent: `${analysis.volatility.volatilityPercent.toFixed(2)}%`,
        good_for_grid: analysis.volatility.isGoodForGrid,
        recommendation: analysis.volatility.recommendation,
        confidence: `${analysis.volatility.confidence}%`
      };
    }

    if (analysis.volume) {
      formattedAnalysis.volume = {
        current_vs_average: `${((analysis.volume.currentVolume / analysis.volume.avgVolume) * 100).toFixed(0)}%`,
        trend: analysis.volume.trend,
        vwap_position: analysis.volume.vwap.priceVsVwap,
        vwap_difference: `${analysis.volume.vwap.difference.toFixed(2)}%`
      };
    }

    if (analysis.volumeDelta) {
      formattedAnalysis.volume_delta = {
        bias: analysis.volumeDelta.bias,
        strength: `${analysis.volumeDelta.strength.toFixed(1)}%`,
        divergence_detected: analysis.volumeDelta.divergence.detected,
        market_pressure: analysis.volumeDelta.marketPressure.trend
      };
    }

    if (analysis.supportResistance) {
      formattedAnalysis.support_resistance = {
        resistances_found: analysis.supportResistance.resistances.length,
        supports_found: analysis.supportResistance.supports.length,
        critical_level: {
          type: analysis.supportResistance.criticalLevel.type,
          price: `$${analysis.supportResistance.criticalLevel.level.toFixed(4)}`,
          distance: `${analysis.supportResistance.criticalLevel.priceDistance.toFixed(2)}%`
        }
      };
    }

    return this.createSuccessResponse(formattedAnalysis);
  }

  async handleGetCompleteAnalysis(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const investment = args?.investment as number;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getCompleteAnalysis(symbol, investment);

    if (!response.success) {
      throw new Error(response.error || 'Failed to perform complete analysis');
    }

    const analysis = response.data!;
    
    const formattedAnalysis: any = {
      symbol,
      summary: {
        recommendation: analysis.summary.recommendation.toUpperCase(),
        confidence: `${analysis.summary.confidence}%`,
        risk_level: analysis.summary.riskLevel.toUpperCase(),
        key_points: analysis.summary.keyPoints
      },
      market_data: {
        current_price: `${analysis.marketData.ticker.lastPrice.toFixed(4)}`,
        change_24h: `${analysis.marketData.ticker.price24hPcnt.toFixed(2)}%`,
        volume_24h: analysis.marketData.ticker.volume24h.toString(),
        spread: `${analysis.marketData.orderbook.spread.toFixed(4)}`
      },
      technical_indicators: {
        volatility: analysis.technicalAnalysis.volatility ? {
          percent: `${analysis.technicalAnalysis.volatility.volatilityPercent.toFixed(2)}%`,
          suitable_for_grid: analysis.technicalAnalysis.volatility.isGoodForGrid
        } : null,
        volume_analysis: analysis.technicalAnalysis.volume ? {
          current_vs_avg: `${((analysis.technicalAnalysis.volume.currentVolume / analysis.technicalAnalysis.volume.avgVolume) * 100).toFixed(0)}%`,
          trend: analysis.technicalAnalysis.volume.trend
        } : null,
        support_resistance: analysis.technicalAnalysis.supportResistance ? {
          levels_found: analysis.technicalAnalysis.supportResistance.resistances.length + analysis.technicalAnalysis.supportResistance.supports.length,
          critical_distance: `${analysis.technicalAnalysis.supportResistance.criticalLevel.priceDistance.toFixed(2)}%`
        } : null
      }
    };

    if (analysis.gridSuggestion) {
      formattedAnalysis.grid_suggestion = {
        recommended: analysis.gridSuggestion.recommendation === 'recommended',
        confidence: `${analysis.gridSuggestion.confidence}%`,
        range: `${analysis.gridSuggestion.suggestedRange.lower.toFixed(4)} - ${analysis.gridSuggestion.suggestedRange.upper.toFixed(4)}`,
        potential_profit: analysis.gridSuggestion.potentialProfit
      };
    }

    return this.createSuccessResponse(formattedAnalysis);
  }

  // ====================
  // SYSTEM HANDLERS
  // ====================

  async handleGetSystemHealth(args: any): Promise<MCPServerResponse> {
    const health = await this.engine.getSystemHealth();
    const metrics = this.engine.getPerformanceMetrics();

    const formattedHealth = {
      system_status: health.status.toUpperCase(),
      version: health.version,
      uptime: `${Math.round(health.uptime / 3600)} hours`,
      services: {
        market_data: health.services.marketData ? 'ONLINE' : 'OFFLINE',
        analysis: health.services.analysis ? 'ONLINE' : 'OFFLINE',
        trading: health.services.trading ? 'ONLINE' : 'OFFLINE'
      },
      performance: {
        total_requests: metrics.engine.length,
        avg_response_time: metrics.engine.length > 0 ? 
          `${(metrics.engine.reduce((sum, m) => sum + m.executionTime, 0) / metrics.engine.length).toFixed(0)}ms` : '0ms',
        success_rate: metrics.engine.length > 0 ? 
          `${((metrics.engine.filter(m => m.success).length / metrics.engine.length) * 100).toFixed(1)}%` : '100%'
      }
    };

    return this.createSuccessResponse(formattedHealth);
  }

  async handleGetDebugLogs(args: any): Promise<MCPServerResponse> {
    const logType = (args?.logType as string) || 'all';
    const limit = (args?.limit as number) || 50;
    
    try {
      // Import the request logger dynamically to avoid circular imports
      const { requestLogger } = await import('../utils/requestLogger.js');
      
      let logs: any[] = [];
      let logSummary: any = {
        logType,
        timestamp: new Date().toISOString(),
        totalEntries: 0
      };

      switch (logType) {
        case 'json_errors':
          logs = await requestLogger.getJsonErrorLogs();
          logSummary.description = 'JSON parsing error logs';
          logSummary.totalEntries = logs.length;
          break;
          
        case 'requests':
          logs = await requestLogger.getRecentLogs(limit);
          logSummary.description = 'Recent API request logs';
          logSummary.totalEntries = logs.length;
          break;
          
        case 'errors':
          const allLogs = await requestLogger.getRecentLogs(200);
          logs = allLogs.filter((log: any) => log.error || 
            (log.jsonParseAttempts && log.jsonParseAttempts.some((attempt: JsonParseAttempt) => attempt.error)));
          logSummary.description = 'Error logs (HTTP errors and JSON parse errors)';
          logSummary.totalEntries = logs.length;
          break;
          
        case 'all':
        default:
          logs = await requestLogger.getRecentLogs(limit);
          logSummary.description = 'All recent logs';
          logSummary.totalEntries = logs.length;
          break;
      }

      // Get application logs from the engine's logger
      const engineLogs = this.logger.getLogs(undefined, 20);
      
      // Get comprehensive system info with proper JSON serialization
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.round(process.uptime()),
        memoryUsage: {
          rss: process.memoryUsage().rss,
          heapTotal: process.memoryUsage().heapTotal,
          heapUsed: process.memoryUsage().heapUsed,
          external: process.memoryUsage().external,
          arrayBuffers: process.memoryUsage().arrayBuffers
        },
        timestamp: new Date().toISOString()
      };
      
      // Get file logger info
      const fileLoggerInfo = (this.logger as any).getLogFileInfo ? 
        (this.logger as any).getLogFileInfo() : 
        { info: 'FileLogger info not available' };

      const formattedLogs = {
        summary: logSummary,
        system_info: systemInfo,
        file_logger_info: fileLoggerInfo,
        api_requests: logs.slice(-Math.min(limit, 25)).map(log => ({
          requestId: log.requestId,
          timestamp: log.timestamp,
          method: log.method,
          url: log.url ? log.url.replace('https://api.bybit.com', '') : 'Unknown',
          status: log.responseStatus || 'Pending',
          error: log.error || null,
          duration: log.duration ? `${log.duration}ms` : null,
          jsonErrors: log.jsonParseAttempts ? 
            log.jsonParseAttempts.filter((attempt: JsonParseAttempt) => attempt.error).length : 0,
          jsonErrorDetails: log.jsonParseAttempts ? 
            log.jsonParseAttempts.filter((attempt: JsonParseAttempt) => attempt.error).map((attempt: JsonParseAttempt) => ({
              attempt: attempt.attempt,
              error: attempt.error,
              errorPosition: attempt.errorPosition,
              context: attempt.context,
              dataPreview: attempt.rawData.substring(0, 50)
            })) : []
        })),
        application_logs: engineLogs.map(log => ({
          timestamp: log.timestamp,
          level: log.level.toUpperCase(),
          service: log.service,
          message: log.message,
          data: log.data,
          error: log.error ? log.error.message : null
        })),
        troubleshooting_info: {
          common_json_errors: [
            {
              error: "Expected ',' or ']' after array element in JSON at position 5",
              likely_cause: "MCP SDK startup issue (known issue) - happens during handshake",
              resolution: "Error is suppressed in logger, doesn't affect functionality. This is a timing issue during MCP initialization.",
              frequency: "High during startup, then stops",
              impact: "None - purely cosmetic"
            },
            {
              error: "Unexpected end of JSON input",
              likely_cause: "Truncated API response from Bybit or network timeout",
              resolution: "Check network connection, API rate limits, and response size",
              frequency: "Occasional",
              impact: "Medium - affects specific API calls"
            },
            {
              error: "Unexpected token in JSON",
              likely_cause: "Malformed response from API or encoding issues",
              resolution: "Check API endpoint format and response headers",
              frequency: "Rare",
              impact: "Medium - affects specific API calls"
            },
            {
              error: "Response truncated at position X",
              likely_cause: "Network interruption or server-side truncation",
              resolution: "Implement retry logic or check server status",
              frequency: "Rare",
              impact: "High - data loss"
            }
          ],
          diagnostic_commands: [
            "Use 'get_debug_logs' with logType='json_errors' to see only JSON issues",
            "Use 'get_debug_logs' with logType='errors' to see all errors",
            "Check /logs directory for detailed file logs with stack traces",
            "Run health check to verify API connectivity"
          ],
          next_steps: [
            "1. Check if errors are repeating (pattern analysis)",
            "2. Verify network connectivity to api.bybit.com",
            "3. Check if specific endpoints are causing issues",
            "4. Review raw response data in jsonErrorDetails",
            "5. Check memory usage and system resources",
            "6. Review file logs for detailed stack traces"
          ],
          file_locations: {
            json_logs: `${process.cwd()}/logs/mcp-requests-YYYY-MM-DD.json`,
            application_logs: `${process.cwd()}/logs/mcp-YYYY-MM-DD.log`,
            rotated_logs: `${process.cwd()}/logs/mcp-YYYY-MM-DD.N.log`
          }
        }
      };

      return this.createSuccessResponse(formattedLogs);
    } catch (error) {
      this.logger.error('Failed to retrieve debug logs:', error);
      return this.createErrorResponse('get_debug_logs', error as Error);
    }
  }

  async handleGetAnalysisHistory(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const limit = (args?.limit as number) || 10;
    const analysisType = args?.analysisType as string;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getAnalysisHistory(symbol, limit, analysisType);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get analysis history');
    }

    const history = response.data!;
    
    const formattedHistory = {
      symbol,
      total_analyses: history.length,
      filter: analysisType || 'all',
      analyses: history.map(analysis => ({
        created: new Date(analysis.timestamp).toISOString(),
        type: analysis.analysisType,
        file: `analysis_${analysis.id}.json`,
        version: analysis.metadata?.version || 'unknown'
      }))
    };

    return this.createSuccessResponse(formattedHistory);
  }

  async handleTestStorage(args: any): Promise<MCPServerResponse> {
    const operation = (args?.operation as string) || 'save_test';

    try {
      const storageService = new (await import('../services/storage.js')).StorageService();
      const testResults: any = {
        operation,
        timestamp: new Date().toISOString(),
        success: false,
        details: {}
      };

      switch (operation) {
        case 'save_test':
          const testData = {
            test: true,
            timestamp: Date.now(),
            message: 'Storage test successful'
          };
          await storageService.save('test/storage_test.json', testData);
          testResults.success = true;
          testResults.details.message = 'Test data saved successfully';
          testResults.details.path = 'test/storage_test.json';
          break;

        case 'load_test':
          const loadedData = await storageService.load('test/storage_test.json');
          testResults.success = loadedData !== null;
          testResults.details.loaded = loadedData;
          break;

        case 'query_test':
          const files = await storageService.query('test/*');
          testResults.success = true;
          testResults.details.files_found = files;
          testResults.details.count = files.length;
          break;

        case 'stats':
          const stats = await storageService.getStorageStats();
          testResults.success = true;
          testResults.details.stats = stats;
          break;

        default:
          throw new Error(`Unknown test operation: ${operation}`);
      }

      return this.createSuccessResponse(testResults);

    } catch (error) {
      this.logger.error('Storage test failed:', error);
      return this.createErrorResponse('test_storage', error as Error);
    }
  }

  // ====================
  // ANALYSIS REPOSITORY HANDLERS (DELEGATED)
  // ====================

  async handleGetAnalysisById(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetAnalysisById(args);
  }

  async handleGetLatestAnalysis(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetLatestAnalysis(args);
  }

  async handleSearchAnalyses(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleSearchAnalyses(args);
  }

  async handleGetAnalysisSummary(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetAnalysisSummary(args);
  }

  async handleGetAggregatedMetrics(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetAggregatedMetrics(args);
  }

  async handleFindPatterns(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleFindPatterns(args);
  }

  async handleGetRepositoryStats(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetRepositoryStats(args);
  }

  // ====================
  // CACHE HANDLERS (DELEGATED)
  // ====================

  async handleGetCacheStats(args: any): Promise<MCPServerResponse> {
    return await this.cacheHandlers.handleGetCacheStats(args);
  }

  async handleClearCache(args: any): Promise<MCPServerResponse> {
    return await this.cacheHandlers.handleClearCache(args);
  }

  async handleInvalidateCache(args: any): Promise<MCPServerResponse> {
    return await this.cacheHandlers.handleInvalidateCache(args);
  }

  // ====================
  // REPORT GENERATOR HANDLERS (DELEGATED)
  // ====================

  async handleGenerateReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGenerateReport(args);
  }

  async handleGenerateDailyReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGenerateDailyReport(args);
  }

  async handleGenerateWeeklyReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGenerateWeeklyReport(args);
  }

  async handleGenerateSymbolReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGenerateSymbolReport(args);
  }

  async handleGeneratePerformanceReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGeneratePerformanceReport(args);
  }

  async handleGetReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGetReport(args);
  }

  async handleListReports(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleListReports(args);
  }

  async handleExportReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleExportReport(args);
  }

  // ====================
  // CONFIGURATION HANDLERS (DELEGATED)
  // ====================

  async handleGetUserConfig(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleGetUserConfig();
  }

  async handleSetUserTimezone(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleSetUserTimezone(args);
  }

  async handleDetectTimezone(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleDetectTimezone();
  }

  async handleUpdateConfig(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleUpdateConfig(args);
  }

  async handleResetConfig(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleResetConfig();
  }

  async handleValidateConfig(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleValidateConfig();
  }

  async handleGetConfigInfo(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleGetConfigInfo();
  }

  // ====================
  // HISTORICAL ANALYSIS HANDLERS (TASK-017) - NOW ENABLED
  // ====================

  async handleGetHistoricalKlines(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleGetHistoricalKlines(args);
  }

  async handleAnalyzeHistoricalSR(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleAnalyzeHistoricalSR(args);
  }

  async handleIdentifyVolumeAnomalies(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleIdentifyVolumeAnomalies(args);
  }

  async handleGetPriceDistribution(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleGetPriceDistribution(args);
  }

  async handleIdentifyMarketCycles(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleIdentifyMarketCycles(args);
  }

  async handleGetHistoricalSummary(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleGetHistoricalSummary(args);
  }

  // ====================
  // HYBRID STORAGE HANDLERS (TASK-015) - OPTIONAL
  // ====================

  async handleGetHybridStorageConfig(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleGetHybridStorageConfig();
  }

  async handleUpdateHybridStorageConfig(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleUpdateHybridStorageConfig(args);
  }

  async handleGetStorageComparison(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleGetStorageComparison();
  }

  async handleTestStoragePerformance(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleTestStoragePerformance(args);
  }

  async handleGetMongoStatus(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleGetMongoStatus();
  }

  async handleGetEvaluationReport(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleGetEvaluationReport();
  }

  // ====================
  // HELPER METHODS
  // ====================

  private createSuccessResponse(data: any): MCPServerResponse {
    // Ensure clean JSON serialization without complex objects
    let cleanData: any;
    
    try {
      // Convert to JSON and back to ensure clean serialization
      const jsonString = JSON.stringify(data, (key, value) => {
        // Filter out potentially problematic values
        if (typeof value === 'function' || value === undefined) {
          return '[FILTERED]';
        }
        if (typeof value === 'object' && value !== null) {
          // Ensure objects are plain and serializable
          if (value.constructor !== Object && value.constructor !== Array) {
            return '[COMPLEX_OBJECT]';
          }
        }
        return value;
      });
      
      cleanData = JSON.parse(jsonString);
    } catch (error) {
      // Fallback to simple string representation
      cleanData = { result: 'Data serialization error', data: String(data) };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(cleanData, null, 2)
      }]
    };
  }

  private createErrorResponse(toolName: string, error: Error): MCPServerResponse {
    this.logger.error(`Tool ${toolName} failed:`, error);
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error.message}`
      }]
    };
  }
}
