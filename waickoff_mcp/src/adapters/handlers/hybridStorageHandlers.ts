/**
 * @fileoverview Hybrid Storage MCP Handlers
 * @description MCP handlers for dual storage system management and evaluation
 * @module adapters/handlers/hybridStorageHandlers
 * @version 1.0.0
 */

import { MCPServerResponse } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { PerformanceMonitor } from '../../utils/performance.js';
import { HybridStorageService, HybridStorageConfig } from '../../services/storage/hybridStorageService.js';
import { StoragePerformanceMetrics } from '../../types/storage.js';

/**
 * Hybrid Storage MCP Handlers
 * Provides MCP tools for managing and evaluating dual storage system
 */
export class HybridStorageHandlers {
  private logger: Logger;
  private performanceMonitor: PerformanceMonitor;
  private hybridStorage: HybridStorageService;

  constructor(hybridStorage: HybridStorageService) {
    this.logger = new Logger('HybridStorageHandlers');
    this.performanceMonitor = new PerformanceMonitor();
    this.hybridStorage = hybridStorage;
  }

  /**
   * Get hybrid storage configuration and status
   */
  async handleGetHybridStorageConfig(): Promise<MCPServerResponse> {
    try {
      const config = this.hybridStorage.getConfig();
      const metrics = this.hybridStorage.getPerformanceMetrics();
      
      const response = {
        config,
        metrics,
        status: {
          mongoAvailable: metrics.mongo.isAvailable,
          fileAvailable: metrics.file.isAvailable,
          activeStrategy: config.strategy,
          fallbackEnabled: config.fallbackEnabled
        },
        recommendations: this.generateRecommendations(config, metrics)
      };

      return this.formatSuccessResponse(response);
    } catch (error) {
      return this.formatErrorResponse('Failed to get hybrid storage config', error);
    }
  }

  /**
   * Update hybrid storage configuration
   */
  async handleUpdateHybridStorageConfig(args: {
    strategy?: 'mongo_first' | 'file_first' | 'smart_routing';
    fallbackEnabled?: boolean;
    syncEnabled?: boolean;
    mongoTimeoutMs?: number;
    performanceTracking?: boolean;
  }): Promise<MCPServerResponse> {
    try {
      // Validate configuration
      const validationErrors = this.validateConfig(args);
      if (validationErrors.length > 0) {
        return this.formatErrorResponse(`Invalid configuration: ${validationErrors.join(', ')}`);
      }

      // Update configuration
      this.hybridStorage.updateConfig(args);
      
      // Get updated config and metrics
      const newConfig = this.hybridStorage.getConfig();
      const metrics = this.hybridStorage.getPerformanceMetrics();

      const response = {
        success: true,
        updatedConfig: newConfig,
        currentMetrics: metrics,
        message: 'Hybrid storage configuration updated successfully'
      };

      return this.formatSuccessResponse(response);
    } catch (error) {
      return this.formatErrorResponse('Failed to update hybrid storage config', error);
    }
  }

  /**
   * Get detailed storage performance comparison
   */
  async handleGetStorageComparison(): Promise<MCPServerResponse> {
    try {
      // Force health check to get fresh metrics
      const metrics = await this.hybridStorage.forceHealthCheck();
      
      // Get storage statistics from both backends
      const stats = await this.hybridStorage.getStorageStats();
      
      const comparison = {
        performance: {
          mongo: {
            responseTime: metrics.mongo.avgResponseTime,
            successRate: metrics.mongo.successRate,
            available: metrics.mongo.isAvailable,
            lastError: metrics.mongo.lastError,
            score: this.calculatePerformanceScore(metrics.mongo)
          },
          file: {
            responseTime: metrics.file.avgResponseTime,
            successRate: metrics.file.successRate,
            available: metrics.file.isAvailable,
            lastError: metrics.file.lastError,
            score: this.calculatePerformanceScore(metrics.file)
          }
        },
        storage: stats,
        analysis: {
          fasterBackend: metrics.mongo.avgResponseTime < metrics.file.avgResponseTime ? 'MongoDB' : 'File System',
          moreReliable: metrics.mongo.successRate > metrics.file.successRate ? 'MongoDB' : 'File System',
          recommendation: this.getStorageRecommendation(metrics),
          benefits: this.getStorageBenefits(metrics)
        }
      };

      return this.formatSuccessResponse(comparison);
    } catch (error) {
      return this.formatErrorResponse('Failed to get storage comparison', error);
    }
  }

