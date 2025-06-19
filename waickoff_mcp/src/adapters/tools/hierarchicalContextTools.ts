/**
 * @fileoverview Hierarchical Context Management MCP Tools
 * @description MCP tool definitions for hierarchical context management (TASK-040.3)
 * @module adapters/tools/hierarchicalContextTools
 * @version 1.0.0
 */

import { ToolDefinition } from '../types/mcp.types.js';

/**
 * Hierarchical context management tool definitions
 */
export const hierarchicalContextTools: ToolDefinition[] = [
  {
    name: 'get_master_context',
    description: 'Get master context for a specific symbol with hierarchical structure and O(1) access',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'initialize_symbol_context',
    description: 'Initialize hierarchical context structure for a new symbol with auto-configuration',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        autoUpdate: {
          type: 'boolean',
          default: true,
          description: 'Enable automatic context updates'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
          description: 'Symbol analysis priority level'
        },
        timeframes: {
          type: 'array',
          items: { type: 'string' },
          default: ['15', '60', '240', 'D'],
          description: 'Timeframes to track for this symbol'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'update_context_levels',
    description: 'Update historical support/resistance levels in master context with intelligent merging',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        analysis: {
          type: 'object',
          description: 'Technical analysis data to extract levels from',
          properties: {
            supportResistance: {
              type: 'array',
              description: 'Support/resistance analysis results'
            },
            wyckoffPhase: {
              type: 'string',
              description: 'Current Wyckoff phase'
            },
            marketBias: {
              type: 'string',
              description: 'Current market bias'
            },
            timeframe: {
              type: 'string',
              description: 'Analysis timeframe'
            }
          }
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          default: 60,
          description: 'Confidence level of the analysis'
        }
      },
      required: ['symbol', 'analysis']
    }
  },
  {
    name: 'query_master_context',
    description: 'Query master context with advanced filtering and proximity analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        levelTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['support', 'resistance']
          },
          description: 'Filter by level types'
        },
        minConfidence: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Minimum confidence/strength threshold'
        },
        filters: {
          type: 'object',
          properties: {
            priceRange: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' }
              },
              description: 'Filter levels by price range'
            },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              },
              description: 'Filter by date range'
            },
            significance: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['critical', 'major', 'minor']
              },
              description: 'Filter by significance levels'
            }
          },
          description: 'Advanced filtering options'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'create_context_snapshot',
    description: 'Create periodic snapshot of master context for historical tracking',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        period: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Snapshot period type'
        }
      },
      required: ['symbol', 'period']
    }
  },
  {
    name: 'get_context_snapshots',
    description: 'Retrieve historical context snapshots for trend analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        period: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Snapshot period type'
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 10,
          description: 'Maximum number of snapshots to return'
        }
      },
      required: ['symbol', 'period']
    }
  },
  {
    name: 'optimize_symbol_context',
    description: 'Optimize master context by removing old data and merging similar levels',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'validate_context_integrity',
    description: 'Validate master context data integrity with checksum verification',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'get_symbol_config',
    description: 'Get hierarchical context configuration for a symbol',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'update_symbol_config',
    description: 'Update hierarchical context configuration for a symbol',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        configUpdates: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable/disable context tracking for this symbol'
            },
            autoUpdate: {
              type: 'boolean',
              description: 'Enable automatic context updates'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Symbol analysis priority level'
            },
            timeframes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Timeframes to track for this symbol'
            },
            thresholds: {
              type: 'object',
              properties: {
                minVolumeForLevel: {
                  type: 'number',
                  description: 'Minimum volume threshold for level creation'
                },
                minConfidenceForPattern: {
                  type: 'number',
                  description: 'Minimum confidence for pattern recognition'
                },
                levelMergeDistance: {
                  type: 'number',
                  description: 'Distance threshold for merging similar levels'
                }
              },
              description: 'Analysis thresholds configuration'
            }
          },
          description: 'Configuration updates to apply'
        }
      },
      required: ['symbol', 'configUpdates']
    }
  },
  {
    name: 'get_symbol_list',
    description: 'Get list of all symbols with active hierarchical context',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'remove_symbol_context',
    description: 'Remove hierarchical context for a symbol with optional archiving',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        archiveData: {
          type: 'boolean',
          default: true,
          description: 'Archive data before removal'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'cleanup_old_context_data',
    description: 'Clean up old context data across all symbols based on retention policy',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Optional: specific symbol to clean up',
          pattern: '^[A-Z]{3,10}USDT?$'
        }
      }
    }
  },
  {
    name: 'get_hierarchical_performance_metrics',
    description: 'Get performance metrics for hierarchical context system',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];
