/**
 * @fileoverview Fair Value Gaps Detection Service for Smart Money Concepts
 * @description Implementación algorítmica de detección de Fair Value Gaps (FVG) institucionales
 * @version 1.0.0
 * @author Smart Money Concepts Team
 */

import { OHLCV, MarketTicker, MCPServerResponse, PerformanceMetrics, IMarketDataService, IAnalysisService } from '../../types/index.js';

// ====================
// FAIR VALUE GAP TYPES
// ====================

export interface FairValueGap {
  id: string;
  type: 'bullish' | 'bearish';
  formation: {
    beforeCandle: OHLCV;    // Vela antes del gap
    gapCandle: OHLCV;       // Vela que crea el gap
    afterCandle: OHLCV;     // Vela después del gap
    timestamp: Date;
    candleIndex: number;
  };
  gap: {
    upper: number;          // Límite superior del gap
    lower: number;          // Límite inferior del gap
    size: number;           // Tamaño absoluto del gap
    sizePercent: number;    // Tamaño como % del precio
    midpoint: number;       // Punto medio del gap
  };
  context: {
    trendDirection: 'up' | 'down' | 'sideways';
    impulsiveMove: boolean; // Si forma parte de movimiento impulsivo
    volumeProfile: number;  // Volumen durante formación (ratio vs avg)
    atr: number;           // ATR al momento de formación
    significance: 'high' | 'medium' | 'low';
  };
  status: 'open' | 'partially_filled' | 'filled' | 'expired';
  filling: {
    fillProgress: number;   // 0-100% llenado
    firstTouch?: Date;      // Primera vez que precio tocó el gap
    fullFillTime?: Date;    // Tiempo de llenado completo
    partialFills: Array<{
      timestamp: Date;
      price: number;
      fillPercentage: number;
    }>;
  };
  probability: {
    fill: number;           // Probabilidad de llenado (0-100)
    timeToFill: number;     // Tiempo estimado en horas
    confidence: number;     // Confianza en la estimación
    factors: {
      size: number;         // Factor tamaño
      trend: number;        // Factor tendencia
      volume: number;       // Factor volumen
      age: number;          // Factor edad
    };
  };
  targetZones: {
    conservative: number;   // 25% del gap
    normal: number;         // 50% del gap
    complete: number;       // 100% del gap
  };
  createdAt: Date;
  expirationTime?: Date;  // Cuándo expira si no se llena
}

export interface FVGAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  openGaps: FairValueGap[];
  filledGaps: FairValueGap[];
  nearestGap?: FairValueGap;
  statistics: {
    totalGapsDetected: number;
    openGaps: number;
    filledGaps: number;
    avgFillTime: number;     // Horas promedio de llenado
    fillRate: number;        // % de gaps que se llenan
    avgGapSize: number;      // Tamaño promedio en %
  };
  marketImbalance: {
    bullishGaps: number;
    bearishGaps: number;
    netImbalance: 'bullish' | 'bearish' | 'neutral';
    strength: number;        // Fuerza del desequilibrio
  };
  tradingOpportunities: Array<{
    gap: FairValueGap;
    action: 'target_gap' | 'fade_gap' | 'wait';
    confidence: number;
    reasoning: string;
    entryZone: { min: number; max: number };
    targets: number[];
    stopLoss?: number;
  }>;
  timestamp: Date;
}

export interface FVGConfig {
  minGapSize: number;          // Tamaño mínimo como % del precio (0.1%)
  maxGapSize: number;          // Tamaño máximo como % del precio (5%)
  minVolumeRatio: number;      // Ratio mínimo vs volumen promedio (1.2x)
  maxGapAge: number;           // Edad máxima en horas (168h = 1 semana)
  fillThreshold: number;       // % de penetración para considerar llenado (80%)
  significanceThresholds: {
    high: number;              // 2% del precio
    medium: number;            // 1% del precio
    low: number;               // 0.5% del precio
  };
  probabilityWeights: {
    size: number;              // 0.3
    trend: number;             // 0.25
    volume: number;            // 0.25
    age: number;               // 0.2
  };
}

