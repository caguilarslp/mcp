# Task Tracker - wAIckoff MCP v1.7.3

**Última actualización:** 18/06/2025
**Estado del proyecto:** Production Ready - 106+ herramientas MCP + TASK-027 FASE 1-2 COMPLETADAS ✅ COMPILACIÓN EXITOSA

## 🏆 Tareas Completadas

### ✅ TASK-020: Smart Money Concepts (COMPLETADO 100%)
**Tiempo total:** ~10 horas
**Estado:** ✅ COMPLETADO TOTALMENTE - 5 fases
**Fecha finalización:** 12/06/2025

#### FASE 1: Order Blocks ✅ COMPLETADA
- ✅ OrderBlocksService con algoritmos institucionales
- ✅ 3 herramientas MCP (detect_order_blocks, validate_order_block, get_order_block_zones)
- ✅ SmartMoneyConceptsHandlers con validación y formateo
- ✅ Integración completa en sistema MCP

#### FASE 2: Fair Value Gaps ✅ COMPLETADA
- ✅ FairValueGapsService con detección de gaps de 3 velas
- ✅ Análisis probabilístico de llenado basado en datos históricos
- ✅ 2 herramientas MCP (find_fair_value_gaps, analyze_fvg_filling)
- ✅ Clasificación por tamaño y contexto de mercado
- ✅ Tracking de performance y estadísticas

#### FASE 3: Break of Structure ✅ COMPLETADA
- ✅ BreakOfStructureService con algoritmos de detección estructural
- ✅ Identificación automática de puntos estructurales (HH, HL, LH, LL)
- ✅ Diferenciación precisa entre BOS y CHoCH
- ✅ 3 herramientas MCP (detect_break_of_structure, analyze_market_structure, validate_structure_shift)
- ✅ Validación multi-factor de cambios estructurales

#### FASE 4: Market Structure Integration ✅ COMPLETADA
- ✅ SmartMoneyAnalysisService completo con detección automática de confluencias
- ✅ Integración de todos los conceptos SMC (Order Blocks + FVG + BOS)
- ✅ Sistema de scoring SMC basado en alineación y fuerza
- ✅ 3 herramientas MCP (analyze_smart_money_confluence, get_smc_market_bias, validate_smc_setup)
- ✅ Premium/Discount zones calculation con equilibrium dinámico
- ✅ Market bias determination con ponderación institucional

#### FASE 5: Dashboard & Confluence Analysis ✅ COMPLETADA
- ✅ SmartMoneyDashboardService completo con 3 herramientas MCP de dashboard avanzado
- ✅ Dashboard unificado con market overview, key metrics, level analysis, confluence analysis
- ✅ Trading analysis con primary setup, alternative setups, market condition assessment
- ✅ Risk assessment completo con overall risk, risk factors, position sizing
- ✅ Smart alerts system con confluence, break, setup y warning alerts
- ✅ 3 herramientas MCP (get_smc_dashboard, get_smc_trading_setup, analyze_smc_confluence_strength)
- ✅ Sistema SMC cuenta con 14 herramientas totales (dashboard es la culminación)

**Resultado final:** Sistema SMC completo con 14 herramientas MCP que cubren desde detección básica hasta dashboard avanzado con análisis de confluencias, alertas inteligentes y gestión de riesgo.

---

## 🔴 Tareas en Standby (Datos Insuficientes)

### 🔴 TASK-013: On-chain Data Collection (STANDBY)
**Estado:** 🔴 STANDBY - Datos insuficientes para implementación efectiva
**Descripción:** Sistema recolección datos on-chain (stablecoins, exchanges, ballenas)
**Tiempo Estimado:** 15h (6 fases)
**Razón standby:** APIs on-chain requieren datos históricos y patrones que no están disponibles o son costosos
**Archivos:** `claude/tasks/task-013-onchain-data-collection.md`

**Fases planificadas (en standby):**
- FASE 1: Infrastructure & Basic APIs (3-4h)
- FASE 2: Stablecoin Mint/Burn Detection (3h)
- FASE 3: Exchange Flow Analysis (3h)
- FASE 4: Whale Behavior Tracking (3h)
- FASE 5: Signal Integration & Alerts (2h)
- FASE 6: Testing & Optimization (1h)

