/**
 * @fileoverview Storage Configuration Service
 * @description Manages storage configuration and validation
 * @module services/storage/storageConfig
 */

import * as path from 'path';
import { StorageConfig } from '../../types/storage.js';
import { Logger } from '../../utils/logger.js';
import { FileSystemService } from './fileSystemService.js';
import { getStoragePath, PROJECT_ROOT } from '../../utils/projectPaths.js';

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: StorageConfig = {
  basePath: getStoragePath(),  // Always relative to project root
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 1024 * 1024 * 1024, // 1GB
  compressionEnabled: false,
  autoCleanupDays: 30
};

/**
 * Service for managing storage configuration
 */
export class StorageConfigService {
  private logger: Logger;
  private fileSystem: FileSystemService;
  private config: StorageConfig;
  private basePath: string;

  constructor(fileSystem: FileSystemService) {
    this.logger = new Logger('StorageConfigService');
    this.fileSystem = fileSystem;
    this.config = { ...DEFAULT_CONFIG };
    // Use the pre-calculated path instead of resolving relative path
    this.basePath = this.config.basePath;
    this.logger.info(`Storage base path: ${this.basePath}`);
  }

  /**
   * Load configuration from file
   */
  async loadConfig(configPath: string): Promise<void> {
    try {
      // Resolve config path relative to project root if it's relative
      const resolvedConfigPath = path.isAbsolute(configPath) 
        ? configPath 
        : path.join(PROJECT_ROOT, configPath);
        
      const configContent = await this.fileSystem.readFile(resolvedConfigPath);
      
      if (configContent) {
        const configData = JSON.parse(configContent);
        if (this.validateConfig(configData)) {
          // If basePath in config is relative, resolve it relative to project root
          if (configData.basePath) {
            configData.basePath = path.isAbsolute(configData.basePath)
              ? configData.basePath
              : path.join(PROJECT_ROOT, configData.basePath);
          }
          
          this.config = { ...DEFAULT_CONFIG, ...configData };
          this.basePath = this.config.basePath;
          this.logger.info(`Loaded custom storage config from ${resolvedConfigPath}`);
          this.logger.info(`Storage base path updated to: ${this.basePath}`);
        }
      } else {
        this.logger.info('Using default storage config (config file not found)');
      }
    } catch (error) {
      this.logger.warn(`Failed to load config from ${configPath}, using defaults:`, error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Get resolved base path
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Get project root path
   */
  getProjectRoot(): string {
    return PROJECT_ROOT;
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: any): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Validate required fields
    if (config.maxFileSize && typeof config.maxFileSize !== 'number') {
      this.logger.warn('Invalid maxFileSize in config');
      return false;
    }

    if (config.maxTotalSize && typeof config.maxTotalSize !== 'number') {
      this.logger.warn('Invalid maxTotalSize in config');
      return false;
    }

    if (config.autoCleanupDays && typeof config.autoCleanupDays !== 'number') {
      this.logger.warn('Invalid autoCleanupDays in config');
      return false;
    }

    return true;
  }

  /**
   * Check if file size is within limits
   */
  isFileSizeValid(size: number): boolean {
    return size <= this.config.maxFileSize;
  }

  /**
   * Get storage directories structure
   */
  getStorageDirectories(): string[] {
    return [
      'market-data',
      'analysis',
      'patterns',
      'patterns/wyckoff',
      'patterns/divergences', 
      'patterns/volume-anomalies',
      'decisions',
      'reports',
      'reports/daily',
      'reports/weekly',
      'reports/performance'
    ];
  }
}
