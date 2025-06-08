/**
 * @fileoverview File Logger System
 * @description Professional logging system with file rotation and comprehensive error tracking
 * @version 1.3.2
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, LogLevel, LogEntry } from './logger.js';

export interface LogFileEntry extends LogEntry {
  requestId?: string;
  operation?: string;
  duration?: number;
  stackTrace?: string;
}

export interface LogFileConfig {
  logDir: string;
  maxFileSize: number; // bytes
  maxFiles: number;
  enableRotation: boolean;
  enableStackTrace: boolean;
}

export class FileLogger extends Logger {
  private config: LogFileConfig;
  private currentLogFile: string;
  private isInitialized: boolean = false;

  constructor(
    serviceName: string, 
    logLevel: LogLevel = 'info',
    config?: Partial<LogFileConfig>
  ) {
    super(serviceName, logLevel);
    
    this.config = {
      logDir: path.join(process.cwd(), 'logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableRotation: true,
      enableStackTrace: true,
      ...config
    };
    
    this.currentLogFile = this.getLogFileName();
    this.initialize();
  }

  private initialize(): void {
    try {
      // Ensure log directory exists
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
        this.info(`Created log directory: ${this.config.logDir}`);
      }

      // Create initial log file if it doesn't exist
      if (!fs.existsSync(this.currentLogFile)) {
        this.writeToFile({
          timestamp: new Date().toISOString(),
          level: 'info',
          service: 'FileLogger',
          message: 'Log file initialized',
          operation: 'system_startup'
        });
      }

      this.isInitialized = true;
      this.info('FileLogger initialized successfully');
      
      // Log system info
      this.info('FileLogger configuration', {
        logDir: this.config.logDir,
        maxFileSize: `${Math.round(this.config.maxFileSize / 1024 / 1024)}MB`,
        maxFiles: this.config.maxFiles,
        rotationEnabled: this.config.enableRotation
      });

    } catch (error) {
      console.error('Failed to initialize FileLogger:', error);
      this.isInitialized = false;
    }
  }

  private getLogFileName(): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.config.logDir, `mcp-${today}.log`);
  }

  private getRotatedFileName(index: number): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.config.logDir, `mcp-${today}.${index}.log`);
  }

  protected log(level: LogLevel, message: string, data?: any, error?: Error): void {
    // Call parent log method for console output and in-memory storage
    super.log(level, message, data, error);

    // Write to file if initialized
    if (this.isInitialized) {
      this.logToFile(level, message, data, error);
    }
  }

  private logToFile(level: LogLevel, message: string, data?: any, error?: Error): void {
    try {
      const logEntry: LogFileEntry = {
        timestamp: new Date().toISOString(),
        level,
        service: this.serviceName,
        message,
        data,
        error
      };

      // Add stack trace for errors if enabled
      if (level === 'error' && error && this.config.enableStackTrace) {
        logEntry.stackTrace = error.stack;
      }

      // Check if rotation is needed
      if (this.config.enableRotation && this.shouldRotate()) {
        this.rotateLogFile();
      }

      this.writeToFile(logEntry);

    } catch (writeError) {
      console.error('Failed to write to log file:', writeError);
    }
  }

  private writeToFile(entry: LogFileEntry): void {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.currentLogFile, logLine, 'utf8');
  }

  private shouldRotate(): boolean {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return false;
      }

      const stats = fs.statSync(this.currentLogFile);
      return stats.size >= this.config.maxFileSize;
    } catch (error) {
      console.error('Error checking file size for rotation:', error);
      return false;
    }
  }

  private rotateLogFile(): void {
    try {
      // Move existing files up in the rotation
      for (let i = this.config.maxFiles - 1; i > 0; i--) {
        const currentFile = this.getRotatedFileName(i);
        const nextFile = this.getRotatedFileName(i + 1);
        
        if (fs.existsSync(currentFile)) {
          if (i === this.config.maxFiles - 1) {
            // Delete the oldest file
            fs.unlinkSync(currentFile);
          } else {
            // Move file to next position
            fs.renameSync(currentFile, nextFile);
          }
        }
      }

      // Move current log file to .1
      if (fs.existsSync(this.currentLogFile)) {
        const firstRotated = this.getRotatedFileName(1);
        fs.renameSync(this.currentLogFile, firstRotated);
      }

      // Create new log file
      this.writeToFile({
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'FileLogger',
        message: 'Log file rotated',
        operation: 'log_rotation'
      });

      this.info('Log file rotated successfully');

    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  // Enhanced logging methods with request tracking
  logRequest(requestId: string, operation: string, message: string, data?: any): void {
    this.logToFile('info', message, { ...data, requestId, operation });
  }

  logError(requestId: string, operation: string, message: string, error: Error): void {
    this.logToFile('error', message, { requestId, operation }, error);
  }

  logPerformance(requestId: string, operation: string, duration: number, data?: any): void {
    this.logToFile('info', `Performance: ${operation}`, { 
      ...data, 
      requestId, 
      operation, 
      duration: `${duration}ms` 
    });
  }

  // Get recent logs from file
  getRecentLogsFromFile(lines: number = 100): LogFileEntry[] {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return [];
      }

      const content = fs.readFileSync(this.currentLogFile, 'utf8');
      const logLines = content.trim().split('\n').slice(-lines);
      
      return logLines
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line) as LogFileEntry;
          } catch (parseError) {
            // Return a basic log entry for unparseable lines
            return {
              timestamp: new Date().toISOString(),
              level: 'warn' as LogLevel,
              service: 'FileLogger',
              message: `Failed to parse log line: ${line.substring(0, 100)}`,
              error: parseError as Error
            };
          }
        });

    } catch (error) {
      console.error('Failed to read logs from file:', error);
      return [];
    }
  }

  // Get error logs from file
  getErrorLogsFromFile(hours: number = 24): LogFileEntry[] {
    const allLogs = this.getRecentLogsFromFile(1000);
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return allLogs.filter(log => 
      log.level === 'error' && 
      new Date(log.timestamp) > cutoffTime
    );
  }

  // Get log file info
  getLogFileInfo(): {
    currentFile: string;
    fileSize: string;
    totalFiles: number;
    rotationEnabled: boolean;
  } {
    try {
      const stats = fs.existsSync(this.currentLogFile) 
        ? fs.statSync(this.currentLogFile)
        : null;

      // Count rotated files
      let totalFiles = fs.existsSync(this.currentLogFile) ? 1 : 0;
      for (let i = 1; i <= this.config.maxFiles; i++) {
        if (fs.existsSync(this.getRotatedFileName(i))) {
          totalFiles++;
        }
      }

      return {
        currentFile: this.currentLogFile,
        fileSize: stats ? `${(stats.size / 1024).toFixed(1)}KB` : '0KB',
        totalFiles,
        rotationEnabled: this.config.enableRotation
      };

    } catch (error) {
      console.error('Failed to get log file info:', error);
      return {
        currentFile: this.currentLogFile,
        fileSize: 'Unknown',
        totalFiles: 0,
        rotationEnabled: this.config.enableRotation
      };
    }
  }

  // Cleanup old log files
  cleanupOldLogs(daysToKeep: number = 7): void {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      const files = fs.readdirSync(this.config.logDir);
      
      let deletedCount = 0;
      
      files.forEach(file => {
        if (file.startsWith('mcp-') && file.endsWith('.log')) {
          const filePath = path.join(this.config.logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      });

      if (deletedCount > 0) {
        this.info(`Cleaned up ${deletedCount} old log files`);
      }

    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  // Export logs to JSON
  exportLogs(outputFile: string, hours: number = 24): void {
    try {
      const logs = this.getRecentLogsFromFile(10000);
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const filteredLogs = logs.filter(log => 
        new Date(log.timestamp) > cutoffTime
      );

      const exportData = {
        exportTimestamp: new Date().toISOString(),
        timeRange: `Last ${hours} hours`,
        totalLogs: filteredLogs.length,
        logs: filteredLogs
      };

      fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
      this.info(`Exported ${filteredLogs.length} logs to ${outputFile}`);

    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  }
}
