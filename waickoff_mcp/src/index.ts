#!/usr/bin/env node

/**
 * @fileoverview Bybit MCP Server - Modular Market Analysis System
 * @description Entry point for the modular Bybit MCP server
 * @version 1.3.0
 * @author Bybit MCP Team
 */

// Suppress known MCP SDK JSON parsing errors during startup
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;
const originalConsoleLog = console.log;
const originalConsoleDebug = console.debug;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  
  // Suppress specific MCP SDK errors that don't affect functionality
  if (message.includes('Expected \',\' or \']\' after array element in JSON at position 5')) {
    // Log as debug instead for troubleshooting
    console.debug('[SUPPRESSED MCP SDK ISSUE]', ...args);
    return;
  }
  
  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

// Suppress all console output during MCP initialization to avoid JSON parsing issues
let mcpInitializationComplete = false;

const suppressDuringInit = (originalFn: Function) => {
  return (...args: any[]) => {
    if (mcpInitializationComplete) {
      originalFn.apply(console, args);
    }
    // During initialization, suppress all output to avoid MCP SDK JSON parsing issues
  };
};

// Temporarily suppress console output during initialization
console.info = suppressDuringInit(originalConsoleInfo);
console.log = suppressDuringInit(originalConsoleLog);
console.debug = suppressDuringInit(originalConsoleDebug);
console.warn = suppressDuringInit(originalConsoleWarn);

// Restore console output after MCP is running
setTimeout(() => {
  mcpInitializationComplete = true;
  console.info = originalConsoleInfo;
  console.log = originalConsoleLog;
  console.debug = originalConsoleDebug;
  console.warn = originalConsoleWarn;
  console.info('[MCP] Console output restored after initialization');
}, 2000); // Give 2 seconds for MCP initialization

import { MarketAnalysisEngine } from './core/engine.js';
import { MCPAdapter } from './adapters/mcp.js';
import { SystemConfig } from './types/index.js';
import { FileLogger } from './utils/fileLogger.js';
import * as path from 'path';

/**
 * Main application class
 */
class BybitMCPServer {
  private logger: FileLogger;
  private engine: MarketAnalysisEngine;
  private mcpAdapter: MCPAdapter;

  constructor() {
    this.logger = new FileLogger('BybitMCPServer', 'info', {
      logDir: path.join(process.cwd(), 'logs'),
      enableStackTrace: true,
      enableRotation: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10
    });
    
    // Log system startup info with simple strings
    this.logger.info('================================================================================');
    this.logger.info('🚀 BYBIT MCP SERVER v1.3.2 - SISTEMA DE LOGGING AVANZADO');
    this.logger.info('================================================================================');
    this.logger.info(`Sistema iniciando: Node ${process.version} on ${process.platform}`);
    this.logger.info(`Working directory: ${process.cwd()}`);
    this.logger.info(`Process ID: ${process.pid}`);
    this.logger.info(`Architecture: ${process.arch}`);
    
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

    // Initialize core engine
    this.engine = new MarketAnalysisEngine(config);
    
    // Initialize MCP adapter
    this.mcpAdapter = new MCPAdapter(this.engine);
    
    this.logger.info('Bybit MCP Server v1.3.0 initialized with modular architecture');
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Bybit MCP Server...');
      
      // Perform health check (non-blocking)
      try {
        const health = await this.engine.getSystemHealth();
        this.logger.info(`System health: ${health.status.toUpperCase()}`);
        
        if (health.status === 'unhealthy') {
          this.logger.warn('System health check indicates issues, but continuing startup...');
        }
      } catch (healthError) {
        this.logger.warn('Health check failed during startup, but continuing...', healthError);
      }
      
      // Start MCP adapter
      await this.mcpAdapter.run();
      
      this.logger.info('Bybit MCP Server is running and ready for connections');
      
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Bybit MCP Server...');
    
    // Get final performance metrics
    const metrics = this.engine.getPerformanceMetrics();
    const totalRequests = Object.values(metrics).reduce((sum, serviceMetrics) => sum + serviceMetrics.length, 0);
    
    this.logger.info(`Server processed ${totalRequests} requests during this session`);
    this.logger.info('Bybit MCP Server shutdown complete');
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
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});