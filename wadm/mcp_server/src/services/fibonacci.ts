/**
 * @fileoverview Fibonacci Retracement and Extension Analysis Service
 * @description Provides automated detection of Fibonacci levels with swing high/low identification
 * @version 1.0.0
 * @author wAIckoff MCP Team
 */

import { OHLCV, MarketTicker, SupportResistanceLevel } from '../types/index.js';
import { BybitMarketDataService } from './marketData.js';
import { TechnicalAnalysisService } from './analysis.js';
import { Logger } from '../utils/logger.js';

export interface FibonacciLevel {
  level: number;          // Fibonacci ratio (e.g., 0.618)
  price: number;          // Price at this level
  label: string;          // Display label (e.g., "61.8%")
  type: 'retracement' | 'extension';
  strength: number;       // 0-100 based on confluence with S/R
  distance: number;       // Distance from current price in %
}

export interface SwingPoint {
  index: number;
  timestamp: string;
  price: number;
  type: 'high' | 'low';
  strength: number;       // 0-100 based on surrounding price action
  volume: number;
  confirmed: boolean;     // Whether swing has been confirmed by subsequent price action
}

export interface FibonacciAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  trend: 'uptrend' | 'downtrend' | 'sideways';
  
  // Swing points used for calculation
  swingHigh: SwingPoint;
  swingLow: SwingPoint;
  
  // Fibonacci levels
  retracementLevels: FibonacciLevel[];
  extensionLevels: FibonacciLevel[];
  
  // Key levels with highest confluence
  keyLevels: FibonacciLevel[];
  
  // Current position relative to Fibonacci
  currentPosition: {
    nearestLevel: FibonacciLevel;
    retracement: number;    // Current retracement percentage
    nextTargets: FibonacciLevel[];
  };
  
  // Analysis metadata
  analysisTime: string;
  confidence: number;     // 0-100 based on swing strength and confluence
  validity: number;       // 0-100 based on time elapsed since swing formation
}

export interface FibonacciConfig {
  retracementLevels: number[];
  extensionLevels: number[];
  minSwingSize: number;           // Minimum swing size in %
  lookbackPeriods: number;        // Periods to look back for swings
  confluenceDistance: number;     // Distance for S/R confluence in %
  minSwingConfirmation: number;   // Periods to confirm swing
}

export class FibonacciService {
  private readonly logger = new Logger('FibonacciService');
  private readonly defaultConfig: FibonacciConfig = {
    retracementLevels: [0.236, 0.382, 0.500, 0.618, 0.786],
    extensionLevels: [1.000, 1.272, 1.414, 1.618, 2.000, 2.618],
    minSwingSize: 0.5,              // TASK-024 FIX: Reduced from 2.0% to 0.5% minimum swing
    lookbackPeriods: 100,
    confluenceDistance: 0.5,        // 0.5% for confluence
    minSwingConfirmation: 3
  };

