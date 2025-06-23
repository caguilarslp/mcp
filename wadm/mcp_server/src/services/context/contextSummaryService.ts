/**
 * @fileoverview Context Summary Service - Intelligent context compression
 * @description Manages historical analysis context with minimal space consumption
 * @module services/context/contextSummaryService
 * @version 1.0.0
 */

import { Logger } from '../../utils/logger.js';
import { IStorageService } from '../../types/storage.js';
import { HybridStorageService } from '../storage/hybridStorageService.js';

/**
 * Context entry representing a single analysis
 */
export interface ContextEntry {
  id: string;
  symbol: string;
  timeframe: string;
  timestamp: Date;
  type: 'technical' | 'smc' | 'wyckoff' | 'complete';
  key_findings: string[];
  key_metrics: Record<string, number>;
  recommendations: string[];
  confidence: number;
  size_bytes?: number;
}

/**
 * Compressed context summary
 */
export interface ContextSummary {
  symbol: string;
  timeframe_coverage: string[];
  analysis_count: number;
  date_range: {
    start: Date;
    end: Date;
  };
  trend_summary: {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    consistency: number;
  };
  key_levels: {
    support: number[];
    resistance: number[];
    pivot: number;
  };
  volume_profile: {
    avg_volume: number;
    volume_trend: 'increasing' | 'decreasing' | 'stable';
    key_volume_nodes: number[];
  };
  pattern_frequency: Record<string, number>;
  confluences: Array<{
    level: number;
    type: string[];
    strength: number;
  }>;
  recommendations_summary: {
    bias: 'long' | 'short' | 'neutral';
    confidence: number;
    key_points: string[];
  };
  metadata: {
    total_size_bytes: number;
    compression_ratio: number;
    last_updated: Date;
  };
}

/**
 * Configuration for context management
 */
export interface ContextConfig {
  max_entries_per_symbol: number;
  summary_update_threshold: number;
  compression_level: 'low' | 'medium' | 'high';
  retention_days: number;
  auto_summarize: boolean;
}

/**
 * Service for managing and compressing analysis context
 */
export class ContextSummaryService {
  private logger: Logger;
  private storage: IStorageService;
  private config: ContextConfig;
  private contextCache: Map<string, ContextEntry[]> = new Map();
  private summaryCache: Map<string, ContextSummary> = new Map();

  constructor(storage?: IStorageService, config?: Partial<ContextConfig>) {
    this.logger = new Logger('ContextSummaryService');
    this.storage = storage || new HybridStorageService();
    
    this.config = {
      max_entries_per_symbol: 100,
      summary_update_threshold: 10,
      compression_level: 'medium',
      retention_days: 30,
      auto_summarize: true,
      ...config
    };
  }

  /**
   * Add a new analysis to context
   */
  async addAnalysis(
    symbol: string,
    timeframe: string,
    analysis: any,
    type: ContextEntry['type'] = 'technical'
  ): Promise<void> {
    const entry = this.extractContextEntry(symbol, timeframe, analysis, type);
    
    // Get existing entries
    const key = `${symbol}_${timeframe}`;
    let entries = this.contextCache.get(key) || [];
    
    // Add new entry
    entries.push(entry);
    
    // Apply retention policy
    entries = this.applyRetentionPolicy(entries);
    
    // Update cache
    this.contextCache.set(key, entries);
    
    // Check if we need to update summary
    if (this.config.auto_summarize && entries.length % this.config.summary_update_threshold === 0) {
      await this.updateSummary(symbol, timeframe);
    }
    
    // Persist to storage
    await this.persistContext(key, entries);
  }

  /**
   * Extract key context from analysis
   */
  private extractContextEntry(
    symbol: string,
    timeframe: string,
    analysis: any,
    type: ContextEntry['type']
  ): ContextEntry {
    const entry: ContextEntry = {
      id: `${symbol}_${timeframe}_${Date.now()}`,
      symbol,
      timeframe,
      timestamp: new Date(),
      type,
      key_findings: [],
      key_metrics: {},
      recommendations: [],
      confidence: 0
    };

    // Extract based on analysis type
    switch (type) {
      case 'technical':
        this.extractTechnicalContext(entry, analysis);
        break;
      case 'smc':
        this.extractSMCContext(entry, analysis);
        break;
      case 'wyckoff':
        this.extractWyckoffContext(entry, analysis);
        break;
      case 'complete':
        this.extractCompleteContext(entry, analysis);
        break;
    }

    // Calculate entry size
    entry.size_bytes = JSON.stringify(entry).length;

    return entry;
  }

