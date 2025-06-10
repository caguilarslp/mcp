#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🔧 Testing TypeScript compilation...');

const tsc = spawn('npx', ['tsc', '--noEmit'], {
  cwd: path.resolve(__dirname),
  stdio: 'pipe'
});

let stdout = '';
let stderr = '';

tsc.stdout.on('data', (data) => {
  stdout += data.toString();
});

tsc.stderr.on('data', (data) => {
  stderr += data.toString();
});

tsc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ TypeScript compilation successful!');
    console.log('✨ All type errors have been resolved');
  } else {
    console.log('❌ TypeScript compilation failed');
    console.log('📋 Compilation output:');
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
  }
  
  console.log(`\n🏁 Process exited with code: ${code}`);
});

tsc.on('error', (error) => {
  console.log('💥 Failed to run TypeScript compiler:', error.message);
});
