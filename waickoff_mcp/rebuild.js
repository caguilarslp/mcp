// Rebuild script para limpiar y recompilar el proyecto
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Iniciando rebuild del proyecto wAIckoff MCP...');

// Función para eliminar directorio recursivamente
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
    console.log(`✅ Directorio ${folderPath} eliminado`);
  }
}

try {
  // 1. Eliminar directorio build
  console.log('📁 Eliminando directorio build...');
  deleteFolderRecursive('./build');
  
  // 2. Recompilar con TypeScript
  console.log('🔧 Ejecutando TypeScript compiler...');
  execSync('npx tsc', { stdio: 'inherit' });
  
  console.log('✅ Rebuild completado exitosamente!');
  
} catch (error) {
  console.error('❌ Error durante el rebuild:', error.message);
  process.exit(1);
}
