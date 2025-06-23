/**
 * @fileoverview Report Generator Service
 * @description Generates comprehensive reports from analysis data
 * @module services/reports/reportGenerator
 * @version 1.0.0
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IReportGenerator,
  IAnalysisRepository,
  IStorageService,
  ReportType,
  ReportFormat,
  ReportOptions,
  ReportSection,
  GeneratedReport,
  SavedAnalysis,
  Pattern,
  Period,
  AnalysisType,
  ChartData,
  TableData,
  AnalysisQuery,
  PatternCriteria
} from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { PerformanceMonitor } from '../../utils/performance.js';

/**
 * Report Generator for creating comprehensive analysis reports
 */
export class ReportGenerator implements IReportGenerator {
  private analysisRepository: IAnalysisRepository;
  private storageService: IStorageService;
  private reportsPath: string;
  private logger: Logger;
  private performanceMonitor: PerformanceMonitor;
  
  constructor(
    analysisRepository: IAnalysisRepository,
    storageService: IStorageService,
    basePath: string = './storage'
  ) {
    this.analysisRepository = analysisRepository;
    this.storageService = storageService;
    this.reportsPath = 'reports';
    this.logger = new Logger('ReportGenerator');
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  /**
   * Generate a report based on options
   */
  async generateReport(options: ReportOptions): Promise<GeneratedReport> {
    return this.performanceMonitor.measure('ReportGenerator.generateReport', async () => {
      try {
        this.logger.info(`Generating ${options.type} report in ${options.format || 'markdown'} format`);
        
        // Determine date range
        const dateTo = options.dateTo || new Date();
        const dateFrom = options.dateFrom || this.getDefaultDateFrom(options.type, dateTo);
        
        // Generate sections based on report type
        const sections = await this.generateSections(options, dateFrom, dateTo);
        
        // Create report metadata
        const report: GeneratedReport = {
          id: randomUUID(),
          type: options.type,
          format: options.format || 'markdown',
          generatedAt: new Date(),
          period: { from: dateFrom, to: dateTo },
          metadata: {
            symbols: await this.getReportSymbols(options),
            analysisCount: await this.countAnalyses(options, dateFrom, dateTo),
            patternCount: await this.countPatterns(options, dateFrom, dateTo),
            version: '1.3.9'
          },
          sections,
          summary: this.generateSummary(sections),
          content: ''
        };
        
        // Format content based on output format
        report.content = await this.formatReport(report);
        
        // Save report
        await this.saveReport(report);
        
        this.logger.info(`Report generated successfully: ${report.id}`);
        return report;
        
      } catch (error) {
        this.logger.error('Failed to generate report:', error);
        throw error;
      }
    });
  }
  
  /**
   * Generate daily report
   */
  async generateDailyReport(date?: Date): Promise<GeneratedReport> {
    const targetDate = date || new Date();
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    return this.generateReport({
      type: 'daily',
      dateFrom: startDate,
      dateTo: endDate,
      includeCharts: true,
      includePatterns: true
    });
  }
  
  /**
   * Generate weekly report
   */
  async generateWeeklyReport(weekStartDate?: Date): Promise<GeneratedReport> {
    const startDate = weekStartDate || new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    return this.generateReport({
      type: 'weekly',
      dateFrom: startDate,
      dateTo: endDate,
      includeCharts: true,
      includePatterns: true
    });
  }
  
  /**
   * Generate symbol-specific report
   */
  async generateSymbolReport(symbol: string, period: Period = '1d'): Promise<GeneratedReport> {
    const dateTo = new Date();
    const dateFrom = this.getDateFromPeriod(period, dateTo);
    
    return this.generateReport({
      type: 'symbol',
      symbol,
      dateFrom,
      dateTo,
      includeCharts: true,
      includePatterns: true
    });
  }
  
  /**
   * Generate performance report
   */
  async generatePerformanceReport(period: Period = '1w'): Promise<GeneratedReport> {
    const dateTo = new Date();
    const dateFrom = this.getDateFromPeriod(period, dateTo);
    
    return this.generateReport({
      type: 'performance',
      dateFrom,
      dateTo,
      includeCharts: true
    });
  }
  
  /**
   * Generate pattern analysis report
   */
  async generatePatternReport(patternType?: string, period: Period = '1w'): Promise<GeneratedReport> {
    const dateTo = new Date();
    const dateFrom = this.getDateFromPeriod(period, dateTo);
    
    return this.generateReport({
      type: 'patterns',
      dateFrom,
      dateTo,
      includePatterns: true,
      customQuery: patternType ? { type: patternType as AnalysisType } : undefined
    });
  }
  
  /**
   * Save report to storage
   */
  async saveReport(report: GeneratedReport): Promise<string> {
    const fileName = `${report.type}_${report.generatedAt.getTime()}_${report.id}.json`;
    const relativePath = path.join(this.reportsPath, report.type, fileName);
    
    await this.storageService.save(relativePath, report);
    
    // Also save formatted content if not JSON
    if (report.format !== 'json') {
      const contentFileName = `${report.type}_${report.generatedAt.getTime()}_${report.id}.${report.format}`;
      const contentPath = path.join(this.reportsPath, report.type, contentFileName);
      await this.storageService.save(contentPath, report.content);
    }
    
    return report.id;
  }
  
  /**
   * Get report by ID
   */
  async getReport(id: string): Promise<GeneratedReport | null> {
    try {
      const files = await this.storageService.query(`reports/**/*_${id}.json`);
      if (files.length === 0) return null;
      
      return await this.storageService.load<GeneratedReport>(files[0]);
    } catch (error) {
      this.logger.error(`Failed to get report ${id}:`, error);
      return null;
    }
  }
  
  /**
   * List reports
   */
  async listReports(type?: ReportType, limit: number = 10): Promise<GeneratedReport[]> {
    try {
      const pattern = type ? `reports/${type}/*.json` : 'reports/**/*.json';
      const files = await this.storageService.query(pattern);
      
      // Sort by date (newest first)
      const sortedFiles = files.sort((a, b) => {
        const timestampA = this.extractTimestampFromReportFile(a);
        const timestampB = this.extractTimestampFromReportFile(b);
        return timestampB - timestampA;
      });
      
      // Load reports
      const reports: GeneratedReport[] = [];
      for (let i = 0; i < Math.min(limit, sortedFiles.length); i++) {
        const report = await this.storageService.load<GeneratedReport>(sortedFiles[i]);
        if (report) reports.push(report);
      }
      
      return reports;
    } catch (error) {
      this.logger.error('Failed to list reports:', error);
      return [];
    }
  }
  
  /**
   * Delete old reports
   */
  async deleteOldReports(daysOld: number): Promise<number> {
    try {
      const cutoffTimestamp = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      const files = await this.storageService.query('reports/**/*');
      
      let deletedCount = 0;
      for (const file of files) {
        const timestamp = this.extractTimestampFromReportFile(file);
        if (timestamp < cutoffTimestamp) {
          await this.storageService.delete(file);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to delete old reports:', error);
      return 0;
    }
  }
  
  /**
   * Export report to file
   */
  async exportReport(report: GeneratedReport, outputPath: string): Promise<void> {
    try {
      const extension = report.format === 'json' ? 'json' : report.format;
      const fullPath = outputPath.endsWith(`.${extension}`) ? outputPath : `${outputPath}.${extension}`;
      
      if (report.format === 'json') {
        await fs.writeFile(fullPath, JSON.stringify(report, null, 2));
      } else {
        await fs.writeFile(fullPath, report.content);
      }
      
      this.logger.info(`Report exported to ${fullPath}`);
    } catch (error) {
      this.logger.error('Failed to export report:', error);
      throw error;
    }
  }
  
  // ====================
  // PRIVATE HELPERS
  // ====================
  
  private async generateSections(
    options: ReportOptions,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    
    switch (options.type) {
      case 'daily':
        sections.push(...await this.generateDailySections(options, dateFrom, dateTo));
        break;
      case 'weekly':
        sections.push(...await this.generateWeeklySections(options, dateFrom, dateTo));
        break;
      case 'symbol':
        sections.push(...await this.generateSymbolSections(options, dateFrom, dateTo));
        break;
      case 'performance':
        sections.push(...await this.generatePerformanceSections(options, dateFrom, dateTo));
        break;
      case 'patterns':
        sections.push(...await this.generatePatternSections(options, dateFrom, dateTo));
        break;
      case 'custom':
        sections.push(...await this.generateCustomSections(options, dateFrom, dateTo));
        break;
    }
    
    return sections;
  }
  
  private async generateDailySections(
    options: ReportOptions,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    
    // Market Overview
    const marketOverview = await this.generateMarketOverviewSection(dateFrom, dateTo);
    sections.push(marketOverview);
    
    // Top Movers
    const topMovers = await this.generateTopMoversSection(dateFrom, dateTo);
    sections.push(topMovers);
    
    // Pattern Detections
    if (options.includePatterns) {
      const patterns = await this.generatePatternDetectionSection(dateFrom, dateTo);
      sections.push(patterns);
    }
    
    // Volume Analysis
    const volumeAnalysis = await this.generateVolumeAnalysisSection(dateFrom, dateTo);
    sections.push(volumeAnalysis);
    
    return sections;
  }
  
  private async generateWeeklySections(
    options: ReportOptions,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    
    // Weekly Summary
    const weeklySummary = await this.generateWeeklySummarySection(dateFrom, dateTo);
    sections.push(weeklySummary);
    
    // Trend Analysis
    const trendAnalysis = await this.generateTrendAnalysisSection(dateFrom, dateTo);
    sections.push(trendAnalysis);
    
    // Pattern Summary
    if (options.includePatterns) {
      const patternSummary = await this.generatePatternSummarySection(dateFrom, dateTo);
      sections.push(patternSummary);
    }
    
    // Performance Metrics
    const performance = await this.generatePerformanceMetricsSection(dateFrom, dateTo);
    sections.push(performance);
    
    return sections;
  }
  
  private async generateSymbolSections(
    options: ReportOptions,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    const symbol = options.symbol!;
    
    // Symbol Overview
    const overview = await this.generateSymbolOverviewSection(symbol, dateFrom, dateTo);
    sections.push(overview);
    
    // Technical Analysis Summary
    const technical = await this.generateTechnicalSummarySection(symbol, dateFrom, dateTo);
    sections.push(technical);
    
    // Support/Resistance Levels
    const levels = await this.generateSupportResistanceSection(symbol, dateFrom, dateTo);
    sections.push(levels);
    
    // Pattern History
    if (options.includePatterns) {
      const patterns = await this.generateSymbolPatternSection(symbol, dateFrom, dateTo);
      sections.push(patterns);
    }
    
    return sections;
  }
  
  private async generatePerformanceSections(
    options: ReportOptions,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    
    // Analysis Performance
    const analysisPerf = await this.generateAnalysisPerformanceSection(dateFrom, dateTo);
    sections.push(analysisPerf);
    
    // Pattern Accuracy
    const patternAccuracy = await this.generatePatternAccuracySection(dateFrom, dateTo);
    sections.push(patternAccuracy);
    
    // System Metrics
    const systemMetrics = await this.generateSystemMetricsSection(dateFrom, dateTo);
    sections.push(systemMetrics);
    
    return sections;
  }
  
  private async generatePatternSections(
    options: ReportOptions,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    
    // Pattern Overview
    const overview = await this.generatePatternOverviewSection(dateFrom, dateTo);
    sections.push(overview);
    
    // Pattern Distribution
    const distribution = await this.generatePatternDistributionSection(dateFrom, dateTo);
    sections.push(distribution);
    
    // High Confidence Patterns
    const highConf = await this.generateHighConfidencePatternsSection(dateFrom, dateTo);
    sections.push(highConf);
    
    return sections;
  }
  
  private async generateCustomSections(
    options: ReportOptions,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection[]> {
    // For custom reports, use the custom query to generate sections
    const sections: ReportSection[] = [];
    
    if (options.customQuery) {
      const analyses = await this.analysisRepository.searchAnalyses({
        ...options.customQuery,
        dateFrom,
        dateTo
      });
      
      sections.push({
        title: 'Custom Query Results',
        content: analyses,
        priority: 'high'
      });
    }
    
    return sections;
  }
  
  // Section generators
  private async generateMarketOverviewSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const analyses = await this.analysisRepository.searchAnalyses({
      dateFrom,
      dateTo,
      type: 'complete_analysis'
    });
    
    const overview = {
      totalAnalyses: analyses.length,
      symbols: [...new Set(analyses.map(a => a.symbol))],
      avgConfidence: analyses.reduce((sum, a) => sum + (a.summary?.confidence || 0), 0) / analyses.length
    };
    
    return {
      title: 'Market Overview',
      content: overview,
      priority: 'high'
    };
  }
  
  private async generateTopMoversSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const analyses = await this.analysisRepository.searchAnalyses({
      dateFrom,
      dateTo,
      orderBy: 'price',
      orderDirection: 'desc',
      limit: 10
    });
    
    const movers = analyses.map(a => ({
      symbol: a.symbol,
      price: a.summary?.price || 0,
      trend: a.summary?.trend || 'neutral'
    }));
    
    return {
      title: 'Top Movers',
      content: movers,
      priority: 'high',
      tables: [{
        headers: ['Symbol', 'Price', 'Trend'],
        rows: movers.map(m => [m.symbol, m.price.toFixed(4), m.trend])
      }]
    };
  }
  
  private async generatePatternDetectionSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const patterns = await this.analysisRepository.findPatterns({
      dateFrom,
      dateTo
    });
    
    const patternSummary = {
      total: patterns.length,
      byType: patterns.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      highConfidence: patterns.filter(p => p.confidence > 80).length
    };
    
    return {
      title: 'Pattern Detections',
      content: patternSummary,
      priority: 'medium'
    };
  }
  
  private async generateVolumeAnalysisSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const analyses = await this.analysisRepository.searchAnalyses({
      dateFrom,
      dateTo,
      type: 'volume_analysis'
    });
    
    const volumeData = analyses.map(a => ({
      symbol: a.symbol,
      avgVolume: a.data?.avgVolume || 0,
      trend: a.data?.trend || 'stable'
    }));
    
    return {
      title: 'Volume Analysis',
      content: volumeData,
      priority: 'medium'
    };
  }
  
