/**
 * @fileoverview MCP Tool Types for Modular Architecture
 * @version 1.6.3
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCategory {
  name: string;
  description: string;
  tools: ToolDefinition[];
}

export interface ToolHandler {
  (args: any): Promise<import('../../types/index.js').MCPServerResponse>;
}

export interface HandlerMapping {
  [toolName: string]: ToolHandler;
}
