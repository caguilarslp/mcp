# 🧪 Tests - wAIckoff MCP

## Quick Start

```bash
# Instalar dependencias
npm install

# Ejecutar test simple para verificar configuración
npm test tests/setup.test.ts

# Ejecutar tests críticos
npm run test:critical

# Ejecutar todos los tests
npm run test:task-004
```

## Estado Actual

- ✅ **Configuración funcional** - Jest con ES modules configurado
- ✅ **Test básico pasa** - `setup.test.ts` confirma que la configuración funciona
- 🚧 **Tests unitarios en desarrollo** - Mayoría con errores de tipos en mocks
- 📋 **10 test suites, 33+ test cases** - Cobertura completa del sistema modular

## Problemas Conocidos

1. **Errores de tipos en mocks**
   - Solución: Usar `createMockEngine()` de `test-utils.ts`

2. **Timer abierto en CacheManager**
   - Solución: Ya implementada con `stopCleanupTimer()`

3. **Imports con .js**
   - Solución: Ya corregida, todos los imports sin extensión

## Estructura

```
tests/
├── core/              # Tests del motor principal
├── adapters/          # Tests de adaptadores MCP
├── services/          # Tests de servicios
├── test-utils.ts      # Utilidades compartidas
└── setup.test.ts      # Test de verificación
```

## Scripts Disponibles

- `npm test` - Ejecutar tests específicos
- `npm run test:task-004` - Ejecutar todos los tests
- `npm run test:critical` - Solo tests críticos
- `npm run test:coverage` - Con reporte de cobertura
- `npm run test:list` - Listar categorías disponibles

---

Para más detalles, ver [documentación completa](claude/docs/testing/test-documentation.md)
