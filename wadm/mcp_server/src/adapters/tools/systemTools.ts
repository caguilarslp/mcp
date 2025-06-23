/**
 * @fileoverview System Tools Definitions
 * @description System health, debugging, and testing tools
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const systemTools: ToolDefinition[] = [
  {
    name: 'get_system_health',
    description: 'Get system health status and performance metrics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_debug_logs',
    description: 'Get debug logs for troubleshooting JSON errors and request issues',
    inputSchema: {
      type: 'object',
      properties: {
        logType: {
          type: 'string',
          description: 'Type of logs to retrieve',
          enum: ['all', 'errors', 'json_errors', 'requests'],
          default: 'all',
        },
        limit: {
          type: 'number',
          description: 'Number of log entries to return',
          default: 50,
        },
      },
    },
  },
  {
    name: 'get_analysis_history',
    description: 'Get saved analysis history for a symbol',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair to get history for',
        },
        limit: {
          type: 'number',
          description: 'Number of historical analyses to return',
          default: 10,
        },
        analysisType: {
          type: 'string',
          description: 'Filter by analysis type',
          enum: ['technical_analysis', 'complete_analysis'],
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'test_storage',
    description: 'Test storage system functionality',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'Test operation to perform',
          enum: ['save_test', 'load_test', 'query_test', 'stats'],
          default: 'save_test',
        },
      },
    },
  },
];
