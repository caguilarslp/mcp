/**
 * @fileoverview Hybrid Storage Service Implementation
 * @description Dual storage system that intelligently routes between file system and MongoDB
 * @module services/storage/hybridStorageService
 * @version 1.0.0
 */

import { 
  IStorageService, 
  FileMetadata, 
  StorageStats,
  StorageError
} from '../../types/storage.js';
import { Logger } from '../../utils/logger.js';
import { PerformanceMonitor } from '../../utils/performance.js';
import { StorageService } from '../storage.js';
import { MongoStorageService } from './mongodb/mongoStorageService.js';

/**
 * Hybrid storage strategy options
 */
export interface HybridStorageConfig {
  strategy: 'mongo_first' | 'file_first' | 'smart_routing';
  fallbackEnabled: boolean;
  syncEnabled: boolean;
  mongoTimeoutMs: number;
  performanceTracking: boolean;
}

/**
 * Storage performance metrics for decision making
 */
export interface StoragePerformanceMetrics {
  mongo: {
    avgResponseTime: number;
    successRate: number;
    isAvailable: boolean;
    lastError?: string;
  };
  file: {
    avgResponseTime: number;
    successRate: number;
    isAvailable: boolean;
    lastError?: string;
  };
}

/**
 * Hybrid Storage Service that intelligently routes between MongoDB and File System
 */
export class HybridStorageService implements IStorageService {
  private logger: Logger;
  private performanceMonitor: PerformanceMonitor;
  
  // Storage backends
  private fileStorage: StorageService;
  private mongoStorage: MongoStorageService;
  
  // Configuration and state
  private config: HybridStorageConfig;
  private metrics: StoragePerformanceMetrics;
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval: number = 30000; // 30 seconds

  constructor(config?: Partial<HybridStorageConfig>) {
    this.logger = new Logger('HybridStorageService');
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize storage backends
    this.fileStorage = new StorageService();
    this.mongoStorage = new MongoStorageService();
    
    // Default configuration
    this.config = {
      strategy: 'smart_routing',
      fallbackEnabled: true,
      syncEnabled: false,
      mongoTimeoutMs: 5000,
      performanceTracking: true,
      ...config
    };
    
    // Initialize metrics
    this.metrics = {
      mongo: {
        avgResponseTime: 0,
        successRate: 1.0,
        isAvailable: false
      },
      file: {
        avgResponseTime: 0,
        successRate: 1.0,
        isAvailable: true
      }
    };
    
    this.logger.info(`Hybrid storage initialized with strategy: ${this.config.strategy}`);
  }

  /**
   * Smart routing decision based on current metrics and strategy
   */
  private async chooseStorageBackend(operation: 'read' | 'write'): Promise<'mongo' | 'file'> {
    // Check health periodically
    await this.updateHealthMetrics();
    
    switch (this.config.strategy) {
      case 'mongo_first':
        return this.metrics.mongo.isAvailable ? 'mongo' : 'file';
        
      case 'file_first':
        return this.metrics.file.isAvailable ? 'file' : 'mongo';
        
      case 'smart_routing':
      default:
        return this.smartRouting(operation);
    }
  }

  /**
   * Smart routing algorithm based on performance metrics
   */
  private smartRouting(operation: 'read' | 'write'): 'mongo' | 'file' {
    const { mongo, file } = this.metrics;
    
    // If MongoDB is not available, use file
    if (!mongo.isAvailable) {
      return 'file';
    }
    
    // If file system is not available, use mongo
    if (!file.isAvailable) {
      return 'mongo';
    }
    
    // Both available - decide based on performance
    const mongoScore = this.calculatePerformanceScore(mongo);
    const fileScore = this.calculatePerformanceScore(file);
    
    // For writes, prefer MongoDB (better for queries)
    if (operation === 'write') {
      return mongoScore >= fileScore * 0.8 ? 'mongo' : 'file';
    }
    
    // For reads, prefer faster option
    return mongoScore > fileScore ? 'mongo' : 'file';
  }

  /**
   * Calculate performance score for a storage backend
   */
  private calculatePerformanceScore(metrics: typeof this.metrics.mongo): number {
    const responseTimeScore = Math.max(0, 1000 - metrics.avgResponseTime) / 1000;
    const successScore = metrics.successRate;
    
    // Weighted combination
    return (responseTimeScore * 0.6) + (successScore * 0.4);
  }

  /**
   * Update health metrics for both storage backends
   */
  private async updateHealthMetrics(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastHealthCheck.getTime() < this.healthCheckInterval) {
      return; // Skip if checked recently
    }
    
    this.lastHealthCheck = now;
    
    // Check MongoDB availability
    try {
      const start = Date.now();
      await this.mongoStorage.exists('health-check');
      const duration = Date.now() - start;
      
      this.metrics.mongo.isAvailable = true;
      this.updateResponseTime('mongo', duration);
    } catch (error) {
      this.metrics.mongo.isAvailable = false;
      this.metrics.mongo.lastError = (error as Error).message;
      this.logger.debug('MongoDB health check failed:', error);
    }
    
