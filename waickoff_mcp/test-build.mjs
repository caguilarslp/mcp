#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔧 Testing TASK-027 FASE 1 compilation...');

const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: 'D:/projects/mcp/waickoff_mcp',
  stdio: 'pipe',
  shell: true
});

let output = '';
let errorOutput = '';

buildProcess.stdout.on('data', (data) => {
  output += data.toString();
});

buildProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ COMPILACIÓN EXITOSA - TASK-027 FASE 1');
    console.log('\n--- Build Output ---');
    console.log(output);
  } else {
    console.log('❌ ERROR EN COMPILACIÓN');
    console.log('\n--- Error Output ---');
    console.log(errorOutput);
    console.log('\n--- Standard Output ---');
    console.log(output);
  }
});

buildProcess.on('error', (err) => {
  console.log('❌ Error launching build process:', err);
});
