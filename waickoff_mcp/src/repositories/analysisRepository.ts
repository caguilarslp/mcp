/**
 * @fileoverview Analysis Repository Implementation
 * @description Advanced storage and retrieval system for market analyses and patterns
 * @module repositories/analysisRepository
 * @version 1.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  IAnalysisRepository,
  IStorageService,
  AnalysisType,
  SavedAnalysis,
  AnalysisSummary,
  Pattern,
  PatternCriteria,
  Period,
  AggregatedMetrics,
  AnalysisQuery,
  RepositoryStats
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance.js';

/**
 * Advanced Analysis Repository for managing saved analyses and patterns
 */
export class AnalysisRepository implements IAnalysisRepository {
  private storageService: IStorageService;
  private basePath: string;
  private analysisPath: string;
  private patternsPath: string;
  private logger: Logger;
  private performanceMonitor: PerformanceMonitor;
  
  constructor(storageService: IStorageService, basePath: string) {
    this.storageService = storageService;
    this.basePath = basePath;
    // Use relative paths for consistency with StorageService
    this.analysisPath = 'analysis';
    this.patternsPath = 'patterns';
    this.logger = new Logger('AnalysisRepository');
    this.performanceMonitor = new PerformanceMonitor();
    
    // Ensure directories exist using StorageService
    this.initializeDirectories();
  }
  
  private async initializeDirectories(): Promise<void> {
    try {
      // The StorageService already handles directory creation
      // We just need to log that initialization is complete
      this.logger.info('AnalysisRepository directories initialized via StorageService');
    } catch (error) {
      this.logger.error('Failed to initialize repository directories:', error);
    }
  }
  
  /**
   * Save an analysis with automatic ID generation and indexing
   */
  async saveAnalysis(
    symbol: string, 
    type: AnalysisType, 
    data: any, 
    tags?: string[]
  ): Promise<string> {
    return this.performanceMonitor.measure('AnalysisRepository.saveAnalysis', async () => {
      try {
        const id = randomUUID();
        const timestamp = Date.now();
        
        // Extract summary from data
        const summary = this.extractSummary(type, data);
        
        // Create saved analysis object
        const savedAnalysis: SavedAnalysis = {
          id,
          timestamp,
          symbol,
          analysisType: type,
          data,
          metadata: {
            version: '1.3.6',
            source: 'waickoff_mcp',
            engine: 'MarketAnalysisEngine',
            savedAt: new Date(timestamp).toISOString(),
            tags
          },
          summary
        };
        
        // Determine file path (relative to storage service base path)
        const fileName = `${type}_${timestamp}_${id}.json`;
        const relativePath = path.join('analysis', symbol, fileName);
        
        // Save using storage service with relative path
        await this.storageService.save(relativePath, savedAnalysis);
        
        // Create index entry for fast lookups
        await this.updateIndex(symbol, type, id, timestamp);
        
        this.logger.info(`Analysis saved: ${symbol}/${type} with ID ${id}`);
        return id;
        
      } catch (error) {
        this.logger.error('Failed to save analysis:', error);
        throw error;
      }
    });
  }
  
  /**
   * Save a detected pattern
   */
  async savePattern(pattern: Pattern): Promise<string> {
    return this.performanceMonitor.measure('AnalysisRepository.savePattern', async () => {
      try {
        const id = pattern.id || randomUUID();
        const patternWithId = { ...pattern, id };
        
        // Determine file path based on pattern type (relative to storage service)
        const fileName = `${pattern.symbol}_${pattern.timestamp}_${id}.json`;
        const relativePath = path.join('patterns', pattern.type, fileName);
        
        // Save pattern
        await this.storageService.save(relativePath, patternWithId);
        
        this.logger.info(`Pattern saved: ${pattern.type}/${pattern.symbol} with ID ${id}`);
        return id;
        
      } catch (error) {
        this.logger.error('Failed to save pattern:', error);
        throw error;
      }
    });
  }
  