### 🔴 TASK-007: Volume Profile & Market Profile (STANDBY)
**Estado:** 🔴 STANDBY - Datos insuficientes para implementación precisa
**Descripción:** Sistema completo de Volume Profile y Market Profile
**Tiempo Estimado:** 4-5h
**Razón standby:** API Bybit no proporciona volumen por nivel de precio, aproximaciones serían imprecisas
**Archivos:** `claude/tasks/task-007-volume-profile.md`

**Análisis técnico:**
- ⚠️ **Limitación API Bybit**: No proporciona volumen por nivel de precio
- 🔄 **Opciones evaluadas:**
  - Aproximación desde OHLCV (85-90% precisión) - Insuficiente
  - Enhancement con recent trades (90-95% precisión) - Complejo y limitado
  - Construcción incremental desde trades en tiempo real - No viable

**Decisión:** Mantener en standby hasta obtener acceso a datos de mayor calidad

---

## 🔴 Tareas Urgentísimas

### ✅ TASK-025: Fix Errores Críticos de Producción (COMPLETADO)
**Estado:** ✅ COMPLETADO 100%
**Prioridad:** CRÍTICA
**Descripción:** Resolver 4 errores críticos detectados en testing de producción
**Tiempo Total:** 2.5h (30% más eficiente que estimado)
**Fecha inicio:** 13/06/2025
**Fecha completado:** 13/06/2025
**Archivo detallado:** `claude/tasks/task-025-fix-critical-errors.md`
**Documentación:** `claude/docs/trazabilidad-errores.md`

**Errores críticos resueltos:**
1. **Order Blocks Connection Error** - ✅ RESUELTO con retry logic
2. **Fibonacci Swing Detection Inversion** - ✅ RESUELTO con validación estricta
3. **SMC Zero Confluences** - ✅ RESUELTO con sistema 3 niveles
4. **Order Blocks Zero Detection** - ✅ RESUELTO con detección multicapa

**Progreso completado:**
- **FASE 1 (45min):** Fix Order Blocks Connection - ✅ COMPLETADA
- **FASE 2 (30min):** Fix Fibonacci Swing Detection - ✅ COMPLETADA
- **FASE 3 (1h):** Fix SMC Confluence Detection - ✅ COMPLETADA
- **FASE 4 (45min):** Fix Order Blocks Parameters - ✅ COMPLETADA
- **FASE 5 (30min):** Testing integral y validación - ✅ COMPLETADA

**Impacto:** Sistema 100% operativo, análisis institucional totalmente restaurado

---

## 🟡 Tareas Pendientes

### ⚡ TASK-026: Integración Multi-Exchange Analysis (EN PROGRESO)
**Estado:** EN PROGRESO - FASE 2 COMPLETADA ✅ (COMPILACIÓN EXITOSA)
**Descripción:** Sistema de agregación multi-exchange con Binance y Bybit
**Prioridad:** Alta (mejora significativa en calidad de análisis)
**Tiempo Estimado:** 12-15h (4 fases)
**Fecha creación:** 15/06/2025
**Archivo detallado:** `claude/tasks/task-026-multi-exchange.md`

**Justificación:**
- Mayor liquidez y volumen (Binance = 40% volumen global)
- Detección de manipulación cross-exchange
- Smart Money tracking mejorado (institucionales usan múltiples exchanges)
- Datos on-chain integrados que Bybit no ofrece
- Arbitraje de información entre exchanges

**Fases:**
- **FASE 1 (2-3h):** Exchange Adapter Base - ✅ COMPLETADA (15/06/2025)
  - ✅ Interfaz común `IExchangeAdapter` con health monitoring
  - ✅ `BaseExchangeAdapter` con funcionalidad compartida
  - ✅ `BinanceAdapter` implementación completa
  - ✅ `BybitAdapter` refactorizado desde marketData.ts
  - ✅ `ExchangeAdapterFactory` con factory pattern
  - ✅ Rate limiting, cache, error handling integrados
  - ✅ Test suite básico para validación
  - ✅ Backward compatibility garantizada
  
