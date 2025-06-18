/**
 * @fileoverview MCP Tool Handlers - Complete Modular Handler System
 * @description Unified handler system with proper modular architecture
 * @version 1.3.7
 */

import { MarketAnalysisEngine } from '../core/engine.js';
import { MCPServerResponse, MarketCategoryType } from '../types/index.js';
import { FileLogger } from '../utils/fileLogger.js';
import { Logger } from '../utils/logger.js';
import { MarketDataHandlers } from './handlers/marketDataHandlers.js';
import { AnalysisRepositoryHandlers } from './handlers/analysisRepositoryHandlers.js';
import { ReportGeneratorHandlers } from './handlers/reportGeneratorHandlers.js';
import { CacheHandlers } from './cacheHandlers.js';
import { ConfigurationHandlers } from './handlers/configurationHandlers.js';
import { SystemConfigurationHandlers } from './handlers/systemConfigurationHandlers.js';
import { HistoricalAnalysisHandlers } from './handlers/historicalAnalysisHandlers.js';
import { HybridStorageHandlers } from './handlers/hybridStorageHandlers.js';
import { TrapDetectionHandlers } from './handlers/trapDetectionHandlers.js';
import { WyckoffBasicHandlers } from './handlers/wyckoffBasicHandlers.js';
import { WyckoffAdvancedHandlers } from './handlers/wyckoffAdvancedHandlers.js';
import { TechnicalAnalysisHandlers } from './handlers/technicalAnalysisHandlers.js';
import { SmartMoneyConceptsHandlers } from './handlers/smartMoneyConceptsHandlers.js';
import { contextHandlers } from './handlers/contextHandlers.js';
import { AdvancedMultiExchangeHandlers } from './handlers/multiExchange/advancedMultiExchangeHandlers.js';
import { BasicAnalysisHandlers } from './handlers/basicAnalysisHandlers.js';
import { SupportResistanceHandlers } from './handlers/supportResistanceHandlers.js';
import { GridTradingHandlers } from './handlers/gridTradingHandlers.js';
import { ComprehensiveAnalysisHandlers } from './handlers/comprehensiveAnalysisHandlers.js';
import { SystemHandlers } from './handlers/systemHandlers.js';
import * as path from 'path';

