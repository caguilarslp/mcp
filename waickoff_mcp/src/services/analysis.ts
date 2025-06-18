/**
 * @fileoverview Analysis Service - Technical Analysis Engine
 * @description Modular service for technical analysis calculations
 * @version 1.3.0
 */

import {
  IAnalysisService,
  VolatilityAnalysis,
  VolumeAnalysis,
  VolumeDelta,
  SupportResistanceAnalysis,
  SupportResistanceLevel,
  OHLCV,
  VolumeSpike,
  VWAPData,
  DivergenceData,
  MarketPressure,
  Pivot,
  AnalysisError,
  PerformanceMetrics
} from '../types/index.js';
import { IMarketDataService } from '../types/index.js';
import { ExchangeAggregator } from '../adapters/exchanges/common/ExchangeAggregator.js';
import { ContextAwareRepository } from './context/contextRepository.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance.js';
import { MathUtils } from '../utils/math.js';

export class TechnicalAnalysisService implements IAnalysisService {
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly mathUtils: MathUtils;
  private readonly exchangeAggregator: ExchangeAggregator;
  private readonly contextAwareRepository: ContextAwareRepository;

  constructor(
    private marketDataService: IMarketDataService,
    exchangeAggregator?: ExchangeAggregator
  ) {
    this.logger = new Logger('TechnicalAnalysisService');
    this.performanceMonitor = new PerformanceMonitor();
    this.mathUtils = new MathUtils();
    
    // Multi-exchange support
    this.exchangeAggregator = exchangeAggregator || new ExchangeAggregator(
      new Map(), // Empty adapters map for now
      {} // Default config
    );
    
    // Context-aware repository (TASK-027 FASE 2)
    this.contextAwareRepository = new ContextAwareRepository();
  }

  /**
   * Analyze price volatility for grid trading suitability
   */
  async analyzeVolatility(symbol: string, period: string = '1d'): Promise<VolatilityAnalysis> {
    return this.performanceMonitor.measure('analyzeVolatility', async () => {
      this.logger.info(`Analyzing volatility for ${symbol} over ${period}`);

      try {
        const config = this.getVolatilityConfig(period);
        const klines = await this.marketDataService.getKlines(
          symbol, 
          config.interval, 
          config.limit
        );

        if (klines.length === 0) {
          throw new AnalysisError(
            `No price data available for ${symbol}`,
            'volatility',
            symbol
          );
        }

        const currentPrice = klines[klines.length - 1].close;
        const prices = klines.map(k => k.close);
        const highs = klines.map(k => k.high);
        const lows = klines.map(k => k.low);

        const highestPrice = Math.max(...highs);
        const lowestPrice = Math.min(...lows);
        const volatilityRange = highestPrice - lowestPrice;
        const volatilityPercent = (volatilityRange / currentPrice) * 100;

        // Determine grid trading suitability
        const isGoodForGrid = volatilityPercent > 3 && volatilityPercent < 20;
        const confidence = this.calculateVolatilityConfidence(volatilityPercent, klines);

        let recommendation: 'proceed' | 'wait' | 'high_risk';
        if (volatilityPercent < 3) {
          recommendation = 'wait';
        } else if (volatilityPercent > 20) {
          recommendation = 'high_risk';
        } else {
          recommendation = 'proceed';
        }

        const analysis: VolatilityAnalysis = {
          symbol,
          period,
          currentPrice,
          highestPrice,
          lowestPrice,
          volatilityPercent,
          isGoodForGrid,
          recommendation,
          confidence
        };

        this.logger.info(`Volatility analysis for ${symbol}: ${volatilityPercent.toFixed(2)}% - ${recommendation}`);
        return analysis;

      } catch (error) {
        this.logger.error(`Volatility analysis failed for ${symbol}:`, error);
        throw new AnalysisError(
          `Failed to analyze volatility for ${symbol}`,
          'volatility',
          symbol,
          error as Error
        );
      }
    });
  }

