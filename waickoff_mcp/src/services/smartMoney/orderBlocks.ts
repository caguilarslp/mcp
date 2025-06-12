/**
 * @fileoverview Order Blocks Detection Service for Smart Money Concepts
 * @description Implementación algorítmica de detección de Order Blocks institucionales
 * @version 1.0.0
 * @author Smart Money Concepts Team
 */

import { OHLCV, MarketTicker, MCPServerResponse, PerformanceMetrics, IMarketDataService, IAnalysisService } from '../../types/index.js';

// ====================
// ORDER BLOCK TYPES
// ====================

export interface OrderBlock {
  id: string;
  type: 'bullish' | 'bearish' | 'breaker';
  origin: {
    high: number;
    low: number;
    open: number;
    close: number;
    volume: number;
    timestamp: Date;
    candleIndex: number;
  };
  zone: {
    upper: number;      // Top of the OB zone
    lower: number;      // Bottom of the OB zone
    midpoint: number;   // 50% of the zone
  };
  strength: number;     // 0-100 based on volume and move
  mitigated: boolean;   // Has been tested/traded through
  mitigationTime?: Date;
  respectCount: number; // Times price respected this OB
  lastTest?: Date;
  validity: 'fresh' | 'tested' | 'broken';
  createdAt: Date;
  subsequentMove: {
    magnitude: number;    // ATR units moved after OB
    candles: number;      // Candles to complete move
    maxPrice: number;     // Highest/lowest price after OB
  };
}

export interface OrderBlockAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  activeBlocks: OrderBlock[];
  breakerBlocks: OrderBlock[];  // Mitigated OBs that flipped
  strongestBlock?: OrderBlock;
  nearestBlock: {
    bullish?: OrderBlock;
    bearish?: OrderBlock;
  };
  confluenceWithLevels: Array<{
    orderBlock: OrderBlock;
    level: any; // S/R, Fibo, etc.
    type: string;
    distance: number;
  }>;
  marketBias: 'bullish' | 'bearish' | 'neutral';
  timestamp: Date;
}

export interface OrderBlockConfig {
  minVolumeMultiplier: number;     // 1.5x average volume
  minSubsequentMove: number;       // 2.0 ATR units minimum
  maxCandlesForMove: number;       // 10 candles max for subsequent move
  mitigationThreshold: number;     // 50% zone penetration
  breakerConfirmation: number;     // 80% zone opposite side close
  maxBlockAge: number;             // 100 candles max age
  strengthWeights: {
    volume: number;                // 0.4
    subsequentMove: number;        // 0.3
    respectCount: number;          // 0.2
    age: number;                   // 0.1
  };
}

// ====================
// ORDER BLOCKS SERVICE
// ====================

export class OrderBlocksService {
  private marketDataService: IMarketDataService;
  private analysisService: IAnalysisService;
  private config: OrderBlockConfig;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(
    marketDataService: IMarketDataService,
    analysisService: IAnalysisService
  ) {
    this.marketDataService = marketDataService;
    this.analysisService = analysisService;
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): OrderBlockConfig {
    return {
      minVolumeMultiplier: 1.5,
      minSubsequentMove: 2.0,
      maxCandlesForMove: 10,
      mitigationThreshold: 0.5,
      breakerConfirmation: 0.8,
      maxBlockAge: 100,
      strengthWeights: {
        volume: 0.4,
        subsequentMove: 0.3,
        respectCount: 0.2,
        age: 0.1
      }
    };
  }

