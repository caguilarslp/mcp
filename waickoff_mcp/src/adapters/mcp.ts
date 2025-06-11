/**
 * @fileoverview MCP Adapter - Model Context Protocol Integration (MODULAR v1.3.7)
 * @description Adapter layer between MCP Server and Core Engine with complete modular handlers
 * @version 1.3.7
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { MarketAnalysisEngine } from '../core/engine.js';
import { MCPServerResponse } from '../types/index.js';
import { FileLogger } from '../utils/fileLogger.js';
import { MCPHandlers } from './mcp-handlers.js';
import * as path from 'path';

export class MCPAdapter {
  private server: Server;
  private engine: MarketAnalysisEngine;
  private logger: FileLogger;
  private handlers: MCPHandlers;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('MCPAdapter', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    
    // Initialize modular handlers
    this.handlers = new MCPHandlers(engine);
    
    this.server = new Server(
      {
        name: 'waickoff_mcp',
        version: '1.3.7',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info('MCP Adapter initialized with modular handler architecture v1.3.7');
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_ticker',
            description: 'Get current price and 24h statistics for a trading pair',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair (e.g., BTCUSDT, XRPUSDT)',
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_orderbook',
            description: 'Get order book depth for market analysis',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
                limit: {
                  type: 'number',
                  description: 'Number of orderbook levels',
                  default: 25,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_market_data',
            description: 'Get comprehensive market data (ticker + orderbook + recent klines)',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'analyze_volatility',
            description: 'Analyze price volatility for grid trading timing',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                period: {
                  type: 'string',
                  description: 'Analysis period',
                  enum: ['1h', '4h', '1d', '7d'],
                  default: '1d',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'analyze_volume',
            description: 'Analyze volume patterns with VWAP and anomaly detection',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                interval: {
                  type: 'string',
                  description: 'Time interval',
                  enum: ['1', '5', '15', '30', '60', '240', 'D'],
                  default: '60',
                },
                periods: {
                  type: 'number',
                  description: 'Number of periods to analyze',
                  default: 24,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'analyze_volume_delta',
            description: 'Calculate Volume Delta (buying vs selling pressure)',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                interval: {
                  type: 'string',
                  description: 'Time interval',
                  enum: ['1', '5', '15', '30', '60'],
                  default: '5',
                },
                periods: {
                  type: 'number',
                  description: 'Number of periods',
                  default: 60,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'identify_support_resistance',
            description: 'Identify dynamic support and resistance levels with strength scoring',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                interval: {
                  type: 'string',
                  description: 'Time interval for analysis',
                  enum: ['15', '30', '60', '240', 'D'],
                  default: '60',
                },
                periods: {
                  type: 'number',
                  description: 'Number of periods to analyze',
                  default: 100,
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
                sensitivity: {
                  type: 'number',
                  description: 'Pivot detection sensitivity (1-5, where 1 is more sensitive)',
                  default: 2,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'suggest_grid_levels',
            description: 'Generate intelligent grid trading suggestions',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                investment: {
                  type: 'number',
                  description: 'Amount to invest in USD',
                },
                gridCount: {
                  type: 'number',
                  description: 'Number of grid levels',
                  default: 10,
                },
                category: {
                  type: 'string',
                  description: 'Market category',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
                riskTolerance: {
                  type: 'string',
                  description: 'Risk tolerance level',
                  enum: ['low', 'medium', 'high'],
                  default: 'medium',
                },
                optimize: {
                  type: 'boolean',
                  description: 'Use advanced optimization',
                  default: false,
                },
              },
              required: ['symbol', 'investment'],
            },
          },
          {
            name: 'perform_technical_analysis',
            description: 'Comprehensive technical analysis including all indicators',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                includeVolatility: {
                  type: 'boolean',
                  description: 'Include volatility analysis',
                  default: true,
                },
                includeVolume: {
                  type: 'boolean',
                  description: 'Include volume analysis',
                  default: true,
                },
                includeVolumeDelta: {
                  type: 'boolean',
                  description: 'Include volume delta analysis',
                  default: true,
                },
                includeSupportResistance: {
                  type: 'boolean',
                  description: 'Include support/resistance analysis',
                  default: true,
                },
                timeframe: {
                  type: 'string',
                  description: 'Analysis timeframe',
                  default: '60',
                },
                periods: {
                  type: 'number',
                  description: 'Number of periods to analyze',
                  default: 100,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_complete_analysis',
            description: 'Complete market analysis with summary and recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                investment: {
                  type: 'number',
                  description: 'Optional investment amount for grid suggestions',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_system_health',
            description: 'Get system health status and performance metrics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_debug_logs',
            description: 'Get debug logs for troubleshooting JSON errors and request issues',
            inputSchema: {
              type: 'object',
              properties: {
                logType: {
                  type: 'string',
                  description: 'Type of logs to retrieve',
                  enum: ['all', 'errors', 'json_errors', 'requests'],
                  default: 'all',
                },
                limit: {
                  type: 'number',
                  description: 'Number of log entries to return',
                  default: 50,
                },
              },
            },
          },
          {
            name: 'get_analysis_history',
            description: 'Get saved analysis history for a symbol',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair to get history for',
                },
                limit: {
                  type: 'number',
                  description: 'Number of historical analyses to return',
                  default: 10,
                },
                analysisType: {
                  type: 'string',
                  description: 'Filter by analysis type',
                  enum: ['technical_analysis', 'complete_analysis'],
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'test_storage',
            description: 'Test storage system functionality',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Test operation to perform',
                  enum: ['save_test', 'load_test', 'query_test', 'stats'],
                  default: 'save_test',
                },
              },
            },
          },
          {
            name: 'get_cache_stats',
            description: 'Get cache performance statistics and metrics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'clear_cache',
            description: 'Clear all cached market data',
            inputSchema: {
              type: 'object',
              properties: {
                confirm: {
                  type: 'boolean',
                  description: 'Confirm cache clearing operation',
                  default: false,
                },
              },
            },
          },
          {
            name: 'invalidate_cache',
            description: 'Invalidate cache entries for a specific symbol',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair to invalidate cache for',
                },
                category: {
                  type: 'string',
                  description: 'Optional market category filter',
                  enum: ['spot', 'linear', 'inverse'],
                },
              },
              required: ['symbol'],
            },
          },
          // Analysis Repository Tools (TASK-009 FASE 3)
          {
            name: 'get_analysis_by_id',
            description: 'Get a specific analysis by its ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Analysis ID (UUID)',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'get_latest_analysis',
            description: 'Get the latest analysis for a symbol and type',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                type: {
                  type: 'string',
                  description: 'Analysis type',
                  enum: ['technical_analysis', 'complete_analysis', 'support_resistance', 'volume_analysis', 'volume_delta', 'grid_suggestion', 'volatility', 'pattern_detection'],
                },
              },
              required: ['symbol', 'type'],
            },
          },
          {
            name: 'search_analyses',
            description: 'Search analyses with complex query',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair filter',
                },
                type: {
                  type: 'string',
                  description: 'Analysis type filter',
                  enum: ['technical_analysis', 'complete_analysis', 'support_resistance', 'volume_analysis', 'volume_delta', 'grid_suggestion', 'volatility', 'pattern_detection'],
                },
                dateFrom: {
                  type: 'string',
                  description: 'Start date (ISO format)',
                },
                dateTo: {
                  type: 'string',
                  description: 'End date (ISO format)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum results',
                  default: 100,
                },
                orderBy: {
                  type: 'string',
                  description: 'Sort field',
                  enum: ['timestamp', 'confidence', 'price'],
                  default: 'timestamp',
                },
                orderDirection: {
                  type: 'string',
                  description: 'Sort direction',
                  enum: ['asc', 'desc'],
                  default: 'desc',
                },
              },
            },
          },
          {
            name: 'get_analysis_summary',
            description: 'Get analysis summary for a symbol over a period',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                period: {
                  type: 'string',
                  description: 'Summary period',
                  enum: ['1h', '4h', '1d', '1w', '1m'],
                  default: '1d',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_aggregated_metrics',
            description: 'Get aggregated metrics for a specific indicator',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                metric: {
                  type: 'string',
                  description: 'Metric path (e.g., volatility.volatilityPercent)',
                },
                period: {
                  type: 'string',
                  description: 'Aggregation period',
                  enum: ['1h', '4h', '1d', '1w', '1m'],
                },
              },
              required: ['symbol', 'metric', 'period'],
            },
          },
          {
            name: 'find_patterns',
            description: 'Find detected patterns based on criteria',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Pattern type',
                },
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                minConfidence: {
                  type: 'number',
                  description: 'Minimum confidence score (0-100)',
                },
                dateFrom: {
                  type: 'string',
                  description: 'Start date (ISO format)',
                },
                dateTo: {
                  type: 'string',
                  description: 'End date (ISO format)',
                },
              },
            },
          },
          {
            name: 'get_repository_stats',
            description: 'Get repository statistics and storage usage',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          // Report Generator Tools (TASK-009 FASE 4)
          {
            name: 'generate_report',
            description: 'Generate a comprehensive report based on analysis data',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Report type',
                  enum: ['daily', 'weekly', 'symbol', 'performance', 'patterns', 'custom'],
                },
                format: {
                  type: 'string',
                  description: 'Output format',
                  enum: ['markdown', 'json', 'html'],
                  default: 'markdown',
                },
                symbol: {
                  type: 'string',
                  description: 'Trading pair (for symbol reports)',
                },
                symbols: {
                  type: 'array',
                  description: 'Multiple trading pairs',
                  items: { type: 'string' },
                },
                dateFrom: {
                  type: 'string',
                  description: 'Start date (ISO format)',
                },
                dateTo: {
                  type: 'string',
                  description: 'End date (ISO format)',
                },
                includeCharts: {
                  type: 'boolean',
                  description: 'Include chart data',
                  default: true,
                },
                includePatterns: {
                  type: 'boolean',
                  description: 'Include pattern analysis',
                  default: true,
                },
              },
              required: ['type'],
            },
          },
          {
            name: 'generate_daily_report',
            description: 'Generate a daily market analysis report',
            inputSchema: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  description: 'Date for report (ISO format, defaults to today)',
                },
              },
            },
          },
          {
            name: 'generate_weekly_report',
            description: 'Generate a weekly market analysis report',
            inputSchema: {
              type: 'object',
              properties: {
                weekStartDate: {
                  type: 'string',
                  description: 'Start date of the week (ISO format)',
                },
              },
            },
          },
          {
            name: 'generate_symbol_report',
            description: 'Generate a detailed report for a specific symbol',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Trading pair',
                },
                period: {
                  type: 'string',
                  description: 'Analysis period',
                  enum: ['1h', '4h', '1d', '1w', '1m'],
                  default: '1d',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'generate_performance_report',
            description: 'Generate a performance analysis report',
            inputSchema: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  description: 'Performance period',
                  enum: ['1h', '4h', '1d', '1w', '1m'],
                  default: '1w',
                },
              },
            },
          },
          {
            name: 'get_report',
            description: 'Retrieve a previously generated report by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Report ID',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'list_reports',
            description: 'List available reports',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Filter by report type',
                  enum: ['daily', 'weekly', 'symbol', 'performance', 'patterns', 'custom'],
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of reports to return',
                  default: 10,
                },
              },
            },
          },
          {
            name: 'export_report',
            description: 'Export a report to a file',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Report ID',
                },
                outputPath: {
                  type: 'string',
                  description: 'Output file path',
                },
              },
              required: ['id', 'outputPath'],
            },
          },
          // Configuration Tools (TASK-010)
          {
            name: 'get_user_config',
            description: 'Get current user configuration including timezone settings',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'set_user_timezone',
            description: 'Set user timezone preference',
            inputSchema: {
              type: 'object',
              properties: {
                timezone: {
                  type: 'string',
                  description: 'Timezone identifier (e.g., America/New_York, Europe/London)',
                },
                autoDetect: {
                  type: 'boolean',
                  description: 'Enable automatic timezone detection',
                  default: false,
                },
              },
              required: ['timezone'],
            },
          },
          {
            name: 'detect_timezone',
            description: 'Auto-detect system timezone using multiple detection methods',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'update_config',
            description: 'Update multiple configuration sections',
            inputSchema: {
              type: 'object',
              properties: {
                timezone: {
                  type: 'object',
                  description: 'Timezone configuration updates',
                  properties: {
                    default: { type: 'string' },
                    autoDetect: { type: 'boolean' },
                    preferredSessions: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                },
                trading: {
                  type: 'object',
                  description: 'Trading configuration updates',
                  properties: {
                    defaultTimeframe: { type: 'string' },
                    alertTimes: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                },
                display: {
                  type: 'object',
                  description: 'Display configuration updates',
                  properties: {
                    dateFormat: { type: 'string' },
                    use24Hour: { type: 'boolean' },
                    locale: { type: 'string' }
                  }
                }
              }
            },
          },
          {
            name: 'reset_config',
            description: 'Reset configuration to defaults with auto-detection',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'validate_config',
            description: 'Validate current configuration and get suggestions',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_config_info',
            description: 'Get configuration file information and supported options',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool execution using modular handlers
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      this.logger.info(`Executing tool: ${name} (via modular handlers v1.3.7)`);
      
      try {
        let result: MCPServerResponse;
        
        // Route to appropriate handler method
        switch (name) {
          // Market Data Tools
          case 'get_ticker':
            result = await this.handlers.handleGetTicker(args);
            break;
          case 'get_orderbook':
            result = await this.handlers.handleGetOrderbook(args);
            break;
          case 'get_market_data':
            result = await this.handlers.handleGetMarketData(args);
            break;
          
          // Analysis Tools
          case 'analyze_volatility':
            result = await this.handlers.handleAnalyzeVolatility(args);
            break;
          case 'analyze_volume':
            result = await this.handlers.handleAnalyzeVolume(args);
            break;
          case 'analyze_volume_delta':
            result = await this.handlers.handleAnalyzeVolumeDelta(args);
            break;
          case 'identify_support_resistance':
            result = await this.handlers.handleIdentifySupportResistance(args);
            break;
          case 'suggest_grid_levels':
            result = await this.handlers.handleSuggestGridLevels(args);
            break;
          case 'perform_technical_analysis':
            result = await this.handlers.handlePerformTechnicalAnalysis(args);
            break;
          case 'get_complete_analysis':
            result = await this.handlers.handleGetCompleteAnalysis(args);
            break;
          
          // System Tools
          case 'get_system_health':
            result = await this.handlers.handleGetSystemHealth(args);
            break;
          case 'get_debug_logs':
            result = await this.handlers.handleGetDebugLogs(args);
            break;
          case 'get_analysis_history':
            result = await this.handlers.handleGetAnalysisHistory(args);
            break;
          case 'test_storage':
            result = await this.handlers.handleTestStorage(args);
            break;
          
          // Cache Tools
          case 'get_cache_stats':
            result = await this.handlers.handleGetCacheStats(args);
            break;
          case 'clear_cache':
            result = await this.handlers.handleClearCache(args);
            break;
          case 'invalidate_cache':
            result = await this.handlers.handleInvalidateCache(args);
            break;
          
          // Analysis Repository Tools (TASK-009 FASE 3)
          case 'get_analysis_by_id':
            result = await this.handlers.handleGetAnalysisById(args);
            break;
          case 'get_latest_analysis':
            result = await this.handlers.handleGetLatestAnalysis(args);
            break;
          case 'search_analyses':
            result = await this.handlers.handleSearchAnalyses(args);
            break;
          case 'get_analysis_summary':
            result = await this.handlers.handleGetAnalysisSummary(args);
            break;
          case 'get_aggregated_metrics':
            result = await this.handlers.handleGetAggregatedMetrics(args);
            break;
          case 'find_patterns':
            result = await this.handlers.handleFindPatterns(args);
            break;
          case 'get_repository_stats':
            result = await this.handlers.handleGetRepositoryStats(args);
            break;
          
          // Report Generator Tools (TASK-009 FASE 4)
          case 'generate_report':
            result = await this.handlers.handleGenerateReport(args);
            break;
          case 'generate_daily_report':
            result = await this.handlers.handleGenerateDailyReport(args);
            break;
          case 'generate_weekly_report':
            result = await this.handlers.handleGenerateWeeklyReport(args);
            break;
          case 'generate_symbol_report':
            result = await this.handlers.handleGenerateSymbolReport(args);
            break;
          case 'generate_performance_report':
            result = await this.handlers.handleGeneratePerformanceReport(args);
            break;
          case 'get_report':
            result = await this.handlers.handleGetReport(args);
            break;
          case 'list_reports':
            result = await this.handlers.handleListReports(args);
            break;
          case 'export_report':
            result = await this.handlers.handleExportReport(args);
            break;
          
          // Configuration Tools (TASK-010)
          case 'get_user_config':
            result = await this.handlers.handleGetUserConfig(args);
            break;
          case 'set_user_timezone':
            result = await this.handlers.handleSetUserTimezone(args);
            break;
          case 'detect_timezone':
            result = await this.handlers.handleDetectTimezone(args);
            break;
          case 'update_config':
            result = await this.handlers.handleUpdateConfig(args);
            break;
          case 'reset_config':
            result = await this.handlers.handleResetConfig(args);
            break;
          case 'validate_config':
            result = await this.handlers.handleValidateConfig(args);
            break;
          case 'get_config_info':
            result = await this.handlers.handleGetConfigInfo(args);
            break;
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return result;
      } catch (error) {
        this.logger.error(`Tool execution failed for ${name}:`, error);
        return this.createErrorResponse(name, error as Error);
      }
    });
  }

  // ====================
  // HELPER METHODS
  // ====================

  private createErrorResponse(toolName: string, error: Error): MCPServerResponse {
    this.logger.error(`Tool ${toolName} failed:`, error);
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error.message}`
      }]
    };
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('MCP Adapter running with modular handler architecture v1.3.7');
  }
}
