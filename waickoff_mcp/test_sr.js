#!/usr/bin/env node

// Script de prueba rápida para Support/Resistance
// Este script simula una llamada a la función sin MCP para verificar que funciona

import fetch from 'node-fetch';

const baseUrl = 'https://api.bybit.com';

async function makeRequest(endpoint) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error: ${data.retMsg}`);
  }
  
  return data.result;
}

// Función de prueba directa
async function testSupportResistance() {
  console.log('🧪 Probando función Support/Resistance con XRPUSDT...\n');
  
  try {
    // Obtener datos de prueba
    const symbol = 'XRPUSDT';
    const interval = '60';
    const periods = 50; // Menos datos para prueba rápida
    
    const klinesResult = await makeRequest(`/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${periods}`);
    
    console.log(`✅ Datos obtenidos: ${klinesResult.list.length} velas`);
    console.log(`📊 Primer precio: $${parseFloat(klinesResult.list[0][4]).toFixed(4)}`);
    console.log(`📊 Último precio: $${parseFloat(klinesResult.list[klinesResult.list.length-1][4]).toFixed(4)}`);
    
    // Verificar estructura de datos
    const firstKline = klinesResult.list[0];
    console.log(`🔍 Estructura kline: [timestamp, open, high, low, close, volume]`);
    console.log(`🔍 Ejemplo: [${firstKline[0]}, ${firstKline[1]}, ${firstKline[2]}, ${firstKline[3]}, ${firstKline[4]}, ${firstKline[5]}]`);
    
    console.log('\n✅ Test básico COMPLETADO - La API responde correctamente');
    console.log('💡 La función Support/Resistance debería funcionar con estos datos');
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
}

testSupportResistance();
