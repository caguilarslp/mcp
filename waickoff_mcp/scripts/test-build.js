#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

console.log('🔨 Testing TypeScript compilation...\n');

try {
  // Run TypeScript compiler
  const output = execSync('npx tsc --noEmit', {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ TypeScript compilation successful!');
  console.log('No errors found.\n');
  
} catch (error) {
  console.error('❌ TypeScript compilation failed!\n');
  console.error('Errors found:');
  console.error(error.stdout || error.stderr || error.message);
  process.exit(1);
}

console.log('📦 Building project...\n');

try {
  // Run build
  const buildOutput = execSync('npm run build', {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Build successful!');
  console.log(buildOutput);
  
} catch (error) {
  console.error('❌ Build failed!\n');
  console.error(error.stdout || error.stderr || error.message);
  process.exit(1);
}

console.log('\n🎉 All checks passed!');
