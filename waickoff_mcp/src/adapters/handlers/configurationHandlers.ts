/**
 * @fileoverview Configuration Handlers for MCP Tools
 * @description Specialized handlers for user configuration management
 * @version 1.0.0
 */

import {
  UserConfig,
  UserTimezoneConfig,
  UserTradingConfig,
  UserDisplayConfig,
  TimezoneDetectionResult,
  ConfigurationManager,
  MCPServerResponse
} from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class ConfigurationHandlers {
  private readonly logger: FileLogger;
  private readonly configManager: ConfigurationManager;

  constructor(configManager: ConfigurationManager) {
    this.logger = new FileLogger('ConfigurationHandlers', 'info');
    this.configManager = configManager;
  }

  // ====================
  // USER CONFIG HANDLERS
  // ====================

  /**
   * Get current user configuration
   */
  async handleGetUserConfig(): Promise<MCPServerResponse> {
    try {
      this.logger.info('🔥 INCOMING REQUEST: getUserConfig');

      const config = await this.configManager.getUserConfig();

      this.logger.info('✅ COMPLETED: getUserConfig', {
        timezone: config.timezone.default,
        version: config.version
      });

      return this.createSuccessResponse(config);

    } catch (error) {
      this.logger.error('❌ FAILED: getUserConfig:', error);
      return this.createErrorResponse('get_user_config', error as Error);
    }
  }

  /**
   * Set user timezone
   */
  async handleSetUserTimezone(args: {
    timezone: string;
    autoDetect?: boolean;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('🔥 INCOMING REQUEST: setUserTimezone', args);

      const { timezone, autoDetect = false } = args;

      if (!timezone) {
        throw new Error('Timezone is required');
      }

      const config = await this.configManager.setUserTimezone(timezone, autoDetect);

      this.logger.info('✅ COMPLETED: setUserTimezone', {
        newTimezone: timezone,
        autoDetect
      });

      const formattedResponse = {
        success: true,
        timezone_updated: timezone,
        auto_detect_enabled: autoDetect,
        config_updated: config.updatedAt,
        message: `Timezone successfully updated to ${timezone}`
      };

      return this.createSuccessResponse(formattedResponse);

    } catch (error) {
      this.logger.error('❌ FAILED: setUserTimezone:', error);
      return this.createErrorResponse('set_user_timezone', error as Error);
    }
  }

  /**
   * Detect system timezone
   */
  async handleDetectTimezone(): Promise<MCPServerResponse> {
    try {
      this.logger.info('🔥 INCOMING REQUEST: detectTimezone');

      const detection = await this.configManager.detectTimezone();

      this.logger.info('✅ COMPLETED: detectTimezone', {
        detected: detection.detected,
        method: detection.method,
        confidence: detection.confidence
      });

      const formattedDetection = {
        detected_timezone: detection.detected,
        detection_method: detection.method,
        confidence_percent: `${detection.confidence}%`,
        fallback_timezone: detection.fallback,
        recommendation: detection.confidence > 80 ?
          `High confidence detection. Recommend using ${detection.detected}` :
          `Low confidence detection. Consider manually setting timezone`,
        supported_timezones: [
          'UTC',
          'America/New_York',
          'America/Chicago', 
          'America/Denver',
          'America/Los_Angeles',
          'America/Mexico_City',
          'Europe/London',
          'Europe/Paris',
          'Asia/Tokyo',
          'Asia/Shanghai',
          'Asia/Singapore'
        ]
      };

      return this.createSuccessResponse(formattedDetection);

    } catch (error) {
      this.logger.error('❌ FAILED: detectTimezone:', error);
      return this.createErrorResponse('detect_timezone', error as Error);
    }
  }

  /**
   * Update user configuration
   */
  async handleUpdateConfig(args: {
    timezone?: Partial<UserTimezoneConfig>;
    trading?: Partial<UserTradingConfig>;
    display?: Partial<UserDisplayConfig>;
  }): Promise<MCPServerResponse> {
    try {
      this.logger.info('🔥 INCOMING REQUEST: updateConfig', args);

      const config = await this.configManager.updateConfig(args);

      this.logger.info('✅ COMPLETED: updateConfig', {
        sections: Object.keys(args),
        timezone: config.timezone.default
      });

      const formattedResponse = {
        success: true,
        updated_sections: Object.keys(args),
        current_timezone: config.timezone.default,
        current_timeframe: config.trading.defaultTimeframe,
        updated_at: config.updatedAt,
        config_version: config.version
      };

      return this.createSuccessResponse(formattedResponse);

    } catch (error) {
      this.logger.error('❌ FAILED: updateConfig:', error);
      return this.createErrorResponse('update_config', error as Error);
    }
  }

  /**
   * Reset configuration to defaults
   */
  async handleResetConfig(): Promise<MCPServerResponse> {
    try {
      this.logger.info('🔥 INCOMING REQUEST: resetConfig');

      const config = await this.configManager.resetConfig();

      this.logger.info('✅ COMPLETED: resetConfig', {
        newTimezone: config.timezone.default,
        version: config.version
      });

      const formattedResponse = {
        success: true,
        message: 'Configuration reset to defaults with auto-detection',
        new_timezone: config.timezone.default,
        auto_detect_enabled: config.timezone.autoDetect,
        default_timeframe: config.trading.defaultTimeframe,
        reset_at: config.updatedAt,
        config_version: config.version
      };

      return this.createSuccessResponse(formattedResponse);

    } catch (error) {
      this.logger.error('❌ FAILED: resetConfig:', error);
      return this.createErrorResponse('reset_config', error as Error);
    }
  }

  /**
   * Validate current configuration
   */
  async handleValidateConfig(): Promise<MCPServerResponse> {
    try {
      this.logger.info('🔥 INCOMING REQUEST: validateConfig');

      const validation = await this.configManager.validateConfig();
      const configPath = this.configManager.getConfigPath();
      const configExists = await this.configManager.configExists();

      this.logger.info('✅ COMPLETED: validateConfig', {
        isValid: validation.isValid,
        errorCount: validation.errors.length
      });

      const formattedValidation = {
        validation_status: validation.isValid ? 'VALID' : 'INVALID',
        config_file_exists: configExists,
        config_file_path: configPath,
        error_count: validation.errors.length,
        errors: validation.errors,
        suggestions: validation.suggestions,
        overall_health: validation.isValid ? 'HEALTHY' : 'NEEDS_ATTENTION',
        next_steps: validation.isValid ?
          ['Configuration is valid and ready to use'] :
          ['Fix validation errors', 'Consider running reset_config if needed']
      };

      return this.createSuccessResponse(formattedValidation);

    } catch (error) {
      this.logger.error('❌ FAILED: validateConfig:', error);
      return this.createErrorResponse('validate_config', error as Error);
    }
  }

  /**
   * Get configuration file information
   */
  async handleGetConfigInfo(): Promise<MCPServerResponse> {
    try {
      this.logger.info('🔥 INCOMING REQUEST: getConfigInfo');

      const configPath = this.configManager.getConfigPath();
      const configExists = await this.configManager.configExists();
      const configDir = configPath.replace(/[/\\][^/\\]*$/, '');

      // Common timezones for crypto trading
      const supportedTimezones = [
        'UTC',
        'America/New_York',     // Eastern Time
        'America/Chicago',      // Central Time  
        'America/Denver',       // Mountain Time
        'America/Los_Angeles',  // Pacific Time
        'America/Mexico_City',  // Mexico Central
        'Europe/London',        // GMT/BST
        'Europe/Paris',         // CET/CEST
        'Europe/Moscow',        // MSK
        'Asia/Tokyo',           // JST
        'Asia/Shanghai',        // CST
        'Asia/Singapore',       // SGT
        'Asia/Seoul',           // KST
        'Australia/Sydney',     // AEDT/AEST
      ];

      const supportedTimeframes = ['1', '5', '15', '30', '60', '240', 'D'];

      this.logger.info('✅ COMPLETED: getConfigInfo', {
        configExists,
        timezoneCount: supportedTimezones.length
      });

      const formattedInfo = {
        configuration_system: {
          version: '1.0.0',
          status: 'OPERATIONAL',
          auto_detection_available: true
        },
        file_information: {
          config_file_path: configPath,
          config_directory: configDir,
          file_exists: configExists,
          cross_platform_location: '~/.waickoff/user.config.json'
        },
        supported_options: {
          timezones: supportedTimezones,
          timeframes: supportedTimeframes,
          date_formats: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'ISO'],
          locales: ['en-US', 'es-MX', 'en-GB', 'fr-FR', 'de-DE']
        },
        usage_examples: {
          set_timezone: 'set_user_timezone with timezone: "America/New_York"',
          detect_timezone: 'detect_timezone for automatic detection',
          update_multiple: 'update_config with timezone and trading sections'
        }
      };

      return this.createSuccessResponse(formattedInfo);

    } catch (error) {
      this.logger.error('❌ FAILED: getConfigInfo:', error);
      return this.createErrorResponse('get_config_info', error as Error);
    }
  }

  // ====================
  // HELPER METHODS
  // ====================

  private createSuccessResponse(data: any): MCPServerResponse {
    // Ensure clean JSON serialization without complex objects
    let cleanData: any;
    
    try {
      // Convert to JSON and back to ensure clean serialization
      const jsonString = JSON.stringify(data, (key, value) => {
        // Filter out potentially problematic values
        if (typeof value === 'function' || value === undefined) {
          return '[FILTERED]';
        }
        if (typeof value === 'object' && value !== null) {
          // Ensure objects are plain and serializable
          if (value.constructor !== Object && value.constructor !== Array) {
            return '[COMPLEX_OBJECT]';
          }
        }
        return value;
      });
      
      cleanData = JSON.parse(jsonString);
    } catch (error) {
      // Fallback to simple string representation
      cleanData = { result: 'Data serialization error', data: String(data) };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(cleanData, null, 2)
      }]
    };
  }

  private createErrorResponse(toolName: string, error: Error): MCPServerResponse {
    this.logger.error(`Tool ${toolName} failed:`, error);
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error.message}`
      }]
    };
  }
}
