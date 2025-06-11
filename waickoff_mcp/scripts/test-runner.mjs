#!/usr/bin/env node

/**
 * @fileoverview Test Runner for TASK-004 - Comprehensive Test Suite
 * @description Runs all tests with detailed reporting and coverage
 * @version 1.4.0 - TASK-004
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 TASK-004 Test Suite - Modular Architecture Validation');
console.log('======================================================\n');

// Test categories and their priorities
const testCategories = [
  {
    name: 'Core Engine Tests',
    pattern: 'tests/core/**/*.test.ts',
    description: 'Business logic and service integration',
    critical: true
  },
  {
    name: 'Handler Delegation Tests', 
    pattern: 'tests/adapters/mcp-handlers.test.ts',
    description: 'Main orchestrator delegation pattern',
    critical: true
  },
  {
    name: 'Specialized Handler Tests',
    pattern: 'tests/adapters/handlers/**/*.test.ts',
    description: 'MarketData, AnalysisRepository, ReportGenerator handlers',
    critical: true
  },
  {
    name: 'Cache Handler Tests',
    pattern: 'tests/adapters/cacheHandlers.test.ts',
    description: 'Cache management and invalidation',
    critical: false
  },
  {
    name: 'Support/Resistance Logic Tests',
    pattern: 'tests/services/supportResistance.test.ts',
    description: 'BUG-001 regression prevention',
    critical: true
  },
  {
    name: 'Volume Delta Tests',
    pattern: 'tests/services/volumeDelta.test.ts',
    description: 'Mathematical calculations and divergence detection',
    critical: false
  },
  {
    name: 'Storage Service Tests',
    pattern: 'tests/storage.test.ts',
    description: 'Existing storage functionality',
    critical: false
  },
  {
    name: 'Cache Manager Tests',
    pattern: 'tests/cacheManager.test.ts',
    description: 'Existing cache functionality',
    critical: false
  }
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function printHeader(text, color = colors.cyan) {
  console.log(`${color}${colors.bold}${text}${colors.reset}\n`);
}

function printSuccess(text) {
  console.log(`${colors.green}✅ ${text}${colors.reset}`);
}

function printError(text) {
  console.log(`${colors.red}❌ ${text}${colors.reset}`);
}