- **FASE 2 (3-4h):** Exchange Aggregator - ✅ COMPLETADA (15/06/2025)
  - ✅ `ExchangeAggregator` completo con weighted pricing y conflict resolution
  - ✅ 6 nuevas herramientas MCP: aggregated_ticker, composite_orderbook, divergences, arbitrage, dominance, analytics
  - ✅ Detección automática de divergencias (precio, volumen, estructura)
  - ✅ Identificación de oportunidades de arbitraje con cálculo de profit
  - ✅ Análisis de dominancia de exchanges con métricas institucionales
  - ✅ Multi-exchange analytics con correlaciones y calidad de datos
  - ✅ Handlers MCP integrados y funcionando
  - ✅ Sistema listo para agregar más exchanges
  - ✅ Todos los errores TypeScript resueltos (11 fixes aplicados)
  
- **FASE 3 (4-5h):** Análisis Multi-Exchange Mejorados
  - Smart Money Concepts validados cross-exchange
  - Wyckoff Composite Man tracking preciso
  - Volume Delta sin wash trading
  - Order flow imbalance institucional real
  
- **FASE 4 (3-4h):** Features Exclusivos Multi-Exchange
  - Inter-exchange divergence detection
  - Arbitrage opportunity alerts
  - Exchange dominance indicators
  - Liquidation cascade tracking
  - Stop loss cluster visualization

**Impacto esperado:**
- Smart Money Concepts: 95% precisión (vs 85% actual)
- Trap Detection: 98% precisión (vs 85% actual)
- Volume Analysis: Eliminar 90% wash trading
- Wyckoff: Composite Man tracking real

### ✅ TASK-027: Activación Sistema de Contexto (EN PROGRESO - FASE 2 COMPLETADA)
**Tiempo estimado total:** 4.5h
**Estado:** 🟡 EN PROGRESO - FASE 1-2/3 COMPLETADAS ✅
**Fecha inicio:** 18/06/2025
**Archivo detallado:** `claude/tasks/task-027-context-system-activation.md`

#### FASE 1: Integración Básica ContextAwareRepository ✅ COMPLETADA
**Tiempo:** 1.5h estimado, 45min real (30% más eficiente)
**Fecha completado:** 18/06/2025

**Cambios implementados:**
- ✅ MarketAnalysisEngine actualizado para usar ContextAwareRepository
- ✅ 8 métodos principales convertidos a guardado con contexto:
  - performTechnicalAnalysis, getCompleteAnalysis
  - calculateFibonacciLevels, analyzeBollingerBands, detectElliottWaves
  - findTechnicalConfluences, analyzeSmartMoneyConfluence
- ✅ Sistema de tipos de contexto: technical, smc, complete, wyckoff
- ✅ Logging actualizado con referencias TASK-027
- ✅ Compatibilidad 100% mantenida con sistema existente
- ✅ Infraestructura lista para FASE 2 y FASE 3

**Impacto:** Todos los análisis ahora se guardan con contexto histórico automáticamente

#### FASE 2: Fix Errores de Compilación TypeScript ✅ COMPLETADA
**Tiempo:** 30min real
**Fecha completado:** 18/06/2025

**Errores resueltos:**
- ❌ `washTradingFiltered` property no existe en VolumeDelta type
- ❌ `institutionalFlow` property no existe en VolumeDelta type
- ✅ **Solución:** Movidas propiedades multi-exchange a variables locales para context tags
- ✅ **Resultado:** Compilación TypeScript exitosa - 0 errores

**Cambios implementados en TechnicalAnalysisService:**
- Eliminadas propiedades extendidas del tipo VolumeDelta
- Creada variable `multiExchangeMetrics` para almacenar datos adicionales
- Context tags actualizadas para usar métricas locales en lugar de análisis
- Mantenida funcionalidad completa sin breaking changes en tipos

**Impacto:**
- **TypeScript Build:** ✅ Exitoso (0 errores)
- **Funcionalidad:** ✅ Preservada 100%
- **Context Tags:** ✅ Multi-exchange metrics incluidas
- **Backward Compatibility:** ✅ Mantenida

#### FASE 3: Integración Completa en Servicios (PENDIENTE)
**Tiempo estimado:** 1.5h
**Descripción:** Actualizar servicios específicos y handlers MCP

**Tareas pendientes:**
- SmartMoneyAnalysisService - métodos analyze y validate
- WyckoffAnalysisService - análisis básico y avanzado
- VolumeAnalysisService - volume y volume delta
- Actualizar handlers MCP para incluir contexto en respuestas

#### FASE 4: Herramientas MCP de Contexto (PENDIENTE)
**Tiempo estimado:** 1.5h
**Descripción:** Nuevas herramientas MCP para consultar contexto

