/**
 * @fileoverview Report Generator Tools Definitions
 * @description Report generation and export tools (TASK-009 FASE 4)
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const reportTools: ToolDefinition[] = [
  {
    name: 'generate_report',
    description: 'Generate a comprehensive report based on analysis data',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Report type',
          enum: ['daily', 'weekly', 'symbol', 'performance', 'patterns', 'custom'],
        },
        format: {
          type: 'string',
          description: 'Output format',
          enum: ['markdown', 'json', 'html'],
          default: 'markdown',
        },
        symbol: {
          type: 'string',
          description: 'Trading pair (for symbol reports)',
        },
        symbols: {
          type: 'array',
          description: 'Multiple trading pairs',
          items: { type: 'string' },
        },
        dateFrom: {
          type: 'string',
          description: 'Start date (ISO format)',
        },
        dateTo: {
          type: 'string',
          description: 'End date (ISO format)',
        },
        includeCharts: {
          type: 'boolean',
          description: 'Include chart data',
          default: true,
        },
        includePatterns: {
          type: 'boolean',
          description: 'Include pattern analysis',
          default: true,
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'generate_daily_report',
    description: 'Generate a daily market analysis report',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date for report (ISO format, defaults to today)',
        },
      },
    },
  },
  {
    name: 'generate_weekly_report',
    description: 'Generate a weekly market analysis report',
    inputSchema: {
      type: 'object',
      properties: {
        weekStartDate: {
          type: 'string',
          description: 'Start date of the week (ISO format)',
        },
      },
    },
  },
  {
    name: 'generate_symbol_report',
    description: 'Generate a detailed report for a specific symbol',
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
          enum: ['1h', '4h', '1d', '1w', '1m'],
          default: '1d',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'generate_performance_report',
    description: 'Generate a performance analysis report',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Performance period',
          enum: ['1h', '4h', '1d', '1w', '1m'],
          default: '1w',
        },
      },
    },
  },
  {
    name: 'get_report',
    description: 'Retrieve a previously generated report by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Report ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_reports',
    description: 'List available reports',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter by report type',
          enum: ['daily', 'weekly', 'symbol', 'performance', 'patterns', 'custom'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of reports to return',
          default: 10,
        },
      },
    },
  },
  {
    name: 'export_report',
    description: 'Export a report to a file',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Report ID',
        },
        outputPath: {
          type: 'string',
          description: 'Output file path',
        },
      },
      required: ['id', 'outputPath'],
    },
  },
];
