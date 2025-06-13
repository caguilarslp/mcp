/**
 * @fileoverview Smart Money Concepts Dashboard Service
 * @description Comprehensive dashboard and confluence analysis for Smart Money Concepts
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
  SMCConfig
} from '../../types/index.js';

import { SmartMoneyAnalysisService } from './smartMoneyAnalysis.js';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

// ====================
// DASHBOARD TYPES
// ====================

export interface SMCDashboard {
  symbol: string;
  timeframe: string;
  timestamp: string;
  currentPrice: number;
  
  // Market Overview
  marketOverview: {
    bias: SMCMarketBias;
    institutionalActivity: number;
    currentZone: 'premium' | 'discount' | 'equilibrium';
    volatility: 'high' | 'medium' | 'low';
    sessionContext: string;
  };

  // Key Metrics
  keyMetrics: {
    totalOrderBlocks: number;
    activeOrderBlocks: number;
    totalFVGs: number;
    openFVGs: number;
    totalBOS: number;
    recentBOS: number;
    confluenceScore: number;
    institutionalScore: number;
    setupQuality: number;
  };

  // Level Analysis
  levelAnalysis: {
    criticalLevels: Array<{
      price: number;
      type: string;
      strength: number;
      distance: number;
      description: string;
      confluence: boolean;
    }>;
    supportLevels: number[];
    resistanceLevels: number[];
    nearestLevel: {
      price: number;
      type: string;
      distance: number;
    };
  };

  // Confluence Analysis
  confluenceAnalysis: {
    totalConfluences: number;
    strongConfluences: SmartMoneyConfluence[];
    moderateConfluences: SmartMoneyConfluence[];
    weakConfluences: SmartMoneyConfluence[];
    nearestConfluence?: SmartMoneyConfluence;
    confluenceStrength: number;
  };

  // Trading Analysis
  tradingAnalysis: {
    primarySetup?: {
      direction: 'long' | 'short';
      entryZone: { min: number; max: number };
      targets: number[];
      stopLoss: number;
      confidence: number;
      riskReward: number;
    };
    alternativeSetups: Array<{
      direction: 'long' | 'short';
      reason: string;
      probability: number;
    }>;
    marketCondition: 'trending' | 'ranging' | 'volatile' | 'uncertain';
    recommendation: 'aggressive' | 'moderate' | 'conservative' | 'wait';
  };

  // Risk Assessment
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: string[];
    stopLossRecommendations: number[];
    positionSizeRecommendation: number;
    maxDrawdownExpected: number;
  };

  // Alerts & Notifications
  alerts: Array<{
    type: 'confluence' | 'break' | 'retest' | 'setup' | 'warning';
    priority: 'high' | 'medium' | 'low';
    message: string;
    price?: number;
    timeframe?: string;
  }>;

  // Performance Tracking
  performanceMetrics: {
    analysisTime: number;
    dataPoints: number;
    cacheHits: number;
    accuracy: number;
    lastUpdate: string;
  };

  // Raw Data (for debugging/advanced users)
  rawAnalysis: SmartMoneyAnalysis;
}

export interface SMCTradingSetup {
  id: string;
  symbol: string;
  timeframe: string;
  timestamp: string;
  
  // Setup Identification
  setupType: 'long' | 'short';
  setupQuality: 'premium' | 'standard' | 'basic';
  confidence: number;
  
  // Entry Analysis
  entryAnalysis: {
    optimalEntry: number;
    entryZone: { min: number; max: number };
    currentPrice: number;
    distanceToEntry: number;
    entryTrigger: string;
    confluenceSupport: SmartMoneyConfluence[];
  };
  
  // Risk Management
  riskManagement: {
    stopLoss: number;
    takeProfits: number[];
    riskAmount: number;
    rewardPotential: number;
    riskRewardRatio: number;
    positionSize: number;
    maxRisk: number;
  };
  
  // Probability Analysis
  probabilityAnalysis: {
    successProbability: number;
    factorBreakdown: {
      confluenceStrength: number;
      institutionalAlignment: number;
      structuralSupport: number;
      marketBias: number;
      volumeConfirmation: number;
    };
    confidenceInterval: { min: number; max: number };
  };
  
  // Monitoring
  monitoring: {
    keyLevels: number[];
    invalidationLevel: number;
    progressTracking: {
      currentStage: string;
      completionPercentage: number;
      nextMilestone: string;
    };
    alerts: Array<{
      trigger: string;
      condition: string;
      action: string;
    }>;
  };
  
  // Scenarios
  scenarios: Array<{
    name: string;
    probability: number;
    outcome: string;
    action: string;
    priceTarget?: number;
  }>;
  
  // Confluence Details
  confluenceDetails: {
    primaryConfluence: SmartMoneyConfluence;
    supportingConfluences: SmartMoneyConfluence[];
    conflictingSignals: string[];
    strengthScore: number;
  };
}

export interface SMCConfluenceStrength {
  symbol: string;
  timeframe: string;
  timestamp: string;
  
  // Overall Strength
  overallStrength: number;
  strengthRating: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
  
  // Confluence Breakdown
  confluenceBreakdown: {
    total: number;
    byType: {
      orderBlock: number;
      fairValueGap: number;
      breakOfStructure: number;
      triple: number;
    };
    byStrength: {
      veryStrong: number;
      strong: number;
      moderate: number;
      weak: number;
    };
    byAlignment: {
      bullish: number;
      bearish: number;
      mixed: number;
    };
  };
  
  // Strength Factors
  strengthFactors: {
    density: number;           // Confluencias per price level
    consistency: number;       // Alineación direccional
    proximity: number;         // Cercanía al precio actual
    institutionalFootprint: number; // Señales institucionales
    volumeConfirmation: number; // Confirmación volumétrica
    timeRelevance: number;     // Relevancia temporal
  };
  
  // Key Confluence Zones
  keyZones: Array<{
    priceLevel: number;
    strength: number;
    types: string[];
    direction: 'bullish' | 'bearish' | 'mixed';
    confluences: SmartMoneyConfluence[];
    tradingRecommendation: string;
  }>;
  
  // Strength Evolution
  strengthEvolution: {
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number;
    stabilityIndex: number;
    forecast: {
      next4Hours: number;
      next1Day: number;
      confidence: number;
    };
  };
  
  // Confluence Quality
  qualityMetrics: {
    averageConfluenceStrength: number;
    strongConfluenceRatio: number;
    alignmentConsistency: number;
    institutionalAlignment: number;
    marketContextAlignment: number;
  };
  
  // Recommendations
  recommendations: {
    tradingApproach: string;
    riskLevel: string;
    timeframe: string;
    keyLevelsToWatch: number[];
    criticalAlerts: string[];
  };
}

// ====================
// SMART MONEY DASHBOARD SERVICE
// ====================

export class SmartMoneyDashboardService {
  private smartMoneyService: SmartMoneyAnalysisService;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(
    marketDataService: IMarketDataService,
    analysisService: IAnalysisService
  ) {
    this.smartMoneyService = new SmartMoneyAnalysisService(marketDataService, analysisService);
  }

  /**
   * Generate comprehensive SMC dashboard
   */
  async getSMCDashboard(
    symbol: string,
    timeframe: string = '60'
  ): Promise<SMCDashboard> {
    const startTime = performance.now();

    try {
      // Get comprehensive SMC analysis
      const rawAnalysis = await this.smartMoneyService.analyzeSmartMoneyConfluence(
        symbol,
        timeframe
      );

      // Build dashboard components
      const marketOverview = this.buildMarketOverview(rawAnalysis);
      const keyMetrics = this.buildKeyMetrics(rawAnalysis);
      const levelAnalysis = this.buildLevelAnalysis(rawAnalysis);
      const confluenceAnalysis = this.buildConfluenceAnalysis(rawAnalysis);
      const tradingAnalysis = this.buildTradingAnalysis(rawAnalysis);
      const riskAssessment = this.buildRiskAssessment(rawAnalysis);
      const alerts = this.generateSmartAlerts(rawAnalysis);
      const performanceMetrics = this.buildPerformanceMetrics(startTime);

      const dashboard: SMCDashboard = {
        symbol,
        timeframe,
        timestamp: new Date().toISOString(),
        currentPrice: rawAnalysis.currentPrice,
        marketOverview,
        keyMetrics,
        levelAnalysis,
        confluenceAnalysis,
        tradingAnalysis,
        riskAssessment,
        alerts,
        performanceMetrics,
        rawAnalysis
      };

      this.recordPerformance('getSMCDashboard', startTime, true);
      return dashboard;

    } catch (error) {
      this.recordPerformance('getSMCDashboard', startTime, false, error);
      throw error;
    }
  }

  /**
   * Get optimal trading setup with detailed analysis
   */
  async getSMCTradingSetup(
    symbol: string,
    timeframe: string = '60',
    preferredDirection?: 'long' | 'short'
  ): Promise<SMCTradingSetup> {
    const startTime = performance.now();

    try {
      const analysis = await this.smartMoneyService.analyzeSmartMoneyConfluence(symbol, timeframe);
      
      // Determine optimal setup direction
      const setupType = preferredDirection || this.determineOptimalDirection(analysis);
      
      // Validate setup
      const setupValidation = await this.smartMoneyService.validateSMCSetup(
        symbol,
        setupType
      );

      // Build comprehensive setup analysis
      const setup: SMCTradingSetup = {
        id: randomUUID(),
        symbol,
        timeframe,
        timestamp: new Date().toISOString(),
        setupType,
        setupQuality: this.determineSetupQuality(setupValidation.setupScore),
        confidence: setupValidation.confidence,
        entryAnalysis: this.buildEntryAnalysis(analysis, setupValidation, setupType),
        riskManagement: this.enhanceRiskManagement(setupValidation.riskManagement, analysis),
        probabilityAnalysis: this.buildProbabilityAnalysis(analysis, setupValidation),
        monitoring: this.buildMonitoringPlan(analysis, setupValidation),
        scenarios: this.buildScenarioAnalysis(analysis, setupType),
        confluenceDetails: this.buildConfluenceDetails(analysis, setupValidation)
      };

      this.recordPerformance('getSMCTradingSetup', startTime, true);
      return setup;

    } catch (error) {
      this.recordPerformance('getSMCTradingSetup', startTime, false, error);
      throw error;
    }
  }

  /**
   * Analyze confluence strength with detailed breakdown
   */
  async analyzeSMCConfluenceStrength(
    symbol: string,
    timeframe: string = '60'
  ): Promise<SMCConfluenceStrength> {
    const startTime = performance.now();

    try {
      const analysis = await this.smartMoneyService.analyzeSmartMoneyConfluence(symbol, timeframe);
      
      // Calculate overall strength
      const overallStrength = this.calculateOverallStrength(analysis.confluences);
      
      // Build strength analysis
      const confluenceStrength: SMCConfluenceStrength = {
        symbol,
        timeframe,
        timestamp: new Date().toISOString(),
        overallStrength,
        strengthRating: this.getStrengthRating(overallStrength),
        confluenceBreakdown: this.buildConfluenceBreakdown(analysis.confluences),
        strengthFactors: this.calculateStrengthFactors(analysis),
        keyZones: this.identifyKeyZones(analysis),
        strengthEvolution: this.analyzeStrengthEvolution(analysis),
        qualityMetrics: this.calculateQualityMetrics(analysis),
        recommendations: this.buildStrengthRecommendations(analysis, overallStrength)
      };

      this.recordPerformance('analyzeSMCConfluenceStrength', startTime, true);
      return confluenceStrength;

    } catch (error) {
      this.recordPerformance('analyzeSMCConfluenceStrength', startTime, false, error);
      throw error;
    }
  }

  // ====================
  // DASHBOARD BUILDING METHODS
  // ====================

  private buildMarketOverview(analysis: SmartMoneyAnalysis): SMCDashboard['marketOverview'] {
    return {
      bias: analysis.marketBias,
      institutionalActivity: analysis.institutionalActivity.score,
      currentZone: analysis.premiumDiscountZones.currentZone,
      volatility: this.assessVolatility(analysis),
      sessionContext: this.determineSessionContext()
    };
  }

  private buildKeyMetrics(analysis: SmartMoneyAnalysis): SMCDashboard['keyMetrics'] {
    return {
      totalOrderBlocks: analysis.rawAnalysis.orderBlocks.activeBlocks.length,
      activeOrderBlocks: analysis.rawAnalysis.orderBlocks.activeBlocks.filter(ob => ob.validity === 'fresh').length,
      totalFVGs: analysis.rawAnalysis.fairValueGaps.openGaps.length + analysis.rawAnalysis.fairValueGaps.filledGaps.length,
      openFVGs: analysis.rawAnalysis.fairValueGaps.openGaps.length,
      totalBOS: analysis.rawAnalysis.breakOfStructure.activeBreaks.length + analysis.rawAnalysis.breakOfStructure.recentBreaks.length,
      recentBOS: analysis.rawAnalysis.breakOfStructure.recentBreaks.length,
      confluenceScore: this.calculateConfluenceScore(analysis.confluences),
      institutionalScore: analysis.institutionalActivity.score,
      setupQuality: this.calculateSetupQuality(analysis)
    };
  }

  private buildLevelAnalysis(analysis: SmartMoneyAnalysis): SMCDashboard['levelAnalysis'] {
    const criticalLevels = analysis.keyLevels.map(level => ({
      price: level.price,
      type: level.type,
      strength: level.strength,
      distance: Math.abs(level.price - analysis.currentPrice) / analysis.currentPrice * 100,
      description: level.description,
      confluence: analysis.confluences.some(c => Math.abs(c.priceLevel - level.price) / level.price < 0.01)
    }));

    const supportLevels = criticalLevels
      .filter(l => l.price < analysis.currentPrice)
      .sort((a, b) => b.price - a.price)
      .slice(0, 5)
      .map(l => l.price);

    const resistanceLevels = criticalLevels
      .filter(l => l.price > analysis.currentPrice)
      .sort((a, b) => a.price - b.price)
      .slice(0, 5)
      .map(l => l.price);

    const nearestLevel = criticalLevels
      .sort((a, b) => a.distance - b.distance)[0];

    return {
      criticalLevels,
      supportLevels,
      resistanceLevels,
      nearestLevel: nearestLevel ? {
        price: nearestLevel.price,
        type: nearestLevel.type,
        distance: nearestLevel.distance
      } : { price: 0, type: '', distance: 0 }
    };
  }

  private buildConfluenceAnalysis(analysis: SmartMoneyAnalysis): SMCDashboard['confluenceAnalysis'] {
    const strongConfluences = analysis.confluences.filter(c => c.strength >= 80);
    const moderateConfluences = analysis.confluences.filter(c => c.strength >= 60 && c.strength < 80);
    const weakConfluences = analysis.confluences.filter(c => c.strength < 60);

    const nearestConfluence = analysis.confluences
      .map(c => ({
        ...c,
        distance: Math.abs(c.priceLevel - analysis.currentPrice) / analysis.currentPrice
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    return {
      totalConfluences: analysis.confluences.length,
      strongConfluences,
      moderateConfluences,
      weakConfluences,
      nearestConfluence,
      confluenceStrength: this.calculateConfluenceScore(analysis.confluences)
    };
  }

  private buildTradingAnalysis(analysis: SmartMoneyAnalysis): SMCDashboard['tradingAnalysis'] {
    const primaryRecommendation = analysis.tradingRecommendations[0];
    
    let primarySetup;
    if (primaryRecommendation && primaryRecommendation.action !== 'wait') {
      primarySetup = {
        direction: primaryRecommendation.action === 'buy' ? 'long' as const : 'short' as const,
        entryZone: primaryRecommendation.entryZone,
        targets: primaryRecommendation.targets,
        stopLoss: primaryRecommendation.stopLoss,
        confidence: primaryRecommendation.confidence,
        riskReward: this.calculateRiskReward(
          primaryRecommendation.entryZone.min,
          primaryRecommendation.targets[0],
          primaryRecommendation.stopLoss
        )
      };
    }

    const alternativeSetups = this.generateAlternativeSetups(analysis);
    const marketCondition = this.assessMarketCondition(analysis);
    const recommendation = this.generateRecommendation(analysis);

    return {
      primarySetup,
      alternativeSetups,
      marketCondition,
      recommendation
    };
  }

  private buildRiskAssessment(analysis: SmartMoneyAnalysis): SMCDashboard['riskAssessment'] {
    const overallRisk = this.calculateOverallRisk(analysis);
    const riskFactors = this.identifyRiskFactors(analysis);
    const stopLossRecommendations = this.generateStopLossRecommendations(analysis);
    const positionSizeRecommendation = this.calculatePositionSizeRecommendation(analysis);
    const maxDrawdownExpected = this.estimateMaxDrawdown(analysis);

    return {
      overallRisk,
      riskFactors,
      stopLossRecommendations,
      positionSizeRecommendation,
      maxDrawdownExpected
    };
  }

  private generateSmartAlerts(analysis: SmartMoneyAnalysis): SMCDashboard['alerts'] {
    const alerts: SMCDashboard['alerts'] = [];

    // Confluence alerts
    const nearbyConfluences = analysis.confluences.filter(c => {
      const distance = Math.abs(c.priceLevel - analysis.currentPrice) / analysis.currentPrice;
      return distance < 0.02; // Within 2%
    });

    if (nearbyConfluences.length > 0) {
      alerts.push({
        type: 'confluence',
        priority: 'high',
        message: `${nearbyConfluences.length} SMC confluences within 2% of current price`,
        price: nearbyConfluences[0].priceLevel,
        timeframe: analysis.timeframe
      });
    }

    // Break of structure alerts
    if (analysis.rawAnalysis.breakOfStructure.recentBreaks.length > 0) {
      const recentBreak = analysis.rawAnalysis.breakOfStructure.recentBreaks[0];
      alerts.push({
        type: 'break',
        priority: 'medium',
        message: `Recent ${recentBreak.type} ${recentBreak.direction} detected`,
        price: recentBreak.breakPoint.price
      });
    }

    // Institutional activity alerts
    if (analysis.institutionalActivity.score >= 80) {
      alerts.push({
        type: 'setup',
        priority: 'high',
        message: 'High institutional activity detected - Smart money positioning active'
      });
    }

    // Risk warnings
    if (analysis.marketBias.direction === 'neutral' && analysis.marketBias.confidence < 50) {
      alerts.push({
        type: 'warning',
        priority: 'medium',
        message: 'Market bias unclear - Exercise caution with new positions'
      });
    }

    return alerts;
  }

  private buildPerformanceMetrics(startTime: number): SMCDashboard['performanceMetrics'] {
    return {
      analysisTime: performance.now() - startTime,
      dataPoints: 0, // Placeholder
      cacheHits: 0, // Placeholder
      accuracy: 0, // Placeholder
      lastUpdate: new Date().toISOString()
    };
  }

  // ====================
  // SETUP BUILDING METHODS
  // ====================

  private determineOptimalDirection(analysis: SmartMoneyAnalysis): 'long' | 'short' {
    if (analysis.marketBias.direction === 'bullish') return 'long';
    if (analysis.marketBias.direction === 'bearish') return 'short';
    
    // If neutral, look at confluences and institutional activity
    const bullishConfluences = analysis.confluences.filter(c => c.alignment === 'bullish').length;
    const bearishConfluences = analysis.confluences.filter(c => c.alignment === 'bearish').length;
    
    return bullishConfluences > bearishConfluences ? 'long' : 'short';
  }

  private determineSetupQuality(score: number): 'premium' | 'standard' | 'basic' {
    if (score >= 85) return 'premium';
    if (score >= 70) return 'standard';
    return 'basic';
  }

  private buildEntryAnalysis(
    analysis: SmartMoneyAnalysis,
    validation: SMCSetupValidation,
    setupType: 'long' | 'short'
  ): SMCTradingSetup['entryAnalysis'] {
    const nearbyConfluences = analysis.confluences.filter(c => {
      const distance = Math.abs(c.priceLevel - analysis.currentPrice) / analysis.currentPrice;
      return distance < 0.03 && (c.alignment === setupType.replace('long', 'bullish').replace('short', 'bearish') || c.alignment === 'mixed');
    });

    return {
      optimalEntry: validation.optimalEntry.price,
      entryZone: validation.optimalEntry.zone,
      currentPrice: analysis.currentPrice,
      distanceToEntry: Math.abs(validation.optimalEntry.price - analysis.currentPrice) / analysis.currentPrice * 100,
      entryTrigger: validation.optimalEntry.reasoning,
      confluenceSupport: nearbyConfluences
    };
  }

  private enhanceRiskManagement(
    baseRisk: SMCSetupValidation['riskManagement'],
    analysis: SmartMoneyAnalysis
  ): SMCTradingSetup['riskManagement'] {
    return {
      ...baseRisk,
      riskAmount: Math.abs(baseRisk.stopLoss - baseRisk.takeProfits[0]) * baseRisk.positionSize,
      rewardPotential: Math.abs(baseRisk.takeProfits[1] - baseRisk.takeProfits[0]) * baseRisk.positionSize
    };
  }

  private buildProbabilityAnalysis(
    analysis: SmartMoneyAnalysis,
    validation: SMCSetupValidation
  ): SMCTradingSetup['probabilityAnalysis'] {
    return {
      successProbability: validation.confidence,
      factorBreakdown: {
        confluenceStrength: validation.factors.confluenceQuality,
        institutionalAlignment: validation.factors.institutionalPresence,
        structuralSupport: validation.factors.structureAlignment,
        marketBias: validation.factors.directionalAlignment,
        volumeConfirmation: analysis.institutionalActivity.footprint.confluenceStrength
      },
      confidenceInterval: {
        min: Math.max(0, validation.confidence - 15),
        max: Math.min(100, validation.confidence + 10)
      }
    };
  }

  private buildMonitoringPlan(
    analysis: SmartMoneyAnalysis,
    validation: SMCSetupValidation
  ): SMCTradingSetup['monitoring'] {
    return {
      keyLevels: analysis.keyLevels.slice(0, 5).map(l => l.price),
      invalidationLevel: validation.riskManagement.stopLoss,
      progressTracking: {
        currentStage: 'Setup Identified',
        completionPercentage: 0,
        nextMilestone: 'Entry Signal Confirmation'
      },
      alerts: [
        {
          trigger: 'Price reaches entry zone',
          condition: `Price between ${validation.optimalEntry.zone.min} and ${validation.optimalEntry.zone.max}`,
          action: 'Prepare for entry'
        },
        {
          trigger: 'Stop loss hit',
          condition: `Price crosses ${validation.riskManagement.stopLoss}`,
          action: 'Exit position immediately'
        },
        {
          trigger: 'First target reached',
          condition: `Price reaches ${validation.riskManagement.takeProfits[0]}`,
          action: 'Consider partial profit taking'
        }
      ]
    };
  }

  private buildScenarioAnalysis(
    analysis: SmartMoneyAnalysis,
    setupType: 'long' | 'short'
  ): SMCTradingSetup['scenarios'] {
    return [
      {
        name: 'Primary Scenario',
        probability: analysis.statistics.overallConfidence,
        outcome: `${setupType} setup succeeds with institutional confirmation`,
        action: 'Follow original trading plan'
      },
      {
        name: 'Consolidation Scenario',
        probability: 30,
        outcome: 'Price enters sideways consolidation',
        action: 'Tighten stops and reduce position size'
      },
      {
        name: 'Reversal Scenario',
        probability: 100 - analysis.statistics.overallConfidence,
        outcome: 'Setup fails and price reverses',
        action: 'Exit at stop loss and reassess'
      }
    ];
  }

  private buildConfluenceDetails(
    analysis: SmartMoneyAnalysis,
    validation: SMCSetupValidation
  ): SMCTradingSetup['confluenceDetails'] {
    const strongConfluences = analysis.confluences.filter(c => c.strength >= 80);
    const primaryConfluence = strongConfluences[0] || analysis.confluences[0];
    const supportingConfluences = analysis.confluences.filter(c => c.id !== primaryConfluence?.id);
    
    return {
      primaryConfluence,
      supportingConfluences,
      conflictingSignals: validation.warnings,
      strengthScore: this.calculateConfluenceScore(analysis.confluences)
    };
  }

  // ====================
  // CONFLUENCE STRENGTH METHODS
  // ====================

  private calculateOverallStrength(confluences: SmartMoneyConfluence[]): number {
    if (confluences.length === 0) return 0;
    
    const totalStrength = confluences.reduce((sum, c) => sum + c.strength, 0);
    const avgStrength = totalStrength / confluences.length;
    
    // Bonus for quantity
    const quantityBonus = Math.min(20, confluences.length * 3);
    
    return Math.min(100, Math.round(avgStrength + quantityBonus));
  }

  private getStrengthRating(strength: number): 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak' {
    if (strength >= 85) return 'very_strong';
    if (strength >= 70) return 'strong';
    if (strength >= 55) return 'moderate';
    if (strength >= 40) return 'weak';
    return 'very_weak';
  }

  private buildConfluenceBreakdown(confluences: SmartMoneyConfluence[]): SMCConfluenceStrength['confluenceBreakdown'] {
    const breakdown = {
      total: confluences.length,
      byType: { orderBlock: 0, fairValueGap: 0, breakOfStructure: 0, triple: 0 },
      byStrength: { veryStrong: 0, strong: 0, moderate: 0, weak: 0 },
      byAlignment: { bullish: 0, bearish: 0, mixed: 0 }
    };

    confluences.forEach(c => {
      // By type
      if (c.types.length === 3) breakdown.byType.triple++;
      else if (c.types.includes('orderBlock')) breakdown.byType.orderBlock++;
      else if (c.types.includes('fairValueGap')) breakdown.byType.fairValueGap++;
      else if (c.types.includes('breakOfStructure')) breakdown.byType.breakOfStructure++;

      // By strength
      if (c.strength >= 85) breakdown.byStrength.veryStrong++;
      else if (c.strength >= 70) breakdown.byStrength.strong++;
      else if (c.strength >= 55) breakdown.byStrength.moderate++;
      else breakdown.byStrength.weak++;

      // By alignment
      if (c.alignment === 'bullish') breakdown.byAlignment.bullish++;
      else if (c.alignment === 'bearish') breakdown.byAlignment.bearish++;
      else breakdown.byAlignment.mixed++;
    });

    return breakdown;
  }

  private calculateStrengthFactors(analysis: SmartMoneyAnalysis): SMCConfluenceStrength['strengthFactors'] {
    const confluences = analysis.confluences;
    const currentPrice = analysis.currentPrice;

    // Density: confluences per price range
    const priceRange = Math.max(...confluences.map(c => c.priceLevel)) - Math.min(...confluences.map(c => c.priceLevel));
    const density = confluences.length / Math.max(priceRange / currentPrice, 0.01) * 100;

    // Consistency: alignment consistency
    const alignedConfluences = confluences.filter(c => c.alignment !== 'mixed').length;
    const consistency = confluences.length > 0 ? (alignedConfluences / confluences.length) * 100 : 0;

    // Proximity: how close are confluences to current price
    const avgDistance = confluences.reduce((sum, c) => {
      return sum + Math.abs(c.priceLevel - currentPrice) / currentPrice;
    }, 0) / Math.max(confluences.length, 1);
    const proximity = Math.max(0, 100 - avgDistance * 100);

    return {
      density: Math.min(100, Math.round(density)),
      consistency: Math.round(consistency),
      proximity: Math.round(proximity),
      institutionalFootprint: analysis.institutionalActivity.score,
      volumeConfirmation: analysis.institutionalActivity.footprint.confluenceStrength,
      timeRelevance: 85 // Default high relevance for current analysis
    };
  }

  private identifyKeyZones(analysis: SmartMoneyAnalysis): SMCConfluenceStrength['keyZones'] {
    const zones: SMCConfluenceStrength['keyZones'] = [];
    const confluenceGroups = this.groupConfluencesByPrice(analysis.confluences);

    confluenceGroups.forEach(group => {
      const avgPrice = group.reduce((sum, c) => sum + c.priceLevel, 0) / group.length;
      const avgStrength = group.reduce((sum, c) => sum + c.strength, 0) / group.length;
      const types = [...new Set(group.flatMap(c => c.types))];
      const alignment = this.determineGroupAlignment(group);

      zones.push({
        priceLevel: avgPrice,
        strength: Math.round(avgStrength),
        types,
        direction: alignment,
        confluences: group,
        tradingRecommendation: this.generateZoneRecommendation(avgPrice, alignment, avgStrength, analysis.currentPrice)
      });
    });

    return zones.sort((a, b) => b.strength - a.strength);
  }

  private analyzeStrengthEvolution(analysis: SmartMoneyAnalysis): SMCConfluenceStrength['strengthEvolution'] {
    // This would ideally compare with historical data
    // For now, providing reasonable defaults
    return {
      trend: 'stable',
      changeRate: 0,
      stabilityIndex: 75,
      forecast: {
        next4Hours: this.calculateOverallStrength(analysis.confluences),
        next1Day: this.calculateOverallStrength(analysis.confluences),
        confidence: 70
      }
    };
  }

  private calculateQualityMetrics(analysis: SmartMoneyAnalysis): SMCConfluenceStrength['qualityMetrics'] {
    const confluences = analysis.confluences;
    
    return {
      averageConfluenceStrength: confluences.reduce((sum, c) => sum + c.strength, 0) / Math.max(confluences.length, 1),
      strongConfluenceRatio: confluences.filter(c => c.strength >= 70).length / Math.max(confluences.length, 1),
      alignmentConsistency: confluences.filter(c => c.alignment !== 'mixed').length / Math.max(confluences.length, 1) * 100,
      institutionalAlignment: analysis.institutionalActivity.score,
      marketContextAlignment: analysis.marketBias.confidence
    };
  }

  private buildStrengthRecommendations(
    analysis: SmartMoneyAnalysis,
    overallStrength: number
  ): SMCConfluenceStrength['recommendations'] {
    let tradingApproach: string;
    let riskLevel: string;
    
    if (overallStrength >= 80) {
      tradingApproach = 'Aggressive - High confidence setups available';
      riskLevel = 'Low to Medium';
    } else if (overallStrength >= 60) {
      tradingApproach = 'Moderate - Selective trading with confluences';
      riskLevel = 'Medium';
    } else {
      tradingApproach = 'Conservative - Wait for stronger confluences';
      riskLevel = 'High';
    }

    const keyLevelsToWatch = analysis.confluences
      .filter(c => c.strength >= 70)
      .slice(0, 5)
      .map(c => c.priceLevel);

    const criticalAlerts = [];
    if (overallStrength < 40) {
      criticalAlerts.push('Very weak confluence environment - avoid new positions');
    }
    if (analysis.institutionalActivity.score < 30) {
      criticalAlerts.push('Low institutional activity - retail dominated market');
    }

    return {
      tradingApproach,
      riskLevel,
      timeframe: analysis.timeframe,
      keyLevelsToWatch,
      criticalAlerts
    };
  }

  // ====================
  // UTILITY METHODS
  // ====================

  private assessVolatility(analysis: SmartMoneyAnalysis): 'high' | 'medium' | 'low' {
    // Based on price ranges and confluence spread
    const priceRange = analysis.keyLevels.length > 1 ? 
      Math.max(...analysis.keyLevels.map(l => l.price)) - Math.min(...analysis.keyLevels.map(l => l.price)) : 0;
    const volatilityRatio = priceRange / analysis.currentPrice * 100;

    if (volatilityRatio > 5) return 'high';
    if (volatilityRatio > 2) return 'medium';
    return 'low';
  }

  private determineSessionContext(): string {
    const hour = new Date().getUTCHours();
    if (hour >= 0 && hour < 8) return 'Asia Session';
    if (hour >= 8 && hour < 16) return 'London Session';
    if (hour >= 16 && hour < 24) return 'New York Session';
    return 'Off Hours';
  }

  private calculateConfluenceScore(confluences: SmartMoneyConfluence[]): number {
    if (confluences.length === 0) return 0;
    
    const avgStrength = confluences.reduce((sum, c) => sum + c.strength, 0) / confluences.length;
    const quantityBonus = Math.min(20, confluences.length * 2);
    
    return Math.min(100, Math.round(avgStrength + quantityBonus));
  }

  private calculateSetupQuality(analysis: SmartMoneyAnalysis): number {
    let score = 50;
    
    // Institutional activity
    score += analysis.institutionalActivity.score * 0.3;
    
    // Confluence quality
    score += this.calculateConfluenceScore(analysis.confluences) * 0.4;
    
    // Market bias strength
    score += analysis.marketBias.strength * 0.3;
    
    return Math.min(100, Math.round(score));
  }

  private calculateRiskReward(entry: number, target: number, stop: number): number {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    return reward / risk;
  }

  private generateAlternativeSetups(analysis: SmartMoneyAnalysis): Array<{
    direction: 'long' | 'short';
    reason: string;
    probability: number;
  }> {
    const alternatives: Array<{
      direction: 'long' | 'short';
      reason: string;
      probability: number;
    }> = [];
    
    // Counter-trend setup
    const oppositeDirection: 'long' | 'short' = analysis.marketBias.direction === 'bullish' ? 'short' : 'long';
    if (analysis.premiumDiscountZones.currentZone === 'premium' && oppositeDirection === 'short') {
      alternatives.push({
        direction: 'short' as const,
        reason: 'Counter-trend short from premium zone',
        probability: 35
      });
    } else if (analysis.premiumDiscountZones.currentZone === 'discount' && oppositeDirection === 'long') {
      alternatives.push({
        direction: 'long' as const,
        reason: 'Counter-trend long from discount zone',
        probability: 35
      });
    }
    
    return alternatives;
  }

  private assessMarketCondition(analysis: SmartMoneyAnalysis): 'trending' | 'ranging' | 'volatile' | 'uncertain' {
    if (analysis.marketBias.strength >= 70) return 'trending';
    if (analysis.marketBias.direction === 'neutral' && analysis.institutionalActivity.score < 50) return 'ranging';
    if (analysis.confluences.filter(c => c.alignment === 'mixed').length > 3) return 'volatile';
    return 'uncertain';
  }

  private generateRecommendation(analysis: SmartMoneyAnalysis): 'aggressive' | 'moderate' | 'conservative' | 'wait' {
    const score = analysis.statistics.overallConfidence;
    const institutionalScore = analysis.institutionalActivity.score;
    
    if (score >= 80 && institutionalScore >= 70) return 'aggressive';
    if (score >= 65 && institutionalScore >= 50) return 'moderate';
    if (score >= 50) return 'conservative';
    return 'wait';
  }

  private calculateOverallRisk(analysis: SmartMoneyAnalysis): 'low' | 'medium' | 'high' {
    let riskScore = 50;
    
    if (analysis.marketBias.direction === 'neutral') riskScore += 20;
    if (analysis.institutionalActivity.score < 40) riskScore += 15;
    if (analysis.confluences.length < 3) riskScore += 10;
    if (analysis.premiumDiscountZones.currentZone === 'equilibrium') riskScore += 5;
    
    if (riskScore >= 70) return 'high';
    if (riskScore >= 55) return 'medium';
    return 'low';
  }

  private identifyRiskFactors(analysis: SmartMoneyAnalysis): string[] {
    const factors = [];
    
    if (analysis.marketBias.direction === 'neutral') {
      factors.push('Neutral market bias increases directional uncertainty');
    }
    
    if (analysis.institutionalActivity.score < 50) {
      factors.push('Low institutional activity may lead to erratic price movements');
    }
    
    if (analysis.confluences.filter(c => c.alignment === 'mixed').length > 2) {
      factors.push('Multiple conflicting confluences signal market indecision');
    }
    
    return factors;
  }

  private generateStopLossRecommendations(analysis: SmartMoneyAnalysis): number[] {
    const currentPrice = analysis.currentPrice;
    const keyLevels = analysis.keyLevels.map(l => l.price);
    
    // Conservative, normal, and aggressive stops
    const nearestSupport = keyLevels.filter(l => l < currentPrice).sort((a, b) => b - a)[0];
    const nearestResistance = keyLevels.filter(l => l > currentPrice).sort((a, b) => a - b)[0];
    
    return [
      nearestSupport ? nearestSupport * 0.995 : currentPrice * 0.97, // Conservative
      nearestSupport ? nearestSupport * 0.99 : currentPrice * 0.985,  // Normal
      nearestSupport ? nearestSupport * 0.985 : currentPrice * 0.98   // Aggressive
    ];
  }

  private calculatePositionSizeRecommendation(analysis: SmartMoneyAnalysis): number {
    const baseSize = 1.0;
    const confidence = analysis.statistics.overallConfidence;
    const institutional = analysis.institutionalActivity.score;
    
    // Adjust based on confidence and institutional activity
    const multiplier = (confidence + institutional) / 200;
    return Math.max(0.5, Math.min(2.0, baseSize * multiplier));
  }

  private estimateMaxDrawdown(analysis: SmartMoneyAnalysis): number {
    // Estimate based on volatility and market conditions
    const baseDrawdown = 3; // 3% base drawdown
    
    if (analysis.marketBias.direction === 'neutral') return baseDrawdown * 1.5;
    if (analysis.institutionalActivity.score < 40) return baseDrawdown * 1.3;
    if (analysis.statistics.overallConfidence < 50) return baseDrawdown * 1.2;
    
    return baseDrawdown;
  }

  private groupConfluencesByPrice(confluences: SmartMoneyConfluence[]): SmartMoneyConfluence[][] {
    const groups: SmartMoneyConfluence[][] = [];
    const threshold = 0.01; // 1% price threshold for grouping
    
    confluences.forEach(confluence => {
      let addedToGroup = false;
      
      for (const group of groups) {
        const groupAvgPrice = group.reduce((sum, c) => sum + c.priceLevel, 0) / group.length;
        const distance = Math.abs(confluence.priceLevel - groupAvgPrice) / groupAvgPrice;
        
        if (distance <= threshold) {
          group.push(confluence);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([confluence]);
      }
    });
    
    return groups;
  }

  private determineGroupAlignment(group: SmartMoneyConfluence[]): 'bullish' | 'bearish' | 'mixed' {
    const bullishCount = group.filter(c => c.alignment === 'bullish').length;
    const bearishCount = group.filter(c => c.alignment === 'bearish').length;
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'mixed';
  }

  private generateZoneRecommendation(
    price: number,
    alignment: 'bullish' | 'bearish' | 'mixed',
    strength: number,
    currentPrice: number
  ): string {
    const distance = Math.abs(price - currentPrice) / currentPrice * 100;
    
    if (distance < 2) {
      return `Immediate attention - ${alignment} zone with ${strength}% strength`;
    } else if (distance < 5) {
      return `Monitor closely - ${alignment} zone approaching`;
    } else {
      return `Key level to watch - ${alignment} zone at ${distance.toFixed(1)}% distance`;
    }
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

  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }
}