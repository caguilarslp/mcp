// Simple compilation script for TypeScript
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔨 Starting TypeScript compilation...');

// Clean build directory
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  console.log('🧹 Cleaning build directory...');
  fs.rmSync(buildDir, { recursive: true, force: true });
}

// Run TypeScript compiler
exec('npx tsc', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Compilation failed:', error.message);
    console.error('stderr:', stderr);
    return;
  }
  
  if (stderr) {
    console.log('⚠️ Compilation warnings:', stderr);
  }
  
  console.log('✅ TypeScript compilation completed successfully!');
  console.log('📁 Build output:', stdout);
  
  // Verify build directory exists
  if (fs.existsSync(buildDir)) {
    console.log('📂 Build directory created successfully');
    
    // List build contents
    const buildContents = fs.readdirSync(buildDir);
    console.log('📋 Build contents:', buildContents);
  }
});
