/**
 * @fileoverview Historical Analysis Tools Definitions
 * @description Historical data analysis and market cycle identification tools (TASK-017)
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const historicalTools: ToolDefinition[] = [
  {
    name: 'get_historical_klines',
    description: 'Get comprehensive historical klines data with metadata',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
        },
        interval: {
          type: 'string',
          description: 'Time interval',
          enum: ['D', 'W', 'M'],
          default: 'D',
        },
        startTime: {
          type: 'number',
          description: 'Start timestamp (optional)',
        },
        endTime: {
          type: 'number',
          description: 'End timestamp (optional)',
        },
        useCache: {
          type: 'boolean',
          description: 'Use cached data if available',
          default: true,
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'analyze_historical_sr',
    description: 'Analyze historical support and resistance levels with advanced scoring',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['D', 'W', 'M'],
          default: 'D',
        },
        minTouches: {
          type: 'number',
          description: 'Minimum touches for level validation',
          default: 3,
        },
        tolerance: {
          type: 'number',
          description: 'Price tolerance percentage',
          default: 0.5,
        },
        volumeWeight: {
          type: 'boolean',
          description: 'Weight levels by volume',
          default: true,
        },
        recencyBias: {
          type: 'number',
          description: 'Bias toward recent levels (0-1)',
          default: 0.1,
        },
        useCache: {
          type: 'boolean',
          description: 'Use cached analysis if available',
          default: true,
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'identify_volume_anomalies',
    description: 'Identify volume anomalies and significant events',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['D', 'W'],
          default: 'D',
        },
        threshold: {
          type: 'number',
          description: 'Anomaly detection threshold multiplier',
          default: 2.5,
        },
        useCache: {
          type: 'boolean',
          description: 'Use cached analysis if available',
          default: true,
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_price_distribution',
    description: 'Analyze price distribution and value areas',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['D', 'W'],
          default: 'D',
        },
        useCache: {
          type: 'boolean',
          description: 'Use cached analysis if available',
          default: true,
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'identify_market_cycles',
    description: 'Identify market cycles and trends',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        useCache: {
          type: 'boolean',
          description: 'Use cached analysis if available',
          default: true,
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_historical_summary',
    description: 'Get comprehensive historical analysis summary',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['D', 'W', 'M'],
          default: 'D',
        },
        useCache: {
          type: 'boolean',
          description: 'Use cached analysis if available',
          default: true,
        },
      },
      required: ['symbol'],
    },
  },
];
