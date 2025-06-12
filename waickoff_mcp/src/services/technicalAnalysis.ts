/**
 * @fileoverview Technical Analysis Integration Service
 * @description Combines Fibonacci, Bollinger Bands, and Elliott Wave analysis with confluence detection
 * @version 1.1.0 - TASK-022 FASE 1A Implementation
 * @author wAIckoff MCP Team
 */

import { OHLCV, MarketTicker, SupportResistanceLevel } from '../types/index.js';
import { BybitMarketDataService } from './marketData.js';
import { TechnicalAnalysisService } from './analysis.js';
import { FibonacciService, FibonacciAnalysis } from './fibonacci.js';
import { BollingerBandsService, BollingerAnalysis } from './bollingerBands.js';
import { ElliottWaveService, ElliottWaveAnalysis } from './elliottWave.js';
import { Logger } from '../utils/logger.js';

// ====================
// TASK-022: New Interfaces for Level Collection
// ====================

export interface LevelData {
  price: number;
  indicator: string;
  type: 'support' | 'resistance' | 'target';
  strength: number;        // 0-100 fuerza del nivel
  timeframe: string;       // En qué timeframe es relevante
  source: string;          // Identificador específico (ej: "fib_618", "bb_upper")
  metadata?: any;          // Datos adicionales del indicador
}

export interface LevelCluster {
  averagePrice: number;    // Precio promedio del cluster
  priceRange: {           // Rango de precios en el cluster
    min: number;
    max: number;
  };
  indicators: string[];    // Indicadores que contribuyen
  levels: LevelData[];     // Niveles originales
  strength: number;        // Fuerza combinada del cluster
  type: 'support' | 'resistance' | 'target';
  distance: number;        // Distancia del precio actual en %
}

export interface TechnicalConfluence {
  level: number;             // Price level where confluence occurs
  indicators: string[];      // Which indicators converge at this level
  strength: number;          // 0-100 strength of confluence
  type: 'support' | 'resistance' | 'target';
  distance: number;          // Distance from current price in %
  actionable: boolean;       // Whether this creates trading opportunity
  cluster: LevelCluster;     // Datos detallados del cluster
}

export interface TechnicalSignal {
  signal: 'strong_buy' | 'buy' | 'weak_buy' | 'hold' | 'weak_sell' | 'sell' | 'strong_sell';
  strength: number;          // 0-100 overall signal strength
  timeframe: 'short' | 'medium' | 'long';
  confluence: TechnicalConfluence[];
  reasoning: string[];       // Array of reasons supporting the signal
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  confidence: number;        // 0-100 confidence in signal
}

export interface ComprehensiveTechnicalAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  
  // Individual analyses
  fibonacci: FibonacciAnalysis;
  bollingerBands: BollingerAnalysis;
  elliottWave: ElliottWaveAnalysis;
  
  // Confluence analysis
  confluences: TechnicalConfluence[];
  
  // TASK-022: Enhanced confluence data
  confluenceMetrics: {
    totalLevelsCollected: number;
    clustersFormed: number;
    confluencesFound: number;
    actionableConfluences: number;
    keyConfluences: TechnicalConfluence[];
  };
  
  // Integrated signals
  signals: {
    immediate: TechnicalSignal;     // Next 1-5 periods
    shortTerm: TechnicalSignal;     // Next 5-20 periods
    mediumTerm: TechnicalSignal;    // Next 20-100 periods
  };
  
  // Market structure assessment
  marketStructure: {
    trend: 'strong_uptrend' | 'uptrend' | 'sideways' | 'downtrend' | 'strong_downtrend';
    phase: 'accumulation' | 'markup' | 'distribution' | 'markdown' | 'transition';
    volatility: 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
    momentum: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  };
  
  // Key levels for trading
  keyLevels: {
    immediateSupport: number[];    // Next 1-3 support levels
    immediateResistance: number[]; // Next 1-3 resistance levels
    targets: {                     // Price targets with timeframes
      conservative: { price: number; timeframe: string; probability: number; };
      normal: { price: number; timeframe: string; probability: number; };
      optimistic: { price: number; timeframe: string; probability: number; };
    };
    stopLoss: {                    // Suggested stop loss levels
      tight: number;               // For scalping/day trading
      normal: number;              // For swing trading
      wide: number;                // For position trading
    };
  };
  
  // Risk assessment
  riskAssessment: {
    overall: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    factors: string[];             // Risk factors identified
    opportunities: string[];       // Opportunities identified
    warnings: string[];            // Warnings for traders
  };
  
  // Analysis metadata
  analysisTime: string;
  confidence: number;             // Overall analysis confidence
  dataQuality: number;            // Quality of underlying data
  recommendedTimeframe: string;   // Best timeframe for this setup
}

export interface TechnicalAnalysisConfig {
  fibonacci: {
    enabled: boolean;
    weight: number;              // Weight in confluence calculations
  };
  bollingerBands: {
    enabled: boolean;
    weight: number;
  };
  elliottWave: {
    enabled: boolean;
    weight: number;
  };
  confluence: {
    minIndicators: number;       // Minimum indicators for confluence
    distanceTolerance: number;   // % tolerance for level grouping
    minStrength: number;         // Minimum strength to be actionable
    maxDistance: number;         // Maximum distance from current price %
    indicatorWeights: {          // Pesos por indicador
      fibonacci: number;
      bollinger: number;
      elliott: number;
      support_resistance: number;
      wyckoff: number;
    };
  };
  signals: {
    conservativeMode: boolean;   // More conservative signal generation
    requireConfluence: boolean;  // Require confluence for strong signals
    minimumConfidence: number;   // Minimum confidence for signals
  };
}