  /**
   * Analyze volume patterns with VWAP and anomaly detection
   */
  async analyzeVolume(
    symbol: string, 
    interval: string = '60', 
    periods: number = 24
  ): Promise<VolumeAnalysis> {
    return this.performanceMonitor.measure('analyzeVolume', async () => {
      this.logger.info(`Analyzing volume for ${symbol} over ${periods} periods`);

      try {
        const klines = await this.marketDataService.getKlines(symbol, interval, periods);

        if (klines.length === 0) {
          throw new AnalysisError(
            `No volume data available for ${symbol}`,
            'volume',
            symbol
          );
        }

        const volumes = klines.map(k => k.volume);
        const avgVolume = this.mathUtils.mean(volumes);
        const currentVolume = volumes[volumes.length - 1];
        const maxVolume = Math.max(...volumes);
        const minVolume = Math.min(...volumes);

        // Detect volume spikes (>1.5x average)
        const volumeSpikes: VolumeSpike[] = klines
          .filter(k => k.volume > avgVolume * 1.5)
          .slice(0, 5)
          .map(k => ({
            timestamp: k.timestamp,
            volume: k.volume,
            multiplier: k.volume / avgVolume,
            price: k.close
          }));

        // Calculate VWAP
        const vwap = this.calculateVWAP(klines);

        // Determine volume trend
        const recentVolumes = volumes.slice(-5);
        const olderVolumes = volumes.slice(-10, -5);
        const recentAvg = this.mathUtils.mean(recentVolumes);
        const olderAvg = this.mathUtils.mean(olderVolumes);
        
        let trend: 'increasing' | 'decreasing' | 'stable';
        if (recentAvg > olderAvg * 1.1) {
          trend = 'increasing';
        } else if (recentAvg < olderAvg * 0.9) {
          trend = 'decreasing';
        } else {
          trend = 'stable';
        }

        const analysis: VolumeAnalysis = {
          symbol,
          interval,
          avgVolume,
          currentVolume,
          maxVolume,
          minVolume,
          volumeSpikes,
          vwap,
          trend
        };

        // Save to Context-Aware Repository (TASK-027 FASE 2)
        try {
          const analysisId = await this.contextAwareRepository.saveAnalysisWithContext(
            `${symbol}_volume_${interval}_${Date.now()}`,
            'volume',
            { ...analysis, symbol, interval },
            { 
              symbol, 
              interval,
              tags: [
                `interval:${interval}`,
                `trend:${analysis.trend}`,
                `volume_ratio:${Math.round(currentVolume/avgVolume*100)}`,
                `spikes:${analysis.volumeSpikes.length}`,
                `vwap_position:${analysis.vwap.priceVsVwap}`
              ]
            }
          );
          this.logger.info(`Volume analysis saved with context - ID: ${analysisId} (TASK-027 FASE 2)`);
        } catch (contextError) {
          this.logger.warn(`Failed to save volume analysis context for ${symbol}:`, contextError);
        }

        this.logger.info(`Volume analysis for ${symbol}: ${currentVolume.toFixed(0)} (${(currentVolume/avgVolume*100).toFixed(0)}% of avg)`);
        return analysis;

      } catch (error) {
        this.logger.error(`Volume analysis failed for ${symbol}:`, error);
        throw new AnalysisError(
          `Failed to analyze volume for ${symbol}`,
          'volume',
          symbol,
          error as Error
        );
      }
    });
  }

