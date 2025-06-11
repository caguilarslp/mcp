/**
 * @fileoverview Analysis Repository Tools Definitions
 * @description Analysis repository management and query tools (TASK-009 FASE 3)
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const repositoryTools: ToolDefinition[] = [
  {
    name: 'get_analysis_by_id',
    description: 'Get a specific analysis by its ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Analysis ID (UUID)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_latest_analysis',
    description: 'Get the latest analysis for a symbol and type',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        type: {
          type: 'string',
          description: 'Analysis type',
          enum: ['technical_analysis', 'complete_analysis', 'support_resistance', 'volume_analysis', 'volume_delta', 'grid_suggestion', 'volatility', 'pattern_detection'],
        },
      },
      required: ['symbol', 'type'],
    },
  },
  {
    name: 'search_analyses',
    description: 'Search analyses with complex query',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair filter',
        },
        type: {
          type: 'string',
          description: 'Analysis type filter',
          enum: ['technical_analysis', 'complete_analysis', 'support_resistance', 'volume_analysis', 'volume_delta', 'grid_suggestion', 'volatility', 'pattern_detection'],
        },
        dateFrom: {
          type: 'string',
          description: 'Start date (ISO format)',
        },
        dateTo: {
          type: 'string',
          description: 'End date (ISO format)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results',
          default: 100,
        },
        orderBy: {
          type: 'string',
          description: 'Sort field',
          enum: ['timestamp', 'confidence', 'price'],
          default: 'timestamp',
        },
        orderDirection: {
          type: 'string',
          description: 'Sort direction',
          enum: ['asc', 'desc'],
          default: 'desc',
        },
      },
    },
  },
  {
    name: 'get_analysis_summary',
    description: 'Get analysis summary for a symbol over a period',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        period: {
          type: 'string',
          description: 'Summary period',
          enum: ['1h', '4h', '1d', '1w', '1m'],
          default: '1d',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_aggregated_metrics',
    description: 'Get aggregated metrics for a specific indicator',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        metric: {
          type: 'string',
          description: 'Metric path (e.g., volatility.volatilityPercent)',
        },
        period: {
          type: 'string',
          description: 'Aggregation period',
          enum: ['1h', '4h', '1d', '1w', '1m'],
        },
      },
      required: ['symbol', 'metric', 'period'],
    },
  },
  {
    name: 'find_patterns',
    description: 'Find detected patterns based on criteria',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Pattern type',
        },
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
        minConfidence: {
          type: 'number',
          description: 'Minimum confidence score (0-100)',
        },
        dateFrom: {
          type: 'string',
          description: 'Start date (ISO format)',
        },
        dateTo: {
          type: 'string',
          description: 'End date (ISO format)',
        },
      },
    },
  },
  {
    name: 'get_repository_stats',
    description: 'Get repository statistics and storage usage',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];