export class MCPHandlers {
  private readonly logger: FileLogger;
  private readonly engine: MarketAnalysisEngine;
  private readonly marketDataHandlers: MarketDataHandlers;
  private readonly analysisRepositoryHandlers: AnalysisRepositoryHandlers;
  private readonly reportGeneratorHandlers: ReportGeneratorHandlers;
  private readonly cacheHandlers: CacheHandlers;
  private readonly configurationHandlers: ConfigurationHandlers;
  private readonly systemConfigurationHandlers: SystemConfigurationHandlers;
  private readonly historicalAnalysisHandlers: HistoricalAnalysisHandlers;
  private readonly trapDetectionHandlers: TrapDetectionHandlers;
  private readonly wyckoffBasicHandlers: WyckoffBasicHandlers;
  private readonly wyckoffAdvancedHandlers: WyckoffAdvancedHandlers;
  private readonly technicalAnalysisHandlers: TechnicalAnalysisHandlers;
  private readonly smartMoneyConceptsHandlers: SmartMoneyConceptsHandlers;
  private readonly advancedMultiExchangeHandlers: AdvancedMultiExchangeHandlers;
  private readonly basicAnalysisHandlers: BasicAnalysisHandlers;
  private readonly supportResistanceHandlers: SupportResistanceHandlers;
  private readonly gridTradingHandlers: GridTradingHandlers;
  private readonly comprehensiveAnalysisHandlers: ComprehensiveAnalysisHandlers;
  private readonly systemHandlers: SystemHandlers;
  private readonly hybridStorageHandlers?: HybridStorageHandlers;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('MCPHandlers', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });

    // Initialize modular handlers
    this.marketDataHandlers = new MarketDataHandlers(engine, this.logger);
    this.analysisRepositoryHandlers = new AnalysisRepositoryHandlers(engine, this.logger);
    this.reportGeneratorHandlers = new ReportGeneratorHandlers(engine, this.logger);
    this.cacheHandlers = new CacheHandlers(engine);
    this.configurationHandlers = new ConfigurationHandlers(engine.getConfigurationManager());
    this.systemConfigurationHandlers = new SystemConfigurationHandlers();
    this.historicalAnalysisHandlers = new HistoricalAnalysisHandlers(
      engine.historicalDataService,
      engine.historicalAnalysisService,
      engine.historicalCacheService
    );
    this.trapDetectionHandlers = new TrapDetectionHandlers(engine.trapDetectionService);
    this.wyckoffBasicHandlers = new WyckoffBasicHandlers(engine);
    this.wyckoffAdvancedHandlers = new WyckoffAdvancedHandlers(engine.wyckoffAdvancedService);
    this.technicalAnalysisHandlers = new TechnicalAnalysisHandlers(engine);
    this.smartMoneyConceptsHandlers = new SmartMoneyConceptsHandlers(
      engine.marketDataService,
      engine.analysisService
    );
    this.advancedMultiExchangeHandlers = new AdvancedMultiExchangeHandlers(engine, this.logger);
    
    // Initialize new modular handlers (TASK-034 FASE 2)
    this.basicAnalysisHandlers = new BasicAnalysisHandlers(engine, this.logger);
    this.supportResistanceHandlers = new SupportResistanceHandlers(engine, this.logger);
    this.gridTradingHandlers = new GridTradingHandlers(engine, this.logger);
    this.comprehensiveAnalysisHandlers = new ComprehensiveAnalysisHandlers(engine, this.logger);
    this.systemHandlers = new SystemHandlers(engine, this.logger);
    
    // Initialize Hybrid Storage Handlers if available (TASK-015)
    if (engine.hybridStorageService) {
      this.hybridStorageHandlers = new HybridStorageHandlers(engine.hybridStorageService);
      this.logger.info('Hybrid Storage Handlers initialized');
    }

    this.logger.info('MCP Handlers initialized with complete modular architecture', {
      hybridStorageEnabled: !!engine.hybridStorageService,
      trapDetectionEnabled: true,
      wyckoffBasicEnabled: true,
      wyckoffAdvancedEnabled: true,
      smartMoneyConceptsEnabled: true,
      advancedMultiExchangeEnabled: true,
      basicAnalysisEnabled: true,
      supportResistanceEnabled: true,
      gridTradingEnabled: true,
      comprehensiveAnalysisEnabled: true,
      systemHandlersEnabled: true,
      totalHandlers: 74
    });
  }

  // ====================
  // MARKET DATA HANDLERS
  // ====================

  async handleGetTicker(args: any): Promise<MCPServerResponse> {
    return await this.marketDataHandlers.handleGetTicker(args);
  }

  async handleGetOrderbook(args: any): Promise<MCPServerResponse> {
    return await this.marketDataHandlers.handleGetOrderbook(args);
  }

  async handleGetMarketData(args: any): Promise<MCPServerResponse> {
    return await this.marketDataHandlers.handleGetMarketData(args);
  }

  // ====================
  // ANALYSIS HANDLERS
  // ====================

  async handleAnalyzeVolatility(args: any): Promise<MCPServerResponse> {
    return await this.basicAnalysisHandlers.handleAnalyzeVolatility(args);
  }

  async handleAnalyzeVolume(args: any): Promise<MCPServerResponse> {
    return await this.basicAnalysisHandlers.handleAnalyzeVolume(args);
  }

  async handleAnalyzeVolumeDelta(args: any): Promise<MCPServerResponse> {
    return await this.basicAnalysisHandlers.handleAnalyzeVolumeDelta(args);
  }

  async handleIdentifySupportResistance(args: any): Promise<MCPServerResponse> {
    return await this.supportResistanceHandlers.handleIdentifySupportResistance(args);
  }

  async handleSuggestGridLevels(args: any): Promise<MCPServerResponse> {
    return await this.gridTradingHandlers.handleSuggestGridLevels(args);
  }

  async handlePerformTechnicalAnalysis(args: any): Promise<MCPServerResponse> {
    return await this.comprehensiveAnalysisHandlers.handlePerformTechnicalAnalysis(args);
  }

  async handleGetCompleteAnalysis(args: any): Promise<MCPServerResponse> {
    return await this.comprehensiveAnalysisHandlers.handleGetCompleteAnalysis(args);
  }

  // ====================
  // SYSTEM HANDLERS
  // ====================

  async handleGetSystemHealth(args: any): Promise<MCPServerResponse> {
    return await this.systemHandlers.handleGetSystemHealth(args);
  }

  async handleGetDebugLogs(args: any): Promise<MCPServerResponse> {
    return await this.systemHandlers.handleGetDebugLogs(args);
  }

  async handleGetAnalysisHistory(args: any): Promise<MCPServerResponse> {
    return await this.systemHandlers.handleGetAnalysisHistory(args);
  }

  async handleTestStorage(args: any): Promise<MCPServerResponse> {
    return await this.systemHandlers.handleTestStorage(args);
  }

  // ====================
  // ANALYSIS REPOSITORY HANDLERS (DELEGATED)
  // ====================

  async handleGetAnalysisById(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetAnalysisById(args);
  }

  async handleGetLatestAnalysis(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetLatestAnalysis(args);
  }

  async handleSearchAnalyses(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleSearchAnalyses(args);
  }

  async handleGetAnalysisSummary(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetAnalysisSummary(args);
  }

  async handleGetAggregatedMetrics(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetAggregatedMetrics(args);
  }

  async handleFindPatterns(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleFindPatterns(args);
  }

  async handleGetRepositoryStats(args: any): Promise<MCPServerResponse> {
    return await this.analysisRepositoryHandlers.handleGetRepositoryStats(args);
  }

  // ====================
  // CACHE HANDLERS (DELEGATED)
  // ====================

  async handleGetCacheStats(args: any): Promise<MCPServerResponse> {
    return await this.cacheHandlers.handleGetCacheStats(args);
  }

  async handleClearCache(args: any): Promise<MCPServerResponse> {
    return await this.cacheHandlers.handleClearCache(args);
  }

  async handleInvalidateCache(args: any): Promise<MCPServerResponse> {
    return await this.cacheHandlers.handleInvalidateCache(args);
  }

  // ====================
  // REPORT GENERATOR HANDLERS (DELEGATED)
  // ====================

  async handleGenerateReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGenerateReport(args);
  }

  async handleGenerateDailyReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGenerateDailyReport(args);
  }

  async handleGenerateWeeklyReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGenerateWeeklyReport(args);
  }

  async handleGenerateSymbolReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGenerateSymbolReport(args);
  }

  async handleGeneratePerformanceReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGeneratePerformanceReport(args);
  }

  async handleGetReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleGetReport(args);
  }

  async handleListReports(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleListReports(args);
  }

  async handleExportReport(args: any): Promise<MCPServerResponse> {
    return await this.reportGeneratorHandlers.handleExportReport(args);
  }

  // ====================
  // CONFIGURATION HANDLERS (DELEGATED)
  // ====================

  async handleGetUserConfig(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleGetUserConfig();
  }

  async handleSetUserTimezone(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleSetUserTimezone(args);
  }

  async handleDetectTimezone(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleDetectTimezone();
  }

  async handleUpdateConfig(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleUpdateConfig(args);
  }

  async handleResetConfig(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleResetConfig();
  }

  async handleValidateConfig(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleValidateConfig();
  }

  async handleGetConfigInfo(args: any): Promise<MCPServerResponse> {
    return await this.configurationHandlers.handleGetConfigInfo();
  }

  // ====================
  // HISTORICAL ANALYSIS HANDLERS (TASK-017) - NOW ENABLED
  // ====================

  async handleGetHistoricalKlines(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleGetHistoricalKlines(args);
  }

  async handleAnalyzeHistoricalSR(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleAnalyzeHistoricalSR(args);
  }

  async handleIdentifyVolumeAnomalies(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleIdentifyVolumeAnomalies(args);
  }

  async handleGetPriceDistribution(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleGetPriceDistribution(args);
  }

  async handleIdentifyMarketCycles(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleIdentifyMarketCycles(args);
  }

  async handleGetHistoricalSummary(args: any): Promise<MCPServerResponse> {
    return await this.historicalAnalysisHandlers.handleGetHistoricalSummary(args);
  }

  // ====================
  // HYBRID STORAGE HANDLERS (TASK-015) - OPTIONAL
  // ====================

  async handleGetHybridStorageConfig(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleGetHybridStorageConfig();
  }

  async handleUpdateHybridStorageConfig(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleUpdateHybridStorageConfig(args);
  }

  async handleGetStorageComparison(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleGetStorageComparison();
  }

  async handleTestStoragePerformance(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleTestStoragePerformance(args);
  }

  async handleGetMongoStatus(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleGetMongoStatus();
  }

  async handleGetEvaluationReport(args: any): Promise<MCPServerResponse> {
    if (!this.hybridStorageHandlers) {
      return this.createErrorResponse('hybrid_storage_disabled', new Error('Hybrid storage not enabled'));
    }
    return await this.hybridStorageHandlers.handleGetEvaluationReport();
  }

  // ====================
  // SYSTEM CONFIGURATION HANDLERS (DELEGATED)
  // ====================

  async handleGetSystemConfig(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleGetSystemConfig();
  }

  async handleGetMongoConfig(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleGetMongoConfig();
  }

  async handleGetApiConfig(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleGetApiConfig();
  }

  async handleGetAnalysisConfig(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleGetAnalysisConfig();
  }

  async handleGetGridConfig(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleGetGridConfig();
  }

  async handleGetLoggingConfig(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleGetLoggingConfig();
  }

  async handleValidateEnvConfig(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleValidateEnvConfig();
  }

  async handleReloadEnvConfig(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleReloadEnvConfig();
  }

  async handleGetEnvFileInfo(args: any): Promise<MCPServerResponse> {
    return await this.systemConfigurationHandlers.handleGetEnvFileInfo();
  }

  // ====================
  // TRAP DETECTION HANDLERS (TASK-012) - DELEGATED
  // ====================

  async handleDetectBullTrap(args: any): Promise<MCPServerResponse> {
    return await this.trapDetectionHandlers.handleDetectBullTrap(args);
  }

  async handleDetectBearTrap(args: any): Promise<MCPServerResponse> {
    return await this.trapDetectionHandlers.handleDetectBearTrap(args);
  }

  async handleGetTrapHistory(args: any): Promise<MCPServerResponse> {
    return await this.trapDetectionHandlers.handleGetTrapHistory(args);
  }

  async handleGetTrapStatistics(args: any): Promise<MCPServerResponse> {
    return await this.trapDetectionHandlers.handleGetTrapStatistics(args);
  }

  async handleConfigureTrapDetection(args: any): Promise<MCPServerResponse> {
    return await this.trapDetectionHandlers.handleConfigureTrapDetection(args);
  }

  async handleValidateBreakout(args: any): Promise<MCPServerResponse> {
    return await this.trapDetectionHandlers.handleValidateBreakout(args);
  }

  async handleGetTrapPerformance(args: any): Promise<MCPServerResponse> {
    return await this.trapDetectionHandlers.handleGetTrapPerformance(args);
  }

  // ====================
  // WYCKOFF BASIC HANDLERS (TASK-005) - DELEGATED
  // ====================

  async handleAnalyzeWyckoffPhase(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffBasicHandlers.handleAnalyzeWyckoffPhase(args);
  }

  async handleDetectTradingRange(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffBasicHandlers.handleDetectTradingRange(args);
  }

  async handleFindWyckoffEvents(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffBasicHandlers.handleFindWyckoffEvents(args);
  }

  async handleAnalyzeWyckoffVolume(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffBasicHandlers.handleAnalyzeWyckoffVolume(args);
  }

  async handleGetWyckoffInterpretation(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffBasicHandlers.handleGetWyckoffInterpretation(args);
  }

  async handleTrackPhaseProgression(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffBasicHandlers.handleTrackPhaseProgression(args);
  }

  async handleValidateWyckoffSetup(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffBasicHandlers.handleValidateWyckoffSetup(args);
  }

  // ====================
  // TECHNICAL ANALYSIS ADVANCED HANDLERS (TASK-019) - DELEGATED
  // ====================

  async handleCalculateFibonacciLevels(args: any): Promise<MCPServerResponse> {
    return await this.technicalAnalysisHandlers.handleCalculateFibonacciLevels(args);
  }

  async handleAnalyzeBollingerBands(args: any): Promise<MCPServerResponse> {
    return await this.technicalAnalysisHandlers.handleAnalyzeBollingerBands(args);
  }

  async handleDetectElliottWaves(args: any): Promise<MCPServerResponse> {
    return await this.technicalAnalysisHandlers.handleDetectElliottWaves(args);
  }

  async handleFindTechnicalConfluences(args: any): Promise<MCPServerResponse> {
    return await this.technicalAnalysisHandlers.handleFindTechnicalConfluences(args);
  }

  // ====================
  // WYCKOFF ADVANCED HANDLERS (TASK-018) - DELEGATED
  // ====================

  async handleAnalyzeCompositeMan(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffAdvancedHandlers.handleAnalyzeCompositeMan(args);
  }

  async handleAnalyzeMultiTimeframeWyckoff(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffAdvancedHandlers.handleAnalyzeMultiTimeframe(args);
  }

  async handleCalculateCauseEffectTargets(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffAdvancedHandlers.handleCalculateCauseEffect(args);
  }

  async handleAnalyzeNestedWyckoffStructures(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffAdvancedHandlers.handleAnalyzeNestedStructures(args);
  }

  async handleValidateWyckoffSignal(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffAdvancedHandlers.handleValidateWyckoffSignal(args);
  }

  async handleTrackInstitutionalFlow(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffAdvancedHandlers.handleTrackInstitutionalFlow(args);
  }

  async handleGenerateWyckoffAdvancedInsights(args: any): Promise<MCPServerResponse> {
    return await this.wyckoffAdvancedHandlers.handleGenerateAdvancedInsights(args);
  }

  // ====================
  // SMART MONEY CONCEPTS HANDLERS (TASK-020) - DELEGATED
  // ====================

  async handleDetectOrderBlocks(args: any): Promise<MCPServerResponse> {
    return await this.smartMoneyConceptsHandlers.handleDetectOrderBlocks(args);
  }

  async handleValidateOrderBlock(args: any): Promise<MCPServerResponse> {
    return await this.smartMoneyConceptsHandlers.handleValidateOrderBlock(args);
  }

  async handleGetOrderBlockZones(args: any): Promise<MCPServerResponse> {
    return await this.smartMoneyConceptsHandlers.handleGetOrderBlockZones(args);
  }

  async handleFindFairValueGaps(args: any): Promise<MCPServerResponse> {
    return await this.smartMoneyConceptsHandlers.handleFindFairValueGaps(args);
  }

  async handleAnalyzeFVGFilling(args: any): Promise<MCPServerResponse> {
    return await this.smartMoneyConceptsHandlers.handleAnalyzeFVGFilling(args);
  }

  // ====================
  // SMART MONEY CONCEPTS - BREAK OF STRUCTURE HANDLERS (TASK-020 FASE 3)
  // ====================

  async handleDetectBreakOfStructure(args: any): Promise<MCPServerResponse> {
    return await this.smartMoneyConceptsHandlers.handleDetectBreakOfStructure(args);
  }

  async handleAnalyzeMarketStructure(args: any): Promise<MCPServerResponse> {
    return await this.smartMoneyConceptsHandlers.handleAnalyzeMarketStructure(args);
  }

  async handleValidateStructureShift(args: any): Promise<MCPServerResponse> {
    return await this.smartMoneyConceptsHandlers.handleValidateStructureShift(args);
  }

  // ====================
  // SMART MONEY CONCEPTS - INTEGRATION HANDLERS (TASK-020 FASE 4)
  // ====================

  async handleAnalyzeSmartMoneyConfluence(args: any): Promise<MCPServerResponse> {
    const { SmartMoneyAnalysisHandlers } = await import('./handlers/smartMoney/smartMoneyAnalysisHandlers.js');
    const handlers = SmartMoneyAnalysisHandlers.createSmartMoneyAnalysisHandlers(this.engine);
    return await handlers.handleAnalyzeSmartMoneyConfluence(args);
  }

  async handleGetSMCMarketBias(args: any): Promise<MCPServerResponse> {
    const { SmartMoneyAnalysisHandlers } = await import('./handlers/smartMoney/smartMoneyAnalysisHandlers.js');
    const handlers = SmartMoneyAnalysisHandlers.createSmartMoneyAnalysisHandlers(this.engine);
    return await handlers.handleGetSMCMarketBias(args);
  }

  async handleValidateSMCSetup(args: any): Promise<MCPServerResponse> {
    const { SmartMoneyAnalysisHandlers } = await import('./handlers/smartMoney/smartMoneyAnalysisHandlers.js');
    const handlers = SmartMoneyAnalysisHandlers.createSmartMoneyAnalysisHandlers(this.engine);
    return await handlers.handleValidateSMCSetup(args);
  }

  // ====================
  // CONTEXT MANAGEMENT HANDLERS
  // ====================

  async handleGetAnalysisContext(args: any): Promise<MCPServerResponse> {
    return await contextHandlers.get_analysis_context(args);
  }

  async handleGetTimeframeContext(args: any): Promise<MCPServerResponse> {
    return await contextHandlers.get_timeframe_context(args);
  }

  async handleAddAnalysisContext(args: any): Promise<MCPServerResponse> {
    return await contextHandlers.add_analysis_context(args);
  }

  async handleGetMultiTimeframeContext(args: any): Promise<MCPServerResponse> {
    return await contextHandlers.get_multi_timeframe_context(args);
  }

  async handleUpdateContextConfig(args: any): Promise<MCPServerResponse> {
    return await contextHandlers.update_context_config(args);
  }

  async handleCleanupContext(args: any): Promise<MCPServerResponse> {
    return await contextHandlers.cleanup_context(args);
  }

  async handleGetContextStats(args: any): Promise<MCPServerResponse> {
    return await contextHandlers.get_context_stats(args);
  }

  // ====================
  // SMART MONEY CONCEPTS - DASHBOARD HANDLERS (TASK-020 FASE 5)
  // ====================

  async handleGetSMCDashboard(args: any): Promise<MCPServerResponse> {
    const { SmartMoneyDashboardHandlers } = await import('./handlers/smartMoney/smartMoneyDashboardHandlers.js');
    const handlers = new SmartMoneyDashboardHandlers(
      this.engine.marketDataService,
      this.engine.analysisService
    );
    return await handlers.getSMCDashboard(args);
  }

  async handleGetSMCTradingSetup(args: any): Promise<MCPServerResponse> {
    const { SmartMoneyDashboardHandlers } = await import('./handlers/smartMoney/smartMoneyDashboardHandlers.js');
    const handlers = new SmartMoneyDashboardHandlers(
      this.engine.marketDataService,
      this.engine.analysisService
    );
    return await handlers.getSMCTradingSetup(args);
  }

  async handleAnalyzeSMCConfluenceStrength(args: any): Promise<MCPServerResponse> {
    const { SmartMoneyDashboardHandlers } = await import('./handlers/smartMoney/smartMoneyDashboardHandlers.js');
    const handlers = new SmartMoneyDashboardHandlers(
      this.engine.marketDataService,
      this.engine.analysisService
    );
    return await handlers.analyzeSMCConfluenceStrength(args);
  }

  // ====================
  // MULTI-EXCHANGE HANDLERS (TASK-026 FASE 2)
  // ====================

  async handleGetAggregatedTicker(args: any): Promise<MCPServerResponse> {
    const { createMultiExchangeHandlers } = await import('./handlers/multiExchangeHandlers.js');
    const handlers = createMultiExchangeHandlers(this.engine);
    const handler = handlers[0]; // getAggregatedTickerHandler
    if (!handler) throw new Error('Handler not found');
    return await handler(args);
  }

  async handleGetCompositeOrderbook(args: any): Promise<MCPServerResponse> {
    const { createMultiExchangeHandlers } = await import('./handlers/multiExchangeHandlers.js');
    const handlers = createMultiExchangeHandlers(this.engine);
    const handler = handlers[1]; // getCompositeOrderbookHandler
    if (!handler) throw new Error('Handler not found');
    return await handler(args);
  }

  async handleDetectExchangeDivergences(args: any): Promise<MCPServerResponse> {
    const { createMultiExchangeHandlers } = await import('./handlers/multiExchangeHandlers.js');
    const handlers = createMultiExchangeHandlers(this.engine);
    const handler = handlers[2]; // detectExchangeDivergencesHandler
    if (!handler) throw new Error('Handler not found');
    return await handler(args);
  }

  async handleIdentifyArbitrageOpportunities(args: any): Promise<MCPServerResponse> {
    const { createMultiExchangeHandlers } = await import('./handlers/multiExchangeHandlers.js');
    const handlers = createMultiExchangeHandlers(this.engine);
    const handler = handlers[3]; // identifyArbitrageOpportunitiesHandler
    if (!handler) throw new Error('Handler not found');
    return await handler(args);
  }

  async handleGetExchangeDominance(args: any): Promise<MCPServerResponse> {
    const { createMultiExchangeHandlers } = await import('./handlers/multiExchangeHandlers.js');
    const handlers = createMultiExchangeHandlers(this.engine);
    const handler = handlers[4]; // getExchangeDominanceHandler
    if (!handler) throw new Error('Handler not found');
    return await handler(args);
  }

  async handleGetMultiExchangeAnalytics(args: any): Promise<MCPServerResponse> {
    const { createMultiExchangeHandlers } = await import('./handlers/multiExchangeHandlers.js');
    const handlers = createMultiExchangeHandlers(this.engine);
    const handler = handlers[5]; // getMultiExchangeAnalyticsHandler
    if (!handler) throw new Error('Handler not found');
    return await handler(args);
  }

  // ====================
  // ADVANCED MULTI-EXCHANGE HANDLERS (TASK-026 FASE 4) - DELEGATED TO MODULAR HANDLERS
  // ====================

  async handlePredictLiquidationCascade(args: any): Promise<MCPServerResponse> {
    return await this.advancedMultiExchangeHandlers.handlePredictLiquidationCascade(args);
  }

  async handleDetectAdvancedDivergences(args: any): Promise<MCPServerResponse> {
    return await this.advancedMultiExchangeHandlers.handleDetectAdvancedDivergences(args);
  }

  async handleAnalyzeEnhancedArbitrage(args: any): Promise<MCPServerResponse> {
    return await this.advancedMultiExchangeHandlers.handleAnalyzeEnhancedArbitrage(args);
  }

  async handleAnalyzeExtendedDominance(args: any): Promise<MCPServerResponse> {
    return await this.advancedMultiExchangeHandlers.handleAnalyzeExtendedDominance(args);
  }

  async handleAnalyzeCrossExchangeMarketStructure(args: any): Promise<MCPServerResponse> {
    return await this.advancedMultiExchangeHandlers.handleAnalyzeCrossExchangeMarketStructure(args);
  }

  // ====================
  // HELPER METHODS
  // ====================

  private createSuccessResponse(data: any): MCPServerResponse {
    // Ensure clean JSON serialization without complex objects
    let cleanData: any;
    
    try {
      // Convert to JSON and back to ensure clean serialization
      const jsonString = JSON.stringify(data, (key, value) => {
        // Filter out potentially problematic values
        if (typeof value === 'function' || value === undefined) {
          return '[FILTERED]';
        }
        if (typeof value === 'object' && value !== null) {
          // Ensure objects are plain and serializable
          if (value.constructor !== Object && value.constructor !== Array) {
            return '[COMPLEX_OBJECT]';
          }
        }
        return value;
      });
      
      cleanData = JSON.parse(jsonString);
    } catch (error) {
      // Fallback to simple string representation
      cleanData = { result: 'Data serialization error', data: String(data) };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(cleanData, null, 2)
      }]
    };
  }

  private createErrorResponse(toolName: string, error: Error): MCPServerResponse {
    this.logger.error(`Tool ${toolName} failed:`, error);
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error.message}`
      }]
    };
  }
}
