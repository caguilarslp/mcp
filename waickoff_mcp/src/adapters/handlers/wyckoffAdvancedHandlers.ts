/**
 * @fileoverview Wyckoff Advanced Handlers for MCP Protocol
 * @description Handles advanced Wyckoff analysis requests including Composite Man tracking,
 * multi-timeframe analysis, cause & effect calculations, and nested structures
 * @version 1.0.0
 */

import type {
  MCPServerResponse,
  ToolHandler,
  ToolValidationResult
} from '../../types/index.js';

import type {
  IWyckoffAdvancedService,
  CompositeManAnalysis,
  MultiTimeframeAnalysis,
  CauseEffectAnalysis,
  NestedStructureAnalysis,
  WyckoffSignal,
  SignalValidation,
  InstitutionalFlowAnalysis,
  AdvancedInsights,
  ManipulationSign,
  TimeframeAnalysis,
  Confluence,
  MultiTimeframeRecommendation,
  AccumulationZone,
  DistributionZone,
  PriceTarget,
  CauseEffectProjection,
  StructureLevel,
  StructureInteraction,
  NestedStructureRecommendation,
  InstitutionalEvent,
  TradingOpportunity,
  RiskFactor,
  ActionItem
} from '../../services/wyckoffAdvanced.js';

import { FileLogger } from '../../utils/fileLogger.js';
import { PerformanceMonitor } from '../../utils/performance.js';
import * as path from 'path';

export class WyckoffAdvancedHandlers {
  private readonly logger: FileLogger;
  private readonly performanceMonitor: PerformanceMonitor;

