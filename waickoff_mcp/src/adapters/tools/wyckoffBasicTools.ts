/**
 * @fileoverview Wyckoff Basic Analysis MCP Tools
 * @description Tool definitions for Wyckoff basic analysis functionality
 * @version 1.0.0
 */

import type { ToolDefinition } from '../types/mcp.types.js';

export const wyckoffBasicTools: ToolDefinition[] = [
  {
    name: 'analyze_wyckoff_phase',
    description: 'Analyze current Wyckoff phase for market structure analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        lookback: {
          type: 'number',
          description: 'Number of periods to analyze',
          minimum: 50,
          maximum: 200,
          default: 100
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'detect_trading_range',
    description: 'Detect trading ranges for accumulation/distribution analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        minPeriods: {
          type: 'number',
          description: 'Minimum periods for valid range',
          minimum: 10,
          maximum: 50,
          default: 20
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'find_wyckoff_events',
    description: 'Find Wyckoff events (springs, upthrusts, tests) in market data',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        eventTypes: {
          type: 'array',
          description: 'Types of events to detect',
          items: {
            type: 'string',
            enum: ['spring', 'upthrust', 'test']
          },
          default: ['spring', 'upthrust', 'test']
        },
        lookback: {
          type: 'number',
          description: 'Number of periods to analyze',
          minimum: 50,
          maximum: 200,
          default: 100
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_wyckoff_volume',
    description: 'Analyze volume characteristics in Wyckoff context',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        lookback: {
          type: 'number',
          description: 'Number of periods to analyze',
          minimum: 50,
          maximum: 200,
          default: 100
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'get_wyckoff_interpretation',
    description: 'Get comprehensive Wyckoff analysis interpretation and bias',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'track_phase_progression',
    description: 'Track Wyckoff phase progression and development timeline',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'validate_wyckoff_setup',
    description: 'Validate Wyckoff trading setup with risk assessment',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        tradingDirection: {
          type: 'string',
          description: 'Intended trading direction',
          enum: ['long', 'short'],
          optional: true
        }
      },
      required: ['symbol']
    }
  }
];
