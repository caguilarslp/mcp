/**
 * @fileoverview Context Management MCP Tools
 * @description MCP tool definitions for context management
 * @module adapters/tools/contextTools
 * @version 1.0.0
 */

import { ToolDefinition } from '../types/mcp.types.js';

/**
 * Context management tool definitions
 */
export const contextTools: ToolDefinition[] = [
  {
    name: 'get_analysis_context',
    description: 'Get compressed historical context for a symbol across all timeframes',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)'
        },
        format: {
          type: 'string',
          enum: ['compressed', 'detailed', 'summary'],
          default: 'compressed',
          description: 'Output format for context'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'get_timeframe_context',
    description: 'Get context summary for a specific symbol and timeframe',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair'
        },
        timeframe: {
          type: 'string',
          description: 'Timeframe (e.g., 5, 15, 60, 240, D)'
        }
      },
      required: ['symbol', 'timeframe']
    }
  },
  {
    name: 'add_analysis_context',
    description: 'Add a new analysis to the context history',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair'
        },
        timeframe: {
          type: 'string',
          description: 'Timeframe'
        },
        analysis: {
          type: 'object',
          description: 'Analysis data to add to context'
        },
        type: {
          type: 'string',
          enum: ['technical', 'smc', 'wyckoff', 'complete'],
          default: 'technical',
          description: 'Type of analysis'
        }
      },
      required: ['symbol', 'timeframe', 'analysis']
    }
  },
  {
    name: 'get_multi_timeframe_context',
    description: 'Get context across multiple timeframes for comprehensive view',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair'
        },
        timeframes: {
          type: 'array',
          items: { type: 'string' },
          default: ['5', '15', '60', '240', 'D'],
          description: 'List of timeframes to analyze'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'update_context_config',
    description: 'Update context management configuration',
    inputSchema: {
      type: 'object',
      properties: {
        max_entries_per_symbol: {
          type: 'number',
          description: 'Maximum entries to keep per symbol'
        },
        summary_update_threshold: {
          type: 'number',
          description: 'Number of entries before updating summary'
        },
        compression_level: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Compression level for summaries'
        },
        retention_days: {
          type: 'number',
          description: 'Days to retain context data'
        },
        auto_summarize: {
          type: 'boolean',
          description: 'Enable automatic summarization'
        }
      }
    }
  },
  {
    name: 'cleanup_context',
    description: 'Clean up old context data based on retention policy',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          default: false,
          description: 'Force cleanup even if recently done'
        }
      }
    }
  },
  {
    name: 'get_context_stats',
    description: 'Get statistics about stored context data',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Optional: filter stats by symbol'
        }
      }
    }
  }
];