  /**
   * Detecta Order Blocks en los datos de mercado
   */
  async detectOrderBlocks(
    symbol: string,
    timeframe: string = '60',
    lookback: number = 100,
    minStrength: number = 70,
    includeBreakers: boolean = true
  ): Promise<OrderBlockAnalysis> {
    const startTime = Date.now();

    try {
      // Obtener datos de mercado
      const klines = await this.marketDataService.getKlines(symbol, timeframe, lookback + 20);
      const ticker = await this.marketDataService.getTicker(symbol);
      const volumeAnalysis = await this.analysisService.analyzeVolume(symbol, timeframe, lookback);

      if (klines.length < 30) {
        throw new Error(`Insufficient data for analysis: ${klines.length} candles`);
      }

      // Calcular ATR para normalización
      const atr = this.calculateATR(klines, 14);
      const avgVolume = volumeAnalysis.avgVolume;

      // Detectar Order Blocks potenciales
      const potentialBlocks = this.identifyPotentialOrderBlocks(klines, avgVolume, atr);

      // Validar y filtrar Order Blocks
      const validBlocks = this.validateOrderBlocks(potentialBlocks, klines, atr);

      // Analizar mitigación y estado actual
      const analyzedBlocks = this.analyzeBlockMitigation(validBlocks, klines, ticker.lastPrice);

      // Separar activos y breakers
      const activeBlocks = analyzedBlocks.filter(block => 
        !block.mitigated && block.strength >= minStrength
      );
      
      const breakerBlocks = includeBreakers ? 
        analyzedBlocks.filter(block => 
          block.mitigated && block.type === 'breaker' && block.strength >= minStrength
        ) : [];

      // Encontrar bloques más relevantes
      const strongestBlock = this.findStrongestBlock(activeBlocks);
      const nearestBlocks = this.findNearestBlocks(activeBlocks, ticker.lastPrice);

      // Determinar sesgo del mercado
      const marketBias = this.determineMarketBias(activeBlocks, ticker.lastPrice);

      // Registrar métricas de rendimiento
      this.recordPerformance('detectOrderBlocks', Date.now() - startTime, true);

      return {
        symbol,
        timeframe,
        currentPrice: ticker.lastPrice,
        activeBlocks,
        breakerBlocks,
        strongestBlock,
        nearestBlock: nearestBlocks,
        confluenceWithLevels: [], // TODO: Implementar en siguiente fase
        marketBias,
        timestamp: new Date()
      };

    } catch (error) {
      this.recordPerformance('detectOrderBlocks', Date.now() - startTime, false, error);
      throw error;
    }
  }

  /**
   * Valida si un Order Block específico sigue siendo válido
   */
  async validateOrderBlock(
    symbol: string,
    orderBlockId: string,
    storedBlocks: OrderBlock[]
  ): Promise<{ valid: boolean; block?: OrderBlock; reason?: string }> {
    const startTime = Date.now();

    try {
      const block = storedBlocks.find(b => b.id === orderBlockId);
      if (!block) {
        return { valid: false, reason: 'Order Block not found' };
      }

      // Obtener datos actuales
      const ticker = await this.marketDataService.getTicker(symbol);
      const currentPrice = ticker.lastPrice;

      // Verificar si ha sido mitigado
      const mitigationLevel = block.type === 'bullish' ? 
        block.zone.lower : block.zone.upper;

      const isMitigated = block.type === 'bullish' ?
        currentPrice < mitigationLevel * (1 - this.config.mitigationThreshold) :
        currentPrice > mitigationLevel * (1 + this.config.mitigationThreshold);

      if (isMitigated && !block.mitigated) {
        // Marcar como mitigado
        const updatedBlock: OrderBlock = {
          ...block,
          mitigated: true,
          mitigationTime: new Date(),
          validity: 'broken'
        };

        this.recordPerformance('validateOrderBlock', Date.now() - startTime, true);
        return { valid: false, block: updatedBlock, reason: 'Recently mitigated' };
      }

      // Verificar edad máxima
      const ageInMs = Date.now() - block.createdAt.getTime();
      const ageInCandles = ageInMs / (this.getTimeframeMs(60) || 3600000); // Default 1h
      
      if (ageInCandles > this.config.maxBlockAge) {
        this.recordPerformance('validateOrderBlock', Date.now() - startTime, true);
        return { valid: false, reason: 'Order Block too old' };
      }

      // Verificar si precio está cerca para testing
      const distancePercent = Math.abs(currentPrice - block.zone.midpoint) / currentPrice;
      const isNearBlock = distancePercent < 0.05; // Within 5%

      let updatedBlock = block;
      if (isNearBlock && !block.lastTest) {
        updatedBlock = {
          ...block,
          lastTest: new Date(),
          respectCount: block.respectCount + 1,
          validity: 'tested'
        };
      }

      this.recordPerformance('validateOrderBlock', Date.now() - startTime, true);
      return { valid: true, block: updatedBlock };

    } catch (error) {
      this.recordPerformance('validateOrderBlock', Date.now() - startTime, false, error);
      throw error;
    }
  }

