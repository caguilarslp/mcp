#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Starting TypeScript compilation...');

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
  console.log('⚡ Running TypeScript compiler...');
  const result = execSync('npx tsc', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ TypeScript compilation completed successfully!');
  console.log('📁 Build output:', result);
  
  // Verify build directory exists
  if (fs.existsSync(buildDir)) {
    console.log('📂 Build directory created successfully');
    
    // List build contents
    const buildContents = fs.readdirSync(buildDir);
    console.log('📋 Build contents:', buildContents);
    
    // Check if index.js exists
    const indexPath = path.join(buildDir, 'index.js');
    if (fs.existsSync(indexPath)) {
      console.log('✅ index.js compiled successfully');
    } else {
      console.log('❌ index.js not found in build directory');
    }
  } else {
    console.log('❌ Build directory not created');
  }

} catch (error) {
  console.error('❌ Compilation failed:', error.message);
  console.error('STDERR:', error.stderr?.toString());
  console.error('STDOUT:', error.stdout?.toString());
}
