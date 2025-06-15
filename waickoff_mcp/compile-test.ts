/**
 * @fileoverview Compilation Test - TASK-026 FASE 1 
 * @description Quick test to verify TypeScript compilation
 */

import { SupportedExchange, ExchangeAdapterFactory } from './src/adapters/exchanges/index.js';

console.log('🔧 Testing TypeScript compilation...');
console.log('Supported exchanges:', Object.values(SupportedExchange));
console.log('✅ Compilation successful!');
