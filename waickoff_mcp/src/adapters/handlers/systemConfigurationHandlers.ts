/**
 * @fileoverview System Configuration Handlers for MCP
 * @description Handlers for environment configuration and system settings
 * @version 1.0.0
 */

import { MCPServerResponse } from '../../types/index.js';
import { EnvironmentConfig, environmentConfig } from '../../services/config/environmentConfig.js';
import { FileLogger } from '../../utils/fileLogger.js';

// ====================
// SYSTEM CONFIGURATION HANDLERS
// ====================

export class SystemConfigurationHandlers {
  private readonly logger: FileLogger;
  private readonly envConfig: EnvironmentConfig;

  constructor(envConfig?: EnvironmentConfig) {
    this.logger = new FileLogger('SystemConfigurationHandlers', 'info');
    this.envConfig = envConfig || environmentConfig;
    
    this.logger.info('System Configuration Handlers initialized');
  }

  // ====================
  // ENVIRONMENT CONFIGURATION HANDLERS
  // ====================

  /**
   * Get complete system configuration
   */
  async handleGetSystemConfig(): Promise<MCPServerResponse> {
    try {
      const config = this.envConfig.getSystemConfig();
      const envVars = this.envConfig.getAppEnvironmentVariables();
      
      return this.formatSuccessResponse({
        config,
        environment: {
          envFile: this.envConfig.getEnvFilePath(),
          hasEnvFile: this.envConfig.hasEnvFile(),
          variables: envVars
        },
        info: {
          description: 'Complete system configuration from environment variables',
          envFileLocation: this.envConfig.getEnvFilePath()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get system config:', error);
      return this.formatErrorResponse(`Failed to get system configuration: ${error}`);
    }
  }

  /**
   * Get MongoDB configuration
   */
  async handleGetMongoConfig(): Promise<MCPServerResponse> {
    try {
      const connectionString = this.envConfig.getMongoConnectionString();
      const isConfigured = this.envConfig.isMongoConfigured();
      
      return this.formatSuccessResponse({
        mongodb: {
          configured: isConfigured,
          connectionString: connectionString ? '[SET]' : '[NOT SET]',
          status: isConfigured ? 'ready' : 'not_configured'
        },
        info: {
          description: 'MongoDB connection configuration status',
          envVariable: 'MONGODB_CONNECTION_STRING',
          required: false,
          note: 'MongoDB features are optional and will be disabled if not configured'
        }
      });

    } catch (error) {
      this.logger.error('Failed to get MongoDB config:', error);
      return this.formatErrorResponse(`Failed to get MongoDB configuration: ${error}`);
    }
  }

  /**
   * Get API configuration
   */
  async handleGetApiConfig(): Promise<MCPServerResponse> {
    try {
      const apiConfig = this.envConfig.getApiConfig();
      
      return this.formatSuccessResponse({
        api: apiConfig,
        info: {
          description: 'API configuration for external services',
          variables: {
            BYBIT_API_URL: 'Bybit API base URL',
            API_TIMEOUT: 'Request timeout in milliseconds',
            API_RETRY_ATTEMPTS: 'Number of retry attempts for failed requests'
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get API config:', error);
      return this.formatErrorResponse(`Failed to get API configuration: ${error}`);
    }
  }

  /**
   * Get analysis configuration
   */
  async handleGetAnalysisConfig(): Promise<MCPServerResponse> {
    try {
      const analysisConfig = this.envConfig.getAnalysisConfig();
      
      return this.formatSuccessResponse({
        analysis: analysisConfig,
        info: {
          description: 'Technical analysis configuration parameters',
          variables: {
            ANALYSIS_SENSITIVITY: 'Sensitivity for pivot detection (1-5)',
            ANALYSIS_PERIODS: 'Number of periods to analyze',
            VOLUME_THRESHOLD: 'Volume spike threshold multiplier'
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get analysis config:', error);
      return this.formatErrorResponse(`Failed to get analysis configuration: ${error}`);
    }
  }

  /**
   * Get grid trading configuration
   */
  async handleGetGridConfig(): Promise<MCPServerResponse> {
    try {
      const gridConfig = this.envConfig.getGridConfig();
      
      return this.formatSuccessResponse({
        grid: gridConfig,
        info: {
          description: 'Grid trading configuration parameters',
          variables: {
            GRID_COUNT: 'Default number of grid levels',
            MIN_VOLATILITY: 'Minimum volatility for grid trading (%)',
            MAX_VOLATILITY: 'Maximum volatility for grid trading (%)'
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get grid config:', error);
      return this.formatErrorResponse(`Failed to get grid configuration: ${error}`);
    }
  }

  /**
   * Get logging configuration
   */
  async handleGetLoggingConfig(): Promise<MCPServerResponse> {
    try {
      const loggingConfig = this.envConfig.getLoggingConfig();
      
      return this.formatSuccessResponse({
        logging: loggingConfig,
        info: {
          description: 'Logging and monitoring configuration',
          variables: {
            LOG_LEVEL: 'Logging level (debug, info, warn, error)',
            ENABLE_PERFORMANCE_TRACKING: 'Enable performance metrics collection'
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get logging config:', error);
      return this.formatErrorResponse(`Failed to get logging configuration: ${error}`);
    }
  }

  /**
   * Validate environment configuration
   */
  async handleValidateEnvConfig(): Promise<MCPServerResponse> {
    try {
      const validation = this.envConfig.validateConfig();
      
      return this.formatSuccessResponse({
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length
        },
        recommendations: validation.isValid ? 
          ['Configuration is valid and ready to use'] : 
          ['Fix the validation errors before proceeding', 'Check .env file format and values'],
        info: {
          description: 'Environment configuration validation results',
          envFile: this.envConfig.getEnvFilePath(),
          hasEnvFile: this.envConfig.hasEnvFile()
        }
      });

    } catch (error) {
      this.logger.error('Failed to validate env config:', error);
      return this.formatErrorResponse(`Failed to validate environment configuration: ${error}`);
    }
  }

  /**
   * Reload environment configuration
   */
  async handleReloadEnvConfig(): Promise<MCPServerResponse> {
    try {
      const config = this.envConfig.reload();
      
      return this.formatSuccessResponse({
        config,
        status: 'reloaded',
        timestamp: new Date().toISOString(),
        info: {
          description: 'Environment configuration reloaded from .env file',
          envFile: this.envConfig.getEnvFilePath()
        }
      });

    } catch (error) {
      this.logger.error('Failed to reload env config:', error);
      return this.formatErrorResponse(`Failed to reload environment configuration: ${error}`);
    }
  }

  /**
   * Get environment file information
   */
  async handleGetEnvFileInfo(): Promise<MCPServerResponse> {
    try {
      const envFilePath = this.envConfig.getEnvFilePath();
      const hasEnvFile = this.envConfig.hasEnvFile();
      const envVars = this.envConfig.getAppEnvironmentVariables();
      
      // Count configured variables
      const configuredVars = Object.entries(envVars).filter(([_, value]) => value !== undefined);
      const totalVars = Object.keys(envVars).length;
      
      return this.formatSuccessResponse({
        envFile: {
          path: envFilePath,
          exists: hasEnvFile,
          status: hasEnvFile ? 'found' : 'not_found'
        },
        variables: {
          total: totalVars,
          configured: configuredVars.length,
          configurationRate: Math.round((configuredVars.length / totalVars) * 100),
          list: envVars
        },
        template: {
          description: 'Sample .env file content',
          content: this.generateEnvTemplate()
        },
        info: {
          description: 'Environment file information and configuration status',
          recommendation: hasEnvFile ? 
            'Environment file found and loaded' : 
            'Create .env file in project root for custom configuration'
        }
      });

    } catch (error) {
      this.logger.error('Failed to get env file info:', error);
      return this.formatErrorResponse(`Failed to get environment file information: ${error}`);
    }
  }

  // ====================
  // HELPER METHODS
  // ====================

  /**
   * Format success response
   */
  private formatSuccessResponse(data: any): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          data
        }, null, 2)
      }]
    };
  }

  /**
   * Format error response
   */
  private formatErrorResponse(error: string): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  /**
   * Generate .env file template
   */
  private generateEnvTemplate(): string {
    return `# MongoDB Configuration
MONGODB_CONNECTION_STRING=mongodb://localhost:27017

# API Configuration  
BYBIT_API_URL=https://api.bybit.com
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3

# Analysis Configuration
ANALYSIS_SENSITIVITY=2
ANALYSIS_PERIODS=100
VOLUME_THRESHOLD=1.5

# Grid Configuration
GRID_COUNT=10
MIN_VOLATILITY=3
MAX_VOLATILITY=20

# Logging Configuration
LOG_LEVEL=info
ENABLE_PERFORMANCE_TRACKING=true`;
  }
}