export interface FVGStatistics {
  symbol: string;
  period: string;
  totalGaps: number;
  fillStatistics: {
    filled: number;
    partially: number;
    unfilled: number;
    fillRate: number;          // % de gaps completamente llenos
    avgTimeToFill: number;     // Horas promedio
    fastestFill: number;       // Tiempo más rápido
    slowestFill: number;       // Tiempo más lento
  };
  sizeDistribution: {
    small: number;             // < 0.5%
    medium: number;            // 0.5% - 1.5%
    large: number;             // > 1.5%
    avgSize: number;
  };
  contextAnalysis: {
    inTrend: number;           // Gaps formados en tendencia
    inConsolidation: number;   // Gaps en consolidación
    afterNews: number;         // Gaps después de noticias
    institutional: number;     // Gaps con señales institucionales
  };
  performance: {
    accuracy: number;          // Precisión de predicciones
    profitability: number;     // Rentabilidad de trading FVG
    sharpeRatio: number;       // Ratio Sharpe
    maxDrawdown: number;       // Máxima pérdida
  };
}

// ====================
// FAIR VALUE GAPS SERVICE
// ====================

export class FairValueGapsService {
  private marketDataService: IMarketDataService;
  private analysisService: IAnalysisService;
  private config: FVGConfig;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(
    marketDataService: IMarketDataService,
    analysisService: IAnalysisService
  ) {
    this.marketDataService = marketDataService;
    this.analysisService = analysisService;
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): FVGConfig {
    return {
      minGapSize: 0.1,           // 0.1% mínimo
      maxGapSize: 5.0,           // 5% máximo
      minVolumeRatio: 1.2,       // 1.2x volumen promedio
      maxGapAge: 168,            // 1 semana en horas
      fillThreshold: 0.8,        // 80% penetración
      significanceThresholds: {
        high: 2.0,               // 2%
        medium: 1.0,             // 1%
        low: 0.5                 // 0.5%
      },
      probabilityWeights: {
        size: 0.3,
        trend: 0.25,
        volume: 0.25,
        age: 0.2
      }
    };
  }

  /**
   * Detecta Fair Value Gaps en los datos de mercado
   */
  async findFairValueGaps(
    symbol: string,
    timeframe: string = '60',
    lookback: number = 100
  ): Promise<FVGAnalysis> {
    const startTime = Date.now();

    try {
      // Obtener datos de mercado
      const klines = await this.marketDataService.getKlines(symbol, timeframe, lookback + 10);
      const ticker = await this.marketDataService.getTicker(symbol);
      const volumeAnalysis = await this.analysisService.analyzeVolume(symbol, timeframe, lookback);

      if (klines.length < 10) {
        throw new Error(`Insufficient data for FVG analysis: ${klines.length} candles`);
      }

      // Calcular ATR y volumen promedio
      const atr = this.calculateATR(klines, 14);
      const avgVolume = volumeAnalysis.avgVolume;

      // Detectar Fair Value Gaps
      const detectedGaps = this.detectGaps(klines, avgVolume, atr);

      // Filtrar y validar gaps
      const validGaps = this.validateGaps(detectedGaps, ticker.lastPrice);

      // Analizar estado actual de los gaps
      const analyzedGaps = this.analyzeGapStatus(validGaps, klines, ticker.lastPrice);

      // Separar gaps abiertos y llenos
      const openGaps = analyzedGaps.filter(gap => gap.status === 'open' || gap.status === 'partially_filled');
      const filledGaps = analyzedGaps.filter(gap => gap.status === 'filled');

      // Encontrar gap más cercano
      const nearestGap = this.findNearestGap(openGaps, ticker.lastPrice);

      // Calcular estadísticas
      const statistics = this.calculateStatistics(analyzedGaps);

      // Analizar desequilibrio del mercado
      const marketImbalance = this.analyzeMarketImbalance(openGaps);

      // Generar oportunidades de trading
      const tradingOpportunities = this.generateTradingOpportunities(openGaps, ticker.lastPrice);

      // Registrar métricas de rendimiento
      this.recordPerformance('findFairValueGaps', Date.now() - startTime, true);

      return {
        symbol,
        timeframe,
        currentPrice: ticker.lastPrice,
        openGaps,
        filledGaps,
        nearestGap,
        statistics,
        marketImbalance,
        tradingOpportunities,
        timestamp: new Date()
      };

    } catch (error) {
      this.recordPerformance('findFairValueGaps', Date.now() - startTime, false, error);
      throw error;
    }
  }

