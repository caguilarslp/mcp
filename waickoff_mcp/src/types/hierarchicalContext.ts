/**
 * Hierarchical Context System Types - TASK-040.1
 * 
 * Nueva estructura jerárquica por símbolo que reemplaza el sistema global
 * para optimizar acceso y escalabilidad multi-symbol
 */

// ====================
// MASTER CONTEXT TYPES
// ====================

export interface MasterContextLevel {
  id: string;
  level: number;                    // Precio del nivel
  type: 'support' | 'resistance' | 'pivot';
  strength: number;                 // 0-100 fuerza histórica
  touches: number;                  // Número de veces tocado
  firstSeen: Date;                  // Primera aparición
  lastSeen: Date;                   // Última confirmación
  timeframe: string;                // TF donde se originó
  volumeConfirmation: number;       // Confirmación volumétrica promedio
  significance: 'critical' | 'major' | 'minor'; // Importancia
  metadata: {
    avgHoldTime: number;           // Tiempo promedio de holding (minutos)
    breakCount: number;            // Veces que se rompió
    respectCount: number;          // Veces que se respetó
    avgVolume: number;             // Volumen promedio en el nivel
    priceReactionSize: number;     // Tamaño promedio de reacción (%)
  };
}

export interface MasterContextPattern {
  id: string;
  type: 'wyckoff_phase' | 'smc_structure' | 'volume_profile' | 'trend_channel';
  pattern: string;                  // Nombre específico del patrón
  confidence: number;               // 0-100 confianza histórica
  occurrences: number;              // Veces que se ha repetido
  successRate: number;              // % de veces que funcionó
  avgDuration: number;              // Duración promedio (periodos)
  priceTargets: number[];           // Objetivos históricos promedio
  conditions: {
    volumeProfile: string;
    marketStructure: string;
    timeframe: string;
    seasonality?: string;
  };
  lastOccurrence: Date;
  outcome: 'success' | 'failure' | 'partial' | 'ongoing';
}

export interface MasterContextMetrics {
  symbol: string;
  totalAnalyses: number;
  avgVolatility: number;            // Volatilidad promedio
  dominantTrend: 'bullish' | 'bearish' | 'sideways';
  trendConfidence: number;
  avgTradingRange: {
    high: number;
    low: number;
    median: number;
  };
  keyStatistics: {
    strongestSupport: number;
    strongestResistance: number;
    mostActiveTimeframe: string;
    mostReliablePattern: string;
    avgAnalysisConfidence: number;
  };
  periodicMetrics: {
    daily: { analyses: number; avgConfidence: number };
    weekly: { analyses: number; avgConfidence: number };
    monthly: { analyses: number; avgConfidence: number };
  };
}

export interface MasterContext {
  symbol: string;
  version: string;                  // Version del schema
  lastUpdated: Date;
  dataIntegrity: {
    checksum: string;
    lastValidation: Date;
    entriesCount: number;
  };
  
  // Core context data
  levels: MasterContextLevel[];
  patterns: MasterContextPattern[];
  metrics: MasterContextMetrics;
  
  // Compressed historical snapshots
  snapshots: {
    daily: MasterContextSnapshot[];    // Últimos 30 días
    weekly: MasterContextSnapshot[];   // Últimas 12 semanas
    monthly: MasterContextSnapshot[];  // Últimos 12 meses
  };
  
  // Configuration and maintenance
  config: {
    retentionPolicy: {
      dailyDays: number;
      weeklyWeeks: number;
      monthlyMonths: number;
    };
    compressionSettings: {
      enabled: boolean;
      algorithm: 'gzip' | 'lz4';
      level: number;
    };
    validationRules: {
      minConfidence: number;
      maxAge: number;
      requireVolumeConfirmation: boolean;
    };
  };
}

// ====================
// SNAPSHOT TYPES
// ====================

export interface MasterContextSnapshot {
  timestamp: Date;
  period: 'daily' | 'weekly' | 'monthly';
  summary: {
    priceRange: { high: number; low: number; close: number };
    volume: { total: number; avg: number; max: number };
    analysisCount: number;
    dominantBias: string;
    keyEvents: string[];
  };
  levelChanges: {
    newLevels: MasterContextLevel[];
    updatedLevels: string[];        // IDs de niveles actualizados
    removedLevels: string[];        // IDs de niveles removidos
  };
  patternOccurrences: {
    detected: MasterContextPattern[];
    completed: string[];            // IDs de patrones completados
    invalidated: string[];          // IDs de patrones invalidados
  };
  metricsSnapshot: Partial<MasterContextMetrics>;
  compression: {
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };
}

