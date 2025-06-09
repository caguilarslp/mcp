/**
 * @fileoverview MCP Adapter - Model Context Protocol Integration
 * @description Adapter layer between MCP Server and Core Engine
 * @version 1.3.4
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { MarketAnalysisEngine } from '../core/engine.js';
import { MCPServerResponse, MarketCategoryType } from '../types/index.js';
import { FileLogger } from '../utils/fileLogger.js';
import * as path from 'path';
import { JsonParseAttempt } from '../utils/requestLogger.js';

export class MCPAdapter {
  private server: Server;
  private engine: MarketAnalysisEngine;
  private logger: FileLogger;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('MCPAdapter', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    
    this.server = new Server(
      {
        name: 'waickoff_mcp',
        version: '1.3.4',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info('MCP Adapter initialized');
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_ticker',
            description: 'Get current price and 24h statistics for a trading pair',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair (e.g., BTCUSDT, XRPUSDT)',
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_orderbook',
            description: 'Get order book depth for market analysis',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
                limit: {
                  type: 'number',
                  description: 'Number of orderbook levels',
                  default: 25,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_market_data',
            description: 'Get comprehensive market data (ticker + orderbook + recent klines)',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'analyze_volatility',
            description: 'Analyze price volatility for grid trading timing',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                period: {
                  type: 'string',
                  description: 'Analysis period',
                  enum: ['1h', '4h', '1d', '7d'],
                  default: '1d',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'analyze_volume',
            description: 'Analyze volume patterns with VWAP and anomaly detection',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                interval: {
                  type: 'string',
                  description: 'Time interval',
                  enum: ['1', '5', '15', '30', '60', '240', 'D'],
                  default: '60',
                },
                periods: {
                  type: 'number',
                  description: 'Number of periods to analyze',
                  default: 24,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'analyze_volume_delta',
            description: 'Calculate Volume Delta (buying vs selling pressure)',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                interval: {
                  type: 'string',
                  description: 'Time interval',
                  enum: ['1', '5', '15', '30', '60'],
                  default: '5',
                },
                periods: {
                  type: 'number',
                  description: 'Number of periods',
                  default: 60,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'identify_support_resistance',
            description: 'Identify dynamic support and resistance levels with strength scoring',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                interval: {
                  type: 'string',
                  description: 'Time interval for analysis',
                  enum: ['15', '30', '60', '240', 'D'],
                  default: '60',
                },
                periods: {
                  type: 'number',
                  description: 'Number of periods to analyze',
                  default: 100,
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
                sensitivity: {
                  type: 'number',
                  description: 'Pivot detection sensitivity (1-5, where 1 is more sensitive)',
                  default: 2,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'suggest_grid_levels',
            description: 'Generate intelligent grid trading suggestions',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                investment: {
                  type: 'number',
                  description: 'Amount to invest in USD',
                },
                gridCount: {
                  type: 'number',
                  description: 'Number of grid levels',
                  default: 10,
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
                riskTolerance: {
                  type: 'string',
                  description: 'Risk tolerance level',
                  enum: ['low', 'medium', 'high'],
                  default: 'medium',
                },
                optimize: {
                  type: 'boolean',
                  description: 'Use advanced optimization',
                  default: false,
                },
              },
              required: ['symbol', 'investment'],
            },
          },
          {
            name: 'perform_technical_analysis',
            description: 'Comprehensive technical analysis including all indicators',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                includeVolatility: {
                  type: 'boolean',
                  description: 'Include volatility analysis',
                  default: true,
                },
                includeVolume: {
                  type: 'boolean',
                  description: 'Include volume analysis',
                  default: true,
                },
                includeVolumeDelta: {
                  type: 'boolean',
                  description: 'Include volume delta analysis',
                  default: true,
                },
                includeSupportResistance: {
                  type: 'boolean',
                  description: 'Include support/resistance analysis',
                  default: true,
                },
                timeframe: {
                  type: 'string',
                  description: 'Analysis timeframe',
                  default: '60',
                },
                periods: {
                  type: 'number',
                  description: 'Number of periods to analyze',
                  default: 100,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_complete_analysis',
            description: 'Complete market analysis with summary and recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                investment: {
                  type: 'number',
                  description: 'Optional investment amount for grid suggestions',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_system_health',
            description: 'Get system health status and performance metrics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_api_stats',
            description: 'Get API connection statistics and error logs',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_debug_logs',
            description: 'Get debug logs for troubleshooting JSON errors and request issues',
            inputSchema: {
              type: 'object',
              properties: {
                logType: {
                  type: 'string',
                  description: 'Type of logs to retrieve',
                  enum: ['all', 'errors', 'json_errors', 'requests'],
                  default: 'all',
                },
                limit: {
                  type: 'number',
                  description: 'Number of log entries to return',
                  default: 50,
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      this.logger.info(`Executing tool: ${name}`);
      
      try {
        let result: MCPServerResponse;
        
        switch (name) {
          case 'get_ticker':
            result = await this.handleGetTicker(args);
            break;
          case 'get_orderbook':
            result = await this.handleGetOrderbook(args);
            break;
          case 'get_market_data':
            result = await this.handleGetMarketData(args);
            break;
          case 'analyze_volatility':
            result = await this.handleAnalyzeVolatility(args);
            break;
          case 'analyze_volume':
            result = await this.handleAnalyzeVolume(args);
            break;
          case 'analyze_volume_delta':
            result = await this.handleAnalyzeVolumeDelta(args);
            break;
          case 'identify_support_resistance':
            result = await this.handleIdentifySupportResistance(args);
            break;
          case 'suggest_grid_levels':
            result = await this.handleSuggestGridLevels(args);
            break;
          case 'perform_technical_analysis':
            result = await this.handlePerformTechnicalAnalysis(args);
            break;
          case 'get_complete_analysis':
            result = await this.handleGetCompleteAnalysis(args);
            break;
          case 'get_system_health':
            result = await this.handleGetSystemHealth(args);
            break;
          case 'get_debug_logs':
            result = await this.handleGetDebugLogs(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return result;
      } catch (error) {
        this.logger.error(`Tool execution failed for ${name}:`, error);
        return this.createErrorResponse(name, error as Error);
      }
    });
  }

  // ====================
  // TOOL HANDLERS
  // ====================

  private async handleGetTicker(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const category = (args?.category as MarketCategoryType) || 'spot';

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getMarketData(symbol, category);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch ticker data');
    }

    const ticker = response.data!.ticker;
    
      // Create simple response without complex logging objects
      const formattedTicker = {
        symbol: ticker.symbol,
        precio_actual: `${ticker.lastPrice.toFixed(4)}`,
        cambio_24h: `${ticker.price24hPcnt.toFixed(2)}%`,
        maximo_24h: `${ticker.highPrice24h.toFixed(4)}`,
        minimo_24h: `${ticker.lowPrice24h.toFixed(4)}`,
        volumen_24h: ticker.volume24h.toString(),
        bid: `${ticker.bid1Price.toFixed(4)}`,
        ask: `${ticker.ask1Price.toFixed(4)}`,
        spread: `${(ticker.ask1Price - ticker.bid1Price).toFixed(4)}`,
        timestamp: ticker.timestamp
      };

    return this.createSuccessResponse(formattedTicker);
  }

  private async handleGetOrderbook(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const category = (args?.category as MarketCategoryType) || 'spot';
    const limit = (args?.limit as number) || 25;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getMarketData(symbol, category);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch orderbook data');
    }

    const orderbook = response.data!.orderbook;
    
    const formattedOrderbook = {
      symbol: orderbook.symbol,
      bids: orderbook.bids.slice(0, Math.min(limit, 10)).map(bid => ({
        precio: `$${bid.price.toFixed(4)}`,
        cantidad: bid.size.toString()
      })),
      asks: orderbook.asks.slice(0, Math.min(limit, 10)).map(ask => ({
        precio: `$${ask.price.toFixed(4)}`,
        cantidad: ask.size.toString()
      })),
      spread: `$${orderbook.spread.toFixed(4)}`,
      profundidad_bid: orderbook.bids.length,
      profundidad_ask: orderbook.asks.length,
      timestamp: orderbook.timestamp
    };

    return this.createSuccessResponse(formattedOrderbook);
  }

  private async handleGetMarketData(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const category = (args?.category as MarketCategoryType) || 'spot';

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getMarketData(symbol, category);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch market data');
    }

    const { ticker, orderbook, recentKlines } = response.data!;
    
    const formattedData = {
      ticker: {
        symbol: ticker.symbol,
        precio_actual: `$${ticker.lastPrice.toFixed(4)}`,
        cambio_24h: `${ticker.price24hPcnt.toFixed(2)}%`,
        volumen_24h: ticker.volume24h.toString(),
        timestamp: ticker.timestamp
      },
      orderbook: {
        spread: `$${orderbook.spread.toFixed(4)}`,
        bid_top: `$${orderbook.bids[0]?.price.toFixed(4)}`,
        ask_top: `$${orderbook.asks[0]?.price.toFixed(4)}`,
        liquidity_score: this.calculateLiquidityScore(orderbook)
      },
      price_action: {
        velas_recientes: recentKlines.slice(-5).length,
        rango_24h: {
          maximo: Math.max(...recentKlines.slice(-24).map(k => k.high)),
          minimo: Math.min(...recentKlines.slice(-24).map(k => k.low))
        },
        tendencia: this.calculatePriceTrend(recentKlines.slice(-10))
      }
    };

    return this.createSuccessResponse(formattedData);
  }

  private async handleAnalyzeVolatility(args: any): Promise<MCPServerResponse> {
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

  private async handleAnalyzeVolume(args: any): Promise<MCPServerResponse> {
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

  private async handleAnalyzeVolumeDelta(args: any): Promise<MCPServerResponse> {
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

  private async handleIdentifySupportResistance(args: any): Promise<MCPServerResponse> {
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
    this.logger.info(`MCP Adapter S/R Debug: CurrentPrice=${srAnalysis.currentPrice.toFixed(4)}`);
    this.logger.info(`MCP Adapter Resistances count: ${srAnalysis.resistances.length}`);
    this.logger.info(`MCP Adapter Supports count: ${srAnalysis.supports.length}`);
    
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

  private async handleSuggestGridLevels(args: any): Promise<MCPServerResponse> {
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

  private async handlePerformTechnicalAnalysis(args: any): Promise<MCPServerResponse> {
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

  private async handleGetCompleteAnalysis(args: any): Promise<MCPServerResponse> {
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

  private async handleGetSystemHealth(args: any): Promise<MCPServerResponse> {
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

  private async handleGetDebugLogs(args: any): Promise<MCPServerResponse> {
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

  private calculateLiquidityScore(orderbook: any): string {
    // Simple liquidity score based on spread and depth
    const spreadPercent = (orderbook.spread / ((orderbook.bids[0]?.price + orderbook.asks[0]?.price) / 2)) * 100;
    const depth = Math.min(orderbook.bids.length, orderbook.asks.length);
    
    let score: string;
    if (spreadPercent < 0.05 && depth > 20) {
      score = 'High';
    } else if (spreadPercent < 0.1 && depth > 10) {
      score = 'Medium';
    } else {
      score = 'Low';
    }
    
    return score;
  }

  private calculatePriceTrend(klines: any[]): string {
    if (klines.length < 2) return 'Unknown';
    
    const firstPrice = klines[0].close;
    const lastPrice = klines[klines.length - 1].close;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (change > 2) return 'Strong Uptrend';
    if (change > 0.5) return 'Uptrend';
    if (change < -2) return 'Strong Downtrend';
    if (change < -0.5) return 'Downtrend';
    return 'Sideways';
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('MCP Adapter running and ready for connections');
  }
}