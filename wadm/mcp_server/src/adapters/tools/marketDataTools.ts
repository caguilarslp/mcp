/**
 * @fileoverview Market Data Tools Definitions
 * @description Core market data tools for ticker, orderbook, and comprehensive market data
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const marketDataTools: ToolDefinition[] = [
  {
    name: 'get_ticker',
    description: 'Get current price and 24h statistics for a trading pair',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT, XRPUSDT)',
        },
        category: {
          type: 'string',
          description: 'Market category',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_orderbook',
    description: 'Get order book depth for market analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        category: {
          type: 'string',
          description: 'Market category',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
        },
        limit: {
          type: 'number',
          description: 'Number of orderbook levels',
          default: 25,
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_market_data',
    description: 'Get comprehensive market data (ticker + orderbook + recent klines)',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        category: {
          type: 'string',
          description: 'Market category',
          enum: ['spot', 'linear', 'inverse'],
          default: 'spot',
        },
      },
      required: ['symbol'],
    },
  },
];
