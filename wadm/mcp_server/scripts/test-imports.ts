// Test TypeScript compilation
import { FileLogger } from './src/utils/fileLogger.js';
import { Logger } from './src/utils/logger.js';

console.log('Testing imports...');

const logger = new FileLogger('test');
const basicLogger = new Logger('test');

console.log('All imports successful!');
