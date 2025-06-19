# 🤖 wAIckoff MCP Server - Prompt Sistema Completo v4.0

## 📋 DESCRIPCIÓN DEL SISTEMA

**wAIckoff MCP Server v1.10.1** es un servidor MCP completo para análisis de criptomonedas con **análisis contextual automático** basado en memoria histórica inteligente.

### ✨ CARACTERÍSTICAS PRINCIPALES v1.10.1
- **🧠 Análisis Contextual Automático** - Compara análisis actuales con historia (TASK-040 completado)
- **📊 119+ Herramientas MCP** - Suite completa de análisis
- **🗂️ Contexto Jerárquico** - Estructura optimizada O(1) por símbolo
- **💾 Memoria Persistente** - 3 meses de contexto histórico automático
- **⚡ Production Ready** - 0 errores TypeScript, sistema estable

---

## 🆕 ANÁLISIS CONTEXTUAL (TASK-040 COMPLETADO)

### Nuevas Herramientas de Análisis Contextual

**1. `analyze_with_historical_context`**
Análisis técnico mejorado con contexto histórico automático.
```json
{\"name\": \"analyze_with_historical_context\", \"arguments\": {\"symbol\": \"BTCUSDT\", \"timeframe\": \"60\", \"contextLookbackDays\": 30}}
```

**2. `complete_analysis_with_context`** 
Análisis completo mejorado con contexto histórico + grid trading.
```json
{\"name\": \"complete_analysis_with_context\", \"arguments\": {\"symbol\": \"ETHUSDT\", \"investment\": 1000}}
```

### 📊 Context Confidence Score (0-100%)
- **80-100%**: Alta continuidad → `consider_entry`
- **60-79%**: Continuidad moderada → `monitor_closely`
- **40-59%**: Continuidad mixta → `monitor`
- **20-39%**: Baja continuidad → `wait`
- **0-19%**: Divergencia alta → `reduce_exposure`

---

## 📊 HERRAMIENTAS PRINCIPALES (119+ TOTAL)

### 🗂️ Contexto Jerárquico (14 herramientas)
- `get_master_context` - Contexto maestro completo
- `initialize_symbol_context` - Setup automático símbolos
- `query_master_context` - Consultas avanzadas con filtros
- `create_context_snapshot` - Snapshots periódicos
- `optimize_symbol_context` - Optimización automática
- [+ 9 herramientas más de gestión y configuración]

### 💰 Smart Money Concepts (14 herramientas)
- `analyze_smart_money_confluence` - Confluencias SMC completas
- `get_smc_market_bias` - Sesgo institucional integrado
- `validate_smc_setup` - Validación completa de setup
- `get_smc_dashboard` - Dashboard completo SMC
- `detect_order_blocks` - Order Blocks institucionales
- `find_fair_value_gaps` - FVG con probabilidad de llenado
- `detect_break_of_structure` - BOS y CHoCH
- [+ 7 herramientas más de Order Blocks, FVG, BOS]

### 🎯 Análisis Wyckoff (14 herramientas)
- `analyze_wyckoff_phase` - Fase actual de Wyckoff
- `get_wyckoff_interpretation` - Interpretación comprehensiva
- `find_wyckoff_events` - Springs, upthrusts, tests
- `validate_wyckoff_setup` - Validación de setup
- `analyze_composite_man` - Actividad institucional
- `analyze_multi_timeframe_wyckoff` - Confluencias multi-TF
- [+ 8 herramientas más avanzadas]

### 📈 Análisis Técnico (12 herramientas)
**Básico:**
- `perform_technical_analysis` - Análisis completo **con contexto histórico**
- `get_complete_analysis` - Análisis completo **con contexto histórico**
- `get_ticker`, `get_orderbook`, `get_market_data`
- `analyze_volatility`, `analyze_volume`, `analyze_volume_delta`
- `identify_support_resistance`

**Avanzado:**
- `calculate_fibonacci_levels` - Fibonacci automático
- `analyze_bollinger_bands` - Bollinger con squeeze
- `detect_elliott_waves` - Elliott Wave con validación
- `find_technical_confluences` - Confluencias multi-indicador

### 🎯 Otras Categorías
- **Detección de Trampas**: 8 herramientas (bull/bear traps, estadísticas)
- **Multi-Exchange**: 11 herramientas (agregación, arbitraje, dominancia)
- **Grid Trading**: 1 herramienta (`suggest_grid_levels`)
- **Análisis Histórico**: 6 herramientas (klines, S/R histórico, ciclos)
- **Sistema y Config**: 31 herramientas (salud, caché, configuración)
- **Repositorio**: 11 herramientas (búsqueda, reportes, estadísticas)
- **Contexto Legacy**: 6 herramientas (contexto tradicional)

---

## 🎯 WORKFLOWS PRINCIPALES

### 🧠 Análisis Contextual (NUEVO)
```bash
# 1. Análisis técnico con contexto
analyze_with_historical_context BTCUSDT timeframe=60

# 2. Si Context Confidence ≥60%, análisis completo
complete_analysis_with_context BTCUSDT investment=1000
```

### 📊 Trading General
```bash
# 1. Vista general → 2. Wyckoff → 3. SMC → 4. Trampas → 5. Validación
get_complete_analysis BTCUSDT → analyze_wyckoff_phase BTCUSDT → analyze_smart_money_confluence BTCUSDT → detect_bull_trap BTCUSDT → validate_setup
```

