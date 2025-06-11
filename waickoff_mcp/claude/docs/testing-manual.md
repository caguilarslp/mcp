# 🧪 Manual de Testing - wAIckoff MCP v1.4.0

## 📋 Guía Completa del Sistema de Tests

**Versión:** v1.4.0  
**TASK-004 Completada:** ✅ Sistema completo implementado  
**Cobertura:** 100+ test cases, 8 categorías  
**Arquitectura:** Tests modulares para sistema modular  

---

## 🎯 Propósito del Sistema de Tests

### **¿Por qué tenemos tests?**
- **Validar arquitectura modular** reparada en v1.3.7
- **Prevenir regresiones** como BUG-001 (clasificación S/R)
- **Facilitar refactoring** con confianza
- **Detectar errores** antes de producción
- **Documentar comportamiento** esperado del sistema

### **¿Qué cubren los tests?**
- ✅ **Delegation pattern** en handlers especializados
- ✅ **Business logic** del Core Engine
- ✅ **Mathematical calculations** (Volume Delta, S/R)
- ✅ **Error handling** robusto
- ✅ **Response formatting** consistente
- ✅ **Service integration** entre capas

---

## 🚀 Comandos Principales

### **Scripts npm Disponibles**
```bash
# Test runner principal
npm run test:task-004

# Solo tests críticos (obligatorios)
npm run test:critical

# Tests con cobertura completa
npm run test:coverage

# Categoría específica
npm run test:category "handler"

# Listar todas las categorías
npm run test:list

# Ayuda detallada
npm run test:help

# Jest tradicional (todos los tests)
npm test
```

### **Uso Básico**
```bash
# Ejecutar todos los tests
npm run test:task-004

# Ver qué categorías están disponibles
npm run test:list

# Solo tests críticos para validación rápida
npm run test:critical

# Tests específicos
npm run test:category "core engine"
npm run test:category "support resistance"
```

---

## 📊 Categorías de Tests

### **🔴 Tests Críticos (Obligatorios)**

#### **1. Core Engine Tests**
- **Archivo:** `tests/core/engine.test.ts`
- **Propósito:** Validar business logic central
- **Tests:** 25+ test cases
- **Cubre:**
  - Operaciones de mercado (getTicker, getOrderbook)
  - Análisis técnico integral
  - Dependency injection
  - System health y performance metrics

```bash
npm run test:category "core engine"
```

#### **2. Handler Delegation Tests**
- **Archivo:** `tests/adapters/mcp-handlers.test.ts`
- **Propósito:** Validar patrón de delegación modular
- **Tests:** 20+ test cases
- **Cubre:**
  - Inicialización de handlers especializados
  - Delegación correcta entre handlers
  - Response helpers y serialización JSON

```bash
npm run test:category "handler delegation"
```

#### **3. Specialized Handler Tests**
- **Archivos:** `tests/adapters/handlers/`
- **Propósito:** Validar handlers especializados
- **Tests:** 35+ test cases distribuidos
- **Cubre:**
  - MarketDataHandlers
  - AnalysisRepositoryHandlers  
  - ReportGeneratorHandlers

```bash
npm run test:category "specialized"
```

#### **4. Support/Resistance Logic Tests**
- **Archivo:** `tests/services/supportResistance.test.ts`
- **Propósito:** **PREVENIR BUG-001 REGRESIÓN**
- **Tests:** 25+ test cases críticos
- **Cubre:**
  - Clasificación correcta: resistance > precio, support < precio
  - Detección de pivots precisa
  - Cálculos de strength
  - Edge cases y casos límite

```bash
npm run test:category "support resistance"
```

### **🟡 Tests de Apoyo (Importantes)**

#### **5. Cache Handler Tests**
- **Archivo:** `tests/adapters/cacheHandlers.test.ts`
- **Tests:** 12+ test cases
- **Cubre:** Gestión de cache, invalidación, estadísticas

#### **6. Volume Delta Tests**
- **Archivo:** `tests/services/volumeDelta.test.ts`
- **Tests:** 20+ test cases
- **Cubre:** Cálculos matemáticos, detección de divergencias

#### **7. Storage Service Tests**
- **Archivo:** `tests/storage.test.ts`
- **Tests:** Funcionalidad existente (backward compatibility)

#### **8. Cache Manager Tests**
- **Archivo:** `tests/cacheManager.test.ts`
- **Tests:** Funcionalidad existente

---

## 🔧 Arquitectura de Tests

### **Patrón de Mocking Consistente**