  /**
   * Obtiene Order Blocks activos categorizados por fuerza
   */
  getOrderBlockZones(
    blocks: OrderBlock[],
    currentPrice: number
  ): {
    strong: OrderBlock[];
    medium: OrderBlock[];
    weak: OrderBlock[];
    nearby: OrderBlock[];
  } {
    const strong = blocks.filter(b => b.strength >= 85);
    const medium = blocks.filter(b => b.strength >= 70 && b.strength < 85);
    const weak = blocks.filter(b => b.strength < 70);
    
    const nearby = blocks.filter(b => {
      const distance = Math.abs(currentPrice - b.zone.midpoint) / currentPrice;
      return distance < 0.03; // Within 3%
    });

    return { strong, medium, weak, nearby };
  }

  // ====================
  // MÉTODOS PRIVADOS DE DETECCIÓN
  // ====================

  private identifyPotentialOrderBlocks(
    klines: OHLCV[],
    avgVolume: number,
    atr: number
  ): Array<{
    index: number;
    candle: OHLCV;
    type: 'bullish' | 'bearish';
    volumeRatio: number;
  }> {
    const potentialBlocks: Array<{
      index: number;
      candle: OHLCV;
      type: 'bullish' | 'bearish';
      volumeRatio: number;
    }> = [];

    for (let i = 1; i < klines.length - 10; i++) {
      const candle = klines[i];
      const volumeRatio = candle.volume / avgVolume;

      // Verificar volumen institucional
      if (volumeRatio < this.config.minVolumeMultiplier) continue;

      // Identificar tipo de Order Block
      const isBullish = candle.close > candle.open;
      const isBearish = candle.close < candle.open;

      if (!isBullish && !isBearish) continue;

      // Verificar que tenga cuerpo significativo (>30% del rango)
      const bodySize = Math.abs(candle.close - candle.open);
      const totalRange = candle.high - candle.low;
      const bodyRatio = bodySize / totalRange;

      if (bodyRatio < 0.3) continue;

      potentialBlocks.push({
        index: i,
        candle,
        type: isBullish ? 'bullish' : 'bearish',
        volumeRatio
      });
    }

    return potentialBlocks;
  }

  private validateOrderBlocks(
    potentialBlocks: Array<{
      index: number;
      candle: OHLCV;
      type: 'bullish' | 'bearish';
      volumeRatio: number;
    }>,
    klines: OHLCV[],
    atr: number
  ): OrderBlock[] {
    const validBlocks: OrderBlock[] = [];

    for (const potential of potentialBlocks) {
      // Verificar movimiento posterior
      const subsequentMove = this.analyzeSubsequentMove(
        potential.index,
        potential.type,
        klines,
        atr
      );

      if (subsequentMove.magnitude < this.config.minSubsequentMove) continue;
      if (subsequentMove.candles > this.config.maxCandlesForMove) continue;

      // Calcular zona del Order Block
      const zone = this.calculateOrderBlockZone(potential.candle, potential.type);

      // Calcular fuerza
      const strength = this.calculateOrderBlockStrength(
        potential.volumeRatio,
        subsequentMove.magnitude,
        0, // respectCount inicial
        0  // age inicial
      );

      const orderBlock: OrderBlock = {
        id: this.generateOrderBlockId(potential.candle, potential.type),
        type: potential.type,
        origin: {
          high: potential.candle.high,
          low: potential.candle.low,
          open: potential.candle.open,
          close: potential.candle.close,
          volume: potential.candle.volume,
          timestamp: new Date(potential.candle.timestamp),
          candleIndex: potential.index
        },
        zone,
        strength,
        mitigated: false,
        respectCount: 0,
        validity: 'fresh',
        createdAt: new Date(),
        subsequentMove
      };

      validBlocks.push(orderBlock);
    }

    return validBlocks;
  }

