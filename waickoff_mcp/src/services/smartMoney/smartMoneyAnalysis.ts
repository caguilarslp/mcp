/**
 * @fileoverview Smart Money Analysis Integration Service
 * @description Integrates Order Blocks, Fair Value Gaps, and Break of Structure for complete SMC analysis
 * @version 1.0.0
 * @author wAIckoff Team
 */

import type {
  OHLCV,
  MarketTicker,
  MCPServerResponse,
  PerformanceMetrics,
  IMarketDataService,
  IAnalysisService,
  OrderBlock,
  OrderBlockAnalysis,
  FairValueGap,
  FVGAnalysis,
  StructuralBreak,
  MarketStructureAnalysis,
  SmartMoneyConfluence,
  SMCMarketBias,
  SMCSetupValidation,
  SmartMoneyAnalysis,
  SMCConfig,
  MarketTicker as ExchangeTicker
} from '../../types/index.js';

import { OrderBlocksService } from './orderBlocks.js';
import { FairValueGapsService } from './fairValueGaps.js';
import { BreakOfStructureService } from './breakOfStructure.js';
import { ExchangeAggregator } from '../../adapters/exchanges/common/ExchangeAggregator.js';
import { ContextAwareRepository } from '../context/contextRepository.js';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

// ====================
// SMART MONEY ANALYSIS SERVICE
// ====================

export class SmartMoneyAnalysisService {
  private marketDataService: IMarketDataService;
  private analysisService: IAnalysisService;
  private orderBlocksService: OrderBlocksService;
  private fvgService: FairValueGapsService;
  private bosService: BreakOfStructureService;
  private exchangeAggregator: ExchangeAggregator;
  private contextAwareRepository: ContextAwareRepository;
  private config: SMCConfig;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(
    marketDataService: IMarketDataService,
    analysisService: IAnalysisService,
    exchangeAggregator?: ExchangeAggregator
  ) {
    this.marketDataService = marketDataService;
    this.analysisService = analysisService;
    
    // Inicializar servicios SMC
    this.orderBlocksService = new OrderBlocksService(marketDataService, analysisService);
    this.fvgService = new FairValueGapsService(marketDataService, analysisService);
    this.bosService = new BreakOfStructureService();
    
    // Multi-exchange support
    this.exchangeAggregator = exchangeAggregator || new ExchangeAggregator(
      new Map(), // Empty adapters map for now
      {} // Default config
    );
    
    // Context-aware repository (TASK-027 FASE 2)
    this.contextAwareRepository = new ContextAwareRepository();
    
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): SMCConfig {
    return {
      confluenceThreshold: 0.005,       // 0.5% distancia máxima para confluencia (relajado de 2%)
      minConfluenceScore: 60,           // Score mínimo para considerar confluencia válida (bajado de 70)
      biasStrengthThreshold: 60,        // Umbral para bias fuerte (bajado de 65)
      setupValidationMinScore: 70,      // Score mínimo para setup válido (bajado de 75)
      weights: {
        orderBlock: 0.35,               // 35% peso Order Blocks
        fairValueGap: 0.30,             // 30% peso FVGs
        breakOfStructure: 0.35          // 35% peso BOS
      },
      premiumDiscountThreshold: 0.5,   // 50% para determinar zonas premium/discount
      institutionalActivityThreshold: 60 // Umbral actividad institucional (bajado de 70)
    };
  }

  /**
   * Analiza confluencias entre todos los conceptos SMC con datos multi-exchange
   */
  async analyzeSmartMoneyConfluence(
    symbol: string,
    timeframe: string = '60',
    lookback: number = 100,
    useMultiExchange: boolean = false
  ): Promise<SmartMoneyAnalysis> {
    const startTime = performance.now();

    try {
      let orderBlockAnalysis: OrderBlockAnalysis;
      let fvgAnalysis: FVGAnalysis;
      let bosAnalysis: MarketStructureAnalysis;
      let multiExchangeData: any = null;

      if (useMultiExchange) {
        // 1a. Obtener datos multi-exchange para validación
        try {
          multiExchangeData = await this.getMultiExchangeValidationData(symbol);
          console.log('[SMC] Multi-exchange validation data obtained');
        } catch (error) {
          console.warn('[SMC] Multi-exchange data failed, falling back to single exchange:', error);
        }
      }

      // 1b. Obtener análisis de cada componente SMC
      [orderBlockAnalysis, fvgAnalysis, bosAnalysis] = await Promise.all([
        this.analyzeOrderBlocksWithCrossValidation(symbol, timeframe, lookback, multiExchangeData),
        this.analyzeFVGsWithCrossValidation(symbol, timeframe, lookback, multiExchangeData),
        this.analyzeBOSWithCrossValidation(symbol, timeframe, lookback, multiExchangeData)
      ]);

      // 2. Detectar confluencias entre conceptos
      const confluences = this.detectConfluences(
        orderBlockAnalysis,
        fvgAnalysis,
        bosAnalysis
      );

      // 3. Calcular zonas premium/discount
      const premiumDiscountZones = this.calculatePremiumDiscountZones(
        orderBlockAnalysis.currentPrice,
        bosAnalysis.structurePoints
      );

      // 4. Detectar actividad institucional con datos cross-exchange
      const institutionalActivity = this.analyzeInstitutionalActivityWithCrossValidation(
        orderBlockAnalysis,
        fvgAnalysis,
        bosAnalysis,
        confluences,
        multiExchangeData
      );

      // 5. Determinar sesgo del mercado integrado
      const marketBias = this.calculateIntegratedMarketBias(
        orderBlockAnalysis,
        fvgAnalysis,
        bosAnalysis,
        confluences
      );

      // 6. Generar recomendaciones de trading
      const tradingRecommendations = this.generateTradingRecommendations(
        confluences,
        marketBias,
        institutionalActivity,
        premiumDiscountZones,
        orderBlockAnalysis.currentPrice
      );

      // 7. Identificar niveles clave integrados
      const keyLevels = this.identifyKeyLevels(
        orderBlockAnalysis,
        fvgAnalysis,
        bosAnalysis,
        confluences
      );

      const analysis: SmartMoneyAnalysis = {
        symbol,
        timeframe,
        currentPrice: orderBlockAnalysis.currentPrice,
        confluences,
        premiumDiscountZones,
        institutionalActivity,
        marketBias,
        tradingRecommendations,
        keyLevels,
        statistics: {
          totalConfluences: confluences.length,
          strongConfluences: confluences.filter(c => c.strength >= 80).length,
          activeOrderBlocks: orderBlockAnalysis.activeBlocks.length,
          openFVGs: fvgAnalysis.openGaps.length,
          recentBOS: bosAnalysis.recentBreaks.length,
          overallConfidence: this.calculateOverallConfidence(confluences, institutionalActivity)
        },
        rawAnalysis: {
          orderBlocks: orderBlockAnalysis,
          fairValueGaps: fvgAnalysis,
          breakOfStructure: bosAnalysis
        },
        timestamp: new Date().toISOString()
      };

      // Save to Context-Aware Repository (TASK-027 FASE 2)
      try {
        const analysisId = await this.contextAwareRepository.saveAnalysisWithContext(
          `${symbol}_smc_confluence_${timeframe}_${Date.now()}`,
          'smc',
          { ...analysis, symbol, timeframe },
          { 
            symbol, 
            timeframe, 
            tags: [
              `timeframe:${timeframe}`,
              `confluences:${analysis.confluences.length}`,
              `bias:${analysis.marketBias.direction}`,
              `institutional:${analysis.institutionalActivity.score}`,
              `zone:${analysis.premiumDiscountZones.currentZone}`
            ]
          }
        );
        console.log(`[SMC] Analysis saved with context - ID: ${analysisId} (TASK-027 FASE 2)`);
      } catch (contextError) {
        console.warn(`[SMC] Failed to save context for ${symbol}:`, contextError);
      }

      this.recordPerformance('analyzeSmartMoneyConfluence', startTime, true);
      return analysis;

    } catch (error) {
      this.recordPerformance('analyzeSmartMoneyConfluence', startTime, false, error);
      throw error;
    }
  }

  /**
   * Obtiene el sesgo institucional del mercado con validación multi-exchange
   */
  async getSMCMarketBias(
    symbol: string,
    timeframe: string = '60',
    useMultiExchange: boolean = false
  ): Promise<SMCMarketBias> {
    const startTime = performance.now();

    try {
      const analysis = await this.analyzeSmartMoneyConfluence(symbol, timeframe, 100, useMultiExchange);
      
      const bias: SMCMarketBias = {
        ...analysis.marketBias,
        confluenceSupport: this.calculateConfluenceSupport(analysis.confluences),
        institutionalAlignment: this.calculateInstitutionalAlignment(analysis),
        keyInfluencers: this.identifyKeyInfluencers(analysis),
        nextUpdateTime: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 horas
      };

      this.recordPerformance('getSMCMarketBias', startTime, true);
      return bias;

    } catch (error) {
      this.recordPerformance('getSMCMarketBias', startTime, false, error);
      throw error;
    }
  }