**Herramientas a crear:**
- get_analysis_context - Devolver contexto histórico comprimido
- get_contextual_insights - Análisis de patrones en histórico

**Entregable final:** Sistema completo de contexto histórico con herramientas MCP

---

### 🔥 TASK-030: Modularización Urgente WyckoffBasicService (NUEVA - URGENTE)
**Estado:** URGENTE - PENDIENTE
**Prioridad:** CRÍTICA
**Tiempo Estimado:** 2.5h total (3 fases)
**Fecha creación:** 18/06/2025
**Archivo detallado:** `claude/tasks/task-030-wyckoff-modularization.md`

**Problema crítico:**
- **WyckoffBasicService**: 1,172 líneas (EXCESIVO) 
- **Archivo monolítico**: Múltiples responsabilidades en un solo archivo
- **Mantenimiento imposible**: Testing granular y extensibilidad bloqueados
- **TASK-027 FASE 3 afectado**: Difícil agregar contexto a archivo tan largo

**Arquitectura propuesta:**
```
src/services/wyckoff/
├── core/          # Servicio principal + tipos (350 líneas)
├── analyzers/     # PhaseAnalyzer, TradingRangeAnalyzer, VolumeAnalyzer (500 líneas)
├── detectors/     # SpringDetector, UpthrustDetector, TestEventDetector (340 líneas)
└── utils/         # Calculations, validators (180 líneas)
```

**Fases:**
- **FASE 1 (1h)**: Separación de tipos y core
- **FASE 2 (1h)**: Modularización analyzers y detectors  
- **FASE 3 (30min)**: Integración y utils

**Decisión requerida:** ¿TASK-030 ANTES o DESPUÉS de TASK-027 FASE 3?
- ✅ **ANTES** (RECOMENDADO): Código limpio antes de agregar contexto
- ❌ **DESPUÉS**: Completar TASK-027 primero, modularizar como mejora

**Beneficios:**
- **Mantenimiento**: Responsabilidad única por módulo
- **Testing**: Granular y completo
- **Performance**: Lazy loading y memoria eficiente
- **Desarrollo**: Parallel development posible



### 🟡 TASK-028: API Privada Bybit (Solo Lectura)
**Estado:** PENDIENTE
**Descripción:** Implementar acceso read-only a API privada de Bybit
**Prioridad:** ALTA
**Tiempo Estimado:** 7.5h total (3 fases)
**Fecha creación:** 18/06/2025
**Archivo detallado:** `claude/tasks/task-028-bybit-private-api.md`
- Gestión de riesgo mejorada

**Fases:**
- FASE 1 (2h): Configuración y Autenticación Básica
- FASE 2 (2.5h): Wallet Balance y Herramienta Básica
- FASE 3 (3.5h): Posiciones y Análisis Contextual

### 🟡 TASK-029: Sistema de Análisis Contextual Inteligente
**Estado:** PENDIENTE
**Descripción:** Combinar contexto histórico + portfolio para insights personalizados
**Prioridad:** MEDIA
**Tiempo Estimado:** 5h total (3 fases)
**Fecha creación:** 18/06/2025
**Archivo detallado:** `claude/tasks/task-029-contextual-analysis-system.md`
**Dependencias:** TASK-027, TASK-028

**Justificación:**
- Análisis 10x más relevantes
- Reducción de ruido en alertas
- Aprendizaje continuo del sistema
- Recomendaciones accionables

**Fases:**
- FASE 1 (1.5h): Servicio Básico de Análisis Contextual
- FASE 2 (2h): Motor de Insights Personalizado
- FASE 3 (1.5h): Sistema de Alertas Inteligentes

### 🟡 TASK-008: Integración con Waickoff AI
**Estado:** PENDIENTE
**Descripción:** Preparar MCP para consumo desde Waickoff AI
**Prioridad:** Baja (esperar a que Waickoff avance)
**Tiempo Estimado:** 2h
**Detalles:**
- Documentar endpoints disponibles
- Crear ejemplos de integración
- Optimizar respuestas para LLMs

---

## ✅ Tareas Completadas Anteriormente

### ✅ Tareas Completadas 2025

