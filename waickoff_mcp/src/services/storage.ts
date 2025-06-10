/**
 * @fileoverview Storage Service Implementation (Refactored)
 * @description High-level storage orchestrator following modular architecture
 * @module services/storage
 * @version 2.0.0
 */

import * as path from 'path';
import { 
  IStorageService, 
  FileMetadata, 
  StorageStats,
  StorageError
} from '../types/storage.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance.js';
import { FileSystemService } from './storage/fileSystemService.js';
import { PatternMatcher } from './storage/patternMatcher.js';
import { StorageConfigService } from './storage/storageConfig.js';

/**
 * High-level Storage Service orchestrator
 * Delegates low-level operations to specialized services
 */
export class StorageService implements IStorageService {
  private logger: Logger;
  private performanceMonitor: PerformanceMonitor;
  
  // Specialized services
  private fileSystem: FileSystemService;
  private patternMatcher: PatternMatcher;
  private configService: StorageConfigService;
  
  // State
  private initialized: boolean = false;
  private initializationPromise: Promise<void>;

  constructor(configPath: string = './storage/config/storage.config.json') {
    this.logger = new Logger('StorageService');
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize specialized services
    this.fileSystem = new FileSystemService();
    this.patternMatcher = new PatternMatcher();
    this.configService = new StorageConfigService(this.fileSystem);
    
    // Initialize storage system
    this.initializationPromise = this.initialize(configPath);
  }

