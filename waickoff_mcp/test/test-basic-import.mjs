#!/usr/bin/env node

/**
 * Manual test for TASK-027 FASE 1
 * Tests basic functionality of ContextAwareRepository integration
 */

async function testBasicImport() {
  try {
    console.log('📦 Testing basic imports...');
    
    // Test import of ContextAwareRepository
    const { ContextAwareRepository } = await import('../src/services/context/contextRepository.js');
    console.log('✅ ContextAwareRepository imported successfully');
    
    // Test creation
    const repo = new ContextAwareRepository();
    console.log('✅ ContextAwareRepository created successfully');
    
    // Test basic method existence
    if (typeof repo.saveAnalysisWithContext === 'function') {
      console.log('✅ saveAnalysisWithContext method exists');
    } else {
      throw new Error('saveAnalysisWithContext method missing');
    }
    
    if (typeof repo.getAnalysisWithContext === 'function') {
      console.log('✅ getAnalysisWithContext method exists');
    } else {
      throw new Error('getAnalysisWithContext method missing');
    }
    
    console.log('🎉 TASK-027 FASE 1 Basic Import Test PASSED');
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
    return false;
  }
}

testBasicImport()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.log('💥 Test crashed:', error);
    process.exit(1);
  });
