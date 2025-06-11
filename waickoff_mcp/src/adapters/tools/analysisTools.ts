/**
 * @fileoverview Analysis Tools Definitions
 * @description Technical analysis tools for volatility, volume, support/resistance, and comprehensive analysis
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const analysisTools: ToolDefinition[] = [
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
];
