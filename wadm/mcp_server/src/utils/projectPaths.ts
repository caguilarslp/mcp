/**
 * @fileoverview Project Path Utilities
 * @description Utilities for resolving project paths consistently
 * @module utils/projectPaths
 */

import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate project root by going up from src/utils/
// This works regardless of where the process is executed from
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Get the storage directory path
 */
export function getStoragePath(): string {
  return path.join(PROJECT_ROOT, 'storage');
}

/**
 * Get the analysis storage path
 */
export function getAnalysisPath(symbol?: string): string {
  const analysisPath = path.join(getStoragePath(), 'analysis');
  return symbol ? path.join(analysisPath, symbol) : analysisPath;
}

/**
 * Get the logs directory path
 */
export function getLogsPath(): string {
  return path.join(PROJECT_ROOT, 'logs');
}

/**
 * Resolve a path relative to project root
 */
export function resolveProjectPath(...segments: string[]): string {
  return path.join(PROJECT_ROOT, ...segments);
}

/**
 * Check if we're in development or production
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Get project information
 */
export function getProjectInfo() {
  return {
    root: PROJECT_ROOT,
    storage: getStoragePath(),
    logs: getLogsPath(),
    cwd: process.cwd(),
    isPortable: PROJECT_ROOT !== process.cwd()
  };
}
