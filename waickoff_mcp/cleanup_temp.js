const fs = require('fs');
const path = require('path');

// Lista de archivos a eliminar
const filesToDelete = [
  'build/services/multiExchange/advancedMultiExchangeService_part2.d.ts',
  'build/services/multiExchange/advancedMultiExchangeService_part2.d.ts.map',
  'build/services/multiExchange/advancedMultiExchangeService_part2.js',
  'build/services/multiExchange/advancedMultiExchangeService_part2.js.map',
  'build/services/multiExchange/advancedMultiExchangeService_part3.d.ts',
  'build/services/multiExchange/advancedMultiExchangeService_part3.d.ts.map',
  'build/services/multiExchange/advancedMultiExchangeService_part3.js',
  'build/services/multiExchange/advancedMultiExchangeService_part3.js.map',
  'build/services/multiExchange/advancedMultiExchangeService_part4.d.ts',
  'build/services/multiExchange/advancedMultiExchangeService_part4.d.ts.map',
  'build/services/multiExchange/advancedMultiExchangeService_part4.js',
  'build/services/multiExchange/advancedMultiExchangeService_part4.js.map'
];

console.log('🧹 Limpiando archivos corruptos...');

filesToDelete.forEach(file => {
  const fullPath = path.resolve(__dirname, file);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Eliminado: ${file}`);
    } else {
      console.log(`⚠️  No existe: ${file}`);
    }
  } catch (error) {
    console.log(`❌ Error eliminando ${file}:`, error.message);
  }
});

console.log('🎉 Limpieza completada. Ahora ejecuta: npm run build');

// Auto-eliminar este script
try {
  fs.unlinkSync(__filename);
  console.log('🗑️  Script temporal eliminado');
} catch (e) {
  console.log('⚠️  No se pudo auto-eliminar el script temporal');
}
