const { spawn } = require('child_process');
const path = require('path');

console.log('🔨 Compilando TypeScript para Bybit MCP...');

const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: 'D:\\projects\\mcp\\waickoff_mcp',
  stdio: 'pipe'
});

buildProcess.stdout.on('data', (data) => {
  console.log('📄 STDOUT:', data.toString());
});

buildProcess.stderr.on('data', (data) => {
  console.log('⚠️ STDERR:', data.toString());
});

buildProcess.on('close', (code) => {
  console.log(`🏁 Proceso terminado con código: ${code}`);
  if (code === 0) {
    console.log('✅ Compilación exitosa!');
  } else {
    console.log('❌ Error en compilación');
  }
});

buildProcess.on('error', (error) => {
  console.log('❌ Error ejecutando proceso:', error.message);
});
