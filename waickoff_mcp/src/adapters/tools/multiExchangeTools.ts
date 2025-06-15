/**
 * @fileoverview Multi-Exchange Aggregator Tools - TASK-026 FASE 2
 * @description MCP tools for exchange aggregation functionality
 * @version 1.0.0
 */

import { ToolDefinition } from '../types/mcp.types.js';

/**
 * Multi-Exchange Aggregator tools
 */
export const multiExchangeTools: ToolDefinition[] = [
  {
    name: 'get_aggregated_ticker',
    description: 'Get aggregated ticker data from multiple exchanges with weighted pricing',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        category: {
          type: 'string',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
          description: 'Market category'
        },
        exchanges: {
          type: 'array',
          items: { type: 'string' },
          default: ['binance', 'bybit'],
          description: 'Exchanges to aggregate from'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'get_composite_orderbook',
    description: 'Get unified orderbook from multiple exchanges with liquidity analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        category: {
          type: 'string',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
          description: 'Market category'
        },
        limit: {
          type: 'number',
          default: 25,
          description: 'Number of orderbook levels',
          minimum: 1,
          maximum: 100
        },
        exchanges: {
          type: 'array',
          items: { type: 'string' },
          default: ['binance', 'bybit'],
          description: 'Exchanges to aggregate from'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'detect_exchange_divergences',
    description: 'Detect price, volume, and structure divergences between exchanges',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        category: {
          type: 'string',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
          description: 'Market category'
        },
        minDivergence: {
          type: 'number',
          default: 0.5,
          description: 'Minimum divergence percentage to report',
          minimum: 0.1,
          maximum: 10
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'identify_arbitrage_opportunities',
    description: 'Find profitable arbitrage opportunities between exchanges',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        category: {
          type: 'string',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
          description: 'Market category'
        },
        minSpread: {
          type: 'number',
          default: 0.1,
          description: 'Minimum spread percentage to consider',
          minimum: 0.05,
          maximum: 5
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'get_exchange_dominance',
    description: 'Analyze which exchange is dominating price action and volume',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        timeframe: {
          type: 'string',
          default: '1h',
          description: 'Analysis timeframe',
          enum: ['5m', '15m', '30m', '1h', '4h', '1d']
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'get_multi_exchange_analytics',
    description: 'Get comprehensive multi-exchange analytics including correlations and quality metrics',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        timeframe: {
          type: 'string',
          default: '1h',
          description: 'Analysis timeframe',
          enum: ['5m', '15m', '30m', '1h', '4h', '1d']
        },
        includeKlines: {
          type: 'boolean',
          default: true,
          description: 'Include synchronized klines data'
        }
      },
      required: ['symbol']
    }
  }
];
