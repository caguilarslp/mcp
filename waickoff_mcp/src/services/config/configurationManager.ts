/**
 * @fileoverview Configuration Manager for User Settings
 * @description Manages persistent user configuration including timezone settings
 * @version 1.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FileLogger } from '../../utils/fileLogger.js';

// ====================
// TYPES
// ====================

export interface UserTimezoneConfig {
  default: string;
  autoDetect: boolean;
  preferredSessions?: string[];
}

export interface UserTradingConfig {
  defaultTimeframe: string;
  alertTimes?: string[];
}

export interface UserDisplayConfig {
  dateFormat: string;
  use24Hour: boolean;
  locale: string;
}

export interface UserConfig {
  timezone: UserTimezoneConfig;
  trading: UserTradingConfig;
  display: UserDisplayConfig;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimezoneDetectionResult {
  detected: string;
  method: 'system' | 'env' | 'intl' | 'default';
  confidence: number;
  fallback: string;
}

// ====================
// CONFIGURATION MANAGER SERVICE
// ====================

export class ConfigurationManager {
  private readonly logger: FileLogger;
  private readonly configDir: string;
  private readonly configFile: string;
  private cachedConfig: UserConfig | null = null;

  constructor() {
    this.logger = new FileLogger('ConfigurationManager', 'info');
    
    // Use ~/.waickoff directory for cross-platform compatibility
    this.configDir = path.join(os.homedir(), '.waickoff');
    this.configFile = path.join(this.configDir, 'user.config.json');
    
    this.logger.info('Configuration Manager initialized', {
      configDir: this.configDir,
      configFile: this.configFile
    });
  }

  // ====================
  // PUBLIC API METHODS
  // ====================

  /**
   * Get user configuration (loads from file or creates default)
   */
  async getUserConfig(): Promise<UserConfig> {
    try {
      // Return cached config if available
      if (this.cachedConfig) {
        return this.cachedConfig;
      }

      // Try to load from file
      const config = await this.loadConfigFromFile();
      if (config) {
        this.cachedConfig = config;
        return config;
      }

      // Create default config with auto-detection
      const defaultConfig = await this.createDefaultConfig();
      await this.saveConfig(defaultConfig);
      
      this.cachedConfig = defaultConfig;
      return defaultConfig;

    } catch (error) {
      this.logger.error('Failed to get user config:', error);
      
      // Return emergency fallback config
      return this.getEmergencyFallbackConfig();
    }
  }

  /**
   * Update user timezone
   */
  async setUserTimezone(
    timezone: string, 
    autoDetect: boolean = false
  ): Promise<UserConfig> {
    try {
      const config = await this.getUserConfig();
      
      // Validate timezone
      if (!this.isValidTimezone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }

      // Update timezone config
      config.timezone.default = timezone;
      config.timezone.autoDetect = autoDetect;
      config.updatedAt = new Date().toISOString();

      // Save and cache
      await this.saveConfig(config);
      this.cachedConfig = config;

      this.logger.info(`Timezone updated to ${timezone}`, {
        autoDetect,
        updatedAt: config.updatedAt
      });

      return config;

    } catch (error) {
      this.logger.error('Failed to set user timezone:', error);
      throw error;
    }
  }

  /**
   * Auto-detect system timezone with multiple methods
   */
  async detectTimezone(): Promise<TimezoneDetectionResult> {
    const fallback = 'America/Mexico_City';

    try {
      // Method 1: Environment variable TZ
      if (process.env.TZ) {
        const tz = process.env.TZ;
        if (this.isValidTimezone(tz)) {
          this.logger.info(`Timezone detected from TZ environment variable: ${tz}`);
          return {
            detected: tz,
            method: 'env',
            confidence: 95,
            fallback
          };
        }
      }

      // Method 2: Intl API (Node.js/Browser)
      try {
        const intlTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (intlTimezone && this.isValidTimezone(intlTimezone)) {
          this.logger.info(`Timezone detected from Intl API: ${intlTimezone}`);
          return {
            detected: intlTimezone,
            method: 'intl',
            confidence: 90,
            fallback
          };
        }
      } catch (intlError) {
        this.logger.warn('Intl API detection failed:', intlError);
      }

      // Method 3: System-specific detection
      const systemTimezone = await this.detectSystemTimezone();
      if (systemTimezone && this.isValidTimezone(systemTimezone)) {
        this.logger.info(`Timezone detected from system: ${systemTimezone}`);
        return {
          detected: systemTimezone,
          method: 'system',
          confidence: 85,
          fallback
        };
      }

      // Fallback
      this.logger.warn('Unable to detect timezone, using fallback');
      return {
        detected: fallback,
        method: 'default',
        confidence: 50,
        fallback
      };

    } catch (error) {
      this.logger.error('Timezone detection failed:', error);
      return {
        detected: fallback,
        method: 'default',
        confidence: 0,
        fallback
      };
    }
  }

  /**
   * Update multiple config sections
   */
  async updateConfig(updates: {
    timezone?: Partial<UserTimezoneConfig>;
    trading?: Partial<UserTradingConfig>;
    display?: Partial<UserDisplayConfig>;
  }): Promise<UserConfig> {
    try {
      const config = await this.getUserConfig();

      // Update sections
      if (updates.timezone) {
        config.timezone = { ...config.timezone, ...updates.timezone };
      }

      if (updates.trading) {
        config.trading = { ...config.trading, ...updates.trading };
      }

      if (updates.display) {
        config.display = { ...config.display, ...updates.display };
      }

      config.updatedAt = new Date().toISOString();

      // Save and cache
      await this.saveConfig(config);
      this.cachedConfig = config;

      this.logger.info('Configuration updated', { sections: Object.keys(updates) });
      return config;

    } catch (error) {
      this.logger.error('Failed to update config:', error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<UserConfig> {
    try {
      this.cachedConfig = null;
      
      // Delete existing config file
      try {
        await fs.unlink(this.configFile);
        this.logger.info('Existing config file deleted');
      } catch (unlinkError) {
        // File doesn't exist, which is fine
      }

      // Create new default config
      const defaultConfig = await this.createDefaultConfig();
      await this.saveConfig(defaultConfig);
      
      this.cachedConfig = defaultConfig;
      this.logger.info('Configuration reset to defaults');
      
      return defaultConfig;

    } catch (error) {
      this.logger.error('Failed to reset config:', error);
      throw error;
    }
  }

  /**
   * Validate configuration file
   */
  async validateConfig(): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    try {
      const config = await this.getUserConfig();
      const errors: string[] = [];
      const suggestions: string[] = [];

      // Validate timezone
      if (!this.isValidTimezone(config.timezone.default)) {
        errors.push(`Invalid timezone: ${config.timezone.default}`);
        suggestions.push('Run timezone detection to fix');
      }

      // Validate timeframe
      const validTimeframes = ['1', '5', '15', '30', '60', '240', 'D'];
      if (!validTimeframes.includes(config.trading.defaultTimeframe)) {
        errors.push(`Invalid default timeframe: ${config.trading.defaultTimeframe}`);
        suggestions.push(`Use one of: ${validTimeframes.join(', ')}`);
      }

      // Validate date format
      const validDateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'ISO'];
      if (!validDateFormats.includes(config.display.dateFormat)) {
        errors.push(`Invalid date format: ${config.display.dateFormat}`);
      }

      // Validate locale
      try {
        new Intl.DateTimeFormat(config.display.locale);
      } catch {
        errors.push(`Invalid locale: ${config.display.locale}`);
        suggestions.push('Use standard locale codes like en-US, es-MX');
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions
      };

    } catch (error) {
      this.logger.error('Config validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation failed: ${error}`],
        suggestions: ['Reset configuration to defaults']
      };
    }
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configFile;
  }

  /**
   * Check if configuration exists
   */
  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configFile, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  // ====================
  // PRIVATE METHODS
  // ====================

  /**
   * Load configuration from file
   */
  private async loadConfigFromFile(): Promise<UserConfig | null> {
    try {
      await fs.access(this.configFile, fs.constants.F_OK);
      const configData = await fs.readFile(this.configFile, 'utf-8');
      const config = JSON.parse(configData) as UserConfig;

      // Validate basic structure
      if (!config.timezone || !config.timezone.default) {
        throw new Error('Invalid config structure');
      }

      this.logger.info('Configuration loaded from file', {
        version: config.version,
        timezone: config.timezone.default
      });

      return config;

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn('Failed to load config file:', error);
      }
      return null;
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(config: UserConfig): Promise<void> {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });

      // Write config file
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configFile, configData, 'utf-8');

      this.logger.info('Configuration saved to file', {
        file: this.configFile,
        timezone: config.timezone.default
      });

    } catch (error) {
      this.logger.error('Failed to save config:', error);
      throw error;
    }
  }

  /**
   * Create default configuration with auto-detection
   */
  private async createDefaultConfig(): Promise<UserConfig> {
    const detectionResult = await this.detectTimezone();
    const now = new Date().toISOString();

    return {
      timezone: {
        default: detectionResult.detected,
        autoDetect: true,
        preferredSessions: ['ny_session', 'london_ny_overlap']
      },
      trading: {
        defaultTimeframe: '60'
      },
      display: {
        dateFormat: 'DD/MM/YYYY',
        use24Hour: true,
        locale: 'es-MX'
      },
      version: '1.0.0',
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Get emergency fallback configuration
   */
  private getEmergencyFallbackConfig(): UserConfig {
    const now = new Date().toISOString();
    
    return {
      timezone: {
        default: 'America/Mexico_City',
        autoDetect: false
      },
      trading: {
        defaultTimeframe: '60'
      },
      display: {
        dateFormat: 'DD/MM/YYYY',
        use24Hour: true,
        locale: 'es-MX'
      },
      version: '1.0.0',
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Detect timezone using system-specific methods
   */
  private async detectSystemTimezone(): Promise<string | null> {
    try {
      // On Linux: /etc/timezone
      if (process.platform === 'linux') {
        try {
          const timezone = await fs.readFile('/etc/timezone', 'utf-8');
          return timezone.trim();
        } catch {
          // Try alternative method
          try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            const { stdout } = await execAsync('timedatectl show --property=Timezone --value');
            return stdout.trim();
          } catch {
            return null;
          }
        }
      }

      // On macOS: systemsetup command
      if (process.platform === 'darwin') {
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          const { stdout } = await execAsync('systemsetup -gettimezone');
          const match = stdout.match(/Time Zone: (.+)/);
          return match ? match[1].trim() : null;
        } catch {
          return null;
        }
      }

      // On Windows: Use registry or wmic (complex, skip for now)
      if (process.platform === 'win32') {
        // Windows timezone detection is complex
        // For now, rely on Intl API
        return null;
      }

      return null;

    } catch (error) {
      this.logger.warn('System timezone detection failed:', error);
      return null;
    }
  }

  /**
   * Validate timezone string
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      // Use Intl API to validate timezone
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const configurationManager = new ConfigurationManager();
