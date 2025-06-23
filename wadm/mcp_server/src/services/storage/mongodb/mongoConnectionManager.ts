/**
 * @fileoverview MongoDB Connection Manager (Safe)
 * @description Safe MongoDB connection manager with fallback
 * @module services/storage/mongodb/mongoConnectionManager
 * @version 1.0.0
 */

import { Logger } from '../../../utils/logger.js';

/**
 * MongoDB connection configuration
 */
export interface MongoConfig {
  connectionString: string;
  dbName: string;
  maxPoolSize: number;
  serverSelectionTimeoutMS: number;
  connectTimeoutMS: number;
  retryWrites: boolean;
  retryReads: boolean;
}

/**
 * Safe MongoDB Connection Manager
 * Handles MongoDB connections safely when package is available
 */
export class MongoConnectionManager {
  private logger: Logger;
  private config: MongoConfig;
  private client: any = null;
  private isConnecting: boolean = false;

  constructor(connectionString?: string) {
    this.logger = new Logger('MongoConnectionManager');
    
    this.config = {
      connectionString: connectionString || this.getDefaultConnectionString(),
      dbName: process.env.MONGODB_DATABASE || 'waickoff_mcp',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    };
  }

  private getDefaultConnectionString(): string {
    const envConnectionString = process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING;
    if (envConnectionString) {
      return envConnectionString;
    }
    return 'mongodb://localhost:27017';
  }

  async connect(): Promise<any> {
    if (this.client && this.client.topology?.isConnected()) {
      return this.client;
    }
    
    if (this.isConnecting) {
      // Wait for ongoing connection
      while (this.isConnecting) {
        await this.sleep(100);
      }
      return this.client;
    }
    
    this.isConnecting = true;
    
    try {
      const { MongoClient } = require('mongodb');
      
      const options = {
        maxPoolSize: this.config.maxPoolSize,
        serverSelectionTimeoutMS: this.config.serverSelectionTimeoutMS,
        connectTimeoutMS: this.config.connectTimeoutMS,
        retryWrites: this.config.retryWrites,
        retryReads: this.config.retryReads
      };

      this.client = new MongoClient(this.config.connectionString, options);
      await this.client.connect();
      await this.client.db().admin().ping();
      
      this.logger.info('MongoDB connected successfully');
      return this.client;
      
    } catch (error) {
      this.logger.error('MongoDB connection failed:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.logger.info('MongoDB disconnected');
      } catch (error) {
        this.logger.error('Error during MongoDB disconnect:', error);
      } finally {
        this.client = null;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const client = await this.connect();
      await client.db().admin().ping();
      return true;
    } catch (error) {
      this.logger.debug('MongoDB not available:', error);
      return false;
    }
  }

  getConnectionInfo(): any {
    return {
      connectionString: this.sanitizeConnectionString(this.config.connectionString),
      dbName: this.config.dbName,
      isConnected: this.client?.topology?.isConnected() || false
    };
  }

  private sanitizeConnectionString(connectionString: string): string {
    try {
      const url = new URL(connectionString);
      if (url.username || url.password) {
        return `${url.protocol}//${url.hostname}:${url.port}${url.pathname}`;
      }
      return connectionString;
    } catch {
      return 'mongodb://***:***@localhost:27017';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
