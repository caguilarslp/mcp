/**
 * @fileoverview Hybrid Storage Tools Definitions
 * @description Dual storage system management tools (TASK-015)
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const hybridStorageTools: ToolDefinition[] = [
  {
    name: 'get_hybrid_storage_config',
    description: 'Get hybrid storage configuration and status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_hybrid_storage_config',
    description: 'Update hybrid storage configuration',
    inputSchema: {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          description: 'Storage strategy',
          enum: ['mongo_first', 'file_first', 'smart_routing'],
        },
        fallbackEnabled: {
          type: 'boolean',
          description: 'Enable fallback between storage backends',
        },
        syncEnabled: {
          type: 'boolean',
          description: 'Enable synchronization between storage backends',
        },
        mongoTimeoutMs: {
          type: 'number',
          description: 'MongoDB timeout in milliseconds',
        },
        performanceTracking: {
          type: 'boolean',
          description: 'Enable performance metrics tracking',
        },
      },
    },
  },
  {
    name: 'get_storage_comparison',
    description: 'Get detailed storage performance comparison',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'test_storage_performance',
    description: 'Test storage backend performance with configurable parameters',
    inputSchema: {
      type: 'object',
      properties: {
        testOperations: {
          type: 'number',
          description: 'Number of test operations to perform',
          default: 10,
        },
        testDataSize: {
          type: 'string',
          description: 'Size of test data',
          enum: ['small', 'medium', 'large'],
          default: 'medium',
        },
        symbol: {
          type: 'string',
          description: 'Symbol to use for test data',
          default: 'BTCUSDT',
        },
      },
    },
  },
  {
    name: 'get_mongo_status',
    description: 'Get MongoDB connection status and information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_evaluation_report',
    description: 'Get comprehensive hybrid storage evaluation report',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];
