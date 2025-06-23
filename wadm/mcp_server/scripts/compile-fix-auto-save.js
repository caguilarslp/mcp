#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 TASK URGENTE-005: COMPILANDO FIX AUTO-SAVE...');

try {
  // Change to project directory
  process.chdir('D:\\projects\\mcp\\waickoff_mcp');
  console.log(`📁 Working directory: ${process.cwd()}`);

  // Clean build directory
  const buildDir = path.join(process.cwd(), 'build');
  if (fs.existsSync(buildDir)) {
    console.log('🧹 Cleaning build directory...');
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  // Run TypeScript compiler
  console.log('⚡ Compiling auto-save fix...');
  const result = execSync('npx tsc', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Auto-save fix compiled successfully!');
  
  // Verify critical files are updated
  const storageJsPath = path.join(buildDir, 'services', 'storage.js');
  const engineJsPath = path.join(buildDir, 'core', 'engine.js');
  
  if (fs.existsSync(storageJsPath) && fs.existsSync(engineJsPath)) {
    console.log('✅ Critical files compiled:');
    console.log('  - storage.js: ✅');
    console.log('  - engine.js: ✅');
    
    // Check if our fix is in the compiled storage.js
    const storageContent = fs.readFileSync(storageJsPath, 'utf8');
    if (storageContent.includes('initializationPromise') && storageContent.includes('ensureInitialized')) {
      console.log('✅ Auto-save initialization fix successfully compiled!');
    } else {
      console.log('❌ Auto-save fix NOT found in compiled storage.js');
    }
    
  } else {
    console.log('❌ Critical files missing after compilation');
  }

} catch (error) {
  console.error('❌ Compilation failed:');
  console.error('Error:', error.message);
  if (error.stderr) {
    console.error('STDERR:', error.stderr.toString());
  }
  if (error.stdout) {
    console.error('STDOUT:', error.stdout.toString());
  }
}