  /**
   * Analiza estadísticas de llenado de Fair Value Gaps
   */
  async analyzeFVGFilling(
    symbol: string,
    timeframe: string = '60',
    lookbackDays: number = 30
  ): Promise<FVGStatistics> {
    const startTime = Date.now();

    try {
      // Obtener datos históricos más extensos
      const extendedLookback = Math.floor(lookbackDays * 24 / this.getTimeframeHours(timeframe));
      const klines = await this.marketDataService.getKlines(symbol, timeframe, extendedLookback);
      const volumeAnalysis = await this.analysisService.analyzeVolume(symbol, timeframe, extendedLookback);

      if (klines.length < 50) {
        throw new Error(`Insufficient historical data for FVG statistics: ${klines.length} candles`);
      }

      const atr = this.calculateATR(klines, 14);
      const avgVolume = volumeAnalysis.avgVolume;

      // Detectar y analizar todos los gaps históricos
      const allGaps = this.detectGaps(klines, avgVolume, atr);
      const completeAnalysis = this.analyzeGapStatus(allGaps, klines, klines[klines.length - 1].close);

      // Calcular estadísticas de llenado
      const fillStatistics = this.calculateFillStatistics(completeAnalysis);
      const sizeDistribution = this.calculateSizeDistribution(completeAnalysis);
      const contextAnalysis = this.analyzeGapContext(completeAnalysis);
      const performance = this.calculatePerformanceMetrics(completeAnalysis);

      this.recordPerformance('analyzeFVGFilling', Date.now() - startTime, true);

      return {
        symbol,
        period: `${lookbackDays}d`,
        totalGaps: completeAnalysis.length,
        fillStatistics,
        sizeDistribution,
        contextAnalysis,
        performance,
      };

    } catch (error) {
      this.recordPerformance('analyzeFVGFilling', Date.now() - startTime, false, error);
      throw error;
    }
  }

  /**
   * Obtiene gaps específicos con filtros
   */
  getFilteredGaps(
    gaps: FairValueGap[],
    filters: {
      type?: 'bullish' | 'bearish';
      status?: 'open' | 'filled';
      minSize?: number;
      maxDistance?: number;
      currentPrice: number;
    }
  ): FairValueGap[] {
    return gaps.filter(gap => {
      if (filters.type && gap.type !== filters.type) return false;
      if (filters.status && gap.status !== filters.status) return false;
      if (filters.minSize && gap.gap.sizePercent < filters.minSize) return false;
      
      if (filters.maxDistance) {
        const distance = Math.abs(filters.currentPrice - gap.gap.midpoint) / filters.currentPrice;
        if (distance > filters.maxDistance) return false;
      }

      return true;
    });
  }

  // ====================
  // MÉTODOS PRIVADOS DE DETECCIÓN
  // ====================

  private detectGaps(
    klines: OHLCV[],
    avgVolume: number,
    atr: number
  ): FairValueGap[] {
    const gaps: FairValueGap[] = [];

    // Necesitamos al menos 3 velas para detectar un FVG
    for (let i = 1; i < klines.length - 1; i++) {
      const beforeCandle = klines[i - 1];
      const gapCandle = klines[i];
      const afterCandle = klines[i + 1];

      // Verificar volumen significativo en la vela del gap
      const volumeRatio = gapCandle.volume / avgVolume;
      if (volumeRatio < this.config.minVolumeRatio) continue;

      // Detectar gap alcista (Bullish FVG)
      const bullishGap = this.detectBullishGap(beforeCandle, gapCandle, afterCandle);
      if (bullishGap) {
        const gap = this.createFVGObject(
          'bullish',
          { beforeCandle, gapCandle, afterCandle, candleIndex: i },
          bullishGap,
          volumeRatio,
          atr
        );
        gaps.push(gap);
      }

      // Detectar gap bajista (Bearish FVG)
      const bearishGap = this.detectBearishGap(beforeCandle, gapCandle, afterCandle);
      if (bearishGap) {
        const gap = this.createFVGObject(
          'bearish',
          { beforeCandle, gapCandle, afterCandle, candleIndex: i },
          bearishGap,
          volumeRatio,
          atr
        );
        gaps.push(gap);
      }
    }

    return gaps;
  }

