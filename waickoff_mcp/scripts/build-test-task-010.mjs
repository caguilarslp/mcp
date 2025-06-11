#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔥 Compilando proyecto MCP wAIckoff - TASK-010...');

const projectRoot = join(__dirname, '..');
process.chdir(projectRoot);

const npmBuild = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

npmBuild.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Compilación exitosa - TASK-010 Sistema de Configuración implementado');
    console.log('🎯 Nuevas herramientas MCP agregadas:');
    console.log('   - get_user_config: Obtener configuración del usuario');
    console.log('   - set_user_timezone: Configurar zona horaria');
    console.log('   - detect_timezone: Auto-detectar zona horaria');
    console.log('   - update_config: Actualizar múltiples configuraciones');
    console.log('   - reset_config: Resetear a configuración por defecto');
    console.log('   - validate_config: Validar configuración actual');
    console.log('   - get_config_info: Información del archivo de configuración');
  } else {
    console.error('❌ Error de compilación:', code);
    process.exit(code);
  }
});

npmBuild.on('error', (error) => {
  console.error('❌ Error ejecutando npm build:', error);
  process.exit(1);
});
