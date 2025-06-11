/**
 * @fileoverview Report Generator Handlers - MCP Tool Handlers for Report Generation (TASK-009 FASE 4)
 * @description Specialized handlers for report generation operations
 * @version 1.0.0
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class ReportGeneratorHandlers {
  constructor(
    private engine: MarketAnalysisEngine,
    private logger: FileLogger
  ) {}

  async handleGenerateReport(args: any): Promise<MCPServerResponse> {
    const type = args?.type as string;
    const format = args?.format as string || 'markdown';
    const symbol = args?.symbol as string;
    const symbols = args?.symbols as string[];
    const dateFrom = args?.dateFrom ? new Date(args.dateFrom) : undefined;
    const dateTo = args?.dateTo ? new Date(args.dateTo) : undefined;
    const includeCharts = args?.includeCharts ?? true;
    const includePatterns = args?.includePatterns ?? true;

    if (!type) {
      throw new Error('Report type is required');
    }

    const response = await this.engine.generateReportHandler({
      type: type as any,
      format: format as any,
      symbol,
      symbols,
      dateFrom,
      dateTo,
      includeCharts,
      includePatterns
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate report');
    }

    const report = response.data!;
    
    const formattedReport = {
      report_generated: true,
      id: report.id,
      type: report.type,
      format: report.format,
      generated_at: report.generatedAt.toISOString(),
      period: {
        from: report.period.from.toISOString(),
        to: report.period.to.toISOString()
      },
      metadata: {
        symbols: report.metadata.symbols,
        analysis_count: report.metadata.analysisCount,
        pattern_count: report.metadata.patternCount
      },
      sections_count: report.sections.length,
      summary: report.summary,
      content_preview: report.format === 'json' ? 
        'Full JSON report generated' : 
        report.content.substring(0, 500) + '...'
    };

    return this.createSuccessResponse(formattedReport);
  }

  async handleGenerateDailyReport(args: any): Promise<MCPServerResponse> {
    const date = args?.date ? new Date(args.date) : new Date();

    const response = await this.engine.generateDailyReportHandler(date);

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate daily report');
    }

    const report = response.data!;
    
    return this.createSuccessResponse({
      report_generated: true,
      id: report.id,
      type: 'daily',
      date: date.toLocaleDateString(),
      generated_at: report.generatedAt.toISOString(),
      sections: report.sections.map(s => ({
        title: s.title,
        priority: s.priority
      })),
      summary: report.summary
    });
  }

  async handleGenerateWeeklyReport(args: any): Promise<MCPServerResponse> {
    const weekStartDate = args?.weekStartDate ? new Date(args.weekStartDate) : undefined;

    const response = await this.engine.generateWeeklyReportHandler(weekStartDate);

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate weekly report');
    }

    const report = response.data!;
    
    return this.createSuccessResponse({
      report_generated: true,
      id: report.id,
      type: 'weekly',
      week_start: report.period.from.toLocaleDateString(),
      week_end: report.period.to.toLocaleDateString(),
      generated_at: report.generatedAt.toISOString(),
      sections: report.sections.map(s => ({
        title: s.title,
        priority: s.priority
      })),
      summary: report.summary
    });
  }

  async handleGenerateSymbolReport(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const period = args?.period as string || '1d';

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.generateSymbolReportHandler(symbol, period as any);

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate symbol report');
    }

    const report = response.data!;
    
    return this.createSuccessResponse({
      report_generated: true,
      id: report.id,
      type: 'symbol',
      symbol,
      period,
      generated_at: report.generatedAt.toISOString(),
      sections: report.sections.map(s => ({
        title: s.title,
        priority: s.priority
      })),
      summary: report.summary
    });
  }

  async handleGeneratePerformanceReport(args: any): Promise<MCPServerResponse> {
    const period = args?.period as string || '1w';

    const response = await this.engine.generatePerformanceReportHandler(period as any);

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate performance report');
    }

    const report = response.data!;
    
    return this.createSuccessResponse({
      report_generated: true,
      id: report.id,
      type: 'performance',
      period,
      generated_at: report.generatedAt.toISOString(),
      metadata: report.metadata,
      sections: report.sections.map(s => ({
        title: s.title,
        priority: s.priority
      })),
      summary: report.summary
    });
  }

  async handleGetReport(args: any): Promise<MCPServerResponse> {
    const id = args?.id as string;

    if (!id) {
      throw new Error('Report ID is required');
    }

    const response = await this.engine.getReportHandler(id);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get report');
    }

    const report = response.data;
    
    if (!report) {
      return this.createSuccessResponse({
        found: false,
        message: `No report found with ID: ${id}`
      });
    }

    return this.createSuccessResponse({
      found: true,
      report: {
        id: report.id,
        type: report.type,
        format: report.format,
        generated_at: report.generatedAt.toISOString(),
        period: {
          from: report.period.from.toISOString(),
          to: report.period.to.toISOString()
        },
        metadata: report.metadata,
        sections_count: report.sections.length,
        summary: report.summary,
        content_available: true
      }
    });
  }

  async handleListReports(args: any): Promise<MCPServerResponse> {
    const type = args?.type as string;
    const limit = args?.limit || 10;

    const response = await this.engine.listReportsHandler(type as any, limit);

    if (!response.success) {
      throw new Error(response.error || 'Failed to list reports');
    }

    const reports = response.data!;
    
    const formattedReports = {
      total_found: reports.length,
      filter: {
        type: type || 'all',
        limit
      },
      reports: reports.map(report => ({
        id: report.id,
        type: report.type,
        format: report.format,
        generated_at: report.generatedAt.toISOString(),
        period: {
          from: report.period.from.toISOString(),
          to: report.period.to.toISOString()
        },
        symbols: report.metadata.symbols,
        analysis_count: report.metadata.analysisCount
      }))
    };

    return this.createSuccessResponse(formattedReports);
  }

  async handleExportReport(args: any): Promise<MCPServerResponse> {
    const id = args?.id as string;
    const outputPath = args?.outputPath as string;

    if (!id || !outputPath) {
      throw new Error('Report ID and output path are required');
    }

    const response = await this.engine.exportReportHandler(id, outputPath);

    if (!response.success) {
      throw new Error(response.error || 'Failed to export report');
    }

    return this.createSuccessResponse({
      exported: true,
      report_id: id,
      output_path: outputPath,
      message: 'Report exported successfully'
    });
  }

  private createSuccessResponse(data: any): MCPServerResponse {
    let cleanData: any;
    
    try {
      const jsonString = JSON.stringify(data, (key, value) => {
        if (typeof value === 'function' || value === undefined) {
          return '[FILTERED]';
        }
        if (typeof value === 'object' && value !== null) {
          if (value.constructor !== Object && value.constructor !== Array) {
            return '[COMPLEX_OBJECT]';
          }
        }
        return value;
      });
      
      cleanData = JSON.parse(jsonString);
    } catch (error) {
      cleanData = { result: 'Data serialization error', data: String(data) };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(cleanData, null, 2)
      }]
    };
  }
}