    // Check file system availability
    try {
      const start = Date.now();
      await this.fileStorage.exists('health-check');
      const duration = Date.now() - start;
      
      this.metrics.file.isAvailable = true;
      this.updateResponseTime('file', duration);
    } catch (error) {
      this.metrics.file.isAvailable = false;
      this.metrics.file.lastError = (error as Error).message;
      this.logger.debug('File system health check failed:', error);
    }
  }

  /**
   * Update response time metrics with exponential moving average
   */
  private updateResponseTime(backend: 'mongo' | 'file', duration: number): void {
    const current = this.metrics[backend].avgResponseTime;
    const alpha = 0.1; // Smoothing factor
    this.metrics[backend].avgResponseTime = current * (1 - alpha) + duration * alpha;
  }

  /**
   * Execute operation with fallback support
   */
  private async executeWithFallback<T>(
    operation: string,
    primaryBackend: 'mongo' | 'file',
    primaryOp: () => Promise<T>,
    fallbackOp: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await primaryOp();
      
      // Update success metrics
      const duration = Date.now() - startTime;
      this.updateResponseTime(primaryBackend, duration);
      this.updateSuccessRate(primaryBackend, true);
      
      return result;
      
    } catch (error) {
      this.updateSuccessRate(primaryBackend, false);
      this.logger.warn(`${operation} failed on ${primaryBackend}:`, error);
      
      if (this.config.fallbackEnabled) {
        const fallbackBackend = primaryBackend === 'mongo' ? 'file' : 'mongo';
        this.logger.info(`Falling back to ${fallbackBackend} for ${operation}`);
        
        try {
          const result = await fallbackOp();
          this.updateSuccessRate(fallbackBackend, true);
          return result;
        } catch (fallbackError) {
          this.updateSuccessRate(fallbackBackend, false);
          this.logger.error(`${operation} failed on fallback ${fallbackBackend}:`, fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Update success rate metrics
   */
  private updateSuccessRate(backend: 'mongo' | 'file', success: boolean): void {
    const current = this.metrics[backend].successRate;
    const alpha = 0.05; // Slower decay for success rate
    const newValue = success ? 1.0 : 0.0;
    this.metrics[backend].successRate = current * (1 - alpha) + newValue * alpha;
  }

  // ===========================================
  // IStorageService Implementation
  // ===========================================

  /**
   * Save data using hybrid storage
   */
  async save(relativePath: string, data: any): Promise<void> {
    const backend = await this.chooseStorageBackend('write');
    
    if (backend === 'mongo') {
      return this.executeWithFallback(
        'save',
        'mongo',
        () => this.mongoStorage.save(relativePath, data),
        () => this.fileStorage.save(relativePath, data)
      );
    } else {
      return this.executeWithFallback(
        'save',
        'file',
        () => this.fileStorage.save(relativePath, data),
        () => this.mongoStorage.save(relativePath, data)
      );
    }
  }

  /**
   * Load data using hybrid storage
   */
  async load<T>(relativePath: string): Promise<T | null> {
    const backend = await this.chooseStorageBackend('read');
    
    if (backend === 'mongo') {
      return this.executeWithFallback(
        'load',
        'mongo',
        () => this.mongoStorage.load<T>(relativePath),
        () => this.fileStorage.load<T>(relativePath)
      );
    } else {
      return this.executeWithFallback(
        'load',
        'file',
        () => this.fileStorage.load<T>(relativePath),
        () => this.mongoStorage.load<T>(relativePath)
      );
    }
  }

  /**
   * Check if file exists using hybrid storage
   */
  async exists(relativePath: string): Promise<boolean> {
    const backend = await this.chooseStorageBackend('read');
    
    if (backend === 'mongo') {
      return this.executeWithFallback(
        'exists',
        'mongo',
        () => this.mongoStorage.exists(relativePath),
        () => this.fileStorage.exists(relativePath)
      );
    } else {
      return this.executeWithFallback(
        'exists',
        'file',
        () => this.fileStorage.exists(relativePath),
        () => this.mongoStorage.exists(relativePath)
      );
    }
  }

  /**
   * Delete file using hybrid storage
   */
  async delete(relativePath: string): Promise<void> {
    // For delete operations, try both backends to ensure cleanup
    const errors: Error[] = [];
    
    if (this.metrics.mongo.isAvailable) {
      try {
        await this.mongoStorage.delete(relativePath);
      } catch (error) {
        errors.push(error as Error);
      }
    }
    
    if (this.metrics.file.isAvailable) {
      try {
        await this.fileStorage.delete(relativePath);
      } catch (error) {
        errors.push(error as Error);
      }
    }
    
    // If both failed, throw the first error
    if (errors.length === 2) {
      throw errors[0];
    }
  }

  /**
   * List files using hybrid storage
   */
  async list(directory: string): Promise<string[]> {
    const backend = await this.chooseStorageBackend('read');
    
    if (backend === 'mongo') {
      return this.executeWithFallback(
        'list',
        'mongo',
        () => this.mongoStorage.list(directory),
        () => this.fileStorage.list(directory)
      );
    } else {
      return this.executeWithFallback(
        'list',
        'file',
        () => this.fileStorage.list(directory),
        () => this.mongoStorage.list(directory)
      );
    }
  }

  /**
   * Query files using hybrid storage
   */
  async query(pattern: string): Promise<string[]> {
    const backend = await this.chooseStorageBackend('read');
    
    if (backend === 'mongo') {
      return this.executeWithFallback(
        'query',
        'mongo',
        () => this.mongoStorage.query(pattern),
        () => this.fileStorage.query(pattern)
      );
    } else {
      return this.executeWithFallback(
        'query',
        'file',
        () => this.fileStorage.query(pattern),
        () => this.mongoStorage.query(pattern)
      );
    }
  }

  /**
   * Get metadata using hybrid storage
   */
  async getMetadata(relativePath: string): Promise<FileMetadata | null> {
    const backend = await this.chooseStorageBackend('read');
    
    if (backend === 'mongo') {
      return this.executeWithFallback(
        'getMetadata',
        'mongo',
        () => this.mongoStorage.getMetadata(relativePath),
        () => this.fileStorage.getMetadata(relativePath)
      );
    } else {
      return this.executeWithFallback(
        'getMetadata',
        'file',
        () => this.fileStorage.getMetadata(relativePath),
        () => this.mongoStorage.getMetadata(relativePath)
      );
    }
  }

  /**
   * Get file size using hybrid storage
   */
  async getSize(relativePath: string): Promise<number> {
    const backend = await this.chooseStorageBackend('read');
    
    if (backend === 'mongo') {
      return this.executeWithFallback(
        'getSize',
        'mongo',
        () => this.mongoStorage.getSize(relativePath),
        () => this.fileStorage.getSize(relativePath)
      );
    } else {
      return this.executeWithFallback(
        'getSize',
        'file',
        () => this.fileStorage.getSize(relativePath),
        () => this.mongoStorage.getSize(relativePath)
      );
    }
  }

  /**
   * Vacuum old files from both storage backends
   */
  async vacuum(daysOld?: number): Promise<number> {
    let totalDeleted = 0;
    
    if (this.metrics.mongo.isAvailable) {
      try {
        totalDeleted += await this.mongoStorage.vacuum(daysOld);
      } catch (error) {
        this.logger.error('MongoDB vacuum failed:', error);
      }
    }
    
    if (this.metrics.file.isAvailable) {
      try {
        totalDeleted += await this.fileStorage.vacuum(daysOld);
      } catch (error) {
        this.logger.error('File storage vacuum failed:', error);
      }
    }
    
    return totalDeleted;
  }

  /**
   * Get comprehensive storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
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
    
    // Collect stats from both backends
    const promises: Promise<StorageStats>[] = [];
    
    if (this.metrics.mongo.isAvailable) {
      promises.push(this.mongoStorage.getStorageStats().catch(() => null as any));
    }
    
    if (this.metrics.file.isAvailable) {
      promises.push(this.fileStorage.getStorageStats().catch(() => null as any));
    }
    
    const results = await Promise.all(promises);
    
    // Merge statistics
    for (const result of results) {
      if (result) {
        stats.totalFiles += result.totalFiles;
        stats.totalSize += result.totalSize;
        
        if (result.oldestFile < stats.oldestFile) {
          stats.oldestFile = result.oldestFile;
        }
        if (result.newestFile > stats.newestFile) {
          stats.newestFile = result.newestFile;
        }
        
        // Merge category sizes
        for (const [category, size] of Object.entries(result.sizeByCategory)) {
          if (category in stats.sizeByCategory) {
            stats.sizeByCategory[category as keyof typeof stats.sizeByCategory] += size;
          }
        }
      }
    }
    
    return stats;
  }

  // ===========================================
  // Hybrid Storage Specific Methods
  // ===========================================

  /**
   * Get current storage performance metrics
   */
  getPerformanceMetrics(): StoragePerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current configuration
   */
  getConfig(): HybridStorageConfig {
    return { ...this.config };
  }

  /**
   * Update hybrid storage configuration
   */
  updateConfig(newConfig: Partial<HybridStorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Hybrid storage configuration updated:', newConfig);
  }

  /**
   * Force health check update
   */
  async forceHealthCheck(): Promise<StoragePerformanceMetrics> {
    this.lastHealthCheck = new Date(0); // Force update
    await this.updateHealthMetrics();
    return this.getPerformanceMetrics();
  }

  /**
   * Manually trigger sync between storage backends (if enabled)
   */
  async syncStorageBackends(): Promise<{ synced: number; errors: number }> {
    if (!this.config.syncEnabled) {
      throw new Error('Sync is not enabled in configuration');
    }
    
    // This is a complex operation - implement based on specific needs
    this.logger.warn('Storage backend sync not yet implemented');
    return { synced: 0, errors: 0 };
  }
}