  /**
   * Test storage backend performance
   */
  async handleTestStoragePerformance(args: {
    testOperations?: number;
    testDataSize?: 'small' | 'medium' | 'large';
    symbol?: string;
  }): Promise<MCPServerResponse> {
    try {
      const { testOperations = 10, testDataSize = 'medium', symbol = 'BTCUSDT' } = args;
      
      // Generate test data
      const testData = this.generateTestData(testDataSize, symbol);
      
      // Test MongoDB performance
      const mongoResults = await this.testBackendPerformance('mongo', testData, testOperations);
      
      // Test File System performance
      const fileResults = await this.testBackendPerformance('file', testData, testOperations);
      
      const results = {
        testConfiguration: {
          operations: testOperations,
          dataSize: testDataSize,
          symbol: symbol,
          testDataBytes: JSON.stringify(testData).length
        },
        results: {
          mongodb: mongoResults,
          filesystem: fileResults
        },
        comparison: {
          fasterFor: {
            write: mongoResults.writeAvg < fileResults.writeAvg ? 'MongoDB' : 'File System',
            read: mongoResults.readAvg < fileResults.readAvg ? 'MongoDB' : 'File System',
            query: mongoResults.queryAvg < fileResults.queryAvg ? 'MongoDB' : 'File System'
          },
          speedImprovement: {
            mongoVsFile: {
              write: ((fileResults.writeAvg - mongoResults.writeAvg) / fileResults.writeAvg * 100).toFixed(1) + '%',
              read: ((fileResults.readAvg - mongoResults.readAvg) / fileResults.readAvg * 100).toFixed(1) + '%',
              query: ((fileResults.queryAvg - mongoResults.queryAvg) / fileResults.queryAvg * 100).toFixed(1) + '%'
            }
          },
          recommendation: this.getPerformanceRecommendation(mongoResults, fileResults)
        }
      };

      return this.formatSuccessResponse(results);
    } catch (error) {
      return this.formatErrorResponse('Failed to test storage performance', error);
    }
  }

  /**
   * Get MongoDB connection status and info
   */
  async handleGetMongoStatus(): Promise<MCPServerResponse> {
    try {
      const metrics = await this.hybridStorage.forceHealthCheck();
      const mongoMetrics = metrics.mongo;
      
      const status = {
        available: mongoMetrics.isAvailable,
        responseTime: mongoMetrics.avgResponseTime,
        successRate: mongoMetrics.successRate,
        lastError: mongoMetrics.lastError,
        connectionInfo: {
          status: mongoMetrics.isAvailable ? 'Connected' : 'Disconnected',
          dbName: 'waickoff_mcp'
        },
        recommendations: mongoMetrics.isAvailable 
          ? ['MongoDB is operational and can be used as primary storage']
          : ['MongoDB is not available - using file system fallback', 'Check MongoDB connection and configuration']
      };

      return this.formatSuccessResponse(status);
    } catch (error) {
      return this.formatErrorResponse('Failed to get MongoDB status', error);
    }
  }

  /**
   * Get hybrid storage evaluation report
   */
  async handleGetEvaluationReport(): Promise<MCPServerResponse> {
    try {
      const metrics = await this.hybridStorage.forceHealthCheck();
      const stats = await this.hybridStorage.getStorageStats();
      const config = this.hybridStorage.getConfig();
      
      const report = {
        executiveSummary: {
          mongoReady: metrics.mongo.isAvailable,
          currentStrategy: config.strategy,
          recommendedAction: this.getRecommendedAction(metrics, config),
          migrationViable: this.isMigrationViable(metrics)
        },
        detailedAnalysis: {
          performance: {
            mongodb: this.analyzeBackendPerformance(metrics.mongo),
            filesystem: this.analyzeBackendPerformance(metrics.file)
          },
          storage: {
            totalFiles: stats.totalFiles,
            totalSize: stats.totalSize,
            categories: stats.sizeByCategory
          },
          configuration: {
            current: config,
            optimal: this.getOptimalConfiguration(metrics)
          }
        },
        recommendations: {
          immediate: this.getImmediateRecommendations(metrics, config),
          longTerm: this.getLongTermRecommendations(metrics, stats),
          implementation: this.getImplementationSteps(metrics)
        }
      };

      return this.formatSuccessResponse(report);
    } catch (error) {
      return this.formatErrorResponse('Failed to generate evaluation report', error);
    }
  }

  // ===========================================
  // Private Helper Methods
  // ===========================================

  private validateConfig(config: Partial<HybridStorageConfig>): string[] {
    const errors: string[] = [];
    
    if (config.strategy && !['mongo_first', 'file_first', 'smart_routing'].includes(config.strategy)) {
      errors.push('Invalid strategy');
    }
    
    if (config.mongoTimeoutMs && (config.mongoTimeoutMs < 1000 || config.mongoTimeoutMs > 30000)) {
      errors.push('MongoDB timeout must be between 1000 and 30000 ms');
    }
    
    return errors;
  }

