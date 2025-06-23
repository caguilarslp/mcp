/**
 * @fileoverview Basic Analysis Handlers - Volatility, Volume, Volume Delta
 * @description Handles basic market analysis operations
 * @version 1.0.0
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class BasicAnalysisHandlers {
  constructor(
    private readonly engine: MarketAnalysisEngine,
    private readonly logger: FileLogger
  ) {}

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
}
