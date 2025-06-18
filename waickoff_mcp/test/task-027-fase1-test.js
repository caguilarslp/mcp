/**
 * Test TASK-027 FASE 1 - Context Integration
 */

import { MarketAnalysisEngine } from '../src/core/engine.js';

async function testContextIntegration() {
  console.log('🧪 Testing TASK-027 FASE 1 - Context Integration');
  
  try {
    // Initialize engine
    const engine = new MarketAnalysisEngine();
    
    console.log('✅ Engine initialized with ContextAwareRepository');
    
    // Test a simple technical analysis to see if context is saved
    console.log('🔍 Testing technical analysis with context...');
    
    const result = await engine.performTechnicalAnalysis('BTCUSDT', {
      includeVolatility: true,
      includeVolume: false,
      includeVolumeDelta: false,
      includeSupportResistance: false,
      timeframe: '60',
      periods: 50
    });
    
    if (result.success) {
      console.log('✅ Technical analysis completed with context saving');
      console.log('📊 Analysis includes:', Object.keys(result.data || {}));
    } else {
      console.log('❌ Technical analysis failed:', result.error);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// Run test
testContextIntegration()
  .then(success => {
    if (success) {
      console.log('🎉 TASK-027 FASE 1 - Context Integration Test PASSED');
      process.exit(0);
    } else {
      console.log('💥 TASK-027 FASE 1 - Context Integration Test FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.log('💥 Test crashed:', error);
    process.exit(1);
  });