  private async generateWeeklySummarySection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const stats = await this.analysisRepository.getRepositoryStats();
    
    return {
      title: 'Weekly Summary',
      content: {
        period: `${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
        totalAnalyses: stats.totalAnalyses,
        totalPatterns: stats.totalPatterns,
        activeSymbols: stats.symbols.length
      },
      priority: 'high'
    };
  }
  
  private async generateTrendAnalysisSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    // Aggregate trend data across all symbols
    const analyses = await this.analysisRepository.searchAnalyses({
      dateFrom,
      dateTo
    });
    
    const trends = {
      bullish: analyses.filter(a => a.summary?.trend === 'bullish').length,
      bearish: analyses.filter(a => a.summary?.trend === 'bearish').length,
      neutral: analyses.filter(a => a.summary?.trend === 'neutral').length
    };
    
    return {
      title: 'Trend Analysis',
      content: trends,
      priority: 'high',
      charts: [{
        type: 'pie',
        title: 'Market Trend Distribution',
        data: trends
      }]
    };
  }
  
  private async generatePatternSummarySection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const patterns = await this.analysisRepository.findPatterns({
      dateFrom,
      dateTo
    });
    
    const summary = {
      total: patterns.length,
      avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
      topPatterns: Object.entries(
        patterns.reduce((acc, p) => {
          acc[p.type] = (acc[p.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
    
    return {
      title: 'Pattern Summary',
      content: summary,
      priority: 'medium'
    };
  }
  
  private async generatePerformanceMetricsSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    // This would integrate with actual performance tracking
    return {
      title: 'Performance Metrics',
      content: {
        analysisAccuracy: 'N/A',
        patternHitRate: 'N/A',
        avgExecutionTime: 'N/A'
      },
      priority: 'low'
    };
  }
  
  private async generateSymbolOverviewSection(
    symbol: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection> {
    const summary = await this.analysisRepository.getAnalysisSummary(symbol);
    
    return {
      title: `${symbol} Overview`,
      content: summary,
      priority: 'high'
    };
  }
  
  private async generateTechnicalSummarySection(
    symbol: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection> {
    const analyses = await this.analysisRepository.getAnalysisHistory(symbol, 'technical_analysis', 5);
    
    return {
      title: 'Technical Analysis Summary',
      content: analyses.map(a => ({
        timestamp: new Date(a.timestamp).toLocaleString(),
        volatility: a.data?.volatility?.volatilityPercent,
        volumeTrend: a.data?.volume?.trend,
        volumeDeltaBias: a.data?.volumeDelta?.bias
      })),
      priority: 'high'
    };
  }
  
  private async generateSupportResistanceSection(
    symbol: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection> {
    const latest = await this.analysisRepository.getLatestAnalysis(symbol, 'support_resistance');
    
    if (!latest) {
      return {
        title: 'Support/Resistance Levels',
        content: 'No data available',
        priority: 'medium'
      };
    }
    
    const data = latest.data;
    return {
      title: 'Support/Resistance Levels',
      content: {
        currentPrice: data.currentPrice,
        supports: data.supports?.slice(0, 3),
        resistances: data.resistances?.slice(0, 3)
      },
      priority: 'high',
      tables: [{
        headers: ['Type', 'Level', 'Strength', 'Touches'],
        rows: [
          ...data.supports?.slice(0, 3).map((s: any) => ['Support', s.level.toFixed(4), s.strength.toFixed(2), s.touches]),
          ...data.resistances?.slice(0, 3).map((r: any) => ['Resistance', r.level.toFixed(4), r.strength.toFixed(2), r.touches])
        ]
      }]
    };
  }
  
  private async generateSymbolPatternSection(
    symbol: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<ReportSection> {
    const patterns = await this.analysisRepository.findPatterns({
      symbol,
      dateFrom,
      dateTo
    });
    
    return {
      title: 'Pattern History',
      content: patterns,
      priority: 'medium',
      tables: [{
        headers: ['Date', 'Pattern', 'Confidence', 'Description'],
        rows: patterns.map(p => [
          new Date(p.timestamp).toLocaleString(),
          p.type,
          p.confidence.toFixed(0) + '%',
          p.description
        ])
      }]
    };
  }
  
  private async generateAnalysisPerformanceSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const stats = await this.analysisRepository.getRepositoryStats();
    
    return {
      title: 'Analysis Performance',
      content: {
        totalAnalyses: stats.totalAnalyses,
        analysesByType: stats.analysesByType,
        storageUsed: (stats.storageUsed / (1024 * 1024)).toFixed(2) + ' MB'
      },
      priority: 'high'
    };
  }
  
  private async generatePatternAccuracySection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const patterns = await this.analysisRepository.findPatterns({
      dateFrom,
      dateTo
    });
    
    const accuracyByType = patterns.reduce((acc, p) => {
      if (!acc[p.type]) {
        acc[p.type] = { total: 0, highConfidence: 0 };
      }
      acc[p.type].total++;
      if (p.confidence > 80) acc[p.type].highConfidence++;
      return acc;
    }, {} as Record<string, { total: number; highConfidence: number }>);
    
    return {
      title: 'Pattern Accuracy',
      content: accuracyByType,
      priority: 'medium'
    };
  }
  
  private async generateSystemMetricsSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    return {
      title: 'System Metrics',
      content: {
        uptime: process.uptime(),
        version: '1.3.9',
        nodeVersion: process.version
      },
      priority: 'low'
    };
  }
  
  private async generatePatternOverviewSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const patterns = await this.analysisRepository.findPatterns({
      dateFrom,
      dateTo
    });
    
    return {
      title: 'Pattern Overview',
      content: {
        total: patterns.length,
        uniqueSymbols: [...new Set(patterns.map(p => p.symbol))].length,
        avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      },
      priority: 'high'
    };
  }
  
  private async generatePatternDistributionSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const patterns = await this.analysisRepository.findPatterns({
      dateFrom,
      dateTo
    });
    
    const distribution = patterns.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      title: 'Pattern Distribution',
      content: distribution,
      priority: 'medium',
      charts: [{
        type: 'bar',
        title: 'Patterns by Type',
        data: distribution
      }]
    };
  }
  
  private async generateHighConfidencePatternsSection(dateFrom: Date, dateTo: Date): Promise<ReportSection> {
    const patterns = await this.analysisRepository.findPatterns({
      dateFrom,
      dateTo,
      minConfidence: 85
    });
    
    return {
      title: 'High Confidence Patterns',
      content: patterns,
      priority: 'high',
      tables: [{
        headers: ['Symbol', 'Pattern', 'Confidence', 'Time'],
        rows: patterns.map(p => [
          p.symbol,
          p.type,
          p.confidence.toFixed(0) + '%',
          new Date(p.timestamp).toLocaleString()
        ])
      }]
    };
  }
  
  private generateSummary(sections: ReportSection[]): {
    keyFindings: string[];
    recommendations: string[];
    alerts?: string[];
  } {
    const keyFindings: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];
    
    // Extract key findings from sections
    sections.forEach(section => {
      if (section.priority === 'high' && section.content) {
        keyFindings.push(`${section.title}: Key data processed`);
      }
    });
    
    // Generate recommendations based on content
    recommendations.push('Continue monitoring high-volatility symbols');
    recommendations.push('Review high-confidence patterns for trading opportunities');
    
    return { keyFindings, recommendations, alerts: alerts.length > 0 ? alerts : undefined };
  }
  
  private async formatReport(report: GeneratedReport): Promise<string> {
    switch (report.format) {
      case 'markdown':
        return this.formatMarkdown(report);
      case 'html':
        return this.formatHTML(report);
      case 'json':
      default:
        return JSON.stringify(report, null, 2);
    }
  }
  
  private formatMarkdown(report: GeneratedReport): string {
    let content = `# ${report.type.toUpperCase()} Report\n\n`;
    content += `**Generated:** ${report.generatedAt.toLocaleString()}\n`;
    content += `**Period:** ${report.period.from.toLocaleDateString()} - ${report.period.to.toLocaleDateString()}\n\n`;
    
    // Summary
    content += `## Summary\n\n`;
    content += `### Key Findings\n`;
    report.summary.keyFindings.forEach(finding => {
      content += `- ${finding}\n`;
    });
    content += `\n### Recommendations\n`;
    report.summary.recommendations.forEach(rec => {
      content += `- ${rec}\n`;
    });
    
    if (report.summary.alerts && report.summary.alerts.length > 0) {
      content += `\n### Alerts\n`;
      report.summary.alerts.forEach(alert => {
        content += `- ⚠️ ${alert}\n`;
      });
    }
    
    content += '\n---\n\n';
    
    // Sections
    report.sections.forEach(section => {
      content += `## ${section.title}\n\n`;
      
      if (typeof section.content === 'string') {
        content += section.content + '\n\n';
      } else {
        content += '```json\n' + JSON.stringify(section.content, null, 2) + '\n```\n\n';
      }
      
      // Tables
      if (section.tables) {
        section.tables.forEach(table => {
          content += this.formatMarkdownTable(table) + '\n\n';
        });
      }
    });
    
    // Metadata
    content += `\n---\n\n`;
    content += `### Report Metadata\n`;
    content += `- **ID:** ${report.id}\n`;
    content += `- **Symbols:** ${report.metadata.symbols.join(', ')}\n`;
    content += `- **Analysis Count:** ${report.metadata.analysisCount}\n`;
    content += `- **Pattern Count:** ${report.metadata.patternCount}\n`;
    content += `- **Version:** ${report.metadata.version}\n`;
    
    return content;
  }
  
  private formatMarkdownTable(table: TableData): string {
    let content = '| ' + table.headers.join(' | ') + ' |\n';
    content += '| ' + table.headers.map(() => '---').join(' | ') + ' |\n';
    
    table.rows.forEach(row => {
      content += '| ' + row.join(' | ') + ' |\n';
    });
    
    return content;
  }
  
  private formatHTML(report: GeneratedReport): string {
    // Basic HTML format
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>${report.type.toUpperCase()} Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metadata { background-color: #f9f9f9; padding: 10px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>${report.type.toUpperCase()} Report</h1>
    <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
    <p><strong>Period:</strong> ${report.period.from.toLocaleDateString()} - ${report.period.to.toLocaleDateString()}</p>
    
    <h2>Summary</h2>
    <h3>Key Findings</h3>
    <ul>
        ${report.summary.keyFindings.map(f => `<li>${f}</li>`).join('\n')}
    </ul>
    <h3>Recommendations</h3>
    <ul>
        ${report.summary.recommendations.map(r => `<li>${r}</li>`).join('\n')}
    </ul>
    
    ${report.sections.map(section => `
        <h2>${section.title}</h2>
        ${typeof section.content === 'string' ? 
          `<p>${section.content}</p>` : 
          `<pre>${JSON.stringify(section.content, null, 2)}</pre>`}
        ${section.tables ? section.tables.map(table => this.formatHTMLTable(table)).join('\n') : ''}
    `).join('\n')}
    
    <div class="metadata">
        <h3>Report Metadata</h3>
        <p><strong>ID:</strong> ${report.id}</p>
        <p><strong>Symbols:</strong> ${report.metadata.symbols.join(', ')}</p>
        <p><strong>Analysis Count:</strong> ${report.metadata.analysisCount}</p>
        <p><strong>Pattern Count:</strong> ${report.metadata.patternCount}</p>
        <p><strong>Version:</strong> ${report.metadata.version}</p>
    </div>
</body>
</html>`;
    
    return html;
  }
  
  private formatHTMLTable(table: TableData): string {
    return `<table>
        <tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr>
        ${table.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('\n')}
    </table>`;
  }
  
  private getDefaultDateFrom(type: ReportType, dateTo: Date): Date {
    const from = new Date(dateTo);
    
    switch (type) {
      case 'daily':
        from.setDate(from.getDate() - 1);
        break;
      case 'weekly':
        from.setDate(from.getDate() - 7);
        break;
      case 'performance':
      case 'patterns':
        from.setDate(from.getDate() - 30);
        break;
      default:
        from.setDate(from.getDate() - 7);
    }
    
    return from;
  }
  
  private getDateFromPeriod(period: Period, dateTo: Date): Date {
    const from = new Date(dateTo);
    
    switch (period) {
      case '1h':
        from.setHours(from.getHours() - 1);
        break;
      case '4h':
        from.setHours(from.getHours() - 4);
        break;
      case '1d':
        from.setDate(from.getDate() - 1);
        break;
      case '1w':
        from.setDate(from.getDate() - 7);
        break;
      case '1m':
        from.setMonth(from.getMonth() - 1);
        break;
    }
    
    return from;
  }
  
  private async getReportSymbols(options: ReportOptions): Promise<string[]> {
    if (options.symbol) return [options.symbol];
    if (options.symbols) return options.symbols;
    
    // Get all active symbols from repository
    const stats = await this.analysisRepository.getRepositoryStats();
    return stats.symbols;
  }
  
  private async countAnalyses(options: ReportOptions, dateFrom: Date, dateTo: Date): Promise<number> {
    const query: AnalysisQuery = {
      dateFrom,
      dateTo
    };
    
    if (options.symbol) query.symbol = options.symbol;
    if (options.customQuery) Object.assign(query, options.customQuery);
    
    return this.analysisRepository.countAnalyses(query);
  }
  
  private async countPatterns(options: ReportOptions, dateFrom: Date, dateTo: Date): Promise<number> {
    const criteria: PatternCriteria = {
      dateFrom,
      dateTo
    };
    
    if (options.symbol) criteria.symbol = options.symbol;
    
    const patterns = await this.analysisRepository.findPatterns(criteria);
    return patterns.length;
  }
  
  private extractTimestampFromReportFile(fileName: string): number {
    const baseName = path.basename(fileName);
    const parts = baseName.split('_');
    
    if (parts.length >= 2) {
      const timestamp = parseInt(parts[1]);
      if (!isNaN(timestamp)) return timestamp;
    }
    
    return Date.now();
  }
}