```typescript
// 1. Mock dependencies
jest.mock('../../../src/core/engine.js');
jest.mock('../../../src/utils/fileLogger.js');

// 2. Setup antes de cada test
beforeEach(() => {
  mockEngine = new MarketAnalysisEngine() as jest.Mocked<MarketAnalysisEngine>;
  mockLogger = { info: jest.fn(), error: jest.fn() } as any;
  
  handlers = new MarketDataHandlers(mockEngine, mockLogger);
});

// 3. Cleanup después de cada test
afterEach(() => {
  jest.clearAllMocks();
});
```

### **Estructura de Test Típica**

```typescript
describe('MarketDataHandlers', () => {
  describe('handleGetTicker', () => {
    it('should handle successful ticker request', async () => {
      // Arrange - Preparar mocks
      const mockTicker = { symbol: 'BTCUSDT', lastPrice: 45000 };
      mockEngine.getTicker.mockResolvedValue({
        success: true,
        data: mockTicker
      });

      // Act - Ejecutar función
      const result = await handlers.handleGetTicker({ symbol: 'BTCUSDT' });

      // Assert - Verificar resultados
      expect(mockEngine.getTicker).toHaveBeenCalledWith('BTCUSDT', 'spot');
      expect(result).toHaveProperty('content');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.symbol).toBe('BTCUSDT');
    });
  });
});
```

### **Test de Prevención BUG-001 (Crítico)**

```typescript
it('should never classify support above current price or resistance below current price', async () => {
  const testCases = [
    { currentPrice: 45000, symbol: 'BTCUSDT' },
    { currentPrice: 30000, symbol: 'ETHUSDT' }
  ];

  for (const testCase of testCases) {
    // Setup mock data
    const result = await analysisService.identifySupportResistance(
      testCase.symbol, '60', 3, 1
    );

    // CRITICAL: This is the exact bug we're preventing
    const invalidSupports = result.supports.filter(s => s.level > testCase.currentPrice);
    const invalidResistances = result.resistances.filter(r => r.level < testCase.currentPrice);

    expect(invalidSupports).toHaveLength(0);
    expect(invalidResistances).toHaveLength(0);
  }
});
```

---

## 📈 Test Runner Avanzado

### **Características del Test Runner**

El test runner (`scripts/test-runner.mjs`) incluye:

- **🎯 Categorización inteligente** (críticos vs opcionales)
- **🔍 Validación de setup** automática
- **📊 Reportes detallados** con códigos de colores
- **⚡ Ejecución selectiva** por categorías
- **🚨 Detección de fallos críticos**

### **Flujo de Ejecución**

```bash
🧪 TASK-004 Test Suite - Modular Architecture Validation
======================================================

🔍 Validating Test Setup
✅ Found jest.config.js
✅ Found package.json  
✅ Found tsconfig.json
✅ TypeScript compilation check passed
✅ Jest test runner available

🧪 Running Core Engine Tests
ℹ️  Business logic and service integration
Priority: [CRITICAL]

  ✅ should get ticker data successfully
  ✅ should handle ticker service errors
  ✅ should get comprehensive market data
  ...

✅ Core Engine Tests completed successfully

📋 Test Execution Summary
Total test categories: 8
Passed: 7
Failed: 1
Critical failures: 0

✅ ALL CRITICAL TESTS PASSED! 🎉
```

### **Códigos de Salida**
- **0:** Todos los tests pasaron
- **1:** Fallos en tests críticos (bloquean merge)
- **2:** Solo fallos en tests opcionales (warning)

---

## 🎯 Escenarios de Uso

### **🔄 Desarrollo Diario**
```bash
# Antes de empezar a trabajar
npm run test:critical

# Durante desarrollo
npm run test:category "relevant category"

# Antes de commit
npm run test:task-004
```

### **🚀 Pre-deployment**
```bash
# Validación completa
npm run test:coverage

# Verificar cobertura mínima
# Target: 85%+ en componentes críticos
```

### **🐛 Debugging**
```bash
# Test específico que falla
npx jest "tests/services/supportResistance.test.ts" --verbose

# Solo un test case
npx jest -t "should never classify support above current price"

# Watch mode para desarrollo
npx jest --watch "tests/adapters/handlers/"
```

### **📊 Análisis de Cobertura**
```bash
# Generar reporte completo
npm run test:coverage

# Ver reporte en HTML
open coverage/lcov-report/index.html  # macOS/Linux
start coverage/lcov-report/index.html  # Windows
```

---

## 🔍 Interpretación de Resultados

### **✅ Tests Exitosos**
```
✅ Core Engine Tests completed successfully
✅ Handler Delegation Tests completed successfully
✅ Support/Resistance Logic Tests completed successfully
```
**Significado:** Sistema funcionando correctamente, safe to deploy

### **⚠️ Warnings (Tests Opcionales Fallaron)**
```
⚠️  Some optional tests failed, but critical tests passed.

Failed optional test categories:
  • Volume Delta Tests
  • Cache Handler Tests
```
**Significado:** Funcionalidad core OK, pero hay issues menores