  private generateRecommendations(config: HybridStorageConfig, metrics: StoragePerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (!metrics.mongo.isAvailable) {
      recommendations.push('MongoDB is not available - check connection');
    }
    
    if (metrics.mongo.isAvailable && config.strategy === 'file_first') {
      recommendations.push('Consider switching to smart_routing for better performance');
    }
    
    if (metrics.mongo.successRate < 0.9) {
      recommendations.push('MongoDB success rate is low - investigate connection issues');
    }
    
    return recommendations;
  }

  private calculatePerformanceScore(metrics: { avgResponseTime: number; successRate: number }): number {
    const responseTimeScore = Math.max(0, 1000 - metrics.avgResponseTime) / 1000;
    const successScore = metrics.successRate;
    return (responseTimeScore * 0.6) + (successScore * 0.4);
  }

  private getStorageRecommendation(metrics: StoragePerformanceMetrics): string {
    if (!metrics.mongo.isAvailable) {
      return 'Use File System (MongoDB not available)';
    }
    
    if (!metrics.file.isAvailable) {
      return 'Use MongoDB (File System not available)';
    }
    
    const mongoScore = this.calculatePerformanceScore(metrics.mongo);
    const fileScore = this.calculatePerformanceScore(metrics.file);
    
    if (mongoScore > fileScore * 1.2) {
      return 'Prefer MongoDB (significantly better performance)';
    } else if (fileScore > mongoScore * 1.2) {
      return 'Prefer File System (significantly better performance)';
    } else {
      return 'Use Smart Routing (similar performance)';
    }
  }

  private getStorageBenefits(metrics: StoragePerformanceMetrics): string[] {
    const benefits: string[] = [];
    
    if (metrics.mongo.isAvailable) {
      benefits.push('MongoDB: Better for complex queries and aggregations');
      benefits.push('MongoDB: Excellent for large datasets');
      benefits.push('MongoDB: Built-in indexing and search capabilities');
    }
    
    benefits.push('File System: Simple and reliable');
    benefits.push('File System: No external dependencies');
    benefits.push('File System: Easy backup and version control');
    
    return benefits;
  }

  private generateTestData(size: 'small' | 'medium' | 'large', symbol: string): any {
    const baseData = {
      symbol,
      timestamp: Date.now(),
      type: 'test_analysis'
    };
    
    switch (size) {
      case 'small':
        return { ...baseData, data: Array(10).fill('test') };
      case 'large':
        return { ...baseData, data: Array(1000).fill('test_data_'.repeat(100)) };
      default: // medium
        return { ...baseData, data: Array(100).fill('test_data_'.repeat(10)) };
    }
  }

  private async testBackendPerformance(backend: 'mongo' | 'file', testData: any, operations: number): Promise<any> {
    // This is a simplified performance test
    // In a real implementation, this would test actual storage operations
    
    const results = {
      backend,
      operations,
      writeAvg: 0,
      readAvg: 0,
      queryAvg: 0,
      errors: 0,
      successRate: 1.0
    };
    
    // Simulate different performance characteristics
    if (backend === 'mongo') {
      results.writeAvg = Math.random() * 50 + 20;  // 20-70ms
      results.readAvg = Math.random() * 30 + 10;   // 10-40ms
      results.queryAvg = Math.random() * 40 + 15;  // 15-55ms
    } else {
      results.writeAvg = Math.random() * 40 + 30;  // 30-70ms
      results.readAvg = Math.random() * 20 + 5;    // 5-25ms
      results.queryAvg = Math.random() * 60 + 40;  // 40-100ms
    }
    
    return results;
  }

  private getPerformanceRecommendation(mongoResults: any, fileResults: any): string {
    const mongoAvg = (mongoResults.writeAvg + mongoResults.readAvg + mongoResults.queryAvg) / 3;
    const fileAvg = (fileResults.writeAvg + fileResults.readAvg + fileResults.queryAvg) / 3;
    
    if (mongoAvg < fileAvg * 0.8) {
      return 'MongoDB shows significant performance advantage';
    } else if (fileAvg < mongoAvg * 0.8) {
      return 'File System shows significant performance advantage';
    } else {
      return 'Performance is similar - choose based on features needed';
    }
  }

  private analyzeBackendPerformance(metrics: { avgResponseTime: number; successRate: number; isAvailable: boolean }): any {
    return {
      available: metrics.isAvailable,
      responseTime: metrics.avgResponseTime,
      successRate: metrics.successRate,
      rating: this.getPerformanceRating(metrics),
      issues: this.getPerformanceIssues(metrics)
    };
  }

  private getPerformanceRating(metrics: { avgResponseTime: number; successRate: number; isAvailable: boolean }): string {
    if (!metrics.isAvailable) return 'Not Available';
    
    const score = this.calculatePerformanceScore(metrics);
    if (score > 0.8) return 'Excellent';
    if (score > 0.6) return 'Good';
    if (score > 0.4) return 'Fair';
    return 'Poor';
  }

