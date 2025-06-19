/**
 * @fileoverview Context-Aware Analysis Tools - TASK-040.4
 * @description MCP tool definitions for context-aware analysis
 * @version 1.0.0
 */

import type { MCPTool } from '../../types/index.js';

export const contextAwareAnalysisTools: MCPTool[] = [
  {
    name: 'analyze_with_historical_context',
    description: 'Perform technical analysis enhanced with hierarchical historical context. Compares current analysis with historical patterns and levels to provide context-aware insights and recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['5', '15', '30', '60', '240'],
          default: '60'
        },
        periods: {
          type: 'number',
          description: 'Number of periods to analyze',
          minimum: 50,
          maximum: 200,
          default: 100
        },
        includeHistoricalContext: {
          type: 'boolean',
          description: 'Include historical context in analysis',
          default: true
        },
        updateContextAfterAnalysis: {
          type: 'boolean',
          description: 'Update hierarchical context with new analysis results',
          default: true
        },
        contextLookbackDays: {
          type: 'number',
          description: 'Number of days to look back for historical context',
          minimum: 7,
          maximum: 90,
          default: 30
        },
        confidenceThreshold: {
          type: 'number',
          description: 'Minimum confidence threshold for historical patterns',
          minimum: 0,
          maximum: 100,
          default: 60
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'complete_analysis_with_context',
    description: 'Perform comprehensive market analysis enhanced with hierarchical historical context. Includes technical analysis, market data, grid suggestions, and historical pattern comparisons for complete market insights.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        investment: {
          type: 'number',
          description: 'Optional investment amount in USD for grid trading suggestions',
          minimum: 100,
          maximum: 1000000
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe',
          enum: ['5', '15', '30', '60', '240'],
          default: '60'
        },
        periods: {
          type: 'number',
          description: 'Number of periods to analyze',
          minimum: 50,
          maximum: 200,
          default: 100
        },
        includeHistoricalContext: {
          type: 'boolean',
          description: 'Include historical context in analysis',
          default: true
        },
        updateContextAfterAnalysis: {
          type: 'boolean',
          description: 'Update hierarchical context with new analysis results',
          default: true
        },
        contextLookbackDays: {
          type: 'number',
          description: 'Number of days to look back for historical context',
          minimum: 7,
          maximum: 90,
          default: 30
        },
        confidenceThreshold: {
          type: 'number',
          description: 'Minimum confidence threshold for historical patterns',
          minimum: 0,
          maximum: 100,
          default: 60
        }
      },
      required: ['symbol']
    }
  }
];

export const contextAwareAnalysisToolDefinitions = {
  analyze_with_historical_context: {
    handler: 'handleAnalyzeWithHistoricalContext',
    description: 'Enhanced technical analysis with historical context integration',
    category: 'Context-Aware Analysis',
    complexity: 'advanced',
    outputFormat: 'structured_json',
    cacheable: false,
    estimatedExecutionTime: '3-8 seconds',
    dataRequirements: [
      'Real-time market data',
      'Historical context data',
      'Hierarchical context storage'
    ],
    useCases: [
      'Context-aware technical analysis',
      'Historical pattern validation',
      'Enhanced market insights',
      'Risk-adjusted recommendations'
    ]
  },
  complete_analysis_with_context: {
    handler: 'handleCompleteAnalysisWithContext',
    description: 'Comprehensive market analysis with historical context enhancement',
    category: 'Context-Aware Analysis',
    complexity: 'advanced',
    outputFormat: 'structured_json',
    cacheable: false,
    estimatedExecutionTime: '5-12 seconds',
    dataRequirements: [
      'Real-time market data',
      'Technical analysis data',
      'Historical context data',
      'Grid trading calculations',
      'Hierarchical context storage'
    ],
    useCases: [
      'Complete market analysis',
      'Investment decision support',
      'Historical trend validation',
      'Context-aware trading strategies',
      'Risk management enhancement'
    ]
  }
};
