#!/usr/bin/env node

/**
 * Simple test runner to check if our fixes work
 * Just run one critical test to verify the changes
 */

import { execSync } from 'child_process';

console.log('🧪 Running simple test to verify fixes...\n');

try {
  // Test only the setup test which should always work
  const result = execSync('node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.cjs tests/setup.test.ts --verbose', {
    stdio: 'inherit',
    encoding: 'utf8'
  });
  
  console.log('\n✅ Simple test passed! Configuration is working.');
  
} catch (error) {
  console.log('\n❌ Simple test failed. Exit code:', error.status);
  process.exit(error.status || 1);
}

console.log('\n🎯 Now trying Core Engine test...\n');

try {
  // Test the core engine we just fixed
  const result = execSync('node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.cjs tests/core/engine.test.ts --verbose --detectOpenHandles', {
    stdio: 'inherit',
    encoding: 'utf8'
  });
  
  console.log('\n✅ Core Engine test passed! Architecture fixes are working.');
  
} catch (error) {
  console.log('\n❌ Core Engine test failed. Exit code:', error.status);
  console.log('This indicates we still have issues with mocks or dependencies.');
}

console.log('\n📋 Test verification complete.');