  /**
   * Get analysis by ID
   */
  async getAnalysisById(id: string): Promise<SavedAnalysis | null> {
    return this.performanceMonitor.measure('AnalysisRepository.getAnalysisById', async () => {
      try {
        // Search for file containing the ID
        const files = await this.findFiles(this.analysisPath, `*_${id}.json`);
        
        if (files.length === 0) {
          return null;
        }
        
        return await this.storageService.load<SavedAnalysis>(files[0]);
        
      } catch (error) {
        this.logger.error(`Failed to get analysis by ID ${id}:`, error);
        return null;
      }
    });
  }
  
  /**
   * Get latest analysis of a specific type for a symbol
   */
  async getLatestAnalysis(
    symbol: string, 
    type: AnalysisType
  ): Promise<SavedAnalysis | null> {
    return this.performanceMonitor.measure('AnalysisRepository.getLatestAnalysis', async () => {
      try {
        const analyses = await this.getAnalysisHistory(symbol, type, 1);
        return analyses.length > 0 ? analyses[0] : null;
      } catch (error) {
        this.logger.error(`Failed to get latest analysis for ${symbol}/${type}:`, error);
        return null;
      }
    });
  }
  
  /**
   * Get analysis history for a symbol and type
   */
  async getAnalysisHistory(
    symbol: string, 
    type: AnalysisType, 
    limit: number = 10
  ): Promise<SavedAnalysis[]> {
    return this.performanceMonitor.measure('AnalysisRepository.getAnalysisHistory', async () => {
      try {
        this.logger.info(`Getting analysis history for ${symbol}/${type} (limit: ${limit})`);
        
        // Query files using StorageService
        const pattern = `analysis/${symbol}/${type}_*.json`;
        const files = await this.storageService.query(pattern);
        
        this.logger.debug(`Found ${files.length} files matching pattern ${pattern}`);
        
        if (files.length === 0) {
          this.logger.info(`No analyses found for ${symbol}/${type}`);
          return [];
        }
        
        // Sort by timestamp (newest first) - extract from filename
        const sortedFiles = files.sort((a, b) => {
          const timestampA = this.extractTimestampFromFileName(a);
          const timestampB = this.extractTimestampFromFileName(b);
          return timestampB - timestampA;
        });
        
        this.logger.debug(`Sorted files:`, sortedFiles.map(f => path.basename(f)));
        
        // Load requested number of analyses
        const analyses: SavedAnalysis[] = [];
        for (let i = 0; i < Math.min(limit, sortedFiles.length); i++) {
          try {
            const fileData = await this.storageService.load<any>(sortedFiles[i]);
            
            if (!fileData) {
              this.logger.warn(`Could not load analysis file ${sortedFiles[i]}`);
              continue;
            }
            
            // Convert legacy format to SavedAnalysis format if needed
            let analysis: SavedAnalysis;
            
            if (fileData.id && fileData.analysisType && fileData.timestamp) {
              // Already in new format
              analysis = fileData as SavedAnalysis;
            } else {
              // Legacy format - convert
              analysis = {
                id: `legacy-${Date.now()}-${i}`,
                timestamp: fileData.timestamp || Date.now(),
                symbol: fileData.symbol || symbol,
                analysisType: fileData.analysisType || type,
                data: fileData.data || fileData,
                metadata: fileData.metadata || {
                  version: fileData.metadata?.version || '1.3.5',
                  source: 'waickoff_mcp',
                  engine: 'MarketAnalysisEngine',
                  savedAt: fileData.metadata?.savedAt || new Date(fileData.timestamp || Date.now()).toISOString()
                },
                summary: this.extractSummary(type, fileData.data || fileData)
              };
            }
            
            analyses.push(analysis);
            
          } catch (fileError) {
            this.logger.warn(`Failed to load analysis file ${sortedFiles[i]}:`, fileError);
          }
        }
        
        this.logger.info(`Loaded ${analyses.length} analyses for ${symbol}/${type}`);
        return analyses;
        
      } catch (error) {
        this.logger.error(`Failed to get analysis history for ${symbol}/${type}:`, error);
        return [];
      }
    });
  }
  
