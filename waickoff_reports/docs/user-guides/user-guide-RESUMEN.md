# 📚 RESUMEN - wAIckoff MCP User Guide v1.7.1

## 🎯 Herramientas por Categoría (95+ herramientas)

### 📊 **Datos de Mercado (3 herramientas)**
- `get_ticker` - Precio actual y estadísticas 24h
- `get_orderbook` - Profundidad del libro de órdenes
- `get_market_data` - Datos completos (ticker + orderbook + klines)

### 📈 **Análisis Técnico Básico (6 herramientas)**
- `analyze_volatility` - Volatilidad para timing de grid
- `analyze_volume` - Patrones de volumen con VWAP
- `analyze_volume_delta` - Presión compradora vs vendedora
- `identify_support_resistance` - Niveles S/R dinámicos
- `perform_technical_analysis` - Análisis técnico completo
- `get_complete_analysis` - Análisis con recomendaciones

### 💰 **Smart Money Concepts (14 herramientas)**
#### Order Blocks (3)
- `detect_order_blocks` - Detecta bloques institucionales
- `validate_order_block` - Valida si OB sigue activo
- `get_order_block_zones` - Zonas categorizadas por fuerza

#### Fair Value Gaps (2)
- `find_fair_value_gaps` - Detecta FVG institucionales
- `analyze_fvg_filling` - Probabilidad de llenado

#### Break of Structure (3)
- `detect_break_of_structure` - Detecta BOS/CHoCH
- `analyze_market_structure` - Estructura multi-timeframe
- `validate_structure_shift` - Valida cambios estructurales

#### Integración SMC (3)
- `analyze_smart_money_confluence` - Confluencias SMC
- `get_smc_market_bias` - Sesgo institucional
- `validate_smc_setup` - Valida setup SMC

#### Dashboard SMC (3)
- `get_smc_dashboard` - Vista unificada SMC
- `get_smc_trading_setup` - Setup óptimo automático
- `analyze_smc_confluence_strength` - Fuerza de confluencias

### 🎯 **Análisis Wyckoff (8 herramientas)**
- `analyze_wyckoff_phase` - Fase actual Wyckoff
- `detect_trading_range` - Rangos de acumulación/distribución
- `find_wyckoff_events` - Events (springs, upthrusts, tests)
- `analyze_wyckoff_volume` - Volumen en contexto Wyckoff
- `get_wyckoff_interpretation` - Interpretación y bias
- `track_phase_progression` - Seguimiento de progresión
- `validate_wyckoff_setup` - Valida setup Wyckoff
- `analyze_composite_man` - Actividad institucional

### 🎯 **Detección de Trampas (7 herramientas)**
- `detect_bull_trap` - Trampas alcistas
- `detect_bear_trap` - Trampas bajistas
- `get_trap_history` - Historial para backtesting
- `get_trap_statistics` - Estadísticas de rendimiento
- `configure_trap_detection` - Configurar parámetros
- `validate_breakout` - Valida situación de ruptura
- `get_trap_performance` - Métricas de servicio

### 📐 **Grid Trading (1 herramienta)**
- `suggest_grid_levels` - Sugerencias inteligentes de grid

### 📜 **Análisis Histórico (6 herramientas)**
- `get_historical_klines` - Datos OHLCV históricos
- `analyze_historical_sr` - Niveles S/R históricos
- `identify_volume_anomalies` - Anomalías de volumen
- `get_price_distribution` - Distribución y áreas de valor
- `identify_market_cycles` - Ciclos de mercado
- `get_historical_summary` - Resumen histórico completo

### 📝 **Context Management (7 herramientas) ✨ NUEVO**
- `get_analysis_context` - Contexto histórico comprimido
- `get_timeframe_context` - Contexto por timeframe específico
- `add_analysis_context` - Agregar análisis al historial
- `get_multi_timeframe_context` - Vista multi-temporal integral
- `update_context_config` - Configurar gestión de contexto
- `cleanup_context` - Limpiar datos antiguos
- `get_context_stats` - Estadísticas de uso

### ⚙️ **Sistema y Configuración (20+ herramientas)**
- Repositorio, reportes, caché, configuración, debug, etc.

## 🔧 **Comandos Esenciales**

### **Análisis Rápido:**
```bash
get_complete_analysis BTCUSDT
get_smc_dashboard BTCUSDT 60
get_wyckoff_interpretation BTCUSDT 240
get_analysis_context BTCUSDT compressed  # ✨ Contexto histórico
```

### **Análisis Detallado:**
```bash
analyze_smart_money_confluence BTCUSDT 60
find_technical_confluences BTCUSDT 60
validate_smc_setup BTCUSDT long
```

### **Timeframes Recomendados:**
- **Scalping:** 5m-15m
- **Day Trading:** 15m-1h
- **Swing Trading:** 1h-4h
- **Position Trading:** 4h-1D

## 💡 **Flujo de Trabajo Sugerido**

1. **Contexto Histórico:** `get_analysis_context` ✨
2. **Vista General:** `get_smc_dashboard`
3. **Confluencias:** `analyze_smart_money_confluence`
4. **Setup Específico:** `get_smc_trading_setup`
5. **Validación:** `validate_smc_setup`
6. **Gestión Riesgo:** Usar niveles del setup

## 🎯 **Consejos Clave**

- Revisar **contexto histórico** antes de analizar ✨
- Comenzar con **análisis completo** para context
- Usar **confluencias SMC** para alta probabilidad
- Validar con **Wyckoff** para timing
- Confirmar con **volume delta** para momentum
- Aplicar **gestión de riesgo** siempre

## 🆕 **Context Management - Beneficios**

- **Compresión 50:1** - De 100KB a 2KB por análisis
- **Multi-timeframe** - Alineación temporal automática
- **Actualización automática** - Con cada análisis
- **Historial inteligente** - Patrones y niveles clave
- **Mínimo consumo** - Optimizado para contexto AI

---

*Resumen v1.1 - Basado en user-guide.md v1.7.1*