  private detectBullishGap(
    before: OHLCV,
    gap: OHLCV,
    after: OHLCV
  ): { upper: number; lower: number } | null {
    // Para FVG alcista: el low de la vela después debe estar por encima del high de la vela antes
    // La vela del medio debe tener una extensión significativa hacia arriba
    
    if (after.low > before.high && gap.close > gap.open) {
      // Verificar que la vela del gap sea alcista y significativa
      const gapSize = after.low - before.high;
      const gapSizePercent = (gapSize / gap.close) * 100;
      
      if (gapSizePercent >= this.config.minGapSize && gapSizePercent <= this.config.maxGapSize) {
        return {
          upper: after.low,
          lower: before.high
        };
      }
    }

    return null;
  }

  private detectBearishGap(
    before: OHLCV,
    gap: OHLCV,
    after: OHLCV
  ): { upper: number; lower: number } | null {
    // Para FVG bajista: el high de la vela después debe estar por debajo del low de la vela antes
    // La vela del medio debe tener una extensión significativa hacia abajo
    
    if (after.high < before.low && gap.close < gap.open) {
      // Verificar que la vela del gap sea bajista y significativa
      const gapSize = before.low - after.high;
      const gapSizePercent = (gapSize / gap.close) * 100;
      
      if (gapSizePercent >= this.config.minGapSize && gapSizePercent <= this.config.maxGapSize) {
        return {
          upper: before.low,
          lower: after.high
        };
      }
    }

    return null;
  }

  private createFVGObject(
    type: 'bullish' | 'bearish',
    formation: {
      beforeCandle: OHLCV;
      gapCandle: OHLCV;
      afterCandle: OHLCV;
      candleIndex: number;
    },
    gapZone: { upper: number; lower: number },
    volumeRatio: number,
    atr: number
  ): FairValueGap {
    const size = Math.abs(gapZone.upper - gapZone.lower);
    const sizePercent = (size / formation.gapCandle.close) * 100;
    const midpoint = (gapZone.upper + gapZone.lower) / 2;

    // Determinar significancia basada en tamaño
    let significance: 'high' | 'medium' | 'low';
    if (sizePercent >= this.config.significanceThresholds.high) {
      significance = 'high';
    } else if (sizePercent >= this.config.significanceThresholds.medium) {
      significance = 'medium';
    } else {
      significance = 'low';
    }

    // Analizar contexto de tendencia
    const trendDirection = this.analyzeTrendDirection(formation);
    const impulsiveMove = this.isImpulsiveMove(formation, atr);

    // Calcular probabilidad inicial
    const probability = this.calculateFillProbability({
      size: sizePercent,
      volumeRatio,
      significance,
      trend: trendDirection,
      age: 0
    });

    const id = this.generateFVGId(formation.gapCandle, type, formation.candleIndex);

    return {
      id,
      type,
      formation: {
        beforeCandle: formation.beforeCandle,
        gapCandle: formation.gapCandle,
        afterCandle: formation.afterCandle,
        timestamp: new Date(formation.gapCandle.timestamp),
        candleIndex: formation.candleIndex
      },
      gap: {
        upper: gapZone.upper,
        lower: gapZone.lower,
        size,
        sizePercent,
        midpoint
      },
      context: {
        trendDirection,
        impulsiveMove,
        volumeProfile: volumeRatio,
        atr,
        significance
      },
      status: 'open',
      filling: {
        fillProgress: 0,
        partialFills: []
      },
      probability,
      targetZones: {
        conservative: midpoint + (type === 'bullish' ? -size * 0.25 : size * 0.25),
        normal: midpoint,
        complete: type === 'bullish' ? gapZone.lower : gapZone.upper
      },
      createdAt: new Date(formation.gapCandle.timestamp),
      expirationTime: new Date(
        new Date(formation.gapCandle.timestamp).getTime() + 
        this.config.maxGapAge * 60 * 60 * 1000
      )
    };
  }

  private validateGaps(gaps: FairValueGap[], currentPrice: number): FairValueGap[] {
    return gaps.filter(gap => {
      // Verificar que el gap no esté expirado
      if (gap.expirationTime && new Date() > gap.expirationTime) {
        return false;
      }

      // Verificar que el tamaño esté dentro de los límites
      if (gap.gap.sizePercent < this.config.minGapSize || gap.gap.sizePercent > this.config.maxGapSize) {
        return false;
      }

      return true;
    });
  }

