/**
 * @fileoverview Repository Service - Analysis Storage Management
 * @description Base repository service for storing and retrieving analyses
 * @module services/repository/repositoryService
 * @version 1.0.0
 */

import { IStorageService } from '../../types/storage.js';
import { StorageService } from '../storage.js';
import { Logger } from '../../utils/logger.js';

export interface AnalysisMetadata {
  id: string;
  type: string;
  symbol?: string;
  timeframe?: string;
  timestamp: Date;
  version?: string;
  [key: string]: any;
}

export interface SavedAnalysis {
  id: string;
  type: string;
  data: any;
  metadata: AnalysisMetadata;
  timestamp: Date;
}

/**
 * Repository service for managing analysis storage
 */
export class RepositoryService {
  protected logger: Logger;
  protected storage: IStorageService;

  constructor() {
    this.logger = new Logger('RepositoryService');
    this.storage = new StorageService();
  }

  /**
   * Save analysis data
   */
  async saveAnalysis(
    id: string,
    type: string,
    data: any,
    metadata?: any
  ): Promise<string> {
    const analysis: SavedAnalysis = {
      id,
      type,
      data,
      metadata: {
        id,
        type,
        timestamp: new Date(),
        ...metadata
      },
      timestamp: new Date()
    };

    const path = `analyses/${type}/${id}.json`;
    await this.storage.save(path, analysis);
    
    this.logger.info(`Saved analysis ${id} of type ${type}`);
    return id;
  }

  /**
   * Get analysis by ID
   */
  async getAnalysis(id: string): Promise<SavedAnalysis | null> {
    // Try to find in different type folders
    const types = ['technical', 'smc', 'wyckoff', 'complete'];
    
    for (const type of types) {
      const path = `analyses/${type}/${id}.json`;
      const analysis = await this.storage.load<SavedAnalysis>(path);
      if (analysis) {
        return analysis;
      }
    }
    
    return null;
  }

  /**
   * Get latest analysis
   */
  async getLatest(symbol: string, type: string): Promise<SavedAnalysis | null> {
    const files = await this.storage.list(`analyses/${type}`);
    
    const symbolFiles = files.filter(f => f.includes(symbol));
    if (symbolFiles.length === 0) {
      return null;
    }
    
    // Get most recent
    let latest: SavedAnalysis | null = null;
    let latestTime = 0;
    
    for (const file of symbolFiles) {
      const analysis = await this.storage.load<SavedAnalysis>(`analyses/${type}/${file}`);
      if (analysis && new Date(analysis.timestamp).getTime() > latestTime) {
        latest = analysis;
        latestTime = new Date(analysis.timestamp).getTime();
      }
    }
    
    return latest;
  }

  /**
   * Search analyses
   */
  async search(criteria: any, options?: any): Promise<SavedAnalysis[]> {
    const results: SavedAnalysis[] = [];
    const types = criteria.type ? [criteria.type] : ['technical', 'smc', 'wyckoff', 'complete'];
    
    for (const type of types) {
      const files = await this.storage.list(`analyses/${type}`);
      
      for (const file of files) {
        const analysis = await this.storage.load<SavedAnalysis>(`analyses/${type}/${file}`);
        if (analysis && this.matchesCriteria(analysis, criteria)) {
          results.push(analysis);
        }
      }
    }
    
    // Sort by timestamp desc
    results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply limit if specified
    if (options?.limit) {
      return results.slice(0, options.limit);
    }
    
    return results;
  }

  /**
   * Check if analysis matches criteria
   */
  private matchesCriteria(analysis: SavedAnalysis, criteria: any): boolean {
    if (criteria.symbol && analysis.metadata.symbol !== criteria.symbol) {
      return false;
    }
    
    if (criteria.timeframe && analysis.metadata.timeframe !== criteria.timeframe) {
      return false;
    }
    
    if (criteria.dateFrom && new Date(analysis.timestamp) < new Date(criteria.dateFrom)) {
      return false;
    }
    
    if (criteria.dateTo && new Date(analysis.timestamp) > new Date(criteria.dateTo)) {
      return false;
    }
    
    return true;
  }

  /**
   * Delete old analyses
   */
  async vacuum(daysOld?: number): Promise<number> {
    const cutoffDays = daysOld || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);
    
    let deleted = 0;
    const types = ['technical', 'smc', 'wyckoff', 'complete'];
    
    for (const type of types) {
      const files = await this.storage.list(`analyses/${type}`);
      
      for (const file of files) {
        const analysis = await this.storage.load<SavedAnalysis>(`analyses/${type}/${file}`);
        if (analysis && new Date(analysis.timestamp) < cutoffDate) {
          await this.storage.delete(`analyses/${type}/${file}`);
          deleted++;
        }
      }
    }
    
    this.logger.info(`Vacuumed ${deleted} old analyses`);
    return deleted;
  }
}
