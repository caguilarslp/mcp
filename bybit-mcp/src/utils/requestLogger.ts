/**
 * @fileoverview Advanced Request Logger
 * @description Comprehensive logging for API requests/responses and JSON error detection
 * @version 1.3.1
 */

import { Logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';

export interface RequestLogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  url: string;
  requestBody?: any;
  responseStatus?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  error?: string;
  duration?: number;
  jsonParseAttempts?: JsonParseAttempt[];
}

export interface JsonParseAttempt {
  attempt: number;
  rawData: string;
  error: string;
  errorPosition?: number;
  context?: string;
}

export class RequestLogger {
  private logger: Logger;
  private logsDir: string;
  private currentLogFile: string;
  private requestCounter: number = 0;

  constructor() {
    this.logger = new Logger('RequestLogger', 'debug');
    this.logsDir = path.join(process.cwd(), 'logs');
    this.currentLogFile = this.getLogFileName();
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `mcp-requests-${today}.json`);
  }

  private generateRequestId(): string {
    this.requestCounter++;
    const timestamp = Date.now();
    return `REQ-${timestamp}-${this.requestCounter.toString().padStart(4, '0')}`;
  }

  async logRequest(
    method: string,
    url: string,
    requestBody?: any
  ): Promise<string> {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    const logEntry: RequestLogEntry = {
      timestamp,
      requestId,
      method: method.toUpperCase(),
      url,
      requestBody
    };

    this.logger.info(`🌐 API Request [${requestId}]`, {
      method: method.toUpperCase(),
      url,
      hasBody: !!requestBody
    });

    await this.writeToFile(logEntry);
    return requestId;
  }

  async logResponse(
    requestId: string,
    response: {
      status?: number;
      headers?: Record<string, string>;
      body?: string;
      error?: string;
    },
    duration?: number
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // Try to parse JSON and detect errors
    const jsonParseAttempts: JsonParseAttempt[] = [];
    let parsedBody: any = null;

    if (response.body) {
      const parseResult = this.attemptJsonParse(response.body);
      jsonParseAttempts.push(...parseResult.attempts);
      parsedBody = parseResult.result;
    }

    const logEntry: RequestLogEntry = {
      timestamp,
      requestId,
      method: '', // Will be updated when reading from file
      url: '', // Will be updated when reading from file
      responseStatus: response.status,
      responseBody: response.body,
      responseHeaders: response.headers,
      error: response.error,
      duration,
      jsonParseAttempts
    };

    // Log success or error
    if (response.error || (response.status && response.status >= 400)) {
      this.logger.error(`❌ API Response Error [${requestId}]`, {
        status: response.status,
        error: response.error,
        duration: duration ? `${duration}ms` : undefined,
        jsonErrors: jsonParseAttempts.filter(a => a.error).length
      });
    } else {
      this.logger.info(`✅ API Response Success [${requestId}]`, {
        status: response.status,
        duration: duration ? `${duration}ms` : undefined,
        bodySize: response.body?.length || 0,
        jsonParseSuccessful: !!parsedBody
      });
    }

    // Log JSON parsing issues specifically
    jsonParseAttempts.forEach((attempt, index) => {
      if (attempt.error) {
        this.logger.error(`🔍 JSON Parse Error [${requestId}] Attempt ${attempt.attempt}`, {
          error: attempt.error,
          errorPosition: attempt.errorPosition,
          rawDataPreview: attempt.rawData.substring(0, 100),
          rawDataLength: attempt.rawData.length,
          context: attempt.context
        });
      }
    });

    await this.updateLogEntry(requestId, logEntry);
  }

  private attemptJsonParse(rawData: string): {
    result: any;
    attempts: JsonParseAttempt[];
  } {
    const attempts: JsonParseAttempt[] = [];
    let result: any = null;

    // Attempt 1: Direct parse
    try {
      result = JSON.parse(rawData);
      attempts.push({
        attempt: 1,
        rawData,
        error: '',
        context: 'Direct parse successful'
      });
    } catch (error: any) {
      const errorMatch = error.message.match(/at position (\d+)/);
      const errorPosition = errorMatch ? parseInt(errorMatch[1]) : undefined;

      attempts.push({
        attempt: 1,
        rawData,
        error: error.message,
        errorPosition,
        context: 'Direct parse failed'
      });

      // Attempt 2: Trim whitespace
      try {
        result = JSON.parse(rawData.trim());
        attempts.push({
          attempt: 2,
          rawData: rawData.trim(),
          error: '',
          context: 'Parse successful after trim'
        });
      } catch (error2: any) {
        attempts.push({
          attempt: 2,
          rawData: rawData.trim(),
          error: error2.message,
          context: 'Parse failed even after trim'
        });

        // Attempt 3: Check for incomplete JSON
        if (errorPosition !== undefined && errorPosition < rawData.length) {
          const contextStart = Math.max(0, errorPosition - 20);
          const contextEnd = Math.min(rawData.length, errorPosition + 20);
          const context = rawData.substring(contextStart, contextEnd);
          
          attempts.push({
            attempt: 3,
            rawData: context,
            error: `Context around position ${errorPosition}: "${context}"`,
            errorPosition,
            context: 'Error context analysis'
          });
        }
      }
    }

    return { result, attempts };
  }

  private async writeToFile(logEntry: RequestLogEntry): Promise<void> {
    try {
      const logFile = this.getLogFileName();
      let existingLogs: RequestLogEntry[] = [];

      // Read existing logs if file exists
      if (fs.existsSync(logFile)) {
        const existingData = fs.readFileSync(logFile, 'utf8');
        if (existingData.trim()) {
          existingLogs = JSON.parse(existingData);
        }
      }

      // Add new log entry
      existingLogs.push(logEntry);

      // Write back to file
      fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
    } catch (error) {
      this.logger.error('Failed to write log to file', error as Error);
    }
  }

  private async updateLogEntry(requestId: string, updates: Partial<RequestLogEntry>): Promise<void> {
    try {
      const logFile = this.getLogFileName();
      if (!fs.existsSync(logFile)) {
        return;
      }

      const existingData = fs.readFileSync(logFile, 'utf8');
      if (!existingData.trim()) {
        return;
      }

      const existingLogs: RequestLogEntry[] = JSON.parse(existingData);
      const logIndex = existingLogs.findIndex(log => log.requestId === requestId);

      if (logIndex !== -1) {
        existingLogs[logIndex] = { ...existingLogs[logIndex], ...updates };
        fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
      }
    } catch (error) {
      this.logger.error('Failed to update log entry', error as Error);
    }
  }

  async getRecentLogs(limit: number = 50): Promise<RequestLogEntry[]> {
    try {
      const logFile = this.getLogFileName();
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const existingData = fs.readFileSync(logFile, 'utf8');
      if (!existingData.trim()) {
        return [];
      }

      const logs: RequestLogEntry[] = JSON.parse(existingData);
      return logs.slice(-limit);
    } catch (error) {
      this.logger.error('Failed to read logs from file', error as Error);
      return [];
    }
  }

  async getJsonErrorLogs(): Promise<RequestLogEntry[]> {
    const logs = await this.getRecentLogs(200);
    return logs.filter(log => 
      log.jsonParseAttempts && 
      log.jsonParseAttempts.some(attempt => attempt.error)
    );
  }

  // Wrapper for fetch with automatic logging
  async loggedFetch(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const startTime = Date.now();
    const requestId = await this.logRequest(
      options.method || 'GET',
      url,
      options.body ? JSON.parse(options.body as string) : undefined
    );

    try {
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      // Clone response to read body without consuming it
      const responseClone = response.clone();
      const responseBody = await responseClone.text();
      
      await this.logResponse(requestId, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody
      }, duration);

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await this.logResponse(requestId, {
        error: error.message
      }, duration);

      throw error;
    }
  }
}

// Singleton instance
export const requestLogger = new RequestLogger();