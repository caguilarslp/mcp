/**
 * @fileoverview Trap Detection Tools Definitions
 * @description Bull and bear trap detection tools (TASK-012)
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const trapDetectionTools: ToolDefinition[] = [
  {
    name: 'detect_bull_trap',
    description: 'Detect bull trap (false breakout above resistance)',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
        },
        sensitivity: {
          type: 'string',
          description: 'Detection sensitivity',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'detect_bear_trap',
    description: 'Detect bear trap (false breakdown below support)',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
        },
        sensitivity: {
          type: 'string',
          description: 'Detection sensitivity',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_trap_history',
    description: 'Get historical trap events for backtesting and analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        days: {
          type: 'number',
          description: 'Number of days to look back',
          default: 30,
        },
        trapType: {
          type: 'string',
          description: 'Type of traps to retrieve',
          enum: ['bull', 'bear', 'both'],
          default: 'both',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_trap_statistics',
    description: 'Get trap detection performance statistics',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        period: {
          type: 'string',
          description: 'Statistics period',
          enum: ['7d', '30d', '90d', '1y'],
          default: '30d',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'configure_trap_detection',
    description: 'Configure trap detection parameters',
    inputSchema: {
      type: 'object',
      properties: {
        sensitivity: {
          type: 'string',
          description: 'Overall sensitivity',
          enum: ['low', 'medium', 'high'],
        },
        volumeThreshold: {
          type: 'number',
          description: 'Volume threshold multiplier',
        },
        orderbookDepthRatio: {
          type: 'number',
          description: 'Minimum orderbook depth ratio',
        },
        timeWindowMinutes: {
          type: 'number',
          description: 'Analysis time window in minutes',
        },
        minimumBreakout: {
          type: 'number',
          description: 'Minimum breakout percentage to analyze',
        },
        confidenceThreshold: {
          type: 'number',
          description: 'Minimum confidence threshold for alerts',
        },
      },
    },
  },
  {
    name: 'validate_breakout',
    description: 'Validate if there is currently a breakout situation',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_trap_performance',
    description: 'Get trap detection service performance metrics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];
