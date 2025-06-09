/**
 * Storage Service Implementation
 * Provides local file system storage for market analysis data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { 
  IStorageService, 
  StorageConfig, 
  FileMetadata, 
  StorageStats,
  StorageError,
  StorageCategory 
} from '../types/storage';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performance';

// Create singleton instances
const logger = new Logger('StorageService');
const performanceMonitor = new PerformanceMonitor();

export class StorageService implements IStorageService {
  private config: StorageConfig;
  private basePath: string;

  constructor(configPath: string = './storage/config/storage.config.json') {
    try {
      const configData = require(path.resolve(configPath));
      this.config = configData;
      this.basePath = path.resolve(this.config.basePath);
      this.initializeDirectories();
    } catch (error) {
      logger.error('Failed to load storage config', error);
      // Use default config
      this.config = {
        basePath: './storage',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxTotalSize: 1024 * 1024 * 1024, // 1GB
        compressionEnabled: false,
        autoCleanupDays: 30
      };
      this.basePath = path.resolve(this.config.basePath);
    }
  }

  /**
   * Initialize storage directory structure
   */
  private async initializeDirectories(): Promise<void> {
    const dirs = [
      'market-data',
      'analysis', 
      'patterns',
      'decisions',
      'reports',
      'reports/daily',
      'reports/weekly',
      'reports/performance'
    ];

    for (const dir of dirs) {
      const fullPath = path.join(this.basePath, dir);
      if (!existsSync(fullPath)) {
        await fs.mkdir(fullPath, { recursive: true });
        logger.info(`Created storage directory: ${dir}`);
      }
    }
  }

  /**
   * Save data to storage
   */
  async save(relativePath: string, data: any): Promise<void> {
    return performanceMonitor.measure('storage.save', async () => {
      try {
        // Validate path
        if (!this.isValidPath(relativePath)) {
          throw this.createError('INVALID_PATH', `Invalid path: ${relativePath}`);
        }

        const fullPath = path.join(this.basePath, relativePath);
        const dir = path.dirname(fullPath);

        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });

        // Convert data to JSON string
        const jsonData = JSON.stringify(data, null, 2);
        
        // Check file size
        const size = Buffer.byteLength(jsonData, 'utf8');
        if (size > this.config.maxFileSize) {
          throw this.createError('QUOTA_EXCEEDED', `File size ${size} exceeds limit ${this.config.maxFileSize}`);
        }

        // Write file
        await fs.writeFile(fullPath, jsonData, 'utf8');
        logger.debug(`Saved file: ${relativePath} (${size} bytes)`);

      } catch (error) {
        logger.error(`Failed to save file: ${relativePath}`, error);
        throw error;
      }
    });
  }

  /**
   * Load data from storage
   */
  async load<T>(relativePath: string): Promise<T | null> {
    return performanceMonitor.measure('storage.load', async () => {
      try {
        const fullPath = path.join(this.basePath, relativePath);
        
        // Check if file exists
        if (!existsSync(fullPath)) {
          return null;
        }

        // Read file
        const data = await fs.readFile(fullPath, 'utf8');
        return JSON.parse(data) as T;

      } catch (error) {
        logger.error(`Failed to load file: ${relativePath}`, error);
        return null;
      }
    });
  }

  /**
   * Check if file exists
   */
  async exists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   */
  async delete(relativePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, relativePath);
      await fs.unlink(fullPath);
      logger.debug(`Deleted file: ${relativePath}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${relativePath}`, error);
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  async list(directory: string): Promise<string[]> {
    try {
      const fullPath = path.join(this.basePath, directory);
      
      if (!existsSync(fullPath)) {
        return [];
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => path.join(directory, entry.name));

    } catch (error) {
      logger.error(`Failed to list directory: ${directory}`, error);
      return [];
    }
  }

  /**
   * Query files by pattern (simple glob-like matching)
   */
  async query(pattern: string): Promise<string[]> {
    return performanceMonitor.measure('storage.query', async () => {
      try {
        const results: string[] = [];
        
        // Convert simple glob to regex
        const regex = new RegExp(
          pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')
            .replace(/\[([^\]]+)\]/g, '[$1]')
        );

        // Recursive directory walk
        const walk = async (dir: string): Promise<void> => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(this.basePath, fullPath);
            
            if (entry.isDirectory()) {
              await walk(fullPath);
            } else if (entry.isFile() && regex.test(relativePath)) {
              results.push(relativePath.replace(/\\/g, '/'));
            }
          }
        };

        await walk(this.basePath);
        return results;

      } catch (error) {
        logger.error(`Failed to query files: ${pattern}`, error);
        return [];
      }
    });
  }

  /**
   * Get file metadata
   */
  async getMetadata(relativePath: string): Promise<FileMetadata | null> {
    try {
      const fullPath = path.join(this.basePath, relativePath);
      const stats = await fs.stat(fullPath);
      
      return {
        path: relativePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Get file size
   */
  async getSize(relativePath: string): Promise<number> {
    try {
      const fullPath = path.join(this.basePath, relativePath);
      const stats = await fs.stat(fullPath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up old files
   */
  async vacuum(daysOld: number = 30): Promise<number> {
    return performanceMonitor.measure('storage.vacuum', async () => {
      let deletedCount = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      try {
        const files = await this.query('*');
        
        for (const file of files) {
          const metadata = await this.getMetadata(file);
          if (metadata && metadata.modified < cutoffDate) {
            await this.delete(file);
            deletedCount++;
          }
        }

        logger.info(`Vacuum completed: deleted ${deletedCount} files older than ${daysOld} days`);
        return deletedCount;

      } catch (error) {
        logger.error('Vacuum failed', error);
        return deletedCount;
      }
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    return performanceMonitor.measure('storage.stats', async () => {
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

      try {
        const files = await this.query('*');
        
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
        logger.error('Failed to get storage stats', error);
        return stats;
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
