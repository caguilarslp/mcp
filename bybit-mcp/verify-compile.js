#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Verificando compilación TypeScript...');

try {
  const result = execSync('npx tsc --noEmit', { 
    cwd: path.resolve(__dirname),
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Compilación exitosa!');
  console.log('🎉 Todos los errores TypeScript han sido resueltos');
  
} catch (error) {
  console.log('❌ Errores encontrados:');
  console.log(error.stdout || error.stderr || error.message);
}