  private analyzeSubsequentMove(
    startIndex: number,
    type: 'bullish' | 'bearish',
    klines: OHLCV[],
    atr: number
  ): { magnitude: number; candles: number; maxPrice: number } {
    const startPrice = type === 'bullish' ? klines[startIndex].high : klines[startIndex].low;
    let maxPrice = startPrice;
    let magnitude = 0;

    for (let i = startIndex + 1; i < Math.min(startIndex + this.config.maxCandlesForMove + 1, klines.length); i++) {
      const candle = klines[i];
      
      if (type === 'bullish') {
        if (candle.high > maxPrice) {
          maxPrice = candle.high;
          magnitude = (maxPrice - startPrice) / atr;
        }
      } else {
        if (candle.low < maxPrice) {
          maxPrice = candle.low;
          magnitude = (startPrice - maxPrice) / atr;
        }
      }

      // Si ya alcanzamos el movimiento mínimo, podemos continuar buscando más
      if (magnitude >= this.config.minSubsequentMove) {
        continue;
      }
    }

    const candles = Math.min(this.config.maxCandlesForMove, klines.length - startIndex - 1);

    return { magnitude, candles, maxPrice };
  }

  private calculateOrderBlockZone(
    candle: OHLCV,
    type: 'bullish' | 'bearish'
  ): { upper: number; lower: number; midpoint: number } {
    let upper: number, lower: number;

    if (type === 'bullish') {
      // Para OB alcista, zona entre open y close
      upper = Math.max(candle.open, candle.close);
      lower = Math.min(candle.open, candle.close);
    } else {
      // Para OB bajista, zona entre open y close
      upper = Math.max(candle.open, candle.close);
      lower = Math.min(candle.open, candle.close);
    }

    const midpoint = (upper + lower) / 2;

    return { upper, lower, midpoint };
  }

  private analyzeBlockMitigation(
    blocks: OrderBlock[],
    klines: OHLCV[],
    currentPrice: number
  ): OrderBlock[] {
    return blocks.map(block => {
      // Buscar si el bloque fue mitigado después de su creación
      let mitigated = false;
      let mitigationTime: Date | undefined;
      let respectCount = 0;

      for (let i = block.origin.candleIndex + 1; i < klines.length; i++) {
        const candle = klines[i];
        
        // Verificar testing del bloque
        const isInZone = this.isPriceInOrderBlockZone(
          candle.low,
          candle.high,
          block.zone
        );

        if (isInZone) {
          respectCount++;
          
          // Verificar mitigación (penetración significativa)
          const penetration = this.calculateZonePenetration(candle, block);
          if (penetration > this.config.mitigationThreshold) {
            mitigated = true;
            mitigationTime = new Date(candle.timestamp);
            break;
          }
        }
      }

      // Recalcular fuerza con respectCount actualizado
      const ageInCandles = klines.length - block.origin.candleIndex;
      const updatedStrength = this.calculateOrderBlockStrength(
        block.origin.volume / 1000000, // Approximated volume ratio
        block.subsequentMove.magnitude,
        respectCount,
        ageInCandles
      );

      return {
        ...block,
        mitigated,
        mitigationTime,
        respectCount,
        strength: updatedStrength,
        validity: mitigated ? 'broken' : (respectCount > 0 ? 'tested' : 'fresh')
      };
    });
  }

  private isPriceInOrderBlockZone(
    low: number,
    high: number,
    zone: { upper: number; lower: number; midpoint: number }
  ): boolean {
    return !(high < zone.lower || low > zone.upper);
  }

