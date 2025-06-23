/**
 * @fileoverview User Configuration Tools Definitions
 * @description User configuration and timezone management tools (TASK-010)
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const configTools: ToolDefinition[] = [
  {
    name: 'get_user_config',
    description: 'Get current user configuration including timezone settings',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_user_timezone',
    description: 'Set user timezone preference',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone identifier (e.g., America/New_York, Europe/London)',
        },
        autoDetect: {
          type: 'boolean',
          description: 'Enable automatic timezone detection',
          default: false,
        },
      },
      required: ['timezone'],
    },
  },
  {
    name: 'detect_timezone',
    description: 'Auto-detect system timezone using multiple detection methods',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_config',
    description: 'Update multiple configuration sections',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'object',
          description: 'Timezone configuration updates',
          properties: {
            default: { type: 'string' },
            autoDetect: { type: 'boolean' },
            preferredSessions: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        trading: {
          type: 'object',
          description: 'Trading configuration updates',
          properties: {
            defaultTimeframe: { type: 'string' },
            alertTimes: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        display: {
          type: 'object',
          description: 'Display configuration updates',
          properties: {
            dateFormat: { type: 'string' },
            use24Hour: { type: 'boolean' },
            locale: { type: 'string' }
          }
        }
      }
    },
  },
  {
    name: 'reset_config',
    description: 'Reset configuration to defaults with auto-detection',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate_config',
    description: 'Validate current configuration and get suggestions',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_config_info',
    description: 'Get configuration file information and supported options',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];