  /**
   * Initialize storage system
   */
  private async initialize(configPath: string): Promise<void> {
    try {
      // Load configuration
      await this.configService.loadConfig(configPath);
      
      // Create directory structure
      const basePath = this.configService.getBasePath();
      const directories = this.configService.getStorageDirectories();
      
      for (const dir of directories) {
        const fullPath = path.join(basePath, dir);
        await this.fileSystem.ensureDirectory(fullPath);
      }
      
      this.initialized = true;
      this.logger.info('Storage service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  /**
   * Ensure initialization is complete
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializationPromise;
    }
  }

  /**
   * Save data to storage
   */
  async save(relativePath: string, data: any): Promise<void> {
    return this.performanceMonitor.measure('storage.save', async () => {
      try {
        await this.ensureInitialized();
        
        // Validate path
        if (!this.isValidPath(relativePath)) {
          throw this.createError('INVALID_PATH', `Invalid path: ${relativePath}`);
        }

        // Convert data to JSON
        const jsonData = JSON.stringify(data, null, 2);
        const size = Buffer.byteLength(jsonData, 'utf8');
        
        // Check file size
        if (!this.configService.isFileSizeValid(size)) {
          const config = this.configService.getConfig();
          throw this.createError(
            'QUOTA_EXCEEDED', 
            `File size ${size} exceeds limit ${config.maxFileSize}`
          );
        }

        // Save file
        const basePath = this.configService.getBasePath();
        const fullPath = path.join(basePath, relativePath);
        await this.fileSystem.writeFile(fullPath, jsonData);
        
        this.logger.debug(`Saved file: ${relativePath} (${size} bytes)`);

      } catch (error) {
        this.logger.error(`Failed to save file: ${relativePath}`, error);
        throw error;
      }
    });
  }

  /**
   * Load data from storage
   */
  async load<T>(relativePath: string): Promise<T | null> {
    return this.performanceMonitor.measure('storage.load', async () => {
      try {
        await this.ensureInitialized();
        
        const basePath = this.configService.getBasePath();
        const fullPath = path.join(basePath, relativePath);
        
        const content = await this.fileSystem.readFile(fullPath);
        if (!content) {
          return null;
        }
        
        return JSON.parse(content) as T;

      } catch (error) {
        this.logger.error(`Failed to load file: ${relativePath}`, error);
        return null;
      }
    });
  }

  /**
   * Check if file exists
   */
  async exists(relativePath: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const basePath = this.configService.getBasePath();
      const fullPath = path.join(basePath, relativePath);
      
      return await this.fileSystem.exists(fullPath);
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   */
  async delete(relativePath: string): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const basePath = this.configService.getBasePath();
      const fullPath = path.join(basePath, relativePath);
      
      await this.fileSystem.deleteFile(fullPath);
      this.logger.debug(`Deleted file: ${relativePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${relativePath}`, error);
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  async list(directory: string): Promise<string[]> {
    try {
      await this.ensureInitialized();
      
      const basePath = this.configService.getBasePath();
      const fullPath = path.join(basePath, directory);
      
      const files = await this.fileSystem.listFiles(fullPath);
      
      // Return relative paths
      return files.map(file => path.relative(basePath, file).replace(/\\/g, '/'));

    } catch (error) {
      this.logger.error(`Failed to list directory: ${directory}`, error);
      return [];
    }
  }

  /**
   * Query files by pattern (FIXED implementation)
   */
  async query(pattern: string): Promise<string[]> {
    return this.performanceMonitor.measure('storage.query', async () => {
      try {
        await this.ensureInitialized();
        
        this.logger.debug(`Query pattern: ${pattern}`);
        const results: string[] = [];
        const basePath = this.configService.getBasePath();
        
        // Walk directory and collect matching files
        await this.fileSystem.walkDirectory(basePath, (fullPath, relativePath) => {
          // Normalize to forward slashes for consistent matching
          const normalizedPath = relativePath.replace(/\\/g, '/');
          
          if (this.patternMatcher.matches(normalizedPath, pattern)) {
            results.push(normalizedPath);
          }
        });
        
        this.logger.debug(`Query results: ${results.length} files found`);
        return results;

      } catch (error) {
        this.logger.error(`Failed to query files: ${pattern}`, error);
        return [];
      }
    });
  }

  /**
   * Get file metadata
   */
  async getMetadata(relativePath: string): Promise<FileMetadata | null> {
    try {
      await this.ensureInitialized();
      
      const basePath = this.configService.getBasePath();
      const fullPath = path.join(basePath, relativePath);
      
      return await this.fileSystem.getFileStats(fullPath);

    } catch (error) {
      return null;
    }
  }

  /**
   * Get file size
   */
  async getSize(relativePath: string): Promise<number> {
    try {
      const metadata = await this.getMetadata(relativePath);
      return metadata?.size || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up old files
   */
  async vacuum(daysOld?: number): Promise<number> {
    return this.performanceMonitor.measure('storage.vacuum', async () => {
      try {
        await this.ensureInitialized();
        
        const config = this.configService.getConfig();
        const days = daysOld || config.autoCleanupDays;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        let deletedCount = 0;
        const files = await this.query('**/*');
        
        for (const file of files) {
          const metadata = await this.getMetadata(file);
          if (metadata && metadata.modified < cutoffDate) {
            await this.delete(file);
            deletedCount++;
          }
        }

        this.logger.info(`Vacuum completed: deleted ${deletedCount} files older than ${days} days`);
        return deletedCount;

      } catch (error) {
        this.logger.error('Vacuum failed', error);
        return 0;
      }
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    return this.performanceMonitor.measure('storage.stats', async () => {
      try {
        await this.ensureInitialized();
        
        const stats: StorageStats = {
          totalFiles: 0,
          totalSize: 0,
          oldestFile: new Date(),
          newestFile: new Date(0),
          sizeByCategory: {
            marketData: 0,
            analysis: 0,
            patterns: 0,
            decisions: 0,
            reports: 0
          }
        };

        const files = await this.query('**/*');
        
        for (const file of files) {
          const metadata = await this.getMetadata(file);
          if (metadata) {
            stats.totalFiles++;
            stats.totalSize += metadata.size;
            
            if (metadata.modified < stats.oldestFile) {
              stats.oldestFile = metadata.modified;
            }
            if (metadata.modified > stats.newestFile) {
              stats.newestFile = metadata.modified;
            }

            // Categorize by directory
            const category = file.split('/')[0] as keyof typeof stats.sizeByCategory;
            if (category in stats.sizeByCategory) {
              stats.sizeByCategory[category] += metadata.size;
            }
          }
        }

        return stats;

      } catch (error) {
        this.logger.error('Failed to get storage stats', error);
        throw error;
      }
    });
  }

  /**
   * Validate path safety
   */
  private isValidPath(relativePath: string): boolean {
    // Prevent directory traversal
    const normalized = path.normalize(relativePath);
    return !normalized.includes('..') && !path.isAbsolute(normalized);
  }

  /**
   * Create storage error
   */
  private createError(code: StorageError['code'], message: string): StorageError {
    const error = new Error(message) as StorageError;
    error.code = code;
    return error;
  }
}

// Export singleton instance
export const storageService = new StorageService();
