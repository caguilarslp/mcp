/**
 * @fileoverview MongoDB Storage Service Implementation (Safe)
 * @description MongoDB-based storage with fallback to mock when MongoDB unavailable
 * @module services/storage/mongodb/mongoStorageService
 * @version 1.0.0
 */

import { 
  IStorageService, 
  FileMetadata, 
  StorageStats,
  StorageError
} from '../../../types/storage.js';
import { Logger } from '../../../utils/logger.js';
import { MockMongoStorageService } from './mockMongoStorageService.js';

/**
 * MongoDB Storage Service Factory
 * Creates MongoDB service if available, otherwise returns mock
 */
export class MongoStorageService implements IStorageService {
  private implementation: IStorageService;
  private logger: Logger;

  constructor(connectionString?: string) {
    this.logger = new Logger('MongoStorageService');
    
    // Try to create real MongoDB service, fallback to mock
    try {
      // This will throw if mongodb package is not installed
      const mongodb = require('mongodb');
      this.implementation = new RealMongoStorageService(connectionString);
      this.logger.info('MongoDB service initialized');
    } catch (error) {
      this.logger.warn('MongoDB not available, using mock implementation');
      this.implementation = new MockMongoStorageService();
    }
  }

  // Delegate all methods to the implementation
  async save(relativePath: string, data: any): Promise<void> {
    return this.implementation.save(relativePath, data);
  }

  async load<T>(relativePath: string): Promise<T | null> {
    return this.implementation.load<T>(relativePath);
  }

  async exists(relativePath: string): Promise<boolean> {
    return this.implementation.exists(relativePath);
  }

  async delete(relativePath: string): Promise<void> {
    return this.implementation.delete(relativePath);
  }

  async list(directory: string): Promise<string[]> {
    return this.implementation.list(directory);
  }

  async query(pattern: string): Promise<string[]> {
    return this.implementation.query(pattern);
  }

  async getMetadata(relativePath: string): Promise<FileMetadata | null> {
    return this.implementation.getMetadata(relativePath);
  }

  async getSize(relativePath: string): Promise<number> {
    return this.implementation.getSize(relativePath);
  }

  async vacuum(daysOld?: number): Promise<number> {
    return this.implementation.vacuum(daysOld || 30);
  }

  async getStorageStats(): Promise<StorageStats> {
    return this.implementation.getStorageStats();
  }

  // MongoDB specific methods (optional)
  async initialize(): Promise<void> {
    if ('initialize' in this.implementation) {
      return (this.implementation as any).initialize();
    }
  }

  async close(): Promise<void> {
    if ('close' in this.implementation) {
      return (this.implementation as any).close();
    }
  }
}

/**
 * Real MongoDB Storage Service (only used when MongoDB is available)
 */
class RealMongoStorageService implements IStorageService {
  private logger: Logger;
  private connectionString: string;
  private client: any = null;
  private initialized: boolean = false;

  constructor(connectionString?: string) {
    this.logger = new Logger('RealMongoStorageService');
    this.connectionString = connectionString || 'mongodb://localhost:27017';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const { MongoClient } = require('mongodb');
      this.client = new MongoClient(this.connectionString);
      await this.client.connect();
      this.initialized = true;
      this.logger.info('MongoDB client connected');
    } catch (error) {
      this.logger.error('Failed to initialize MongoDB:', error);
      throw error;
    }
  }

  async save(relativePath: string, data: any): Promise<void> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    const document = {
      path: relativePath,
      data,
      size: JSON.stringify(data).length,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await collection.replaceOne(
      { path: relativePath },
      document,
      { upsert: true }
    );
  }

  async load<T>(relativePath: string): Promise<T | null> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    const document = await collection.findOne({ path: relativePath });
    return document ? document.data : null;
  }

  async exists(relativePath: string): Promise<boolean> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    const count = await collection.countDocuments({ path: relativePath });
    return count > 0;
  }

  async delete(relativePath: string): Promise<void> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    await collection.deleteOne({ path: relativePath });
  }

  async list(directory: string): Promise<string[]> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    const regex = new RegExp(`^${directory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    const documents = await collection
      .find({ path: regex })
      .project({ path: 1 })
      .toArray();
    
    return documents.map((doc: any) => doc.path);
  }

  async query(pattern: string): Promise<string[]> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    const mongoRegex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    
    const documents = await collection
      .find({ path: { $regex: mongoRegex, $options: 'i' } })
      .project({ path: 1 })
      .sort({ updatedAt: -1 })
      .toArray();
    
    return documents.map((doc: any) => doc.path);
  }

  async getMetadata(relativePath: string): Promise<FileMetadata | null> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    const document = await collection.findOne(
      { path: relativePath },
      { projection: { data: 0 } }
    );
    
    if (!document) return null;
    
    return {
      path: document.path,
      size: document.size,
      created: document.createdAt,
      modified: document.updatedAt,
      accessed: document.updatedAt
    };
  }

  async getSize(relativePath: string): Promise<number> {
    const metadata = await this.getMetadata(relativePath);
    return metadata?.size || 0;
  }

  async vacuum(daysOld: number = 30): Promise<number> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await collection.deleteMany({
      updatedAt: { $lt: cutoffDate }
    });
    
    return result.deletedCount || 0;
  }

  async getStorageStats(): Promise<StorageStats> {
    await this.initialize();
    const db = this.client.db('waickoff_mcp');
    const collection = db.collection('storage_files');
    
    const pipeline = [
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          oldestFile: { $min: '$createdAt' },
          newestFile: { $max: '$updatedAt' }
        }
      }
    ];
    
    const [generalStats] = await collection.aggregate(pipeline).toArray();
    
    return {
      totalFiles: generalStats?.totalFiles || 0,
      totalSize: generalStats?.totalSize || 0,
      oldestFile: generalStats?.oldestFile || new Date(),
      newestFile: generalStats?.newestFile || new Date(),
      sizeByCategory: {
        marketData: 0,
        analysis: generalStats?.totalSize || 0,
        patterns: 0,
        decisions: 0,
        reports: 0
      }
    };
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.initialized = false;
      this.logger.info('MongoDB connection closed');
    }
  }
}
