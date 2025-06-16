/**
 * @fileoverview Advanced Multi-Exchange MCP Tools - TASK-026 FASE 4
 * @description Tools for advanced multi-exchange features
 * @version 1.0.0
 */

import { MCPTool } from '../../types/index.js';

/**
 * Advanced Multi-Exchange MCP Tools
 * Phase 4: Exclusive Multi-Exchange Features
 */
export const advancedMultiExchangeTools: MCPTool[] = [
  {
    name: 'predict_liquidation_cascade',
    description: 'Predict liquidation cascades across multiple exchanges with risk assessment and trigger analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        category: {
          type: 'string',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
          description: 'Market category'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'detect_advanced_divergences',
    description: 'Detect advanced inter-exchange divergences including momentum, volume flow, liquidity, and institutional patterns',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        category: {
          type: 'string',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
          description: 'Market category'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_enhanced_arbitrage',
    description: 'Analyze enhanced arbitrage opportunities including spatial, temporal, triangular, and statistical arbitrage',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        category: {
          type: 'string',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
          description: 'Market category'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_extended_dominance',
    description: 'Comprehensive exchange dominance analysis with leadership metrics, market dynamics, and predictions',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          enum: ['5m', '15m', '30m', '1h', '4h', '1d'],
          default: '1h',
          description: 'Analysis timeframe'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_cross_exchange_market_structure',
    description: 'Analyze market structure across exchanges including consensus levels, manipulation detection, and institutional activity',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)'
        },
        timeframe: {
          type: 'string',
          enum: ['5m', '15m', '30m', '1h', '4h', '1d'],
          default: '1h',
          description: 'Analysis timeframe'
        }
      },
      required: ['symbol']
    }
  }
];