  private calculateZonePenetration(
    candle: OHLCV,
    block: OrderBlock
  ): number {
    const zoneSize = block.zone.upper - block.zone.lower;
    
    if (block.type === 'bullish') {
      // Para OB alcista, mitigación es penetrar por debajo
      if (candle.low < block.zone.lower) {
        const penetration = block.zone.lower - candle.low;
        return penetration / zoneSize;
      }
    } else {
      // Para OB bajista, mitigación es penetrar por arriba
      if (candle.high > block.zone.upper) {
        const penetration = candle.high - block.zone.upper;
        return penetration / zoneSize;
      }
    }
    
    return 0;
  }

  private calculateOrderBlockStrength(
    volumeRatio: number,
    subsequentMagnitude: number,
    respectCount: number,
    ageInCandles: number
  ): number {
    const weights = this.config.strengthWeights;
    
    // Normalizar componentes (0-100)
    const volumeScore = Math.min(100, (volumeRatio - 1) * 50); // 1.5x = 25, 3x = 100
    const moveScore = Math.min(100, subsequentMagnitude * 25); // 2 ATR = 50, 4 ATR = 100
    const respectScore = Math.min(100, respectCount * 20); // 5 respects = 100
    const ageScore = Math.max(0, 100 - (ageInCandles / this.config.maxBlockAge) * 100);

    const totalStrength = 
      volumeScore * weights.volume +
      moveScore * weights.subsequentMove +
      respectScore * weights.respectCount +
      ageScore * weights.age;

    return Math.round(Math.max(0, Math.min(100, totalStrength)));
  }

  private findStrongestBlock(blocks: OrderBlock[]): OrderBlock | undefined {
    if (blocks.length === 0) return undefined;
    
    return blocks.reduce((strongest, current) => 
      current.strength > strongest.strength ? current : strongest
    );
  }

  private findNearestBlocks(
    blocks: OrderBlock[],
    currentPrice: number
  ): { bullish?: OrderBlock; bearish?: OrderBlock } {
    let nearestBullish: OrderBlock | undefined;
    let nearestBearish: OrderBlock | undefined;
    let minBullishDistance = Infinity;
    let minBearishDistance = Infinity;

    for (const block of blocks) {
      const distance = Math.abs(currentPrice - block.zone.midpoint);
      
      if (block.type === 'bullish' && distance < minBullishDistance) {
        minBullishDistance = distance;
        nearestBullish = block;
      } else if (block.type === 'bearish' && distance < minBearishDistance) {
        minBearishDistance = distance;
        nearestBearish = block;
      }
    }

    return { bullish: nearestBullish, bearish: nearestBearish };
  }

  private determineMarketBias(
    activeBlocks: OrderBlock[],
    currentPrice: number
  ): 'bullish' | 'bearish' | 'neutral' {
    if (activeBlocks.length === 0) return 'neutral';

    let bullishScore = 0;
    let bearishScore = 0;

    for (const block of activeBlocks) {
      const strength = block.strength / 100;
      const proximity = 1 / (1 + Math.abs(currentPrice - block.zone.midpoint) / currentPrice);
      const score = strength * proximity;

      if (block.type === 'bullish') {
        bullishScore += score;
      } else {
        bearishScore += score;
      }
    }

    const diff = Math.abs(bullishScore - bearishScore);
    const total = bullishScore + bearishScore;
    
    if (total === 0) return 'neutral';
    
    const biasStrength = diff / total;
    
    if (biasStrength < 0.2) return 'neutral';
    
    return bullishScore > bearishScore ? 'bullish' : 'bearish';
  }

  // ====================
  // MÉTODOS UTILITARIOS
  // ====================

  private calculateATR(klines: OHLCV[], period: number = 14): number {
    if (klines.length < period + 1) return 1; // Fallback
    
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

  private generateOrderBlockId(candle: OHLCV, type: string): string {
    const timestamp = new Date(candle.timestamp).getTime();
    const price = Math.round((candle.open + candle.close) / 2 * 10000);
    return `ob_${type}_${timestamp}_${price}`;
  }

  private getTimeframeMs(timeframe: number): number {
    return timeframe * 60 * 1000; // minutes to milliseconds
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
}