// ====================
// HIERARCHICAL STORAGE TYPES
// ====================

export interface SymbolContextConfig {
  symbol: string;
  enabled: boolean;
  autoUpdate: boolean;
  priority: 'high' | 'medium' | 'low';
  timeframes: string[];             // TFs monitoreados
  thresholds: {
    minVolumeForLevel: number;
    minConfidenceForPattern: number;
    levelMergeDistance: number;      // % para merger niveles cercanos
  };
  customSettings?: {
    [key: string]: any;
  };
}

export interface HierarchicalContextPath {
  symbol: string;
  basePath: string;                 // /storage/context/symbols/BTCUSDT
  files: {
    master: string;                 // master.gz
    daily: string;                  // daily.gz
    weekly: string;                 // weekly.gz
    monthly: string;                // monthly.gz
    config: string;                 // config.json
  };
}

// ====================
// OPERATION TYPES
// ====================

export interface ContextUpdateRequest {
  symbol: string;
  analysis: any;                    // Análisis que genera la actualización
  analysisType: string;             // Tipo de análisis
  timeframe: string;
  confidence: number;
  metadata: {
    source: string;                 // Herramienta que generó el análisis
    executionTime: number;
    version: string;
  };
}

export interface ContextUpdateResult {
  success: boolean;
  symbol: string;
  changes: {
    levelsAdded: number;
    levelsUpdated: number;
    patternsDetected: number;
    patternsCompleted: number;
    snapshotCreated: boolean;
  };
  masterContextUpdated: boolean;
  nextSnapshotTime?: Date;
  warnings: string[];
  errors: string[];
  executionTime: number;
}

export interface ContextQueryRequest {
  symbol: string;
  timeframe?: string;
  lookbackDays?: number;
  includePatterns?: boolean;
  includeSnapshots?: boolean;
  levelTypes?: Array<'support' | 'resistance' | 'pivot'>;
  minConfidence?: number;
  filters?: {
    priceRange?: { min: number; max: number };
    dateRange?: { start: Date; end: Date };
    significance?: Array<'critical' | 'major' | 'minor'>;
  };
}

export interface ContextQueryResult {
  symbol: string;
  masterContext: MasterContext;
  filteredLevels: MasterContextLevel[];
  filteredPatterns: MasterContextPattern[];
  contextSummary: {
    totalLevels: number;
    criticalLevels: number;
    nearestSupport: number;
    nearestResistance: number;
    dominantPattern: string;
    marketBias: string;
    confidence: number;
  };
  recommendations: {
    keyLevelsToWatch: number[];
    expectedPatterns: string[];
    riskAreas: number[];
    opportunities: Array<{
      type: string;
      level: number;
      probability: number;
      reasoning: string;
    }>;
  };
  metadata: {
    queryTime: number;
    cacheHit: boolean;
    dataFreshness: string;          // 'fresh', 'recent', 'stale'
    lastUpdate: Date;
  };
}

// ====================
// INITIALIZATION TYPES
// ====================

export interface SymbolInitializationRequest {
  symbol: string;
  priority?: 'high' | 'medium' | 'low';
  timeframes?: string[];
  lookbackDays?: number;
  importExistingData?: boolean;
  autoUpdate?: boolean;
}

export interface SymbolInitializationResult {
  success: boolean;
  symbol: string;
  pathsCreated: HierarchicalContextPath;
  configCreated: SymbolContextConfig;
  dataImported: {
    levelsImported: number;
    patternsImported: number;
    snapshotsCreated: number;
    sourcesProcessed: string[];
  };
  estimatedMemoryUsage: number;     // bytes
  warnings: string[];
  errors: string[];
  initializationTime: number;
}

// ====================
// MAINTENANCE & OPTIMIZATION TYPES
// ====================

export interface ContextMaintenanceConfig {
  autoCleanup: boolean;
  compressionEnabled: boolean;
  validationInterval: number;       // horas
  snapshotInterval: {
    daily: number;                  // horas
    weekly: number;                 // días
    monthly: number;                // días
  };
  optimizationThresholds: {
    maxFileSize: number;            // MB
    maxLevelsPerSymbol: number;
    maxPatternsPerSymbol: number;
    maxSnapshotsPerPeriod: number;
  };
}