  private analyzeGapStatus(
    gaps: FairValueGap[],
    klines: OHLCV[],
    currentPrice: number
  ): FairValueGap[] {
    return gaps.map(gap => {
      const updatedGap = { ...gap };

      // Buscar llenado del gap en velas posteriores
      for (let i = gap.formation.candleIndex + 1; i < klines.length; i++) {
        const candle = klines[i];
        
        // Verificar si el precio ha entrado en la zona del gap
        const inGapZone = this.isPriceInGapZone(candle, gap);
        
        if (inGapZone) {
          // Calcular progreso de llenado
          const fillProgress = this.calculateFillProgress(candle, gap);
          
          if (fillProgress > updatedGap.filling.fillProgress) {
            updatedGap.filling.fillProgress = fillProgress;
            
            // Registrar primer toque si no existe
            if (!updatedGap.filling.firstTouch) {
              updatedGap.filling.firstTouch = new Date(candle.timestamp);
            }

            // Agregar llenado parcial
            updatedGap.filling.partialFills.push({
              timestamp: new Date(candle.timestamp),
              price: gap.type === 'bullish' ? candle.low : candle.high,
              fillPercentage: fillProgress
            });

            // Verificar llenado completo
            if (fillProgress >= this.config.fillThreshold * 100) {
              updatedGap.status = 'filled';
              updatedGap.filling.fullFillTime = new Date(candle.timestamp);
              break;
            } else if (fillProgress > 25) {
              updatedGap.status = 'partially_filled';
            }
          }
        }
      }

      // Actualizar probabilidad basada en edad y llenado actual
      const ageInHours = (Date.now() - updatedGap.createdAt.getTime()) / (1000 * 60 * 60);
      updatedGap.probability = this.calculateFillProbability({
        size: updatedGap.gap.sizePercent,
        volumeRatio: updatedGap.context.volumeProfile,
        significance: updatedGap.context.significance,
        trend: updatedGap.context.trendDirection,
        age: ageInHours,
        fillProgress: updatedGap.filling.fillProgress
      });

      return updatedGap;
    });
  }

  private isPriceInGapZone(candle: OHLCV, gap: FairValueGap): boolean {
    if (gap.type === 'bullish') {
      // Para gap alcista, verificar si el precio bajó hasta la zona del gap
      return candle.low <= gap.gap.upper && candle.low >= gap.gap.lower;
    } else {
      // Para gap bajista, verificar si el precio subió hasta la zona del gap
      return candle.high >= gap.gap.lower && candle.high <= gap.gap.upper;
    }
  }

  private calculateFillProgress(candle: OHLCV, gap: FairValueGap): number {
    const gapSize = gap.gap.upper - gap.gap.lower;
    
    if (gap.type === 'bullish') {
      // Para gap alcista, medir cuánto ha penetrado hacia abajo
      if (candle.low <= gap.gap.lower) return 100; // Llenado completo
      if (candle.low >= gap.gap.upper) return 0;   // Sin llenado
      
      const penetration = gap.gap.upper - candle.low;
      return (penetration / gapSize) * 100;
    } else {
      // Para gap bajista, medir cuánto ha penetrado hacia arriba
      if (candle.high >= gap.gap.upper) return 100; // Llenado completo
      if (candle.high <= gap.gap.lower) return 0;   // Sin llenado
      
      const penetration = candle.high - gap.gap.lower;
      return (penetration / gapSize) * 100;
    }
  }

