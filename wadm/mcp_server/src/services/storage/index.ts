/**
 * @fileoverview Storage Module Exports
 * @description Central export point for storage services
 * @module services/storage
 */

export { StorageService, storageService } from '../storage.js';
export { FileSystemService } from './fileSystemService.js';
export { PatternMatcher } from './patternMatcher.js';
export { StorageConfigService } from './storageConfig.js';

// MongoDB storage services (TASK-015)
export * from './mongodb/index.js';

// Hybrid storage service (TASK-015)
export { HybridStorageService } from './hybridStorageService.js';
export type { HybridStorageConfig } from './hybridStorageService.js';
