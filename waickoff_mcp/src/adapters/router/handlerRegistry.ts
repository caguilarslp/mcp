/**
 * @fileoverview Handler Registry - Tool to Handler Mapping
 * @description Maps tool names to their corresponding handler methods with validation
 * @version 1.6.3
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