  /**
   * Valida un setup completo de Smart Money Concepts con datos multi-exchange
   */
  async validateSMCSetup(
    symbol: string,
    setupType: 'long' | 'short',
    entryPrice?: number,
    useMultiExchange: boolean = false
  ): Promise<SMCSetupValidation> {
    const startTime = performance.now();

    try {
      const analysis = await this.analyzeSmartMoneyConfluence(symbol, '60', 100, useMultiExchange);
      const entry = entryPrice || analysis.currentPrice;

      // 1. Validar alineación direccional
      const directionalAlignment = this.validateDirectionalAlignment(
        setupType,
        analysis.marketBias
      );

      // 2. Validar confluencias en zona de entrada
      const confluenceValidation = this.validateConfluencesAtEntry(
        entry,
        analysis.confluences,
        setupType
      );

      // 3. Validar contexto de estructura
      const structureValidation = this.validateStructureContext(
        analysis.rawAnalysis.breakOfStructure,
        setupType
      );

      // 4. Validar actividad institucional
      const institutionalValidation = this.validateInstitutionalPresence(
        analysis.institutionalActivity
      );

      // 5. Calcular score total
      const totalScore = this.calculateSetupScore({
        directionalAlignment,
        confluenceValidation,
        structureValidation,
        institutionalValidation
      });

      // 6. Generar entrada óptima y gestión de riesgo
      const optimalEntry = this.calculateOptimalEntry(
        analysis,
        setupType,
        entry
      );

      const riskManagement = this.generateRiskManagement(
        analysis,
        setupType,
        optimalEntry.price
      );

      const validation: SMCSetupValidation = {
        isValid: totalScore >= this.config.setupValidationMinScore,
        setupScore: totalScore,
        factors: {
          directionalAlignment,
          confluenceQuality: confluenceValidation.score,
          structureAlignment: structureValidation.score,
          institutionalPresence: institutionalValidation.score,
          riskRewardRatio: riskManagement.riskRewardRatio
        },
        optimalEntry,
        riskManagement,
        warnings: this.generateSetupWarnings(analysis, setupType, totalScore),
        alternativeScenarios: this.generateAlternativeScenarios(analysis, setupType),
        confidence: this.calculateSetupConfidence(totalScore, analysis),
        timestamp: new Date().toISOString()
      };

      // Save to Context-Aware Repository (TASK-027 FASE 2)
      try {
        const analysisId = await this.contextAwareRepository.saveAnalysisWithContext(
          `${symbol}_smc_setup_${setupType}_${Date.now()}`,
          'smc',
          { ...validation, symbol, setupType },
          { 
            symbol, 
            setupType,
            tags: [
              `type:setup_validation`,
              `direction:${setupType}`,
              `valid:${validation.isValid}`,
              `score:${validation.setupScore}`,
              `confidence:${validation.confidence}`,
              `rr:${validation.riskManagement.riskRewardRatio}`
            ]
          }
        );
        console.log(`[SMC] Setup validation saved with context - ID: ${analysisId} (TASK-027 FASE 2)`);
      } catch (contextError) {
        console.warn(`[SMC] Failed to save setup validation context for ${symbol}:`, contextError);
      }

      this.recordPerformance('validateSMCSetup', startTime, true);
      return validation;

    } catch (error) {
      this.recordPerformance('validateSMCSetup', startTime, false, error);
      throw error;
    }
  }

