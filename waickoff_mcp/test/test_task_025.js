/**
 * TASK-025: Test Suite para validar fixes de errores críticos
 * Ejecuta tests específicos para cada error corregido
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

async function runTest(testName, command) {
  console.log(`\n${colors.cyan}${colors.bright}========================================${colors.reset}`);
  console.log(`${colors.yellow}Running: ${testName}${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}\n`);
  
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execPromise(command);
    const duration = Date.now() - startTime;
    
    // Analizar resultados
    const hasErrors = stdout.includes('error') || stdout.includes('Error') || 
                     stderr.includes('error') || stderr.includes('Error');
    const hasWarnings = stdout.includes('warning') || stdout.includes('Warning');
    
    if (hasErrors) {
      console.log(`${colors.red}❌ FAILED${colors.reset} - ${testName}`);
      console.log(`${colors.red}Errors found in output${colors.reset}`);
    } else if (hasWarnings) {
      console.log(`${colors.yellow}⚠️  WARNING${colors.reset} - ${testName}`);
      console.log(`${colors.yellow}Test passed with warnings${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ PASSED${colors.reset} - ${testName}`);
    }
    
    console.log(`${colors.blue}Duration: ${duration}ms${colors.reset}`);
    
    // Mostrar output relevante
    if (stdout) {
      console.log(`\n${colors.magenta}Output:${colors.reset}`);
      console.log(stdout.substring(0, 1000)); // Primeros 1000 caracteres
    }
    
    return { success: !hasErrors, duration, warnings: hasWarnings };
    
  } catch (error) {
    console.log(`${colors.red}❌ ERROR${colors.reset} - ${testName}`);
    console.log(`${colors.red}${error.message}${colors.reset}`);
    return { success: false, duration: 0, error: error.message };
  }
}

async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}TASK-025: Testing Integral - Validación de Fixes${colors.reset}`);
  console.log(`${colors.bright}================================================${colors.reset}\n`);
  
  const tests = [
    {
      name: 'Test 1: Order Blocks + Volume Delta (BTCUSDT)',
      command: 'npm test -- --testNamePattern="Order Blocks.*BTCUSDT" --silent'
    },
    {
      name: 'Test 2: Fibonacci + Elliott Wave (ETHUSDT)',
      command: 'npm test -- --testNamePattern="Fibonacci.*Elliott.*ETHUSDT" --silent'
    },
    {
      name: 'Test 3: SMC Multi-timeframe (15m, 1h, 4h)',
      command: 'npm test -- --testNamePattern="SMC.*confluence.*15m.*1h.*4h" --silent'
    },
    {
      name: 'Test 4: Complete Analysis (XLMUSDT)',
      command: 'npm test -- --testNamePattern="complete.*analysis.*XLMUSDT" --silent'
    }
  ];
  
  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;
  
  // Ejecutar tests secuencialmente
  for (const test of tests) {
    const result = await runTest(test.name, test.command);
    results.push({ ...test, ...result });
    
    if (result.success) {
      totalPassed++;
      if (result.warnings) totalWarnings++;
    } else {
      totalFailed++;
    }
    
    // Pausa entre tests para evitar sobrecarga
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Resumen final
  console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}           RESUMEN FINAL                ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);
  
  console.log(`${colors.green}✅ Tests Pasados: ${totalPassed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Con Warnings: ${totalWarnings}${colors.reset}`);
  console.log(`${colors.red}❌ Tests Fallidos: ${totalFailed}${colors.reset}`);
  
  const successRate = (totalPassed / tests.length * 100).toFixed(1);
  console.log(`\n${colors.bright}Success Rate: ${successRate}%${colors.reset}`);
  
  // Criterios de éxito
  console.log(`\n${colors.bright}Criterios de Éxito:${colors.reset}`);
  const criteria = [
    {
      name: 'Order Blocks detecta al menos 1 bloque por símbolo',
      met: results[0]?.success || false
    },
    {
      name: 'Fibonacci siempre muestra High > Low',
      met: results[1]?.success || false
    },
    {
      name: 'SMC Confluences score > 0 en al menos 50% de casos',
      met: results[2]?.success || false
    },
    {
      name: 'Sin errores de conexión en ninguna herramienta',
      met: totalFailed === 0
    },
    {
      name: 'Performance < 3s por análisis completo',
      met: results.every(r => r.duration < 3000)
    }
  ];
  
  criteria.forEach(c => {
    console.log(`${c.met ? colors.green + '✅' : colors.red + '❌'} ${c.name}${colors.reset}`);
  });
  
  const allCriteriaMet = criteria.every(c => c.met);
  const systemOperational = successRate >= 85;
  
  console.log(`\n${colors.bright}Estado del Sistema: ${
    systemOperational ? colors.green + 'OPERATIVO (' + successRate + '%)' : 
    colors.red + 'REQUIERE ATENCIÓN (' + successRate + '%)'
  }${colors.reset}`);
  
  if (allCriteriaMet && systemOperational) {
    console.log(`\n${colors.green}${colors.bright}✅ TASK-025 COMPLETADA EXITOSAMENTE${colors.reset}`);
    console.log(`${colors.green}Sistema al ${successRate}% operativo${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  TASK-025 REQUIERE REVISIÓN ADICIONAL${colors.reset}`);
    console.log(`${colors.yellow}Algunos criterios no se cumplieron completamente${colors.reset}`);
  }
  
  // Guardar resultados
  const reportContent = {
    timestamp: new Date().toISOString(),
    taskId: 'TASK-025',
    phase: 'FASE 5 - Testing Integral',
    results: results,
    summary: {
      totalTests: tests.length,
      passed: totalPassed,
      failed: totalFailed,
      warnings: totalWarnings,
      successRate: parseFloat(successRate),
      systemOperational: systemOperational,
      allCriteriaMet: allCriteriaMet
    },
    criteria: criteria
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    'test_results_task025.json', 
    JSON.stringify(reportContent, null, 2)
  );
  
  console.log(`\n${colors.blue}Resultados guardados en: test_results_task025.json${colors.reset}`);
}

// Ejecutar tests
runAllTests().catch(console.error);
