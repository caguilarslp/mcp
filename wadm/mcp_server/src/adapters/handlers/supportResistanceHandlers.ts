/**
 * @fileoverview Support Resistance Handlers - Level identification and analysis
 * @description Handles support and resistance level analysis
 * @version 1.0.0
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class SupportResistanceHandlers {
  constructor(
    private readonly engine: MarketAnalysisEngine,
    private readonly logger: FileLogger
  ) {}

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