### **❌ Fallos Críticos**
```
❌ CRITICAL TEST FAILURES DETECTED!

Failed critical test categories:
  • Support/Resistance Logic Tests

These failures must be fixed before merging.
```
**Significado:** ⛔ NO DEPLOYAR - Hay bugs que pueden causar regresiones

---

## 🛠️ Configuración y Setup

### **Archivos de Configuración**

#### **jest.config.js**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/examples/**',
    '!src/**/*.d.ts'
  ]
};
```

#### **package.json Scripts**
```json
{
  "scripts": {
    "test:task-004": "node scripts/test-runner.mjs",
    "test:critical": "node scripts/test-runner.mjs critical",
    "test:coverage": "node scripts/test-runner.mjs coverage",
    "test:category": "node scripts/test-runner.mjs category",
    "test:list": "node scripts/test-runner.mjs list"
  }
}
```

### **Dependencies de Testing**
```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

---

## 🚨 Troubleshooting Tests

### **Tests no ejecutan**
```bash
# Verificar setup
npm run test:help

# Verificar TypeScript
npx tsc --noEmit

# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### **Fallos de compilación**
```bash
# Verificar imports y paths
npx tsc --noEmit --skipLibCheck

# Verificar mocks
# Asegurar que todos los imports mock usen .js extension
```

### **Tests lentos**
```bash
# Ejecutar solo tests críticos
npm run test:critical

# Categoría específica
npm run test:category "core"

# Verificar timeouts en Jest
```

### **Fallos de mocking**
```typescript
// Verificar que mocks están en el lugar correcto
jest.mock('../../../src/core/engine.js'); // ✅ Correcto
jest.mock('../../../src/core/engine.ts'); // ❌ Incorrecto

// Asegurar que beforeEach limpia mocks
afterEach(() => {
  jest.clearAllMocks(); // ✅ Esencial
});
```

---

## 📋 Checklist de Testing

### **✅ Antes de Commit**
- [ ] `npm run test:critical` pasa sin errores
- [ ] Nuevos features tienen tests correspondientes
- [ ] Tests de regresión BUG-001 siguen pasando
- [ ] No hay `console.log` en código de tests

### **✅ Antes de Merge/Deploy**
- [ ] `npm run test:task-004` pasa completamente
- [ ] `npm run test:coverage` muestra cobertura >85%
- [ ] Documentación de tests actualizada
- [ ] Tests de integración validados

### **✅ Después de Deploy**
- [ ] Tests de smoke ejecutados en production
- [ ] Métricas de sistema confirman funcionalidad
- [ ] No hay regresiones reportadas

---

## 🎯 Mejores Prácticas

### **📝 Escribiendo Tests**
- **Usar nombres descriptivos** que expliquen el escenario
- **Seguir patrón AAA** (Arrange, Act, Assert)
- **Un test = un concepto** específico
- **Mock solo dependencies externas**, no lógica interna
- **Verificar tanto happy path como error cases**

### **🏗️ Mantenimiento**
- **Actualizar tests** cuando cambies lógica
- **Agregar tests** para cada bug fix
- **Refactorizar tests** junto con código
- **Revisar cobertura** regularmente

### **🚀 Performance**
- **Usar beforeEach/afterEach** para setup/cleanup
- **Limpiar mocks** entre tests
- **No hacer IO real** en tests unitarios
- **Timeouts apropiados** para async operations

---

## 🔮 Futuro del Testing

### **Próximas Mejoras**
- **Integration tests** con servicios reales
- **E2E tests** para workflows completos
- **Performance tests** para benchmarking
- **Visual regression tests** para reportes
- **Mutation testing** para validar calidad de tests

### **CI/CD Integration (Futuro)**
```yaml
# .github/workflows/test.yml (cuando esté disponible)
- name: Run Critical Tests
  run: npm run test:critical
  
- name: Run Full Test Suite
  run: npm run test:coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

---

## 📞 Soporte y Ayuda

### **Comandos de Ayuda**
```bash
npm run test:help          # Ayuda del test runner
npm run test:list          # Ver todas las categorías
npx jest --help            # Ayuda de Jest
```

### **Referencias**
- **Jest Documentation:** https://jestjs.io/docs
- **ts-jest Setup:** https://kulshekhar.github.io/ts-jest/
- **Testing Best Practices:** https://github.com/goldbergyoni/javascript-testing-best-practices

---

**¡El sistema de testing v1.4.0 garantiza la calidad y estabilidad del wAIckoff MCP!** 🧪✨

*Con estos tests, puedes desarrollar con confianza sabiendo que no romperás funcionalidad existente y que el sistema está protegido contra regresiones como BUG-001.*
