/**
 * @fileoverview Handler Registry - Tool to Handler Mapping
 * @description Maps tool names to their corresponding handler methods with validation
 * @version 1.6.4 - Added Context-Aware Analysis Tools (TASK-040.4)
 */

import { MCPHandlers } from '../mcp-handlers.js';
import { ToolHandler } from '../types/mcp.types.js';
import { hasTool, getToolCount } from '../tools/index.js';

export class HandlerRegistry {
  private handlers = new Map<string, ToolHandler>();
  private mcpHandlers: MCPHandlers;

  constructor(mcpHandlers: MCPHandlers) {
    this.mcpHandlers = mcpHandlers;
    this.registerAllHandlers();
    this.validateRegistration();
  }

  private registerAllHandlers(): void {
    // Market Data Tools
    this.register('get_ticker', (args) => this.mcpHandlers.handleGetTicker(args));
    this.register('get_orderbook', (args) => this.mcpHandlers.handleGetOrderbook(args));
    this.register('get_market_data', (args) => this.mcpHandlers.handleGetMarketData(args));

    // Technical Analysis Tools
    this.register('analyze_volatility', (args) => this.mcpHandlers.handleAnalyzeVolatility(args));
    this.register('analyze_volume', (args) => this.mcpHandlers.handleAnalyzeVolume(args));
    this.register('analyze_volume_delta', (args) => this.mcpHandlers.handleAnalyzeVolumeDelta(args));
    this.register('identify_support_resistance', (args) => this.mcpHandlers.handleIdentifySupportResistance(args));
    this.register('perform_technical_analysis', (args) => this.mcpHandlers.handlePerformTechnicalAnalysis(args));
    this.register('get_complete_analysis', (args) => this.mcpHandlers.handleGetCompleteAnalysis(args));

    // Context-Aware Analysis Tools (TASK-040.4)
    this.register('analyze_with_historical_context', (args) => this.mcpHandlers.handleAnalyzeWithHistoricalContext(args));
    this.register('complete_analysis_with_context', (args) => this.mcpHandlers.handleCompleteAnalysisWithContext(args));

    // Grid Trading Tools
    this.register('suggest_grid_levels', (args) => this.mcpHandlers.handleSuggestGridLevels(args));

    // System Tools
    this.register('get_system_health', (args) => this.mcpHandlers.handleGetSystemHealth(args));
    this.register('get_debug_logs', (args) => this.mcpHandlers.handleGetDebugLogs(args));
    this.register('get_analysis_history', (args) => this.mcpHandlers.handleGetAnalysisHistory(args));
    this.register('test_storage', (args) => this.mcpHandlers.handleTestStorage(args));

    // Cache Tools
    this.register('get_cache_stats', (args) => this.mcpHandlers.handleGetCacheStats(args));
    this.register('clear_cache', (args) => this.mcpHandlers.handleClearCache(args));
    this.register('invalidate_cache', (args) => this.mcpHandlers.handleInvalidateCache(args));

    // Analysis Repository Tools (TASK-009 FASE 3)
    this.register('get_analysis_by_id', (args) => this.mcpHandlers.handleGetAnalysisById(args));
    this.register('get_latest_analysis', (args) => this.mcpHandlers.handleGetLatestAnalysis(args));
    this.register('search_analyses', (args) => this.mcpHandlers.handleSearchAnalyses(args));
    this.register('get_analysis_summary', (args) => this.mcpHandlers.handleGetAnalysisSummary(args));
    this.register('get_aggregated_metrics', (args) => this.mcpHandlers.handleGetAggregatedMetrics(args));
    this.register('find_patterns', (args) => this.mcpHandlers.handleFindPatterns(args));
    this.register('get_repository_stats', (args) => this.mcpHandlers.handleGetRepositoryStats(args));

    // Report Generator Tools (TASK-009 FASE 4)
    this.register('generate_report', (args) => this.mcpHandlers.handleGenerateReport(args));
    this.register('generate_daily_report', (args) => this.mcpHandlers.handleGenerateDailyReport(args));
    this.register('generate_weekly_report', (args) => this.mcpHandlers.handleGenerateWeeklyReport(args));
    this.register('generate_symbol_report', (args) => this.mcpHandlers.handleGenerateSymbolReport(args));
    this.register('generate_performance_report', (args) => this.mcpHandlers.handleGeneratePerformanceReport(args));
    this.register('get_report', (args) => this.mcpHandlers.handleGetReport(args));
    this.register('list_reports', (args) => this.mcpHandlers.handleListReports(args));
    this.register('export_report', (args) => this.mcpHandlers.handleExportReport(args));

    // User Configuration Tools (TASK-010)
    this.register('get_user_config', (args) => this.mcpHandlers.handleGetUserConfig(args));
    this.register('set_user_timezone', (args) => this.mcpHandlers.handleSetUserTimezone(args));
    this.register('detect_timezone', (args) => this.mcpHandlers.handleDetectTimezone(args));
    this.register('update_config', (args) => this.mcpHandlers.handleUpdateConfig(args));
    this.register('reset_config', (args) => this.mcpHandlers.handleResetConfig(args));
    this.register('validate_config', (args) => this.mcpHandlers.handleValidateConfig(args));
    this.register('get_config_info', (args) => this.mcpHandlers.handleGetConfigInfo(args));

    // Environment Configuration Tools (TASK-015b)
    this.register('get_system_config', (args) => this.mcpHandlers.handleGetSystemConfig(args));
    this.register('get_mongo_config', (args) => this.mcpHandlers.handleGetMongoConfig(args));
    this.register('get_api_config', (args) => this.mcpHandlers.handleGetApiConfig(args));
    this.register('get_analysis_config', (args) => this.mcpHandlers.handleGetAnalysisConfig(args));
    this.register('get_grid_config', (args) => this.mcpHandlers.handleGetGridConfig(args));
    this.register('get_logging_config', (args) => this.mcpHandlers.handleGetLoggingConfig(args));
    this.register('validate_env_config', (args) => this.mcpHandlers.handleValidateEnvConfig(args));
    this.register('reload_env_config', (args) => this.mcpHandlers.handleReloadEnvConfig(args));
    this.register('get_env_file_info', (args) => this.mcpHandlers.handleGetEnvFileInfo(args));

    // Historical Analysis Tools (TASK-017)
    this.register('get_historical_klines', (args) => this.mcpHandlers.handleGetHistoricalKlines(args));
    this.register('analyze_historical_sr', (args) => this.mcpHandlers.handleAnalyzeHistoricalSR(args));
    this.register('identify_volume_anomalies', (args) => this.mcpHandlers.handleIdentifyVolumeAnomalies(args));
    this.register('get_price_distribution', (args) => this.mcpHandlers.handleGetPriceDistribution(args));
    this.register('identify_market_cycles', (args) => this.mcpHandlers.handleIdentifyMarketCycles(args));
    this.register('get_historical_summary', (args) => this.mcpHandlers.handleGetHistoricalSummary(args));

    // Hybrid Storage Tools (TASK-015)
    this.register('get_hybrid_storage_config', (args) => this.mcpHandlers.handleGetHybridStorageConfig(args));
    this.register('update_hybrid_storage_config', (args) => this.mcpHandlers.handleUpdateHybridStorageConfig(args));
    this.register('get_storage_comparison', (args) => this.mcpHandlers.handleGetStorageComparison(args));
    this.register('test_storage_performance', (args) => this.mcpHandlers.handleTestStoragePerformance(args));
    this.register('get_mongo_status', (args) => this.mcpHandlers.handleGetMongoStatus(args));
    this.register('get_evaluation_report', (args) => this.mcpHandlers.handleGetEvaluationReport(args));

    // Trap Detection Tools (TASK-012)
    this.register('detect_bull_trap', (args) => this.mcpHandlers.handleDetectBullTrap(args));
    this.register('detect_bear_trap', (args) => this.mcpHandlers.handleDetectBearTrap(args));
    this.register('get_trap_history', (args) => this.mcpHandlers.handleGetTrapHistory(args));
    this.register('get_trap_statistics', (args) => this.mcpHandlers.handleGetTrapStatistics(args));
    this.register('configure_trap_detection', (args) => this.mcpHandlers.handleConfigureTrapDetection(args));
    this.register('validate_breakout', (args) => this.mcpHandlers.handleValidateBreakout(args));
    this.register('get_trap_performance', (args) => this.mcpHandlers.handleGetTrapPerformance(args));

    // Wyckoff Basic Analysis Tools (TASK-005)
    this.register('analyze_wyckoff_phase', (args) => this.mcpHandlers.handleAnalyzeWyckoffPhase(args));
    this.register('detect_trading_range', (args) => this.mcpHandlers.handleDetectTradingRange(args));
    this.register('find_wyckoff_events', (args) => this.mcpHandlers.handleFindWyckoffEvents(args));
    this.register('analyze_wyckoff_volume', (args) => this.mcpHandlers.handleAnalyzeWyckoffVolume(args));
    this.register('get_wyckoff_interpretation', (args) => this.mcpHandlers.handleGetWyckoffInterpretation(args));
    this.register('track_phase_progression', (args) => this.mcpHandlers.handleTrackPhaseProgression(args));
    this.register('validate_wyckoff_setup', (args) => this.mcpHandlers.handleValidateWyckoffSetup(args));

    // Wyckoff Advanced Analysis Tools (TASK-018)
    this.register('analyze_composite_man', (args) => this.mcpHandlers.handleAnalyzeCompositeMan(args));
    this.register('analyze_multi_timeframe_wyckoff', (args) => this.mcpHandlers.handleAnalyzeMultiTimeframeWyckoff(args));
    this.register('calculate_cause_effect_targets', (args) => this.mcpHandlers.handleCalculateCauseEffectTargets(args));
    this.register('analyze_nested_wyckoff_structures', (args) => this.mcpHandlers.handleAnalyzeNestedWyckoffStructures(args));
    this.register('validate_wyckoff_signal', (args) => this.mcpHandlers.handleValidateWyckoffSignal(args));
    this.register('track_institutional_flow', (args) => this.mcpHandlers.handleTrackInstitutionalFlow(args));
    this.register('generate_wyckoff_advanced_insights', (args) => this.mcpHandlers.handleGenerateWyckoffAdvancedInsights(args));

    // Technical Analysis Suite Tools (TASK-019)
    this.register('calculate_fibonacci_levels', (args) => this.mcpHandlers.handleCalculateFibonacciLevels(args));
    this.register('analyze_bollinger_bands', (args) => this.mcpHandlers.handleAnalyzeBollingerBands(args));
    this.register('detect_elliott_waves', (args) => this.mcpHandlers.handleDetectElliottWaves(args));
    this.register('find_technical_confluences', (args) => this.mcpHandlers.handleFindTechnicalConfluences(args));

    // Smart Money Concepts Tools (TASK-020)
    this.register('detect_order_blocks', (args) => this.mcpHandlers.handleDetectOrderBlocks(args));
    this.register('validate_order_block', (args) => this.mcpHandlers.handleValidateOrderBlock(args));
    this.register('get_order_block_zones', (args) => this.mcpHandlers.handleGetOrderBlockZones(args));
    this.register('find_fair_value_gaps', (args) => this.mcpHandlers.handleFindFairValueGaps(args));
    this.register('analyze_fvg_filling', (args) => this.mcpHandlers.handleAnalyzeFVGFilling(args));
    
    // Smart Money Concepts - Break of Structure Tools (TASK-020 FASE 3)
    this.register('detect_break_of_structure', (args) => this.mcpHandlers.handleDetectBreakOfStructure(args));
    this.register('analyze_market_structure', (args) => this.mcpHandlers.handleAnalyzeMarketStructure(args));
    this.register('validate_structure_shift', (args) => this.mcpHandlers.handleValidateStructureShift(args));
    
    // Smart Money Concepts - Integration Tools (TASK-020 FASE 4)
    this.register('analyze_smart_money_confluence', (args) => this.mcpHandlers.handleAnalyzeSmartMoneyConfluence(args));
    this.register('get_smc_market_bias', (args) => this.mcpHandlers.handleGetSMCMarketBias(args));
    this.register('validate_smc_setup', (args) => this.mcpHandlers.handleValidateSMCSetup(args));
    
    // Smart Money Concepts - Dashboard Tools (TASK-020 FASE 5)
    this.register('get_smc_dashboard', (args) => this.mcpHandlers.handleGetSMCDashboard(args));
    this.register('get_smc_trading_setup', (args) => this.mcpHandlers.handleGetSMCTradingSetup(args));
    this.register('analyze_smc_confluence_strength', (args) => this.mcpHandlers.handleAnalyzeSMCConfluenceStrength(args));
    
    // Context Management Tools
    this.register('get_analysis_context', (args) => this.mcpHandlers.handleGetAnalysisContext(args));
    this.register('get_timeframe_context', (args) => this.mcpHandlers.handleGetTimeframeContext(args));
    this.register('add_analysis_context', (args) => this.mcpHandlers.handleAddAnalysisContext(args));
    this.register('get_multi_timeframe_context', (args) => this.mcpHandlers.handleGetMultiTimeframeContext(args));
    this.register('update_context_config', (args) => this.mcpHandlers.handleUpdateContextConfig(args));
    this.register('cleanup_context', (args) => this.mcpHandlers.handleCleanupContext(args));
    this.register('get_context_stats', (args) => this.mcpHandlers.handleGetContextStats(args));
    
    // Multi-Exchange Tools (TASK-026 FASE 2)
    this.register('get_aggregated_ticker', (args) => this.mcpHandlers.handleGetAggregatedTicker(args));
    this.register('get_composite_orderbook', (args) => this.mcpHandlers.handleGetCompositeOrderbook(args));
    this.register('detect_exchange_divergences', (args) => this.mcpHandlers.handleDetectExchangeDivergences(args));
    this.register('identify_arbitrage_opportunities', (args) => this.mcpHandlers.handleIdentifyArbitrageOpportunities(args));
    this.register('get_exchange_dominance', (args) => this.mcpHandlers.handleGetExchangeDominance(args));
    this.register('get_multi_exchange_analytics', (args) => this.mcpHandlers.handleGetMultiExchangeAnalytics(args));
    
    // Advanced Multi-Exchange Tools (TASK-026 FASE 4)
    this.register('predict_liquidation_cascade', (args) => this.mcpHandlers.handlePredictLiquidationCascade(args));
    this.register('detect_advanced_divergences', (args) => this.mcpHandlers.handleDetectAdvancedDivergences(args));
    this.register('analyze_enhanced_arbitrage', (args) => this.mcpHandlers.handleAnalyzeEnhancedArbitrage(args));
    this.register('analyze_extended_dominance', (args) => this.mcpHandlers.handleAnalyzeExtendedDominance(args));
    this.register('analyze_cross_exchange_market_structure', (args) => this.mcpHandlers.handleAnalyzeCrossExchangeMarketStructure(args));
    
    // Hierarchical Context Management Tools (TASK-040.3)
    this.register('get_master_context', (args) => this.mcpHandlers.handleGetMasterContext(args));
    this.register('initialize_symbol_context', (args) => this.mcpHandlers.handleInitializeSymbolContext(args));
    this.register('update_context_levels', (args) => this.mcpHandlers.handleUpdateContextLevels(args));
    this.register('query_master_context', (args) => this.mcpHandlers.handleQueryMasterContext(args));
    this.register('create_context_snapshot', (args) => this.mcpHandlers.handleCreateContextSnapshot(args));
    this.register('get_context_snapshots', (args) => this.mcpHandlers.handleGetContextSnapshots(args));
    this.register('optimize_symbol_context', (args) => this.mcpHandlers.handleOptimizeSymbolContext(args));
    this.register('validate_context_integrity', (args) => this.mcpHandlers.handleValidateContextIntegrity(args));
    this.register('get_symbol_config', (args) => this.mcpHandlers.handleGetSymbolConfig(args));
    this.register('update_symbol_config', (args) => this.mcpHandlers.handleUpdateSymbolConfig(args));
    this.register('get_symbol_list', (args) => this.mcpHandlers.handleGetSymbolList(args));
    this.register('remove_symbol_context', (args) => this.mcpHandlers.handleRemoveSymbolContext(args));
    this.register('cleanup_old_context_data', (args) => this.mcpHandlers.handleCleanupOldContextData(args));
    this.register('get_hierarchical_performance_metrics', (args) => this.mcpHandlers.handleGetHierarchicalPerformanceMetrics(args));
  }