export interface ContextOptimizationResult {
  symbol: string;
  optimizations: {
    levelsRemoved: number;
    levelsMerged: number;
    patternsArchived: number;
    snapshotsCompressed: number;
    spaceSaved: number;             // bytes
  };
  performance: {
    beforeSize: number;
    afterSize: number;
    compressionRatio: number;
    accessSpeedImprovement: number; // %
  };
  integrity: {
    checksumValid: boolean;
    dataConsistent: boolean;
    referencesIntact: boolean;
  };
  recommendations: string[];
}

// ====================
// SERVICE INTERFACES
// ====================

export interface IHierarchicalContextManager {
  // Symbol management
  initializeSymbol(request: SymbolInitializationRequest): Promise<SymbolInitializationResult>;
  removeSymbol(symbol: string, archiveData?: boolean): Promise<boolean>;
  getSymbolList(): Promise<string[]>;
  getSymbolConfig(symbol: string): Promise<SymbolContextConfig>;
  updateSymbolConfig(symbol: string, config: Partial<SymbolContextConfig>): Promise<SymbolContextConfig>;
  
  // Context operations
  getMasterContext(symbol: string): Promise<MasterContext>;
  queryContext(request: ContextQueryRequest): Promise<ContextQueryResult>;
  updateContext(request: ContextUpdateRequest): Promise<ContextUpdateResult>;
  
  // Snapshot operations
  createSnapshot(symbol: string, period: 'daily' | 'weekly' | 'monthly'): Promise<MasterContextSnapshot>;
  getSnapshots(symbol: string, period: 'daily' | 'weekly' | 'monthly', limit?: number): Promise<MasterContextSnapshot[]>;
  
  // Maintenance operations
  optimizeSymbolContext(symbol: string): Promise<ContextOptimizationResult>;
  validateContextIntegrity(symbol: string): Promise<boolean>;
  cleanupOldData(symbol: string): Promise<number>; // returns bytes freed
  
  // Performance monitoring
  getPerformanceMetrics(): Promise<{
    totalSymbols: number;
    totalMemoryUsage: number;
    avgQueryTime: number;
    cacheHitRate: number;
    lastOptimization: Date;
  }>;
}

// ====================
// UTILITY TYPES
// ====================

export type ContextPeriod = 'daily' | 'weekly' | 'monthly';
export type LevelType = 'support' | 'resistance' | 'pivot';
export type LevelSignificance = 'critical' | 'major' | 'minor';
export type PatternType = 'wyckoff_phase' | 'smc_structure' | 'volume_profile' | 'trend_channel';
export type SymbolPriority = 'high' | 'medium' | 'low';

// ====================
// ERROR TYPES
// ====================

export class HierarchicalContextError extends Error {
  constructor(
    message: string,
    public code: string,
    public symbol?: string,
    public operation?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'HierarchicalContextError';
  }
}

export class ContextIntegrityError extends Error {
  constructor(
    message: string,
    public symbol: string,
    public corruptedFile?: string,
    public expectedChecksum?: string,
    public actualChecksum?: string
  ) {
    super(message);
    this.name = 'ContextIntegrityError';
  }
}

// ====================
// CONSTANTS
// ====================

export const HIERARCHICAL_CONTEXT_CONSTANTS = {
  SCHEMA_VERSION: '1.0.0',
  DEFAULT_LOOKBACK_DAYS: 90,
  MAX_LEVELS_PER_SYMBOL: 100,
  MAX_PATTERNS_PER_SYMBOL: 50,
  DEFAULT_COMPRESSION_LEVEL: 6,
  SNAPSHOT_RETENTION: {
    DAILY: 30,    // días
    WEEKLY: 12,   // semanas
    MONTHLY: 12   // meses
  },
  FILE_NAMES: {
    MASTER: 'master.gz',
    DAILY: 'daily.gz',
    WEEKLY: 'weekly.gz',
    MONTHLY: 'monthly.gz',
    CONFIG: 'config.json'
  },
  DIRECTORIES: {
    BASE: 'storage/context/symbols',
    ARCHIVE: 'storage/context/archive',
    BACKUPS: 'storage/context/backups'
  }
} as const;