  private calculateFillProbability(factors: {
    size: number;
    volumeRatio: number;
    significance: 'high' | 'medium' | 'low';
    trend: 'up' | 'down' | 'sideways';
    age: number;
    fillProgress?: number;
  }): {
    fill: number;
    timeToFill: number;
    confidence: number;
    factors: { size: number; trend: number; volume: number; age: number };
  } {
    const weights = this.config.probabilityWeights;

    // Factor tamaño (gaps más pequeños se llenan más frecuentemente)
    let sizeScore = 100 - Math.min(factors.size * 10, 90); // Más pequeño = mayor probabilidad

    // Factor tendencia
    let trendScore = 50; // Neutral por defecto
    if (factors.trend === 'up' || factors.trend === 'down') {
      trendScore = 70; // Tendencias claras favorecen el llenado
    }

    // Factor volumen (mayor volumen = mayor probabilidad)
    let volumeScore = Math.min(factors.volumeRatio * 40, 100);

    // Factor edad (gaps más viejos tienen menor probabilidad)
    let ageScore = Math.max(100 - (factors.age / this.config.maxGapAge) * 100, 10);

    // Ajustar por progreso de llenado si existe
    if (factors.fillProgress && factors.fillProgress > 0) {
      const progressBonus = factors.fillProgress * 0.5; // Boost por progreso parcial
      sizeScore = Math.min(sizeScore + progressBonus, 100);
      trendScore = Math.min(trendScore + progressBonus, 100);
    }

    // Calcular probabilidad total
    const totalProbability = 
      sizeScore * weights.size +
      trendScore * weights.trend +
      volumeScore * weights.volume +
      ageScore * weights.age;

    // Calcular tiempo estimado (basado en tamaño y significancia)
    let timeToFill = 12; // 12 horas por defecto
    if (factors.significance === 'high') timeToFill = 24;
    if (factors.significance === 'low') timeToFill = 6;
    
    // Ajustar por probabilidad
    timeToFill = timeToFill * (1 - totalProbability / 200);

    // Calcular confianza
    const confidence = Math.min(
      (factors.volumeRatio + (factors.size > 1 ? 2 : 1)) * 25,
      95
    );

    return {
      fill: Math.round(Math.max(10, Math.min(95, totalProbability))),
      timeToFill: Math.round(Math.max(1, timeToFill)),
      confidence: Math.round(confidence),
      factors: {
        size: Math.round(sizeScore),
        trend: Math.round(trendScore),
        volume: Math.round(volumeScore),
        age: Math.round(ageScore)
      }
    };
  }

  private findNearestGap(gaps: FairValueGap[], currentPrice: number): FairValueGap | undefined {
    if (gaps.length === 0) return undefined;

    return gaps.reduce((nearest, current) => {
      const currentDistance = Math.abs(currentPrice - current.gap.midpoint);
      const nearestDistance = Math.abs(currentPrice - nearest.gap.midpoint);
      
      return currentDistance < nearestDistance ? current : nearest;
    });
  }

  private calculateStatistics(gaps: FairValueGap[]): {
    totalGapsDetected: number;
    openGaps: number;
    filledGaps: number;
    avgFillTime: number;
    fillRate: number;
    avgGapSize: number;
  } {
    const filledGaps = gaps.filter(g => g.status === 'filled');
    const fillTimes = filledGaps
      .filter(g => g.filling.firstTouch && g.filling.fullFillTime)
      .map(g => {
        const start = g.filling.firstTouch!.getTime();
        const end = g.filling.fullFillTime!.getTime();
        return (end - start) / (1000 * 60 * 60); // horas
      });

    return {
      totalGapsDetected: gaps.length,
      openGaps: gaps.filter(g => g.status === 'open' || g.status === 'partially_filled').length,
      filledGaps: filledGaps.length,
      avgFillTime: fillTimes.length > 0 ? fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length : 0,
      fillRate: gaps.length > 0 ? (filledGaps.length / gaps.length) * 100 : 0,
      avgGapSize: gaps.length > 0 ? gaps.reduce((sum, g) => sum + g.gap.sizePercent, 0) / gaps.length : 0
    };
  }

  private analyzeMarketImbalance(openGaps: FairValueGap[]): {
    bullishGaps: number;
    bearishGaps: number;
    netImbalance: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  } {
    const bullishGaps = openGaps.filter(g => g.type === 'bullish').length;
    const bearishGaps = openGaps.filter(g => g.type === 'bearish').length;
    
    const total = bullishGaps + bearishGaps;
    let netImbalance: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (total > 0) {
      const diff = Math.abs(bullishGaps - bearishGaps);
      strength = (diff / total) * 100;
      
      if (strength > 20) { // Umbral para considerar desequilibrio significativo
        netImbalance = bullishGaps > bearishGaps ? 'bullish' : 'bearish';
      }
    }

    return { bullishGaps, bearishGaps, netImbalance, strength };
  }

