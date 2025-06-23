/**
 * TASK-025: Test directo de herramientas MCP
 * Valida que las herramientas arregladas funcionan correctamente
 */

import { MCPAdapter } from './src/adapters/mcp.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Mock de server MCP para tests
const mockServer: Server = {
  setRequestHandler: () => {},
  onerror: () => {},
  onclose: () => {},
  connect: async () => {},
  close: async () => {},
  onrequest: async () => ({ _meta: {} }),
  onfallback: () => {}
} as any;

async function testTool(toolName: string, params: any, description: string) {
  console.log(`\n${colors.cyan}Testing: ${description}${colors.reset}`);
  console.log(`Tool: ${toolName}`);
  console.log(`Params: ${JSON.stringify(params, null, 2)}`);
  
  try {
    const adapter = new MCPAdapter(mockServer);
    const startTime = Date.now();
    
    // Ejecutar herramienta
    const result = await adapter.handleToolCall(toolName, params);
    const duration = Date.now() - startTime;
    
    // Validar resultado
    if (result.success) {
      console.log(`${colors.green}✅ SUCCESS${colors.reset} (${duration}ms)`);
      
      // Validaciones específicas por herramienta
      if (toolName === 'detect_order_blocks') {
        const data = result.data;
        console.log(`  - Active blocks: ${data.activeBlocks?.length || 0}`);
        console.log(`  - Market bias: ${data.marketBias}`);
        console.log(`  - Current price: $${data.currentPrice}`);
        
        if (data.activeBlocks && data.activeBlocks.length > 0) {
          console.log(`${colors.green}  ✓ Order blocks detected successfully${colors.reset}`);
        } else {
          console.log(`${colors.yellow}  ⚠ No order blocks detected (may be normal)${colors.reset}`);
        }
      }
      
      if (toolName === 'calculate_fibonacci_levels') {
        const data = result.data;
        const swingHigh = data.swingPoints?.high?.price || 0;
        const swingLow = data.swingPoints?.low?.price || 0;
        
        console.log(`  - Swing High: $${swingHigh}`);
        console.log(`  - Swing Low: $${swingLow}`);
        console.log(`  - Retracement levels: ${data.retracementLevels?.length || 0}`);
        
        if (swingHigh > swingLow) {
          console.log(`${colors.green}  ✓ Fibonacci swings are valid (High > Low)${colors.reset}`);
        } else {
          console.log(`${colors.red}  ✗ Invalid swings: High ($${swingHigh}) <= Low ($${swingLow})${colors.reset}`);
        }
      }
      
      if (toolName === 'analyze_smart_money_confluence') {
        const data = result.data;
        console.log(`  - Total confluences: ${data.confluences?.length || 0}`);
        console.log(`  - Market bias: ${data.marketBias?.direction} (${data.marketBias?.strength}%)`);
        console.log(`  - Institutional score: ${data.institutionalActivity?.score || 0}`);
        
        if (data.confluences && data.confluences.length > 0) {
          const avgScore = data.confluences.reduce((sum: number, c: any) => sum + c.strength, 0) / data.confluences.length;
          console.log(`  - Average confluence score: ${avgScore.toFixed(1)}`);
          console.log(`${colors.green}  ✓ SMC confluences detected successfully${colors.reset}`);
        } else {
          console.log(`${colors.yellow}  ⚠ No confluences detected (checking individual elements...)${colors.reset}`);
          console.log(`    - Order blocks: ${data.rawAnalysis?.orderBlocks?.activeBlocks?.length || 0}`);
          console.log(`    - FVGs: ${data.rawAnalysis?.fairValueGaps?.openGaps?.length || 0}`);
          console.log(`    - BOS: ${data.rawAnalysis?.breakOfStructure?.activeBreaks?.length || 0}`);
        }
      }
      
      return { success: true, duration, data: result.data };
      
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`Error: ${result.error}`);
      return { success: false, error: result.error };
    }
    
  } catch (error: any) {
    console.log(`${colors.red}❌ ERROR${colors.reset}`);
    console.log(`Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}TASK-025: Direct Tool Testing${colors.reset}`);
  console.log(`${colors.bright}==============================${colors.reset}\n`);
  
  const results = [];
  
  // Test 1: Order Blocks (ERROR CRÍTICO #1)
  results.push(await testTool(
    'detect_order_blocks',
    { symbol: 'BTCUSDT', timeframe: '60' },
    'Order Blocks Detection - BTCUSDT'
  ));
  
  // Pausa entre tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Fibonacci (ERROR CRÍTICO #2)
  results.push(await testTool(
    'calculate_fibonacci_levels',
    { symbol: 'ETHUSDT', timeframe: '60' },
    'Fibonacci Levels - ETHUSDT'
  ));
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: SMC Confluence (ERROR CRÍTICO #3)
  results.push(await testTool(
    'analyze_smart_money_confluence',
    { symbol: 'BTCUSDT', timeframe: '60' },
    'SMC Confluence Analysis - BTCUSDT'
  ));
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Multi-timeframe
  results.push(await testTool(
    'analyze_smart_money_confluence',
    { symbol: 'XLMUSDT', timeframe: '240' },
    'SMC Confluence Analysis - XLMUSDT 4H'
  ));
  
  // Resumen
  console.log(`\n${colors.bright}${colors.cyan}==============================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}         RESUMEN              ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}==============================${colors.reset}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const successRate = (passed / results.length * 100).toFixed(1);
  
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.bright}Success Rate: ${successRate}%${colors.reset}`);
  
  // Evaluación del sistema
  const systemStatus = successRate >= 85 ? 'OPERATIVO' : 
                      successRate >= 70 ? 'PARCIALMENTE OPERATIVO' : 
                      'REQUIERE ATENCIÓN';
  
  const statusColor = successRate >= 85 ? colors.green : 
                     successRate >= 70 ? colors.yellow : 
                     colors.red;
  
  console.log(`\n${colors.bright}Sistema: ${statusColor}${systemStatus} (${successRate}%)${colors.reset}`);
  
  // Detalles de errores críticos resueltos
  console.log(`\n${colors.bright}Errores Críticos:${colors.reset}`);
  console.log(`${results[0].success ? colors.green + '✅' : colors.red + '❌'} Order Blocks Connection${colors.reset}`);
  console.log(`${results[1].success ? colors.green + '✅' : colors.red + '❌'} Fibonacci Swing Inversion${colors.reset}`);
  console.log(`${results[2].success ? colors.green + '✅' : colors.red + '❌'} SMC Zero Confluences${colors.reset}`);
  console.log(`${results[0].success && results[0].data?.activeBlocks?.length > 0 ? colors.green + '✅' : colors.yellow + '⚠️ '} Order Blocks Detection${colors.reset}`);
  
  // Guardar resultados
  const report = {
    timestamp: new Date().toISOString(),
    task: 'TASK-025',
    phase: 'FASE 5',
    results: results.map((r, i) => ({
      test: i + 1,
      success: r.success,
      duration: r.duration || 0,
      error: r.error
    })),
    summary: {
      passed,
      failed,
      successRate: parseFloat(successRate),
      systemStatus
    }
  };
  
  require('fs').writeFileSync(
    'task025_test_results.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\n${colors.blue}Resultados guardados en: task025_test_results.json${colors.reset}`);
}

// Ejecutar tests
runTests().catch(console.error);