### 🗂️ Gestión de Contexto
```bash
# 1. Inicializar → 2. Consultar → 3. Mantener
initialize_symbol_context SYMBOL → get_master_context SYMBOL → optimize_symbol_context SYMBOL
```

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

### 📖 User Guides Completas
- **`claude/user-guides/complete-user-guide.md`** - Guía completa de todas las 119+ herramientas
- **`docs/user-guides/context-aware-analysis-guide.md`** - Guía específica del análisis contextual

### 📁 Documentación Técnica
- **`claude/tasks/task-tracker.md`** - Estado y roadmap del proyecto
- **`claude/master-log.md`** - Log resumido de desarrollo
- **`.claude_context`** - Estado actual optimizado

### 🗂️ Tipos y Arquitectura
- **`src/types/`** - Definiciones TypeScript
- **`src/core/engine.ts`** - Motor principal
- **`src/services/`** - Servicios especializados
- **`src/adapters/`** - Adaptadores MCP

---

## 💡 CASOS DE USO RÁPIDOS

### 🎯 Entry con Alta Confianza
```json
{\"contextConfidence\": 85, \"recommendations\": {\"action\": \"consider_entry\", \"riskAdjustment\": \"decrease\"}}
```
→ **Acción**: Considera entrada con riesgo reducido

### ⚠️ Señales Divergentes  
```json
{\"contextConfidence\": 25, \"recommendations\": {\"action\": \"wait\", \"riskAdjustment\": \"increase\"}}
```
→ **Acción**: Espera confirmación adicional

### 📊 Confluencia SMC Alta
```json
{\"confluenceScore\": 92, \"tradingRecommendation\": \"HIGH_PROBABILITY_SETUP\"}
```
→ **Acción**: Setup de alta probabilidad

---

## 🔧 CONFIGURACIÓN RÁPIDA

### Variables de Entorno Principales
```bash
MONGODB_URI=mongodb://localhost:27017/waickoff  # Opcional
STORAGE_TYPE=hybrid  # hybrid, file, mongo
DEFAULT_SYMBOL=BTCUSDT
CONTEXT_RETENTION_DAYS=90
```

### Comandos Básicos
```bash
npm run build    # Compilar (0 errores TS)
npm start        # Ejecutar servidor MCP
get_system_health # Verificar estado
```

---

## 🎯 MEJORES PRÁCTICAS

### 🧠 Análisis Contextual
1. **Usa herramientas contextuales** como primera opción
2. **Context Confidence ≥60%** para decisiones importantes
3. **Niveles históricos cercanos** = zonas importantes
4. **Aplica riskAdjustment** en posicionamiento

### 📊 Trading General
1. **Combina múltiples análisis** para confirmación
2. **Context Confidence** como filtro principal
3. **Confluencias SMC** antes de entradas grandes
4. **Wyckoff phase** para timing de mercado

### 🗂️ Gestión de Contexto
1. **Inicializa símbolos nuevos** antes del primer análisis
2. **Optimización semanal** para mantener performance
3. **Validación mensual** de integridad

---

## 🆘 TROUBLESHOOTING RÁPIDO

### Comandos de Debug
```bash
get_system_health                    # Estado general
get_debug_logs logType=errors        # Logs de error
validate_env_config                  # Validar configuración
get_hierarchical_performance_metrics # Métricas contexto
```

### Problemas Comunes
- **Context Confidence bajo**: Cambio reciente en tendencia o datos limitados
- **\"No historical levels\"**: Precio en territorio nuevo
- **Errores TS**: Sistema v1.10.1 compila limpio (verificar dependencias)

---

## 📊 ESTADO ACTUAL v1.10.1

- **✅ TASK-040**: Sistema Contexto Jerárquico (100% completado)
- **✅ TASK-041**: Documentación Completa (100% completado)  
- **🎯 TASK-042**: Testing Sistemático (PRÓXIMO - 91 herramientas)

**Estado**: ✅ **PRODUCTION READY** con análisis contextual automático

---

## 📝 REFERENCIA RÁPIDA DE HERRAMIENTAS POR CATEGORÍA

| Categoría | Herramientas Clave | Total |
|-----------|-------------------|-------|
| **Contexto Contextual** | `analyze_with_historical_context`, `complete_analysis_with_context` | 2 |
| **Contexto Jerárquico** | `get_master_context`, `initialize_symbol_context`, `query_master_context` | 14 |
| **Smart Money** | `analyze_smart_money_confluence`, `get_smc_dashboard`, `validate_smc_setup` | 14 |
| **Wyckoff** | `analyze_wyckoff_phase`, `get_wyckoff_interpretation`, `find_wyckoff_events` | 14 |
| **Técnico Básico** | `perform_technical_analysis`, `get_complete_analysis`, `get_ticker` | 8 |
| **Técnico Avanzado** | `calculate_fibonacci_levels`, `find_technical_confluences` | 4 |
| **Trampas** | `detect_bull_trap`, `detect_bear_trap`, `validate_breakout` | 8 |
| **Multi-Exchange** | `get_aggregated_ticker`, `identify_arbitrage_opportunities` | 11 |
| **Sistema** | `get_system_health`, `get_cache_stats`, `validate_env_config` | 31 |
| **Otros** | Histórico, Grid, Repositorio, Legacy | 33 |

**Total**: **119+ herramientas MCP operativas**

---

*wAIckoff MCP Server v1.10.1 - Sistema de análisis contextual más avanzado disponible*  
*Para documentación completa, consultar user-guides referenciadas arriba*
