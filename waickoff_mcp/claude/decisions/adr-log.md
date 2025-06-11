# 📐 Architecture Decision Records - Bybit MCP v1.3.4

## 🎯 Log de Decisiones Arquitectónicas

Este documento registra las decisiones técnicas importantes tomadas durante el desarrollo del MCP.

---

## 📋 Índice de ADRs

1. [ADR-001: TypeScript como lenguaje principal](#adr-001)
2. [ADR-002: No requerir API Keys en v1.x](#adr-002)
3. [ADR-003: Volume Delta aproximado sin trades reales](#adr-003)
4. [ADR-004: Separación MCP datos vs trading](#adr-004)
5. [ADR-005: Integración con Claude Desktop](#adr-005)
6. [ADR-006: Algoritmo Support/Resistance con scoring multi-factor](#adr-006)
7. [ADR-007: Arquitectura modular con dependency injection](#adr-007)
8. [ADR-008: Sistema de logging minimalista production-ready](#adr-008)
9. [ADR-009: Separación MCP vs FastAPI para análisis avanzado](#adr-009)
10. [ADR-010: Dual Storage Pattern (MongoDB Experimental)](#adr-010)

---

## ADR-001: TypeScript como Lenguaje Principal {#adr-001}

**Fecha:** 07/06/2025
**Estado:** Aceptado

### Contexto
Necesitábamos elegir un lenguaje para desarrollar el MCP Server compatible con el protocolo de Anthropic.

### Decisión
Usar TypeScript como lenguaje principal del proyecto.

### Consecuencias
**Positivas:**
- Type safety previene errores en runtime
- Mejor integración con @modelcontextprotocol/sdk
- IntelliSense mejora la productividad
- Fácil refactoring

**Negativas:**
- Requiere paso de compilación
- Setup inicial más complejo

**Resultado:** ✅ Excelente decisión, ha prevenido múltiples errores

---

## ADR-002: No Requerir API Keys en v1.x {#adr-002}

**Fecha:** 07/06/2025
**Estado:** Aceptado

### Contexto
Los usuarios quieren empezar a usar el MCP inmediatamente sin configuración compleja.

### Decisión
Usar únicamente endpoints públicos de Bybit que no requieren autenticación.

### Consecuencias
**Positivas:**
- Uso inmediato sin configuración
- No hay riesgo de seguridad con API keys
- Más fácil de compartir y distribuir
- Ideal para análisis y paper trading

**Negativas:**
- Sin acceso a datos de cuenta personal
- Sin trading real automatizado
- Sin funding rates o liquidaciones

**Resultado:** ✅ Permite adopción rápida, API keys se añadirán en v2.0

---

## ADR-003: Volume Delta Aproximado sin Trades Reales {#adr-003}

**Fecha:** 08/06/2025
**Estado:** Aceptado

### Contexto
Volume Delta tradicional requiere analizar cada trade individual (compra/venta), pero esto necesita API key.

### Decisión
Aproximar Volume Delta usando la posición del precio de cierre dentro del rango de la vela.

### Implementación
```typescript
const range = high - low;
const closePosition = range > 0 ? (close - low) / range : 0.5;
const buyVolume = volume * closePosition;
const sellVolume = volume * (1 - closePosition);
```

### Consecuencias
**Positivas:**
- Funciona sin API key
- Suficientemente preciso para detectar tendencias
- Detecta divergencias correctamente
- Cálculo rápido y eficiente

**Negativas:**
- No es 100% preciso
- Puede fallar en velas con mucho rango

**Resultado:** ✅ Sorprendentemente efectivo, detecta divergencias reales

---

## ADR-004: Separación MCP Datos vs Trading {#adr-004}

**Fecha:** 08/06/2025
**Estado:** Aceptado

### Contexto
Tentación de agregar funciones de trading al MCP de datos.

### Decisión
Mantener este MCP enfocado únicamente en obtención y análisis de datos. Crear MCP separado para ejecución de trades.

### Arquitectura
```
waickoff_mcp (este)     → Solo datos y análisis
trading-executor-mcp → Ejecución de órdenes (futuro)
portfolio-mcp        → Gestión de portfolio (futuro)
```

### Consecuencias
**Positivas:**
- Separación clara de responsabilidades
- Más seguro (datos no pueden ejecutar trades)
- Reutilizable en múltiples proyectos
- Fácil de mantener y extender

**Negativas:**
- Requiere múltiples MCPs para trading completo
- Más complejidad de configuración

**Resultado:** ✅ Arquitectura limpia y modular

---

## ADR-005: Integración con Claude Desktop {#adr-005}

**Fecha:** 08/06/2025
**Estado:** Aceptado

### Contexto
Los usuarios necesitan ejecutar el MCP manualmente cada vez.

### Decisión
Documentar configuración para Claude Desktop que auto-carga el MCP.

### Implementación
```json
{
  "mcpServers": {
    "waickoff_mcp": {
      "command": "node",
      "args": ["D:\\projects\\mcp\\waickoff_mcp\\build\\index.js"],
      "env": {}
    }
  }
}
```

### Consecuencias
**Positivas:**
- MCP se carga automáticamente
- Mejor experiencia de usuario
- No requiere terminal abierta

**Negativas:**
- Requiere configuración inicial
- Path absoluto puede variar entre sistemas

**Resultado:** ✅ Mejora significativa en UX

---

## 📝 Template para Nuevos ADRs

```markdown
## ADR-XXX: [Título]

**Fecha:** DD/MM/YYYY
**Estado:** Propuesto/Aceptado/Rechazado/Obsoleto

### Contexto
[¿Qué problema estamos tratando de resolver?]

### Decisión
[¿Qué decisión tomamos?]

### Consecuencias
**Positivas:**
- [Beneficio 1]
- [Beneficio 2]

**Negativas:**
- [Desventaja 1]
- [Desventaja 2]

**Resultado:** [Evaluación posterior]
```

---

## ADR-006: Algoritmo Support/Resistance con Scoring Multi-factor {#adr-006}

**Fecha:** 08/06/2025
**Estado:** Aceptado

### Contexto
Los niveles de soporte y resistencia simples basados solo en toques no eran suficientemente precisos para grid trading efectivo.

### Decisión
Implementar algoritmo multi-factor que combina 4 variables con pesos optimizados:

```typescript
// Scoring multi-factor
touch_score = Math.min(touches * 25, 50);      // Máx 50 puntos
volume_score = Math.min(volume_ratio * 30, 30); // Máx 30 puntos  
proximity_score = (1 - distance_ratio) * 15;   // Máx 15 puntos
age_score = Math.max(5 - age_days, 0);         // Máx 5 puntos
total_strength = touch_score + volume_score + proximity_score + age_score;
```

### Consecuencias
**Positivas:**
- Niveles mucho más precisos y confiables
- Excelente para configuración automática de grids
- Identifica correctamente niveles críticos
- Funciona bien en diferentes timeframes

**Negativas:**
- Más complejo de calcular
- Requiere afinación de pesos

**Resultado:** ✅ Mejora dramática en precisión de S/R, validado con múltiples pares

---

## ADR-007: Arquitectura Modular con Dependency Injection {#adr-007}

**Fecha:** 08/06/2025  
**Estado:** Aceptado

### Contexto
El código monolítico en un solo archivo se volvió imposible de mantener y testear.

### Decisión
Refactorización completa a arquitectura modular con 4 capas y dependency injection:

```
Presentation Layer (Adapters):
- MCP Adapter, REST API (futuro), WebSocket (futuro)

Core Layer (Business Logic):
- MarketAnalysisEngine (protocol-agnostic)

Service Layer (Specialized Services):  
- MarketDataService, AnalysisService, TradingService

Utility Layer (Common Tools):
- Logger, PerformanceMonitor, MathUtils
```

### Consecuencias
**Positivas:**
- 100% testeable (cada servicio mockeable)
- Reutilizable desde cualquier protocolo
- Fácil agregar nuevas funcionalidades
- Separación clara de responsabilidades
- Preparado para Waickoff AI integration

**Negativas:**
- Mayor complejidad inicial
- Más archivos para mantener

**Resultado:** ✅ Transformación exitosa, de 1 archivo a 15+ módulos especializados

---

## ADR-008: Sistema de Logging Minimalista Production-Ready {#adr-008}

**Fecha:** 08/06/2025
**Estado:** Aceptado

### Contexto
Errores JSON molestos aparecían en Claude Desktop causando mala experiencia de usuario.

### Decisión
Implementar sistema de logging minimalista que elimina objetos complejos:

```typescript
// Solo strings y números básicos
const apiStats = {
  totalRequests: number,
  successfulRequests: number, 
  errorCount: number,
  successRate: string,
  lastErrors: string[] // Solo mensajes, no objetos
};
```

### Consecuencias
**Positivas:**
- Claude Desktop 100% limpio sin errores JSON
- Sistema estable para producción
- Debugging efectivo con herramientas integradas
- Performance optimizado sin overhead

**Negativas:**
- Menos detalle en logs complejos
- Requirió rediseño de sistema de logging

**Resultado:** ✅ Problema completamente resuelto, UX perfecta

---

## ADR-009: Separación MCP vs FastAPI para Análisis Avanzado {#adr-009}

**Fecha:** 10/06/2025
**Estado:** Aceptado

### Contexto
Necesitamos funcionalidades avanzadas como:
- Detección de trampas alcistas/bajistas
- Minteos de stablecoins y movimientos on-chain
- Movimientos de ballenas y exchanges
- Análisis fundamental (Fed, empleos, tasas)
- Machine learning y correlaciones macro

### Decisión
Implementar **arquitectura híbrida** dividiendo responsabilidades:

```
MCP wAIckoff:
✓ Trading data + signals (trampas, on-chain básico)
✓ Node.js/TypeScript (velocidad, real-time)
✓ 7h traps + 15h on-chain data

FastAPI wAIckoff:
✓ Análisis macro + ML (Fed, ML models)
✓ Python (ecosystem ML, stats)
✓ 77h desarrollo completo
```

### Arquitectura de Integración
```typescript
// Data flow
MCP → FastAPI: Real-time trading data + on-chain events
FastAPI → MCP: Macro context + ML predictions + correlations
Claude AI: Synthesis de ambas fuentes para decisiones
```

### Funcionalidades por Sistema

#### **MCP wAIckoff (TASK-012, TASK-013)**
- ✅ **Trampas alcistas/bajistas**: Volumen + orderbook + volume delta analysis
- ✅ **On-chain data collection**: Minteos USDT/USDC, exchange flows, whale movements
- ✅ **Historical data**: Desde genesis para pattern matching
- ✅ **Real-time signals**: Alertas tempranas <5 min

#### **FastAPI wAIckoff (Futuro)**
- ✅ **Federal Reserve**: Tasas, FOMC, correlaciones crypto
- ✅ **Employment data**: NFP, unemployment vs crypto impact
- ✅ **ML predictions**: Whale behavior, stablecoin deployment timing
- ✅ **Cross-asset correlations**: DXY, SPY, bonds vs crypto

### Consecuencias
**Positivas:**
- **Especialización**: Cada sistema hace lo que mejor sabe
- **Escalabilidad independiente**: MCP para speed, FastAPI para complexity
- **Technology optimization**: Node.js para I/O, Python para ML
- **Fault tolerance**: Sistemas independientes
- **Desarrollo paralelo**: Puedo continuar MCP mientras planifica FastAPI

**Negativas:**
- **Complejidad de integración**: Dos sistemas comunicando
- **Overhead de comunicación**: Latencia entre sistemas
- **Deployment complexity**: Dos servicios para mantener

### Cronograma
```
Inmediato (esta semana):
- TASK-009 FASE 3 (Analysis Repository)
- Planificación TASK-012 (trap detection)

Próximas 2 semanas:
- TASK-012: Trampas alcistas/bajistas (7h)
- TASK-013: On-chain data collection (15h)

Próximos 2-3 meses:
- FastAPI development (77h)
- Integration bidirectional
- Testing end-to-end
```

**Resultado:** ✅ Estrategia híbrida óptima - aprovecha fortalezas de cada tecnología

---

## ADR-010: Dual Storage Pattern (MongoDB Experimental) {#adr-010}

**Fecha:** 11/06/2025
**Estado:** Propuesto

### Contexto
El sistema actual de storage con archivos JSON funciona perfectamente pero puede tener limitaciones con datasets grandes y queries complejas. Necesitamos evaluar si MongoDB ofrece beneficios sustanciales sin agregar complejidad innecesaria.

### Decisión
Implementar **dual storage pattern experimental** (TASK-015) para evaluar MongoDB sin romper el sistema actual:

```typescript
[Application] → [HybridStorageService] → [FileStorageService + MongoStorageService]
                                      ↓
                                 Route by data type
```

### Implementación
```typescript
// Routing inteligente por tipo de datos
class HybridStorageService implements IStorageService {
  async save(path: string, data: any): Promise<void> {
    if (this.shouldUseMongo(path, data)) {
      return this.mongoStorage.save(path, data);
    }
    return this.fileStorage.save(path, data);
  }
  
  private shouldUseMongo(path: string, data: any): boolean {
    // Large datasets o analysis data → MongoDB
    // Config y archivos pequeños → JSON files
    return path.includes('analysis/') || this.isLargeDataset(data);
  }
}
```

### Criterios de Éxito (TASK-015)
- **Performance**: MongoDB >30% más rápido en operaciones grandes
- **Setup simplicity**: Environment setup <30 minutos
- **Reliability**: <1% error rate adicional
- **Developer Experience**: APIs igual de fáciles de usar

### Criterios para Migración Completa (TASK-016)
**SOLO activar si TASK-015 demuestra beneficios claros:**
- ✅ Performance >30% mejor en queries complejas
- ✅ Setup y maintenance no significativamente más complejo
- ✅ Nuevas capacidades justifican el overhead

### Consecuencias
**Positivas:**
- **Risk-free evaluation**: Experimentar sin romper sistema actual
- **Data-driven decision**: Benchmarks reales vs teoría
- **Future-ready**: Si MongoDB vale la pena, tenemos el camino
- **Advanced capabilities**: Agregaciones y analytics no posibles con JSON

**Negativas:**
- **Development overhead**: Tiempo para experiment (6h)
- **Complexity assessment**: Evaluar si vale la pena el setup adicional
- **Potential over-engineering**: Sistema actual puede ser suficiente

### Cronograma de Evaluación
```
TASK-015 (Experimental): 4-6h
→ MongoStorageService + HybridStorageService
→ Performance benchmarks
→ A/B testing con datasets reales
→ Decisión go/no-go para TASK-016

TASK-016 (Migración): 8-12h (CONDICIONAL)
→ Solo si TASK-015 muestra beneficios >30%
→ Migración completa + advanced features
→ Production deployment strategy
```

**Resultado:** Pendiente - evaluación experimental en progreso

---

*Los ADRs se agregan cuando se toman decisiones arquitectónicas significativas*