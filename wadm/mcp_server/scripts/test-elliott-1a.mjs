/**
 * Test script for Elliott Wave Pivot Detection - FASE 1A
 */

import { ElliottWaveService } from '../src/services/elliottWave.js';
import { BybitMarketDataService } from '../src/services/marketData.js';
import { CONFIG } from '../src/config/index.js';

async function testPivotDetection() {
  console.log('🧪 Testing Elliott Wave Pivot Detection - FASE 1A');
  console.log('=' .repeat(50));
  
  try {
    // Initialize services
    const marketDataService = new BybitMarketDataService(CONFIG.BYBIT);
    const elliottService = new ElliottWaveService(marketDataService);
    
    // Test with HBARUSDT
    const symbol = 'HBARUSDT';
    console.log(`\n📊 Testing with ${symbol}...`);
    
    // Test with different configurations
    const configs = [
      { name: 'Default', config: {} },
      { name: 'Strict', config: { minWaveLength: 2.0, strictRules: true } },
      { name: 'Relaxed', config: { minWaveLength: 0.5, strictRules: false } }
    ];
    
    for (const { name, config } of configs) {
      console.log(`\n🔧 Configuration: ${name}`);
      console.log(`   Min Wave Length: ${config.minWaveLength || 1.0}%`);
      
      try {
        const analysis = await elliottService.analyzeElliottWave(symbol, '60', config);
        
        // Check if pivots are being detected
        console.log(`\n📍 Pivot Detection Results:`);
        console.log(`   Current Sequence Waves: ${analysis.currentSequence.waves.length}`);
        console.log(`   Historical Sequences: ${analysis.historicalSequences.length}`);
        console.log(`   Data Quality: ${analysis.dataQuality}%`);
        console.log(`   Confidence: ${analysis.confidence}%`);
        
        // Check current wave info
        console.log(`\n🌊 Current Wave Analysis:`);
        console.log(`   Position: ${analysis.currentWave.position}`);
        console.log(`   Next Expected: ${analysis.currentWave.nextExpected}`);
        
        // Check projections
        console.log(`\n📈 Projections: ${analysis.projections.length} found`);
        
        // Success if we have some indication of working pivot detection
        if (analysis.dataQuality > 0 || analysis.confidence > 0) {
          console.log(`\n✅ Pivot detection appears to be working!`);
        } else {
          console.log(`\n⚠️  Low confidence/quality - may need more data`);
        }
        
      } catch (error) {
        console.error(`\n❌ Error with ${name} config:`, error.message);
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ FASE 1A Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testPivotDetection().catch(console.error);
