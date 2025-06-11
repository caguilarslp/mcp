/**
 * @fileoverview Mock MongoDB Storage Service (for development without MongoDB)
 * @description Mock implementation for when MongoDB is not available
 * @module services/storage/mongodb/mockMongoStorageService
 * @version 1.0.0
 */

import { 
  IStorageService, 
  FileMetadata, 
  StorageStats,
  StorageError
} from '../../../types/storage.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Mock MongoDB Storage Service (for development without MongoDB)
 */
export class MockMongoStorageService implements IStorageService {
  private logger: Logger;
  private data: Map<string, any> = new Map();

  constructor() {
    this.logger = new Logger('MockMongoStorageService');
    this.logger.warn('Using MockMongoStorageService - MongoDB not available');
  }

  async save(relativePath: string, data: any): Promise<void> {
    this.data.set(relativePath, {
      data,
      size: JSON.stringify(data).length,
      created: new Date(),
      modified: new Date()
    });
  }

  async load<T>(relativePath: string): Promise<T | null> {
    const entry = this.data.get(relativePath);
    return entry ? entry.data : null;
  }

  async exists(relativePath: string): Promise<boolean> {
    return this.data.has(relativePath);
  }

  async delete(relativePath: string): Promise<void> {
    this.data.delete(relativePath);
  }

  async list(directory: string): Promise<string[]> {
    return Array.from(this.data.keys()).filter(path => path.startsWith(directory));
  }

  async query(pattern: string): Promise<string[]> {
    // Simple pattern matching for mock
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(path => regex.test(path));
  }

  async getMetadata(relativePath: string): Promise<FileMetadata | null> {
    const entry = this.data.get(relativePath);
    if (!entry) return null;
    
    return {
      path: relativePath,
      size: entry.size,
      created: entry.created,
      modified: entry.modified,
      accessed: entry.modified
    };
  }

  async getSize(relativePath: string): Promise<number> {
    const entry = this.data.get(relativePath);
    return entry ? entry.size : 0;
  }

  async vacuum(daysOld: number = 30): Promise<number> {
    // Mock vacuum - no actual cleanup in memory
    return 0;
  }

  async getStorageStats(): Promise<StorageStats> {
    const totalFiles = this.data.size;
    let totalSize = 0;
    let oldestFile = new Date();
    let newestFile = new Date(0);

    for (const entry of this.data.values()) {
      totalSize += entry.size;
      if (entry.created < oldestFile) oldestFile = entry.created;
      if (entry.modified > newestFile) newestFile = entry.modified;
    }

    return {
      totalFiles,
      totalSize,
      oldestFile,
      newestFile,
      sizeByCategory: {
        marketData: 0,
        analysis: totalSize,
        patterns: 0,
        decisions: 0,
        reports: 0
      }
    };
  }
}