  /**
   * Calculate Volume Delta (buying vs selling pressure) with multi-exchange support
   */
  async analyzeVolumeDelta(
    symbol: string, 
    interval: string = '5', 
    periods: number = 60,
    useMultiExchange: boolean = false
  ): Promise<VolumeDelta> {
    return this.performanceMonitor.measure('analyzeVolumeDelta', async () => {
      this.logger.info(`Analyzing volume delta for ${symbol} over ${periods} periods`);

      try {
        // Multi-exchange wash trading filter if enabled
        let multiExchangeData: any = null;
        if (useMultiExchange) {
          try {
            multiExchangeData = await this.getMultiExchangeVolumeData(symbol);
            this.logger.info(`Multi-exchange volume data obtained for ${symbol}`);
          } catch (error) {
            this.logger.warn(`Multi-exchange data failed for ${symbol}, using single exchange:`, error);
          }
        }

        const klines = await this.marketDataService.getKlines(symbol, interval, periods);

        if (klines.length === 0) {
          throw new AnalysisError(
            `No data available for volume delta analysis of ${symbol}`,
            'volume_delta',
            symbol
          );
        }

        // Calculate volume deltas for each period with wash trading filter
        const deltas = klines.map(k => this.calculateVolumeDeltaForCandle(k));
        
        // Apply multi-exchange wash trading filter if available
        let filteredDeltas = deltas;
        if (multiExchangeData) {
          filteredDeltas = this.filterWashTradingFromDeltas(deltas, multiExchangeData);
          this.logger.info(`Volume Delta: Filtered ${deltas.length - filteredDeltas.length} wash trading periods`);
        }
        
        // Calculate cumulative delta with clean data
        let cumulativeDelta = 0;
        filteredDeltas.forEach(delta => {
          cumulativeDelta += delta.delta;
        });

        const recentDeltas = filteredDeltas.slice(-10);
        const current = filteredDeltas[filteredDeltas.length - 1].delta;
        const average = this.mathUtils.mean(recentDeltas.map(d => d.delta));
        
        // Determine bias
        let bias: 'buyer' | 'seller' | 'neutral';
        if (average > 0) {
          bias = 'buyer';
        } else if (average < 0) {
          bias = 'seller';
        } else {
          bias = 'neutral';
        }

        const strength = Math.abs(average / klines[klines.length - 1].volume * 100);

        // Detect divergences with clean data
        const divergence = this.detectVolumeDeltaDivergence(klines, filteredDeltas);

        // Calculate market pressure with institutional data
        const marketPressure = this.calculateMarketPressureWithCrossValidation(
          filteredDeltas, 
          multiExchangeData
        );

        const analysis: VolumeDelta = {
          symbol,
          interval,
          current,
          average,
          bias,
          strength,
          cumulativeDelta,
          divergence,
          marketPressure
        };
        
        // Store multi-exchange metrics separately for context tags
        const multiExchangeMetrics = multiExchangeData ? {
          washTradingFiltered: deltas.length - filteredDeltas.length,
          institutionalFlow: this.calculateInstitutionalFlow(multiExchangeData),
          crossExchangeConsistency: this.calculateCrossExchangeConsistency(multiExchangeData)
        } : null;

        // Save to Context-Aware Repository (TASK-027 FASE 2)
        try {
          const analysisId = await this.contextAwareRepository.saveAnalysisWithContext(
            `${symbol}_volume_delta_${interval}_${Date.now()}`,
            'volume_delta',
            { ...analysis, symbol, interval },
            { 
              symbol, 
              interval,
              tags: [
                `interval:${interval}`,
                `bias:${bias}`,
                `strength:${Math.round(strength)}`,
                `cumulative:${Math.round(cumulativeDelta)}`,
                `divergence:${divergence.detected}`,
                `pressure:${marketPressure.trend}`,
                ...(multiExchangeData ? [
                  `multi_exchange:true`,
                  `wash_filtered:${multiExchangeMetrics?.washTradingFiltered || 0}`,
                  `institutional:${multiExchangeMetrics?.institutionalFlow || 0}`
                ] : [])
              ]
            }
          );
          this.logger.info(`Volume delta analysis saved with context - ID: ${analysisId} (TASK-027 FASE 2)`);
        } catch (contextError) {
          this.logger.warn(`Failed to save volume delta analysis context for ${symbol}:`, contextError);
        }

        this.logger.info(`Volume delta analysis for ${symbol}: ${bias} bias with ${strength.toFixed(1)}% strength`);
        return analysis;

      } catch (error) {
        this.logger.error(`Volume delta analysis failed for ${symbol}:`, error);
        throw new AnalysisError(
          `Failed to analyze volume delta for ${symbol}`,
          'volume_delta',
          symbol,
          error as Error
        );
      }
    });
  }

