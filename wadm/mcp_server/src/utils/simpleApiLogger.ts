/**
 * @fileoverview Simple API Logger - Solo para debugging de API
 * @description Logger minimalista que evita errores JSON en Claude Desktop
 * @version 1.3.4
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SimpleApiLog {
  timestamp: string;
  endpoint: string;
  method: string;
  status?: number;
  success: boolean;
  duration?: number;
  error?: string;
  responseSize?: number;
}

export class SimpleApiLogger {
  private logs: SimpleApiLog[] = [];
  private logFile: string;
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();

  constructor() {
    const today = new Date().toISOString().split('T')[0];
    this.logFile = path.join(process.cwd(), 'logs', `api-${today}.json`);
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  logApiRequest(endpoint: string, method: string = 'GET'): string {
    const requestId = `REQ-${Date.now()}-${++this.requestCount}`;
    
    const log: SimpleApiLog = {
      timestamp: new Date().toISOString(),
      endpoint: endpoint.replace('https://api.bybit.com', ''),
      method,
      success: false // Will be updated on response
    };

    this.logs.push(log);
    return requestId;
  }

  logApiResponse(endpoint: string, success: boolean, duration?: number, status?: number, error?: string, responseSize?: number): void {
    // Find the most recent log for this endpoint
    const logIndex = this.logs.findIndex(log => 
      log.endpoint === endpoint.replace('https://api.bybit.com', '') && 
      log.success === false
    );

    if (logIndex !== -1) {
      this.logs[logIndex].success = success;
      this.logs[logIndex].duration = duration;
      this.logs[logIndex].status = status;
      this.logs[logIndex].error = error;
      this.logs[logIndex].responseSize = responseSize;

      if (!success) {
        this.errorCount++;
      }
    }

    // Keep only last 100 logs in memory
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // Write to file occasionally
    if (this.requestCount % 10 === 0) {
      this.writeToFile();
    }
  }

  private writeToFile(): void {
    try {
      const summary = {
        summary: {
          totalRequests: this.requestCount,
          totalErrors: this.errorCount,
          successRate: this.requestCount > 0 ? ((this.requestCount - this.errorCount) / this.requestCount * 100).toFixed(1) + '%' : '100%',
          uptime: Math.round((Date.now() - this.startTime) / 1000) + 's',
          lastUpdate: new Date().toISOString()
        },
        recent_requests: this.logs.slice(-20)
      };

      fs.writeFileSync(this.logFile, JSON.stringify(summary, null, 2));
    } catch (error) {
      // Silent fail - don't log complex objects
    }
  }

  getStats() {
    return {
      total_requests: this.requestCount,
      total_errors: this.errorCount,
      success_rate: this.requestCount > 0 ? `${((this.requestCount - this.errorCount) / this.requestCount * 100).toFixed(1)}%` : '100%',
      uptime_seconds: Math.round((Date.now() - this.startTime) / 1000),
      recent_errors: this.logs.filter(log => !log.success).slice(-5).map(log => ({
        endpoint: log.endpoint,
        error: log.error,
        timestamp: log.timestamp
      }))
    };
  }

  // Simple console logging - solo para debugging crítico
  logError(message: string): void {
    // Solo log crítico, sin objetos complejos
    console.error(`[API-ERROR] ${message}`);
  }

  logInfo(message: string): void {
    // Solo log básico, sin objetos complejos
    console.info(`[API-INFO] ${message}`);
  }
}

// Singleton instance
export const simpleApiLogger = new SimpleApiLogger();
