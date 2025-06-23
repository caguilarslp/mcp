/**
 * @fileoverview Tool Router - Dynamic Tool Routing
 * @description Routes tool execution requests to appropriate handlers with error handling
 * @version 1.6.3
 */

import { MCPServerResponse } from '../../types/index.js';
import { HandlerRegistry } from './handlerRegistry.js';
import { FileLogger } from '../../utils/fileLogger.js';
import { hasTool } from '../tools/index.js';

export class ToolRouter {
  private logger: FileLogger;
  private handlerRegistry: HandlerRegistry;

  constructor(handlerRegistry: HandlerRegistry) {
    this.handlerRegistry = handlerRegistry;
    this.logger = new FileLogger('ToolRouter');
  }

  async route(toolName: string, args: any): Promise<MCPServerResponse> {
    this.logger.info(`Routing tool: ${toolName}`);

    // Validate tool exists in registry
    if (!hasTool(toolName)) {
      this.logger.error(`Unknown tool: ${toolName}`);
      return this.createErrorResponse(toolName, new Error(`Unknown tool: ${toolName}`));
    }

    // Get handler for tool
    const handler = this.handlerRegistry.getHandler(toolName);
    
    if (!handler) {
      this.logger.error(`No handler registered for tool: ${toolName}`);
      return this.createErrorResponse(toolName, new Error(`No handler registered for tool: ${toolName}`));
    }

    try {
      // Execute handler with performance tracking
      const startTime = Date.now();
      const result = await handler(args);
      const duration = Date.now() - startTime;
      
      this.logger.info(`Tool ${toolName} executed successfully in ${duration}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Tool execution failed for ${toolName}:`, error);
      return this.createErrorResponse(toolName, error as Error);
    }
  }

  private createErrorResponse(toolName: string, error: Error): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error.message}`
      }]
    };
  }

  // Router statistics and diagnostics
  getRouterStats() {
    return {
      handlerRegistryStats: this.handlerRegistry.getRegistryStats(),
      totalHandlers: this.handlerRegistry.getHandlerCount(),
      availableTools: this.handlerRegistry.getAllHandlerNames().sort()
    };
  }

  // Validate that all tools have handlers
  validateRouting(): { valid: boolean; issues: string[] } {
    const handlerCount = this.handlerRegistry.getHandlerCount();
    const allHandlers = this.handlerRegistry.getAllHandlerNames();
    const issues: string[] = [];

    // Check for handlers without tools (theoretical issue)
    const handlersWithoutTools = allHandlers.filter(name => !hasTool(name));
    if (handlersWithoutTools.length > 0) {
      issues.push(`Handlers without corresponding tools: ${handlersWithoutTools.join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