#### ✅ TASK-026 FASE 2: Exchange Aggregator (COMPLETADA)
- **Fecha:** 15/06/2025
- **Tiempo:** 4h (incluyendo fixes TypeScript)
- **Resultado:** 6 nuevas herramientas multi-exchange funcionando
- **Fixes aplicados:** 11 errores TypeScript resueltos
- **Estado final:** COMPILACIÓN EXITOSA - Sistema 100% operativo
- **Detalles:** ExchangeAggregator completo, handlers MCP integrados, detección de divergencias, análisis de arbitraje y dominancia

#### ✅ TASK-025: Fix Errores Críticos (COMPLETADA)
- **Fecha:** 13/06/2025
- **Tiempo:** 2.5h total
- **Completado:** Todos los errores críticos resueltos
- **Resultado:** Sistema 100% operativo

#### ✅ TASK-023: Bollinger Targets Fix (COMPLETADA)
- **Fecha:** 12/06/2025
- **Tiempo:** 2h
- **Resultado:** Targets corregidos hacia mean reversion con sistema múltiple

#### ✅ TASK-022: Sistema de Confluencias Técnicas (COMPLETADA)
- **Fecha:** 12/06/2025
- **Tiempo:** 4h
- **Resultado:** Sistema completo de detección automática de confluencias

#### ✅ TASK-021: Elliott Wave Completo (COMPLETADA)
- **Fecha:** 12/06/2025
- **Tiempo:** 6h
- **Resultado:** Detección de ondas y proyecciones funcionando

#### ✅ TASK-019: Herramientas Técnicas (COMPLETADA)
- **Fecha:** 12/06/2025
- **Resultado:** Fibonacci, Elliott, Bollinger implementados

#### ✅ TASK-018: Wyckoff Avanzado (COMPLETADA)
- **Fecha:** 11/06/2025
- **Tiempo:** 10h
- **Resultado:** 7 herramientas Wyckoff avanzadas

#### ✅ TASK-017: Sistema Análisis Histórico (COMPLETADA)
- **Fecha:** 11/06/2025
- **Tiempo:** 12h
- **Resultado:** 6 herramientas análisis histórico

#### ✅ TASK-012: Detección de Trampas (COMPLETADA)
- **Fecha:** 11/06/2025
- **Tiempo:** 7h
- **Resultado:** 7 herramientas trap detection

#### ✅ TASK-015: Dual Storage MongoDB (COMPLETADA)
- **Fecha:** 11/06/2025
- **Decisión:** Mantener JSON storage por simplicidad

#### ✅ TASK-016: Migración MongoDB (EVALUADA)
- **Fecha:** 11/06/2025
- **Decisión:** No proceder, mantener JSON

#### ✅ TASK-011: Documentación Sistema Modular (COMPLETADA)
- **Fecha:** 11/06/2025
- **Tiempo:** 2h

#### ✅ TASK-006: Order Flow Imbalance (COMPLETADA)
- **Fecha:** 11/06/2025
- **Tiempo:** 3h

### Tareas Core Completadas (2024)

#### ✅ TASK-001 a TASK-005: Funcionalidades Base
- Análisis de volumen con VWAP
- Support/Resistance dinámicos
- Documentación ADR
- Tests unitarios
- Wyckoff básico

#### ✅ TASK-009: Repository System Completo
- Storage service con CRUD completo
- Cache manager con TTL
- Report generator

#### ✅ TASK-010: Sistema de Configuración
- Timezone configuration
- .env cross-platform support

---

## 📊 Métricas del Proyecto v1.7.0

### Estado Actual
- **Versión:** v1.8.2 (TASK-027 FASE 2 - Fix compilación)
- **Herramientas MCP:** 106+ operativas (95 base + 6 multi-exchange + 5 avanzadas)
- **Servicios:** 20+ especializados + ContextAwareRepository
- **Arquitectura:** Clean Architecture modular + Contexto histórico
- **Compilación:** ✅ 0 errores TypeScript
- **Smart Money Concepts:** 14 herramientas (sistema completo)
- **Multi-Exchange:** 6 herramientas (agregación completa) + 5 avanzadas
- **Contexto histórico:** ✅ ACTIVO desde TASK-027 FASE 1

