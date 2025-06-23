/**
 * @fileoverview Performance Monitor Utility
 * @description Track execution time and performance metrics
 * @version 1.3.0
 */

import { PerformanceMetrics } from '../types/index.js';

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number = 1000;

  /**
   * Measure the execution time of an async function
   */
  async measure<T>(functionName: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    let success = true;
    let errorType: string | undefined;
    let result: T;

    try {
      result = await fn();
      return result;
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      throw error;
    } finally {
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const metric: PerformanceMetrics = {
        functionName,
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        timestamp: new Date().toISOString(),
        success,
        errorType
      };

      this.addMetric(metric);
    }
  }

  /**
   * Measure the execution time of a synchronous function
   */
  measureSync<T>(functionName: string, fn: () => T): T {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    let success = true;
    let errorType: string | undefined;
    let result: T;

    try {
      result = fn();
      return result;
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      throw error;
    } finally {
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const metric: PerformanceMetrics = {
        functionName,
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        timestamp: new Date().toISOString(),
        success,
        errorType
      };

      this.addMetric(metric);
    }
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get all performance metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific function
   */
  getFunctionMetrics(functionName: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.functionName === functionName);
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    if (this.metrics.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgExecutionTime: 0,
        avgMemoryUsage: 0
      };
    }

    const successfulCalls = this.metrics.filter(m => m.success);
    const totalExecutionTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0);
    const totalMemoryUsage = this.metrics.reduce((sum, m) => sum + Math.abs(m.memoryUsage), 0);

    return {
      totalCalls: this.metrics.length,
      successRate: (successfulCalls.length / this.metrics.length) * 100,
      avgExecutionTime: totalExecutionTime / this.metrics.length,
      avgMemoryUsage: totalMemoryUsage / this.metrics.length,
      slowestFunction: this.getSlowestFunction(),
      fastestFunction: this.getFastestFunction(),
      errorBreakdown: this.getErrorBreakdown()
    };
  }

  private getSlowestFunction(): { name: string; time: number } | null {
    if (this.metrics.length === 0) return null;
    
    const slowest = this.metrics.reduce((prev, current) => 
      current.executionTime > prev.executionTime ? current : prev
    );
    
    return {
      name: slowest.functionName,
      time: slowest.executionTime
    };
  }

  private getFastestFunction(): { name: string; time: number } | null {
    if (this.metrics.length === 0) return null;
    
    const fastest = this.metrics.reduce((prev, current) => 
      current.executionTime < prev.executionTime ? current : prev
    );
    
    return {
      name: fastest.functionName,
      time: fastest.executionTime
    };
  }

  private getErrorBreakdown(): Record<string, number> {
    const errors = this.metrics.filter(m => !m.success);
    const breakdown: Record<string, number> = {};
    
    errors.forEach(metric => {
      const errorType = metric.errorType || 'Unknown';
      breakdown[errorType] = (breakdown[errorType] || 0) + 1;
    });
    
    return breakdown;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get metrics from the last N minutes
   */
  getRecentMetrics(minutes: number): PerformanceMetrics[] {
    const cutoffTime = new Date(Date.now() - (minutes * 60 * 1000));
    return this.metrics.filter(m => new Date(m.timestamp) >= cutoffTime);
  }
}