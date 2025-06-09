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
