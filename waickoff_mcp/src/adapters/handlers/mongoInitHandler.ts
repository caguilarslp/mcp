/**
 * Force MongoDB initialization handler
 * Permite inicializar MongoDB manualmente si no se detectó al inicio
 */

import { Request, Response } from '../types/mcp.types.js';
import { Logger } from '../../utils/logger.js';
import { globalContext } from '../../services/context/persistentContext.js';

const logger = new Logger('MongoInitHandler');

export async function handleForceMongoInit(request: Request): Promise<Response> {
  try {
    logger.info('Forcing MongoDB initialization check...');
    
    // Re-initialize the context manager
    await globalContext.close();
    await globalContext.initializeMongoDB();
    
    // Check if MongoDB is now available
    const testWrite = await globalContext.addEntry({
      symbol: 'TEST',
      timeframe: '1',
      type: 'initialization_test',
      data: { test: true },
      summary: 'MongoDB initialization test'
    });
    
    logger.info('MongoDB initialization test completed');
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'MongoDB initialization completed',
          mongoAvailable: true,
          contextReady: true
        }, null, 2)
      }]
    };
    
  } catch (error) {
    logger.error('MongoDB initialization failed:', error);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          message: 'MongoDB initialization failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          fallback: 'Using file-based storage'
        }, null, 2)
      }]
    };
  }
}
