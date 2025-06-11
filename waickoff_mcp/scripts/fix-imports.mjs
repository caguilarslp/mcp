#!/usr/bin/env node

/**
 * Fix remaining import issues in test files
 * This script updates any remaining .js extensions in imports
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const testFiles = [
  'tests/core/engine.test.ts',
  'tests/adapters/mcp-handlers.test.ts',
  'tests/adapters/cacheHandlers.test.ts',
  'tests/adapters/handlers/analysisRepositoryHandlers.test.ts',
  'tests/services/supportResistance.test.ts',
  'tests/services/volumeDelta.test.ts'
];

// Update imports in all test files
testFiles.forEach(file => {
  try {
    const content = readFileSync(file, 'utf8');
    const updatedContent = content.replace(/from '(.+)\.js'/g, "from '$1'");
    
    if (content !== updatedContent) {
      writeFileSync(file, updatedContent);
      console.log(`✅ Updated ${file}`);
    } else {
      console.log(`✓ ${file} - No changes needed`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
  }
});

console.log('\nImport fixes completed!');