  private register(name: string, handler: ToolHandler): void {
    if (this.handlers.has(name)) {
      throw new Error(`Handler already registered: ${name}`);
    }
    this.handlers.set(name, handler);
  }

  private validateRegistration(): void {
    const toolCount = getToolCount();
    const handlerCount = this.handlers.size;

    if (toolCount !== handlerCount) {
      const extraHandlers: string[] = [];

      // Find tools without handlers
      this.handlers.forEach((_, toolName) => {
        if (!hasTool(toolName)) {
          extraHandlers.push(toolName);
        }
      });

      console.warn(`⚠️ Tool/Handler count mismatch: ${toolCount} tools vs ${handlerCount} handlers`);
      if (extraHandlers.length > 0) {
        console.warn(`Extra handlers (no corresponding tool): ${extraHandlers.join(', ')}`);
      }
    } else {
      console.log(`✅ Handler Registry validated: ${handlerCount} handlers registered`);
    }
  }

  getHandler(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }

  getHandlerCount(): number {
    return this.handlers.size;
  }

  getAllHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  getRegistryStats() {
    return {
      totalHandlers: this.handlers.size,
      toolsWithoutHandlers: [], // Would need tool iteration to implement
      handlersWithoutTools: [], // Would need tool iteration to implement
    };
  }
}
