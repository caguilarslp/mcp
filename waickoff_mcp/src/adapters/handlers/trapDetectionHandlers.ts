/**
 * @fileoverview Trap Detection Handlers for MCP Integration
 * @description Specialized handlers for bull/bear trap detection tools
 * @version 1.0.0
 * @author wAIckoff MCP Team
 */

import type {
  ITrapDetectionService,
  TrapDetectionResult,
  TrapEvent,
  TrapStatistics,
  TrapConfig,
  MCPServerResponse,
  PerformanceMetrics
} from '../../types/index.js';
import { Logger } from '../../utils/logger.js';

/**
 * TrapDetectionHandlers - MCP handlers for trap detection functionality
 */
export class TrapDetectionHandlers {
  private readonly logger: Logger;

  constructor(private trapDetectionService: ITrapDetectionService) {
    this.logger = new Logger('TrapDetectionHandlers');
  }

  /**
   * Handle detect_bull_trap MCP tool
   */
  async handleDetectBullTrap(args: any): Promise<MCPServerResponse> {
    try {
      const { symbol, sensitivity = 'medium' } = args;
      
      if (!symbol || typeof symbol !== 'string') {
        return this.formatErrorResponse('Symbol is required and must be a string');
      }

      if (!['low', 'medium', 'high'].includes(sensitivity)) {
        return this.formatErrorResponse('Sensitivity must be low, medium, or high');
      }

      this.logger.info(`Detecting bull trap for ${symbol} with ${sensitivity} sensitivity`);
      
      const result = await this.trapDetectionService.detectBullTrap(symbol, sensitivity);
      
      return this.formatSuccessResponse({
        symbol,
        hasBullTrap: result.hasTrap,
        analysis: result.analysis,
        breakoutContext: result.breakoutContext,
        nextAnalysisTime: result.nextAnalysisTime,
        summary: this.generateTrapSummary(result),
        recommendations: this.generateRecommendations(result),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error in handleDetectBullTrap:', error);
      return this.formatErrorResponse(`Failed to detect bull trap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle detect_bear_trap MCP tool
   */
  async handleDetectBearTrap(args: any): Promise<MCPServerResponse> {
    try {
      const { symbol, sensitivity = 'medium' } = args;
      
      if (!symbol || typeof symbol !== 'string') {
        return this.formatErrorResponse('Symbol is required and must be a string');
      }

      if (!['low', 'medium', 'high'].includes(sensitivity)) {
        return this.formatErrorResponse('Sensitivity must be low, medium, or high');
      }

      this.logger.info(`Detecting bear trap for ${symbol} with ${sensitivity} sensitivity`);
      
      const result = await this.trapDetectionService.detectBearTrap(symbol, sensitivity);
      
      return this.formatSuccessResponse({
        symbol,
        hasBearTrap: result.hasTrap,
        analysis: result.analysis,
        breakoutContext: result.breakoutContext,
        nextAnalysisTime: result.nextAnalysisTime,
        summary: this.generateTrapSummary(result),
        recommendations: this.generateRecommendations(result),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error in handleDetectBearTrap:', error);
      return this.formatErrorResponse(`Failed to detect bear trap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle get_trap_history MCP tool
   */
  async handleGetTrapHistory(args: any): Promise<MCPServerResponse> {
    try {
      const { symbol, days = 30, trapType = 'both' } = args;
      
      if (!symbol || typeof symbol !== 'string') {
        return this.formatErrorResponse('Symbol is required and must be a string');
      }

      if (typeof days !== 'number' || days <= 0 || days > 365) {
        return this.formatErrorResponse('Days must be a number between 1 and 365');
      }

      if (!['bull', 'bear', 'both'].includes(trapType)) {
        return this.formatErrorResponse('trapType must be bull, bear, or both');
      }

      this.logger.info(`Getting trap history for ${symbol} (${days} days, type: ${trapType})`);
      
      const history = await this.trapDetectionService.getTrapHistory(symbol, days, trapType);
      
      return this.formatSuccessResponse({
        symbol,
        days,
        trapType,
        totalTraps: history.length,
        bullTraps: history.filter(t => t.trapType === 'bull_trap').length,
        bearTraps: history.filter(t => t.trapType === 'bear_trap').length,
        history: history.map(trap => ({
          ...trap,
          humanReadable: this.formatTrapEvent(trap)
        })),
        summary: this.generateHistorySummary(history),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error in handleGetTrapHistory:', error);
      return this.formatErrorResponse(`Failed to get trap history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle get_trap_statistics MCP tool
   */
  async handleGetTrapStatistics(args: any): Promise<MCPServerResponse> {
    try {
      const { symbol, period = '30d' } = args;
      
      if (!symbol || typeof symbol !== 'string') {
        return this.formatErrorResponse('Symbol is required and must be a string');
      }

      if (!['7d', '30d', '90d', '1y'].includes(period)) {
        return this.formatErrorResponse('Period must be 7d, 30d, 90d, or 1y');
      }

      this.logger.info(`Getting trap statistics for ${symbol} (period: ${period})`);
      
      const stats = await this.trapDetectionService.getTrapStatistics(symbol, period);
      
      return this.formatSuccessResponse({
        ...stats,
        humanReadable: this.formatStatistics(stats),
        recommendations: this.generateStatisticsRecommendations(stats),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error in handleGetTrapStatistics:', error);
      return this.formatErrorResponse(`Failed to get trap statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle configure_trap_detection MCP tool
   */
  async handleConfigureTrapDetection(args: any): Promise<MCPServerResponse> {
    try {
      const config = args || {};
      
      this.logger.info('Configuring trap detection with:', config);
      
      const newConfig = await this.trapDetectionService.configureTrapDetection(config);
      
      return this.formatSuccessResponse({
        configuration: newConfig,
        message: 'Trap detection configuration updated successfully',
        explanation: this.explainConfiguration(newConfig),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error in handleConfigureTrapDetection:', error);
      return this.formatErrorResponse(`Failed to configure trap detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle validate_breakout MCP tool
   */
  async handleValidateBreakout(args: any): Promise<MCPServerResponse> {
    try {
      const { symbol } = args;
      
      if (!symbol || typeof symbol !== 'string') {
        return this.formatErrorResponse('Symbol is required and must be a string');
      }

      this.logger.info(`Validating breakout for ${symbol}`);
      
      const breakoutContext = await this.trapDetectionService.validateBreakout(symbol);
      
      return this.formatSuccessResponse({
        symbol,
        hasBreakout: !!breakoutContext,
        breakoutContext,
        analysis: breakoutContext ? this.analyzeBreakoutContext(breakoutContext) : null,
        recommendations: breakoutContext ? this.generateBreakoutRecommendations(breakoutContext) : ['No active breakout detected'],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error in handleValidateBreakout:', error);
      return this.formatErrorResponse(`Failed to validate breakout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle get_trap_performance MCP tool
   */
  async handleGetTrapPerformance(args: any): Promise<MCPServerResponse> {
    try {
      this.logger.info('Getting trap detection performance metrics');
      
      const metrics = this.trapDetectionService.getPerformanceMetrics();
      
      return this.formatSuccessResponse({
        performanceMetrics: metrics,
        summary: this.formatPerformanceMetrics(metrics),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error in handleGetTrapPerformance:', error);
      return this.formatErrorResponse(`Failed to get performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private formatSuccessResponse(data: any): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          data
        }, null, 2)
      }]
    };
  }

  private formatErrorResponse(error: string): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  private generateTrapSummary(result: TrapDetectionResult): string {
    if (!result.hasTrap || !result.analysis) {
      return `No ${result.breakoutContext.breakoutDirection === 'up' ? 'bull' : 'bear'} trap detected for ${result.breakoutContext.symbol}`;
    }

    const analysis = result.analysis;
    const direction = analysis.trapType === 'bull_trap' ? 'upward' : 'downward';
    const strength = analysis.riskLevel.toLowerCase();
    
    return `${strength.toUpperCase()} ${analysis.trapType.replace('_', ' ')} detected! ` +
           `${analysis.probability.toFixed(0)}% probability of false ${direction} breakout. ` +
           `Key level: $${analysis.keyLevel.toFixed(2)}. Expected timeframe: ${analysis.timeWindow}.`;
  }

  private generateRecommendations(result: TrapDetectionResult): string[] {
    if (!result.hasTrap || !result.analysis) {
      return ['Continue monitoring for potential breakouts'];
    }

    const analysis = result.analysis;
    const recommendations: string[] = [];

    if (analysis.trapType === 'bull_trap') {
      recommendations.push(`🔴 Avoid long positions above $${analysis.keyLevel.toFixed(2)}`);
      recommendations.push(`🎯 Watch for price return to $${analysis.priceTargets[0].toFixed(2)}`);
      recommendations.push(`⏰ Monitor closely for next ${analysis.timeWindow}`);
      if (analysis.probability > 80) {
        recommendations.push(`🚨 HIGH CONFIDENCE: Consider short position with tight stop`);
      }
    } else {
      recommendations.push(`🟢 Avoid short positions below $${analysis.keyLevel.toFixed(2)}`);
      recommendations.push(`🎯 Watch for price recovery to $${analysis.priceTargets[0].toFixed(2)}`);
      recommendations.push(`⏰ Monitor recovery within ${analysis.timeWindow}`);
      if (analysis.probability > 80) {
        recommendations.push(`🚨 HIGH CONFIDENCE: Consider long position with tight stop`);
      }
    }

    return recommendations;
  }

  private formatTrapEvent(trap: TrapEvent): string {
    const direction = trap.trapType === 'bull_trap' ? 'upward' : 'downward';
    const result = trap.outcome.finalResult.replace('_', ' ');
    
    return `${trap.trapType.replace('_', ' ')} on ${new Date(trap.detectedAt).toLocaleString()} - ` +
           `${direction} breakout at $${trap.breakoutPrice.toFixed(2)} ` +
           `(${result}, ${trap.actualTimeWindow}min duration)`;
  }

  private generateHistorySummary(history: TrapEvent[]): string {
    if (history.length === 0) {
      return 'No trap events found in the specified period';
    }

    const confirmed = history.filter(t => t.outcome.finalResult === 'confirmed_trap').length;
    const accuracy = (confirmed / history.length * 100).toFixed(1);
    
    return `${history.length} trap events analyzed with ${accuracy}% accuracy. ` +
           `Average duration: ${Math.round(history.reduce((sum, t) => sum + t.actualTimeWindow, 0) / history.length)} minutes.`;
  }

  private formatStatistics(stats: TrapStatistics): string {
    return `${stats.symbol} trap statistics (${stats.period}): ` +
           `${stats.totalTrapsDetected} total traps detected with ${stats.accuracy.toFixed(1)}% accuracy. ` +
           `${stats.bullTraps} bull traps, ${stats.bearTraps} bear traps. ` +
           `Average detection time: ${stats.avgDetectionTime} minutes.`;
  }

  private generateStatisticsRecommendations(stats: TrapStatistics): string[] {
    const recommendations: string[] = [];

    if (stats.accuracy < 60) {
      recommendations.push('⚠️ Low accuracy detected - consider adjusting sensitivity settings');
    } else if (stats.accuracy > 80) {
      recommendations.push('✅ High accuracy - current settings are working well');
    }

    if (stats.falsePositives > stats.totalTrapsDetected * 0.3) {
      recommendations.push('🔧 High false positive rate - consider stricter thresholds');
    }

    if (stats.avgDetectionTime > 60) {
      recommendations.push('⏱️ Slow detection times - consider optimizing analysis parameters');
    }

    return recommendations.length > 0 ? recommendations : ['📊 Statistics look healthy - continue current approach'];
  }

  private explainConfiguration(config: TrapConfig): string {
    return `Configuration set to ${config.sensitivity} sensitivity. ` +
           `Volume threshold: ${(config.volumeThreshold * 100).toFixed(0)}%, ` +
           `Orderbook depth ratio: ${(config.orderbookDepthRatio * 100).toFixed(0)}%, ` +
           `Analysis window: ${config.timeWindowMinutes} minutes, ` +
           `Minimum breakout: ${config.minimumBreakout}%, ` +
           `Confidence threshold: ${config.confidenceThreshold}%.`;
  }

  private analyzeBreakoutContext(context: any): string {
    const direction = context.breakoutDirection === 'up' ? 'bullish' : 'bearish';
    const volumeStatus = context.volumeAtBreakout > context.avgVolume ? 'above average' : 'below average';
    
    return `${direction.toUpperCase()} breakout detected at $${context.breakoutPrice.toFixed(2)} ` +
           `(${context.priceChange.toFixed(2)}% from key level). ` +
           `Volume: ${volumeStatus} (${(context.volumeAtBreakout / context.avgVolume * 100).toFixed(0)}% of average).`;
  }

  private generateBreakoutRecommendations(context: any): string[] {
    const recommendations: string[] = [];
    
    if (context.breakoutDirection === 'up') {
      recommendations.push(`📈 Upward breakout above $${context.level.level.toFixed(2)}`);
      if (context.volumeAtBreakout > context.avgVolume * 1.2) {
        recommendations.push('✅ Strong volume confirmation');
      } else {
        recommendations.push('⚠️ Weak volume - watch for potential bull trap');
      }
    } else {
      recommendations.push(`📉 Downward breakout below $${context.level.level.toFixed(2)}`);
      if (context.volumeAtBreakout > context.avgVolume * 1.2) {
        recommendations.push('✅ Strong volume confirmation');
      } else {
        recommendations.push('⚠️ Weak volume - watch for potential bear trap');
      }
    }

    recommendations.push(`🎯 Key level strength: ${context.level.confidence}`);
    recommendations.push(`⏰ Monitor for next 15-60 minutes for trap signals`);

    return recommendations;
  }

  private formatPerformanceMetrics(metrics: PerformanceMetrics[]): string {
    if (metrics.length === 0) {
      return 'No performance metrics available';
    }

    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    const successRate = (metrics.filter(m => m.success).length / metrics.length * 100).toFixed(1);
    
    return `Average execution time: ${avgExecutionTime.toFixed(0)}ms, ` +
           `Success rate: ${successRate}%, ` +
           `Total operations: ${metrics.length}`;
  }
}