  /**
   * Extract technical analysis context
   */
  private extractTechnicalContext(entry: ContextEntry, analysis: any): void {
    if (analysis.indicators) {
      // RSI
      if (analysis.indicators.rsi) {
        entry.key_metrics.rsi = analysis.indicators.rsi.value;
        if (analysis.indicators.rsi.signal) {
          entry.key_findings.push(`RSI ${analysis.indicators.rsi.signal}`);
        }
      }

      // MACD
      if (analysis.indicators.macd) {
        entry.key_metrics.macd_histogram = analysis.indicators.macd.histogram;
        if (analysis.indicators.macd.signal) {
          entry.key_findings.push(`MACD ${analysis.indicators.macd.signal}`);
        }
      }

      // Moving Averages
      if (analysis.indicators.movingAverages) {
        const ma = analysis.indicators.movingAverages;
        entry.key_metrics.ma50 = ma.sma50;
        entry.key_metrics.ma200 = ma.sma200;
        if (ma.signal) {
          entry.key_findings.push(`MA ${ma.signal}`);
        }
      }
    }

    // Support/Resistance
    if (analysis.supportResistance) {
      const sr = analysis.supportResistance;
      entry.key_metrics.nearest_support = sr.support[0]?.level || 0;
      entry.key_metrics.nearest_resistance = sr.resistance[0]?.level || 0;
    }

    // Overall bias
    if (analysis.summary) {
      entry.confidence = analysis.summary.confidence || 0;
      if (analysis.summary.recommendation) {
        entry.recommendations.push(analysis.summary.recommendation);
      }
    }
  }

  /**
   * Extract SMC context
   */
  private extractSMCContext(entry: ContextEntry, analysis: any): void {
    if (analysis.orderBlocks?.bullish?.length > 0) {
      entry.key_findings.push(`${analysis.orderBlocks.bullish.length} Bullish OBs`);
      entry.key_metrics.bullish_obs = analysis.orderBlocks.bullish.length;
    }

    if (analysis.fairValueGaps?.length > 0) {
      entry.key_findings.push(`${analysis.fairValueGaps.length} FVGs detected`);
      entry.key_metrics.fvg_count = analysis.fairValueGaps.length;
    }

    if (analysis.marketStructure) {
      entry.key_findings.push(`Structure: ${analysis.marketStructure.trend}`);
      entry.key_metrics.structure_breaks = analysis.marketStructure.breaks?.length || 0;
    }

    if (analysis.bias) {
      entry.confidence = analysis.bias.confidence || 0;
      entry.recommendations.push(analysis.bias.direction);
    }
  }

  /**
   * Extract Wyckoff context
   */
  private extractWyckoffContext(entry: ContextEntry, analysis: any): void {
    if (analysis.phase) {
      entry.key_findings.push(`Wyckoff Phase: ${analysis.phase.current}`);
      entry.key_metrics.phase_confidence = analysis.phase.confidence || 0;
    }

    if (analysis.volume) {
      entry.key_findings.push(`Volume: ${analysis.volume.interpretation}`);
      entry.key_metrics.volume_ratio = analysis.volume.ratio || 0;
    }

    if (analysis.events?.length > 0) {
      const latestEvent = analysis.events[0];
      entry.key_findings.push(`Event: ${latestEvent.type}`);
    }

    if (analysis.bias) {
      entry.confidence = analysis.bias.strength || 0;
      entry.recommendations.push(analysis.bias.direction);
    }
  }

