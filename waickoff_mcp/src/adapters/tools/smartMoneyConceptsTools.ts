/**
 * @fileoverview Smart Money Concepts MCP Tools
 * @description MCP tool definitions for Smart Money Concepts analysis
 * @version 1.0.0
 * @author Smart Money Concepts Team
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const smartMoneyConceptsTools: ToolDefinition[] = [
  // ====================
  // ORDER BLOCKS TOOLS
  // ====================
  {
    name: 'detect_order_blocks',
    description: 'Detect and analyze institutional Order Blocks with strength scoring and mitigation tracking',
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
        lookback: {
          type: 'integer',
          description: 'Number of periods to analyze for Order Block detection',
          minimum: 50,
          maximum: 500,
          default: 100
        },
        minStrength: {
          type: 'number',
          description: 'Minimum strength threshold for Order Blocks (0-100)',
          minimum: 0,
          maximum: 100,
          default: 70
        },
        includeBreakers: {
          type: 'boolean',
          description: 'Include breaker blocks (mitigated Order Blocks that flipped)',
          default: true
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'validate_order_block',
    description: 'Validate if a specific Order Block is still active and effective for trading',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        orderBlockId: {
          type: 'string',
          description: 'Unique identifier of the Order Block to validate'
        },
        storedBlocks: {
          type: 'array',
          description: 'Array of previously detected Order Blocks',
          items: {
            type: 'object',
            description: 'Order Block object with full structure'
          }
        }
      },
      required: ['symbol', 'orderBlockId', 'storedBlocks']
    }
  },
  {
    name: 'get_order_block_zones',
    description: 'Get Order Blocks categorized by strength and proximity to current price',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        activeBlocks: {
          type: 'array',
          description: 'Array of active Order Blocks to categorize',
          items: {
            type: 'object',
            description: 'Order Block object with full structure'
          }
        }
      },
      required: ['symbol', 'activeBlocks']
    }
  },

  // ====================
  // FAIR VALUE GAPS TOOLS
  // ====================
  {
    name: 'find_fair_value_gaps',
    description: 'Detect Fair Value Gaps with imbalance analysis and fill probability estimation',
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
        lookback: {
          type: 'integer',
          description: 'Number of periods to analyze for FVG detection',
          minimum: 50,
          maximum: 500,
          default: 100
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_fvg_filling',
    description: 'Analyze historical Fair Value Gap filling statistics and performance metrics',
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
        lookbackDays: {
          type: 'integer',
          description: 'Number of days to analyze for historical FVG statistics',
          minimum: 7,
          maximum: 90,
          default: 30
        }
      },
      required: ['symbol']
    }
  },

  // ====================
  // BREAK OF STRUCTURE TOOLS
  // ====================
  {
    name: 'detect_break_of_structure',
    description: 'Detect Break of Structure (BOS) and Change of Character (CHoCH) with multi-factor validation',
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
        lookback: {
          type: 'integer',
          description: 'Number of periods to analyze for structure',
          minimum: 50,
          maximum: 200,
          default: 100
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_market_structure',
    description: 'Perform comprehensive market structure analysis with trend identification and momentum',
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
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'validate_structure_shift',
    description: 'Validate if a specific structure shift is still valid and trading opportunities',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        breakId: {
          type: 'string',
          description: 'Unique identifier of the structure break to validate'
        }
      },
      required: ['symbol', 'breakId']
    }
  },

  // ====================
  // SMART MONEY INTEGRATION TOOLS
  // ====================
  {
    name: 'analyze_smart_money_confluence',
    description: 'Analyze confluences between Order Blocks, Fair Value Gaps, and Break of Structure for complete SMC analysis',
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
        lookback: {
          type: 'integer',
          description: 'Number of periods to analyze',
          minimum: 50,
          maximum: 500,
          default: 100
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'get_smc_market_bias',
    description: 'Get integrated Smart Money Concepts market bias with institutional alignment and confluence support',
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
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'validate_smc_setup',
    description: 'Validate a complete Smart Money Concepts trading setup with multi-factor analysis and risk management',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
          pattern: '^[A-Z]{3,10}USDT?$'
        },
        setupType: {
          type: 'string',
          description: 'Type of trading setup to validate',
          enum: ['long', 'short']
        },
        entryPrice: {
          type: 'number',
          description: 'Optional specific entry price to validate (defaults to current price)',
          minimum: 0
        }
      },
      required: ['symbol', 'setupType']
    }
  }
];