  private generateTradingOpportunities(
    openGaps: FairValueGap[],
    currentPrice: number
  ): Array<{
    gap: FairValueGap;
    action: 'target_gap' | 'fade_gap' | 'wait';
    confidence: number;
    reasoning: string;
    entryZone: { min: number; max: number };
    targets: number[];
    stopLoss?: number;
  }> {
    return openGaps
      .filter(gap => {
        // Solo gaps cercanos al precio actual (dentro de 5%)
        const distance = Math.abs(currentPrice - gap.gap.midpoint) / currentPrice;
        return distance < 0.05;
      })
      .map(gap => {
        const distance = Math.abs(currentPrice - gap.gap.midpoint) / currentPrice;
        const isAboveGap = currentPrice > gap.gap.upper;
        const isBelowGap = currentPrice < gap.gap.lower;
        
        let action: 'target_gap' | 'fade_gap' | 'wait' = 'wait';
        let confidence = gap.probability.confidence;
        let reasoning = '';
        let entryZone = { min: currentPrice * 0.99, max: currentPrice * 1.01 };
        let targets: number[] = [];
        let stopLoss: number | undefined;

        // Lógica para gap alcista
        if (gap.type === 'bullish') {
          if (isAboveGap && gap.probability.fill > 70) {
            action = 'target_gap';
            reasoning = `Price above bullish FVG with high fill probability (${gap.probability.fill}%)`;
            targets = [gap.targetZones.conservative, gap.targetZones.normal, gap.targetZones.complete];
            stopLoss = gap.gap.upper * 1.02; // 2% arriba del gap
          } else if (isBelowGap && gap.context.significance === 'high') {
            action = 'fade_gap';
            reasoning = `Price below significant bullish FVG, expect bounce`;
            targets = [gap.gap.midpoint, gap.gap.upper];
            stopLoss = gap.gap.lower * 0.98; // 2% abajo del gap
          }
        }
        
        // Lógica para gap bajista
        else {
          if (isBelowGap && gap.probability.fill > 70) {
            action = 'target_gap';
            reasoning = `Price below bearish FVG with high fill probability (${gap.probability.fill}%)`;
            targets = [gap.targetZones.conservative, gap.targetZones.normal, gap.targetZones.complete];
            stopLoss = gap.gap.lower * 0.98; // 2% abajo del gap
          } else if (isAboveGap && gap.context.significance === 'high') {
            action = 'fade_gap';
            reasoning = `Price above significant bearish FVG, expect rejection`;
            targets = [gap.gap.midpoint, gap.gap.lower];
            stopLoss = gap.gap.upper * 1.02; // 2% arriba del gap
          }
        }

        // Ajustar confianza basada en proximidad
        confidence = Math.round(confidence * (1 - distance * 5)); // Penalizar por distancia

        return {
          gap,
          action,
          confidence: Math.max(confidence, 20),
          reasoning,
          entryZone,
          targets,
          stopLoss
        };
      })
      .filter(opp => opp.action !== 'wait') // Solo oportunidades accionables
      .sort((a, b) => b.confidence - a.confidence); // Ordenar por confianza
  }

  // ====================
  // MÉTODOS UTILITARIOS
  // ====================

  private calculateATR(klines: OHLCV[], period: number = 14): number {
    if (klines.length < period + 1) return 1;
    
    let trSum = 0;
    
    for (let i = 1; i <= period; i++) {
      const current = klines[i];
      const previous = klines[i - 1];
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      trSum += tr;
    }
    
    return trSum / period;
  }

  private analyzeTrendDirection(formation: {
    beforeCandle: OHLCV;
    gapCandle: OHLCV;
    afterCandle: OHLCV;
  }): 'up' | 'down' | 'sideways' {
    const { beforeCandle, afterCandle } = formation;
    
    const priceChange = (afterCandle.close - beforeCandle.close) / beforeCandle.close;
    
    if (priceChange > 0.01) return 'up';      // 1% o más = tendencia alcista
    if (priceChange < -0.01) return 'down';   // -1% o más = tendencia bajista
    return 'sideways';
  }

