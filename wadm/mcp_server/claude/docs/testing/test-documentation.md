# 🧪 wAIckoff MCP Test Documentation

## 📋 Resumen del Sistema de Tests

**Versión:** v1.4.0  
**Framework:** Jest con ts-jest  
**Configuración:** ES Modules  
**Estado:** Configuración base funcional, tests unitarios en desarrollo

## 🏗️ Arquitectura de Tests

### Estructura de Directorios
```
tests/
├── core/
│   └── engine.test.ts          # Tests del motor principal
├── adapters/
│   ├── mcp-handlers.test.ts    # Tests del orquestador principal
│   ├── cacheHandlers.test.ts   # Tests de manejo de cache
│   └── handlers/
│       ├── marketDataHandlers.test.ts      # Tests de datos de mercado
│       └── analysisRepositoryHandlers.test.ts # Tests del repositorio
├── services/
│   ├── supportResistance.test.ts # Tests críticos BUG-001
│   └── volumeDelta.test.ts       # Tests de cálculos matemáticos
├── storage.test.ts              # Tests del servicio de almacenamiento
├── cacheManager.test.ts         # Tests del administrador de cache
├── setup.test.ts                # Test de verificación de configuración
└── test-utils.ts                # Utilidades y helpers para tests
```

### Configuración Principal

#### jest.config.cjs
```javascript
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }]
  }
};
```

#### tsconfig.test.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "allowJs": true,
    "noEmit": true,
    "isolatedModules": true
  }
}
```

## 🚀 Comandos de Ejecución

### NPM Scripts
```bash
# Ejecutar todos los tests
npm test

# Test runner avanzado con categorías
npm run test:task-004         # Ejecutar todos los tests
npm run test:critical         # Solo tests críticos
npm run test:coverage         # Con reporte de cobertura
npm run test:category [name]  # Categoría específica
npm run test:list            # Listar categorías disponibles
npm run test:help            # Mostrar ayuda
```

### Ejecución Directa
```bash
# Test específico
npm test tests/setup.test.ts

# Patrón de archivos
npm test tests/core/*.test.ts

# Con watch mode
npm test -- --watch
```

## 📊 Categorías de Tests

### Tests Críticos (CRITICAL)
- **Core Engine Tests**: Lógica de negocio y integración de servicios
- **Handler Delegation Tests**: Patrón de delegación del orquestador
- **Specialized Handler Tests**: Handlers de dominio específico
- **Support/Resistance Logic Tests**: Prevención de regresión BUG-001

### Tests Opcionales (OPTIONAL)
- **Cache Handler Tests**: Gestión y invalidación de cache
- **Volume Delta Tests**: Cálculos matemáticos y detección de divergencias
- **Storage Service Tests**: Funcionalidad de almacenamiento existente
- **Cache Manager Tests**: Funcionalidad de cache existente

## 🔧 Configuración ES Modules

### Cambios Implementados
1. **Archivos CommonJS**: 
   - `jest.config.js` → `jest.config.cjs`
   - `jest.setup.js` → `jest.setup.cjs`

2. **Package.json**:
   ```json
   "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.cjs"
   ```

3. **Imports sin extensiones**:
   ```typescript
   // ❌ Incorrecto
   import { Engine } from './engine.js';
   
   // ✅ Correcto
   import { Engine } from './engine';
   ```

## 🛠️ Utilidades de Test

### test-utils.ts
```typescript
// Helper para crear mocks del engine
export function createMockEngine(): MockedMarketAnalysisEngine {
  return {
    getTicker: jest.fn(),
    getOrderbook: jest.fn(),
    // ... todos los métodos mockeados
  };
}
```

### Patrón de Mock Recomendado
```typescript
import { createMockEngine } from '../test-utils';

describe('MyTest', () => {
  let mockEngine: MockedMarketAnalysisEngine;
  
  beforeEach(() => {
    mockEngine = createMockEngine();
  });
});
```

## 🐛 Problemas Conocidos y Soluciones

### 1. Error: "module is not defined"
**Causa**: Archivos de configuración tratados como ES modules  
**Solución**: Renombrar a `.cjs` extension

### 2. Timer abierto en Jest
**Causa**: CacheManager no limpia su timer  
**Solución**: Llamar `stopCleanupTimer()` en `afterEach`

### 3. Errores de tipos en mocks
**Causa**: TypeScript no reconoce métodos en mocks  
**Solución**: Usar `createMockEngine()` o tipar correctamente

### 4. Imports con extensión .js
**Causa**: Configuración legacy para CommonJS  
**Solución**: Eliminar extensiones `.js` de todos los imports

## 📈 Estado Actual

### ✅ Completado
- Configuración base de Jest con ES modules
- Estructura de directorios de tests
- Test runner avanzado con categorías
- Tests básicos para verificar configuración
- Utilidades para mocking

### 🚧 En Progreso
- Corrección de errores de tipos en tests existentes
- Implementación completa de tests unitarios
- Cobertura de código objetivo: 80%+

### ⏳ Pendiente
- Tests de integración
- Tests E2E con MCP real
- Automatización en CI/CD
- Reportes de cobertura detallados

## 🎯 Mejores Prácticas

1. **Aislamiento**: Cada test debe ser independiente
2. **Mocking**: Usar mocks para dependencias externas
3. **Limpieza**: Siempre limpiar recursos en `afterEach`
4. **Nomenclatura**: Descriptiva y consistente
5. **Cobertura**: Apuntar a 80%+ en código crítico

## 📚 Referencias

- [Jest Documentation](https://jestjs.io/)
- [ts-jest ES Modules](https://kulshekhar.github.io/ts-jest/docs/guides/esm-support)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

*Última actualización: 11/06/2025 - v1.4.0*
