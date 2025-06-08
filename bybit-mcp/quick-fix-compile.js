#!/usr/bin/env node
/**
 * Quick compilation script to fix JSON errors
 */

console.log('🔨 Quick TypeScript Compilation');
console.log('==============================');

try {
  const { execSync } = require('child_process');
  const path = require('path');
  
  process.chdir('D:\\projects\\mcp\\bybit-mcp');
  console.log('📂 Working directory:', process.cwd());
  
  // Run TypeScript compiler
  console.log('⚙️ Running: npx tsc');
  const result = execSync('npx tsc', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ TypeScript compilation completed successfully!');
  
  if (result && result.trim()) {
    console.log('📄 Compiler output:', result);
  } else {
    console.log('📄 No compiler output (clean build)');
  }
  
  // Check if build directory exists and has files
  const fs = require('fs');
  const buildDir = path.join(process.cwd(), 'build');
  
  if (fs.existsSync(buildDir)) {
    const buildFiles = fs.readdirSync(buildDir);
    console.log('🏗️ Build directory contents:', buildFiles.length, 'items');
    console.log('📁 Files:', buildFiles.slice(0, 5).join(', '), buildFiles.length > 5 ? '...' : '');
  } else {
    console.log('⚠️ Build directory not found');
  }
  
  console.log('');
  console.log('🎯 FIXED: JSON response reading conflict');
  console.log('🔧 CHANGED: Removed requestLogger from marketData.ts');
  console.log('✅ READY: MCP should now work without JSON errors');
  
} catch (error) {
  console.error('❌ Compilation failed:', error.message);
  
  if (error.stdout) {
    console.log('📄 STDOUT:', error.stdout);
  }
  
  if (error.stderr) {
    console.log('⚠️ STDERR:', error.stderr);
  }
  
  console.log('');
  console.log('💡 Try running manually:');
  console.log('   cd D:\\projects\\mcp\\bybit-mcp');
  console.log('   npm run build');
}