  constructor(
    private readonly marketDataService: BybitMarketDataService,
    private readonly srService: TechnicalAnalysisService,
    private config: FibonacciConfig = {} as FibonacciConfig
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Analyze Fibonacci levels for a symbol
   */
  async analyzeFibonacci(
    symbol: string,
    timeframe: string = '60',
    customConfig?: Partial<FibonacciConfig>
  ): Promise<FibonacciAnalysis> {
    const startTime = performance.now();
    
    try {
      const config = { ...this.config, ...customConfig };
      
      // Get price data
      const klines = await this.marketDataService.getKlines(
        symbol, 
        timeframe, 
        config.lookbackPeriods
      );
      
      if (klines.length < 50) {
        throw new Error(`Insufficient data for Fibonacci analysis: ${klines.length} periods`);
      }

      const ticker = await this.marketDataService.getTicker(symbol);
      
      // Detect significant swing points
      const swings = this.detectSwingPoints(klines, config);
      
      if (swings.length < 2) {
        throw new Error('Insufficient swing points detected for Fibonacci analysis');
      }

      // Find most significant swing high and low
      const { swingHigh, swingLow } = this.findSignificantSwings(swings, klines);
      
      // Determine trend direction
      const trend = this.analyzeTrend(klines, swingHigh, swingLow);
      
      // Calculate Fibonacci levels
      const retracementLevels = this.calculateRetracementLevels(
        swingHigh, 
        swingLow, 
        config.retracementLevels
      );
      
      const extensionLevels = this.calculateExtensionLevels(
        swingHigh, 
        swingLow, 
        config.extensionLevels,
        trend
      );
      
      // Get S/R levels for confluence analysis
      const srAnalysis = await this.srService.identifySupportResistance(
        symbol, 
        timeframe, 
        config.lookbackPeriods
      );
      
      // Enhance levels with confluence data
      const enhancedRetracements = this.addConfluenceData(
        retracementLevels,
        srAnalysis.supports.concat(srAnalysis.resistances),
        config.confluenceDistance
      );
      
      const enhancedExtensions = this.addConfluenceData(
        extensionLevels,
        srAnalysis.supports.concat(srAnalysis.resistances),
        config.confluenceDistance
      );
      
      // Identify key levels (highest confluence)
      const keyLevels = this.identifyKeyLevels(
        enhancedRetracements.concat(enhancedExtensions)
      );
      
      // Analyze current position
      const currentPosition = this.analyzeCurrentPosition(
        ticker.lastPrice,
        enhancedRetracements.concat(enhancedExtensions),
        swingHigh,
        swingLow
      );
      
      // Calculate confidence and validity
      const confidence = this.calculateConfidence(swingHigh, swingLow, keyLevels);
      const validity = this.calculateValidity(swingHigh, swingLow, klines);

      const analysis: FibonacciAnalysis = {
        symbol,
        timeframe,
        currentPrice: ticker.lastPrice,
        trend,
        swingHigh,
        swingLow,
        retracementLevels: enhancedRetracements,
        extensionLevels: enhancedExtensions,
        keyLevels,
        currentPosition,
        analysisTime: new Date().toISOString(),
        confidence,
        validity
      };

      const executionTime = performance.now() - startTime;
      this.logger.info(`Fibonacci analysis completed for ${symbol} in ${executionTime.toFixed(2)}ms`);
      
      return analysis;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.logger.error(`Fibonacci analysis failed for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
        executionTime: executionTime.toFixed(2)
      });
      throw error;
    }
  }

  /**
   * Detect significant swing points in price data
   */
  private detectSwingPoints(klines: OHLCV[], config: FibonacciConfig): SwingPoint[] {
    const swings: SwingPoint[] = [];
    // TASK-024 FIX: More flexible swing detection - reduced from /20 to /30
    const minSwingBars = Math.max(2, Math.floor(config.lookbackPeriods / 30));
    
    // FASE 2 ADD: Track absolute high and low as fallback
    let absoluteHigh = { price: 0, index: 0, kline: klines[0] };
    let absoluteLow = { price: Infinity, index: 0, kline: klines[0] };

    for (let i = minSwingBars; i < klines.length - minSwingBars; i++) {
      const current = klines[i];
      
      // FASE 2 ADD: Track absolute extremes
      if (current.high > absoluteHigh.price) {
        absoluteHigh = { price: current.high, index: i, kline: current };
      }
      if (current.low < absoluteLow.price) {
        absoluteLow = { price: current.low, index: i, kline: current };
      }
      
      // Check for swing high
      let isSwingHigh = true;
      let isSwingLow = true;
      
      // Look left and right for confirmation
      for (let j = 1; j <= minSwingBars; j++) {
        if (i - j >= 0 && current.high <= klines[i - j].high) {
          isSwingHigh = false;
        }
        if (i + j < klines.length && current.high <= klines[i + j].high) {
          isSwingHigh = false;
        }
        if (i - j >= 0 && current.low >= klines[i - j].low) {
          isSwingLow = false;
        }
        if (i + j < klines.length && current.low >= klines[i + j].low) {
          isSwingLow = false;
        }
      }

      // Calculate swing strength based on price movement
      if (isSwingHigh) {
        const strength = this.calculateSwingStrength(i, 'high', klines, minSwingBars);
        const swingSize = this.calculateSwingSize(i, 'high', klines, minSwingBars);
        
        // TASK-024 FIX: Also consider strength for smaller swings
        if (swingSize >= config.minSwingSize || (swingSize >= config.minSwingSize * 0.5 && strength >= 70)) {
          swings.push({
            index: i,
            timestamp: current.timestamp,
            price: current.high,
            type: 'high',
            strength,
            volume: current.volume,
            confirmed: this.isSwingConfirmed(i, 'high', klines, config.minSwingConfirmation)
          });
        }
      }

      if (isSwingLow) {
        const strength = this.calculateSwingStrength(i, 'low', klines, minSwingBars);
        const swingSize = this.calculateSwingSize(i, 'low', klines, minSwingBars);
        
        // TASK-024 FIX: Also consider strength for smaller swings
        if (swingSize >= config.minSwingSize || (swingSize >= config.minSwingSize * 0.5 && strength >= 70)) {
          swings.push({
            index: i,
            timestamp: current.timestamp,
            price: current.low,
            type: 'low',
            strength,
            volume: current.volume,
            confirmed: this.isSwingConfirmed(i, 'low', klines, config.minSwingConfirmation)
          });
        }
      }
    }

    // Sort by strength and return most significant swings
    const confirmedSwings = swings
      .filter(swing => swing.confirmed)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 20); // Keep top 20 swings
    
    // FASE 2 ADD: Ensure we have at least one valid high and low
    const hasValidHigh = confirmedSwings.some(s => s.type === 'high');
    const hasValidLow = confirmedSwings.some(s => s.type === 'low');
    
    if (!hasValidHigh && absoluteHigh.price > 0) {
      console.log(`[Fibonacci] No valid highs found, adding absolute high: ${absoluteHigh.price}`);
      confirmedSwings.push({
        index: absoluteHigh.index,
        timestamp: absoluteHigh.kline.timestamp,
        price: absoluteHigh.price,
        type: 'high',
        strength: 60, // Lower strength for fallback
        volume: absoluteHigh.kline.volume,
        confirmed: true
      });
    }
    
    if (!hasValidLow && absoluteLow.price < Infinity) {
      console.log(`[Fibonacci] No valid lows found, adding absolute low: ${absoluteLow.price}`);
      confirmedSwings.push({
        index: absoluteLow.index,
        timestamp: absoluteLow.kline.timestamp,
        price: absoluteLow.price,
        type: 'low',
        strength: 60, // Lower strength for fallback
        volume: absoluteLow.kline.volume,
        confirmed: true
      });
    }
    
    return confirmedSwings;
  }

  /**
   * Calculate swing strength based on price movement and volume
   */
  private calculateSwingStrength(
    index: number, 
    type: 'high' | 'low', 
    klines: OHLCV[], 
    lookback: number
  ): number {
    let priceStrength = 0;
    let volumeStrength = 0;
    
    const current = klines[index];
    const price = type === 'high' ? current.high : current.low;
    
    // Calculate price strength (how much price moved)
    let totalMove = 0;
    let count = 0;
    
    for (let i = Math.max(0, index - lookback); i <= Math.min(klines.length - 1, index + lookback); i++) {
      if (i !== index) {
        const otherPrice = type === 'high' ? klines[i].high : klines[i].low;
        totalMove += Math.abs(price - otherPrice);
        count++;
      }
    }
    
    priceStrength = count > 0 ? (totalMove / count) / price * 100 : 0;
    
    // Calculate volume strength (relative to average)
    const avgVolume = klines
      .slice(Math.max(0, index - lookback), Math.min(klines.length, index + lookback))
      .reduce((sum, k) => sum + k.volume, 0) / (lookback * 2);
    
    volumeStrength = avgVolume > 0 ? (current.volume / avgVolume) * 20 : 0;
    
    // Combine price and volume strength
    return Math.min(100, priceStrength * 0.7 + volumeStrength * 0.3);
  }

  /**
   * Calculate swing size as percentage move
   */
  private calculateSwingSize(
    index: number, 
    type: 'high' | 'low', 
    klines: OHLCV[], 
    lookback: number
  ): number {
    const current = klines[index];
    const price = type === 'high' ? current.high : current.low;
    
    let extremePrice = price;
    
    // Find most extreme price in the opposite direction
    for (let i = Math.max(0, index - lookback); i <= Math.min(klines.length - 1, index + lookback); i++) {
      const comparePrice = type === 'high' ? klines[i].low : klines[i].high;
      
      if (type === 'high') {
        extremePrice = Math.min(extremePrice, comparePrice);
      } else {
        extremePrice = Math.max(extremePrice, comparePrice);
      }
    }
    
    return Math.abs((price - extremePrice) / extremePrice) * 100;
  }

  /**
   * Check if swing is confirmed by subsequent price action
   */
  private isSwingConfirmed(
    index: number, 
    type: 'high' | 'low', 
    klines: OHLCV[], 
    confirmationBars: number
  ): boolean {
    const confirmationEnd = Math.min(klines.length - 1, index + confirmationBars);
    
    if (confirmationEnd <= index) return false;
    
    const swingPrice = type === 'high' ? klines[index].high : klines[index].low;
    
    // Check if price hasn't exceeded swing in confirmation period
    for (let i = index + 1; i <= confirmationEnd; i++) {
      const testPrice = type === 'high' ? klines[i].high : klines[i].low;
      
      if (type === 'high' && testPrice > swingPrice) {
        return false;
      }
      if (type === 'low' && testPrice < swingPrice) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Find most significant swing high and low for Fibonacci calculation
   */
  private findSignificantSwings(swings: SwingPoint[], klines: OHLCV[]): {
    swingHigh: SwingPoint;
    swingLow: SwingPoint;
  } {
    const highs = swings.filter(s => s.type === 'high').sort((a, b) => b.strength - a.strength);
    const lows = swings.filter(s => s.type === 'low').sort((a, b) => b.strength - a.strength);
    
    if (highs.length === 0 || lows.length === 0) {
      throw new Error('Insufficient swing highs and lows for Fibonacci analysis');
    }

    // Find the most recent significant swing high and low that form a meaningful move
    let bestHigh = highs[0];
    let bestLow = lows[0];
    let bestScore = 0;

    for (const high of highs.slice(0, 5)) {
      for (const low of lows.slice(0, 5)) {
        // FASE 2 FIX: Ensure high is actually higher than low
        if (high.price <= low.price) {
          console.warn(`[Fibonacci] Skipping invalid swing pair: High ${high.price} <= Low ${low.price}`);
          continue;
        }
        
        // Calculate move size and time relationship
        const moveSize = Math.abs(high.price - low.price) / Math.min(high.price, low.price) * 100;
        const timeDistance = Math.abs(high.index - low.index);
        const recentScore = Math.max(0, 100 - (klines.length - Math.max(high.index, low.index)));
        
        // Score based on move size, time relationship, and recency
        const score = moveSize * 0.4 + (high.strength + low.strength) * 0.3 + recentScore * 0.3;
        
        // TASK-024 FIX: Reduced move size requirement from 3.0% to 1.0%, time distance from 5 to 3
        if (score > bestScore && moveSize >= 1.0 && timeDistance >= 3) {
          bestScore = score;
          bestHigh = high;
          bestLow = low;
        }
      }
    }

    // FASE 2 FIX: Final validation and fallback
    if (bestHigh.price <= bestLow.price) {
      console.warn(`[Fibonacci] Best swings invalid, searching for valid pair...`);
      
      // Find the actual highest high and lowest low in the dataset
      const actualHighest = highs.reduce((prev, current) => 
        (current.price > prev.price) ? current : prev
      );
      const actualLowest = lows.reduce((prev, current) => 
        (current.price < prev.price) ? current : prev
      );
      
      // If even these are invalid, we need to search the raw data
      if (actualHighest.price <= actualLowest.price) {
        console.error(`[Fibonacci] Critical: All swings invalid. Using raw data fallback.`);
        
        // Find absolute high and low from raw klines
        let rawHigh = klines[0];
        let rawLow = klines[0];
        let highIndex = 0;
        let lowIndex = 0;
        
        klines.forEach((k, idx) => {
          if (k.high > rawHigh.high) {
            rawHigh = k;
            highIndex = idx;
          }
          if (k.low < rawLow.low) {
            rawLow = k;
            lowIndex = idx;
          }
        });
        
        bestHigh = {
          index: highIndex,
          timestamp: rawHigh.timestamp,
          price: rawHigh.high,
          type: 'high',
          strength: 75, // Default strength
          volume: rawHigh.volume,
          confirmed: true
        };
        
        bestLow = {
          index: lowIndex,
          timestamp: rawLow.timestamp,
          price: rawLow.low,
          type: 'low',
          strength: 75, // Default strength
          volume: rawLow.volume,
          confirmed: true
        };
      } else {
        bestHigh = actualHighest;
        bestLow = actualLowest;
      }
    }

    console.log(`[Fibonacci] Selected swings - High: ${bestHigh.price}, Low: ${bestLow.price}, Distance: ${bestHigh.price - bestLow.price}`);
    return { swingHigh: bestHigh, swingLow: bestLow };
  }

  /**
   * Analyze overall trend direction
   */
  private analyzeTrend(
    klines: OHLCV[], 
    swingHigh: SwingPoint, 
    swingLow: SwingPoint
  ): 'uptrend' | 'downtrend' | 'sideways' {
    const recentPeriods = Math.min(50, klines.length);
    const recentKlines = klines.slice(-recentPeriods);
    
    // Calculate trend based on recent price action and swing relationship
    const firstPrice = recentKlines[0].close;
    const lastPrice = recentKlines[recentKlines.length - 1].close;
    const priceChange = (lastPrice - firstPrice) / firstPrice * 100;
    
    // Consider swing relationship
    const swingTrend = swingHigh.index > swingLow.index ? 'uptrend_formation' : 'downtrend_formation';
    
    if (Math.abs(priceChange) < 2) {
      return 'sideways';
    } else if (priceChange > 0) {
      return 'uptrend';
    } else {
      return 'downtrend';
    }
  }

  /**
   * Calculate Fibonacci retracement levels
   */
  private calculateRetracementLevels(
    swingHigh: SwingPoint,
    swingLow: SwingPoint,
    levels: number[]
  ): FibonacciLevel[] {
    // FASE 2 FIX: Always ensure high > low for calculations
    const highPrice = Math.max(swingHigh.price, swingLow.price);
    const lowPrice = Math.min(swingHigh.price, swingLow.price);
    const range = highPrice - lowPrice;
    
    if (range <= 0) {
      console.error(`[Fibonacci] Invalid range for retracement: ${range}`);
      throw new Error('Invalid price range for Fibonacci calculation');
    }

    return levels.map(level => ({
      level,
      price: highPrice - (range * level),
      label: `${(level * 100).toFixed(1)}%`,
      type: 'retracement' as const,
      strength: 0, // Will be calculated with confluence
      distance: 0  // Will be calculated with current price
    }));
  }

  /**
   * Calculate Fibonacci extension levels
   */
  private calculateExtensionLevels(
    swingHigh: SwingPoint,
    swingLow: SwingPoint,
    levels: number[],
    trend: 'uptrend' | 'downtrend' | 'sideways'
  ): FibonacciLevel[] {
    // FASE 2 FIX: Always ensure high > low for calculations
    const highPrice = Math.max(swingHigh.price, swingLow.price);
    const lowPrice = Math.min(swingHigh.price, swingLow.price);
    const range = highPrice - lowPrice;
    
    if (range <= 0) {
      console.error(`[Fibonacci] Invalid range for extension: ${range}`);
      throw new Error('Invalid price range for Fibonacci calculation');
    }

    return levels.map(level => {
      let price: number;
      
      // Extension direction based on trend and swing order
      if (swingHigh.index > swingLow.index) {
        // Recent high after low - extensions above high
        price = highPrice + (range * (level - 1));
      } else {
        // Recent low after high - extensions below low
        price = lowPrice - (range * (level - 1));
      }

      return {
        level,
        price,
        label: `${(level * 100).toFixed(1)}%`,
        type: 'extension' as const,
        strength: 0, // Will be calculated with confluence
        distance: 0  // Will be calculated with current price
      };
    });
  }

  /**
   * Add confluence data from S/R levels
   */
  private addConfluenceData(
    fibLevels: FibonacciLevel[],
    srLevels: SupportResistanceLevel[],
    confluenceDistance: number
  ): FibonacciLevel[] {
    return fibLevels.map(fibLevel => {
      let maxStrength = 0;
      
      // Find nearby S/R levels
      for (const srLevel of srLevels) {
        const distance = Math.abs(fibLevel.price - srLevel.level) / fibLevel.price * 100;
        
        if (distance <= confluenceDistance) {
          // Add S/R strength to Fibonacci level
          const confluenceStrength = srLevel.strength * (1 - distance / confluenceDistance);
          maxStrength = Math.max(maxStrength, confluenceStrength);
        }
      }
      
      return {
        ...fibLevel,
        strength: Math.min(100, fibLevel.strength + maxStrength)
      };
    });
  }

  /**
   * Identify key levels with highest confluence
   */
  private identifyKeyLevels(allLevels: FibonacciLevel[]): FibonacciLevel[] {
    return allLevels
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 8); // Top 8 key levels
  }

  /**
   * Analyze current price position relative to Fibonacci levels
   */
  private analyzeCurrentPosition(
    currentPrice: number,
    allLevels: FibonacciLevel[],
    swingHigh: SwingPoint,
    swingLow: SwingPoint
  ): FibonacciAnalysis['currentPosition'] {
    // FASE 2 FIX: Ensure proper calculation with validated swings
    const highPrice = Math.max(swingHigh.price, swingLow.price);
    const lowPrice = Math.min(swingHigh.price, swingLow.price);
    const range = highPrice - lowPrice;
    const retracement = range > 0 ? (highPrice - currentPrice) / range : 0;
    
    // Find nearest level
    let nearestLevel = allLevels[0];
    let minDistance = Math.abs(currentPrice - allLevels[0].price);
    
    allLevels.forEach(level => {
      level.distance = (level.price - currentPrice) / currentPrice * 100;
      
      const distance = Math.abs(currentPrice - level.price);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = level;
      }
    });
    
    // Find next potential targets (levels above and below current price)
    const nextTargets = allLevels
      .filter(level => Math.abs(level.distance) > 0.1) // Exclude current level
      .sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance))
      .slice(0, 4);

    return {
      nearestLevel,
      retracement: retracement * 100,
      nextTargets
    };
  }

  /**
   * Calculate analysis confidence based on swing quality and level confluence
   */
  private calculateConfidence(
    swingHigh: SwingPoint,
    swingLow: SwingPoint,
    keyLevels: FibonacciLevel[]
  ): number {
    // Swing strength component (40%)
    const swingConfidence = (swingHigh.strength + swingLow.strength) / 2 * 0.4;
    
    // Level confluence component (40%)
    const avgLevelStrength = keyLevels.reduce((sum, level) => sum + level.strength, 0) / keyLevels.length;
    const confluenceConfidence = avgLevelStrength * 0.4;
    
    // Time validity component (20%)
    const timeConfidence = Math.min(swingHigh.confirmed && swingLow.confirmed ? 100 : 50, 100) * 0.2;
    
    return Math.min(100, swingConfidence + confluenceConfidence + timeConfidence);
  }

  /**
   * Calculate analysis validity based on time elapsed since swing formation
   */
  private calculateValidity(
    swingHigh: SwingPoint,
    swingLow: SwingPoint,
    klines: OHLCV[]
  ): number {
    const latestSwingIndex = Math.max(swingHigh.index, swingLow.index);
    const barsElapsed = klines.length - 1 - latestSwingIndex;
    
    // Validity decreases over time
    const maxValidBars = 100; // Valid for 100 bars
    const validity = Math.max(0, 100 - (barsElapsed / maxValidBars * 100));
    
    return validity;
  }
}