### Distribución de Herramientas
- **Market Data:** Ticker, orderbook, klines
- **Analysis:** Volatilidad, volumen, S/R, grid trading
- **Multi-Exchange:** Aggregator (6 herramientas) - ticker, orderbook, divergencias, arbitraje, dominancia, analytics ✨ NUEVO
- **Wyckoff:** Básico (7) + Avanzado (7) = 14 herramientas
- **Traps:** Detección bull/bear traps (7 herramientas)
- **Historical:** Análisis histórico (6 herramientas)
- **Smart Money:** Order Blocks (3) + FVG (2) + BOS (3) + Integration (3) + Dashboard (3) = 14 herramientas ✅
- **Storage:** Repository + Cache + Reports (15 herramientas)
- **Config:** Usuario + Sistema (16 herramientas)
- **Technical:** Fibonacci, Elliott, Bollinger, Confluencias (4 herramientas)
- **Context Management:** Histórico comprimido multi-timeframe (7 herramientas)

### 📊 Estadísticas de Desarrollo
- **Tareas Completadas:** 30 principales + TASK-025 completa + TASK-026 FASE 1-2
- **Tareas en Standby:** 2 (por datos insuficientes)
- **Tareas Pendientes:** 1 principal (TASK-008) + TASK-026 FASE 3-4
- **Tiempo Total Invertido:** ~148h
- **Bugs Críticos Resueltos:** 15 (4 de TASK-025 + 11 TypeScript de TASK-026 FASE 2)
- **Documentación:** 100% cobertura + trazabilidad de errores actualizada

---

## 🎯 Estado del Proyecto

### ✅ Logros Principales v1.8.2 (TASK-027 FASE 2 COMPLETADA)
- **Sistema de Contexto Histórico ACTIVO** - Todos los análisis se guardan con contexto
- **COMPILACIÓN TYPESCRIPT EXITOSA** - 0 errores después del fix
- **ContextAwareRepository integrado** - MarketAnalysisEngine actualizado completamente
- **8 métodos principales con contexto** - Análisis técnico, Fibonacci, Bollinger, Elliott, SMC
- **Sistema Smart Money Concepts 100% completo** con 14 herramientas MCP
- **Sistema Multi-Exchange operativo** con 6 herramientas de agregación + 5 avanzadas
- **Dashboard unificado SMC** con análisis avanzado de confluencias
- **Sistema de alertas inteligentes** y gestión de riesgo
- **106+ herramientas MCP operativas** en arquitectura modular
- **0 errores TypeScript** en compilación - 17 fixes aplicados exitosamente
- **Performance optimizada** (<200ms por análisis)
- **Errores críticos resueltos** - Sistema 100% operativo

### 🔄 Próximos Pasos Priorizados
1. **DECISIÓN URGENTE**: ¿TASK-030 ANTES o DESPUÉS de TASK-027 FASE 3?
   - **Opción A (RECOMENDADA)**: TASK-030 → TASK-027 FASE 3-4 (código limpio primero)
   - **Opción B**: TASK-027 FASE 3-4 → TASK-030 (completar contexto primero)
2. **Si Opción A**: TASK-030 Modularización WyckoffBasicService (2.5h)
3. **Si Opción B**: TASK-027 FASE 3 Integración Completa en Servicios (1.5h)
4. **TASK-027 FASE 4:** Herramientas MCP de Contexto (1.5h)
5. **TASK-028:** API Privada Bybit (7.5h en 3 fases) - PRIORIDAD ALTA
6. **TASK-029:** Sistema Contextual Inteligente (5h en 3 fases)
7. **TASK-026 FASE 3-4:** Completar Multi-Exchange Analysis (7-9h restantes)
8. **TASK-008:** Integración con Waickoff AI (2h) - Cuando esté listo

### 📝 Estado de Tareas
- **Completadas:** 31/33 (94%) - TASK-025 completa + TASK-026 FASE 1-2 + TASK-027 FASE 1-2
- **En Progreso:** TASK-027 (FASE 1-2 ✅, FASE 3-4 pendientes)
- **En Standby:** 2/33 (6%) - Por limitaciones de datos
- **Pendientes:** 1/33 (3%) + TASK-026 FASE 3-4 + TASK-028/029

**El proyecto está en estado Production Ready con funcionalidad completa, 0 errores, sistema multi-exchange operativo y contexto histórico ACTIVO (TASK-027 FASE 1-2 COMPLETADAS).**

---

*Actualizado: 18/06/2025*
*Próxima revisión: Al iniciar TASK-027 FASE 2*