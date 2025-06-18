/**
 * Persistent Context Manager - Production Ready
 * Mantiene 3 meses de contexto comprimido en memoria y disco
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { gzipSync, gunzipSync } from 'zlib';
import { MongoClient, Db, Collection } from 'mongodb';
import { Logger } from '../../utils/logger.js';

interface ContextEntry {
  timestamp: Date;
  symbol: string;
  timeframe: string;
  type: string;
  data: any;
  summary: string;
}

interface CompressedContext {
  daily: Map<string, ContextEntry[]>;
  weekly: Map<string, ContextEntry[]>;
  monthly: Map<string, ContextEntry[]>;
}

export class PersistentContextManager {
  private context: CompressedContext;
  private contextPath: string;
  private maxDailyEntries = 100;
  private maxWeeklyEntries = 50;
  private maxMonthlyEntries = 20;
  private logger: Logger;
  private mongoClient?: MongoClient;
  private db?: Db;
  private contextCollection?: Collection<any>;
  private useMongoDb: boolean = false;

  constructor() {
    this.logger = new Logger('PersistentContextManager');
    this.contextPath = join(process.cwd(), 'storage', 'context');
    if (!existsSync(this.contextPath)) {
      mkdirSync(this.contextPath, { recursive: true });
    }

    this.context = {
      daily: new Map(),
      weekly: new Map(),
      monthly: new Map()
    };

    // Initialize MongoDB if available
    this.initializeMongoDB().then(() => {
      this.loadContext();
    });
  }

  private async initializeMongoDB(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.MONGODB_DATABASE || 'waickoff_mcp';
      
      this.mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      });
      
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(dbName);
      this.contextCollection = this.db.collection('analysis_context');
      
      // Create indexes for efficient queries
      await this.contextCollection.createIndex({ symbol: 1, timeframe: 1, timestamp: -1 });
      await this.contextCollection.createIndex({ 'data.type': 1 });
      await this.contextCollection.createIndex({ timestamp: -1 });
      
      this.useMongoDb = true;
      this.logger.info('MongoDB connected for context persistence');
      this.logger.info(`Database: ${dbName}, Collections will be created as needed`);
    } catch (error) {
      this.logger.info('MongoDB not available, using file-based context (this is normal)');
      this.useMongoDb = false;
    }
  }

  private getContextFile(period: 'daily' | 'weekly' | 'monthly'): string {
    return join(this.contextPath, `context_${period}.gz`);
  }

  private async loadContext(): Promise<void> {
    if (this.useMongoDb) {
      // Load from MongoDB
      try {
        const now = new Date();
        const dailyCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weeklyCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const monthlyCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        
        // Load daily entries
        const dailyEntries = await this.contextCollection!.find({
          timestamp: { $gte: dailyCutoff },
          'data.period': 'daily'
        }).toArray();
        
        // Load weekly entries
        const weeklyEntries = await this.contextCollection!.find({
          timestamp: { $gte: weeklyCutoff },
          'data.period': 'weekly'
        }).toArray();
        
        // Load monthly entries
        const monthlyEntries = await this.contextCollection!.find({
          timestamp: { $gte: monthlyCutoff },
          'data.period': 'monthly'
        }).toArray();
        
        // Organize into maps
        this.organizeMongoDataIntoContext(dailyEntries, 'daily');
        this.organizeMongoDataIntoContext(weeklyEntries, 'weekly');
        this.organizeMongoDataIntoContext(monthlyEntries, 'monthly');
        
        this.logger.info(`Loaded context from MongoDB: ${dailyEntries.length} daily, ${weeklyEntries.length} weekly, ${monthlyEntries.length} monthly`);
      } catch (error) {
        this.logger.error('Failed to load from MongoDB, falling back to files:', error);
        this.loadFromFiles();
      }
    } else {
      this.loadFromFiles();
    }
  }
  
  private loadFromFiles(): void {
    ['daily', 'weekly', 'monthly'].forEach(period => {
      const file = this.getContextFile(period as any);
      if (existsSync(file)) {
        try {
          const compressed = readFileSync(file);
          const decompressed = gunzipSync(compressed).toString('utf-8');
          const data = JSON.parse(decompressed);
          this.context[period as keyof CompressedContext] = new Map(Object.entries(data));
        } catch (error) {
          this.logger.error(`Failed to load ${period} context from file:`, error);
        }
      }
    });
  }
  
  private organizeMongoDataIntoContext(entries: any[], period: 'daily' | 'weekly' | 'monthly'): void {
    entries.forEach(entry => {
      const key = `${entry.symbol}_${entry.timeframe}`;
      if (!this.context[period].has(key)) {
        this.context[period].set(key, []);
      }
      this.context[period].get(key)!.push(entry);
    });
  }

  private async saveContext(period: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    // Always save to files as backup
    const data = Object.fromEntries(this.context[period]);
    const json = JSON.stringify(data);
    const compressed = gzipSync(json);
    writeFileSync(this.getContextFile(period), compressed);
    
    // Also save to MongoDB if available
    if (this.useMongoDb && this.contextCollection) {
      try {
        const entries = [];
        for (const [key, values] of this.context[period].entries()) {
          for (const value of values) {
            entries.push({
              ...value,
              _contextKey: key,
              _period: period,
              _lastUpdated: new Date()
            });
          }
        }
        
        if (entries.length > 0) {
          // Bulk upsert to MongoDB
          const bulkOps = entries.map(entry => ({
            replaceOne: {
              filter: { 
                symbol: entry.symbol, 
                timeframe: entry.timeframe, 
                timestamp: entry.timestamp,
                type: entry.type 
              },
              replacement: entry,
              upsert: true
            }
          }));
          
          await this.contextCollection.bulkWrite(bulkOps);
          this.logger.debug(`Saved ${entries.length} ${period} context entries to MongoDB`);
        }
      } catch (error) {
        this.logger.error(`Failed to save ${period} context to MongoDB:`, error);
      }
    }
  }

  public async addEntry(entry: Omit<ContextEntry, 'timestamp'>): Promise<void> {
    const fullEntry: ContextEntry = {
      ...entry,
      timestamp: new Date()
    };

    const key = `${entry.symbol}_${entry.timeframe}`;

    // Add to daily
    if (!this.context.daily.has(key)) {
      this.context.daily.set(key, []);
    }
    const dailyEntries = this.context.daily.get(key)!;
    dailyEntries.push(fullEntry);
    
    // Limit daily entries
    if (dailyEntries.length > this.maxDailyEntries) {
      const removed = dailyEntries.splice(0, dailyEntries.length - this.maxDailyEntries);
      // Move old entries to weekly
      await this.compressToWeekly(key, removed);
    }

    await this.saveContext('daily');
  }

  private async compressToWeekly(key: string, entries: ContextEntry[]): Promise<void> {
    if (!this.context.weekly.has(key)) {
      this.context.weekly.set(key, []);
    }
    
    const weeklyEntries = this.context.weekly.get(key)!;
    // Compress multiple daily entries into weekly summary
    const weeklyEntry: ContextEntry = {
      timestamp: new Date(),
      symbol: entries[0].symbol,
      timeframe: entries[0].timeframe,
      type: 'weekly_summary',
      data: this.summarizeEntries(entries),
      summary: `Weekly summary of ${entries.length} analyses`
    };
    
    weeklyEntries.push(weeklyEntry);
    
    if (weeklyEntries.length > this.maxWeeklyEntries) {
      const removed = weeklyEntries.splice(0, weeklyEntries.length - this.maxWeeklyEntries);
      await this.compressToMonthly(key, removed);
    }

    await this.saveContext('weekly');
  }

  private async compressToMonthly(key: string, entries: ContextEntry[]): Promise<void> {
    if (!this.context.monthly.has(key)) {
      this.context.monthly.set(key, []);
    }
    
    const monthlyEntries = this.context.monthly.get(key)!;
    const monthlyEntry: ContextEntry = {
      timestamp: new Date(),
      symbol: entries[0].symbol,
      timeframe: entries[0].timeframe,
      type: 'monthly_summary',
      data: this.summarizeEntries(entries),
      summary: `Monthly summary of ${entries.length} weekly summaries`
    };
    
    monthlyEntries.push(monthlyEntry);
    
    if (monthlyEntries.length > this.maxMonthlyEntries) {
      monthlyEntries.splice(0, monthlyEntries.length - this.maxMonthlyEntries);
    }

    await this.saveContext('monthly');
  }

  private summarizeEntries(entries: ContextEntry[]): any {
    // Extract key metrics from entries
    const summary = {
      period: {
        start: entries[0].timestamp,
        end: entries[entries.length - 1].timestamp
      },
      entryCount: entries.length,
      keyLevels: new Set<number>(),
      dominantBias: '',
      avgVolume: 0,
      priceRange: { high: 0, low: Infinity },
      patterns: new Map<string, number>()
    };

    entries.forEach(entry => {
      if (entry.data.supportResistance) {
        entry.data.supportResistance.forEach((level: any) => {
          summary.keyLevels.add(Math.round(level.price));
        });
      }
      if (entry.data.marketBias) {
        const bias = entry.data.marketBias;
        summary.patterns.set(bias, (summary.patterns.get(bias) || 0) + 1);
      }
      if (entry.data.price) {
        summary.priceRange.high = Math.max(summary.priceRange.high, entry.data.price);
        summary.priceRange.low = Math.min(summary.priceRange.low, entry.data.price);
      }
    });

    // Determine dominant bias
    let maxCount = 0;
    summary.patterns.forEach((count, bias) => {
      if (count > maxCount) {
        maxCount = count;
        summary.dominantBias = bias;
      }
    });

    return {
      ...summary,
      keyLevels: Array.from(summary.keyLevels),
      patterns: Object.fromEntries(summary.patterns)
    };
  }

  public getContext(symbol: string, timeframe: string, lookbackDays: number = 90): any {
    const key = `${symbol}_${timeframe}`;
    const now = new Date();
    const cutoff = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    const context = {
      daily: [] as ContextEntry[],
      weekly: [] as ContextEntry[],
      monthly: [] as ContextEntry[],
      summary: null as any
    };

    // Get daily entries
    const dailyEntries = this.context.daily.get(key) || [];
    context.daily = dailyEntries.filter(e => e.timestamp > cutoff);

    // Get weekly entries
    const weeklyEntries = this.context.weekly.get(key) || [];
    context.weekly = weeklyEntries.filter(e => e.timestamp > cutoff);

    // Get monthly entries
    const monthlyEntries = this.context.monthly.get(key) || [];
    context.monthly = monthlyEntries;

    // Create unified summary
    context.summary = this.createUnifiedSummary(context);

    return context;
  }

  private createUnifiedSummary(context: any): any {
    const allKeyLevels = new Set<number>();
    const biasCount = new Map<string, number>();
    let totalEntries = 0;

    // Process all entries
    [...context.daily, ...context.weekly, ...context.monthly].forEach(entry => {
      totalEntries++;
      if (entry.data.keyLevels) {
        entry.data.keyLevels.forEach((level: number) => allKeyLevels.add(level));
      }
      if (entry.data.dominantBias) {
        biasCount.set(entry.data.dominantBias, 
          (biasCount.get(entry.data.dominantBias) || 0) + 1);
      }
    });

    // Find dominant bias
    let dominantBias = '';
    let maxBias = 0;
    biasCount.forEach((count, bias) => {
      if (count > maxBias) {
        maxBias = count;
        dominantBias = bias;
      }
    });

    return {
      totalAnalyses: totalEntries,
      historicalKeyLevels: Array.from(allKeyLevels).sort((a, b) => a - b),
      dominantHistoricalBias: dominantBias,
      biasDistribution: Object.fromEntries(biasCount),
      lastUpdated: new Date()
    };
  }

  public async clearOldData(): Promise<void> {
    const now = new Date();
    const threemonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Clean daily entries older than 7 days
    this.context.daily.forEach((entries, key) => {
      const filtered = entries.filter(e => 
        e.timestamp > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      );
      if (filtered.length < entries.length) {
        this.context.daily.set(key, filtered);
      }
    });

    // Clean weekly entries older than 30 days
    this.context.weekly.forEach((entries, key) => {
      const filtered = entries.filter(e => 
        e.timestamp > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      );
      if (filtered.length < entries.length) {
        this.context.weekly.set(key, filtered);
      }
    });

    // Clean monthly entries older than 90 days
    this.context.monthly.forEach((entries, key) => {
      const filtered = entries.filter(e => e.timestamp > threemonthsAgo);
      if (filtered.length < entries.length) {
        this.context.monthly.set(key, filtered);
      }
    });

    // Save all
    await this.saveContext('daily');
    await this.saveContext('weekly');
    await this.saveContext('monthly');
    
    // Clean MongoDB if available
    if (this.useMongoDb && this.contextCollection) {
      try {
        await this.contextCollection.deleteMany({ timestamp: { $lt: threemonthsAgo } });
        this.logger.info('Cleaned old MongoDB context entries');
      } catch (error) {
        this.logger.error('Failed to clean MongoDB context:', error);
      }
    }
  }
  
  public async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.logger.info('MongoDB connection closed');
    }
  }
  
  // Public method to re-initialize MongoDB
  public async reinitializeMongoDB(): Promise<boolean> {
    this.logger.info('Attempting to reinitialize MongoDB connection...');
    await this.close();
    await this.initializeMongoDB();
    await this.loadContext();
    return this.useMongoDb;
  }
}

// Global instance
export const globalContext = new PersistentContextManager();