  /**
   * Extract complete analysis context
   */
  private extractCompleteContext(entry: ContextEntry, analysis: any): void {
    // Combine all analysis types
    if (analysis.technical) {
      this.extractTechnicalContext(entry, analysis.technical);
    }
    if (analysis.smartMoney) {
      this.extractSMCContext(entry, analysis.smartMoney);
    }
    if (analysis.wyckoff) {
      this.extractWyckoffContext(entry, analysis.wyckoff);
    }

    // Overall summary
    if (analysis.summary) {
      entry.confidence = analysis.summary.overallConfidence || 0;
      if (analysis.summary.actionableSuggestion) {
        entry.recommendations.push(analysis.summary.actionableSuggestion);
      }
    }
  }

  /**
   * Apply retention policy to entries
   */
  private applyRetentionPolicy(entries: ContextEntry[]): ContextEntry[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retention_days);

    // Remove old entries
    let filtered = entries.filter(e => e.timestamp > cutoffDate);

    // Apply max entries limit
    if (filtered.length > this.config.max_entries_per_symbol) {
      // Keep most recent entries
      filtered = filtered
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.config.max_entries_per_symbol);
    }

    return filtered;
  }

  /**
   * Update summary for a symbol/timeframe
   */
  async updateSummary(symbol: string, timeframe: string): Promise<ContextSummary> {
    const key = `${symbol}_${timeframe}`;
    const entries = this.contextCache.get(key) || [];

    if (entries.length === 0) {
      throw new Error(`No entries found for ${key}`);
    }

    const summary = this.generateSummary(symbol, timeframe, entries);
    
    // Cache summary
    this.summaryCache.set(key, summary);

    // Persist summary
    await this.storage.save(
      `context/summaries/${key}.json`,
      summary
    );

    this.logger.info(`Updated summary for ${key}, compression ratio: ${summary.metadata.compression_ratio.toFixed(2)}x`);

    return summary;
  }

  /**
   * Generate compressed summary from entries
   */
  private generateSummary(
    symbol: string,
    timeframe: string,
    entries: ContextEntry[]
  ): ContextSummary {
    // Calculate date range
    const timestamps = entries.map(e => e.timestamp);
    const dateRange = {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };

    // Analyze trends
    const trendVotes = { bullish: 0, bearish: 0, neutral: 0 };
    entries.forEach(entry => {
      entry.recommendations.forEach(rec => {
        if (rec.toLowerCase().includes('buy') || rec.toLowerCase().includes('long')) {
          trendVotes.bullish++;
        } else if (rec.toLowerCase().includes('sell') || rec.toLowerCase().includes('short')) {
          trendVotes.bearish++;
        } else {
          trendVotes.neutral++;
        }
      });
    });

    const totalVotes = trendVotes.bullish + trendVotes.bearish + trendVotes.neutral;
    const trend = this.determineTrend(trendVotes);

    // Extract key levels
    const supportLevels: number[] = [];
    const resistanceLevels: number[] = [];
    
    entries.forEach(entry => {
      if (entry.key_metrics.nearest_support) {
        supportLevels.push(entry.key_metrics.nearest_support);
      }
      if (entry.key_metrics.nearest_resistance) {
        resistanceLevels.push(entry.key_metrics.nearest_resistance);
      }
    });

    // Calculate pivot
    const pivot = this.calculatePivot(supportLevels, resistanceLevels);

    // Volume analysis
    const volumes = entries
      .map(e => e.key_metrics.volume)
      .filter(v => v !== undefined);
    
    const avgVolume = volumes.length > 0 
      ? volumes.reduce((a, b) => a + b, 0) / volumes.length 
      : 0;

    // Pattern frequency
    const patternFreq: Record<string, number> = {};
    entries.forEach(entry => {
      entry.key_findings.forEach(finding => {
        const patterns = ['OB', 'FVG', 'BOS', 'CHoCH', 'Spring', 'Upthrust'];
        patterns.forEach(pattern => {
          if (finding.includes(pattern)) {
            patternFreq[pattern] = (patternFreq[pattern] || 0) + 1;
          }
        });
      });
    });

    // Calculate sizes
    const totalSize = entries.reduce((sum, e) => sum + (e.size_bytes || 0), 0);
    const summarySize = 2000; // Approximate summary size in bytes

    const summary: ContextSummary = {
      symbol,
      timeframe_coverage: [...new Set(entries.map(e => e.timeframe))],
      analysis_count: entries.length,
      date_range: dateRange,
      trend_summary: {
        direction: trend.direction,
        strength: trend.strength,
        consistency: trend.consistency
      },
      key_levels: {
        support: this.consolidateLevels(supportLevels).slice(0, 3),
        resistance: this.consolidateLevels(resistanceLevels).slice(0, 3),
        pivot
      },
      volume_profile: {
        avg_volume: avgVolume,
        volume_trend: this.determineVolumeTrend(entries),
        key_volume_nodes: []
      },
      pattern_frequency: patternFreq,
      confluences: this.findConfluences(entries),
      recommendations_summary: {
        bias: trend.direction === 'bullish' ? 'long' : trend.direction === 'bearish' ? 'short' : 'neutral',
        confidence: this.calculateAverageConfidence(entries),
        key_points: this.extractKeyPoints(entries)
      },
      metadata: {
        total_size_bytes: totalSize,
        compression_ratio: totalSize / summarySize,
        last_updated: new Date()
      }
    };

    return summary;
  }

  /**
   * Determine overall trend from votes
   */
  private determineTrend(votes: { bullish: number; bearish: number; neutral: number }): {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    consistency: number;
  } {
    const total = votes.bullish + votes.bearish + votes.neutral;
    if (total === 0) {
      return { direction: 'neutral', strength: 0, consistency: 0 };
    }

    let direction: 'bullish' | 'bearish' | 'neutral';
    let strength: number;

    if (votes.bullish > votes.bearish && votes.bullish > votes.neutral) {
      direction = 'bullish';
      strength = votes.bullish / total;
    } else if (votes.bearish > votes.bullish && votes.bearish > votes.neutral) {
      direction = 'bearish';
      strength = votes.bearish / total;
    } else {
      direction = 'neutral';
      strength = votes.neutral / total;
    }

    // Calculate consistency (how unanimous the votes are)
    const consistency = strength; // Could be more sophisticated

    return { direction, strength, consistency };
  }

  /**
   * Calculate pivot point from support and resistance levels
   */
  private calculatePivot(supports: number[], resistances: number[]): number {
    const allLevels = [...supports, ...resistances];
    if (allLevels.length === 0) return 0;
    
    return allLevels.reduce((a, b) => a + b, 0) / allLevels.length;
  }

  /**
   * Consolidate similar levels
   */
  private consolidateLevels(levels: number[], tolerance: number = 0.001): number[] {
    if (levels.length === 0) return [];
    
    const sorted = [...levels].sort((a, b) => a - b);
    const consolidated: number[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const lastLevel = consolidated[consolidated.length - 1];
      const percentDiff = Math.abs(sorted[i] - lastLevel) / lastLevel;
      
      if (percentDiff > tolerance) {
        consolidated.push(sorted[i]);
      }
    }
    
    return consolidated;
  }

  /**
   * Determine volume trend
   */
  private determineVolumeTrend(entries: ContextEntry[]): 'increasing' | 'decreasing' | 'stable' {
    if (entries.length < 3) return 'stable';
    
    const recentVolumes = entries
      .slice(-10)
      .map(e => e.key_metrics.volume)
      .filter(v => v !== undefined);
    
    if (recentVolumes.length < 3) return 'stable';
    
    // Simple linear regression
    const n = recentVolumes.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = recentVolumes.reduce((a, b) => a + b, 0);
    const sumXY = recentVolumes.reduce((sum, y, i) => sum + y * (i + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (slope > 0.05) return 'increasing';
    if (slope < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Find price level confluences
   */
  private findConfluences(entries: ContextEntry[]): Array<{
    level: number;
    type: string[];
    strength: number;
  }> {
    const levelMap = new Map<number, string[]>();
    
    entries.forEach(entry => {
      // Collect all levels
      if (entry.key_metrics.nearest_support) {
        const rounded = Math.round(entry.key_metrics.nearest_support * 100) / 100;
        const types = levelMap.get(rounded) || [];
        types.push('support');
        levelMap.set(rounded, types);
      }
      
      if (entry.key_metrics.nearest_resistance) {
        const rounded = Math.round(entry.key_metrics.nearest_resistance * 100) / 100;
        const types = levelMap.get(rounded) || [];
        types.push('resistance');
        levelMap.set(rounded, types);
      }
    });
    
    // Convert to confluences
    const confluences = Array.from(levelMap.entries())
      .filter(([_, types]) => types.length > 1)
      .map(([level, types]) => ({
        level,
        type: [...new Set(types)],
        strength: types.length / entries.length
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
    
    return confluences;
  }

  /**
   * Calculate average confidence
   */
  private calculateAverageConfidence(entries: ContextEntry[]): number {
    const confidences = entries.map(e => e.confidence).filter(c => c > 0);
    if (confidences.length === 0) return 0;
    
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  /**
   * Extract key points from entries
   */
  private extractKeyPoints(entries: ContextEntry[]): string[] {
    const points: string[] = [];
    
    // Get most frequent findings
    const findingFreq = new Map<string, number>();
    entries.forEach(entry => {
      entry.key_findings.forEach(finding => {
        findingFreq.set(finding, (findingFreq.get(finding) || 0) + 1);
      });
    });
    
    // Sort by frequency and take top 5
    const topFindings = Array.from(findingFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([finding, _]) => finding);
    
    points.push(...topFindings);
    
    return points;
  }

  /**
   * Persist context to storage
   */
  private async persistContext(key: string, entries: ContextEntry[]): Promise<void> {
    await this.storage.save(
      `context/entries/${key}.json`,
      entries
    );
  }

  /**
   * Get context summary for a symbol/timeframe
   */
  async getContextSummary(symbol: string, timeframe: string): Promise<ContextSummary | null> {
    const key = `${symbol}_${timeframe}`;
    
    // Check cache first
    if (this.summaryCache.has(key)) {
      return this.summaryCache.get(key)!;
    }
    
    // Load from storage
    const summary = await this.storage.load<ContextSummary>(
      `context/summaries/${key}.json`
    );
    
    if (summary) {
      this.summaryCache.set(key, summary);
    }
    
    return summary;
  }

  /**
   * Get multi-timeframe context for a symbol
   */
  async getMultiTimeframeContext(
    symbol: string,
    timeframes: string[] = ['5', '15', '60', '240', 'D']
  ): Promise<Record<string, ContextSummary>> {
    const result: Record<string, ContextSummary> = {};
    
    for (const tf of timeframes) {
      const summary = await this.getContextSummary(symbol, tf);
      if (summary) {
        result[tf] = summary;
      }
    }
    
    return result;
  }

  /**
   * Generate ultra-compressed context for AI
   */
  async getUltraCompressedContext(symbol: string): Promise<string> {
    const mtfContext = await this.getMultiTimeframeContext(symbol);
    
    const lines: string[] = [
      `=== ${symbol} Context Summary ===`,
      ''
    ];
    
    for (const [tf, summary] of Object.entries(mtfContext)) {
      lines.push(`[${tf}] ${summary.trend_summary.direction.toUpperCase()} (${(summary.trend_summary.strength * 100).toFixed(0)}%)`);
      lines.push(`  S: ${summary.key_levels.support.map(s => s.toFixed(2)).join(', ')}`);
      lines.push(`  R: ${summary.key_levels.resistance.map(r => r.toFixed(2)).join(', ')}`);
      
      if (Object.keys(summary.pattern_frequency).length > 0) {
        const patterns = Object.entries(summary.pattern_frequency)
          .map(([p, c]) => `${p}:${c}`)
          .join(', ');
        lines.push(`  Patterns: ${patterns}`);
      }
      
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Clean up old context data
   */
  async cleanup(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retention_days);
    
    let cleaned = 0;
    
    // Clean entries
    const entryFiles = await this.storage.list('context/entries');
    for (const file of entryFiles) {
      const entries = await this.storage.load<ContextEntry[]>(`context/entries/${file}`);
      if (entries && entries.length > 0) {
        const filtered = entries.filter(e => new Date(e.timestamp) > cutoffDate);
        if (filtered.length < entries.length) {
          await this.storage.save(`context/entries/${file}`, filtered);
          cleaned += entries.length - filtered.length;
        }
      }
    }
    
    this.logger.info(`Cleaned up ${cleaned} old context entries`);
    return cleaned;
  }
}