  /**
   * Get analyses within a date range
   */
  async getAnalysisInRange(
    symbol: string, 
    from: Date, 
    to: Date, 
    type?: AnalysisType
  ): Promise<SavedAnalysis[]> {
    return this.performanceMonitor.measure('AnalysisRepository.getAnalysisInRange', async () => {
      try {
        const fromTimestamp = from.getTime();
        const toTimestamp = to.getTime();
        
        // Build pattern based on type
        const pattern = type ? `${type}_*.json` : '*.json';
        const symbolPath = path.join(this.analysisPath, symbol);
        
        const files = await this.listFiles(symbolPath, pattern);
        const analyses: SavedAnalysis[] = [];
        
        for (const file of files) {
          const timestamp = this.extractTimestampFromFileName(file);
          if (timestamp >= fromTimestamp && timestamp <= toTimestamp) {
            const analysis = await this.storageService.load<SavedAnalysis>(file);
            if (analysis) {
              analyses.push(analysis);
            }
          }
        }
        
        // Sort by timestamp
        return analyses.sort((a, b) => b.timestamp - a.timestamp);
        
      } catch (error) {
        this.logger.error(`Failed to get analyses in range for ${symbol}:`, error);
        return [];
      }
    });
  }
  
  /**
   * Find patterns based on criteria
   */
  async findPatterns(criteria: PatternCriteria): Promise<Pattern[]> {
    return this.performanceMonitor.measure('AnalysisRepository.findPatterns', async () => {
      try {
        // Find pattern files
        const files = await this.findPatternFiles(criteria);
        const patterns: Pattern[] = [];
        
        for (const file of files) {
          const pattern = await this.storageService.load<Pattern>(file);
          if (pattern && this.matchesPatternCriteria(pattern, criteria)) {
            patterns.push(pattern);
          }
        }
        
        // Sort by timestamp (newest first)
        return patterns.sort((a, b) => b.timestamp - a.timestamp);
        
      } catch (error) {
        this.logger.error('Failed to find patterns:', error);
        return [];
      }
    });
  }
  
  /**
   * Find similar patterns using similarity threshold
   */
  async findSimilarPatterns(
    pattern: Pattern, 
    threshold: number = 0.8
  ): Promise<Pattern[]> {
    return this.performanceMonitor.measure('AnalysisRepository.findSimilarPatterns', async () => {
      try {
        // Get all patterns of the same type
        const candidates = await this.findPatterns({ 
          type: pattern.type,
          symbol: pattern.symbol 
        });
        
        // Calculate similarity scores
        const similarPatterns = candidates
          .filter(p => p.id !== pattern.id)
          .map(candidate => ({
            pattern: candidate,
            similarity: this.calculatePatternSimilarity(pattern, candidate)
          }))
          .filter(({ similarity }) => similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity)
          .map(({ pattern }) => pattern);
        
        return similarPatterns;
        
      } catch (error) {
        this.logger.error('Failed to find similar patterns:', error);
        return [];
      }
    });
  }
  
  /**
   * Get pattern by ID
   */
  async getPatternById(id: string): Promise<Pattern | null> {
    return this.performanceMonitor.measure('AnalysisRepository.getPatternById', async () => {
      try {
        const files = await this.findFiles(this.patternsPath, `*_${id}.json`);
        
        if (files.length === 0) {
          return null;
        }
        
        return await this.storageService.load<Pattern>(files[0]);
        
      } catch (error) {
        this.logger.error(`Failed to get pattern by ID ${id}:`, error);
        return null;
      }
    });
  }
  