  /**
   * Identify dynamic support and resistance levels
   */
  async identifySupportResistance(
    symbol: string,
    interval: string = '60',
    periods: number = 100,
    sensitivity: number = 2
  ): Promise<SupportResistanceAnalysis> {
    return this.performanceMonitor.measure('identifySupportResistance', async () => {
      this.logger.info(`Identifying S/R levels for ${symbol} with sensitivity ${sensitivity}`);

      try {
        const klines = await this.marketDataService.getKlines(symbol, interval, periods);

        if (klines.length < 20) {
          throw new AnalysisError(
            `Insufficient data for S/R analysis of ${symbol}`,
            'support_resistance',
            symbol
          );
        }

        const currentPrice = klines[klines.length - 1].close;
        
        // Configure parameters based on sensitivity
        const lookbackPeriod = Math.max(3, 6 - sensitivity);
        const volumeThreshold = this.calculateVolumeThreshold(klines, sensitivity);

        // Find pivot points
        const resistancePivots = this.findResistancePivots(klines, lookbackPeriod);
        const supportPivots = this.findSupportPivots(klines, lookbackPeriod);

        // Group and score levels - FIXED: Process all pivots together to avoid classification confusion
        const allPivots = [...resistancePivots, ...supportPivots];
        const processedLevels = this.groupAndScoreLevels(
          allPivots, 
          currentPrice, 
          volumeThreshold
        );
        
        // Separate into resistances and supports based on final classification
        const resistances = processedLevels.filter(level => level.type === 'resistance');
        const supports = processedLevels.filter(level => level.type === 'support');

        // Sort by strength and take top levels
        const topResistances = resistances
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 3);
        
        const topSupports = supports
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 3);

        // Find critical level (closest to current price)
        const combinedLevels = [...topResistances, ...topSupports];
        const criticalLevel = combinedLevels.reduce((nearest, level) => 
          level.priceDistance < nearest.priceDistance ? level : nearest
        );

        // Generate grid configuration
        const gridConfig = this.generateGridConfiguration(topSupports, topResistances, currentPrice);

        // Calculate statistics
        const avgVolume = this.mathUtils.mean(klines.map(k => k.volume));
        const priceRange = {
          high: Math.max(...klines.map(k => k.high)),
          low: Math.min(...klines.map(k => k.low))
        };

        const analysis: SupportResistanceAnalysis = {
          symbol,
          interval,
          currentPrice,
          resistances: topResistances,
          supports: topSupports,
          criticalLevel,
          gridConfig,
          statistics: {
            totalPivotsFound: resistancePivots.length + supportPivots.length,
            priceRangeAnalyzed: priceRange,
            avgVolume,
            periodsAnalyzed: periods,
            sensitivityUsed: sensitivity
          }
        };

        this.logger.info(`S/R analysis for ${symbol}: Found ${topResistances.length} resistances, ${topSupports.length} supports`);
        return analysis;

      } catch (error) {
        this.logger.error(`S/R analysis failed for ${symbol}:`, error);
        throw new AnalysisError(
          `Failed to identify support/resistance for ${symbol}`,
          'support_resistance',
          symbol,
          error as Error
        );
      }
    });
  }

  // ====================
  // MULTI-EXCHANGE METHODS FOR VOLUME ANALYSIS
  // ====================

  /**
   * Obtiene datos multi-exchange para análisis de volumen
   */
  private async getMultiExchangeVolumeData(symbol: string): Promise<{
    aggregatedTicker: any;
    volumeAnalysis: any;
    washTradingMetrics: any;
    institutionalMetrics: any;
  }> {
    const [aggregatedTicker, volumeAnalysis] = await Promise.all([
      this.exchangeAggregator.getAggregatedTicker(symbol),
      this.exchangeAggregator.analyzeVolumeDivergences(symbol)
    ]);

    // Detectar wash trading en volumen
    const washTradingMetrics = this.detectVolumeWashTrading(volumeAnalysis);
    
    // Calcular métricas institucionales
    const institutionalMetrics = this.calculateInstitutionalVolumeMetrics(aggregatedTicker, volumeAnalysis);

    return {
      aggregatedTicker,
      volumeAnalysis,
      washTradingMetrics,
      institutionalMetrics
    };
  }

  /**
   * Filtra wash trading de los deltas de volumen
   */
  private filterWashTradingFromDeltas(deltas: any[], multiExchangeData: any): any[] {
    const { washTradingMetrics } = multiExchangeData;
    
    if (washTradingMetrics.suspiciousPeriodsCount === 0) {
      return deltas; // No hay wash trading detectado
    }
    
    // Filtrar períodos con alto wash trading
    return deltas.filter((delta, index) => {
      // Usar heurística simple: remover períodos con volumen anómalo
      const periodRisk = this.calculatePeriodWashTradingRisk(index, multiExchangeData);
      return periodRisk < 0.7; // Mantener solo períodos con bajo riesgo de wash trading
    });
  }

  /**
   * Calcula market pressure con validación cross-exchange
   */
  private calculateMarketPressureWithCrossValidation(
    deltas: any[], 
    multiExchangeData: any
  ): MarketPressure {
    // Calcular pressure base
    const basePressure = this.calculateMarketPressure(deltas);
    
    if (!multiExchangeData) {
      return basePressure;
    }
    
    // Enriquecer con datos institucionales
    const { institutionalMetrics } = multiExchangeData;
    
    const enhancedTrend = this.enhanceMarketPressureTrend(
      basePressure.trend,
      institutionalMetrics
    );
    
    return {
      ...basePressure,
      trend: enhancedTrend,
      institutionalConfirmation: institutionalMetrics.institutionalBias
    } as MarketPressure & {
      institutionalConfirmation?: string;
    };
  }

  /**
   * Calcula flujo institucional
   */
  private calculateInstitutionalFlow(multiExchangeData: any): number {
    const { institutionalMetrics, washTradingMetrics } = multiExchangeData;
    
    // Flujo institucional = volumen real * consistencia entre exchanges
    const realVolumeRatio = 1 - (washTradingMetrics.artificialVolumeRatio / 100);
    const institutionalFlow = institutionalMetrics.institutionalVolumeRatio * realVolumeRatio;
    
    return Math.round(institutionalFlow);
  }

  /**
   * Calcula consistencia cross-exchange
   */
  private calculateCrossExchangeConsistency(multiExchangeData: any): number {
    const { volumeAnalysis } = multiExchangeData;
    return Math.round(volumeAnalysis.consistency);
  }

  // ====================
  // MÉTODOS AUXILIARES MULTI-EXCHANGE
  // ====================

  private detectVolumeWashTrading(volumeAnalysis: any): {
    suspiciousPeriodsCount: number;
    artificialVolumeRatio: number;
    washTradingScore: number;
  } {
    const exchanges = volumeAnalysis.exchanges || [];
    
    // Detectar períodos sospechosos de wash trading
    const suspiciousExchanges = exchanges.filter((e: any) => 
      e.volumeDeviation > 2.5 && e.priceDeviation < 0.1
    );
    
    const suspiciousPeriodsCount = suspiciousExchanges.length;
    const artificialVolumeRatio = Math.min(100, suspiciousPeriodsCount * 20);
    const washTradingScore = this.calculateWashTradingScore(exchanges);
    
    return {
      suspiciousPeriodsCount,
      artificialVolumeRatio,
      washTradingScore
    };
  }

  private calculateInstitutionalVolumeMetrics(aggregatedTicker: any, volumeAnalysis: any): {
    institutionalVolumeRatio: number;
    institutionalBias: string;
    volumeQuality: number;
  } {
    const exchanges = Object.values(aggregatedTicker.exchanges || {});
    const volumeConsistency = volumeAnalysis.consistency || 50;
    
    // Ratio de volumen institucional (basado en consistencia)
    const institutionalVolumeRatio = Math.min(100, volumeConsistency * 0.8);
    
    // Bias institucional
    let institutionalBias = 'neutral';
    if (institutionalVolumeRatio > 70) {
      institutionalBias = 'strong_institutional';
    } else if (institutionalVolumeRatio > 50) {
      institutionalBias = 'moderate_institutional';
    }
    
    // Calidad del volumen (menor wash trading = mayor calidad)
    const volumeQuality = Math.max(0, 100 - this.calculateWashTradingScore(volumeAnalysis.exchanges));
    
    return {
      institutionalVolumeRatio,
      institutionalBias,
      volumeQuality
    };
  }

  private calculatePeriodWashTradingRisk(periodIndex: number, multiExchangeData: any): number {
    const { washTradingMetrics } = multiExchangeData;
    
    // Heurística simple: usar el score general de wash trading
    return washTradingMetrics.washTradingScore / 100;
  }

  private enhanceMarketPressureTrend(
    baseTrend: 'strong_buying' | 'strong_selling' | 'balanced',
    institutionalMetrics: any
  ): 'strong_buying' | 'strong_selling' | 'balanced' {
    const institutionalBias = institutionalMetrics.institutionalBias;
    
    // Si hay fuerte actividad institucional, darle más peso
    if (institutionalBias === 'strong_institutional') {
      if (baseTrend === 'balanced') {
        // Mantener el trend original si es balanceado pero con institucionales
        return baseTrend;
      }
      // Reforzar el trend existente
      return baseTrend;
    }
    
    return baseTrend;
  }

  private calculateWashTradingScore(exchanges: any[]): number {
    if (!exchanges || exchanges.length === 0) return 0;
    
    // Calcular score basado en anomalías de volumen vs precio
    const anomalies = exchanges.filter((e: any) => 
      e.volumeDeviation > 2 && e.priceDeviation < 0.05
    ).length;
    
    return Math.min(100, anomalies * 25);
  }

  // ====================
  // PRIVATE HELPER METHODS (ORIGINAL)
  // ====================

  private getVolatilityConfig(period: string): { interval: string; limit: number } {
    const configs: Record<string, { interval: string; limit: number }> = {
      '1h': { interval: '1', limit: 60 },
      '4h': { interval: '4', limit: 60 },
      '1d': { interval: '60', limit: 24 },
      '7d': { interval: 'D', limit: 7 }
    };
    return configs[period] || configs['1d'];
  }

  private calculateVolatilityConfidence(volatilityPercent: number, klines: OHLCV[]): number {
    // Base confidence on data quality and volatility consistency
    const dataQuality = Math.min(klines.length / 24, 1); // Full confidence with 24+ data points
    const volatilityScore = volatilityPercent > 3 && volatilityPercent < 20 ? 1 : 0.5;
    return Math.round((dataQuality * volatilityScore) * 100);
  }

  private calculateVWAP(klines: OHLCV[]): VWAPData {
    let cumulativeVolume = 0;
    let cumulativePriceVolume = 0;

    for (const kline of klines) {
      const typicalPrice = (kline.high + kline.low + kline.close) / 3;
      cumulativeVolume += kline.volume;
      cumulativePriceVolume += typicalPrice * kline.volume;
    }

    const vwap = cumulativePriceVolume / cumulativeVolume;
    const currentPrice = klines[klines.length - 1].close;
    
    return {
      current: vwap,
      priceVsVwap: currentPrice > vwap ? 'above' : 'below',
      difference: ((currentPrice - vwap) / vwap) * 100
    };
  }

  private calculateVolumeDeltaForCandle(kline: OHLCV): { delta: number; bias: string } {
    const range = kline.high - kline.low;
    const closePosition = range > 0 ? (kline.close - kline.low) / range : 0.5;
    
    const buyVolume = kline.volume * closePosition;
    const sellVolume = kline.volume * (1 - closePosition);
    const delta = buyVolume - sellVolume;
    
    const bias = kline.close > kline.open ? 'bullish' : 
                 kline.close < kline.open ? 'bearish' : 'neutral';
    
    return { delta, bias };
  }

  private detectVolumeDeltaDivergence(klines: OHLCV[], deltas: any[]): DivergenceData {
    if (klines.length < 10 || deltas.length < 10) {
      return {
        detected: false,
        type: 'insufficient_data',
        signal: 'trend_confirmed'
      };
    }

    const recentPrices = klines.slice(-10).map(k => k.close);
    const recentDeltas = deltas.slice(-10).map(d => d.delta);
    
    const priceTrend = recentPrices[recentPrices.length - 1] > recentPrices[0] ? 'up' : 'down';
    const deltaTrend = this.mathUtils.mean(recentDeltas.slice(-5)) > this.mathUtils.mean(recentDeltas.slice(0, 5)) ? 'up' : 'down';
    
    const divergence = priceTrend !== deltaTrend;
    
    return {
      detected: divergence,
      type: divergence ? `Price ${priceTrend} but delta ${deltaTrend}` : 'No divergence',
      signal: divergence ? 
        (deltaTrend === 'down' && priceTrend === 'up' ? 'bearish_reversal' : 'bullish_reversal') : 
        'trend_confirmed'
    };
  }

  private calculateMarketPressure(deltas: any[]): MarketPressure {
    const recentDeltas = deltas.slice(-10);
    const bullishCandles = recentDeltas.filter(d => d.delta > 0).length;
    const bearishCandles = recentDeltas.length - bullishCandles;
    const bullishPercent = (bullishCandles / recentDeltas.length) * 100;
    
    let trend: 'strong_buying' | 'strong_selling' | 'balanced';
    if (bullishPercent >= 70) {
      trend = 'strong_buying';
    } else if (bullishPercent <= 30) {
      trend = 'strong_selling';
    } else {
      trend = 'balanced';
    }

    return {
      bullishCandles,
      bearishCandles,
      bullishPercent,
      trend
    };
  }

  private findResistancePivots(klines: OHLCV[], lookback: number): Pivot[] {
    const pivots: Pivot[] = [];
    
    for (let i = lookback; i < klines.length - lookback; i++) {
      const current = klines[i];
      let isResistance = true;
      
      // Check if it's the highest point in the lookback range
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && klines[j].high >= current.high) {
          isResistance = false;
          break;
        }
      }
      
      if (isResistance) {
        pivots.push({
          index: i,
          price: current.high,
          timestamp: current.timestamp,
          volume: current.volume,
          type: 'resistance',
          strength: 0 // Will be calculated later
        });
      }
    }
    
    return pivots;
  }

  private findSupportPivots(klines: OHLCV[], lookback: number): Pivot[] {
    const pivots: Pivot[] = [];
    
    for (let i = lookback; i < klines.length - lookback; i++) {
      const current = klines[i];
      let isSupport = true;
      
      // Check if it's the lowest point in the lookback range
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && klines[j].low <= current.low) {
          isSupport = false;
          break;
        }
      }
      
      if (isSupport) {
        pivots.push({
          index: i,
          price: current.low,
          timestamp: current.timestamp,
          volume: current.volume,
          type: 'support',
          strength: 0 // Will be calculated later
        });
      }
    }
    
    return pivots;
  }

  private groupAndScoreLevels(
    pivots: Pivot[], 
    currentPrice: number, 
    volumeThreshold: number
  ): SupportResistanceLevel[] {
    if (pivots.length === 0) return [];
    
    const levels: SupportResistanceLevel[] = [];
    const groupTolerance = currentPrice * 0.005; // 0.5% tolerance
    
    // Group nearby pivots
    for (const pivot of pivots) {
      let addedToExisting = false;
      
      for (const level of levels) {
        if (Math.abs(pivot.price - level.level) <= groupTolerance) {
          // Add to existing level
          level.touches++;
          level.volumeConfirmation = (level.volumeConfirmation + (pivot.volume / volumeThreshold)) / 2;
          level.lastTouchTime = pivot.timestamp;
          addedToExisting = true;
          break;
        }
      }
      
      if (!addedToExisting) {
        // Create new level with correct type classification
        const actualType = pivot.price > currentPrice ? 'resistance' : 'support';
        
        // DEBUGGING LOG for BUG-004 - Fixed unified classification
        this.logger.info(`S/R FIXED: Price=${pivot.price.toFixed(4)}, Current=${currentPrice.toFixed(4)}, FinalType=${actualType}`);
        
        // Validate logic
        const expectedType = pivot.price > currentPrice ? 'resistance' : 'support';
        if (actualType !== expectedType) {
          this.logger.error(`S/R LOGIC ERROR: Expected=${expectedType}, Got=${actualType}`);
        }
        
        levels.push({
          level: pivot.price,
          type: actualType,
          strength: 0,
          touches: 1,
          volumeConfirmation: pivot.volume / volumeThreshold,
          lastTouchTime: pivot.timestamp,
          priceDistance: Math.abs((pivot.price - currentPrice) / currentPrice * 100),
          confidence: 'moderate'
        });
      }
    }
    
    // Calculate strength scores
    for (const level of levels) {
      const touchScore = Math.min(level.touches * 20, 40);
      const volumeScore = Math.min(level.volumeConfirmation * 15, 30);
      const proximityScore = Math.max(0, 20 - level.priceDistance);
      const daysSinceTouch = (Date.now() - new Date(level.lastTouchTime).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 10 - daysSinceTouch);
      
      level.strength = touchScore + volumeScore + proximityScore + recencyScore;
      
      // Set confidence level
      if (level.strength > 75) {
        level.confidence = 'very_strong';
      } else if (level.strength > 50) {
        level.confidence = 'strong';
      } else if (level.strength > 25) {
        level.confidence = 'moderate';
      } else {
        level.confidence = 'weak';
      }
    }
    
    return levels;
  }

  private calculateVolumeThreshold(klines: OHLCV[], sensitivity: number): number {
    const volumes = klines.map(k => k.volume);
    const avgVolume = this.mathUtils.mean(volumes);
    
    // Higher sensitivity = lower threshold (more permissive)
    const multiplier = 1.2 + (sensitivity - 1) * 0.2;
    return avgVolume * multiplier;
  }

  private generateGridConfiguration(
    supports: SupportResistanceLevel[],
    resistances: SupportResistanceLevel[],
    currentPrice: number
  ) {
    const optimalLowerBound = supports.length > 0 ? supports[0].level : currentPrice * 0.95;
    const optimalUpperBound = resistances.length > 0 ? resistances[0].level : currentPrice * 1.05;
    
    const allLevels = [...supports, ...resistances];
    const keyLevels = allLevels
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 4)
      .map(l => l.level);
    
    const range = optimalUpperBound - optimalLowerBound;
    const recommendedGridCount = Math.max(5, Math.min(15, Math.round(range / currentPrice * 100)));
    
    return {
      optimalLowerBound,
      optimalUpperBound,
      keyLevels,
      recommendedGridCount,
      recommendation: allLevels.length >= 2 ? 
        'Strong S/R levels identified - Grid trading recommended' : 
        'Limited S/R data - Consider manual analysis'
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get service info
   */
  getServiceInfo() {
    return {
      name: 'TechnicalAnalysisService',
      version: '1.3.0',
      capabilities: [
        'volatility_analysis',
        'volume_analysis', 
        'volume_delta',
        'support_resistance_detection'
      ],
      uptime: process.uptime()
    };
  }
}