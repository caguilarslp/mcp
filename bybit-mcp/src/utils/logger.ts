/**
 * @fileoverview Logger Utility
 * @description Centralized logging with different levels and structured output
 * @version 1.3.0
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private serviceName: string;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private suppressedErrors: Set<string> = new Set();

  constructor(serviceName: string, logLevel: LogLevel = 'info') {
    this.serviceName = serviceName;
    this.logLevel = logLevel;
    
    // Suppress known MCP SDK JSON parsing errors during startup
    this.suppressedErrors.add('Expected \',\' or \']\' after array element in JSON at position 5');
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | any): void {
    this.log('error', message, undefined, error instanceof Error ? error : undefined);
  }

  // Special method for JSON debugging
  jsonDebug(operation: string, rawData: string, step: 'request' | 'response' | 'parse' | 'error'): void {
    this.debug(`JSON_DEBUG [${operation}] [${step.toUpperCase()}]`, {
      step,
      operation,
      rawData: rawData.substring(0, 200), // First 200 chars
      length: rawData.length,
      startsWithBrace: rawData.startsWith('{'),
      startsWithBracket: rawData.startsWith('['),
      position5: rawData.charAt(5) || 'N/A'
    });
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    if (levels[level] < levels[this.logLevel]) {
      return;
    }

    // Suppress known MCP SDK errors during startup
    if (level === 'error' && error && this.suppressedErrors.has(error.message)) {
      // Log as debug instead of error for known MCP SDK issues
      console.debug(`[${new Date().toISOString()}] [SUPPRESSED] [${this.serviceName}] Known MCP SDK issue: ${error.message}`);
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      data,
      error
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    const prefix = `[${logEntry.timestamp}] [${level.toUpperCase()}] [${this.serviceName}]`;
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, data || '');
        break;
      case 'info':
        console.info(`${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, error || data || '');
        break;
    }
  }

  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = level ? this.logs.filter(log => log.level === level) : this.logs;
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}