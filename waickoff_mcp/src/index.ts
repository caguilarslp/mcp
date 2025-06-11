#!/usr/bin/env node

/**
 * @fileoverview Waickoff MCP Server - Startup Error Suppression
 * @description Complete MCP SDK error suppression wrapper
 * @version 1.3.5
 * @author Waickoff MCP Team
 */

// ========================================================================
// CRITICAL: SUPPRESS ALL MCP SDK ERRORS BEFORE ANY MODULE LOADING
// ========================================================================

// Capture original console functions immediately
const _originalError = console.error;
const _originalWarn = console.warn;
const _originalInfo = console.info;
const _originalLog = console.log;
const _originalDebug = console.debug;

// Create error suppression patterns
const ERROR_PATTERNS = [
  'Expected \',\' or \']\' after array element in JSON at position 5',
  'Unexpected token',
  'is not valid JSON',
  '[MCP] Conso',
  'JSON at position',
  'SyntaxError: Unexpected token',
  'JSON.parse',
  'WAICKOFF',
  'waickof',
  'System S',
  'operational',
  '==========',
  'v1.3.5',
  'Node',
  'PID:',
  'Status:',
  'Server',
  '🎆',
  '✅',
  '🚀',
  '📊',
  '🔄',
  '🚨'
];

// Universal error checker
function shouldSuppressMessage(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  return ERROR_PATTERNS.some(pattern => message.includes(pattern));
}

// Complete console override - executed IMMEDIATELY
console.error = function(...args) {
  const message = String(args[0] || '');
  if (shouldSuppressMessage(message)) {
    // Completely suppress MCP SDK JSON errors
    return;
  }
  _originalError.apply(console, args);
};

console.warn = function(...args) {
  const message = String(args[0] || '');
  if (shouldSuppressMessage(message)) {
    // Suppress JSON warnings
    return;
  }
  _originalWarn.apply(console, args);
};

// Silent mode for first 5 seconds
let startupComplete = false;

console.info = function(...args) {
  if (startupComplete) {
    _originalInfo.apply(console, args);
  }
  // Suppress all info during startup
};

console.log = function(...args) {
  if (startupComplete) {
    _originalLog.apply(console, args);
  }
  // Suppress all logging during startup
};

console.debug = function(...args) {
  if (startupComplete) {
    _originalDebug.apply(console, args);
  }
  // Suppress all debug during startup
};

// Enable normal logging after extended startup period
setTimeout(() => {
  startupComplete = true;
  // Silent activation to prevent any interference
}, 15000); // 15 seconds to ensure complete MCP initialization

// ========================================================================
// NOW LOAD THE ACTUAL APPLICATION
// ========================================================================

import { MarketAnalysisEngine } from './core/engine.js';
import { MCPAdapter } from './adapters/mcp.js';
import { SystemConfig } from './types/index.js';
import { FileLogger } from './utils/fileLogger.js';
import { HybridStorageService } from './services/storage/hybridStorageService.js';
import * as path from 'path';

/**
 * Main application class
 */
class BybitMCPServer {
  private logger: FileLogger;
  private engine: MarketAnalysisEngine;
  private mcpAdapter: MCPAdapter;
  private hybridStorage?: HybridStorageService;

  constructor() {
    this.logger = new FileLogger('BybitMCPServer', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10
    });
    
    // Minimal logging during MCP initialization to prevent JSON interference
    // Full logging will be enabled after MCP is ready
    
    // Initialize system configuration
    const config: Partial<SystemConfig> = {
      api: {
        baseUrl: process.env.BYBIT_API_URL || 'https://api.bybit.com',
        timeout: parseInt(process.env.API_TIMEOUT || '10000'),
        retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3')
      },
      analysis: {
        defaultSensitivity: parseInt(process.env.ANALYSIS_SENSITIVITY || '2'),
        defaultPeriods: parseInt(process.env.ANALYSIS_PERIODS || '100'),
        volumeThresholdMultiplier: parseFloat(process.env.VOLUME_THRESHOLD || '1.5')
      },
      grid: {
        defaultGridCount: parseInt(process.env.GRID_COUNT || '10'),
        minVolatility: parseFloat(process.env.MIN_VOLATILITY || '3'),
        maxVolatility: parseFloat(process.env.MAX_VOLATILITY || '20')
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        enablePerformanceTracking: process.env.ENABLE_PERFORMANCE_TRACKING !== 'false'
      }
    };

    // Initialize Hybrid Storage if MongoDB is available (TASK-015)
    try {
      const mongoConnectionString = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017';
      this.hybridStorage = new HybridStorageService({
        strategy: 'smart_routing',
        fallbackEnabled: true,
        syncEnabled: false,
        mongoTimeoutMs: 5000,
        performanceTracking: true
      });
      // Silent initialization - will log success later
    } catch (error) {
      // Silent MongoDB initialization failure - will use file storage only
      this.hybridStorage = undefined;
    }

    // Initialize core engine with optional hybrid storage
    this.engine = new MarketAnalysisEngine(
      config,
      undefined, // marketDataService - use default
      undefined, // analysisService - use default
      undefined, // tradingService - use default
      undefined, // cacheManager - use default
      undefined, // timezoneConfig - use default
      undefined, // configurationManager - use default
      this.hybridStorage // hybridStorageService - TASK-015
    );
    
    // Initialize MCP adapter
    this.mcpAdapter = new MCPAdapter(this.engine);
    
    // Silent initialization - logging will be enabled after MCP is ready
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Completely silent startup - NO output whatsoever
      
      // Silent health check
      try {
        await this.engine.getSystemHealth();
      } catch (healthError) {
        // Silent error handling
      }
      
      // Start MCP adapter silently
      await this.mcpAdapter.run();
      
      // NO LOGGING WHATSOEVER during startup - MCP SDK parses everything as JSON
      // Only log after extended delay when MCP is completely ready
      setTimeout(() => {
        // Simple, minimal status message
        _originalInfo('waickoff MCP Server v1.6.0 operational');
        
        // Log Hybrid Storage status
        if (this.hybridStorage) {
          _originalInfo('🗃️ Hybrid Storage (MongoDB + File) enabled');
        } else {
          _originalInfo('📁 File Storage only (MongoDB not available)');
        }
      }, 10000); // 10 seconds to ensure MCP is completely done
      
    } catch (error) {
      // Only critical startup failures use original error logging
      _originalError('CRITICAL: waickoff MCP Server failed to start:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Use original console functions for shutdown logging
    _originalInfo('Shutting down waickoff MCP Server...');
    
    // Get final performance metrics
    const metrics = this.engine.getPerformanceMetrics();
    const totalRequests = Object.values(metrics).reduce((sum, serviceMetrics) => sum + serviceMetrics.length, 0);
    
    _originalInfo(`Session Summary: ${totalRequests} requests processed`);
    _originalInfo('waickoff MCP Server shutdown complete');
  }
}

// Handle process signals for graceful shutdown
const server = new BybitMCPServer();

process.on('SIGINT', async () => {
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.shutdown();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  _originalError('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  _originalError('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
server.start().catch((error) => {
  _originalError('FATAL: Failed to start waickoff MCP Server:', error);
  process.exit(1);
});