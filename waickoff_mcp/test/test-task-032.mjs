#!/usr/bin/env node

/**
 * Test script for TASK-032: Fix Market Cycles Dates
 * Tests the fix for incorrect timestamp conversion (1970 dates)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🧪 TASK-032 Test: Fix Market Cycles Dates');
console.log('==========================================\n');

async function runTest() {
  try {
    // 1. Clean and rebuild
    console.log('🔨 Step 1: Cleaning and rebuilding...');
    await execAsync('npm run clean && npm run build', { cwd: 'D:/projects/mcp/waickoff_mcp' });
    console.log('✅ Build completed successfully\n');

    // 2. Test with a simple symbol
    console.log('🧪 Step 2: Testing identify_market_cycles...');
    console.log('Testing with BTCUSDT to check timestamp conversion...\n');

    // Import the service
    const { HistoricalAnalysisService } = await import('./build/services/historicalAnalysis.js');
    const { HistoricalDataService } = await import('./build/services/historicalData.js');
    const { HistoricalCacheService } = await import('./build/services/historicalCache.js');

    // Create service instances
    const historicalDataService = new HistoricalDataService();
    const historicalCacheService = new HistoricalCacheService();
    const analysisService = new HistoricalAnalysisService(historicalDataService);

    // Test identify_market_cycles
    console.log('📊 Testing identifyMarketCycles for BTCUSDT...');
    const cycles = await analysisService.identifyMarketCycles('BTCUSDT');

    console.log(`\n📋 Results (${cycles.length} cycles found):`);
    cycles.forEach((cycle, index) => {
      console.log(`\nCycle ${index + 1}:`);
      console.log(`  Type: ${cycle.type}`);
      console.log(`  Start Date: ${cycle.startDate.toISOString()}`);
      console.log(`  End Date: ${cycle.endDate?.toISOString() || 'N/A'}`);
      console.log(`  Duration: ${cycle.duration} days`);
      console.log(`  Price Change: ${cycle.priceChange.toFixed(2)}%`);
      console.log(`  Volume Profile: ${cycle.volumeProfile}`);
      
      // Validate dates are not 1970
      const startYear = cycle.startDate.get