  /**
   * Detecta confluencias entre conceptos SMC con criterios relajados
   */
  private detectConfluences(
    orderBlocks: OrderBlockAnalysis,
    fvgs: FVGAnalysis,
    bos: MarketStructureAnalysis
  ): SmartMoneyConfluence[] {
    const confluences: SmartMoneyConfluence[] = [];
    const threshold = this.config.confluenceThreshold;
    
    // Log para debugging
    console.log(`[SMC] Detecting confluences - OBs: ${orderBlocks.activeBlocks.length}, FVGs: ${fvgs.openGaps.length}, BOS: ${bos.activeBreaks.length}`);

    // 1. Confluencias Order Block + FVG
    for (const ob of orderBlocks.activeBlocks) {
      for (const fvg of fvgs.openGaps) {
        const distance = this.calculateZoneDistance(
          ob.zone,
          { upper: fvg.gap.upper, lower: fvg.gap.lower, midpoint: fvg.gap.midpoint }
        );

        if (distance <= threshold) {
          confluences.push(this.createConfluence(
            ['orderBlock', 'fairValueGap'],
            [ob.zone.midpoint, fvg.gap.midpoint],
            { orderBlock: ob, fairValueGap: fvg },
            ob.type === 'bullish' && fvg.type === 'bullish' ? 'bullish' : 
            ob.type === 'bearish' && fvg.type === 'bearish' ? 'bearish' : 'mixed'
          ));
        }
      }
    }

    // 2. Confluencias Order Block + BOS
    for (const ob of orderBlocks.activeBlocks) {
      for (const breakItem of bos.activeBreaks) {
        const distance = Math.abs(ob.zone.midpoint - breakItem.breakPoint.price) / ob.zone.midpoint;

        if (distance <= threshold) {
          confluences.push(this.createConfluence(
            ['orderBlock', 'breakOfStructure'],
            [ob.zone.midpoint, breakItem.breakPoint.price],
            { orderBlock: ob, structuralBreak: breakItem },
            ob.type === 'bullish' && breakItem.direction === 'bullish' ? 'bullish' :
            ob.type === 'bearish' && breakItem.direction === 'bearish' ? 'bearish' : 'mixed'
          ));
        }
      }
    }

    // 3. Confluencias FVG + BOS
    for (const fvg of fvgs.openGaps) {
      for (const breakItem of bos.activeBreaks) {
        const distance = Math.abs(fvg.gap.midpoint - breakItem.breakPoint.price) / fvg.gap.midpoint;

        if (distance <= threshold) {
          confluences.push(this.createConfluence(
            ['fairValueGap', 'breakOfStructure'],
            [fvg.gap.midpoint, breakItem.breakPoint.price],
            { fairValueGap: fvg, structuralBreak: breakItem },
            fvg.type === 'bullish' && breakItem.direction === 'bullish' ? 'bullish' :
            fvg.type === 'bearish' && breakItem.direction === 'bearish' ? 'bearish' : 'mixed'
          ));
        }
      }
    }

    // 4. Confluencias triples (las más fuertes)
    this.detectTripleConfluences(confluences, orderBlocks, fvgs, bos);

    // 5. Si no hay confluencias completas, buscar confluencias parciales
    if (confluences.length === 0) {
      console.log('[SMC] No full confluences found, looking for partial confluences...');
      const partialConfluences = this.detectPartialConfluences(orderBlocks, fvgs, bos);
      confluences.push(...partialConfluences);
    }

    // 6. Si aun no hay confluencias, generar confluencias individuales de elementos fuertes
    if (confluences.length === 0) {
      console.log('[SMC] No confluences found, generating individual strong levels...');
      const individualConfluences = this.generateIndividualConfluences(orderBlocks, fvgs, bos);
      confluences.push(...individualConfluences);
    }

    console.log(`[SMC] Total confluences detected: ${confluences.length}`);
    return confluences.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Detecta confluencias triples
   */
  private detectTripleConfluences(
    existingConfluences: SmartMoneyConfluence[],
    orderBlocks: OrderBlockAnalysis,
    fvgs: FVGAnalysis,
    bos: MarketStructureAnalysis
  ): void {
    const threshold = this.config.confluenceThreshold * 1.5; // Umbral más amplio para triples

    for (const ob of orderBlocks.activeBlocks) {
      for (const fvg of fvgs.openGaps) {
        for (const breakItem of bos.activeBreaks) {
          const obFvgDistance = this.calculateZoneDistance(
            ob.zone,
            { upper: fvg.gap.upper, lower: fvg.gap.lower, midpoint: fvg.gap.midpoint }
          );
          const obBosDistance = Math.abs(ob.zone.midpoint - breakItem.breakPoint.price) / ob.zone.midpoint;
          const fvgBosDistance = Math.abs(fvg.gap.midpoint - breakItem.breakPoint.price) / fvg.gap.midpoint;

          if (obFvgDistance <= threshold && obBosDistance <= threshold && fvgBosDistance <= threshold) {
            const avgPrice = (ob.zone.midpoint + fvg.gap.midpoint + breakItem.breakPoint.price) / 3;
            
            existingConfluences.push(this.createConfluence(
              ['orderBlock', 'fairValueGap', 'breakOfStructure'],
              [ob.zone.midpoint, fvg.gap.midpoint, breakItem.breakPoint.price],
              { orderBlock: ob, fairValueGap: fvg, structuralBreak: breakItem },
              this.determineTripleConfluenceAlignment(ob.type, fvg.type, breakItem.direction),
              avgPrice
            ));
          }
        }
      }
    }
  }

  /**
   * Detecta confluencias parciales cuando no hay confluencias completas
   */
  private detectPartialConfluences(
    orderBlocks: OrderBlockAnalysis,
    fvgs: FVGAnalysis,
    bos: MarketStructureAnalysis
  ): SmartMoneyConfluence[] {
    const partialConfluences: SmartMoneyConfluence[] = [];
    
    // Caso 1: Solo FVG + BOS (sin Order Blocks)
    if (orderBlocks.activeBlocks.length === 0 && fvgs.openGaps.length > 0 && bos.activeBreaks.length > 0) {
      console.log('[SMC] Creating FVG + BOS partial confluences');
      for (const fvg of fvgs.openGaps) {
        for (const breakItem of bos.activeBreaks) {
          const distance = Math.abs(fvg.gap.midpoint - breakItem.breakPoint.price) / fvg.gap.midpoint;
          
          // Usar umbral más relajado para parciales
          if (distance <= this.config.confluenceThreshold * 2) {
            partialConfluences.push(this.createConfluence(
              ['fairValueGap', 'breakOfStructure'],
              [fvg.gap.midpoint, breakItem.breakPoint.price],
              { fairValueGap: fvg, structuralBreak: breakItem },
              fvg.type === 'bullish' && breakItem.direction === 'bullish' ? 'bullish' :
              fvg.type === 'bearish' && breakItem.direction === 'bearish' ? 'bearish' : 'mixed',
              undefined,
              60 // Base score para confluencias parciales
            ));
          }
        }
      }
    }
    
    // Caso 2: Solo OB + elementos individuales con criterios más relajados
    if (partialConfluences.length === 0 && orderBlocks.activeBlocks.length > 0) {
      const relaxedThreshold = this.config.confluenceThreshold * 3; // 1.5% en lugar de 0.5%
      
      for (const ob of orderBlocks.activeBlocks) {
        // OB + FVG con umbral relajado
        for (const fvg of fvgs.openGaps) {
          const distance = this.calculateZoneDistance(
            ob.zone,
            { upper: fvg.gap.upper, lower: fvg.gap.lower, midpoint: fvg.gap.midpoint }
          );
          
          if (distance <= relaxedThreshold) {
            partialConfluences.push(this.createConfluence(
              ['orderBlock', 'fairValueGap'],
              [ob.zone.midpoint, fvg.gap.midpoint],
              { orderBlock: ob, fairValueGap: fvg },
              ob.type === 'bullish' && fvg.type === 'bullish' ? 'bullish' : 
              ob.type === 'bearish' && fvg.type === 'bearish' ? 'bearish' : 'mixed',
              undefined,
              50 // Score reducido para umbral relajado
            ));
          }
        }
        
        // OB + BOS con umbral relajado
        for (const breakItem of bos.activeBreaks) {
          const distance = Math.abs(ob.zone.midpoint - breakItem.breakPoint.price) / ob.zone.midpoint;
          
          if (distance <= relaxedThreshold) {
            partialConfluences.push(this.createConfluence(
              ['orderBlock', 'breakOfStructure'],
              [ob.zone.midpoint, breakItem.breakPoint.price],
              { orderBlock: ob, structuralBreak: breakItem },
              ob.type === 'bullish' && breakItem.direction === 'bullish' ? 'bullish' :
              ob.type === 'bearish' && breakItem.direction === 'bearish' ? 'bearish' : 'mixed',
              undefined,
              50 // Score reducido para umbral relajado
            ));
          }
        }
      }
    }
    
    return partialConfluences;
  }

  /**
   * Genera confluencias individuales de elementos fuertes cuando no hay confluencias reales
   */
  private generateIndividualConfluences(
    orderBlocks: OrderBlockAnalysis,
    fvgs: FVGAnalysis,
    bos: MarketStructureAnalysis
  ): SmartMoneyConfluence[] {
    const individualConfluences: SmartMoneyConfluence[] = [];
    
    // Order Blocks fuertes como confluencias individuales
    orderBlocks.activeBlocks
      .filter(ob => ob.strength >= 70)
      .forEach(ob => {
        individualConfluences.push(this.createConfluence(
          ['orderBlock'],
          [ob.zone.midpoint],
          { orderBlock: ob },
          ob.type === 'bullish' ? 'bullish' : ob.type === 'bearish' ? 'bearish' : 'mixed',
          ob.zone.midpoint,
          ob.strength * 0.4 // Score reducido para elementos individuales
        ));
      });
    
    // FVGs significativos como confluencias individuales
    fvgs.openGaps
      .filter(fvg => fvg.context.significance === 'high')
      .forEach(fvg => {
        individualConfluences.push(this.createConfluence(
          ['fairValueGap'],
          [fvg.gap.midpoint],
          { fairValueGap: fvg },
          fvg.type,
          fvg.gap.midpoint,
          fvg.probability.fill * 0.4 // Score reducido para elementos individuales
        ));
      });
    
    // BOS mayores como confluencias individuales
    bos.activeBreaks
      .filter((b: StructuralBreak) => b.significance === 'major')
      .forEach((breakItem: StructuralBreak) => {
        individualConfluences.push(this.createConfluence(
          ['breakOfStructure'],
          [breakItem.breakPoint.price],
          { structuralBreak: breakItem },
          breakItem.direction,
          breakItem.breakPoint.price,
          breakItem.probability * 0.4 // Score reducido para elementos individuales
        ));
      });
    
    console.log(`[SMC] Generated ${individualConfluences.length} individual confluences`);
    return individualConfluences;
  }

  /**
   * Crea un objeto de confluencia
   */
  private createConfluence(
    types: Array<'orderBlock' | 'fairValueGap' | 'breakOfStructure'>,
    priceLevels: number[],
    components: any,
    alignment: 'bullish' | 'bearish' | 'mixed',
    overridePrice?: number,
    baseScore?: number
  ): SmartMoneyConfluence {
    const avgPrice = overridePrice || priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length;
    const priceRange = Math.max(...priceLevels) - Math.min(...priceLevels);
    
    // Calcular fuerza basada en tipo y alineación
    let strength = baseScore !== undefined ? baseScore : 50;
    
    // Bonus por cantidad de componentes
    strength += types.length * 15;
    
    // Bonus por alineación
    if (alignment !== 'mixed') {
      strength += 20;
    }
    
    // Bonus por proximidad de niveles
    const avgDistance = priceRange / avgPrice;
    if (avgDistance < 0.01) strength += 15; // Muy cercanos
    else if (avgDistance < 0.02) strength += 10; // Cercanos
    
    // Ajustar por fuerza individual de componentes
    if (components.orderBlock) {
      strength += components.orderBlock.strength * 0.1;
    }
    if (components.fairValueGap) {
      strength += components.fairValueGap.probability.fill * 0.1;
    }
    if (components.structuralBreak) {
      strength += components.structuralBreak.probability * 0.1;
    }

    return {
      id: randomUUID(),
      types,
      priceLevel: avgPrice,
      strength: Math.min(100, Math.round(strength)),
      zone: {
        upper: Math.max(...priceLevels) * 1.005,
        lower: Math.min(...priceLevels) * 0.995,
        midpoint: avgPrice
      },
      components,
      alignment,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      description: this.generateConfluenceDescription(types, alignment, strength)
    };
  }

  /**
   * Calcula zonas premium y discount
   */
  private calculatePremiumDiscountZones(
    currentPrice: number,
    structurePoints: any[]
  ): {
    premium: { start: number; end: number };
    discount: { start: number; end: number };
    equilibrium: number;
    currentZone: 'premium' | 'discount' | 'equilibrium';
  } {
    // Encontrar rango estructural
    const recentHighs = structurePoints
      .filter(p => p.type === 'higher_high' || p.type === 'lower_high')
      .map(p => p.price)
      .sort((a, b) => b - a);
    
    const recentLows = structurePoints
      .filter(p => p.type === 'higher_low' || p.type === 'lower_low')
      .map(p => p.price)
      .sort((a, b) => a - b);

    const rangeHigh = recentHighs[0] || currentPrice * 1.05;
    const rangeLow = recentLows[0] || currentPrice * 0.95;
    const equilibrium = (rangeHigh + rangeLow) / 2;

    const premiumStart = equilibrium + (rangeHigh - equilibrium) * this.config.premiumDiscountThreshold;
    const discountEnd = equilibrium - (equilibrium - rangeLow) * this.config.premiumDiscountThreshold;

    let currentZone: 'premium' | 'discount' | 'equilibrium';
    if (currentPrice > premiumStart) {
      currentZone = 'premium';
    } else if (currentPrice < discountEnd) {
      currentZone = 'discount';
    } else {
      currentZone = 'equilibrium';
    }

    return {
      premium: { start: premiumStart, end: rangeHigh },
      discount: { start: rangeLow, end: discountEnd },
      equilibrium,
      currentZone
    };
  }

  /**
   * Analiza actividad institucional con criterios ajustados
   */
  private analyzeInstitutionalActivity(
    orderBlocks: OrderBlockAnalysis,
    fvgs: FVGAnalysis,
    bos: MarketStructureAnalysis,
    confluences: SmartMoneyConfluence[]
  ): {
    score: number;
    signals: string[];
    footprint: {
      orderBlockActivity: number;
      fvgCreation: number;
      structuralManipulation: number;
      confluenceStrength: number;
    };
    interpretation: string;
  } {
    const signals: string[] = [];
    let score = 0;
    let componentsAnalyzed = 0;

    // Analizar Order Blocks (criterios más flexibles)
    const strongOBs = orderBlocks.activeBlocks.filter(ob => ob.strength >= 70).length; // Bajado de 80
    const moderateOBs = orderBlocks.activeBlocks.filter(ob => ob.strength >= 50).length;
    const orderBlockActivity = Math.min(100, strongOBs * 30 + moderateOBs * 10);
    
    if (orderBlocks.activeBlocks.length > 0) {
      componentsAnalyzed++;
      if (strongOBs > 0) {
        signals.push(`${strongOBs} strong order blocks detected`);
        score += strongOBs * 15; // Más puntos por OB
      } else if (moderateOBs > 0) {
        signals.push(`${moderateOBs} moderate order blocks present`);
        score += moderateOBs * 8;
      }
    }

    // Analizar FVGs (criterios más flexibles)
    const significantFVGs = fvgs.openGaps.filter(fvg => fvg.context.significance === 'high').length;
    const moderateFVGs = fvgs.openGaps.filter(fvg => fvg.context.significance === 'medium').length;
    const fvgCreation = Math.min(100, significantFVGs * 35 + moderateFVGs * 15);
    
    if (fvgs.openGaps.length > 0) {
      componentsAnalyzed++;
      if (significantFVGs > 0) {
        signals.push(`${significantFVGs} significant fair value gaps present`);
        score += significantFVGs * 15;
      } else if (moderateFVGs > 0) {
        signals.push(`${moderateFVGs} moderate fair value gaps detected`);
        score += moderateFVGs * 8;
      }
    }

    // Analizar manipulación estructural
    const majorBreaks = bos.activeBreaks.filter((b: StructuralBreak) => b.significance === 'major').length;
    const minorBreaks = bos.activeBreaks.filter((b: StructuralBreak) => b.significance === 'minor').length;
    const structuralManipulation = Math.min(100, majorBreaks * 40 + minorBreaks * 20);
    
    if (bos.activeBreaks.length > 0) {
      componentsAnalyzed++;
      if (majorBreaks > 0) {
        signals.push(`${majorBreaks} major structural breaks identified`);
        score += majorBreaks * 20;
      } else if (minorBreaks > 0) {
        signals.push(`${minorBreaks} minor structural breaks detected`);
        score += minorBreaks * 10;
      }
    }

    // Analizar confluencias (con criterios ajustados)
    const strongConfluences = confluences.filter(c => c.strength >= 70).length; // Bajado de 80
    const moderateConfluences = confluences.filter(c => c.strength >= 50 && c.strength < 70).length;
    const confluenceStrength = Math.min(100, strongConfluences * 35 + moderateConfluences * 15);
    
    if (confluences.length > 0) {
      if (strongConfluences > 0) {
        signals.push(`${strongConfluences} strong SMC confluences detected`);
        score += strongConfluences * 15;
      } else if (moderateConfluences > 0) {
        signals.push(`${moderateConfluences} moderate SMC confluences present`);
        score += moderateConfluences * 8;
      }
    }

    // Ajustar score si hay pocos componentes analizados
    if (componentsAnalyzed < 3 && componentsAnalyzed > 0) {
      // Normalizar score basado en componentes disponibles
      score = Math.round(score * (3 / componentsAnalyzed) * 0.8); // 0.8 factor de penalización
    }

    // Si no hay datos suficientes, dar un score base
    if (signals.length === 0) {
      signals.push('Limited institutional footprint data available');
      score = 30; // Score base para datos limitados
    }

    const interpretation = score >= this.config.institutionalActivityThreshold ?
      'High institutional activity detected - Smart money is actively positioning' :
      score >= 40 ? // Bajado de 50
      'Moderate institutional activity - Monitor for increased participation' :
      'Low institutional activity - Limited smart money footprint';

    return {
      score: Math.min(100, score),
      signals,
      footprint: {
        orderBlockActivity,
        fvgCreation,
        structuralManipulation,
        confluenceStrength
      },
      interpretation
    };
  }

  /**
   * Calcula sesgo de mercado integrado con manejo mejorado de datos limitados
   */
  private calculateIntegratedMarketBias(
    orderBlocks: OrderBlockAnalysis,
    fvgs: FVGAnalysis,
    bos: MarketStructureAnalysis,
    confluences: SmartMoneyConfluence[]
  ): SMCMarketBias {
    const weights = this.config.weights;
    
    // Contar elementos disponibles para ajustar ponderación
    const hasOrderBlocks = orderBlocks.activeBlocks.length > 0;
    const hasFVGs = fvgs.openGaps.length > 0;
    const hasBOS = bos.activeBreaks.length > 0;
    
    // Ajustar pesos dinámicamente si faltan elementos
    const adjustedWeights = this.adjustWeightsForMissingData(weights, hasOrderBlocks, hasFVGs, hasBOS);
    
    // Obtener bias de cada componente
    const obBias = this.normalizeMarketBias(orderBlocks.marketBias);
    const fvgBias = this.calculateFVGBias(fvgs);
    const bosBias = this.normalizeBOSBias(bos.marketBias);

    // Calcular dirección ponderada
    let bullishScore = 0;
    let bearishScore = 0;
    let neutralScore = 0;

    // Order Blocks (solo si hay datos)
    if (hasOrderBlocks) {
      if (obBias.direction === 'bullish') bullishScore += obBias.strength * adjustedWeights.orderBlock;
      else if (obBias.direction === 'bearish') bearishScore += obBias.strength * adjustedWeights.orderBlock;
      else neutralScore += 50 * adjustedWeights.orderBlock;
    }

    // Fair Value Gaps (solo si hay datos)
    if (hasFVGs) {
      if (fvgBias.direction === 'bullish') bullishScore += fvgBias.strength * adjustedWeights.fairValueGap;
      else if (fvgBias.direction === 'bearish') bearishScore += fvgBias.strength * adjustedWeights.fairValueGap;
      else neutralScore += 50 * adjustedWeights.fairValueGap;
    }

    // Break of Structure (solo si hay datos)
    if (hasBOS) {
      if (bosBias.direction === 'bullish') bullishScore += bosBias.strength * adjustedWeights.breakOfStructure;
      else if (bosBias.direction === 'bearish') bearishScore += bosBias.strength * adjustedWeights.breakOfStructure;
      else neutralScore += 50 * adjustedWeights.breakOfStructure;
    }

    // Determinar dirección final
    let direction: 'bullish' | 'bearish' | 'neutral';
    let strength: number;
    const totalScore = bullishScore + bearishScore + neutralScore;

    // Manejar caso donde no hay datos
    if (totalScore === 0) {
      direction = 'neutral';
      strength = 50;
    } else if (bullishScore > bearishScore && bullishScore > neutralScore) {
      direction = 'bullish';
      strength = (bullishScore / totalScore) * 100;
    } else if (bearishScore > bullishScore && bearishScore > neutralScore) {
      direction = 'bearish';
      strength = (bearishScore / totalScore) * 100;
    } else {
      direction = 'neutral';
      strength = 50;
    }

    // Ajustar por confluencias (con menor impacto si hay pocas)
    if (confluences.length > 0) {
      const alignedConfluences = confluences.filter(c => c.alignment === direction).length;
      const conflictingConfluences = confluences.filter(c => 
        c.alignment !== direction && c.alignment !== 'mixed'
      ).length;
      
      const confluenceImpact = Math.min(5, confluences.length); // Limitar impacto
      strength += alignedConfluences * confluenceImpact;
      strength -= conflictingConfluences * (confluenceImpact * 0.6);
    }
    
    strength = Math.max(0, Math.min(100, strength));

    // Calcular confianza
    const confidence = this.calculateBiasConfidence(
      [obBias, fvgBias, bosBias],
      confluences,
      strength
    );

    const reasoning = this.generateBiasReasoning(
      direction,
      { obBias, fvgBias, bosBias },
      confluences
    );

    return {
      direction,
      strength: Math.round(strength),
      confidence: Math.round(confidence),
      reasoning,
      components: {
        orderBlockBias: obBias.direction,
        fvgBias: fvgBias.direction,
        structureBias: bosBias.direction
      }
    };
  }

  /**
   * Ajusta pesos cuando faltan elementos del análisis
   */
  private adjustWeightsForMissingData(
    originalWeights: { orderBlock: number; fairValueGap: number; breakOfStructure: number },
    hasOrderBlocks: boolean,
    hasFVGs: boolean,
    hasBOS: boolean
  ): { orderBlock: number; fairValueGap: number; breakOfStructure: number } {
    const adjustedWeights = { ...originalWeights };
    const totalActive = (hasOrderBlocks ? 1 : 0) + (hasFVGs ? 1 : 0) + (hasBOS ? 1 : 0);
    
    if (totalActive === 0) {
      // No hay datos, mantener pesos originales
      return adjustedWeights;
    }
    
    if (totalActive < 3) {
      // Faltan elementos, redistribuir pesos
      const totalOriginalWeight = 
        (hasOrderBlocks ? originalWeights.orderBlock : 0) +
        (hasFVGs ? originalWeights.fairValueGap : 0) +
        (hasBOS ? originalWeights.breakOfStructure : 0);
      
      // Normalizar pesos para que sumen 1.0
      if (hasOrderBlocks) {
        adjustedWeights.orderBlock = originalWeights.orderBlock / totalOriginalWeight;
      } else {
        adjustedWeights.orderBlock = 0;
      }
      
      if (hasFVGs) {
        adjustedWeights.fairValueGap = originalWeights.fairValueGap / totalOriginalWeight;
      } else {
        adjustedWeights.fairValueGap = 0;
      }
      
      if (hasBOS) {
        adjustedWeights.breakOfStructure = originalWeights.breakOfStructure / totalOriginalWeight;
      } else {
        adjustedWeights.breakOfStructure = 0;
      }
    }
    
    return adjustedWeights;
  }

  /**
   * Genera recomendaciones de trading
   */
  private generateTradingRecommendations(
    confluences: SmartMoneyConfluence[],
    marketBias: SMCMarketBias,
    institutionalActivity: any,
    premiumDiscountZones: any,
    currentPrice: number
  ): Array<{
    action: 'buy' | 'sell' | 'wait';
    reasoning: string;
    entryZone: { min: number; max: number };
    targets: number[];
    stopLoss: number;
    confidence: number;
    timeframe: string;
  }> {
    const recommendations: any[] = [];

    // Filtrar confluencias cercanas al precio actual
    const nearbyConfluences = confluences.filter(c => {
      const distance = Math.abs(c.priceLevel - currentPrice) / currentPrice;
      return distance < 0.05; // Dentro del 5%
    });

    // Recomendación basada en sesgo y zona actual
    if (marketBias.direction === 'bullish' && marketBias.strength >= this.config.biasStrengthThreshold) {
      if (premiumDiscountZones.currentZone === 'discount' || premiumDiscountZones.currentZone === 'equilibrium') {
        const bullishConfluence = nearbyConfluences.find(c => c.alignment === 'bullish');
        
        if (bullishConfluence) {
          recommendations.push({
            action: 'buy',
            reasoning: `Strong bullish bias with price in ${premiumDiscountZones.currentZone} zone near bullish confluence`,
            entryZone: {
              min: bullishConfluence.zone.lower,
              max: bullishConfluence.zone.midpoint
            },
            targets: this.calculateBullishTargets(currentPrice, confluences, premiumDiscountZones),
            stopLoss: bullishConfluence.zone.lower * 0.99,
            confidence: Math.min(95, marketBias.confidence + institutionalActivity.score * 0.2),
            timeframe: '4h-1d'
          });
        }
      }
    } else if (marketBias.direction === 'bearish' && marketBias.strength >= this.config.biasStrengthThreshold) {
      if (premiumDiscountZones.currentZone === 'premium' || premiumDiscountZones.currentZone === 'equilibrium') {
        const bearishConfluence = nearbyConfluences.find(c => c.alignment === 'bearish');
        
        if (bearishConfluence) {
          recommendations.push({
            action: 'sell',
            reasoning: `Strong bearish bias with price in ${premiumDiscountZones.currentZone} zone near bearish confluence`,
            entryZone: {
              min: bearishConfluence.zone.midpoint,
              max: bearishConfluence.zone.upper
            },
            targets: this.calculateBearishTargets(currentPrice, confluences, premiumDiscountZones),
            stopLoss: bearishConfluence.zone.upper * 1.01,
            confidence: Math.min(95, marketBias.confidence + institutionalActivity.score * 0.2),
            timeframe: '4h-1d'
          });
        }
      }
    }

    // Si no hay setups claros, recomendar esperar
    if (recommendations.length === 0) {
      recommendations.push({
        action: 'wait',
        reasoning: this.generateWaitReasoning(marketBias, premiumDiscountZones, institutionalActivity),
        entryZone: { min: 0, max: 0 },
        targets: [],
        stopLoss: 0,
        confidence: 50,
        timeframe: 'monitor'
      });
    }

    return recommendations;
  }

  /**
   * Identifica niveles clave integrados
   */
  private identifyKeyLevels(
    orderBlocks: OrderBlockAnalysis,
    fvgs: FVGAnalysis,
    bos: MarketStructureAnalysis,
    confluences: SmartMoneyConfluence[]
  ): Array<{
    price: number;
    type: string;
    strength: number;
    description: string;
  }> {
    const levels: any[] = [];

    // Agregar Order Blocks fuertes
    orderBlocks.activeBlocks
      .filter(ob => ob.strength >= 70)
      .forEach(ob => {
        levels.push({
          price: ob.zone.midpoint,
          type: `${ob.type} order block`,
          strength: ob.strength,
          description: `Strong ${ob.type} OB with ${ob.respectCount} tests`
        });
      });

    // Agregar FVGs significativos
    fvgs.openGaps
      .filter(fvg => fvg.context.significance !== 'low')
      .forEach(fvg => {
        levels.push({
          price: fvg.gap.midpoint,
          type: `${fvg.type} FVG`,
          strength: fvg.probability.fill,
          description: `${fvg.context.significance} ${fvg.type} gap (${fvg.gap.sizePercent.toFixed(2)}%)`
        });
      });

    // Agregar niveles de BOS
    bos.activeBreaks.forEach((breakItem: StructuralBreak) => {
      levels.push({
        price: breakItem.breakPoint.price,
        type: `${breakItem.type} level`,
        strength: breakItem.probability,
        description: `${breakItem.type} ${breakItem.direction} at ${breakItem.breakPoint.price}`
      });
    });

    // Agregar confluencias fuertes
    confluences
      .filter(c => c.strength >= 75)
      .forEach(c => {
        levels.push({
          price: c.priceLevel,
          type: 'SMC confluence',
          strength: c.strength,
          description: c.description
        });
      });

    // Ordenar por precio y eliminar duplicados cercanos
    return this.consolidateLevels(levels);
  }

  // ====================
  // MÉTODOS MULTI-EXCHANGE
  // ====================

  /**
   * Obtiene datos de validación multi-exchange
   */
  private async getMultiExchangeValidationData(symbol: string): Promise<{
    aggregatedTicker: any;
    volumeComparison: any;
    priceCorrelation: any;
    washTradingMetrics: any;
  }> {
    const [aggregatedTicker, volumeComparison] = await Promise.all([
      this.exchangeAggregator.getAggregatedTicker(symbol),
      this.exchangeAggregator.analyzeVolumeDivergences(symbol)
    ]);

    // Calcular correlación de precios
    const priceCorrelation = this.calculatePriceCorrelation(Object.values(aggregatedTicker.exchanges));
    
    // Detectar wash trading
    const washTradingMetrics = this.detectWashTradingIndicators(volumeComparison);

    return {
      aggregatedTicker,
      volumeComparison,
      priceCorrelation,
      washTradingMetrics
    };
  }

  /**
   * Analiza Order Blocks con validación cross-exchange
   */
  private async analyzeOrderBlocksWithCrossValidation(
    symbol: string,
    timeframe: string,
    lookback: number,
    multiExchangeData: any
  ): Promise<OrderBlockAnalysis> {
    // Obtener análisis base de Order Blocks
    const baseAnalysis = await this.orderBlocksService.detectOrderBlocks(symbol, timeframe, lookback);

    if (!multiExchangeData) {
      return baseAnalysis;
    }

    // Validar Order Blocks con datos cross-exchange
    const validatedBlocks = baseAnalysis.activeBlocks.filter(block => {
      return this.validateOrderBlockCrossExchange(block, multiExchangeData);
    }).map(block => ({
      ...block,
      strength: this.enhanceOrderBlockStrength(block, multiExchangeData),
      institutionalConfirmation: this.checkInstitutionalConfirmation(block, multiExchangeData)
    }));

    return {
      ...baseAnalysis,
      activeBlocks: validatedBlocks,
      // crossExchangeValidation: {
      //   originalCount: baseAnalysis.activeBlocks.length,
      //   validatedCount: validatedBlocks.length,
      //   washTradingFiltered: baseAnalysis.activeBlocks.length - validatedBlocks.length,
      //   averageStrengthImprovement: this.calculateAverageStrengthImprovement(baseAnalysis.activeBlocks, validatedBlocks)
      // }
    } as OrderBlockAnalysis & {
      crossExchangeValidation?: {
        originalCount: number;
        validatedCount: number;
        washTradingFiltered: number;
        averageStrengthImprovement: number;
      };
    };
  }

  /**
   * Analiza FVGs con validación cross-exchange
   */
  private async analyzeFVGsWithCrossValidation(
    symbol: string,
    timeframe: string,
    lookback: number,
    multiExchangeData: any
  ): Promise<FVGAnalysis> {
    const baseAnalysis = await this.fvgService.findFairValueGaps(symbol, timeframe, lookback);

    if (!multiExchangeData) {
      return baseAnalysis;
    }

    // Filtrar FVGs que no se confirman en múltiples exchanges
    const institutionalFVGs = baseAnalysis.openGaps.filter(fvg => {
      return this.validateFVGCrossExchange(fvg, multiExchangeData);
    }).map(fvg => ({
      ...fvg,
      probability: {
        ...fvg.probability,
        fill: this.enhanceFVGProbability(fvg, multiExchangeData)
      },
      institutionalSignificance: this.assessFVGInstitutionalSignificance(fvg, multiExchangeData)
    }));

    return {
      ...baseAnalysis,
      openGaps: institutionalFVGs,
      marketImbalance: {
        ...baseAnalysis.marketImbalance,
        // institutionalBias: this.calculateInstitutionalFVGBias(institutionalFVGs),
        // washTradingImpact: this.assessWashTradingImpactOnFVGs(multiExchangeData)
      }
    } as FVGAnalysis & {
      marketImbalance: FVGAnalysis['marketImbalance'] & {
        institutionalBias?: { direction: 'bullish' | 'bearish' | 'neutral'; strength: number };
        washTradingImpact?: string;
      };
    };
  }

  /**
   * Analiza BOS con validación cross-exchange
   */
  private async analyzeBOSWithCrossValidation(
    symbol: string,
    timeframe: string,
    lookback: number,
    multiExchangeData: any
  ): Promise<MarketStructureAnalysis> {
    const baseAnalysis = await this.bosService.detectBreakOfStructure(symbol, timeframe, lookback);

    if (!multiExchangeData) {
      return baseAnalysis;
    }

    // Validar breaks con confirmación multi-exchange
    const confirmedBreaks = baseAnalysis.activeBreaks.filter((breakItem: StructuralBreak) => {
      return this.validateBOSCrossExchange(breakItem, multiExchangeData);
    }).map((breakItem: StructuralBreak) => ({
      ...breakItem,
      probability: this.enhanceBOSProbability(breakItem, multiExchangeData),
      institutionalConfirmation: this.checkBOSInstitutionalConfirmation(breakItem, multiExchangeData)
    }));

    return {
      ...baseAnalysis,
      activeBreaks: confirmedBreaks,
      marketBias: {
        ...baseAnalysis.marketBias,
        // institutionalAlignment: this.calculateInstitutionalStructuralAlignment(confirmedBreaks, multiExchangeData)
      }
    } as MarketStructureAnalysis & {
      marketBias: MarketStructureAnalysis['marketBias'] & {
        institutionalAlignment?: number;
      };
    };
  }

  /**
   * Analiza actividad institucional con validación cross-exchange
   */
  private analyzeInstitutionalActivityWithCrossValidation(
    orderBlocks: OrderBlockAnalysis,
    fvgs: FVGAnalysis,
    bos: MarketStructureAnalysis,
    confluences: SmartMoneyConfluence[],
    multiExchangeData: any
  ): any {
    // Análisis base
    const baseActivity = this.analyzeInstitutionalActivity(orderBlocks, fvgs, bos, confluences);

    if (!multiExchangeData) {
      return baseActivity;
    }

    // Enriquecer con datos institucionales reales
    const crossExchangeScore = this.calculateCrossExchangeInstitutionalScore(multiExchangeData);
    const washTradingReduction = this.calculateWashTradingReduction(multiExchangeData);
    const realVolumeFootprint = this.calculateRealVolumeFootprint(multiExchangeData);

    const enhancedScore = Math.min(100, baseActivity.score + crossExchangeScore);
    const enhancedSignals = [
      ...baseActivity.signals,
      `Cross-exchange validation: +${crossExchangeScore} institutional confidence`,
      `Wash trading filtered: ${washTradingReduction.toFixed(1)}% of volume`,
      `Real institutional volume: ${realVolumeFootprint.institutionalPercent.toFixed(1)}%`
    ];

    return {
      ...baseActivity,
      score: enhancedScore,
      signals: enhancedSignals,
      crossExchangeMetrics: {
        washTradingReduction,
        realVolumeFootprint,
        institutionalConfidence: crossExchangeScore,
        exchangeConsensus: this.calculateExchangeConsensus(multiExchangeData)
      },
      interpretation: this.generateEnhancedInstitutionalInterpretation(enhancedScore, washTradingReduction)
    };
  }

  // ====================
  // MÉTODOS AUXILIARES MULTI-EXCHANGE
  // ====================

  private calculatePriceCorrelation(exchanges: any[]): number {
    if (exchanges.length < 2) return 100;
    
    const prices = exchanges.map(e => e.lastPrice);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxDeviation = Math.max(...prices.map(p => Math.abs(p - avgPrice) / avgPrice));
    
    return Math.max(0, 100 - (maxDeviation * 100 * 10)); // 10x multiplier for sensitivity
  }

  private detectWashTradingIndicators(volumeComparison: any): {
    suspiciousVolumeSpikes: number;
    priceVolumeDisconnect: number;
    artificialLiquidityScore: number;
  } {
    const exchanges = volumeComparison.exchanges || [];
    
    // Detectar spikes sospechosos de volumen
    const suspiciousSpikes = exchanges.filter((e: any) => 
      e.volumeDeviation > 3 && e.priceDeviation < 0.1
    ).length;
    
    // Detectar desconexión precio-volumen
    const avgPriceVolumeRatio = exchanges.reduce((sum: number, e: any) => 
      sum + (e.priceDeviation / Math.max(e.volumeDeviation, 0.1)), 0
    ) / exchanges.length;
    
    return {
      suspiciousVolumeSpikes: suspiciousSpikes,
      priceVolumeDisconnect: Math.max(0, 100 - (avgPriceVolumeRatio * 50)),
      artificialLiquidityScore: Math.min(100, suspiciousSpikes * 25 + (100 - avgPriceVolumeRatio * 50))
    };
  }

  private validateOrderBlockCrossExchange(block: OrderBlock, multiExchangeData: any): boolean {
    const { priceCorrelation, washTradingMetrics } = multiExchangeData;
    
    // Filtrar si hay demasiado wash trading
    if (washTradingMetrics.artificialLiquidityScore > 70) {
      return false;
    }
    
    // Filtrar si los precios no están correlacionados
    if (priceCorrelation < 95) {
      return false;
    }
    
    return true;
  }

  private enhanceOrderBlockStrength(block: OrderBlock, multiExchangeData: any): number {
    let enhancement = 0;
    const { priceCorrelation, washTradingMetrics } = multiExchangeData;
    
    // Bonus por alta correlación de precios
    if (priceCorrelation > 98) enhancement += 5;
    else if (priceCorrelation > 95) enhancement += 2;
    
    // Penalty por wash trading
    enhancement -= washTradingMetrics.artificialLiquidityScore * 0.1;
    
    return Math.max(0, Math.min(100, block.strength + enhancement));
  }

  private checkInstitutionalConfirmation(block: OrderBlock, multiExchangeData: any): boolean {
    const { volumeComparison } = multiExchangeData;
    
    // Confirmar si el volumen es consistente entre exchanges
    const volumeConsistency = volumeComparison.consistency || 0;
    return volumeConsistency > 80;
  }

  private calculateAverageStrengthImprovement(original: OrderBlock[], validated: OrderBlock[]): number {
    if (original.length === 0 || validated.length === 0) return 0;
    
    const originalAvg = original.reduce((sum, block) => sum + block.strength, 0) / original.length;
    const validatedAvg = validated.reduce((sum, block) => sum + block.strength, 0) / validated.length;
    
    return validatedAvg - originalAvg;
  }

  private validateFVGCrossExchange(fvg: FairValueGap, multiExchangeData: any): boolean {
    const { priceCorrelation, washTradingMetrics } = multiExchangeData;
    
    // Requiere correlación alta para FVGs institucionales
    return priceCorrelation > 96 && washTradingMetrics.artificialLiquidityScore < 60;
  }

  private enhanceFVGProbability(fvg: FairValueGap, multiExchangeData: any): number {
    const { priceCorrelation } = multiExchangeData;
    const enhancement = (priceCorrelation - 95) * 2; // 2% per correlation point above 95%
    
    return Math.max(0, Math.min(100, fvg.probability.fill + enhancement));
  }

  private assessFVGInstitutionalSignificance(fvg: FairValueGap, multiExchangeData: any): string {
    const { washTradingMetrics, volumeComparison } = multiExchangeData;
    
    if (washTradingMetrics.artificialLiquidityScore < 30 && volumeComparison.consistency > 85) {
      return 'high';
    } else if (washTradingMetrics.artificialLiquidityScore < 60) {
      return 'medium';
    }
    return 'low';
  }

  private calculateInstitutionalFVGBias(fvgs: FairValueGap[]): {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  } {
    if (fvgs.length === 0) {
      return { direction: 'neutral', strength: 50 };
    }
    
    const bullishFVGs = fvgs.filter(fvg => fvg.type === 'bullish').length;
    const bearishFVGs = fvgs.filter(fvg => fvg.type === 'bearish').length;
    
    if (bullishFVGs > bearishFVGs) {
      return { direction: 'bullish', strength: 50 + (bullishFVGs - bearishFVGs) * 10 };
    } else if (bearishFVGs > bullishFVGs) {
      return { direction: 'bearish', strength: 50 + (bearishFVGs - bullishFVGs) * 10 };
    }
    
    return { direction: 'neutral', strength: 50 };
  }

  private assessWashTradingImpactOnFVGs(multiExchangeData: any): string {
    const { washTradingMetrics } = multiExchangeData;
    
    if (washTradingMetrics.artificialLiquidityScore > 70) {
      return 'high - FVG signals may be artificial';
    } else if (washTradingMetrics.artificialLiquidityScore > 40) {
      return 'moderate - some FVG noise detected';
    }
    return 'low - clean FVG signals';
  }

  private validateBOSCrossExchange(breakItem: StructuralBreak, multiExchangeData: any): boolean {
    const { priceCorrelation, volumeComparison } = multiExchangeData;
    
    // Requiere alta correlación y volumen consistente para BOS válidos
    return priceCorrelation > 97 && volumeComparison.consistency > 80;
  }

  private enhanceBOSProbability(breakItem: StructuralBreak, multiExchangeData: any): number {
    const { priceCorrelation, volumeComparison } = multiExchangeData;
    
    let enhancement = 0;
    if (priceCorrelation > 98) enhancement += 10;
    if (volumeComparison.consistency > 90) enhancement += 10;
    
    return Math.max(0, Math.min(100, breakItem.probability + enhancement));
  }

  private checkBOSInstitutionalConfirmation(breakItem: StructuralBreak, multiExchangeData: any): boolean {
    const { washTradingMetrics } = multiExchangeData;
    return washTradingMetrics.artificialLiquidityScore < 50;
  }

  private calculateInstitutionalStructuralAlignment(breaks: StructuralBreak[], multiExchangeData: any): number {
    if (breaks.length === 0) return 50;
    
    const { priceCorrelation, volumeComparison } = multiExchangeData;
    const baseAlignment = breaks.reduce((sum, b) => sum + b.probability, 0) / breaks.length;
    const crossExchangeBonus = (priceCorrelation + volumeComparison.consistency) / 2 - 85; // Bonus above 85%
    
    return Math.max(0, Math.min(100, baseAlignment + crossExchangeBonus));
  }

  private calculateCrossExchangeInstitutionalScore(multiExchangeData: any): number {
    const { priceCorrelation, volumeComparison, washTradingMetrics } = multiExchangeData;
    
    let score = 0;
    
    // Bonus por correlación de precios
    if (priceCorrelation > 98) score += 15;
    else if (priceCorrelation > 95) score += 10;
    else if (priceCorrelation > 90) score += 5;
    
    // Bonus por consistencia de volumen
    if (volumeComparison.consistency > 90) score += 15;
    else if (volumeComparison.consistency > 80) score += 10;
    else if (volumeComparison.consistency > 70) score += 5;
    
    // Penalty por wash trading
    score -= washTradingMetrics.artificialLiquidityScore * 0.2;
    
    return Math.max(0, Math.min(25, score)); // Max 25 puntos de bonus
  }

  private calculateWashTradingReduction(multiExchangeData: any): number {
    const { washTradingMetrics } = multiExchangeData;
    return washTradingMetrics.artificialLiquidityScore;
  }

  private calculateRealVolumeFootprint(multiExchangeData: any): {
    institutionalPercent: number;
    retailPercent: number;
    washTradingPercent: number;
  } {
    const { washTradingMetrics, volumeComparison } = multiExchangeData;
    
    const washTradingPercent = washTradingMetrics.artificialLiquidityScore;
    const realVolumePercent = 100 - washTradingPercent;
    const institutionalPercent = realVolumePercent * (volumeComparison.consistency / 100) * 0.7; // 70% of consistent volume is institutional
    const retailPercent = realVolumePercent - institutionalPercent;
    
    return {
      institutionalPercent,
      retailPercent,
      washTradingPercent
    };
  }

  private calculateExchangeConsensus(multiExchangeData: any): number {
    const { priceCorrelation, volumeComparison } = multiExchangeData;
    return (priceCorrelation + volumeComparison.consistency) / 2;
  }

  private generateEnhancedInstitutionalInterpretation(score: number, washTradingReduction: number): string {
    const baseInterpretation = score >= 60 ?
      'High institutional activity detected with cross-exchange validation' :
      score >= 40 ?
      'Moderate institutional activity with partial cross-exchange confirmation' :
      'Limited institutional activity across exchanges';
    
    const washTradingNote = washTradingReduction > 50 ?
      ` (${washTradingReduction.toFixed(1)}% wash trading filtered out)` :
      '';
    
    return baseInterpretation + washTradingNote;
  }

  // ====================
  // MÉTODOS AUXILIARES ORIGINALES
  // ====================

  private calculateZoneDistance(
    zone1: { upper: number; lower: number; midpoint: number },
    zone2: { upper: number; lower: number; midpoint: number }
  ): number {
    // Calcular distancia mínima entre zonas
    const distances = [
      Math.abs(zone1.upper - zone2.lower),
      Math.abs(zone1.lower - zone2.upper),
      Math.abs(zone1.midpoint - zone2.midpoint)
    ];
    
    const minDistance = Math.min(...distances);
    const avgPrice = (zone1.midpoint + zone2.midpoint) / 2;
    
    return minDistance / avgPrice; // Normalizar como porcentaje
  }

  private determineTripleConfluenceAlignment(
    obType: 'bullish' | 'bearish' | 'breaker',
    fvgType: 'bullish' | 'bearish',
    bosDirection: 'bullish' | 'bearish'
  ): 'bullish' | 'bearish' | 'mixed' {
    let bullishCount = 0;
    let bearishCount = 0;

    // Order Block type (breaker counts as mixed, neither bullish nor bearish)
    if (obType === 'bullish') bullishCount++;
    else if (obType === 'bearish') bearishCount++;
    // breaker blocks don't add to either count
    
    if (fvgType === 'bullish') bullishCount++;
    else bearishCount++;
    
    if (bosDirection === 'bullish') bullishCount++;
    else bearishCount++;

    if (bullishCount === 3) return 'bullish';
    if (bearishCount === 3) return 'bearish';
    return 'mixed';
  }

  private generateConfluenceDescription(
    types: string[],
    alignment: string,
    strength: number
  ): string {
    const typeStr = types.join(' + ');
    const strengthStr = strength >= 80 ? 'Strong' : strength >= 60 ? 'Moderate' : 'Weak';
    return `${strengthStr} ${alignment} confluence: ${typeStr}`;
  }

  private normalizeMarketBias(bias: string): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
    // Normalizar bias de Order Blocks
    return {
      direction: bias as any,
      strength: 70 // Default strength
    };
  }

