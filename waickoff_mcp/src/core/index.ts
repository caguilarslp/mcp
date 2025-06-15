/**
 * @fileoverview Core exports for engine
 */

import { MarketAnalysisEngine } from './engine.js';

export { MarketAnalysisEngine };
export type IEngine = MarketAnalysisEngine;

// Export error class
export class EngineError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'EngineError';
  }
}
