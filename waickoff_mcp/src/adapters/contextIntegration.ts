/**
 * Context Integration Module
 * Automatic context loading and saving for all analyses
 */

import { globalContext } from '../services/context/persistentContext.js';
import { contextAwareAnalysis } from '../services/context/contextAwareWrapper.js';
import { Logger } from '../utils/logger.js';

// Export for use in handlers
export { globalContext, contextAwareAnalysis };

// Auto-maintenance scheduler
setInterval(() => {
  const logger = new Logger('ContextMaintenance');
  logger.info('Running scheduled context maintenance...');
  contextAwareAnalysis.performContextMaintenance()
    .catch(error => logger.error('Context maintenance failed:', error));
}, 24 * 60 * 60 * 1000); // Run daily

// Initial load message
const logger = new Logger('ContextIntegration');
logger.info('Context integration module loaded - 90 days of persistent context enabled');