function printWarning(text) {
  console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`);
}

function printInfo(text) {
  console.log(`${colors.blue}ℹ️  ${text}${colors.reset}`);
}

// Check if project setup is correct
function validateTestSetup() {
  printHeader('🔍 Validating Test Setup');

  const requiredFiles = [
    'jest.config.cjs',
    'package.json',
    'tsconfig.json'
  ];

  const requiredDirs = [
    'tests',
    'src',
    'node_modules'
  ];

  let setupValid = true;

  // Check required files
  for (const file of requiredFiles) {
    if (existsSync(file)) {
      printSuccess(`Found ${file}`);
    } else {
      printError(`Missing ${file}`);
      setupValid = false;
    }
  }

  // Check required directories
  for (const dir of requiredDirs) {
    if (existsSync(dir)) {
      printSuccess(`Found ${dir}/ directory`);
    } else {
      printError(`Missing ${dir}/ directory`);
      setupValid = false;
    }
  }

  // Check TypeScript compilation
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    printSuccess('TypeScript compilation check passed');
  } catch (error) {
    printError('TypeScript compilation errors detected');
    setupValid = false;
  }

  // Check Jest installation
  try {
    execSync('npx jest --version', { stdio: 'pipe' });
    printSuccess('Jest test runner available');
  } catch (error) {
    printError('Jest not properly installed');
    setupValid = false;
  }

  console.log();
  return setupValid;
}

// Run specific test category
function runTestCategory(category) {
  printHeader(`🧪 Running ${category.name}`);
  printInfo(category.description);
  
  const criticalLabel = category.critical ? 
    `${colors.red}[CRITICAL]${colors.reset}` : 
    `${colors.yellow}[OPTIONAL]${colors.reset}`;
  
  console.log(`Priority: ${criticalLabel}\n`);

  try {
    const result = execSync(`node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.cjs "${category.pattern}" --verbose --detectOpenHandles`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    printSuccess(`${category.name} completed successfully`);
    return { success: true, category: category.name };
  } catch (error) {
    printError(`${category.name} failed`);
    return { success: false, category: category.name, critical: category.critical };
  }
}

// Run all tests with coverage
function runFullTestSuite() {
  printHeader('📊 Running Full Test Suite with Coverage');

  try {
    execSync('node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.cjs --coverage --detectOpenHandles', {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    printSuccess('Full test suite completed successfully');
    return true;
  } catch (error) {
    printError('Full test suite failed');
    return false;
  }
}

// Generate test summary report
function generateTestReport(results) {
  printHeader('📋 Test Execution Summary');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const criticalFailed = results.filter(r => !r.success && r.critical).length;

  console.log(`Total test categories: ${results.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.red}Critical failures: ${criticalFailed}${colors.reset}\n`);

  if (criticalFailed > 0) {
    printError('CRITICAL TEST FAILURES DETECTED!');
    console.log('\nFailed critical test categories:');
    results.filter(r => !r.success && r.critical).forEach(r => {
      console.log(`  • ${r.category}`);
    });
    console.log('\nThese failures must be fixed before merging.');
    return false;
  } else if (failed > 0) {
    printWarning('Some optional tests failed, but critical tests passed.');
    console.log('\nFailed optional test categories:');
    results.filter(r => !r.success && !r.critical).forEach(r => {
      console.log(`  • ${r.category}`);
    });
    console.log('\nConsider fixing these for better code quality.');
    return true;
  } else {
    printSuccess('ALL TESTS PASSED! 🎉');
    console.log('\nThe modular architecture is working correctly.');
    console.log('TASK-004 validation completed successfully.');
    return true;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  // Validate setup first
  if (!validateTestSetup()) {
    printError('Test setup validation failed. Please fix the issues above.');
    process.exit(1);
  }

  let results = [];
  let success = false;

  switch (command) {
    case 'critical':
      printInfo('Running only critical tests...\n');
      const criticalCategories = testCategories.filter(c => c.critical);
      for (const category of criticalCategories) {
        const result = runTestCategory(category);
        results.push(result);
        console.log(); // Add spacing
      }
      success = generateTestReport(results);
      break;

    case 'category':
      const categoryName = args[1];
      if (!categoryName) {
        printError('Please specify a category name.');
        console.log('\nAvailable categories:');
        testCategories.forEach(c => console.log(`  • ${c.name}`));
        process.exit(1);
      }
      const category = testCategories.find(c => 
        c.name.toLowerCase().includes(categoryName.toLowerCase())
      );
      if (!category) {
        printError(`Category "${categoryName}" not found.`);
        process.exit(1);
      }
      const result = runTestCategory(category);
      results.push(result);
      success = result.success;
      break;

    case 'coverage':
      printInfo('Running full test suite with coverage...\n');
      success = runFullTestSuite();
      break;

    case 'list':
      printHeader('📋 Available Test Categories');
      testCategories.forEach((category, index) => {
        const criticalLabel = category.critical ? 
          `${colors.red}[CRITICAL]${colors.reset}` : 
          `${colors.yellow}[OPTIONAL]${colors.reset}`;
        console.log(`${index + 1}. ${colors.bold}${category.name}${colors.reset} ${criticalLabel}`);
        console.log(`   ${category.description}`);
        console.log(`   Pattern: ${colors.cyan}${category.pattern}${colors.reset}\n`);
      });
      process.exit(0);

    case 'help':
      printHeader('🆘 Test Runner Help');
      console.log('Usage: npm run test:task-004 [command] [options]\n');
      console.log('Commands:');
      console.log('  all       Run all test categories (default)');
      console.log('  critical  Run only critical tests');
      console.log('  category  Run specific category (provide category name)');
      console.log('  coverage  Run all tests with coverage report');
      console.log('  list      List all available test categories');
      console.log('  help      Show this help message\n');
      console.log('Examples:');
      console.log('  npm run test:task-004');
      console.log('  npm run test:task-004 critical');
      console.log('  npm run test:task-004 category "core engine"');
      console.log('  npm run test:task-004 coverage');
      process.exit(0);

    case 'all':
    default:
      printInfo('Running all test categories...\n');
      for (const category of testCategories) {
        const result = runTestCategory(category);
        results.push(result);
        console.log(); // Add spacing
      }
      success = generateTestReport(results);
      break;
  }

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Error handling
process.on('uncaughtException', (error) => {
  printError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  printError(`Unhandled promise rejection: ${reason}`);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  printError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
