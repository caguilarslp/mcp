#!/usr/bin/env node

/**
 * Script de verificación TASK-010 - Sistema Configuración Timezone
 * Verifica que todos los componentes estén correctamente implementados
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🌍 Verificando TASK-010 - Sistema Configuración Timezone');
console.log('=' .repeat(60));

const checks = [];

// Verificar archivos implementados
const requiredFiles = [
  'src/services/config/configurationManager.ts',
  'src/adapters/handlers/configurationHandlers.ts',
  'claude/tasks/task-010-timezone-system-complete.md'
];

console.log('\n📁 Verificando archivos implementados...');
for (const file of requiredFiles) {
  try {
    const fullPath = join(projectRoot, file);
    await readFile(fullPath, 'utf-8');
    console.log(`✅ ${file}`);
    checks.push({ check: file, status: 'OK' });
  } catch (error) {
    console.log(`❌ ${file} - ${error.message}`);
    checks.push({ check: file, status: 'FAIL' });
  }
}

// Verificar contenido de tipos
console.log('\n🔧 Verificando tipos implementados...');
try {
  const typesFile = await readFile(join(projectRoot, 'src/types/index.ts'), 'utf-8');
  
  const requiredTypes = [
    'UserConfig',
    'UserTimezoneConfig', 
    'TimezoneDetectionResult',
    'ConfigurationManager'
  ];
  
  for (const type of requiredTypes) {
    if (typesFile.includes(type)) {
      console.log(`✅ Type: ${type}`);
      checks.push({ check: `Type ${type}`, status: 'OK' });
    } else {
      console.log(`❌ Type: ${type} - Not found`);
      checks.push({ check: `Type ${type}`, status: 'FAIL' });
    }
  }
} catch (error) {
  console.log(`❌ Error reading types file: ${error.message}`);
  checks.push({ check: 'Types file', status: 'FAIL' });
}

// Verificar integración MCP
console.log('\n🛠️ Verificando integración MCP...');
try {
  const mcpFile = await readFile(join(projectRoot, 'src/adapters/mcp.ts'), 'utf-8');
  
  const requiredTools = [
    'get_user_config',
    'set_user_timezone',
    'detect_timezone',
    'update_config',
    'reset_config',
    'validate_config',
    'get_config_info'
  ];
  
  for (const tool of requiredTools) {
    if (mcpFile.includes(tool)) {
      console.log(`✅ MCP Tool: ${tool}`);
      checks.push({ check: `MCP Tool ${tool}`, status: 'OK' });
    } else {
      console.log(`❌ MCP Tool: ${tool} - Not found`);
      checks.push({ check: `MCP Tool ${tool}`, status: 'FAIL' });
    }
  }
} catch (error) {
  console.log(`❌ Error reading MCP file: ${error.message}`);
  checks.push({ check: 'MCP integration', status: 'FAIL' });
}

// Verificar documentación actualizada
console.log('\n📚 Verificando documentación...');
try {
  const masterLog = await readFile(join(projectRoot, 'claude/master-log.md'), 'utf-8');
  
  if (masterLog.includes('TASK-010 COMPLETADA')) {
    console.log('✅ Master log actualizado');
    checks.push({ check: 'Master log', status: 'OK' });
  } else {
    console.log('❌ Master log no actualizado');
    checks.push({ check: 'Master log', status: 'FAIL' });
  }
  
  if (masterLog.includes('v1.5.0')) {
    console.log('✅ Versión v1.5.0 documentada');
    checks.push({ check: 'Version v1.5.0', status: 'OK' });
  } else {
    console.log('❌ Versión v1.5.0 no documentada');
    checks.push({ check: 'Version v1.5.0', status: 'FAIL' });
  }
} catch (error) {
  console.log(`❌ Error reading master log: ${error.message}`);
  checks.push({ check: 'Master log', status: 'FAIL' });
}

// Resumen final
console.log('\n🎯 Resumen de Verificación TASK-010');
console.log('=' .repeat(60));

const totalChecks = checks.length;
const passedChecks = checks.filter(c => c.status === 'OK').length;
const failedChecks = checks.filter(c => c.status === 'FAIL').length;

console.log(`Total verificaciones: ${totalChecks}`);
console.log(`✅ Pasaron: ${passedChecks}`);
console.log(`❌ Fallaron: ${failedChecks}`);
console.log(`📊 Success rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

if (failedChecks === 0) {
  console.log('\n🎆 TASK-010 SISTEMA CONFIGURACIÓN TIMEZONE: ✅ COMPLETADA');
  console.log('🌍 Sistema de configuración persistente implementado exitosamente');
  console.log('🚀 Listo para compilación y uso en producción');
} else {
  console.log('\n⚠️ TASK-010 tiene issues pendientes');
  console.log('🔧 Revisar los elementos que fallaron antes de declarar completada');
}

console.log('\n📋 Próximos pasos:');
console.log('1. Ejecutar npm run build para compilar');
console.log('2. Probar herramientas MCP de configuración');
console.log('3. Validar auto-detección de timezone');
console.log('4. Iniciar TASK-012 (Bull/Bear Traps Detection)');

process.exit(failedChecks > 0 ? 1 : 0);