  private isImpulsiveMove(formation: {
    beforeCandle: OHLCV;
    gapCandle: OHLCV;
    afterCandle: OHLCV;
  }, atr: number): boolean {
    const { gapCandle } = formation;
    const candleRange = gapCandle.high - gapCandle.low;
    
    // Considerar impulsivo si el rango es > 1.5x ATR
    return candleRange > atr * 1.5;
  }

  private getTimeframeHours(timeframe: string): number {
    const tf = parseInt(timeframe);
    if (tf < 60) return tf / 60;     // Minutos a horas
    if (tf === 60) return 1;         // 1 hora
    if (tf >= 60) return tf / 60;    // Horas
    return 1; // Fallback
  }

  private generateFVGId(candle: OHLCV, type: string, index: number): string {
    const timestamp = new Date(candle.timestamp).getTime();
    const price = Math.round(candle.close * 10000);
    return `fvg_${type}_${timestamp}_${price}_${index}`;
  }

  private calculateFillStatistics(gaps: FairValueGap[]): {
    filled: number;
    partially: number;
    unfilled: number;
    fillRate: number;
    avgTimeToFill: number;
    fastestFill: number;
    slowestFill: number;
  } {
    const filled = gaps.filter(g => g.status === 'filled').length;
    const partially = gaps.filter(g => g.status === 'partially_filled').length;
    const unfilled = gaps.filter(g => g.status === 'open').length;
    
    const fillTimes = gaps
      .filter(g => g.status === 'filled' && g.filling.firstTouch && g.filling.fullFillTime)
      .map(g => {
        const start = g.filling.firstTouch!.getTime();
        const end = g.filling.fullFillTime!.getTime();
        return (end - start) / (1000 * 60 * 60); // horas
      });

    return {
      filled,
      partially,
      unfilled,
      fillRate: gaps.length > 0 ? (filled / gaps.length) * 100 : 0,
      avgTimeToFill: fillTimes.length > 0 ? fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length : 0,
      fastestFill: fillTimes.length > 0 ? Math.min(...fillTimes) : 0,
      slowestFill: fillTimes.length > 0 ? Math.max(...fillTimes) : 0
    };
  }

  private calculateSizeDistribution(gaps: FairValueGap[]): {
    small: number;
    medium: number;
    large: number;
    avgSize: number;
  } {
    const sizes = gaps.map(g => g.gap.sizePercent);
    
    return {
      small: sizes.filter(s => s < 0.5).length,
      medium: sizes.filter(s => s >= 0.5 && s <= 1.5).length,
      large: sizes.filter(s => s > 1.5).length,
      avgSize: sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0
    };
  }

  private analyzeGapContext(gaps: FairValueGap[]): {
    inTrend: number;
    inConsolidation: number;
    afterNews: number;
    institutional: number;
  } {
    return {
      inTrend: gaps.filter(g => g.context.trendDirection !== 'sideways').length,
      inConsolidation: gaps.filter(g => g.context.trendDirection === 'sideways').length,
      afterNews: gaps.filter(g => g.context.volumeProfile > 2.0).length, // Alto volumen como proxy
      institutional: gaps.filter(g => g.context.impulsiveMove && g.context.volumeProfile > 1.5).length
    };
  }

  private calculatePerformanceMetrics(gaps: FairValueGap[]): {
    accuracy: number;
    profitability: number;
    sharpeRatio: number;
    maxDrawdown: number;
  } {
    // Métricas simplificadas para esta implementación
    const filledGaps = gaps.filter(g => g.status === 'filled');
    const accuracy = gaps.length > 0 ? (filledGaps.length / gaps.length) * 100 : 0;
    
    return {
      accuracy,
      profitability: 65, // Placeholder basado en estudios de FVG
      sharpeRatio: 1.2,  // Placeholder
      maxDrawdown: 15    // Placeholder
    };
  }

  private recordPerformance(
    functionName: string,
    executionTime: number,
    success: boolean,
    error?: any
  ): void {
    this.performanceMetrics.push({
      functionName,
      executionTime,
      memoryUsage: process.memoryUsage().heapUsed,
      timestamp: new Date().toISOString(),
      success,
      errorType: error ? error.constructor.name : undefined
    });

    // Mantener solo las últimas 100 métricas
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  // Configuración
  updateConfig(newConfig: Partial<FVGConfig>): FVGConfig {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }

  getConfig(): FVGConfig {
    return { ...this.config };
  }
}