  /**
   * Get analysis summary for a symbol
   */
  async getAnalysisSummary(
    symbol: string, 
    period?: Period
  ): Promise<AnalysisSummary> {
    return this.performanceMonitor.measure('AnalysisRepository.getAnalysisSummary', async () => {
      try {
        // Get recent analyses
        const periodMs = this.periodToMilliseconds(period || '1d');
        const fromDate = new Date(Date.now() - periodMs);
        const toDate = new Date();
        
        const analyses = await this.getAnalysisInRange(symbol, fromDate, toDate);
        
        if (analyses.length === 0) {
          throw new Error(`No analyses found for ${symbol}`);
        }
        
        // Extract summary data
        const latestAnalysis = analyses[0];
        const prices = analyses.map(a => this.extractPrice(a));
        const currentPrice = prices[0];
        
        // Determine trend
        const trend = this.calculateTrend(prices);
        
        // Extract key levels from latest support/resistance analysis
        const keyLevels = this.extractKeyLevels(analyses);
        
        // Extract patterns
        const patterns = await this.extractRecentPatterns(symbol, fromDate, toDate);
        
        // Extract signals
        const signals = this.extractSignals(analyses);
        
        return {
          price: currentPrice,
          trend,
          keyLevels,
          patterns: patterns.map(p => p.type),
          signals,
          confidence: this.calculateOverallConfidence(analyses)
        };
        
      } catch (error) {
        this.logger.error(`Failed to get analysis summary for ${symbol}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Get aggregated metrics for a symbol
   */
  async getAggregatedMetrics(
    symbol: string, 
    metric: string, 
    period: Period
  ): Promise<AggregatedMetrics> {
    return this.performanceMonitor.measure('AnalysisRepository.getAggregatedMetrics', async () => {
      try {
        const periodMs = this.periodToMilliseconds(period);
        const fromDate = new Date(Date.now() - periodMs);
        const toDate = new Date();
        
        const analyses = await this.getAnalysisInRange(symbol, fromDate, toDate);
        
        // Extract metric values
        const values = analyses
          .map(a => this.extractMetricValue(a, metric))
          .filter(v => v !== null) as number[];
        
        if (values.length === 0) {
          throw new Error(`No data found for metric ${metric}`);
        }
        
        // Calculate statistics
        const average = values.reduce((sum, v) => sum + v, 0) / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        // Calculate standard deviation
        const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate trend (linear regression slope)
        const trend = this.calculateLinearTrend(values);
        
        return {
          symbol,
          metric,
          period,
          data: {
            average,
            max,
            min,
            stdDev,
            trend,
            samples: values.length
          }
        };
        
      } catch (error) {
        this.logger.error(`Failed to get aggregated metrics for ${symbol}/${metric}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Search analyses with complex query
   */
  async searchAnalyses(query: AnalysisQuery): Promise<SavedAnalysis[]> {
    return this.performanceMonitor.measure('AnalysisRepository.searchAnalyses', async () => {
      try {
        // Find analysis files
        const files = await this.findAnalysisFiles(query);
        let analyses: SavedAnalysis[] = [];
        
        // Apply date filters if specified
        const fromTimestamp = query.dateFrom?.getTime() || 0;
        const toTimestamp = query.dateTo?.getTime() || Date.now();
        
        for (const file of files) {
          const timestamp = this.extractTimestampFromFileName(file);
          if (timestamp >= fromTimestamp && timestamp <= toTimestamp) {
            const analysis = await this.storageService.load<SavedAnalysis>(file);
            if (analysis && this.matchesAnalysisQuery(analysis, query)) {
              analyses.push(analysis);
            }
          }
        }
        
        // Apply sorting
        analyses = this.sortAnalyses(analyses, query.orderBy, query.orderDirection);
        
        // Apply pagination
        const offset = query.offset || 0;
        const limit = query.limit || 100;
        
        return analyses.slice(offset, offset + limit);
        
      } catch (error) {
        this.logger.error('Failed to search analyses:', error);
        return [];
      }
    });
  }
  
  /**
   * Count analyses matching query
   */
  async countAnalyses(query: AnalysisQuery): Promise<number> {
    return this.performanceMonitor.measure('AnalysisRepository.countAnalyses', async () => {
      try {
        const analyses = await this.searchAnalyses({ ...query, limit: undefined });
        return analyses.length;
      } catch (error) {
        this.logger.error('Failed to count analyses:', error);
        return 0;
      }
    });
  }
  
  /**
   * Delete old analyses
   */
  async deleteOldAnalyses(daysOld: number): Promise<number> {
    return this.performanceMonitor.measure('AnalysisRepository.deleteOldAnalyses', async () => {
      try {
        const cutoffTimestamp = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        const files = await this.findFiles(this.analysisPath, '*.json');
        
        let deletedCount = 0;
        
        for (const file of files) {
          const timestamp = this.extractTimestampFromFileName(file);
          if (timestamp < cutoffTimestamp) {
            await this.storageService.delete(file);
            deletedCount++;
          }
        }
        
        this.logger.info(`Deleted ${deletedCount} old analyses (older than ${daysOld} days)`);
        return deletedCount;
        
      } catch (error) {
        this.logger.error('Failed to delete old analyses:', error);
        return 0;
      }
    });
  }
  
  /**
   * Get repository statistics
   */
  async getRepositoryStats(): Promise<RepositoryStats> {
    return this.performanceMonitor.measure('AnalysisRepository.getRepositoryStats', async () => {
      try {
        this.logger.info('Getting repository stats using StorageService...');
        
        // Get all analysis and pattern files using StorageService query
        const analysisFiles = await this.storageService.query('analysis/**/*.json');
        const patternFiles = await this.storageService.query('patterns/**/*.json');
        
        this.logger.info(`Found ${analysisFiles.length} analysis files and ${patternFiles.length} pattern files`);
        
        // Count by type
        const analysesByType: Record<AnalysisType, number> = {} as any;
        const patternsByType: Record<string, number> = {};
        const symbols = new Set<string>();
        let earliestDate = Date.now();
        let latestDate = 0;
        let totalSize = 0;
        
        // Process analysis files
        for (const file of analysisFiles) {
          try {
            const fileName = path.basename(file);
            
            // Handle both legacy format and new UUID format
            let type: AnalysisType;
            let timestamp: number;
            
            if (fileName.includes('_') && fileName.split('_').length >= 2) {
              // Legacy format: technical_analysis_2025-06-10T14-29-23-469Z.json
              // New format: technical_analysis_1749565763477_uuid.json
              const parts = fileName.split('_');
              type = parts[0] as AnalysisType;
              
              // Extract timestamp - try parsing the second part
              const timestampPart = parts[1];
              if (timestampPart.includes('-') && timestampPart.includes('T')) {
                // Legacy ISO format
                const isoString = timestampPart.replace(/\.json$/, '').replace(/-/g, ':').replace('T', 'T').replace(/-(\d{3})Z$/, '.$1Z');
                timestamp = new Date(isoString).getTime();
              } else {
                // New numeric timestamp format
                timestamp = parseInt(timestampPart) || Date.now();
              }
            } else {
              // Fallback
              type = 'technical_analysis';
              timestamp = Date.now();
            }
            
            analysesByType[type] = (analysesByType[type] || 0) + 1;
            
            // Extract symbol from path: analysis/SYMBOL/filename.json
            const pathParts = file.split('/');
            if (pathParts.length >= 2) {
              const symbol = pathParts[1];
              symbols.add(symbol);
            }
            
            earliestDate = Math.min(earliestDate, timestamp);
            latestDate = Math.max(latestDate, timestamp);
            
            try {
              const size = await this.storageService.getSize(file);
              totalSize += size;
            } catch (statError) {
              this.logger.debug(`Could not get file size for ${file}:`, statError);
            }
            
          } catch (fileError) {
            this.logger.warn(`Error processing analysis file ${file}:`, fileError);
          }
        }
        
        // Process pattern files
        for (const file of patternFiles) {
          try {
            // Extract type from path: patterns/TYPE/filename.json
            const pathParts = file.split('/');
            if (pathParts.length >= 2) {
              const type = pathParts[1];
              patternsByType[type] = (patternsByType[type] || 0) + 1;
            }
            
            const size = await this.storageService.getSize(file);
            totalSize += size;
          } catch (fileError) {
            this.logger.warn(`Error processing pattern file ${file}:`, fileError);
          }
        }
        
        const stats = {
          totalAnalyses: analysisFiles.length,
          analysesByType,
          totalPatterns: patternFiles.length,
          patternsByType,
          symbols: Array.from(symbols),
          dateRange: {
            earliest: earliestDate < Date.now() ? new Date(earliestDate) : new Date(),
            latest: latestDate > 0 ? new Date(latestDate) : new Date()
          },
          storageUsed: totalSize
        };
        
        this.logger.info('Repository stats generated:', {
          totalAnalyses: stats.totalAnalyses,
          totalPatterns: stats.totalPatterns,
          symbols: stats.symbols.length,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        });
        
        return stats;
        
      } catch (error) {
        this.logger.error('Failed to get repository stats:', error);
        throw error;
      }
    });
  }
  
  // ===== Private Helper Methods =====
  
  private extractSummary(type: AnalysisType, data: any): AnalysisSummary {
    // Extract summary based on analysis type
    const summary: AnalysisSummary = {
      price: 0,
      trend: 'neutral',
      keyLevels: [],
      patterns: [],
      signals: []
    };
    
    switch (type) {
      case 'technical_analysis':
      case 'complete_analysis':
        if (data.supportResistance) {
          summary.price = data.supportResistance.currentPrice;
          summary.keyLevels = [
            ...data.supportResistance.supports.map((s: any) => s.level),
            ...data.supportResistance.resistances.map((r: any) => r.level)
          ];
        }
        if (data.volumeDelta?.divergence?.detected) {
          summary.signals = summary.signals || [];
          summary.signals.push(data.volumeDelta.divergence.signal);
        }
        if (data.volumeDelta?.bias) {
          summary.trend = data.volumeDelta.bias === 'buyer' ? 'bullish' : 
                         data.volumeDelta.bias === 'seller' ? 'bearish' : 'neutral';
        }
        break;
        
      case 'support_resistance':
        summary.price = data.currentPrice;
        summary.keyLevels = [
          ...data.supports.map((s: any) => s.level),
          ...data.resistances.map((r: any) => r.level)
        ];
        break;
        
      case 'volume_delta':
        summary.trend = data.bias === 'buyer' ? 'bullish' : 
                       data.bias === 'seller' ? 'bearish' : 'neutral';
        if (data.divergence?.detected) {
          summary.signals = summary.signals || [];
          summary.signals.push(data.divergence.signal);
        }
        break;
    }
    
    return summary;
  }
  
  private async updateIndex(
    symbol: string, 
    type: AnalysisType, 
    id: string, 
    timestamp: number
  ): Promise<void> {
    // For future implementation: maintain an index file for faster lookups
    // This could be a simple JSON file or a lightweight database
  }
  
  private extractTimestampFromFileName(fileName: string): number {
    const baseName = path.basename(fileName);
    const parts = baseName.split('_');
    
    if (parts.length >= 2) {
      const timestampPart = parts[1];
      
      // Check if it's legacy ISO format: 2025-06-10T14-29-23-469Z.json
      if (timestampPart.includes('-') && timestampPart.includes('T')) {
        try {
          // Convert back to proper ISO format
          let isoString = timestampPart.replace(/\.json$/, '');
          
          // Find the last dash before Z and replace with dot
          const zIndex = isoString.lastIndexOf('Z');
          if (zIndex > 0) {
            const beforeZ = isoString.substring(0, zIndex);
            const lastDashIndex = beforeZ.lastIndexOf('-');
            if (lastDashIndex > 0) {
              isoString = beforeZ.substring(0, lastDashIndex) + '.' + beforeZ.substring(lastDashIndex + 1) + 'Z';
            }
          }
          
          // Replace remaining dashes with colons for time parts
          const tIndex = isoString.indexOf('T');
          if (tIndex > 0) {
            const datePart = isoString.substring(0, tIndex);
            const timePart = isoString.substring(tIndex + 1);
            const timeFixed = timePart.replace(/-/g, ':');
            isoString = datePart + 'T' + timeFixed;
          }
          
          const timestamp = new Date(isoString).getTime();
          if (!isNaN(timestamp)) {
            return timestamp;
          }
        } catch (error) {
          this.logger.debug(`Failed to parse legacy timestamp ${timestampPart}:`, error);
        }
      }
      
      // Try numeric timestamp
      const numericTimestamp = parseInt(timestampPart);
      if (!isNaN(numericTimestamp)) {
        return numericTimestamp;
      }
    }
    
    // Fallback to current time
    return Date.now();
  }
  
  private matchesPatternCriteria(pattern: Pattern, criteria: PatternCriteria): boolean {
    if (criteria.minConfidence && pattern.confidence < criteria.minConfidence) {
      return false;
    }
    
    if (criteria.dateFrom && pattern.timestamp < criteria.dateFrom.getTime()) {
      return false;
    }
    
    if (criteria.dateTo && pattern.timestamp > criteria.dateTo.getTime()) {
      return false;
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      // Check if pattern data contains any of the required tags
      // This is a simplified implementation
      return true;
    }
    
    return true;
  }
  
  private calculatePatternSimilarity(pattern1: Pattern, pattern2: Pattern): number {
    // Simple similarity calculation based on type and confidence
    let similarity = 0;
    
    if (pattern1.type === pattern2.type) {
      similarity += 0.5;
    }
    
    // Compare confidence levels
    const confidenceDiff = Math.abs(pattern1.confidence - pattern2.confidence);
    similarity += (1 - confidenceDiff / 100) * 0.5;
    
    return similarity;
  }
  
  private periodToMilliseconds(period: Period): number {
    const periodMap: Record<Period, number> = {
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1m': 30 * 24 * 60 * 60 * 1000
    };
    
    return periodMap[period] || periodMap['1d'];
  }
  
  private extractPrice(analysis: SavedAnalysis): number {
    return analysis.summary?.price || 
           analysis.data?.supportResistance?.currentPrice || 
           analysis.data?.currentPrice || 
           0;
  }
  
  private calculateTrend(prices: number[]): 'bullish' | 'bearish' | 'neutral' {
    if (prices.length < 2) return 'neutral';
    
    const firstPrice = prices[prices.length - 1];
    const lastPrice = prices[0];
    const change = (lastPrice - firstPrice) / firstPrice;
    
    if (change > 0.01) return 'bullish';
    if (change < -0.01) return 'bearish';
    return 'neutral';
  }
  
  private extractKeyLevels(analyses: SavedAnalysis[]): number[] {
    const levels = new Set<number>();
    
    for (const analysis of analyses) {
      if (analysis.summary?.keyLevels) {
        analysis.summary.keyLevels.forEach(level => levels.add(level));
      }
    }
    
    return Array.from(levels).sort((a, b) => a - b);
  }
  
  private async extractRecentPatterns(
    symbol: string, 
    fromDate: Date, 
    toDate: Date
  ): Promise<Pattern[]> {
    return this.findPatterns({
      symbol,
      dateFrom: fromDate,
      dateTo: toDate
    });
  }
  
  private extractSignals(analyses: SavedAnalysis[]): string[] {
    const signals = new Set<string>();
    
    for (const analysis of analyses) {
      if (analysis.summary?.signals) {
        analysis.summary.signals.forEach(signal => signals.add(signal));
      }
    }
    
    return Array.from(signals);
  }
  
  private calculateOverallConfidence(analyses: SavedAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    const confidences = analyses
      .map(a => a.summary?.confidence)
      .filter(c => c !== undefined) as number[];
    
    if (confidences.length === 0) return 75; // Default confidence
    
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
  
  private extractMetricValue(analysis: SavedAnalysis, metric: string): number | null {
    // Extract metric value from analysis data
    // This is a simplified implementation
    const metricPath = metric.split('.');
    let value: any = analysis.data;
    
    for (const key of metricPath) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }
  
  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, xi) => sum + xi, 0);
    const sumY = values.reduce((sum, yi) => sum + yi, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }
  
  private matchesAnalysisQuery(analysis: SavedAnalysis, query: AnalysisQuery): boolean {
    if (query.tags && query.tags.length > 0) {
      const analysisTags = analysis.metadata.tags || [];
      const hasMatchingTag = query.tags.some(tag => analysisTags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    
    return true;
  }
  
  private sortAnalyses(
    analyses: SavedAnalysis[], 
    orderBy?: 'timestamp' | 'confidence' | 'price',
    direction: 'asc' | 'desc' = 'desc'
  ): SavedAnalysis[] {
    const multiplier = direction === 'asc' ? 1 : -1;
    
    return analyses.sort((a, b) => {
      let aValue: number;
      let bValue: number;
      
      switch (orderBy) {
        case 'confidence':
          aValue = a.summary?.confidence || 0;
          bValue = b.summary?.confidence || 0;
          break;
        case 'price':
          aValue = this.extractPrice(a);
          bValue = this.extractPrice(b);
          break;
        case 'timestamp':
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
      }
      
      return (aValue - bValue) * multiplier;
    });
  }
  
  // ===== File System Helper Methods =====
  
  /**
   * List files in a directory matching a pattern
   */
  private async listFiles(dir: string, pattern: string): Promise<string[]> {
    try {
      await fs.access(dir);
      const files = await fs.readdir(dir);
      const matchingFiles = files.filter(file => this.matchesPattern(file, pattern));
      return matchingFiles.map(file => path.join(dir, file));
    } catch {
      return [];
    }
  }
  
  /**
   * Find files recursively in a directory
   */
  private async findFiles(dir: string, pattern: string): Promise<string[]> {
    const results: string[] = [];
    const self = this; // Store reference to this
    
    async function walk(currentDir: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile() && self.matchesPattern(entry.name, pattern)) {
            results.push(fullPath);
          }
        }
      } catch (error) {
        self.logger.debug(`Cannot read directory ${currentDir}:`, error);
        // Skip directories we can't read
      }
    }
    
    try {
      await fs.access(dir);
      await walk(dir);
    } catch (error) {
      this.logger.debug(`Directory ${dir} does not exist or is not accessible`);
    }
    
    return results;
  }
  
  /**
   * Find pattern files based on criteria
   */
  private async findPatternFiles(criteria: PatternCriteria): Promise<string[]> {
    const results: string[] = [];
    
    // Determine which directories to search
    const typeDirs = criteria.type 
      ? [criteria.type]
      : ['wyckoff', 'divergences', 'volume-anomalies'];
    
    for (const typeDir of typeDirs) {
      const typePath = path.join(this.patternsPath, typeDir);
      
      try {
        const files = await fs.readdir(typePath);
        
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          
          // Check if file matches symbol criteria
          if (criteria.symbol) {
            const fileSymbol = file.split('_')[0];
            if (fileSymbol !== criteria.symbol) continue;
          }
          
          results.push(path.join(typePath, file));
        }
      } catch {
        // Skip if directory doesn't exist
      }
    }
    
    return results;
  }
  
  /**
   * Find analysis files based on query
   */
  private async findAnalysisFiles(query: AnalysisQuery): Promise<string[]> {
    const results: string[] = [];
    
    try {
      // Get all symbol directories or specific one
      const symbolDirs = query.symbol 
        ? [query.symbol]
        : await fs.readdir(this.analysisPath);
      
      for (const symbolDir of symbolDirs) {
        const symbolPath = path.join(this.analysisPath, symbolDir);
        
        // Check if it's a directory
        const stat = await fs.stat(symbolPath);
        if (!stat.isDirectory()) continue;
        
        // Get files in symbol directory
        const files = await fs.readdir(symbolPath);
        
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          
          // Check if file matches type criteria
          if (query.type) {
            const fileType = file.split('_')[0];
            if (fileType !== query.type) continue;
          }
          
          results.push(path.join(symbolPath, file));
        }
      }
    } catch (error) {
      this.logger.error('Error finding analysis files:', error);
    }
    
    return results;
  }
  
  /**
   * Simple pattern matching for file names
   */
  private matchesPattern(fileName: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(fileName);
  }
}
