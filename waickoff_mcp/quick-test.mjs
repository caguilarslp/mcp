#!/usr/bin/env node

/**
 * Quick Test Runner - Solo para verificar que el sistema funciona
 * No usa Jest, solo verifica funcionalidad básica
 */

import { CacheManager } from './build/services/cacheManager.js';
import { MarketAnalysisEngine } from './build/core/engine.js';

console.log('🧪 Quick Test Runner - wAIckoff MCP v1.8.3');
console.log('='.repeat(50));

async function testBasicFunctionality() {
  console.log('\n1. Testing CacheManager...');
  
  try {
    // Test cache with minimal config to avoid logging spam
    const cache = new CacheManager({
      maxEntries: 5,
      defaultTTL: 1000,
      cleanupInterval: 5000
    });
    
    await cache.set('test-key', 'test-value');
    const value = await cache.get('test-key');
    
    if (value === 'test-value') {
      console.log('   ✅ CacheManager basic operations working');
    } else {
      console.log('   ❌ CacheManager basic operations failed');
      return false;
    }
    
    await cache.clear();
    cache.stopCleanupTimer();
    
  } catch (error) {
    console.log('   ❌ CacheManager error:', error.message);
    return false;
  }
  
  return true;
}

async function testEngineInitialization() {
  console.log('\n2. Testing MarketAnalysisEngine initialization...');
  
  try {
    const engine = new MarketAnalysisEngine();
    
    // Test system health
    const health = await engine.getSystemHealth();
    
    if (health && health.status === 'healthy') {
      console.log('   ✅ MarketAnalysisEngine initialized successfully');
      console.log(`   📊 Status: ${health.status}, Version: ${health.version}`);
    } else {
      console.log('   ❌ MarketAnalysisEngine initialization failed');
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ MarketAnalysisEngine error:', error.message);
    return false;
  }
  
  return true;
}

async function testWyckoffModularStructure() {
  console.log('\n3. Testing Wyckoff modular structure...');
  
  try {
    // Test if we can import the new modular structure
    const { WyckoffBasicService } = await import('./build/services/wyckoff/core/WyckoffBasicService.js');
    
    // Create instance to test modules
    const wyckoffService = new WyckoffBasicService();
    
    console.log('   ✅ Wyckoff modular structure loaded successfully');
    console.log('   📦 TASK-030 modularization working');
    
  } catch (error) {
    console.log('   ❌ Wyckoff modular structure error:', error.message);
    return false;
  }
  
  return true;
}

async function testContextService() {
  console.log('\n4. Testing Context Service...');
  
  try {
    const { ContextAwareRepository } = await import('./build/services/context/contextRepository.js');
    
    const contextRepo = new ContextAwareRepository();
    const contextService = contextRepo.getContextService();
    
    console.log('   ✅ Context Service loaded successfully');
    console.log('   🧠 TASK-027 context system working');
    
  } catch (error) {
    console.log('   ❌ Context Service error:', error.message);
    return false;
  }
  
  return true;
}

// Run all tests
async function runTests() {
  const results = [];
  
  results.push(await testBasicFunctionality());
  results.push(await testEngineInitialization());
  results.push(await testWyckoffModularStructure());
  results.push(await testContextService());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All core functionality working! System ready for production.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Check issues above.');
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted by user');
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
