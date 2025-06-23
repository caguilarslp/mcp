/**
 * @fileoverview System Handlers - System health, debug logs, and diagnostics
 * @description Handles system monitoring, debugging, and diagnostic operations
 * @version 1.0.0
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';
import { JsonParseAttempt } from '../../utils/requestLogger.js';

export class SystemHandlers {
  constructor(
    private readonly engine: MarketAnalysisEngine,
    private readonly logger: FileLogger
  ) {}

  async handleGetSystemHealth(args: any): Promise<MCPServerResponse> {
    const health = await this.engine.getSystemHealth();
    const metrics = this.engine.getPerformanceMetrics();

    const formattedHealth = {
      system_status: health.status.toUpperCase(),
      version: health.version,
      uptime: `${Math.round(health.uptime / 3600)} hours`,
      services: {
        market_data: health.services.marketData ? 'ONLINE' : 'OFFLINE',
        analysis: health.services.analysis ? 'ONLINE' : 'OFFLINE',
        trading: health.services.trading ? 'ONLINE' : 'OFFLINE'
      },
      performance: {
        total_requests: metrics.engine.length,
        avg_response_time: metrics.engine.length > 0 ? 
          `${(metrics.engine.reduce((sum, m) => sum + m.executionTime, 0) / metrics.engine.length).toFixed(0)}ms` : '0ms',
        success_rate: metrics.engine.length > 0 ? 
          `${((metrics.engine.filter(m => m.success).length / metrics.engine.length) * 100).toFixed(1)}%` : '100%'
      }
    };

    return this.createSuccessResponse(formattedHealth);
  }

  async handleGetDebugLogs(args: any): Promise<MCPServerResponse> {
    const logType = (args?.logType as string) || 'all';
    const limit = (args?.limit as number) || 50;
    
    try {
      // Import the request logger dynamically to avoid circular imports
      const { requestLogger } = await import('../../utils/requestLogger.js');
      
      let logs: any[] = [];
      let logSummary: any = {
        logType,
        timestamp: new Date().toISOString(),
        totalEntries: 0
      };

      switch (logType) {
        case 'json_errors':
          logs = await requestLogger.getJsonErrorLogs();
          logSummary.description = 'JSON parsing error logs';
          logSummary.totalEntries = logs.length;
          break;
          
        case 'requests':
          logs = await requestLogger.getRecentLogs(limit);
          logSummary.description = 'Recent API request logs';
          logSummary.totalEntries = logs.length;
          break;
          
        case 'errors':
          const allLogs = await requestLogger.getRecentLogs(200);
          logs = allLogs.filter((log: any) => log.error || 
            (log.jsonParseAttempts && log.jsonParseAttempts.some((attempt: JsonParseAttempt) => attempt.error)));
          logSummary.description = 'Error logs (HTTP errors and JSON parse errors)';
          logSummary.totalEntries = logs.length;
          break;
          
        case 'all':
        default:
          logs = await requestLogger.getRecentLogs(limit);
          logSummary.description = 'All recent logs';
          logSummary.totalEntries = logs.length;
          break;
      }

      // Get application logs from the engine's logger
      const engineLogs = this.logger.getLogs(undefined, 20);
      
      // Get comprehensive system info with proper JSON serialization
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.round(process.uptime()),
        memoryUsage: {
          rss: process.memoryUsage().rss,
          heapTotal: process.memoryUsage().heapTotal,
          heapUsed: process.memoryUsage().heapUsed,
          external: process.memoryUsage().external,
          arrayBuffers: process.memoryUsage().arrayBuffers
        },
        timestamp: new Date().toISOString()
      };
      
      // Get file logger info
      const fileLoggerInfo = (this.logger as any).getLogFileInfo ? 
        (this.logger as any).getLogFileInfo() : 
        { info: 'FileLogger info not available' };

      const formattedLogs = {
        summary: logSummary,
        system_info: systemInfo,
        file_logger_info: fileLoggerInfo,
        api_requests: logs.slice(-Math.min(limit, 25)).map(log => ({
          requestId: log.requestId,
          timestamp: log.timestamp,
          method: log.method,
          url: log.url ? log.url.replace('https://api.bybit.com', '') : 'Unknown',
          status: log.responseStatus || 'Pending',
          error: log.error || null,
          duration: log.duration ? `${log.duration}ms` : null,
          jsonErrors: log.jsonParseAttempts ? 
            log.jsonParseAttempts.filter((attempt: JsonParseAttempt) => attempt.error).length : 0,
          jsonErrorDetails: log.jsonParseAttempts ? 
            log.jsonParseAttempts.filter((attempt: JsonParseAttempt) => attempt.error).map((attempt: JsonParseAttempt) => ({
              attempt: attempt.attempt,
              error: attempt.error,
              errorPosition: attempt.errorPosition,
              context: attempt.context,
              dataPreview: attempt.rawData.substring(0, 50)
            })) : []
        })),
        application_logs: engineLogs.map(log => ({
          timestamp: log.timestamp,
          level: log.level.toUpperCase(),
          service: log.service,
          message: log.message,
          data: log.data,
          error: log.error ? log.error.message : null
        })),
        troubleshooting_info: {
          common_json_errors: [
            {
              error: "Expected ',' or ']' after array element in JSON at position 5",
              likely_cause: "MCP SDK startup issue (known issue) - happens during handshake",
              resolution: "Error is suppressed in logger, doesn't affect functionality. This is a timing issue during MCP initialization.",
              frequency: "High during startup, then stops",
              impact: "None - purely cosmetic"
            },
            {
              error: "Unexpected end of JSON input",
              likely_cause: "Truncated API response from Bybit or network timeout",
              resolution: "Check network connection, API rate limits, and response size",
              frequency: "Occasional",
              impact: "Medium - affects specific API calls"
            },
            {
              error: "Unexpected token in JSON",
              likely_cause: "Malformed response from API or encoding issues",
              resolution: "Check API endpoint format and response headers",
              frequency: "Rare",
              impact: "Medium - affects specific API calls"
            },
            {
              error: "Response truncated at position X",
              likely_cause: "Network interruption or server-side truncation",
              resolution: "Implement retry logic or check server status",
              frequency: "Rare",
              impact: "High - data loss"
            }
          ],
          diagnostic_commands: [
            "Use 'get_debug_logs' with logType='json_errors' to see only JSON issues",
            "Use 'get_debug_logs' with logType='errors' to see all errors",
            "Check /logs directory for detailed file logs with stack traces",
            "Run health check to verify API connectivity"
          ],
          next_steps: [
            "1. Check if errors are repeating (pattern analysis)",
            "2. Verify network connectivity to api.bybit.com",
            "3. Check if specific endpoints are causing issues",
            "4. Review raw response data in jsonErrorDetails",
            "5. Check memory usage and system resources",
            "6. Review file logs for detailed stack traces"
          ],
          file_locations: {
            json_logs: `${process.cwd()}/logs/mcp-requests-YYYY-MM-DD.json`,
            application_logs: `${process.cwd()}/logs/mcp-YYYY-MM-DD.log`,
            rotated_logs: `${process.cwd()}/logs/mcp-YYYY-MM-DD.N.log`
          }
        }
      };

      return this.createSuccessResponse(formattedLogs);
    } catch (error) {
      this.logger.error('Failed to retrieve debug logs:', error);
      return this.createErrorResponse('get_debug_logs', error as Error);
    }
  }

  async handleGetAnalysisHistory(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const limit = (args?.limit as number) || 10;
    const analysisType = args?.analysisType as string;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getAnalysisHistory(symbol, limit, analysisType);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get analysis history');
    }

    const history = response.data!;
    
    const formattedHistory = {
      symbol,
      total_analyses: history.length,
      filter: analysisType || 'all',
      analyses: history.map(analysis => ({
        created: new Date(analysis.timestamp).toISOString(),
        type: analysis.analysisType,
        file: `analysis_${analysis.id}.json`,
        version: analysis.metadata?.version || 'unknown'
      }))
    };

    return this.createSuccessResponse(formattedHistory);
  }

  async handleTestStorage(args: any): Promise<MCPServerResponse> {
    const operation = (args?.operation as string) || 'save_test';

    try {
      const storageService = new (await import('../../services/storage.js')).StorageService();
      const testResults: any = {
        operation,
        timestamp: new Date().toISOString(),
        success: false,
        details: {}
      };

      switch (operation) {
        case 'save_test':
          const testData = {
            test: true,
            timestamp: Date.now(),
            message: 'Storage test successful'
          };
          await storageService.save('test/storage_test.json', testData);
          testResults.success = true;
          testResults.details.message = 'Test data saved successfully';
          testResults.details.path = 'test/storage_test.json';
          break;

        case 'load_test':
          const loadedData = await storageService.load('test/storage_test.json');
          testResults.success = loadedData !== null;
          testResults.details.loaded = loadedData;
          break;

        case 'query_test':
          const files = await storageService.query('test/*');
          testResults.success = true;
          testResults.details.files_found = files;
          testResults.details.count = files.length;
          break;

        case 'stats':
          const stats = await storageService.getStorageStats();
          testResults.success = true;
          testResults.details.stats = stats;
          break;

        default:
          throw new Error(`Unknown test operation: ${operation}`);
      }

      return this.createSuccessResponse(testResults);

    } catch (error) {
      this.logger.error('Storage test failed:', error);
      return this.createErrorResponse('test_storage', error as Error);
    }
  }

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