  private calculateFVGBias(fvgs: FVGAnalysis): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
    const { bullishGaps, bearishGaps, netImbalance, strength } = fvgs.marketImbalance;
    
    return {
      direction: netImbalance,
      strength: strength
    };
  }

  private normalizeBOSBias(bias: any): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
    return {
      direction: bias.direction,
      strength: bias.strength
    };
  }

  private calculateBiasConfidence(
    biases: Array<{ direction: string; strength: number }>,
    confluences: SmartMoneyConfluence[],
    overallStrength: number
  ): number {
    let confidence = 50;

    // Bonus por alineación de biases
    const alignedBiases = biases.filter(b => b.direction === biases[0].direction).length;
    confidence += alignedBiases * 10;

    // Bonus por fuerza general
    confidence += overallStrength * 0.3;

    // Bonus por confluencias
    confidence += Math.min(20, confluences.length * 5);

    return Math.min(95, confidence);
  }

  private generateBiasReasoning(
    direction: string,
    components: any,
    confluences: SmartMoneyConfluence[]
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Overall ${direction} bias detected with integrated SMC analysis`);
    
    if (components.obBias.direction === direction) {
      reasoning.push(`Order blocks support ${direction} bias`);
    }
    
    if (components.fvgBias.direction === direction) {
      reasoning.push(`Fair value gaps indicate ${direction} imbalance`);
    }
    
    if (components.bosBias.direction === direction) {
      reasoning.push(`Market structure confirms ${direction} trend`);
    }

    if (confluences.length > 0) {
      reasoning.push(`${confluences.length} SMC confluences identified`);
    }

    return reasoning;
  }

  private calculateBullishTargets(
    currentPrice: number,
    confluences: SmartMoneyConfluence[],
    zones: any
  ): number[] {
    const targets: number[] = [];

    // Target 1: Próxima resistencia o confluencia
    const nextResistance = confluences
      .filter(c => c.priceLevel > currentPrice)
      .sort((a, b) => a.priceLevel - b.priceLevel)[0];
    
    if (nextResistance) {
      targets.push(nextResistance.priceLevel);
    } else {
      targets.push(currentPrice * 1.015); // 1.5% default
    }

    // Target 2: Zona premium
    targets.push(zones.premium.start);

    // Target 3: Extremo de rango
    targets.push(zones.premium.end);

    return targets;
  }

  private calculateBearishTargets(
    currentPrice: number,
    confluences: SmartMoneyConfluence[],
    zones: any
  ): number[] {
    const targets: number[] = [];

    // Target 1: Próximo soporte o confluencia
    const nextSupport = confluences
      .filter(c => c.priceLevel < currentPrice)
      .sort((a, b) => b.priceLevel - a.priceLevel)[0];
    
    if (nextSupport) {
      targets.push(nextSupport.priceLevel);
    } else {
      targets.push(currentPrice * 0.985); // 1.5% default
    }

    // Target 2: Zona discount
    targets.push(zones.discount.end);

    // Target 3: Extremo de rango
    targets.push(zones.discount.start);

    return targets;
  }

  private generateWaitReasoning(
    marketBias: SMCMarketBias,
    zones: any,
    institutionalActivity: any
  ): string {
    const reasons: string[] = [];

    if (marketBias.direction === 'neutral') {
      reasons.push('Market bias is neutral');
    }

    if (marketBias.strength < this.config.biasStrengthThreshold) {
      reasons.push('Bias strength insufficient for high-probability setup');
    }

    if (zones.currentZone === 'premium' && marketBias.direction === 'bullish') {
      reasons.push('Price in premium zone with bullish bias - wait for pullback');
    }

    if (zones.currentZone === 'discount' && marketBias.direction === 'bearish') {
      reasons.push('Price in discount zone with bearish bias - wait for rally');
    }

    if (institutionalActivity.score < 50) {
      reasons.push('Low institutional activity detected');
    }

    return reasons.join('. ');
  }

  private consolidateLevels(levels: any[]): any[] {
    // Ordenar por precio
    levels.sort((a, b) => a.price - b.price);

    // Consolidar niveles cercanos
    const consolidated: any[] = [];
    const threshold = 0.005; // 0.5% distancia

    for (const level of levels) {
      const lastLevel = consolidated[consolidated.length - 1];
      
      if (!lastLevel || Math.abs(level.price - lastLevel.price) / lastLevel.price > threshold) {
        consolidated.push(level);
      } else if (level.strength > lastLevel.strength) {
        // Reemplazar con el más fuerte
        consolidated[consolidated.length - 1] = level;
      }
    }

    return consolidated;
  }

  private calculateOverallConfidence(
    confluences: SmartMoneyConfluence[],
    institutionalActivity: any
  ): number {
    let confidence = 50;

    // Ajustar por confluencias
    confidence += Math.min(30, confluences.length * 10);

    // Ajustar por actividad institucional
    confidence += institutionalActivity.score * 0.2;

    return Math.min(95, Math.round(confidence));
  }

  private calculateConfluenceSupport(confluences: SmartMoneyConfluence[]): {
    strong: number;
    moderate: number;
    weak: number;
  } {
    return {
      strong: confluences.filter(c => c.strength >= 80).length,
      moderate: confluences.filter(c => c.strength >= 60 && c.strength < 80).length,
      weak: confluences.filter(c => c.strength < 60).length
    };
  }

  private calculateInstitutionalAlignment(analysis: SmartMoneyAnalysis): number {
    return analysis.institutionalActivity.score;
  }

  private identifyKeyInfluencers(analysis: SmartMoneyAnalysis): string[] {
    const influencers: string[] = [];

    if (analysis.institutionalActivity.footprint.orderBlockActivity >= 70) {
      influencers.push('Strong order block presence');
    }

    if (analysis.institutionalActivity.footprint.fvgCreation >= 70) {
      influencers.push('Active FVG creation');
    }

    if (analysis.institutionalActivity.footprint.structuralManipulation >= 70) {
      influencers.push('Structural manipulation detected');
    }

    if (analysis.confluences.length >= 5) {
      influencers.push('Multiple SMC confluences');
    }

    return influencers;
  }

  private validateDirectionalAlignment(
    setupType: 'long' | 'short',
    marketBias: SMCMarketBias
  ): number {
    if (setupType === 'long' && marketBias.direction === 'bullish') {
      return marketBias.strength;
    } else if (setupType === 'short' && marketBias.direction === 'bearish') {
      return marketBias.strength;
    } else if (marketBias.direction === 'neutral') {
      return 30; // Penalización por bias neutral
    } else {
      return 10; // Penalización severa por contra-tendencia
    }
  }

  private validateConfluencesAtEntry(
    entryPrice: number,
    confluences: SmartMoneyConfluence[],
    setupType: 'long' | 'short'
  ): { score: number; supportingConfluences: SmartMoneyConfluence[] } {
    const nearbyConfluences = confluences.filter(c => {
      const distance = Math.abs(c.priceLevel - entryPrice) / entryPrice;
      return distance < 0.03; // Dentro del 3%
    });

    const supportingConfluences = nearbyConfluences.filter(c => {
      if (setupType === 'long') return c.alignment === 'bullish' || c.alignment === 'mixed';
      else return c.alignment === 'bearish' || c.alignment === 'mixed';
    });

    const score = supportingConfluences.length > 0 ?
      Math.min(100, supportingConfluences.reduce((sum, c) => sum + c.strength, 0) / supportingConfluences.length) :
      20;

    return { score, supportingConfluences };
  }

  private validateStructureContext(
    bosAnalysis: MarketStructureAnalysis,
    setupType: 'long' | 'short'
  ): { score: number; supportingBreaks: number } {
    const recentBreaks = bosAnalysis.recentBreaks || [];
    const supportingBreaks = recentBreaks.filter((b: StructuralBreak) => {
      if (setupType === 'long') return b.direction === 'bullish';
      else return b.direction === 'bearish';
    });

    const score = supportingBreaks.length > 0 ?
      60 + supportingBreaks.length * 15 :
      40;

    return {
      score: Math.min(100, score),
      supportingBreaks: supportingBreaks.length
    };
  }

  private validateInstitutionalPresence(
    institutionalActivity: any
  ): { score: number; signals: string[] } {
    return {
      score: institutionalActivity.score,
      signals: institutionalActivity.signals
    };
  }

  private calculateSetupScore(factors: {
    directionalAlignment: number;
    confluenceValidation: { score: number };
    structureValidation: { score: number };
    institutionalValidation: { score: number };
  }): number {
    const weights = {
      direction: 0.3,
      confluence: 0.25,
      structure: 0.25,
      institutional: 0.2
    };

    return Math.round(
      factors.directionalAlignment * weights.direction +
      factors.confluenceValidation.score * weights.confluence +
      factors.structureValidation.score * weights.structure +
      factors.institutionalValidation.score * weights.institutional
    );
  }

  private calculateOptimalEntry(
    analysis: SmartMoneyAnalysis,
    setupType: 'long' | 'short',
    currentEntry: number
  ): {
    price: number;
    zone: { min: number; max: number };
    reasoning: string;
  } {
    const nearbyConfluences = analysis.confluences.filter(c => {
      const distance = Math.abs(c.priceLevel - currentEntry) / currentEntry;
      return distance < 0.05; // Dentro del 5%
    });

    let optimalPrice = currentEntry;
    let zone = { min: currentEntry * 0.995, max: currentEntry * 1.005 };
    let reasoning = 'Entry at market price';

    if (nearbyConfluences.length > 0) {
      const bestConfluence = nearbyConfluences
        .filter(c => setupType === 'long' ? c.alignment === 'bullish' : c.alignment === 'bearish')
        .sort((a, b) => b.strength - a.strength)[0];

      if (bestConfluence) {
        optimalPrice = bestConfluence.priceLevel;
        zone = {
          min: bestConfluence.zone.lower,
          max: bestConfluence.zone.upper
        };
        reasoning = `Entry at ${bestConfluence.description}`;
      }
    }

    return { price: optimalPrice, zone, reasoning };
  }

  private generateRiskManagement(
    analysis: SmartMoneyAnalysis,
    setupType: 'long' | 'short',
    entryPrice: number
  ): {
    stopLoss: number;
    takeProfits: number[];
    positionSize: number;
    maxRisk: number;
    riskRewardRatio: number;
  } {
    let stopLoss: number;
    let takeProfits: number[] = [];

    if (setupType === 'long') {
      // Stop loss debajo de la estructura más cercana
      const nearestLow = analysis.keyLevels
        .filter(l => l.price < entryPrice)
        .sort((a, b) => b.price - a.price)[0];
      
      stopLoss = nearestLow ? nearestLow.price * 0.995 : entryPrice * 0.97;
      
      // Take profits en resistencias
      takeProfits = analysis.keyLevels
        .filter(l => l.price > entryPrice)
        .sort((a, b) => a.price - b.price)
        .slice(0, 3)
        .map(l => l.price);
    } else {
      // Stop loss arriba de la estructura más cercana
      const nearestHigh = analysis.keyLevels
        .filter(l => l.price > entryPrice)
        .sort((a, b) => a.price - b.price)[0];
      
      stopLoss = nearestHigh ? nearestHigh.price * 1.005 : entryPrice * 1.03;
      
      // Take profits en soportes
      takeProfits = analysis.keyLevels
        .filter(l => l.price < entryPrice)
        .sort((a, b) => b.price - a.price)
        .slice(0, 3)
        .map(l => l.price);
    }

    // Si no hay suficientes niveles, agregar targets por defecto
    if (takeProfits.length < 3) {
      const riskAmount = Math.abs(entryPrice - stopLoss);
      takeProfits.push(
        entryPrice + (setupType === 'long' ? 1 : -1) * riskAmount * 1.5,
        entryPrice + (setupType === 'long' ? 1 : -1) * riskAmount * 2.5,
        entryPrice + (setupType === 'long' ? 1 : -1) * riskAmount * 4
      );
    }

    const riskAmount = Math.abs(entryPrice - stopLoss);
    const potentialReward = Math.abs(takeProfits[1] - entryPrice); // Usar TP2 para R:R
    const riskRewardRatio = potentialReward / riskAmount;

    return {
      stopLoss,
      takeProfits: takeProfits.slice(0, 3),
      positionSize: 1, // Placeholder - calcular basado en cuenta
      maxRisk: 2, // 2% riesgo máximo por operación
      riskRewardRatio: Math.round(riskRewardRatio * 10) / 10
    };
  }

  private generateSetupWarnings(
    analysis: SmartMoneyAnalysis,
    setupType: 'long' | 'short',
    score: number
  ): string[] {
    const warnings: string[] = [];

    if (score < 60) {
      warnings.push('Setup score below recommended threshold');
    }

    if (analysis.premiumDiscountZones.currentZone === 'premium' && setupType === 'long') {
      warnings.push('Long entry in premium zone - consider waiting for discount');
    }

    if (analysis.premiumDiscountZones.currentZone === 'discount' && setupType === 'short') {
      warnings.push('Short entry in discount zone - consider waiting for premium');
    }

    if (analysis.institutionalActivity.score < 50) {
      warnings.push('Low institutional activity may result in choppy price action');
    }

    if (analysis.confluences.filter(c => c.alignment === 'mixed').length > 2) {
      warnings.push('Multiple mixed confluences indicate unclear market conditions');
    }

    return warnings;
  }

  private generateAlternativeScenarios(
    analysis: SmartMoneyAnalysis,
    setupType: 'long' | 'short'
  ): Array<{
    scenario: string;
    probability: number;
    action: string;
  }> {
    const scenarios: any[] = [];

    // Escenario principal
    scenarios.push({
      scenario: `${setupType.toUpperCase()} setup plays out as expected`,
      probability: analysis.statistics.overallConfidence,
      action: 'Follow original plan with proper risk management'
    });

    // Escenario de invalidación
    scenarios.push({
      scenario: 'Setup invalidation due to structure break',
      probability: 100 - analysis.statistics.overallConfidence,
      action: 'Exit at stop loss and reassess market conditions'
    });

    // Escenario de consolidación
    if (analysis.marketBias.direction === 'neutral' || analysis.marketBias.strength < 60) {
      scenarios.push({
        scenario: 'Market enters consolidation phase',
        probability: 40,
        action: 'Consider taking partial profits early or tightening stops'
      });
    }

    return scenarios.sort((a, b) => b.probability - a.probability);
  }

  private calculateSetupConfidence(
    score: number,
    analysis: SmartMoneyAnalysis
  ): number {
    let confidence = score;

    // Ajustar por factores adicionales
    if (analysis.statistics.strongConfluences >= 2) {
      confidence += 10;
    }

    if (analysis.institutionalActivity.score >= 70) {
      confidence += 5;
    }

    return Math.min(95, Math.round(confidence));
  }

  private recordPerformance(
    functionName: string,
    startTime: number,
    success: boolean,
    error?: any
  ): void {
    const metric: PerformanceMetrics = {
      functionName,
      executionTime: performance.now() - startTime,
      memoryUsage: process.memoryUsage().heapUsed,
      timestamp: new Date().toISOString(),
      success,
      errorType: error?.constructor?.name
    };

    this.performanceMetrics.push(metric);
    
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  // Métodos de configuración
  updateConfig(config: Partial<SMCConfig>): SMCConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  getConfig(): SMCConfig {
    return { ...this.config };
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }
}