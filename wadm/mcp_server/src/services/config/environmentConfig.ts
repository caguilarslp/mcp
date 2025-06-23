/**
 * @fileoverview Environment Configuration Service
 * @description Manages system configuration from environment variables and .env file
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { SystemConfig } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

// ====================
// ENVIRONMENT CONFIGURATION SERVICE
// ====================

export class EnvironmentConfig {
  private readonly logger: FileLogger;
  private config: SystemConfig | null = null;
  private envFilePath: string;

  constructor() {
    this.logger = new FileLogger('EnvironmentConfig', 'info');
    
    // Find project root and .env file
    this.envFilePath = this.findEnvFile();
    
    // Load .env file if it exists
    this.loadEnvFile();
    
    this.logger.info('Environment Configuration initialized', {
      envFile: this.envFilePath,
      envFileExists: fs.existsSync(this.envFilePath)
    });
  }

  // ====================
  // PUBLIC API METHODS
  // ====================

  /**
   * Get system configuration with environment variables
   */
  getSystemConfig(): SystemConfig {
    if (this.config) {
      return this.config;
    }

    this.config = this.buildSystemConfig();
    return this.config;
  }

  /**
   * Get MongoDB connection string
   */
  getMongoConnectionString(): string | undefined {
    return process.env.MONGODB_CONNECTION_STRING;
  }

  /**
   * Check if MongoDB is configured
   */
  isMongoConfigured(): boolean {
    return Boolean(process.env.MONGODB_CONNECTION_STRING);
  }

  /**
   * Get API configuration
   */
  getApiConfig(): SystemConfig['api'] {
    return {
      baseUrl: process.env.BYBIT_API_URL || 'https://api.bybit.com',
      timeout: parseInt(process.env.API_TIMEOUT || '10000', 10),
      retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10)
    };
  }

  /**
   * Get analysis configuration
   */
  getAnalysisConfig(): SystemConfig['analysis'] {
    return {
      defaultSensitivity: parseInt(process.env.ANALYSIS_SENSITIVITY || '2', 10),
      defaultPeriods: parseInt(process.env.ANALYSIS_PERIODS || '100', 10),
      volumeThresholdMultiplier: parseFloat(process.env.VOLUME_THRESHOLD || '1.5')
    };
  }

  /**
   * Get grid trading configuration
   */
  getGridConfig(): SystemConfig['grid'] {
    return {
      defaultGridCount: parseInt(process.env.GRID_COUNT || '10', 10),
      minVolatility: parseInt(process.env.MIN_VOLATILITY || '3', 10),
      maxVolatility: parseInt(process.env.MAX_VOLATILITY || '20', 10)
    };
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig(): SystemConfig['logging'] {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const validLevels = ['debug', 'info', 'warn', 'error'];
    
    return {
      level: validLevels.includes(logLevel) ? logLevel as 'debug' | 'info' | 'warn' | 'error' : 'info',
      enablePerformanceTracking: process.env.ENABLE_PERFORMANCE_TRACKING?.toLowerCase() === 'true'
    };
  }

  /**
   * Reload environment configuration
   */
  reload(): SystemConfig {
    this.loadEnvFile();
    this.config = null;
    return this.getSystemConfig();
  }

  /**
   * Get environment file path
   */
  getEnvFilePath(): string {
    return this.envFilePath;
  }

  /**
   * Check if .env file exists
   */
  hasEnvFile(): boolean {
    return fs.existsSync(this.envFilePath);
  }

  /**
   * Get all environment variables related to the application
   */
  getAppEnvironmentVariables(): Record<string, string | undefined> {
    return {
      // MongoDB
      MONGODB_CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
      
      // API Configuration
      BYBIT_API_URL: process.env.BYBIT_API_URL,
      API_TIMEOUT: process.env.API_TIMEOUT,
      API_RETRY_ATTEMPTS: process.env.API_RETRY_ATTEMPTS,
      
      // Analysis Configuration
      ANALYSIS_SENSITIVITY: process.env.ANALYSIS_SENSITIVITY,
      ANALYSIS_PERIODS: process.env.ANALYSIS_PERIODS,
      VOLUME_THRESHOLD: process.env.VOLUME_THRESHOLD,
      
      // Grid Configuration
      GRID_COUNT: process.env.GRID_COUNT,
      MIN_VOLATILITY: process.env.MIN_VOLATILITY,
      MAX_VOLATILITY: process.env.MAX_VOLATILITY,
      
      // Logging Configuration
      LOG_LEVEL: process.env.LOG_LEVEL,
      ENABLE_PERFORMANCE_TRACKING: process.env.ENABLE_PERFORMANCE_TRACKING
    };
  }

  /**
   * Validate environment configuration
   */
  validateConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate MongoDB connection string format
      if (process.env.MONGODB_CONNECTION_STRING) {
        const mongoUrl = process.env.MONGODB_CONNECTION_STRING;
        if (!mongoUrl.startsWith('mongodb://') && !mongoUrl.startsWith('mongodb+srv://')) {
          errors.push('MONGODB_CONNECTION_STRING must start with mongodb:// or mongodb+srv://');
        }
      } else {
        warnings.push('MONGODB_CONNECTION_STRING not set - MongoDB features will be disabled');
      }

      // Validate API URL
      const apiUrl = process.env.BYBIT_API_URL;
      if (apiUrl && !apiUrl.startsWith('https://')) {
        warnings.push('BYBIT_API_URL should use HTTPS for security');
      }

      // Validate numeric values
      const numericVars = {
        API_TIMEOUT: process.env.API_TIMEOUT,
        API_RETRY_ATTEMPTS: process.env.API_RETRY_ATTEMPTS,
        ANALYSIS_SENSITIVITY: process.env.ANALYSIS_SENSITIVITY,
        ANALYSIS_PERIODS: process.env.ANALYSIS_PERIODS,
        GRID_COUNT: process.env.GRID_COUNT,
        MIN_VOLATILITY: process.env.MIN_VOLATILITY,
        MAX_VOLATILITY: process.env.MAX_VOLATILITY
      };

      for (const [key, value] of Object.entries(numericVars)) {
        if (value && isNaN(Number(value))) {
          errors.push(`${key} must be a valid number, got: ${value}`);
        }
      }

      // Validate VOLUME_THRESHOLD (should be a float)
      if (process.env.VOLUME_THRESHOLD && isNaN(parseFloat(process.env.VOLUME_THRESHOLD))) {
        errors.push(`VOLUME_THRESHOLD must be a valid number, got: ${process.env.VOLUME_THRESHOLD}`);
      }

      // Validate LOG_LEVEL
      const logLevel = process.env.LOG_LEVEL;
      const validLogLevels = ['debug', 'info', 'warn', 'error'];
      if (logLevel && !validLogLevels.includes(logLevel)) {
        errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}, got: ${logLevel}`);
      }

      // Validate boolean values
      const booleanVars = {
        ENABLE_PERFORMANCE_TRACKING: process.env.ENABLE_PERFORMANCE_TRACKING
      };

      for (const [key, value] of Object.entries(booleanVars)) {
        if (value && !['true', 'false'].includes(value.toLowerCase())) {
          warnings.push(`${key} should be 'true' or 'false', got: ${value}`);
        }
      }

      // Validate ranges
      const minVol = parseInt(process.env.MIN_VOLATILITY || '3', 10);
      const maxVol = parseInt(process.env.MAX_VOLATILITY || '20', 10);
      if (minVol >= maxVol) {
        errors.push('MIN_VOLATILITY must be less than MAX_VOLATILITY');
      }

      // Check .env file existence
      if (!this.hasEnvFile()) {
        warnings.push('.env file not found - using default values and system environment variables');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Configuration validation failed: ${error}`],
        warnings
      };
    }
  }

  // ====================
  // PRIVATE METHODS
  // ====================

  /**
   * Find .env file starting from current directory up to project root
   */
  private findEnvFile(): string {
    let currentDir = process.cwd();
    const maxDepth = 10; // Prevent infinite loops
    
    for (let i = 0; i < maxDepth; i++) {
      const envPath = path.join(currentDir, '.env');
      
      if (fs.existsSync(envPath)) {
        return envPath;
      }
      
      // Check if we've reached the root directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // We've reached the root
      }
      
      currentDir = parentDir;
    }
    
    // If not found, return default path in current directory
    return path.join(process.cwd(), '.env');
  }

  /**
   * Load .env file and set environment variables
   */
  private loadEnvFile(): void {
    if (!fs.existsSync(this.envFilePath)) {
      this.logger.warn('.env file not found:', this.envFilePath);
      return;
    }

    try {
      const envContent = fs.readFileSync(this.envFilePath, 'utf-8');
      const lines = envContent.split('\n');
      
      let loadedVars = 0;
      
      for (const line of lines) {
        // Skip empty lines and comments
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }
        
        // Parse KEY=VALUE format
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex === -1) {
          continue;
        }
        
        const key = trimmedLine.slice(0, equalIndex).trim();
        const value = trimmedLine.slice(equalIndex + 1).trim();
        
        // Only set if not already defined in process.env
        if (!process.env[key]) {
          process.env[key] = value;
          loadedVars++;
        }
      }
      
      this.logger.info(`Loaded ${loadedVars} environment variables from .env file`);
      
    } catch (error) {
      this.logger.error('Failed to load .env file:', error);
    }
  }

  /**
   * Build complete system configuration
   */
  private buildSystemConfig(): SystemConfig {
    return {
      api: this.getApiConfig(),
      analysis: this.getAnalysisConfig(),
      grid: this.getGridConfig(),
      logging: this.getLoggingConfig()
    };
  }
}

// Export singleton instance
export const environmentConfig = new EnvironmentConfig();
