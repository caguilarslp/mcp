/**
 * @fileoverview Grid Trading Tools Definitions
 * @description Grid trading suggestion tools
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const gridTradingTools: ToolDefinition[] = [
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
];
