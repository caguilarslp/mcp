#!/usr/bin/env node

/**
 * @fileoverview Simple build verification script
 * @description Checks if the project is ready for compilation
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
console.log('🔨 Verificando configuración del proyecto wAIckoff MCP...\n');

// Check critical files
const criticalFiles = [
  'src/adapters/mcp.ts',
  'src/adapters/mcp-handlers.ts', 
  'src/core/engine.ts',
  'src/types/index.ts',
  'tsconfig.json',
  'package.json'
];

let allGood = true;

for (const file of criticalFiles) {
  const fullPath = join(projectRoot, file);
  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, 'utf8');
    console.log(`✅ ${file} - ${content.length} chars`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allGood = false;
  }
}

if (allGood) {
  console.log('\n🎯 Proyecto verificado - Listo para compilación');
  console.log('\n📋 Para compilar ejecuta:');
  console.log('   npm run build');
  console.log('\n📋 Para desarrollo:');
  console.log('   npm run dev');
  process.exit(0);
} else {
  console.log('\n❌ Algunos archivos críticos están faltando');
  process.exit(1);
}
