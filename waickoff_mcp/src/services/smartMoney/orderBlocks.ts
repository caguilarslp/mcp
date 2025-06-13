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

// Export OrderBlock interface
export interface OrderBlock {
  id: string;
  symbol: string;
  type: 'bullish' | 'bearish' | 'breaker';
  origin: {
    high: number;
    low: number;
    open: number;
    close: number;
    volume: number;
    timestamp: string;
    candleIndex: number;
  };
  zone: {
    upper: number;      // Top of the OB zone
    lower: number;      // Bottom of the OB zone
    midpoint: number;   // 50% of the zone
  };
  strength: number;     // 0-100 based on volume and move
  mitigated: boolean;   // Has been tested/traded through
  mitigationTime?: string;
  respectCount: number; // Times price respected this OB
  lastTest?: string;
  validity: 'fresh' | 'tested' | 'mitigated' | 'breaker';
  createdAt: string;
  subsequentMove: {
    magnitude: number;    // ATR units moved after OB
    candles: number;      // Candles to complete move
    maxPrice: number;     // Highest/lowest price after OB
  };
  // Additional properties required by types/index.ts
  volumeAtCreation: number;
  priceMovement: {
    distance: number;         // Distancia del movimiento posterior
    percentage: number;       // Porcentaje del movimiento
    timeToTarget: number;     // Tiempo en alcanzar objetivo (minutos)
  };
  institutionalSignals: {
    volumeMultiplier: number; // Multiplicador vs volumen promedio
    orderFlowImbalance: number; // Desequilibrio en orderflow
    absorptionLevel: number;   // Nivel de absorción detectado
  };
  currentDistance: number;   // Distancia actual del precio
  priceAtCreation: number;
  marketStructure: {
    swingHigh?: number;
    swingLow?: number;
    structureBreak: boolean;
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
  keyLevels: {
    strongSupport: number[];
    strongResistance: number[];
  };
  statistics: {
    totalBlocks: number;
    freshBlocks: number;
    mitigatedBlocks: number;
    breakerBlocks: number;
    avgRespectRate: number;
  };
  tradingRecommendation: {
    action: 'buy' | 'sell' | 'wait' | 'monitor';
    confidence: number;
    reason: string;
    targets: number[];
    stopLoss?: number;
  };
  timestamp: string;
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
      minVolumeMultiplier: 1.2,      // Reduced from 1.5 to detect more blocks
      minSubsequentMove: 1.5,        // Reduced from 2.0 ATR units
      maxCandlesForMove: 15,         // Increased from 10 for more flexibility
      mitigationThreshold: 0.5,
      breakerConfirmation: 0.8,
      maxBlockAge: 150,              // Increased from 100
      strengthWeights: {
        volume: 0.35,                // Slightly reduced
        subsequentMove: 0.3,
        respectCount: 0.2,
        age: 0.15                    // Slightly increased
      }
    };
  }

  /**
   * Fetch data with retry logic
   */
  private async fetchWithRetry<T>(
    fn: () => Promise<T>, 
    retries: number = 3,
    operation: string = 'operation'
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const isLastAttempt = i === retries - 1;
        
        // Log the error
        console.error(`[OrderBlocks] ${operation} attempt ${i + 1}/${retries} failed:`, error.message);
        
        if (isLastAttempt) {
          throw error;
        }
        
        // Check if error is retryable
        const errorMessage = error.message || '';
        const isRetryable = 
          errorMessage.includes('upstream connect error') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('AbortError');
        
        if (!isRetryable) {
          throw error;
        }
        
        // Exponential backoff
        const waitTime = 1000 * Math.pow(2, i);
        console.log(`[OrderBlocks] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    throw new Error(`${operation} failed after ${retries} attempts`);
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
      // Obtener datos de mercado con retry logic
      const [klines, ticker, volumeAnalysis] = await Promise.all([
        this.fetchWithRetry(
          () => this.marketDataService.getKlines(symbol, timeframe, Math.min(lookback + 20, 200)),
          3,
          `getKlines for ${symbol}`
        ),
        this.fetchWithRetry(
          () => this.marketDataService.getTicker(symbol),
          3,
          `getTicker for ${symbol}`
        ),
        this.fetchWithRetry(
          () => this.analysisService.analyzeVolume(symbol, timeframe, Math.min(lookback, 100)),
          3,
          `analyzeVolume for ${symbol}`
        )
      ]).catch(error => {
        console.error(`[OrderBlocks] Failed to fetch market data for ${symbol}:`, error);
        throw new Error(`Market data fetch failed: ${error.message}`);
      });

      // Validate data
      if (!klines || klines.length === 0) {
        throw new Error('No klines data received');
      }

      if (!ticker || !ticker.lastPrice) {
        throw new Error('Invalid ticker data received');
      }

      if (!volumeAnalysis || !volumeAnalysis.avgVolume) {
        console.warn(`[OrderBlocks] Volume analysis incomplete for ${symbol}, using fallback`);
        // Calculate average volume from klines as fallback
        const avgVolume = klines.reduce((sum, k) => sum + k.volume, 0) / klines.length;
        volumeAnalysis.avgVolume = avgVolume;
      }

      if (klines.length < 30) {
        console.warn(`[OrderBlocks] Limited data for ${symbol}: ${klines.length} candles (minimum 30 recommended)`);
        // Continue with available data but log warning
      }

      // Calcular ATR para normalización
      const atr = this.calculateATR(klines, 14);
      const avgVolume = volumeAnalysis.avgVolume;

      // Detectar Order Blocks potenciales
      let potentialBlocks = this.identifyPotentialOrderBlocks(klines, avgVolume, atr);
      
      // Si no se encontraron bloques, intentar con detección basada en estructura
      if (potentialBlocks.length === 0) {
        console.log(`[OrderBlocks] No blocks found with volume criteria, trying structure-based detection`);
        potentialBlocks = this.identifyStructuralOrderBlocks(klines, atr);
      }

      // Validar y filtrar Order Blocks
      const validBlocks = this.validateOrderBlocks(potentialBlocks, klines, atr);
      
      // Si aún no hay bloques, intentar detección de último recurso
      if (validBlocks.length === 0) {
        console.log(`[OrderBlocks] No valid blocks found, trying last resort detection`);
        const lastResortBlocks = this.detectLastResortOrderBlocks(klines, ticker.lastPrice);
        validBlocks.push(...lastResortBlocks);
      }

      // Analizar mitigación y estado actual
      const analyzedBlocks = this.analyzeBlockMitigation(validBlocks, klines, ticker.lastPrice);

      // Establecer símbolo y distancia actual en todos los bloques
      analyzedBlocks.forEach(block => {
        block.symbol = symbol;
        block.currentDistance = Math.abs(ticker.lastPrice - block.zone.midpoint) / ticker.lastPrice * 100;
      });

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

      // Calcular niveles clave
      const keyLevels = this.calculateKeyLevels(activeBlocks, breakerBlocks);

      // Generar estadísticas
      const statistics = this.generateStatistics(analyzedBlocks, activeBlocks, breakerBlocks);

      // Generar recomendación de trading
      const tradingRecommendation = this.generateTradingRecommendation(
        activeBlocks, 
        marketBias, 
        ticker.lastPrice
      );

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
        keyLevels,
        statistics,
        tradingRecommendation,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      this.recordPerformance('detectOrderBlocks', Date.now() - startTime, false, error);
      
      // Return empty analysis on error instead of throwing
      console.error(`[OrderBlocks] Critical error in detectOrderBlocks for ${symbol}:`, error.message);
      
      return {
        symbol,
        timeframe,
        currentPrice: 0,
        activeBlocks: [],
        breakerBlocks: [],
        strongestBlock: undefined,
        nearestBlock: {},
        confluenceWithLevels: [],
        marketBias: 'neutral',
        keyLevels: {
          strongSupport: [],
          strongResistance: []
        },
        statistics: {
          totalBlocks: 0,
          freshBlocks: 0,
          mitigatedBlocks: 0,
          breakerBlocks: 0,
          avgRespectRate: 0
        },
        tradingRecommendation: {
          action: 'wait',
          confidence: 0,
          reason: `Error analyzing market: ${error.message}`,
          targets: []
        },
        timestamp: new Date().toISOString()
      };
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
          mitigationTime: new Date().toISOString(),
          validity: 'mitigated'
        };

        this.recordPerformance('validateOrderBlock', Date.now() - startTime, true);
        return { valid: false, block: updatedBlock, reason: 'Recently mitigated' };
      }

      // Verificar edad máxima
      const ageInMs = Date.now() - new Date(block.createdAt).getTime();
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
          lastTest: new Date().toISOString(),
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

    // Si no hay suficiente volumen promedio, usar un fallback
    const minVolume = avgVolume > 0 ? avgVolume : 1000000; // Fallback mínimo
    
    for (let i = 1; i < klines.length - 10; i++) {
      const candle = klines[i];
      const volumeRatio = candle.volume / minVolume;

      // Verificar volumen institucional
      if (volumeRatio < this.config.minVolumeMultiplier) continue;

      // Identificar tipo de Order Block
      const isBullish = candle.close > candle.open;
      const isBearish = candle.close < candle.open;

      if (!isBullish && !isBearish) continue;

      // Verificar que tenga cuerpo significativo (>25% del rango) - más flexible
      const bodySize = Math.abs(candle.close - candle.open);
      const totalRange = candle.high - candle.low;
      const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0;

      if (bodyRatio < 0.25) continue;
      
      // Verificar movimiento mínimo del 0.3% para evitar bloques en consolidaciones muy apretadas
      const priceMove = Math.abs(candle.close - candle.open) / candle.open;
      if (priceMove < 0.003) continue;

      potentialBlocks.push({
        index: i,
        candle,
        type: isBullish ? 'bullish' : 'bearish',
        volumeRatio
      });
    }

    // Si no se encontraron bloques con criterios estrictos, buscar con criterios relajados
    if (potentialBlocks.length === 0) {
      console.log(`[OrderBlocks] No blocks found with strict criteria, trying relaxed criteria`);
      return this.identifyPotentialOrderBlocksRelaxed(klines, minVolume, atr);
    }

    return potentialBlocks;
  }

  /**
   * Identificación con criterios relajados cuando no hay bloques con criterios estrictos
   */
  private identifyPotentialOrderBlocksRelaxed(
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

      // Criterios más relajados
      if (volumeRatio < 0.8) continue; // Reducido de 1.2

      const isBullish = candle.close > candle.open;
      const isBearish = candle.close < candle.open;
      if (!isBullish && !isBearish) continue;

      // Body ratio más flexible
      const bodySize = Math.abs(candle.close - candle.open);
      const totalRange = candle.high - candle.low;
      const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0;
      if (bodyRatio < 0.15) continue; // Reducido de 0.25

      // Movimiento mínimo más flexible
      const priceMove = Math.abs(candle.close - candle.open) / candle.open;
      if (priceMove < 0.002) continue; // Reducido de 0.003

      // Buscar zonas de consolidación que precedan movimientos
      const prevCandles = klines.slice(Math.max(0, i - 5), i);
      const avgRange = prevCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / prevCandles.length;
      const currentRange = candle.high - candle.low;
      
      // Si el rango actual es significativamente mayor que el promedio anterior
      if (currentRange > avgRange * 1.5) {
        potentialBlocks.push({
          index: i,
          candle,
          type: isBullish ? 'bullish' : 'bearish',
          volumeRatio: Math.max(volumeRatio, 0.9) // Asegurar un mínimo
        });
      }
    }

    return potentialBlocks;
  }

  /**
   * Detección basada en estructura de mercado
   */
  private identifyStructuralOrderBlocks(
    klines: OHLCV[],
    atr: number
  ): Array<{
    index: number;
    candle: OHLCV;
    type: 'bullish' | 'bearish';
    volumeRatio: number;
  }> {
    const blocks: Array<{
      index: number;
      candle: OHLCV;
      type: 'bullish' | 'bearish';
      volumeRatio: number;
    }> = [];

    // Buscar puntos de giro significativos
    for (let i = 5; i < klines.length - 5; i++) {
      const candle = klines[i];
      
      // Detectar swing lows (potential bullish OB)
      const isSwingLow = this.isSwingLow(klines, i, 5);
      if (isSwingLow) {
        // Verificar si hubo un movimiento alcista posterior
        const nextHigh = Math.max(...klines.slice(i + 1, Math.min(i + 10, klines.length)).map(k => k.high));
        const moveUp = (nextHigh - candle.low) / candle.low * 100;
        
        if (moveUp > 1.0) { // Al menos 1% de movimiento
          blocks.push({
            index: i,
            candle,
            type: 'bullish',
            volumeRatio: 1.0 // Default ya que no estamos usando volumen aquí
          });
        }
      }
      
      // Detectar swing highs (potential bearish OB)
      const isSwingHigh = this.isSwingHigh(klines, i, 5);
      if (isSwingHigh) {
        // Verificar si hubo un movimiento bajista posterior
        const nextLow = Math.min(...klines.slice(i + 1, Math.min(i + 10, klines.length)).map(k => k.low));
        const moveDown = (candle.high - nextLow) / candle.high * 100;
        
        if (moveDown > 1.0) { // Al menos 1% de movimiento
          blocks.push({
            index: i,
            candle,
            type: 'bearish',
            volumeRatio: 1.0
          });
        }
      }
    }

    return blocks;
  }

  /**
   * Detección de último recurso para asegurar al menos algunos bloques
   */
  private detectLastResortOrderBlocks(
    klines: OHLCV[],
    currentPrice: number
  ): OrderBlock[] {
    const blocks: OrderBlock[] = [];
    
    // Encontrar los 3 máximos y mínimos más significativos
    const significantLevels = this.findSignificantLevels(klines, 3);
    
    // Convertir niveles significativos en order blocks
    significantLevels.highs.forEach((level, idx) => {
      const block: OrderBlock = {
        id: `ob_bearish_lastresort_${Date.now()}_${idx}`,
        symbol: '',
        type: 'bearish',
        origin: {
          high: level.candle.high,
          low: level.candle.low,
          open: level.candle.open,
          close: level.candle.close,
          volume: level.candle.volume,
          timestamp: new Date(level.candle.timestamp).toISOString(),
          candleIndex: level.index
        },
        zone: {
          upper: level.candle.high,
          lower: Math.min(level.candle.open, level.candle.close),
          midpoint: (level.candle.high + Math.min(level.candle.open, level.candle.close)) / 2
        },
        strength: 50 + (2 - idx) * 10, // 70, 60, 50
        mitigated: currentPrice > level.candle.high,
        respectCount: 0,
        validity: 'fresh',
        createdAt: new Date().toISOString(),
        subsequentMove: { magnitude: 1.0, candles: 5, maxPrice: level.candle.low },
        volumeAtCreation: level.candle.volume,
        priceMovement: { distance: 1.0, percentage: 1.0, timeToTarget: 300 },
        institutionalSignals: { volumeMultiplier: 1.0, orderFlowImbalance: 0, absorptionLevel: 50 },
        currentDistance: Math.abs(currentPrice - level.candle.high) / currentPrice * 100,
        priceAtCreation: level.candle.close,
        marketStructure: { swingHigh: level.candle.high, structureBreak: false }
      };
      blocks.push(block);
    });
    
    significantLevels.lows.forEach((level, idx) => {
      const block: OrderBlock = {
        id: `ob_bullish_lastresort_${Date.now()}_${idx}`,
        symbol: '',
        type: 'bullish',
        origin: {
          high: level.candle.high,
          low: level.candle.low,
          open: level.candle.open,
          close: level.candle.close,
          volume: level.candle.volume,
          timestamp: new Date(level.candle.timestamp).toISOString(),
          candleIndex: level.index
        },
        zone: {
          upper: Math.max(level.candle.open, level.candle.close),
          lower: level.candle.low,
          midpoint: (Math.max(level.candle.open, level.candle.close) + level.candle.low) / 2
        },
        strength: 50 + (2 - idx) * 10, // 70, 60, 50
        mitigated: currentPrice < level.candle.low,
        respectCount: 0,
        validity: 'fresh',
        createdAt: new Date().toISOString(),
        subsequentMove: { magnitude: 1.0, candles: 5, maxPrice: level.candle.high },
        volumeAtCreation: level.candle.volume,
        priceMovement: { distance: 1.0, percentage: 1.0, timeToTarget: 300 },
        institutionalSignals: { volumeMultiplier: 1.0, orderFlowImbalance: 0, absorptionLevel: 50 },
        currentDistance: Math.abs(currentPrice - level.candle.low) / currentPrice * 100,
        priceAtCreation: level.candle.close,
        marketStructure: { swingLow: level.candle.low, structureBreak: false }
      };
      blocks.push(block);
    });
    
    return blocks;
  }

  /**
   * Helpers para detección de swings
   */
  private isSwingLow(klines: OHLCV[], index: number, lookback: number): boolean {
    if (index < lookback || index >= klines.length - lookback) return false;
    
    const current = klines[index];
    for (let i = 1; i <= lookback; i++) {
      if (klines[index - i].low < current.low || klines[index + i].low < current.low) {
        return false;
      }
    }
    return true;
  }

  private isSwingHigh(klines: OHLCV[], index: number, lookback: number): boolean {
    if (index < lookback || index >= klines.length - lookback) return false;
    
    const current = klines[index];
    for (let i = 1; i <= lookback; i++) {
      if (klines[index - i].high > current.high || klines[index + i].high > current.high) {
        return false;
      }
    }
    return true;
  }

  private findSignificantLevels(klines: OHLCV[], count: number): {
    highs: Array<{ candle: OHLCV; index: number }>;
    lows: Array<{ candle: OHLCV; index: number }>;
  } {
    // Encontrar todos los swings
    const swingHighs: Array<{ candle: OHLCV; index: number }> = [];
    const swingLows: Array<{ candle: OHLCV; index: number }> = [];
    
    for (let i = 5; i < klines.length - 5; i++) {
      if (this.isSwingHigh(klines, i, 5)) {
        swingHighs.push({ candle: klines[i], index: i });
      }
      if (this.isSwingLow(klines, i, 5)) {
        swingLows.push({ candle: klines[i], index: i });
      }
    }
    
    // Ordenar y tomar los más significativos
    swingHighs.sort((a, b) => b.candle.high - a.candle.high);
    swingLows.sort((a, b) => a.candle.low - b.candle.low);
    
    return {
      highs: swingHighs.slice(0, count),
      lows: swingLows.slice(0, count)
    };
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

      // Relajar validación de movimiento posterior
      if (subsequentMove.magnitude < this.config.minSubsequentMove * 0.7) continue;
      // Permitir más flexibilidad en el tiempo del movimiento
      if (subsequentMove.candles > this.config.maxCandlesForMove * 1.5) continue;

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
        symbol: '', // Will be set by caller
        type: potential.type,
        origin: {
          high: potential.candle.high,
          low: potential.candle.low,
          open: potential.candle.open,
          close: potential.candle.close,
          volume: potential.candle.volume,
          timestamp: new Date(potential.candle.timestamp).toISOString(),
          candleIndex: potential.index
        },
        zone,
        strength,
        mitigated: false,
        respectCount: 0,
        validity: 'fresh',
        createdAt: new Date().toISOString(),
        subsequentMove,
        // Additional required properties
        volumeAtCreation: potential.candle.volume,
        priceMovement: {
          distance: subsequentMove.magnitude,
          percentage: (subsequentMove.magnitude / potential.candle.close) * 100,
          timeToTarget: subsequentMove.candles * 60 // Assuming 1-minute candles, convert to minutes
        },
        institutionalSignals: {
          volumeMultiplier: potential.volumeRatio,
          orderFlowImbalance: 0, // TODO: Calculate based on order flow
          absorptionLevel: potential.volumeRatio * 50 // Approximation
        },
        currentDistance: 0, // Will be calculated later
        priceAtCreation: potential.candle.close,
        marketStructure: {
          swingHigh: potential.type === 'bullish' ? potential.candle.high : undefined,
          swingLow: potential.type === 'bearish' ? potential.candle.low : undefined,
          structureBreak: subsequentMove.magnitude > 2 // If move > 2 ATR, consider structure break
        }
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
    
    // Si no se encontró movimiento suficiente con ATR, usar movimiento porcentual
    if (magnitude < this.config.minSubsequentMove) {
      const percentMove = type === 'bullish' ? 
        (maxPrice - startPrice) / startPrice * 100 : 
        (startPrice - maxPrice) / startPrice * 100;
      
      // Si hay al menos 1% de movimiento, considerarlo válido
      if (percentMove >= 1.0) {
        magnitude = this.config.minSubsequentMove * 0.75; // Darle un valor mínimo aceptable
      }
    }

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
      let mitigationTime: string | undefined;
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
            mitigationTime = new Date(candle.timestamp).toISOString();
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
        validity: mitigated ? 'mitigated' : (respectCount > 0 ? 'tested' : 'fresh')
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
    
    // Normalizar componentes (0-100) con curvas más generosas
    const volumeScore = Math.min(100, Math.max(0, (volumeRatio - 0.8) * 60)); // 0.8x = 0, 1.2x = 24, 2x = 72
    const moveScore = Math.min(100, subsequentMagnitude * 35); // 1.5 ATR = 52.5, 3 ATR = 100
    const respectScore = Math.min(100, respectCount * 25); // 4 respects = 100
    const ageScore = Math.max(0, 100 - (ageInCandles / this.config.maxBlockAge) * 80); // Más generoso con edad

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

  private calculateKeyLevels(
    activeBlocks: OrderBlock[],
    breakerBlocks: OrderBlock[]
  ): { strongSupport: number[]; strongResistance: number[] } {
    const strongSupport: number[] = [];
    const strongResistance: number[] = [];

    // Procesar bloques activos
    for (const block of activeBlocks) {
      if (block.strength >= 80) {
        if (block.type === 'bullish') {
          strongSupport.push(block.zone.lower);
        } else {
          strongResistance.push(block.zone.upper);
        }
      }
    }

    // Procesar breaker blocks (actúan como niveles opuestos)
    for (const block of breakerBlocks) {
      if (block.strength >= 75) {
        if (block.type === 'bullish') {
          strongResistance.push(block.zone.upper);
        } else {
          strongSupport.push(block.zone.lower);
        }
      }
    }

    return {
      strongSupport: strongSupport.sort((a, b) => b - a), // Descendente
      strongResistance: strongResistance.sort((a, b) => a - b) // Ascendente
    };
  }

  private generateStatistics(
    allBlocks: OrderBlock[],
    activeBlocks: OrderBlock[],
    breakerBlocks: OrderBlock[]
  ): {
    totalBlocks: number;
    freshBlocks: number;
    mitigatedBlocks: number;
    breakerBlocks: number;
    avgRespectRate: number;
  } {
    const freshBlocks = allBlocks.filter(b => b.validity === 'fresh').length;
    const mitigatedBlocks = allBlocks.filter(b => b.mitigated).length;
    
    const totalRespects = allBlocks.reduce((sum, block) => sum + block.respectCount, 0);
    const avgRespectRate = allBlocks.length > 0 ? totalRespects / allBlocks.length : 0;

    return {
      totalBlocks: allBlocks.length,
      freshBlocks,
      mitigatedBlocks,
      breakerBlocks: breakerBlocks.length,
      avgRespectRate: Number(avgRespectRate.toFixed(2))
    };
  }

  private generateTradingRecommendation(
    activeBlocks: OrderBlock[],
    marketBias: 'bullish' | 'bearish' | 'neutral',
    currentPrice: number
  ): {
    action: 'buy' | 'sell' | 'wait' | 'monitor';
    confidence: number;
    reason: string;
    targets: number[];
    stopLoss?: number;
  } {
    if (activeBlocks.length === 0) {
      return {
        action: 'wait',
        confidence: 0,
        reason: 'No active order blocks detected',
        targets: []
      };
    }

    const strongBlocks = activeBlocks.filter(b => b.strength >= 75);
    const nearbyBlocks = activeBlocks.filter(b => {
      const distance = Math.abs(currentPrice - b.zone.midpoint) / currentPrice;
      return distance <= 0.02; // Within 2%
    });

    let action: 'buy' | 'sell' | 'wait' | 'monitor' = 'monitor';
    let confidence = 50;
    let reason = 'Standard monitoring of order blocks';
    let targets: number[] = [];
    let stopLoss: number | undefined;

    if (strongBlocks.length >= 2 && nearbyBlocks.length >= 1) {
      const nearestBlock = nearbyBlocks[0];
      
      if (marketBias === nearestBlock.type) {
        action = nearestBlock.type === 'bullish' ? 'buy' : 'sell';
        confidence = Math.min(90, nearestBlock.strength + 10);
        reason = `Strong ${nearestBlock.type} order block alignment with market bias`;
        
        if (nearestBlock.type === 'bullish') {
          targets = [nearestBlock.zone.upper * 1.01, nearestBlock.zone.upper * 1.02];
          stopLoss = nearestBlock.zone.lower * 0.995;
        } else {
          targets = [nearestBlock.zone.lower * 0.99, nearestBlock.zone.lower * 0.98];
          stopLoss = nearestBlock.zone.upper * 1.005;
        }
      }
    } else if (strongBlocks.length >= 1) {
      confidence = 65;
      reason = 'Strong order blocks present, monitor for entry opportunities';
    } else if (nearbyBlocks.length >= 1) {
      confidence = 55;
      reason = 'Price near order block levels, monitor for reactions';
    }

    return {
      action,
      confidence,
      reason,
      targets,
      stopLoss
    };
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
