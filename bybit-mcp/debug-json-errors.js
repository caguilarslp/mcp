/**
 * Script de diagnóstico para identificar errores JSON específicos
 * Ejecuta funciones del MCP y captura errores detallados
 */

const fs = require('fs');
const path = require('path');

// Función para parsear JSON de forma segura con información detallada
function safeJsonParse(jsonString, context = 'unknown') {
  try {
    if (typeof jsonString !== 'string') {
      console.log(`❌ [${context}] Input no es string:`, typeof jsonString, jsonString);
      return null;
    }
    
    if (jsonString.trim() === '') {
      console.log(`⚠️ [${context}] JSON string vacío`);
      return null;
    }
    
    // Mostrar primeros y últimos caracteres
    console.log(`🔍 [${context}] JSON preview (first 50 chars):`, jsonString.substring(0, 50));
    console.log(`🔍 [${context}] JSON preview (last 50 chars):`, jsonString.substring(Math.max(0, jsonString.length - 50)));
    
    const result = JSON.parse(jsonString);
    console.log(`✅ [${context}] JSON parsed successfully`);
    return result;
  } catch (error) {
    console.log(`❌ [${context}] JSON Parse Error:`, error.message);
    console.log(`📍 [${context}] Error position:`, error.message.match(/position (\d+)/)?.[1] || 'unknown');
    
    if (error.message.includes('position')) {
      const position = parseInt(error.message.match(/position (\d+)/)?.[1] || '0');
      console.log(`🔍 [${context}] Character at error position:`, jsonString.charAt(position));
      console.log(`🔍 [${context}] Context around error:`, jsonString.substring(Math.max(0, position - 10), position + 10));
    }
    
    return null;
  }
}

// Función para leer archivos JSON y validarlos
function validateJsonFiles() {
  console.log('🔍 Validando archivos JSON del proyecto...\n');
  
  const jsonFiles = [
    'package.json',
    'tsconfig.json'
  ];
  
  jsonFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`📄 Validando ${file}:`);
      const content = fs.readFileSync(filePath, 'utf8');
      safeJsonParse(content, file);
      console.log('');
    }
  });
}

// Función para simular requests a la API de Bybit
async function testBybitApiRequests() {
  console.log('🌐 Probando requests a API de Bybit...\n');
  
  const endpoints = [
    'https://api.bybit.com/v5/market/time',
    'https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing endpoint: ${endpoint}`);
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bybit-MCP-Debug/1.3.1'
        },
        timeout: 5000
      });
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`📊 Headers:`, Object.fromEntries(response.headers.entries()));
      
      const rawText = await response.text();
      console.log(`📊 Raw response length: ${rawText.length} characters`);
      
      // Validar JSON
      const jsonResult = safeJsonParse(rawText, `API-${endpoint.split('/').pop()}`);
      
      if (jsonResult) {
        console.log(`✅ API response parsed successfully`);
        if (jsonResult.retCode !== undefined) {
          console.log(`📊 Bybit API retCode: ${jsonResult.retCode}`);
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ Network error for ${endpoint}:`, error.message);
      console.log('');
    }
  }
}

// Función principal
async function main() {
  console.log('🔧 Bybit MCP - Diagnóstico de Errores JSON');
  console.log('='.repeat(50));
  console.log('');
  
  // 1. Validar archivos JSON del proyecto
  validateJsonFiles();
  
  // 2. Probar requests a API
  await testBybitApiRequests();
  
  console.log('🏁 Diagnóstico completado.');
  console.log('');
  console.log('💡 Si hay errores JSON específicos en MCP, ejecuta:');
  console.log('   npm start y observa los logs detallados');
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error en diagnóstico:', error);
  process.exit(1);
});
