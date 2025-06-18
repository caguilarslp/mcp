/**
 * @fileoverview Wyckoff Analysis Module
 * @description Modular Wyckoff methodology implementation
 * @version 2.0.0 - TASK-030 Modularization
 */

// Export core components
export * from './core/index.js';

// Main service (backward compatibility)
export { WyckoffBasicService as default } from './core/WyckoffBasicService.js';

// Re-export for compatibility with existing imports
export { WyckoffBasicService, type IWyckoffBasicService } from './core/index.js';
