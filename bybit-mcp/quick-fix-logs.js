/**
 * Quick fix para eliminar logs complejos del MCP
 * Los errores JSON vienen de objetos complejos en las respuestas
 */

// Crear versión simplificada del marketData.ts sin logs complejos
const fs = require('fs');
const path = require('path');

const srcFile = 'D:\\projects\\mcp\\bybit-mcp\\src\\services\\marketData.ts';
const buildFile = 'D:\\projects\\mcp\\bybit-mcp\\build\\services\\marketData.js';

console.log('🔧 Eliminando logs complejos de marketData...');

// Leer archivo fuente
let srcContent = fs.readFileSync(srcFile, 'utf8');

// Remover todas las llamadas a logger que contengan objetos complejos
srcContent = srcContent.replace(
  /this\.logger\.info\(`API Response for.*?\{[\s\S]*?\}\);/g,
  '// Removed complex logging to avoid MCP JSON errors'
);

// Escribir archivo fuente limpio
fs.writeFileSync(srcFile, srcContent);

// Leer archivo compilado
let buildContent = fs.readFileSync(buildFile, 'utf8');

// Remover logs complejos del archivo compilado
buildContent = buildContent.replace(
  /this\.logger\.info\(`API Response for.*?\{[\s\S]*?\}\);/g,
  '// Removed complex logging to avoid MCP JSON errors'
);

fs.writeFileSync(buildFile, buildContent);

console.log('✅ Logs complejos eliminados');
console.log('💡 Ahora reinicia el MCP y Claude Desktop');
