/**
 * @fileoverview Wyckoff Advanced Tools for MCP Protocol
 * @description Defines the 7 advanced Wyckoff analysis tools for composite man tracking,
 * multi-timeframe analysis, cause & effect calculations, and nested structures
 * @version 1.0.0
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const wyckoffAdvancedTools: Tool[] = [
  {
    name: 'analyze_composite_man',
    description: 'Analyze Composite Man activity and institutional manipulation patterns. The Composite Man represents the smart money/institutional traders who manipulate price action. This tool detects signs of accumulation, distribution, and manipulation tactics used by large players.',
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
          enum: ['15', '60', '240', 'D'],
          default: '60'
        },
        lookback: {
          type: 'integer',
          description: 'Number of periods to analyze for manipulation patterns',
          minimum: 50,
          maximum: 500,
          default: 200
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_multi_timeframe_wyckoff',
    description: 'Perform comprehensive multi-timeframe Wyckoff analysis to identify confluences and dominant structures across different time horizons. Aligns multiple timeframes to determine overall market bias and identify high-probability setups.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        timeframes: {
          type: 'array',
          description: 'Array of timeframes to analyze for confluences',
          items: {
            type: 'string',
            enum: ['5', '15', '30', '60', '240', 'D', 'W']
          },
          minItems: 2,
          maxItems: 6,
          default: ['15', '60', '240', 'D']
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'calculate_cause_effect_targets',
    description: 'Calculate Wyckoff Cause & Effect relationships to determine price targets based on accumulation and distribution areas. Uses trading range duration and volume to project potential price movements and calculate effect distances.',
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
          description: 'Analysis timeframe for cause-effect calculations',
          enum: ['60', '240', 'D', 'W'],
          default: '60'
        },
        lookback: {
          type: 'integer',
          description: 'Number of periods to analyze for historical accumulation/distribution zones',
          minimum: 100,
          maximum: 1000,
          default: 300
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_nested_wyckoff_structures',
    description: 'Analyze nested Wyckoff structures across multiple timeframes to understand fractal relationships and structure interactions. Identifies primary and secondary structures and their influence on price action.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        primaryTimeframe: {
          type: 'string',
          description: 'Primary timeframe for main structure analysis',
          enum: ['240', 'D', 'W'],
          default: '240'
        },
        secondaryTimeframes: {
          type: 'array',
          description: 'Secondary timeframes for nested structure analysis',
          items: {
            type: 'string',
            enum: ['5', '15', '30', '60', '240']
          },
          minItems: 1,
          maxItems: 4,
          default: ['15', '60']
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'validate_wyckoff_signal',
    description: 'Validate Wyckoff trading signals using advanced multi-factor analysis including multi-timeframe confirmation, volume validation, composite man alignment, and cause-effect relationships.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        signal: {
          type: 'object',
          description: 'Wyckoff signal to validate',
          properties: {
            type: {
              type: 'string',
              description: 'Type of Wyckoff signal',
              enum: ['spring', 'upthrust', 'test', 'sign_of_strength', 'sign_of_weakness']
            },
            timestamp: {
              type: 'string',
              description: 'Signal timestamp in ISO format',
              format: 'date-time'
            },
            price: {
              type: 'number',
              description: 'Price level where signal occurred',
              minimum: 0
            },
            volume: {
              type: 'number',
              description: 'Volume at signal occurrence',
              minimum: 0
            },
            timeframe: {
              type: 'string',
              description: 'Timeframe where signal was detected',
              enum: ['5', '15', '30', '60', '240', 'D']
            },
            context: {
              type: 'object',
              description: 'Additional signal context',
              properties: {
                phase: {
                  type: 'string',
                  description: 'Wyckoff phase at signal time'
                },
                supportingEvidence: {
                  type: 'array',
                  description: 'Supporting evidence for the signal',
                  items: { type: 'string' }
                }
              }
            }
          },
          required: ['type', 'timestamp', 'price', 'volume', 'timeframe']
        }
      },
      required: ['symbol', 'signal']
    }
  },
  {
    name: 'track_institutional_flow',
    description: 'Track institutional money flow and smart money activity patterns. Analyzes volume patterns, absorption events, distribution activities, and institutional positioning to understand large player behavior.',
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
          description: 'Analysis timeframe for institutional flow tracking',
          enum: ['15', '60', '240', 'D'],
          default: '60'
        },
        lookback: {
          type: 'integer',
          description: 'Number of periods to analyze for institutional activity',
          minimum: 50,
          maximum: 200,
          default: 100
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'generate_wyckoff_advanced_insights',
    description: 'Generate comprehensive advanced Wyckoff insights and actionable trading recommendations. Combines all advanced analysis methods to provide holistic market understanding and specific trading opportunities.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        analysisType: {
          type: 'string',
          description: 'Type of advanced analysis to perform',
          enum: ['complete', 'composite_man', 'multi_timeframe', 'cause_effect', 'nested'],
          default: 'complete'
        }
      },
      required: ['symbol']
    }
  }
];