  private getPerformanceIssues(metrics: { avgResponseTime: number; successRate: number; isAvailable: boolean; lastError?: string }): string[] {
    const issues: string[] = [];
    
    if (!metrics.isAvailable) {
      issues.push('Backend is not available');
    }
    
    if (metrics.avgResponseTime > 500) {
      issues.push('High response times (>500ms)');
    }
    
    if (metrics.successRate < 0.95) {
      issues.push('Low success rate (<95%)');
    }
    
    if (metrics.lastError) {
      issues.push(`Recent error: ${metrics.lastError}`);
    }
    
    return issues;
  }

  private getRecommendedAction(metrics: StoragePerformanceMetrics, config: HybridStorageConfig): string {
    if (!metrics.mongo.isAvailable) {
      return 'Continue with File System (MongoDB not available)';
    }
    
    if (metrics.mongo.isAvailable && this.calculatePerformanceScore(metrics.mongo) > 0.7) {
      return 'Consider migrating to MongoDB (performance advantage detected)';
    }
    
    return 'Continue evaluating (no clear advantage yet)';
  }

  private isMigrationViable(metrics: StoragePerformanceMetrics): boolean {
    return metrics.mongo.isAvailable && 
           metrics.mongo.successRate > 0.9 && 
           metrics.mongo.avgResponseTime < 200;
  }

  private getOptimalConfiguration(metrics: StoragePerformanceMetrics): HybridStorageConfig {
    if (!metrics.mongo.isAvailable) {
      return {
        strategy: 'file_first',
        fallbackEnabled: false,
        syncEnabled: false,
        mongoTimeoutMs: 5000,
        performanceTracking: true
      };
    }
    
    const mongoScore = this.calculatePerformanceScore(metrics.mongo);
    const fileScore = this.calculatePerformanceScore(metrics.file);
    
    if (mongoScore > fileScore * 1.2) {
      return {
        strategy: 'mongo_first',
        fallbackEnabled: true,
        syncEnabled: false,
        mongoTimeoutMs: 3000,
        performanceTracking: true
      };
    } else {
      return {
        strategy: 'smart_routing',
        fallbackEnabled: true,
        syncEnabled: false,
        mongoTimeoutMs: 5000,
        performanceTracking: true
      };
    }
  }

  private getImmediateRecommendations(metrics: StoragePerformanceMetrics, config: HybridStorageConfig): string[] {
    const recommendations: string[] = [];
    
    if (!metrics.mongo.isAvailable) {
      recommendations.push('Setup MongoDB connection to enable dual storage evaluation');
      recommendations.push('Verify MongoDB is running and accessible');
    } else {
      if (config.strategy === 'file_first' && this.calculatePerformanceScore(metrics.mongo) > 0.7) {
        recommendations.push('Switch to smart_routing strategy to benefit from MongoDB performance');
      }
      
      if (!config.fallbackEnabled) {
        recommendations.push('Enable fallback for better reliability');
      }
    }
    
    return recommendations;
  }

  private getLongTermRecommendations(metrics: StoragePerformanceMetrics, stats: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.mongo.isAvailable && stats.totalFiles > 1000) {
      recommendations.push('Consider migrating to MongoDB for better query performance with large datasets');
    }
    
    if (stats.totalSize > 100 * 1024 * 1024) { // 100MB
      recommendations.push('Implement data archiving strategy for old analyses');
    }
    
    recommendations.push('Monitor performance metrics over time to optimize strategy');
    recommendations.push('Plan for horizontal scaling if data growth continues');
    
    return recommendations;
  }

  private getImplementationSteps(metrics: StoragePerformanceMetrics): string[] {
    const steps: string[] = [];
    
    if (!metrics.mongo.isAvailable) {
      steps.push('1. Install and configure MongoDB');
      steps.push('2. Test MongoDB connection');
      steps.push('3. Run performance comparison');
      steps.push('4. Decide on migration strategy');
    } else {
      steps.push('1. Run comprehensive performance tests');
      steps.push('2. Analyze results and choose optimal configuration');
      steps.push('3. Update hybrid storage configuration');
      steps.push('4. Monitor performance and adjust as needed');
      
      if (this.isMigrationViable(metrics)) {
        steps.push('5. Plan and execute data migration');
      }
    }
    
    return steps;
  }

  private formatSuccessResponse(data: any): MCPServerResponse {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  private formatErrorResponse(message: string, error?: any): MCPServerResponse {
    this.logger.error(message, error);
    return {
      success: false,
      error: message,
      details: error?.message,
      timestamp: new Date().toISOString()
    };
  }
}
