/**
 * @fileoverview Cache Tools Definitions
 * @description Cache management and performance tools
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const cacheTools: ToolDefinition[] = [
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
];
