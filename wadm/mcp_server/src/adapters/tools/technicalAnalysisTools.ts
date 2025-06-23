/**
 * @fileoverview Technical Analysis MCP Tools
 * @description MCP tool definitions for Fibonacci, Bollinger Bands, Elliott Wave analysis
 * @version 1.0.0
 * @author wAIckoff MCP Team
 */

export const technicalAnalysisTools = [
  {
    name: 'calculate_fibonacci_levels',
    description: 'Calculate Fibonacci retracement and extension levels with automatic swing detection',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Timeframe for analysis',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        retracementLevels: {
          type: 'array',
          items: { type: 'number' },
          description: 'Custom retracement levels (default: [0.236, 0.382, 0.5, 0.618, 0.786])',
          default: [0.236, 0.382, 0.5, 0.618, 0.786]
        },
        extensionLevels: {
          type: 'array',
          items: { type: 'number' },
          description: 'Custom extension levels (default: [1.0, 1.272, 1.414, 1.618, 2.0, 2.618])',
          default: [1.0, 1.272, 1.414, 1.618, 2.0, 2.618]
        },
        minSwingSize: {
          type: 'number',
          description: 'Minimum swing size in percentage for detection (default: 2.0)',
          default: 2.0,
          minimum: 0.5,
          maximum: 10.0
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_bollinger_bands',
    description: 'Comprehensive Bollinger Bands analysis with squeeze detection and divergences',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Timeframe for analysis',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        period: {
          type: 'number',
          description: 'Bollinger Bands period (default: 20)',
          default: 20,
          minimum: 5,
          maximum: 50
        },
        standardDeviation: {
          type: 'number',
          description: 'Standard deviation multiplier (default: 2.0)',
          default: 2.0,
          minimum: 1.0,
          maximum: 3.0
        },
        includeSignals: {
          type: 'boolean',
          description: 'Include trading signals in response (default: true)',
          default: true
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'detect_elliott_waves',
    description: 'Elliott Wave pattern detection with rule validation and projections',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Timeframe for analysis',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        minWaveLength: {
          type: 'number',
          description: 'Minimum wave length in percentage (default: 1.0)',
          default: 1.0,
          minimum: 0.5,
          maximum: 5.0
        },
        strictRules: {
          type: 'boolean',
          description: 'Enforce strict Elliott Wave rules (default: true)',
          default: true
        },
        includeProjections: {
          type: 'boolean',
          description: 'Include wave projections and targets (default: true)',
          default: true
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'find_technical_confluences',
    description: 'Find confluences between multiple technical indicators for high-probability setups',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)'
        },
        timeframe: {
          type: 'string',
          description: 'Timeframe for analysis',
          enum: ['15', '30', '60', '240', 'D'],
          default: '60'
        },
        indicators: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['fibonacci', 'bollinger', 'elliott']
          },
          description: 'Indicators to include in confluence analysis (default: all)',
          default: ['fibonacci', 'bollinger', 'elliott']
        },
        minConfluenceStrength: {
          type: 'number',
          description: 'Minimum confluence strength (0-100) to report (default: 60)',
          default: 60,
          minimum: 0,
          maximum: 100
        },
        distanceTolerance: {
          type: 'number',
          description: 'Price distance tolerance for grouping levels in percentage (default: 0.5)',
          default: 0.5,
          minimum: 0.1,
          maximum: 2.0
        }
      },
      required: ['symbol']
    }
  }
];
