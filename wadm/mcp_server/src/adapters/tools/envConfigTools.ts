/**
 * @fileoverview Environment Configuration Tools Definitions
 * @description System environment configuration management tools (TASK-015b)
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

export const envConfigTools: ToolDefinition[] = [
  {
    name: 'get_system_config',
    description: 'Get complete system configuration from environment variables',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_mongo_config',
    description: 'Get MongoDB connection configuration status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_api_config',
    description: 'Get API configuration for external services',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_analysis_config',
    description: 'Get technical analysis configuration parameters',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_grid_config',
    description: 'Get grid trading configuration parameters',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_logging_config',
    description: 'Get logging and monitoring configuration',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate_env_config',
    description: 'Validate environment configuration and get recommendations',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'reload_env_config',
    description: 'Reload environment configuration from .env file',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_env_file_info',
    description: 'Get environment file information and configuration status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];
