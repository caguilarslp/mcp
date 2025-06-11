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
  code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'QUOTA_EXCEEDED' | 'INVALID_PATH' | 'IO_ERROR' | 'CONNECTION_FAILED' | 'TIMEOUT' | 'SAVE_FAILED';
  path?: string;
  originalError?: Error;
}

// ====================
// MONGODB STORAGE TYPES
// ====================

export interface MongoConfig {
  connectionString: string;
  dbName: string;
  maxPoolSize: number;
  serverSelectionTimeoutMS: number;
  connectTimeoutMS: number;
  retryWrites: boolean;
  retryReads: boolean;
}

export interface MongoDocument {
  _id?: any;
  path: string;
  category: string;
  filename: string;
  data: any;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

// ====================
// HYBRID STORAGE TYPES
// ====================

export interface HybridStorageConfig {
  strategy: 'mongo_first' | 'file_first' | 'smart_routing';
  fallbackEnabled: boolean;
  syncEnabled: boolean;
  mongoTimeoutMs: number;
  performanceTracking: boolean;
}

export interface StorageBackendMetrics {
  avgResponseTime: number;
  successRate: number;
  isAvailable: boolean;
  lastError?: string;
}

export interface StoragePerformanceMetrics {
  mongo: StorageBackendMetrics;
  file: StorageBackendMetrics;
}

// Enhanced storage service interface for MongoDB/Hybrid support
export interface IEnhancedStorageService extends IStorageService {
  // Health and monitoring
  isAvailable(): Promise<boolean>;
  getPerformanceMetrics?(): StoragePerformanceMetrics;
  
  // MongoDB specific (optional)
  initialize?(): Promise<void>;
  close?(): Promise<void>;
  
  // Hybrid specific (optional)
  getConfig?(): HybridStorageConfig;
  updateConfig?(config: Partial<HybridStorageConfig>): void;
  forceHealthCheck?(): Promise<StoragePerformanceMetrics>;
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

// ====================
// ANALYSIS REPOSITORY TYPES
// ====================

export type AnalysisType = 
  | 'technical_analysis' 
  | 'complete_analysis'
  | 'support_resistance'
  | 'volume_analysis'
  | 'volume_delta'
  | 'grid_suggestion'
  | 'volatility'
  | 'pattern_detection';

export interface SavedAnalysis {
  id: string;
  timestamp: number;
  symbol: string;
  analysisType: AnalysisType;
  data: any;
  metadata: {
    version: string;
    source: string;
    engine: string;
    savedAt: string;
    tags?: string[];
  };
  summary?: AnalysisSummary;
}

export interface AnalysisSummary {
  price: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  keyLevels: number[];
  patterns?: string[];
  signals?: string[];
  confidence?: number;
}

export interface Pattern {
  id: string;
  type: string; // 'wyckoff', 'divergence', 'volume_anomaly', etc.
  symbol: string;
  timestamp: number;
  confidence: number;
  description: string;
  data: any;
  relatedAnalyses?: string[]; // IDs of related analyses
}

export interface PatternCriteria {
  type?: string;
  symbol?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minConfidence?: number;
  tags?: string[];
}

export type Period = '1h' | '4h' | '1d' | '1w' | '1m';

export interface AggregatedMetrics {
  symbol: string;
  metric: string;
  period: Period;
  data: {
    average: number;
    max: number;
    min: number;
    stdDev: number;
    trend: number; // slope of linear regression
    samples: number;
  };
}

export interface AnalysisQuery {
  symbol?: string;
  type?: AnalysisType;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'confidence' | 'price';
  orderDirection?: 'asc' | 'desc';
  tags?: string[];
}

export interface IAnalysisRepository {
  // Saving operations
  saveAnalysis(symbol: string, type: AnalysisType, data: any, tags?: string[]): Promise<string>; // Returns analysis ID
  savePattern(pattern: Pattern): Promise<string>; // Returns pattern ID
  
  // Retrieval operations
  getAnalysisById(id: string): Promise<SavedAnalysis | null>;
  getLatestAnalysis(symbol: string, type: AnalysisType): Promise<SavedAnalysis | null>;
  getAnalysisHistory(symbol: string, type: AnalysisType, limit?: number): Promise<SavedAnalysis[]>;
  getAnalysisInRange(symbol: string, from: Date, to: Date, type?: AnalysisType): Promise<SavedAnalysis[]>;
  
  // Pattern operations
  findPatterns(criteria: PatternCriteria): Promise<Pattern[]>;
  findSimilarPatterns(pattern: Pattern, threshold?: number): Promise<Pattern[]>;
  getPatternById(id: string): Promise<Pattern | null>;
  
  // Aggregation operations
  getAnalysisSummary(symbol: string, period?: Period): Promise<AnalysisSummary>;
  getAggregatedMetrics(symbol: string, metric: string, period: Period): Promise<AggregatedMetrics>;
  
  // Search operations
  searchAnalyses(query: AnalysisQuery): Promise<SavedAnalysis[]>;
  countAnalyses(query: AnalysisQuery): Promise<number>;
  
  // Maintenance
  deleteOldAnalyses(daysOld: number): Promise<number>; // Returns count of deleted analyses
  getRepositoryStats(): Promise<RepositoryStats>;
}

export interface RepositoryStats {
  totalAnalyses: number;
  analysesByType: Record<AnalysisType, number>;
  totalPatterns: number;
  patternsByType: Record<string, number>;
  symbols: string[];
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  storageUsed: number;
}

// ====================
// REPORT GENERATOR TYPES
// ====================

export type ReportType = 'daily' | 'weekly' | 'symbol' | 'performance' | 'patterns' | 'custom';

export type ReportFormat = 'markdown' | 'json' | 'html';

export interface ReportOptions {
  type: ReportType;
  format?: ReportFormat;
  symbol?: string;
  symbols?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  includeCharts?: boolean;
  includePatterns?: boolean;
  includeTrades?: boolean;
  customQuery?: AnalysisQuery;
}

export interface ReportSection {
  title: string;
  content: string | any;
  priority: 'high' | 'medium' | 'low';
  charts?: ChartData[];
  tables?: TableData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'candlestick' | 'pie';
  title: string;
  data: any;
  config?: any;
}

export interface TableData {
  headers: string[];
  rows: any[][];
  summary?: any;
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: Date;
  period: {
    from: Date;
    to: Date;
  };
  metadata: {
    symbols: string[];
    analysisCount: number;
    patternCount: number;
    version: string;
  };
  sections: ReportSection[];
  summary: {
    keyFindings: string[];
    recommendations: string[];
    alerts?: string[];
  };
  content: string; // Final formatted content
}

export interface IReportGenerator {
  // Report generation
  generateReport(options: ReportOptions): Promise<GeneratedReport>;
  
  // Pre-built report types
  generateDailyReport(date?: Date): Promise<GeneratedReport>;
  generateWeeklyReport(weekStartDate?: Date): Promise<GeneratedReport>;
  generateSymbolReport(symbol: string, period?: Period): Promise<GeneratedReport>;
  generatePerformanceReport(period?: Period): Promise<GeneratedReport>;
  generatePatternReport(patternType?: string, period?: Period): Promise<GeneratedReport>;
  
  // Report management
  saveReport(report: GeneratedReport): Promise<string>; // Returns report ID
  getReport(id: string): Promise<GeneratedReport | null>;
  listReports(type?: ReportType, limit?: number): Promise<GeneratedReport[]>;
  deleteOldReports(daysOld: number): Promise<number>;
  
  // Export
  exportReport(report: GeneratedReport, outputPath: string): Promise<void>;
}
