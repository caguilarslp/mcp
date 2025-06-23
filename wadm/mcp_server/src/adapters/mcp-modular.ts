/**
 * @fileoverview MCP Adapter - Model Context Protocol Integration (MODULAR v1.3.7)
 * @description Lightweight adapter that delegates to specialized handlers
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
import * as path from 'path';

// Modular Handlers
import { CacheHandlers } from './cacheHandlers.js';
import { MarketDataHandlers } from './handlers/marketDataHandlers.js';
import { AnalysisRepositoryHandlers } from './handlers/analysisRepositoryHandlers.js';

export class MCPAdapter {
  private server: Server;
  private engine: MarketAnalysisEngine;
  private logger: FileLogger;
  
  // Specialized Handlers (Dependency Injection)
  private cacheHandlers: CacheHandlers;
  private marketDataHandlers: MarketDataHandlers;
  private analysisRepositoryHandlers: AnalysisRepositoryHandlers;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('MCPAdapter', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true
    });
    
    // Initialize specialized handlers
    this.cacheHandlers = new CacheHandlers(engine);
    this.marketDataHandlers = new MarketDataHandlers(engine, this.logger);
    this.analysisRepositoryHandlers = new AnalysisRepositoryHandlers(engine, this.logger);
    
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
    this.logger.info('MCP Adapter v1.3.7 initialized with modular handlers architecture');
  }

  private setupHandlers() {
    // List available tools (tools definition stays in main adapter for overview)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // MARKET DATA TOOLS
          {
            name: 'get_ticker',
            description: 'Get current price and 24h statistics for a trading pair',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: { type: 'string', description: 'Trading pair (e.g., BTCUSDT, XRPUSDT)' },
                category: { type: 'string', description: 'Market category', enum: ['spot', 'linear', 'inverse'], default: 'spot' },
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
                symbol: { type: 'string', description: 'Trading pair' },
                category: { type: 'string', description: 'Market category', enum: ['spot', 'linear', 'inverse'], default: 'spot' },
                limit: { type: 'number', description: 'Number of orderbook levels', default: 25 },
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
                symbol: { type: 'string', description: 'Trading pair' },
                category: { type: 'string', description: 'Market category', enum: ['spot', 'linear', 'inverse'], default: 'spot' },
              },
              required: ['symbol'],
            },
          },
          
          // ANALYSIS REPOSITORY TOOLS (TASK-009 FASE 3)
          {
            name: 'get_analysis_by_id',
            description: 'Get a specific analysis by its ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Analysis ID (UUID)' },
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
                symbol: { type: 'string', description: 'Trading pair' },
                type: { 
                  type: 'string', 
                  description: 'Analysis type',
                  enum: ['technical_analysis', 'complete_analysis', 'support_resistance', 'volume_analysis', 'volume_delta', 'grid_suggestion', 'volatility', 'pattern_detection']
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
                symbol: { type: 'string', description: 'Trading pair filter' },
                type: { 
                  type: 'string', 
                  description: 'Analysis type filter',
                  enum: ['technical_analysis', 'complete_analysis', 'support_resistance', 'volume_analysis', 'volume_delta', 'grid_suggestion', 'volatility', 'pattern_detection']
                },
                dateFrom: { type: 'string', description: 'Start date (ISO format)' },
                dateTo: { type: 'string', description: 'End date (ISO format)' },
                limit: { type: 'number', description: 'Maximum results', default: 100 },
                orderBy: { type: 'string', description: 'Sort field', enum: ['timestamp', 'confidence', 'price'], default: 'timestamp' },
                orderDirection: { type: 'string', description: 'Sort direction', enum: ['asc', 'desc'], default: 'desc' },
              },
            },
          },
          {
            name: 'get_analysis_summary',
            description: 'Get analysis summary for a symbol over a period',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: { type: 'string', description: 'Trading pair' },
                period: { type: 'string', description: 'Summary period', enum: ['1h', '4h', '1d', '1w', '1m'], default: '1d' },
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
                symbol: { type: 'string', description: 'Trading pair' },
                metric: { type: 'string', description: 'Metric path (e.g., volatility.volatilityPercent)' },
                period: { type: 'string', description: 'Aggregation period', enum: ['1h', '4h', '1d', '1w', '1m'] },
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
                type: { type: 'string', description: 'Pattern type' },
                symbol: { type: 'string', description: 'Trading pair' },
                minConfidence: { type: 'number', description: 'Minimum confidence score (0-100)' },
                dateFrom: { type: 'string', description: 'Start date (ISO format)' },
                dateTo: { type: 'string', description: 'End date (ISO format)' },
              },
            },
          },
          {
            name: 'get_repository_stats',
            description: 'Get repository statistics and storage usage',
            inputSchema: { type: 'object', properties: {} },
          },
          
          // CACHE MANAGEMENT TOOLS
          {
            name: 'get_cache_stats',
            description: 'Get cache performance statistics and metrics',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'clear_cache',
            description: 'Clear all cached market data',
            inputSchema: {
              type: 'object',
              properties: {
                confirm: { type: 'boolean', description: 'Confirm cache clearing operation', default: false },
              },
            },
          },
          {
            name: 'invalidate_cache',
            description: 'Invalidate cache entries for a specific symbol',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: { type: 'string', description: 'Trading pair to invalidate cache for' },
                category: { type: 'string', description: 'Optional market category filter', enum: ['spot', 'linear', 'inverse'] },
              },
              required: ['symbol'],
            },
          },
        ],
      };
    });

    // Handle tool execution (Delegation to specialized handlers)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      this.logger.info(`Executing tool: ${name}`);
      
      try {
        let result: MCPServerResponse;
        
        // Delegate to appropriate handler based on tool category
        switch (name) {
          // Market Data Tools → MarketDataHandlers
          case 'get_ticker':
            result = await this.marketDataHandlers.handleGetTicker(args);
            break;
          case 'get_orderbook':
            result = await this.marketDataHandlers.handleGetOrderbook(args);
            break;
          case 'get_market_data':
            result = await this.marketDataHandlers.handleGetMarketData(args);
            break;
            
          // Analysis Repository Tools → AnalysisRepositoryHandlers (TASK-009 FASE 3)
          case 'get_analysis_by_id':
            result = await this.analysisRepositoryHandlers.handleGetAnalysisById(args);
            break;
          case 'get_latest_analysis':
            result = await this.analysisRepositoryHandlers.handleGetLatestAnalysis(args);
            break;
          case 'search_analyses':
            result = await this.analysisRepositoryHandlers.handleSearchAnalyses(args);
            break;
          case 'get_analysis_summary':
            result = await this.analysisRepositoryHandlers.handleGetAnalysisSummary(args);
            break;
          case 'get_aggregated_metrics':
            result = await this.analysisRepositoryHandlers.handleGetAggregatedMetrics(args);
            break;
          case 'find_patterns':
            result = await this.analysisRepositoryHandlers.handleFindPatterns(args);
            break;
          case 'get_repository_stats':
            result = await this.analysisRepositoryHandlers.handleGetRepositoryStats(args);
            break;
            
          // Cache Management Tools → CacheHandlers
          case 'get_cache_stats':
            result = await this.cacheHandlers.handleGetCacheStats(args);
            break;
          case 'clear_cache':
            result = await this.cacheHandlers.handleClearCache(args);
            break;
          case 'invalidate_cache':
            result = await this.cacheHandlers.handleInvalidateCache(args);
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
    this.logger.info('MCP Adapter v1.3.7 running with modular handlers architecture');
  }
}
