/**
 * @fileoverview Pattern Matcher Service
 * @description Handles glob pattern matching for file queries
 * @module services/storage/patternMatcher
 */

import { Logger } from '../../utils/logger.js';

/**
 * Service for handling file pattern matching
 */
export class PatternMatcher {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PatternMatcher');
  }

  /**
   * Convert glob pattern to regex
   * Handles patterns like:
   * - * matches any characters except /
   * - ** matches any characters including /
   * - ? matches single character
   * - [abc] matches any character in brackets
   */
  globToRegex(pattern: string): RegExp {
    // Normalize to forward slashes
    const normalizedPattern = pattern.replace(/\\/g, '/');
    
    // Escape special regex characters except our glob wildcards
    let regexPattern = normalizedPattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*\*/g, '{{DOUBLE_STAR}}') // Temporarily replace ** 
      .replace(/\*/g, '[^/]*') // * matches any characters except /
      .replace(/\?/g, '.') // ? matches single character
      .replace(/{{DOUBLE_STAR}}/g, '.*'); // ** matches any characters including /
    
    const regex = new RegExp(`^${regexPattern}$`);
    this.logger.debug(`Converted pattern "${pattern}" to regex: ${regex}`);
    
    return regex;
  }

  /**
   * Test if a path matches a pattern
   */
  matches(path: string, pattern: string | RegExp): boolean {
    // Normalize path to forward slashes
    const normalizedPath = path.replace(/\\/g, '/');
    
    const regex = typeof pattern === 'string' ? this.globToRegex(pattern) : pattern;
    const isMatch = regex.test(normalizedPath);
    
    if (isMatch) {
      this.logger.debug(`Path "${normalizedPath}" matches pattern`);
    }
    
    return isMatch;
  }

  /**
   * Filter paths by multiple patterns
   */
  filterByPatterns(paths: string[], patterns: string[]): string[] {
    if (patterns.length === 0) {
      return paths;
    }

    const regexes = patterns.map(p => this.globToRegex(p));
    
    return paths.filter(path => {
      const normalizedPath = path.replace(/\\/g, '/');
      return regexes.some(regex => regex.test(normalizedPath));
    });
  }

  /**
   * Extract parts from path based on pattern
   * For example: extract symbol from "analysis/BTCUSDT/*.json"
   */
  extractFromPath(path: string, pattern: string): Record<string, string> {
    const normalizedPath = path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const patternParts = pattern.split('/');
    
    const extracted: Record<string, string> = {};
    
    patternParts.forEach((part, index) => {
      if (part.includes('{') && part.includes('}')) {
        // Extract variable name from {varName}
        const varName = part.match(/{([^}]+)}/)?.[1];
        if (varName && parts[index]) {
          extracted[varName] = parts[index];
        }
      }
    });
    
    return extracted;
  }
}