export class ComprehensiveTechnicalAnalysisService {
  private readonly logger = new Logger('TechnicalAnalysisService');
  private readonly defaultConfig: TechnicalAnalysisConfig = {
    fibonacci: { enabled: true, weight: 0.3 },
    bollingerBands: { enabled: true, weight: 0.35 },
    elliottWave: { enabled: true, weight: 0.35 },
    confluence: {
      minIndicators: 2,
      distanceTolerance: 0.5,      // 0.5%
      minStrength: 60,
      maxDistance: 10,             // 10%
      indicatorWeights: {
        fibonacci: 1.0,
        bollinger: 0.9,
        elliott: 0.8,
        support_resistance: 1.1,
        wyckoff: 0.7
      }
    },
    signals: {
      conservativeMode: false,
      requireConfluence: true,
      minimumConfidence: 65
    }
  };

  constructor(
    private readonly marketDataService: BybitMarketDataService,
    private readonly srService: TechnicalAnalysisService,
    private readonly fibonacciService: FibonacciService,
    private readonly bollingerService: BollingerBandsService,
    private readonly elliottWaveService: ElliottWaveService,
    private config: TechnicalAnalysisConfig = {} as TechnicalAnalysisConfig
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Perform comprehensive technical analysis with all indicators
   */
  async analyzeWithAllIndicators(
    symbol: string,
    timeframe: string = '60',
    customConfig?: Partial<TechnicalAnalysisConfig>
  ): Promise<ComprehensiveTechnicalAnalysis> {
    const startTime = performance.now();
    
    try {
      const config = { ...this.config, ...customConfig };
      
      // Get current price for reference
      const ticker = await this.marketDataService.getTicker(symbol);
      
      this.logger.info(`🎯 TASK-022 FASE 1A: Starting comprehensive technical analysis for ${symbol} on ${timeframe} timeframe`);
      
      // Perform individual analyses in parallel for efficiency
      const [fibonacciAnalysis, bollingerAnalysis, elliottWaveAnalysis, srAnalysis] = await Promise.all([
        config.fibonacci.enabled ? 
          this.fibonacciService.analyzeFibonacci(symbol, timeframe) : 
          null,
        config.bollingerBands.enabled ? 
          this.bollingerService.analyzeBollingerBands(symbol, timeframe) : 
          null,
        config.elliottWave.enabled ? 
          this.elliottWaveService.analyzeElliottWave(symbol, timeframe) : 
          null,
        // TASK-022: También incluir S/R analysis
        this.srService.identifySupportResistance(symbol, timeframe, 100)
      ]);
      
      this.logger.info(`✅ Individual analyses completed for ${symbol}`);
      
      // TASK-022 FASE 1A: Detect confluences with enhanced collection
      const confluences = await this.detectConfluencesEnhanced(
        ticker.lastPrice,
        fibonacciAnalysis,
        bollingerAnalysis,
        elliottWaveAnalysis,
        srAnalysis,
        config,
        symbol,
        timeframe
      );
      
      this.logger.info(`✅ TASK-022: Confluences detected: ${confluences.length} for ${symbol}`);
      
      // Analyze market structure
      const marketStructure = this.analyzeMarketStructure(
        fibonacciAnalysis,
        bollingerAnalysis,
        elliottWaveAnalysis
      );
      
      // Generate integrated signals
      const signals = this.generateIntegratedSignals(
        ticker.lastPrice,
        fibonacciAnalysis,
        bollingerAnalysis,
        elliottWaveAnalysis,
        confluences,
        marketStructure,
        config
      );
      
      // Identify key levels for trading
      const keyLevels = this.identifyKeyLevels(
        ticker.lastPrice,
        fibonacciAnalysis,
        bollingerAnalysis,
        elliottWaveAnalysis,
        confluences
      );
      
      // Assess overall risk
      const riskAssessment = this.assessRisk(
        fibonacciAnalysis,
        bollingerAnalysis,
        elliottWaveAnalysis,
        marketStructure,
        signals
      );
      
      // Calculate overall confidence and quality metrics
      const confidence = this.calculateOverallConfidence(
        fibonacciAnalysis,
        bollingerAnalysis,
        elliottWaveAnalysis,
        confluences.length
      );
      
      const dataQuality = this.assessOverallDataQuality(
        fibonacciAnalysis,
        bollingerAnalysis,
        elliottWaveAnalysis
      );
      
      // Determine recommended timeframe
      const recommendedTimeframe = this.determineRecommendedTimeframe(
        marketStructure,
        signals,
        timeframe
      );

      // TASK-022: Enhanced confluence metrics
      const confluenceMetrics = {
        totalLevelsCollected: confluences.reduce((sum, c) => sum + c.cluster.levels.length, 0),
        clustersFormed: confluences.length,
        confluencesFound: confluences.length,
        actionableConfluences: confluences.filter(c => c.actionable).length,
        keyConfluences: confluences.filter(c => c.strength >= 75).slice(0, 5)
      };

      const analysis: ComprehensiveTechnicalAnalysis = {
        symbol,
        timeframe,
        currentPrice: ticker.lastPrice,
        fibonacci: fibonacciAnalysis!,
        bollingerBands: bollingerAnalysis!,
        elliottWave: elliottWaveAnalysis!,
        confluences,
        confluenceMetrics,
        signals,
        marketStructure,
        keyLevels,
        riskAssessment,
        analysisTime: new Date().toISOString(),
        confidence,
        dataQuality,
        recommendedTimeframe
      };

      const executionTime = performance.now() - startTime;
      this.logger.info(`✅ TASK-022 FASE 1A: Comprehensive technical analysis completed for ${symbol} in ${executionTime.toFixed(2)}ms`);
      this.logger.info(`📊 Confluences Found: ${confluenceMetrics.confluencesFound}, Actionable: ${confluenceMetrics.actionableConfluences}`);
      
      return analysis;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.logger.error(`❌ TASK-022: Comprehensive technical analysis failed for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
        executionTime: executionTime.toFixed(2)
      });
      throw error;
    }
  }

  /**
   * TASK-022 FASE 1B: Enhanced confluence detection with optimized clustering
   */
  private async detectConfluencesEnhanced(
    currentPrice: number,
    fibonacci: FibonacciAnalysis | null,
    bollinger: BollingerAnalysis | null,
    elliott: ElliottWaveAnalysis | null,
    supportResistance: any | null,
    config: TechnicalAnalysisConfig,
    symbol: string,
    timeframe: string
  ): Promise<TechnicalConfluence[]> {
    this.logger.info(`🔥 TASK-022 FASE 1B: Starting enhanced confluence detection for ${symbol}`);
    
    // FASE 1A: RECOLECCIÓN COMPLETA DE NIVELES (Ya implementado)
    const allLevels: LevelData[] = [];
    
    try {
      // 1. FIBONACCI LEVELS
      if (fibonacci && config.fibonacci.enabled) {
        this.logger.debug(`📈 Collecting Fibonacci levels...`);
        
        // Retracement levels
        fibonacci.retracementLevels.forEach(level => {
          allLevels.push({
            price: level.price,
            indicator: 'Fibonacci',
            type: level.price > currentPrice ? 'resistance' : 'support',
            strength: level.strength,
            timeframe,
            source: `fib_ret_${level.label}`,
            metadata: { 
              fibLevel: level.level,
              label: level.label,
              levelType: 'retracement'
            }
          });
        });
        
        // Extension levels
        fibonacci.extensionLevels.forEach(level => {
          allLevels.push({
            price: level.price,
            indicator: 'Fibonacci',
            type: 'target',
            strength: level.strength,
            timeframe,
            source: `fib_ext_${level.label}`,
            metadata: { 
              fibLevel: level.level,
              label: level.label,
              levelType: 'extension'
            }
          });
        });
        
        // Key levels (highest confluence)
        fibonacci.keyLevels.forEach(level => {
          allLevels.push({
            price: level.price,
            indicator: 'Fibonacci',
            type: level.price > currentPrice ? 'resistance' : 'support',
            strength: Math.min(100, level.strength + 20), // Key levels get bonus
            timeframe,
            source: `fib_key_${level.label}`,
            metadata: { 
              fibLevel: level.level,
              label: level.label,
              levelType: 'key'
            }
          });
        });
        
        this.logger.debug(`✅ Fibonacci: ${fibonacci.retracementLevels.length + fibonacci.extensionLevels.length + fibonacci.keyLevels.length} levels collected`);
      }
      
      // 2. BOLLINGER BANDS LEVELS
      if (bollinger && config.bollingerBands.enabled) {
        this.logger.debug(`📊 Collecting Bollinger Bands levels...`);
        
        allLevels.push({
          price: bollinger.currentBands.upper,
          indicator: 'Bollinger Bands',
          type: 'resistance',
          strength: 70 + (bollinger.squeeze.isActive ? 15 : 0),
          timeframe,
          source: 'bb_upper',
          metadata: {
            bandType: 'upper',
            bandwidth: bollinger.currentBands.bandwidth,
            position: bollinger.currentBands.position,
            squeeze: bollinger.squeeze.isActive
          }
        });
        
        allLevels.push({
          price: bollinger.currentBands.lower,
          indicator: 'Bollinger Bands',
          type: 'support',
          strength: 70 + (bollinger.squeeze.isActive ? 15 : 0),
          timeframe,
          source: 'bb_lower',
          metadata: {
            bandType: 'lower',
            bandwidth: bollinger.currentBands.bandwidth,
            position: bollinger.currentBands.position,
            squeeze: bollinger.squeeze.isActive
          }
        });
        
        allLevels.push({
          price: bollinger.currentBands.middle,
          indicator: 'Bollinger Bands',
          type: bollinger.currentBands.middle > currentPrice ? 'resistance' : 'support',
          strength: 50 + (bollinger.walk.isWalking ? 20 : 0),
          timeframe,
          source: 'bb_middle',
          metadata: {
            bandType: 'middle',
            bandwidth: bollinger.currentBands.bandwidth,
            position: bollinger.currentBands.position,
            walking: bollinger.walk.isWalking
          }
        });
        
        this.logger.debug(`✅ Bollinger Bands: 3 levels collected`);
      }
      
      // 3. ELLIOTT WAVE PROJECTIONS
      if (elliott && config.elliottWave.enabled) {
        this.logger.debug(`🌊 Collecting Elliott Wave levels...`);
        
        elliott.projections.forEach((projection, index) => {
          Object.entries(projection.targets).forEach(([targetType, price]) => {
            if (typeof price === 'number' && price > 0) {
              allLevels.push({
                price: price,
                indicator: 'Elliott Wave',
                type: 'target',
                strength: projection.probability,
                timeframe,
                source: `elliott_${targetType}_${index}`,
                metadata: {
                  targetType,
                  probability: projection.probability,
                  projectionIndex: index
                }
              });
            }
          });
        });
        
        this.logger.debug(`✅ Elliott Wave: ${elliott.projections.length} projections collected`);
      }
      
      // 4. SUPPORT/RESISTANCE LEVELS
      if (supportResistance && supportResistance.supports && supportResistance.resistances) {
        this.logger.debug(`🏗️ Collecting Support/Resistance levels...`);
        
        // Support levels
        supportResistance.supports.forEach((level: any, index: number) => {
          allLevels.push({
            price: level.level,
            indicator: 'Support/Resistance',
            type: 'support',
            strength: level.strength,
            timeframe,
            source: `sr_support_${index}`,
            metadata: {
              levelType: 'support',
              touches: level.touches || 0,
              lastTouch: level.lastTouch,
              volume: level.volume || 0
            }
          });
        });
        
        // Resistance levels
        supportResistance.resistances.forEach((level: any, index: number) => {
          allLevels.push({
            price: level.level,
            indicator: 'Support/Resistance',
            type: 'resistance',
            strength: level.strength,
            timeframe,
            source: `sr_resistance_${index}`,
            metadata: {
              levelType: 'resistance',
              touches: level.touches || 0,
              lastTouch: level.lastTouch,
              volume: level.volume || 0
            }
          });
        });
        
        this.logger.debug(`✅ Support/Resistance: ${supportResistance.supports.length + supportResistance.resistances.length} levels collected`);
      }
      
      // 5. APLICAR FILTROS DE DISTANCIA Y CALIDAD
      const filteredLevels = allLevels.filter(level => {
        const distance = Math.abs(level.price - currentPrice) / currentPrice * 100;
        return distance <= config.confluence.maxDistance && level.strength >= 20;
      });
      
      this.logger.info(`📊 TASK-022: Total levels collected: ${allLevels.length}, Filtered: ${filteredLevels.length}`);
      
      // FASE 1B: CLUSTERING OPTIMIZADO
      const confluences = this.clusterLevelsByProximityEnhanced(
        filteredLevels,
        currentPrice,
        config,
        symbol,
        timeframe
      );
      
      this.logger.info(`✅ TASK-022 FASE 1B: Enhanced confluences formed: ${confluences.length}`);
      
      return confluences;
      
    } catch (error) {
      this.logger.error(`❌ TASK-022: Error in confluence detection`, error);
      return [];
    }
  }

  /**
   * TASK-022 FASE 1B: Enhanced clustering algorithm with optimized grouping
   */
  private clusterLevelsByProximityEnhanced(
    levels: LevelData[],
    currentPrice: number,
    config: TechnicalAnalysisConfig,
    symbol: string,
    timeframe: string
  ): TechnicalConfluence[] {
    this.logger.debug(`🔍 TASK-022 FASE 1B: Starting enhanced clustering for ${symbol} with ${levels.length} levels`);
    
    if (levels.length === 0) {
      this.logger.warn(`⚠️ No levels to cluster`);
      return [];
    }
    
    // PASO 1: Calcular tolerancia adaptativa basada en volatilidad y timeframe
    const adaptiveTolerance = this.calculateAdaptiveTolerance(
      config.confluence.distanceTolerance,
      symbol,
      timeframe,
      currentPrice
    );
    
    this.logger.debug(`📏 Adaptive tolerance: ${adaptiveTolerance.toFixed(3)}% (base: ${config.confluence.distanceTolerance}%)`);
    
    // PASO 2: Clustering jerárquico
    const clusters = this.performHierarchicalClustering(
      levels,
      adaptiveTolerance / 100,
      config
    );
    
    this.logger.debug(`🔗 Hierarchical clustering produced ${clusters.length} initial clusters`);
    
    // PASO 3: Merge de clusters solapados
    const mergedClusters = this.mergeOverlappingClusters(
      clusters,
      adaptiveTolerance / 100
    );
    
    this.logger.debug(`🔗 After merging: ${mergedClusters.length} clusters`);
    
    // PASO 4: Crear confluencias con scoring mejorado
    const confluences = this.createConfluencesFromClusters(
      mergedClusters,
      currentPrice,
      config,
      symbol,
      timeframe
    );
    
    // PASO 5: Filtrado final y sorting inteligente
    const finalConfluences = this.filterAndSortConfluences(
      confluences,
      config,
      currentPrice
    );
    
    this.logger.info(`✅ TASK-022 FASE 1B: Final confluences: ${finalConfluences.length} (from ${levels.length} levels)`);
    
    return finalConfluences;
  }

  /**
   * TASK-022 FASE 1B: Calculate adaptive tolerance based on market conditions
   */
  private calculateAdaptiveTolerance(
    baseTolerance: number,
    symbol: string,
    timeframe: string,
    currentPrice: number
  ): number {
    let adaptiveTolerance = baseTolerance;
    
    // Adjust based on timeframe (higher timeframes = wider tolerance)
    const timeframeMultiplier = {
      '5': 0.7,
      '15': 0.8,
      '30': 0.9,
      '60': 1.0,
      '240': 1.2,
      'D': 1.5
    }[timeframe] || 1.0;
    
    adaptiveTolerance *= timeframeMultiplier;
    
    // Adjust based on price level (higher prices = wider tolerance)
    if (currentPrice > 100) {
      adaptiveTolerance *= 1.2;
    } else if (currentPrice < 1) {
      adaptiveTolerance *= 0.8;
    }
    
    // Adjust based on symbol type
    if (symbol.includes('BTC')) {
      adaptiveTolerance *= 1.1; // Bitcoin is more volatile
    } else if (symbol.includes('USDT') || symbol.includes('USDC')) {
      adaptiveTolerance *= 0.9; // Stablecoins are more precise
    }
    
    // Ensure tolerance stays within reasonable bounds
    return Math.max(0.2, Math.min(2.0, adaptiveTolerance));
  }

  /**
   * TASK-022 FASE 1B: Hierarchical clustering algorithm
   */
  private performHierarchicalClustering(
    levels: LevelData[],
    tolerance: number,
    config: TechnicalAnalysisConfig
  ): LevelData[][] {
    const clusters: LevelData[][] = [];
    const processedIndices = new Set<number>();
    
    // Sort levels by price for efficient clustering
    const sortedLevels = [...levels].sort((a, b) => a.price - b.price);
    
    for (let i = 0; i < sortedLevels.length; i++) {
      if (processedIndices.has(i)) continue;
      
      const currentLevel = sortedLevels[i];
      const cluster: LevelData[] = [currentLevel];
      processedIndices.add(i);
      
      // Find nearby levels within tolerance
      for (let j = i + 1; j < sortedLevels.length; j++) {
        if (processedIndices.has(j)) continue;
        
        const candidateLevel = sortedLevels[j];
        const distance = Math.abs(currentLevel.price - candidateLevel.price) / currentLevel.price;
        
        if (distance <= tolerance) {
          cluster.push(candidateLevel);
          processedIndices.add(j);
        } else {
          // Since levels are sorted, no more levels will be close enough
          break;
        }
      }
      
      // Only keep clusters with minimum indicators
      const uniqueIndicators = [...new Set(cluster.map(l => l.indicator))];
      if (uniqueIndicators.length >= config.confluence.minIndicators) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  /**
   * TASK-022 FASE 1B: Merge overlapping clusters
   */
  private mergeOverlappingClusters(
    clusters: LevelData[][],
    tolerance: number
  ): LevelData[][] {
    const mergedClusters: LevelData[][] = [];
    const processedIndices = new Set<number>();
    
    for (let i = 0; i < clusters.length; i++) {
      if (processedIndices.has(i)) continue;
      
      let currentCluster = [...clusters[i]];
      processedIndices.add(i);
      
      // Check for overlapping clusters
      for (let j = i + 1; j < clusters.length; j++) {
        if (processedIndices.has(j)) continue;
        
        const otherCluster = clusters[j];
        
        // Calculate cluster centers
        const currentCenter = currentCluster.reduce((sum, l) => sum + l.price, 0) / currentCluster.length;
        const otherCenter = otherCluster.reduce((sum, l) => sum + l.price, 0) / otherCluster.length;
        
        const centerDistance = Math.abs(currentCenter - otherCenter) / currentCenter;
        
        // Merge if clusters are close enough
        if (centerDistance <= tolerance * 1.5) {
          currentCluster = [...currentCluster, ...otherCluster];
          processedIndices.add(j);
        }
      }
      
      mergedClusters.push(currentCluster);
    }
    
    return mergedClusters;
  }

  /**
   * TASK-022 FASE 1B: Create confluences from clusters with enhanced scoring
   */
  private createConfluencesFromClusters(
    clusters: LevelData[][],
    currentPrice: number,
    config: TechnicalAnalysisConfig,
    symbol: string,
    timeframe: string
  ): TechnicalConfluence[] {
    const confluences: TechnicalConfluence[] = [];
    
    for (const cluster of clusters) {
      if (cluster.length < config.confluence.minIndicators) continue;
      
      // Create enhanced cluster with improved calculations
      const enhancedCluster = this.createEnhancedLevelCluster(
        cluster,
        currentPrice,
        config,
        symbol,
        timeframe
      );
      
      if (enhancedCluster.strength >= config.confluence.minStrength) {
        const uniqueIndicators = [...new Set(cluster.map(l => l.indicator))];
        
        const confluence: TechnicalConfluence = {
          level: enhancedCluster.averagePrice,
          indicators: uniqueIndicators,
          strength: enhancedCluster.strength,
          type: enhancedCluster.type,
          distance: enhancedCluster.distance,
          actionable: enhancedCluster.strength >= 70 && uniqueIndicators.length >= 2,
          cluster: enhancedCluster
        };
        
        confluences.push(confluence);
      }
    }
    
    return confluences;
  }

  /**
   * TASK-022 FASE 1B: Create enhanced level cluster with improved scoring
   */
  private createEnhancedLevelCluster(
    levels: LevelData[],
    currentPrice: number,
    config: TechnicalAnalysisConfig,
    symbol: string,
    timeframe: string
  ): LevelCluster {
    if (levels.length === 0) {
      throw new Error('Cannot create cluster with no levels');
    }
    
    // Calculate weighted average price with enhanced weighting
    let totalWeight = 0;
    let weightedPriceSum = 0;
    
    levels.forEach(level => {
      const baseIndicatorWeight = config.confluence.indicatorWeights[
        level.indicator.toLowerCase().replace(/[^a-z]/g, '_') as keyof typeof config.confluence.indicatorWeights
      ] || 1.0;
      
      // Enhanced weight calculation
      const strengthWeight = level.strength / 100;
      const recencyWeight = this.calculateRecencyWeight(level, timeframe);
      const qualityWeight = this.calculateQualityWeight(level);
      
      const totalLevelWeight = baseIndicatorWeight * strengthWeight * recencyWeight * qualityWeight;
      
      weightedPriceSum += level.price * totalLevelWeight;
      totalWeight += totalLevelWeight;
    });
    
    const averagePrice = totalWeight > 0 ? weightedPriceSum / totalWeight : levels[0].price;
    
    // Calculate price range and spread
    const prices = levels.map(l => l.price);
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
    
    const priceSpread = (priceRange.max - priceRange.min) / averagePrice * 100;
    
    // Determine dominant type with improved logic
    const types = levels.map(l => l.type);
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0][0] as 'support' | 'resistance' | 'target';
    
    // Enhanced cluster strength calculation
    const clusterStrength = this.calculateEnhancedClusterStrength(
      levels,
      priceSpread,
      currentPrice,
      config
    );
    
    // Calculate distance from current price
    const distance = (averagePrice - currentPrice) / currentPrice * 100;
    
    const uniqueIndicators = [...new Set(levels.map(l => l.indicator))];
    
    return {
      averagePrice,
      priceRange,
      indicators: uniqueIndicators,
      levels,
      strength: clusterStrength,
      type: dominantType,
      distance
    };
  }

  /**
   * TASK-022 FASE 1B: Calculate recency weight for level
   */
  private calculateRecencyWeight(level: LevelData, timeframe: string): number {
    // If level has timestamp metadata, use it for recency
    if (level.metadata?.lastTouch) {
      const lastTouchTime = new Date(level.metadata.lastTouch).getTime();
      const now = Date.now();
      const daysSinceTouch = (now - lastTouchTime) / (1000 * 60 * 60 * 24);
      
      // Recent touches get higher weight
      if (daysSinceTouch <= 1) return 1.2;
      if (daysSinceTouch <= 7) return 1.1;
      if (daysSinceTouch <= 30) return 1.0;
      if (daysSinceTouch <= 90) return 0.9;
      return 0.8;
    }
    
    // Default recency weight based on indicator type
    if (level.indicator === 'Support/Resistance') return 1.1; // S/R is always relevant
    if (level.indicator === 'Bollinger Bands') return 1.2; // Current bands are very recent
    if (level.indicator === 'Fibonacci') return 1.0; // Timeless levels
    if (level.indicator === 'Elliott Wave') return 0.9; // Projections may be less certain
    
    return 1.0;
  }

  /**
   * TASK-022 FASE 1B: Calculate quality weight based on level metadata
   */
  private calculateQualityWeight(level: LevelData): number {
    let qualityWeight = 1.0;
    
    // Bonus for levels with high touch count
    if (level.metadata?.touches) {
      const touches = level.metadata.touches;
      if (touches >= 5) qualityWeight += 0.2;
      else if (touches >= 3) qualityWeight += 0.1;
    }
    
    // Bonus for levels with high volume
    if (level.metadata?.volume && level.metadata.volume > 0) {
      qualityWeight += 0.1;
    }
    
    // Bonus for key Fibonacci levels
    if (level.metadata?.levelType === 'key') {
      qualityWeight += 0.15;
    }
    
    // Bonus for squeeze/walking Bollinger bands
    if (level.metadata?.squeeze || level.metadata?.walking) {
      qualityWeight += 0.1;
    }
    
    return Math.min(1.5, qualityWeight); // Cap at 1.5x
  }

  /**
   * TASK-022 FASE 1B: Enhanced cluster strength calculation
   */
  private calculateEnhancedClusterStrength(
    levels: LevelData[],
    priceSpread: number,
    currentPrice: number,
    config: TechnicalAnalysisConfig
  ): number {
    // Base strength from average level strength
    const avgLevelStrength = levels.reduce((sum, level) => sum + level.strength, 0) / levels.length;
    
    // Indicator count bonus (more indicators = stronger confluence)
    const uniqueIndicators = [...new Set(levels.map(l => l.indicator))];
    const indicatorBonus = Math.min(uniqueIndicators.length * 12, 40);
    
    // Diversity bonus (different types of indicators)
    const indicatorTypes = new Set();
    levels.forEach(level => {
      if (level.indicator === 'Fibonacci') indicatorTypes.add('fibonacci');
      else if (level.indicator === 'Bollinger Bands') indicatorTypes.add('dynamic');
      else if (level.indicator === 'Support/Resistance') indicatorTypes.add('historical');
      else if (level.indicator === 'Elliott Wave') indicatorTypes.add('projection');
    });
    const diversityBonus = Math.min(indicatorTypes.size * 8, 20);
    
    // Spread penalty (tighter clusters are stronger)
    const spreadPenalty = Math.min(priceSpread * 10, 25);
    
    // Proximity bonus (closer to current price = more relevant)
    const avgPrice = levels.reduce((sum, l) => sum + l.price, 0) / levels.length;
    const distance = Math.abs(avgPrice - currentPrice) / currentPrice * 100;
    let proximityBonus = 0;
    if (distance < 1) proximityBonus = 15;
    else if (distance < 2) proximityBonus = 10;
    else if (distance < 5) proximityBonus = 5;
    
    // Quality bonus from level metadata
    const qualityBonus = levels.reduce((sum, level) => {
      let bonus = 0;
      if (level.metadata?.levelType === 'key') bonus += 5;
      if (level.metadata?.touches && level.metadata.touches >= 3) bonus += 3;
      if (level.metadata?.squeeze || level.metadata?.walking) bonus += 3;
      return sum + bonus;
    }, 0) / levels.length;
    
    // Calculate final strength
    const finalStrength = avgLevelStrength + indicatorBonus + diversityBonus + proximityBonus + qualityBonus - spreadPenalty;
    
    return Math.max(0, Math.min(100, finalStrength));
  }

  /**
   * TASK-022 FASE 1B: Filter and sort confluences intelligently
   */
  private filterAndSortConfluences(
    confluences: TechnicalConfluence[],
    config: TechnicalAnalysisConfig,
    currentPrice: number
  ): TechnicalConfluence[] {
    // Filter by minimum strength
    const filteredConfluences = confluences.filter(confluence => {
      return confluence.strength >= config.confluence.minStrength;
    });
    
    // Sort by intelligent scoring (strength + proximity + indicator count)
    const sortedConfluences = filteredConfluences.sort((a, b) => {
      // Primary sort: strength (weight 60%)
      const strengthDiff = (b.strength - a.strength) * 0.6;
      
      // Secondary sort: proximity to current price (weight 25%)
      const proximityDiff = (Math.abs(a.distance) - Math.abs(b.distance)) * 0.25;
      
      // Tertiary sort: indicator count (weight 15%)
      const indicatorDiff = (b.indicators.length - a.indicators.length) * 15 * 0.15;
      
      return strengthDiff + proximityDiff + indicatorDiff;
    });
    
    // Return top confluences (limit to prevent overwhelming)
    return sortedConfluences.slice(0, 12);
  }

  /**
   * TASK-022: Create level cluster with enhanced calculations
   */
  private createLevelCluster(
    levels: LevelData[],
    currentPrice: number,
    config: TechnicalAnalysisConfig
  ): LevelCluster {
    if (levels.length === 0) {
      throw new Error('Cannot create cluster with no levels');
    }
    
    // Calculate weighted average price (weight by strength and indicator weight)
    let totalWeight = 0;
    let weightedPriceSum = 0;
    
    levels.forEach(level => {
      const indicatorWeight = config.confluence.indicatorWeights[
        level.indicator.toLowerCase().replace(/[^a-z]/g, '_') as keyof typeof config.confluence.indicatorWeights
      ] || 1.0;
      
      const weight = level.strength * indicatorWeight;
      weightedPriceSum += level.price * weight;
      totalWeight += weight;
    });
    
    const averagePrice = totalWeight > 0 ? weightedPriceSum / totalWeight : levels[0].price;
    
    // Calculate price range
    const prices = levels.map(l => l.price);
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
    
    // Determine dominant type
    const types = levels.map(l => l.type);
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0][0] as 'support' | 'resistance' | 'target';
    
    // Calculate cluster strength
    const baseStrength = levels.reduce((sum, level) => sum + level.strength, 0) / levels.length;
    const indicatorBonus = Math.min(levels.length * 10, 40); // Bonus for multiple indicators
    const uniqueIndicators = [...new Set(levels.map(l => l.indicator))];
    const diversityBonus = Math.min(uniqueIndicators.length * 5, 20); // Bonus for diversity
    
    const clusterStrength = Math.min(100, baseStrength + indicatorBonus + diversityBonus);
    
    // Calculate distance from current price
    const distance = (averagePrice - currentPrice) / currentPrice * 100;
    
    return {
      averagePrice,
      priceRange,
      indicators: uniqueIndicators,
      levels,
      strength: clusterStrength,
      type: dominantType,
      distance
    };
  }

  /**
   * Analyze overall market structure from all indicators
   */
  private analyzeMarketStructure(
    fibonacci: FibonacciAnalysis | null,
    bollinger: BollingerAnalysis | null,
    elliott: ElliottWaveAnalysis | null
  ): ComprehensiveTechnicalAnalysis['marketStructure'] {
    // Combine trend analysis from all indicators
    const trends: string[] = [];
    
    if (fibonacci) {
      trends.push(fibonacci.trend);
    }
    
    if (bollinger) {
      if (bollinger.walk.isWalking) {
        trends.push(bollinger.walk.direction === 'upper' ? 'uptrend' : 'downtrend');
      } else {
        trends.push('sideways');
      }
    }
    
    if (elliott) {
      // Determine trend from Elliott Wave context
      if (elliott.currentSequence.type === 'impulsive') {
        const firstWave = elliott.currentSequence.waves[0];
        if (firstWave) {
          trends.push(firstWave.endPrice > firstWave.startPrice ? 'uptrend' : 'downtrend');
        }
      }
    }
    
    // Determine dominant trend
    const trendCounts = trends.reduce((acc: Record<string, number>, trend) => {
      acc[trend] = (acc[trend] || 0) + 1;
      return acc;
    }, {});
    
    const dominantTrend = Object.entries(trendCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'sideways';
    
    // Map to our trend categories
    let trend: ComprehensiveTechnicalAnalysis['marketStructure']['trend'];
    switch (dominantTrend) {
      case 'uptrend':
        trend = 'uptrend';
        break;
      case 'downtrend':
        trend = 'downtrend';
        break;
      default:
        trend = 'sideways';
    }
    
    // Determine phase (simplified)
    let phase: ComprehensiveTechnicalAnalysis['marketStructure']['phase'] = 'transition';
    if (elliott?.currentSequence.type === 'impulsive') {
      phase = elliott.currentSequence.waves.length <= 3 ? 'markup' : 'distribution';
    } else if (elliott?.currentSequence.type === 'corrective') {
      phase = 'markdown';
    }
    
    // Determine volatility
    let volatility: ComprehensiveTechnicalAnalysis['marketStructure']['volatility'] = 'normal';
    if (bollinger) {
      if (bollinger.volatility.current <= 20) {
        volatility = 'very_low';
      } else if (bollinger.volatility.current <= 40) {
        volatility = 'low';
      } else if (bollinger.volatility.current >= 80) {
        volatility = 'very_high';
      } else if (bollinger.volatility.current >= 60) {
        volatility = 'high';
      }
    }
    
    // Determine momentum
    let momentum: ComprehensiveTechnicalAnalysis['marketStructure']['momentum'] = 'neutral';
    if (trend === 'uptrend') {
      momentum = 'bullish';
    } else if (trend === 'downtrend') {
      momentum = 'bearish';
    }
    
    return {
      trend,
      phase,
      volatility,
      momentum
    };
  }

  /**
   * Generate integrated trading signals from all indicators
   */
  private generateIntegratedSignals(
    currentPrice: number,
    fibonacci: FibonacciAnalysis | null,
    bollinger: BollingerAnalysis | null,
    elliott: ElliottWaveAnalysis | null,
    confluences: TechnicalConfluence[],
    marketStructure: ComprehensiveTechnicalAnalysis['marketStructure'],
    config: TechnicalAnalysisConfig
  ): ComprehensiveTechnicalAnalysis['signals'] {
    // Collect individual signals
    const signals = {
      fibonacci: fibonacci?.currentPosition || null,
      bollinger: bollinger?.signals || null,
      elliott: elliott?.signals || null
    };
    
    // Generate immediate signal (1-5 periods)
    const immediateSignal = this.generateTimeframedSignal(
      'immediate',
      signals,
      confluences,
      marketStructure,
      config
    );
    
    // Generate short-term signal (5-20 periods)
    const shortTermSignal = this.generateTimeframedSignal(
      'short',
      signals,
      confluences,
      marketStructure,
      config
    );
    
    // Generate medium-term signal (20-100 periods)
    const mediumTermSignal = this.generateTimeframedSignal(
      'medium',
      signals,
      confluences,
      marketStructure,
      config
    );
    
    return {
      immediate: immediateSignal,
      shortTerm: shortTermSignal,
      mediumTerm: mediumTermSignal
    };
  }

  /**
   * Generate signal for specific timeframe
   */
  private generateTimeframedSignal(
    timeframe: 'immediate' | 'short' | 'medium',
    signals: any,
    confluences: TechnicalConfluence[],
    marketStructure: ComprehensiveTechnicalAnalysis['marketStructure'],
    config: TechnicalAnalysisConfig
  ): TechnicalSignal {
    // Enhanced signal generation using confluences
    const actionableConfluences = confluences.filter(c => c.actionable);
    
    // Basic signal strength from confluences
    let signalStrength = 50;
    let signalDirection: 'buy' | 'sell' | 'hold' = 'hold';
    const reasoning: string[] = [];
    
    if (actionableConfluences.length > 0) {
      const nearestConfluence = actionableConfluences
        .sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance))[0];
      
      if (Math.abs(nearestConfluence.distance) < 2) {
        signalStrength = Math.min(90, nearestConfluence.strength);
        
        if (nearestConfluence.type === 'support' && nearestConfluence.distance < 0) {
          signalDirection = 'buy';
          reasoning.push(`Near strong support at ${nearestConfluence.level.toFixed(4)}`);
        } else if (nearestConfluence.type === 'resistance' && nearestConfluence.distance > 0) {
          signalDirection = 'sell';
          reasoning.push(`Near strong resistance at ${nearestConfluence.level.toFixed(4)}`);
        }
      }
    }
    
    // Incorporate market structure
    if (marketStructure.trend === 'uptrend') {
      signalStrength += 10;
      reasoning.push('Uptrend market structure');
    } else if (marketStructure.trend === 'downtrend') {
      signalStrength += 10;
      reasoning.push('Downtrend market structure');
    }
    
    return {
      signal: signalDirection === 'buy' ? 'buy' : signalDirection === 'sell' ? 'sell' : 'hold',
      strength: Math.min(100, signalStrength),
      timeframe: timeframe === 'immediate' ? 'short' : timeframe === 'short' ? 'medium' : 'long',
      confluence: actionableConfluences.slice(0, 3),
      reasoning,
      riskLevel: 'medium',
      confidence: Math.min(100, signalStrength)
    };
  }

  // Simplified implementations for remaining methods
  private identifyKeyLevels(...args: any[]): ComprehensiveTechnicalAnalysis['keyLevels'] {
    return {
      immediateSupport: [],
      immediateResistance: [],
      targets: {
        conservative: { price: 0, timeframe: '1d', probability: 0 },
        normal: { price: 0, timeframe: '1d', probability: 0 },
        optimistic: { price: 0, timeframe: '1d', probability: 0 }
      },
      stopLoss: { tight: 0, normal: 0, wide: 0 }
    };
  }

  private assessRisk(...args: any[]): ComprehensiveTechnicalAnalysis['riskAssessment'] {
    return {
      overall: 'medium',
      factors: [],
      opportunities: [],
      warnings: []
    };
  }

  private calculateOverallConfidence(...args: any[]): number {
    return 70;
  }

  private assessOverallDataQuality(...args: any[]): number {
    return 80;
  }

  private determineRecommendedTimeframe(...args: any[]): string {
    return '1h';
  }
}