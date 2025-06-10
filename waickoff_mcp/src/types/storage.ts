/**
 * Storage System Type Definitions
 * Defines interfaces and types for the local storage system
 */

export interface FileMetadata {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
}

export interface StorageConfig {
  basePath: string;
  maxFileSize: number;
  maxTotalSize: number;
  compressionEnabled: boolean;
  autoCleanupDays: number;
}

export interface IStorageService {
  // Basic CRUD operations
  save(path: string, data: any): Promise<void>;
  load<T>(path: string): Promise<T | null>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  
  // Advanced operations
  list(directory: string): Promise<string[]>;
  query(pattern: string): Promise<string[]>;
  getMetadata(path: string): Promise<FileMetadata | null>;
  getSize(path: string): Promise<number>;
  
  // Maintenance
  vacuum(daysOld: number): Promise<number>; // Returns number of files deleted
  getStorageStats(): Promise<StorageStats>;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  oldestFile: Date;
  newestFile: Date;
  sizeByCategory: {
    marketData: number;
    analysis: number;
    patterns: number;
    decisions: number;
    reports: number;
  };
}

export type StorageCategory = 'market-data' | 'analysis' | 'patterns' | 'decisions' | 'reports';

export interface StorageError extends Error {
  code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'QUOTA_EXCEEDED' | 'INVALID_PATH' | 'IO_ERROR';
  path?: string;
}

// ====================
// CACHE MANAGER TYPES
// ====================

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  totalMemoryUsage: number; // Approximate memory usage in bytes
  hitRate: number; // Percentage of cache hits
  missRate: number; // Percentage of cache misses
  oldestEntry: number; // Timestamp of oldest entry
  newestEntry: number; // Timestamp of newest entry
  totalHits: number;
  totalMisses: number;
  entriesByTTL: {
    expired: number;
    expiringSoon: number; // Expiring within 1 minute
    fresh: number;
  };
}

export interface CacheConfig {
  maxEntries: number;
  defaultTTL: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  maxMemoryUsage: number; // Max memory usage in bytes
  enableStats: boolean;
}

export interface ICacheManager {
  // Basic operations
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  
  // Bulk operations
  setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void>;
  getMany<T>(keys: string[]): Promise<Array<{ key: string; value: T | null }>>;
  deleteMany(keys: string[]): Promise<number>; // Returns count of deleted entries
  
  // Pattern operations
  invalidate(pattern: string): Promise<number>; // Returns count of invalidated entries
  getKeys(pattern?: string): Promise<string[]>;
  
  // Maintenance
  cleanup(): Promise<number>; // Returns count of cleaned entries
  clear(): Promise<void>;
  
  // Statistics
  getStats(): Promise<CacheStats>;
  getEntry<T>(key: string): Promise<CacheEntry<T> | null>;
}

// Cache key builders for consistency
export class CacheKeys {
  static ticker(symbol: string, category?: string): string {
    return `ticker:${symbol}:${category || 'spot'}`;
  }
  
  static orderbook(symbol: string, category?: string, limit?: number): string {
    return `orderbook:${symbol}:${category || 'spot'}:${limit || 25}`;
  }
  
  static klines(symbol: string, interval?: string, limit?: number, category?: string): string {
    return `klines:${symbol}:${interval || '60'}:${limit || 200}:${category || 'spot'}`;
  }
  
  static analysis(symbol: string, type: string, ...params: string[]): string {
    return `analysis:${symbol}:${type}:${params.join(':')}`;
  }
  
  static pattern(patternName: string): string {
    return `pattern:${patternName}:*`;
  }
}