  constructor(private readonly wyckoffAdvancedService: IWyckoffAdvancedService) {
    this.logger = new FileLogger('WyckoffAdvancedHandlers', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Handle Composite Man analysis request
   */
  async handleAnalyzeCompositeMan(args: any): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleAnalyzeCompositeMan', async () => {
      try {
        // Validate required parameters
        const validation = this.validateCompositeManParams(args);
        if (!validation.isValid) {
          return this.formatErrorResponse(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        const { symbol, timeframe = '60', lookback = 200 } = args;

        this.logger.info(`Handling Composite Man analysis for ${symbol} (${timeframe})`);

        // Perform analysis
        const analysis = await this.wyckoffAdvancedService.analyzeCompositeMan(
          symbol.toUpperCase(),
          timeframe,
          lookback
        );

        // Format response
        const response = this.formatCompositeManResponse(analysis);

        this.logger.info(`Composite Man analysis completed for ${symbol}: ${analysis.manipulationScore}% manipulation score`);
        return this.formatSuccessResponse(response);

      } catch (error) {
        this.logger.error(`Failed to handle Composite Man analysis:`, error);
        return this.formatErrorResponse(`Composite Man analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Handle multi-timeframe analysis request
   */
  async handleAnalyzeMultiTimeframe(args: any): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleAnalyzeMultiTimeframe', async () => {
      try {
        // Validate required parameters
        const validation = this.validateMultiTimeframeParams(args);
        if (!validation.isValid) {
          return this.formatErrorResponse(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        const { symbol, timeframes = ['15', '60', '240', 'D'] } = args;

        this.logger.info(`Handling multi-timeframe analysis for ${symbol} across ${timeframes.join(', ')}`);

        // Perform analysis
        const analysis = await this.wyckoffAdvancedService.analyzeMultiTimeframe(
          symbol.toUpperCase(),
          timeframes
        );

        // Format response
        const response = this.formatMultiTimeframeResponse(analysis);

        this.logger.info(`Multi-timeframe analysis completed for ${symbol}: ${analysis.overallBias} bias`);
        return this.formatSuccessResponse(response);

      } catch (error) {
        this.logger.error(`Failed to handle multi-timeframe analysis:`, error);
        return this.formatErrorResponse(`Multi-timeframe analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Handle cause & effect calculation request
   */
  async handleCalculateCauseEffect(args: any): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleCalculateCauseEffect', async () => {
      try {
        // Validate required parameters
        const validation = this.validateCauseEffectParams(args);
        if (!validation.isValid) {
          return this.formatErrorResponse(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        const { symbol, timeframe = '60', lookback = 300 } = args;

        this.logger.info(`Handling cause & effect calculation for ${symbol} (${timeframe})`);

        // Perform analysis
        const analysis = await this.wyckoffAdvancedService.calculateCauseEffect(
          symbol.toUpperCase(),
          timeframe,
          lookback
        );

        // Format response
        const response = this.formatCauseEffectResponse(analysis);

        this.logger.info(`Cause & effect calculation completed for ${symbol}: ${analysis.currentTargets.length} targets`);
        return this.formatSuccessResponse(response);

      } catch (error) {
        this.logger.error(`Failed to handle cause & effect calculation:`, error);
        return this.formatErrorResponse(`Cause & effect calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Handle nested structures analysis request
   */
  async handleAnalyzeNestedStructures(args: any): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleAnalyzeNestedStructures', async () => {
      try {
        // Validate required parameters
        const validation = this.validateNestedStructuresParams(args);
        if (!validation.isValid) {
          return this.formatErrorResponse(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        const { 
          symbol, 
          primaryTimeframe = '240', 
          secondaryTimeframes = ['15', '60']
        } = args;

        this.logger.info(`Handling nested structures analysis for ${symbol}: ${primaryTimeframe} (primary), ${secondaryTimeframes.join(', ')} (secondary)`);

        // Perform analysis
        const analysis = await this.wyckoffAdvancedService.analyzeNestedStructures(
          symbol.toUpperCase(),
          primaryTimeframe,
          secondaryTimeframes
        );

        // Format response
        const response = this.formatNestedStructuresResponse(analysis);

        this.logger.info(`Nested structures analysis completed for ${symbol}: ${analysis.fractality.fractalLevel} levels`);
        return this.formatSuccessResponse(response);

      } catch (error) {
        this.logger.error(`Failed to handle nested structures analysis:`, error);
        return this.formatErrorResponse(`Nested structures analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Handle Wyckoff signal validation request
   */
  async handleValidateWyckoffSignal(args: any): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleValidateWyckoffSignal', async () => {
      try {
        // Validate required parameters
        const validation = this.validateSignalValidationParams(args);
        if (!validation.isValid) {
          return this.formatErrorResponse(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        const { symbol, signal } = args;

        this.logger.info(`Handling Wyckoff signal validation for ${symbol}: ${signal.type}`);

        // Perform validation
        const validation_result = await this.wyckoffAdvancedService.validateWyckoffSignal(
          symbol.toUpperCase(),
          signal
        );

        // Format response
        const response = this.formatSignalValidationResponse(validation_result);

        this.logger.info(`Signal validation completed for ${symbol}: ${validation_result.validation.overallScore}% confidence`);
        return this.formatSuccessResponse(response);

      } catch (error) {
        this.logger.error(`Failed to handle signal validation:`, error);
        return this.formatErrorResponse(`Signal validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Handle institutional flow tracking request
   */
  async handleTrackInstitutionalFlow(args: any): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleTrackInstitutionalFlow', async () => {
      try {
        // Validate required parameters
        const validation = this.validateInstitutionalFlowParams(args);
        if (!validation.isValid) {
          return this.formatErrorResponse(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        const { symbol, timeframe = '60', lookback = 100 } = args;

        this.logger.info(`Handling institutional flow tracking for ${symbol} (${timeframe})`);

        // Perform analysis
        const analysis = await this.wyckoffAdvancedService.trackInstitutionalFlow(
          symbol.toUpperCase(),
          timeframe,
          lookback
        );

        // Format response
        const response = this.formatInstitutionalFlowResponse(analysis);

        this.logger.info(`Institutional flow tracking completed for ${symbol}: ${analysis.currentPosition}`);
        return this.formatSuccessResponse(response);

      } catch (error) {
        this.logger.error(`Failed to handle institutional flow tracking:`, error);
        return this.formatErrorResponse(`Institutional flow tracking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Handle advanced insights generation request
   */
  async handleGenerateAdvancedInsights(args: any): Promise<MCPServerResponse> {
    return this.performanceMonitor.measure('handleGenerateAdvancedInsights', async () => {
      try {
        // Validate required parameters
        const validation = this.validateAdvancedInsightsParams(args);
        if (!validation.isValid) {
          return this.formatErrorResponse(`Invalid parameters: ${validation.errors.join(', ')}`);
        }

        const { symbol, analysisType = 'complete' } = args;

        this.logger.info(`Handling advanced insights generation for ${symbol}: ${analysisType}`);

        // Generate insights
        const insights = await this.wyckoffAdvancedService.generateAdvancedInsights(
          symbol.toUpperCase(),
          analysisType
        );

        // Format response
        const response = this.formatAdvancedInsightsResponse(insights);

        this.logger.info(`Advanced insights generated for ${symbol}: ${insights.keyFindings.length} findings`);
        return this.formatSuccessResponse(response);

      } catch (error) {
        this.logger.error(`Failed to handle advanced insights generation:`, error);
        return this.formatErrorResponse(`Advanced insights generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  // ====================
  // VALIDATION METHODS
  // ====================

  private validateCompositeManParams(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.timeframe && typeof args.timeframe !== 'string') {
      errors.push('timeframe must be a string');
    }

    if (args.lookback && (!Number.isInteger(args.lookback) || args.lookback < 50 || args.lookback > 500)) {
      errors.push('lookback must be an integer between 50 and 500');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateMultiTimeframeParams(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.timeframes && (!Array.isArray(args.timeframes) || args.timeframes.length === 0)) {
      errors.push('timeframes must be a non-empty array');
    }

    if (args.timeframes && args.timeframes.some((tf: any) => typeof tf !== 'string')) {
      errors.push('all timeframes must be strings');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateCauseEffectParams(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.timeframe && typeof args.timeframe !== 'string') {
      errors.push('timeframe must be a string');
    }

    if (args.lookback && (!Number.isInteger(args.lookback) || args.lookback < 100 || args.lookback > 1000)) {
      errors.push('lookback must be an integer between 100 and 1000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateNestedStructuresParams(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.primaryTimeframe && typeof args.primaryTimeframe !== 'string') {
      errors.push('primaryTimeframe must be a string');
    }

    if (args.secondaryTimeframes && (!Array.isArray(args.secondaryTimeframes) || args.secondaryTimeframes.length === 0)) {
      errors.push('secondaryTimeframes must be a non-empty array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateSignalValidationParams(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (!args.signal || typeof args.signal !== 'object') {
      errors.push('signal is required and must be an object');
    }

    if (args.signal && !args.signal.type) {
      errors.push('signal.type is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateInstitutionalFlowParams(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    if (args.timeframe && typeof args.timeframe !== 'string') {
      errors.push('timeframe must be a string');
    }

    if (args.lookback && (!Number.isInteger(args.lookback) || args.lookback < 50 || args.lookback > 200)) {
      errors.push('lookback must be an integer between 50 and 200');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateAdvancedInsightsParams(args: any): ToolValidationResult {
    const errors: string[] = [];

    if (!args.symbol || typeof args.symbol !== 'string') {
      errors.push('symbol is required and must be a string');
    }

    const validAnalysisTypes = ['complete', 'composite_man', 'multi_timeframe', 'cause_effect', 'nested'];
    if (args.analysisType && !validAnalysisTypes.includes(args.analysisType)) {
      errors.push(`analysisType must be one of: ${validAnalysisTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ====================
  // RESPONSE FORMATTING METHODS
  // ====================

  private formatCompositeManResponse(analysis: CompositeManAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      analysisDate: analysis.analysisDate.toISOString(),
      manipulationScore: analysis.manipulationScore,
      interpretation: {
        phase: analysis.interpretation.phase,
        strength: analysis.interpretation.strength,
        confidence: analysis.interpretation.confidence,
        implications: analysis.interpretation.implications,
        expectedMoves: analysis.interpretation.expectedMoves
      },
      institutionalActivity: {
        netPosition: analysis.institutionalActivity.netPosition,
        activityLevel: analysis.institutionalActivity.activityLevel,
        absorptionRate: analysis.institutionalActivity.absorptionRate,
        distributionRate: analysis.institutionalActivity.distributionRate
      },
      marketCharacteristics: {
        volatilityProfile: {
          currentLevel: analysis.marketCharacteristics.volatilityProfile.currentLevel,
          trend: analysis.marketCharacteristics.volatilityProfile.trend
        },
        trendCharacter: {
          overallDirection: analysis.marketCharacteristics.trendCharacter.overallDirection,
          strength: analysis.marketCharacteristics.trendCharacter.strength,
          maturity: analysis.marketCharacteristics.trendCharacter.maturity
        },
        rangeCharacter: {
          isActive: analysis.marketCharacteristics.rangeCharacter.isActive,
          quality: analysis.marketCharacteristics.rangeCharacter.quality,
          maturity: analysis.marketCharacteristics.rangeCharacter.maturity
        }
      },
      manipulationSigns: analysis.manipulationSigns.map((sign: ManipulationSign) => ({
        timestamp: sign.timestamp.toISOString(),
        type: sign.type,
        severity: sign.severity,
        confidence: sign.confidence,
        description: sign.description,
        outcome: sign.outcome
      })),
      summary: {
        keyInsights: [
          `Manipulation score: ${analysis.manipulationScore}%`,
          `Institutional activity: ${analysis.institutionalActivity.activityLevel}`,
          `Current phase: ${analysis.interpretation.phase}`,
          `Strength: ${analysis.interpretation.strength}`
        ],
        recommendations: analysis.interpretation.implications,
        riskLevel: analysis.manipulationScore > 70 ? 'high' : analysis.manipulationScore > 40 ? 'medium' : 'low'
      }
    };
  }

  private formatMultiTimeframeResponse(analysis: MultiTimeframeAnalysis): any {
    return {
      symbol: analysis.symbol,
      analysisDate: analysis.analysisDate.toISOString(),
      overallBias: analysis.overallBias,
      confidence: analysis.confidence,
      dominantTimeframe: analysis.dominantTimeframe,
      timeframeAnalysis: analysis.timeframes.map((tf: TimeframeAnalysis) => ({
        timeframe: tf.timeframe,
        wyckoffPhase: tf.wyckoffPhase,
        phaseConfidence: tf.phaseConfidence,
        compositeManScore: tf.compositeManScore,
        weight: tf.weight,
        tradingRange: tf.tradingRange ? {
          support: tf.tradingRange.support,
          resistance: tf.tradingRange.resistance,
          width: tf.tradingRange.width,
          type: tf.tradingRange.type
        } : null,
        keyEvents: tf.keyEvents.map((event: any) => ({
          timestamp: event.timestamp.toISOString(),
          type: event.type,
          price: event.price,
          significance: event.significance,
          description: event.description
        }))
      })),
      confluences: analysis.confluences.map((conf: Confluence) => ({
        type: conf.type,
        timeframes: conf.timeframes,
        strength: conf.strength,
        description: conf.description,
        tradingImplication: conf.tradingImplication
      })),
      recommendations: analysis.recommendations.map((rec: MultiTimeframeRecommendation) => ({
        action: rec.action,
        confidence: rec.confidence,
        timeframe: rec.timeframe,
        entry: rec.entry,
        stopLoss: rec.stopLoss,
        targets: rec.targets,
        reasoning: rec.reasoning
      })),
      summary: {
        keyInsights: [
          `Overall bias: ${analysis.overallBias}`,
          `Confidence: ${analysis.confidence}%`,
          `Dominant timeframe: ${analysis.dominantTimeframe}`,
          `Confluences found: ${analysis.confluences.length}`
        ],
        alignedTimeframes: analysis.timeframes.filter((tf: TimeframeAnalysis) => tf.phaseConfidence > 60).length,
        strongestTimeframe: analysis.timeframes.reduce((strongest: TimeframeAnalysis, current: TimeframeAnalysis) => 
          current.phaseConfidence > strongest.phaseConfidence ? current : strongest
        ).timeframe
      }
    };
  }

  private formatCauseEffectResponse(analysis: CauseEffectAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      analysisDate: analysis.analysisDate.toISOString(),
      accumulationZones: analysis.accumulationZones.map((zone: AccumulationZone) => ({
        startDate: zone.startDate.toISOString(),
        endDate: zone.endDate.toISOString(),
        priceRange: zone.priceRange,
        duration: zone.duration,
        causeStrength: zone.causeStrength,
        expectedEffect: zone.expectedEffect,
        confidence: zone.confidence,
        status: zone.status
      })),
      distributionZones: analysis.distributionZones.map((zone: DistributionZone) => ({
        startDate: zone.startDate.toISOString(),
        endDate: zone.endDate.toISOString(),
        priceRange: zone.priceRange,
        duration: zone.duration,
        causeStrength: zone.causeStrength,
        expectedEffect: zone.expectedEffect,
        confidence: zone.confidence,
        status: zone.status
      })),
      currentTargets: analysis.currentTargets.map((target: PriceTarget) => ({
        price: target.price,
        type: target.type,
        confidence: target.confidence,
        timeframe: target.timeframe,
        causeZone: target.causeZone,
        progress: target.progress,
        reasoning: target.reasoning
      })),
      projections: analysis.projections.map((proj: CauseEffectProjection) => ({
        targetPrice: proj.targetPrice,
        probability: proj.probability,
        timeEstimate: proj.timeEstimate,
        calculationMethod: proj.calculationMethod,
        assumptions: proj.assumptions
      })),
      historicalValidation: {
        totalCases: analysis.historicalValidation.totalCases,
        successfulCases: analysis.historicalValidation.successfulCases,
        averageAccuracy: analysis.historicalValidation.averageAccuracy,
        notes: analysis.historicalValidation.notes
      },
      summary: {
        keyInsights: [
          `Active targets: ${analysis.currentTargets.length}`,
          `Accumulation zones: ${analysis.accumulationZones.length}`,
          `Distribution zones: ${analysis.distributionZones.length}`,
          `Average accuracy: ${analysis.historicalValidation.averageAccuracy}%`
        ],
        nearestTarget: analysis.currentTargets.length > 0 ? analysis.currentTargets[0].price : null,
        strongestZone: [...analysis.accumulationZones, ...analysis.distributionZones]
          .reduce((strongest, current) => 
            current.causeStrength > strongest.causeStrength ? current : strongest,
            { causeStrength: 0 }
          )
      }
    };
  }

  private formatNestedStructuresResponse(analysis: NestedStructureAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      analysisDate: analysis.analysisDate.toISOString(),
      primaryStructure: {
        level: analysis.primaryStructure.level,
        timeframe: analysis.primaryStructure.timeframe,
        wyckoffPhase: analysis.primaryStructure.wyckoffPhase,
        importance: analysis.primaryStructure.importance,
        dominance: analysis.primaryStructure.dominance,
        tradingRange: {
          support: analysis.primaryStructure.tradingRange.support,
          resistance: analysis.primaryStructure.tradingRange.resistance,
          width: analysis.primaryStructure.tradingRange.width,
          type: analysis.primaryStructure.tradingRange.type
        }
      },
      secondaryStructures: analysis.secondaryStructures.map((struct: StructureLevel) => ({
        level: struct.level,
        timeframe: struct.timeframe,
        wyckoffPhase: struct.wyckoffPhase,
        importance: struct.importance,
        dominance: struct.dominance,
        tradingRange: {
          support: struct.tradingRange.support,
          resistance: struct.tradingRange.resistance,
          width: struct.tradingRange.width,
          type: struct.tradingRange.type
        }
      })),
      fractality: {
        fractalLevel: analysis.fractality.fractalLevel,
        coherence: analysis.fractality.coherence,
        efficiency: analysis.fractality.efficiency,
        primaryTimeframe: analysis.fractality.primaryTimeframe,
        secondaryTimeframe: analysis.fractality.secondaryTimeframe
      },
      interactions: analysis.interactions.map((interaction: StructureInteraction) => ({
        type: interaction.type,
        structures: interaction.structures,
        strength: interaction.strength,
        implications: interaction.implications,
        tradingAdvice: interaction.tradingAdvice
      })),
      recommendations: analysis.recommendations.map((rec: NestedStructureRecommendation) => ({
        structureLevel: rec.structureLevel,
        action: rec.action,
        confidence: rec.confidence,
        timeframe: rec.timeframe,
        reasoning: rec.reasoning
      })),
      summary: {
        keyInsights: [
          `Fractal levels: ${analysis.fractality.fractalLevel}`,
          `Coherence: ${analysis.fractality.coherence}%`,
          `Efficiency: ${analysis.fractality.efficiency}%`,
          `Structure interactions: ${analysis.interactions.length}`
        ],
        complexityScore: analysis.fractality.fractalLevel * 20 + analysis.interactions.length * 10,
        tradingComplexity: analysis.fractality.coherence > 70 ? 'simple' : 
                          analysis.fractality.coherence > 50 ? 'moderate' : 'complex'
      }
    };
  }

  private formatSignalValidationResponse(validation: SignalValidation): any {
    return {
      signal: {
        type: validation.signal.type,
        timestamp: validation.signal.timestamp.toISOString(),
        price: validation.signal.price,
        volume: validation.signal.volume,
        timeframe: validation.signal.timeframe
      },
      validation: {
        overallScore: validation.validation.overallScore,
        multiTimeframeConfirmation: validation.validation.multiTimeframeConfirmation,
        volumeConfirmation: validation.validation.volumeConfirmation,
        compositeManConfirmation: validation.validation.compositeManConfirmation,
        causeEffectAlignment: validation.validation.causeEffectAlignment
      },
      riskAssessment: {
        riskLevel: validation.riskAssessment.riskLevel,
        stopLoss: validation.riskAssessment.stopLoss,
        targets: validation.riskAssessment.targets,
        riskRewardRatio: validation.riskAssessment.riskRewardRatio
      },
      recommendations: validation.recommendations,
      summary: {
        signalQuality: validation.validation.overallScore > 75 ? 'excellent' : 
                      validation.validation.overallScore > 50 ? 'good' : 'poor',
        confirmations: [
          validation.validation.multiTimeframeConfirmation,
          validation.validation.volumeConfirmation,
          validation.validation.compositeManConfirmation,
          validation.validation.causeEffectAlignment
        ].filter(Boolean).length,
        totalConfirmations: 4
      }
    };
  }

  private formatInstitutionalFlowResponse(analysis: InstitutionalFlowAnalysis): any {
    return {
      symbol: analysis.symbol,
      timeframe: analysis.timeframe,
      analysisDate: analysis.analysisDate.toISOString(),
      netFlow: analysis.netFlow,
      flowIntensity: analysis.flowIntensity,
      flowConsistency: analysis.flowConsistency,
      currentPosition: analysis.currentPosition,
      confidenceLevel: analysis.confidenceLevel,
      majorEvents: analysis.majorEvents.map((event: InstitutionalEvent) => ({
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        impact: event.impact,
        volume: event.volume,
        priceImpact: event.priceImpact,
        duration: event.duration,
        evidence: event.evidence
      })),
      summary: {
        keyInsights: [
          `Net flow: ${analysis.netFlow > 0 ? 'positive' : 'negative'} (${(analysis.netFlow * 100).toFixed(1)}%)`,
          `Flow intensity: ${analysis.flowIntensity}%`,
          `Consistency: ${analysis.flowConsistency}%`,
          `Current position: ${analysis.currentPosition}`
        ],
        flowDirection: analysis.netFlow > 0.1 ? 'accumulation' : 
                      analysis.netFlow < -0.1 ? 'distribution' : 'neutral',
        activityLevel: analysis.flowIntensity > 70 ? 'high' : 
                      analysis.flowIntensity > 40 ? 'moderate' : 'low',
        majorEventsCount: analysis.majorEvents.length
      }
    };
  }

  private formatAdvancedInsightsResponse(insights: AdvancedInsights): any {
    return {
      symbol: insights.symbol,
      analysisType: insights.analysisType,
      analysisDate: insights.analysisDate.toISOString(),
      keyFindings: insights.keyFindings,
      tradingOpportunities: insights.tradingOpportunities.map((opp: TradingOpportunity) => ({
        type: opp.type,
        confidence: opp.confidence,
        timeframe: opp.timeframe,
        entry: opp.entry,
        stopLoss: opp.stopLoss,
        targets: opp.targets,
        maxRisk: opp.maxRisk,
        expectedReturn: opp.expectedReturn,
        timeHorizon: opp.timeHorizon,
        reasoning: opp.reasoning
      })),
      riskFactors: insights.riskFactors.map((risk: RiskFactor) => ({
        factor: risk.factor,
        severity: risk.severity,
        probability: risk.probability,
        impact: risk.impact,
        mitigation: risk.mitigation
      })),
      marketOutlook: {
        shortTerm: insights.marketOutlook.shortTerm,
        mediumTerm: insights.marketOutlook.mediumTerm,
        longTerm: insights.marketOutlook.longTerm
      },
      actionItems: insights.actionItems.map((item: ActionItem) => ({
        action: item.action,
        priority: item.priority,
        timeframe: item.timeframe,
        reasoning: item.reasoning
      })),
      summary: {
        totalFindings: insights.keyFindings.length,
        totalOpportunities: insights.tradingOpportunities.length,
        totalRisks: insights.riskFactors.length,
        highPriorityActions: insights.actionItems.filter((item: ActionItem) => 
          item.priority === 'high' || item.priority === 'urgent'
        ).length,
        overallSentiment: this.calculateOverallSentiment(insights)
      }
    };
  }

  // ====================
  // HELPER METHODS
  // ====================

  private calculateOverallSentiment(insights: AdvancedInsights): 'bullish' | 'bearish' | 'neutral' {
    const bullishKeywords = ['accumulation', 'markup', 'bullish', 'buy', 'long'];
    const bearishKeywords = ['distribution', 'markdown', 'bearish', 'sell', 'short'];
    
    let bullishScore = 0;
    let bearishScore = 0;
    
    const allText = [
      ...insights.keyFindings,
      ...insights.tradingOpportunities.map((opp: TradingOpportunity) => opp.type),
      insights.marketOutlook.shortTerm,
      insights.marketOutlook.mediumTerm,
      insights.marketOutlook.longTerm
    ].join(' ').toLowerCase();
    
    bullishKeywords.forEach(keyword => {
      const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
      bullishScore += matches;
    });
    
    bearishKeywords.forEach(keyword => {
      const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
      bearishScore += matches;
    });
    
    if (bullishScore > bearishScore * 1.2) return 'bullish';
    if (bearishScore > bullishScore * 1.2) return 'bearish';
    return 'neutral';
  }

  private formatSuccessResponse(data: any): MCPServerResponse {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }

  private formatErrorResponse(message: string): MCPServerResponse {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}
