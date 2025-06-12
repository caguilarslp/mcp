/**
 * @fileoverview Technical Analysis Integration Service
 * @description Combines Fibonacci, Bollinger Bands, and Elliott Wave analysis with confluence detection
 * @version 1.0.0
 * @author wAIckoff MCP Team
 */

import { OHLCV, MarketTicker } from '../types/index.js';
import { BybitMarketDataService } from './marketData.js';
import { TechnicalAnalysisService } from './analysis.js';
import { FibonacciService, FibonacciAnalysis } from './fibonacci.js';
import { BollingerBandsService, BollingerAnalysis } from './bollingerBands.js';
import { ElliottWaveService, ElliottWaveAnalysis } from './elliottWave.js';
import { Logger } from '../utils/logger.js';

export interface TechnicalConfluence {
  level: number;             // Price level where confluence occurs
  indicators: string[];      // Which indicators converge at this level
  strength: number;          // 0-100 strength of confluence
  type: 'support' | 'resistance' | 'target';
  distance: number;          // Distance from current price in %
  actionable: boolean;       // Whether this creates trading opportunity
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
      minStrength: 60
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
      
      this.logger.info(`Starting comprehensive technical analysis for ${symbol} on ${timeframe} timeframe`);
      
      // Perform individual analyses in parallel for efficiency
      const [fibonacciAnalysis, bollingerAnalysis, elliottWaveAnalysis] = await Promise.all([
        config.fibonacci.enabled ? 
          this.fibonacciService.analyzeFibonacci(symbol, timeframe) : 
          null,
        config.bollingerBands.enabled ? 
          this.bollingerService.analyzeBollingerBands(symbol, timeframe) : 
          null,
        config.elliottWave.enabled ? 
          this.elliottWaveService.analyzeElliottWave(symbol, timeframe) : 
          null
      ]);
      
      // Detect confluences between indicators
      const confluences = this.detectConfluences(
        ticker.lastPrice,
        fibonacciAnalysis,
        bollingerAnalysis,
        elliottWaveAnalysis,
        config
      );
      
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

      const analysis: ComprehensiveTechnicalAnalysis = {
        symbol,
        timeframe,
        currentPrice: ticker.lastPrice,
        fibonacci: fibonacciAnalysis!,
        bollingerBands: bollingerAnalysis!,
        elliottWave: elliottWaveAnalysis!,
        confluences,
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
      this.logger.info(`Comprehensive technical analysis completed for ${symbol} in ${executionTime.toFixed(2)}ms`);
      
      return analysis;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.logger.error(`Comprehensive technical analysis failed for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
        executionTime: executionTime.toFixed(2)
      });
      throw error;
    }
  }

  /**
   * Detect confluences between different technical indicators
   */
  private detectConfluences(
    currentPrice: number,
    fibonacci: FibonacciAnalysis | null,
    bollinger: BollingerAnalysis | null,
    elliott: ElliottWaveAnalysis | null,
    config: TechnicalAnalysisConfig
  ): TechnicalConfluence[] {
    const confluences: TechnicalConfluence[] = [];
    const tolerance = config.confluence.distanceTolerance / 100;
    
    // Collect all significant levels from each indicator
    const allLevels: Array<{
      price: number;
      indicator: string;
      type: 'support' | 'resistance' | 'target';
      strength: number;
    }> = [];
    
    // Add Fibonacci levels
    if (fibonacci) {
      fibonacci.keyLevels.forEach(level => {
        allLevels.push({
          price: level.price,
          indicator: 'Fibonacci',
          type: level.price > currentPrice ? 'resistance' : 'support',
          strength: level.strength
        });
      });
    }
    
    // Add Bollinger Band levels
    if (bollinger) {
      allLevels.push(
        {
          price: bollinger.currentBands.upper,
          indicator: 'Bollinger Bands',
          type: 'resistance',
          strength: 70
        },
        {
          price: bollinger.currentBands.lower,
          indicator: 'Bollinger Bands',
          type: 'support',
          strength: 70
        },
        {
          price: bollinger.currentBands.middle,
          indicator: 'Bollinger Bands',
          type: bollinger.currentBands.middle > currentPrice ? 'resistance' : 'support',
          strength: 50
        }
      );
    }
    
    // Add Elliott Wave projections
    if (elliott) {
      elliott.projections.forEach(projection => {
        Object.entries(projection.targets).forEach(([targetType, price]) => {
          allLevels.push({
            price: price as number,
            indicator: 'Elliott Wave',
            type: 'target',
            strength: projection.probability
          });
        });
      });
    }
    
    // Group levels by proximity and find confluences
    const processedLevels = new Set<number>();
    
    allLevels.forEach((level, index) => {
      if (processedLevels.has(index)) return;
      
      const nearbyLevels = allLevels.filter((otherLevel, otherIndex) => {
        if (otherIndex === index || processedLevels.has(otherIndex)) return false;
        
        const distance = Math.abs(level.price - otherLevel.price) / level.price;
        return distance <= tolerance;
      });
      
      if (nearbyLevels.length >= config.confluence.minIndicators - 1) {
        // Found confluence
        const confluenceGroup = [level, ...nearbyLevels];
        const avgPrice = confluenceGroup.reduce((sum, l) => sum + l.price, 0) / confluenceGroup.length;
        const indicators = [...new Set(confluenceGroup.map(l => l.indicator))];
        const totalStrength = confluenceGroup.reduce((sum, l) => sum + l.strength, 0) / confluenceGroup.length;
        
        // Determine confluence type
        const types = confluenceGroup.map(l => l.type);
        const dominantType = types.reduce((a, b) => 
          types.filter(t => t === a).length >= types.filter(t => t === b).length ? a : b
        );
        
        if (totalStrength >= config.confluence.minStrength) {
          confluences.push({
            level: avgPrice,
            indicators,
            strength: totalStrength,
            type: dominantType,
            distance: (avgPrice - currentPrice) / currentPrice * 100,
            actionable: indicators.length >= 2 && totalStrength >= 70
          });
        }
        
        // Mark these levels as processed
        confluenceGroup.forEach((_, groupIndex) => {
          const originalIndex = allLevels.findIndex(l => 
            l.price === confluenceGroup[groupIndex].price && 
            l.indicator === confluenceGroup[groupIndex].indicator
          );
          if (originalIndex !== -1) {
            processedLevels.add(originalIndex);
          }
        });
      }
    });
    
    // Sort by strength and distance
    return confluences
      .sort((a, b) => {
        // Prioritize by strength, then by proximity to current price
        const strengthDiff = b.strength - a.strength;
        if (Math.abs(strengthDiff) > 10) return strengthDiff;
        return Math.abs(a.distance) - Math.abs(b.distance);
      })
      .slice(0, 10); // Keep top 10 confluences
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
    // Placeholder implementation
    return {
      signal: 'hold',
      strength: 50,
      timeframe: timeframe === 'immediate' ? 'short' : timeframe === 'short' ? 'medium' : 'long',
      confluence: confluences.slice(0, 3),
      reasoning: ['Technical analysis integration in progress'],
      riskLevel: 'medium',
      confidence: 60
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
