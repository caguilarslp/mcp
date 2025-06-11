/**
 * @fileoverview MCP Adapter - Modular Architecture v1.6.3
 * @description Clean, modular MCP adapter with dynamic tool routing and registry
 * @version 1.6.3
 * @task TASK-018 - Complete MCP Modularization
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { MarketAnalysisEngine } from '../core/engine.js';
import { FileLogger } from '../utils/fileLogger.js';
import { MCPHandlers } from './mcp-handlers.js';

// Import modular components
import { getAllTools, getRegistryStats } from './tools/index.js';
import { HandlerRegistry } from './router/handlerRegistry.js';
import { ToolRouter } from './router/toolRouter.js';

export class MCPAdapter {
  private server: Server;
  private engine: MarketAnalysisEngine;
  private logger: FileLogger;
  private handlers: MCPHandlers;
  private handlerRegistry: HandlerRegistry;
  private router: ToolRouter;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('MCPAdapter');
    
    // Initialize modular architecture
    this.handlers = new MCPHandlers(engine);
    this.handlerRegistry = new HandlerRegistry(this.handlers);
    this.router = new ToolRouter(this.handlerRegistry);
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'waickoff_mcp',
        version: '1.6.3',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logInitialization();
  }

  private setupHandlers() {
    // List available tools - now completely dynamic!
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: getAllTools()
      };
    });

    // Handle tool execution - now uses modular router!
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.router.route(name, args);
    });
  }

  private logInitialization() {
    const registryStats = getRegistryStats();
    
    this.logger.info('🎆 MCP Adapter v1.6.3 - Modular Architecture');
    this.logger.info(`📦 ${registryStats.totalTools} tools across ${registryStats.totalCategories} categories`);
    this.logger.info(`🔧 ${this.handlerRegistry.getHandlerCount()} handlers registered`);
    
    // Log tool categories
    registryStats.categories.forEach(category => {
      this.logger.info(`  • ${category.name}: ${category.count} tools`);
    });
    
    // Validate routing
    const routingValidation = this.router.validateRouting();
    if (routingValidation.valid) {
      this.logger.info('✅ All tools have corresponding handlers');
    } else {
      this.logger.warn('⚠️ Routing validation issues:');
      routingValidation.issues.forEach(issue => {
        this.logger.warn(`  • ${issue}`);
      });
    }
    
    this.logger.info('🚀 Modular MCP system ready');
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('🌟 MCP Adapter running with modular architecture v1.6.3');
  }

  // Diagnostic methods for development
  getSystemStats() {
    return {
      version: '1.6.3',
      architecture: 'Modular',
      registryStats: getRegistryStats(),
      routerStats: this.router.getRouterStats(),
      routingValidation: this.router.validateRouting()
    };
  }
}
