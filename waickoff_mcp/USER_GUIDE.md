# 📚 wAIckoff MCP User Guide

## 🎯 Guía Completa de Herramientas MCP

Este documento describe todas las herramientas disponibles en el servidor wAIckoff MCP v1.8.3, organizadas por categorías.

**🎆 NOVEDAD v1.8.3**: TASK-030 Modularización Wyckoff COMPLETADA - Arquitectura modular profesional con 6 módulos especializados.

**🔧 ESTADO ACTUAL**: 
- ✅ **Sistema 100% Operativo**: 106+ herramientas MCP funcionando
- ✅ **Arquitectura Modular Wyckoff**: 6 módulos especializados (PhaseAnalyzer, TradingRangeAnalyzer, VolumeAnalyzer, SpringDetector, UpthrustDetector, TestEventDetector)
- ✅ **Compilación Limpia**: 0 errores TypeScript
- ✅ **Contexto Histórico Activo**: Sistema guarda automáticamente análisis previos
- ✅ **Multi-Exchange**: Agregación inteligente de datos de múltiples exchanges
- ✅ **Smart Money Concepts**: 14 herramientas para análisis institucional avanzado

---

## 🏢 Arquitectura Modular Wyckoff (NUEVO v1.8.3)

### 📊 Beneficios de la Modularización
La versión 1.8.3 incluye una completa refactorización del sistema Wyckoff en 6 módulos especializados:

**1. PhaseAnalyzer** - Clasificación inteligente de fases Wyckoff
- 15 fases diferentes detectadas automáticamente
- Algoritmos especializados para acumulación vs distribución
- Análisis contextual basado en eventos y volumen
- Predicciones de próximos eventos esperados

**2. TradingRangeAnalyzer** - Detección y análisis completo de rangos
- Múltiples métodos de detección (price action, volatilidad, trend break)
- Evaluación de calidad con scoring de 0-100
- Identificación automática de tipo (acumulación/distribución/consolidación)
- Recomendaciones específicas basadas en quality assessment

**3. VolumeAnalyzer** - Análisis especializado de volumen en contexto Wyckoff
- Detección de events de climax (selling/buying)
- Identificación de períodos de "dry-up" (absorción)
- Cálculo de VWAP dinámico y rankings de volumen
- Interpretación contextual para cada fase

**4. SpringDetector** - Detección avanzada de springs
- Criterios múltiples: penetración, recuperación, volumen, contexto
- Scoring de significancia 0-100
- Evaluación de éxito basada en follow-through
- Filtrado por calidad y proximidad temporal

**5. UpthrustDetector** - Detección de upthrusts y bull traps
- Detección de penetración y rechazo above resistance
- Análisis de volumen en penetración vs rechazo
- Contexto de distribución y evaluación de éxito
- Scoring integrado con eventos previos

**6. TestEventDetector** - Análisis de retests de niveles clave
- Detección de tests en soporte/resistencia
- Evaluación de calidad (good/poor/failed)
- Análisis de resulting action (bounce/break/stall)
- Scoring basado en context y follow-through

### 🛠️ Ventajas Técnicas
- **Escalabilidad**: Cada módulo evoluciona independientemente
- **Mantenibilidad**: Lógica especializada en archivos dedicados
- **Testabilidad**: Módulos individuales unit-testables
- **Performance**: Sin impacto en rendimiento
- **Backward Compatibility**: 100% preservada - APIs públicas intactas

### 🎯 Uso Práctico
La modularización es transparente para el usuario:
- Todas las herramientas Wyckoff siguen funcionando igual
- Mayor precisión en detección de patrones
- Análisis más profundo y contextual
- Mejor handling de edge cases
- Logs más detallados para debugging

---

## 📊 Smart Money Concepts (14 Herramientas)

### 🔍 Order Blocks
- `detect_order_blocks` - Detección de bloques institucionales
- `validate_order_block` - Validación de mitigación
- `get_order_block_zones` - Agrupación por proximidad y fuerza

### ⚡ Fair Value Gaps
- `find_fair_value_gaps` - Detección de desequilibrios
- `analyze_fvg_filling` - Análisis de probabilidad de llenado

### 🔄 Break of Structure
- `detect_break_of_structure` - Cambios estructurales (BOS/CHoCH)
- `analyze_market_structure` - Análisis de estructura multi-timeframe
- `validate_structure_shift` - Validación de cambios

### 🎯 Integración SMC
- `analyze_smart_money_confluence` - Confluencias entre todos los conceptos
- `get_smc_market_bias` - Sesgo de mercado integrado
- `validate_smc_setup` - Validación de setups completos

### 📊 Dashboard SMC
- `get_smc_dashboard` - Dashboard unificado con overview completo
- `get_smc_trading_setup` - Setup de trading con risk management
- `analyze_smc_confluence_strength` - Análisis detallado de confluencias

---

## 🔄 Multi-Exchange (11 Herramientas)

### 📊 Agregación Básica
- `get_aggregated_ticker` - Precios ponderados cross-exchange
- `get_composite_orderbook` - Libro de órdenes unificado
- `detect_exchange_divergences` - Divergencias precio/volumen/estructura
- `identify_arbitrage_opportunities` - Oportunidades de arbitraje
- `get_exchange_dominance` - Análisis de dominancia
- `get_multi_exchange_analytics` - Dashboard multi-exchange

### 🚀 Features Avanzados
- `predict_liquidation_cascade` - Predicción de cascadas de liquidación
- `detect_advanced_divergences` - Divergencias momentum/institutional
- `analyze_enhanced_arbitrage` - Arbitraje spatial/temporal/triangular
- `analyze_extended_dominance` - Métricas extendidas de liderazgo
- `analyze_cross_exchange_market_structure` - Estructura cross-exchange

---

## 📊 Herramientas de Datos de Mercado

### `get_ticker`
Obtiene precio actual y estadísticas de 24h para un par de trading.

**Parámetros:**
- `symbol` (requerido): Par de trading (ej: BTCUSDT, XRPUSDT)
- `category` (opcional): Categoría del mercado ('spot', 'linear', 'inverse'). Default: 'spot'

**Ejemplo:**
```
get_ticker BTCUSDT
```

### `get_orderbook`
Obtiene profundidad del libro de órdenes para análisis de mercado.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `category` (opcional): Categoría del mercado. Default: 'spot'
- `limit` (opcional): Número de niveles del orderbook. Default: 25

**Ejemplo:**
```
get_orderbook ETHUSDT limit=50
```

### `get_market_data`
Obtiene datos completos del mercado (ticker + orderbook + klines recientes).

**Parámetros:**
- `symbol` (requerido): Par de trading
- `category` (opcional): Categoría del mercado. Default: 'spot'

**Ejemplo:**
```
get_market_data BTCUSDT
```

---

## 📈 Herramientas de Análisis Técnico

### `analyze_volatility`
Analiza la volatilidad del precio para timing de grid trading.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `period` (opcional): Período de análisis ('1h', '4h', '1d', '7d'). Default: '1d'

**Ejemplo:**
```
analyze_volatility BTCUSDT period=4h
```

### `analyze_volume`
Analiza patrones de volumen con VWAP y detección de anomalías.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `interval` (opcional): Intervalo de tiempo ('1', '5', '15', '30', '60', '240', 'D'). Default: '60'
- `periods` (opcional): Número de períodos a analizar. Default: 24

**Ejemplo:**
```
analyze_volume ETHUSDT interval=15 periods=48
```

### `analyze_volume_delta`
Calcula Volume Delta (presión compradora vs vendedora).

**Parámetros:**
- `symbol` (requerido): Par de trading
- `interval` (opcional): Intervalo de tiempo ('1', '5', '15', '30', '60'). Default: '5'
- `periods` (opcional): Número de períodos. Default: 60

**Ejemplo:**
```
analyze_volume_delta BTCUSDT interval=5 periods=120
```

### `identify_support_resistance`
Identifica niveles dinámicos de soporte y resistencia con scoring de fuerza.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `interval` (opcional): Intervalo para análisis. Default: '60'
- `periods` (opcional): Número de períodos a analizar. Default: 100
- `sensitivity` (opcional): Sensibilidad de detección (1-5). Default: 2

**Ejemplo:**
```
identify_support_resistance BTCUSDT sensitivity=3
```

### `perform_technical_analysis`
Análisis técnico completo incluyendo todos los indicadores.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `includeVolatility` (opcional): Incluir análisis de volatilidad. Default: true
- `includeVolume` (opcional): Incluir análisis de volumen. Default: true
- `includeVolumeDelta` (opcional): Incluir análisis de volume delta. Default: true
- `includeSupportResistance` (opcional): Incluir análisis S/R. Default: true
- `timeframe` (opcional): Marco temporal de análisis. Default: '60'
- `periods` (opcional): Número de períodos. Default: 100

**Ejemplo:**
```
perform_technical_analysis BTCUSDT
```

### `get_complete_analysis`
Análisis completo del mercado con resumen y recomendaciones.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `investment` (opcional): Monto de inversión para sugerencias de grid

**Ejemplo:**
```
get_complete_analysis BTCUSDT investment=1000
```

---

## 🎯 Herramientas de Análisis Wyckoff Básico (NUEVO!)

### `analyze_wyckoff_phase`
Analiza la fase actual de Wyckoff para análisis de estructura de mercado.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal de análisis ('15', '30', '60', '240', 'D'). Default: '60'
- `lookback` (opcional): Número de períodos a analizar (50-200). Default: 100

**Ejemplo:**
```
analyze_wyckoff_phase BTCUSDT timeframe=240 lookback=150
```

**Respuesta incluye:**
- Fase actual de Wyckoff (acumulación/distribución A-E, markup/markdown)
- Confianza en la identificación de fase
- Progreso dentro de la fase actual
- Rango de trading detectado
- Eventos clave identificados
- Características de volumen
- Interpretación y bias del mercado

### `detect_trading_range`
Detecta rangos de trading para análisis de acumulación/distribución.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal ('15', '30', '60', '240', 'D'). Default: '60'
- `minPeriods` (opcional): Períodos mínimos para rango válido (10-50). Default: 20

**Ejemplo:**
```
detect_trading_range ETHUSDT minPeriods=30
```

### `find_wyckoff_events`
Busca eventos Wyckoff (springs, upthrusts, tests) en datos de mercado.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal. Default: '60'
- `eventTypes` (opcional): Tipos de eventos a detectar. Default: ['spring', 'upthrust', 'test']
- `lookback` (opcional): Períodos a analizar. Default: 100

**Ejemplo:**
```
find_wyckoff_events BTCUSDT eventTypes=["spring","test"] lookback=200
```

### `analyze_wyckoff_volume`
Analiza características de volumen en contexto Wyckoff.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal. Default: '60'
- `lookback` (opcional): Períodos a analizar. Default: 100

**Ejemplo:**
```
analyze_wyckoff_volume BTCUSDT timeframe=240
```

### `get_wyckoff_interpretation`
Obtiene interpretación comprehensiva del análisis Wyckoff y bias.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal. Default: '60'

**Ejemplo:**
```
get_wyckoff_interpretation ETHUSDT timeframe=240
```

### `track_phase_progression`
Realiza seguimiento de progresión y timeline de desarrollo de fases Wyckoff.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal. Default: '60'

**Ejemplo:**
```
track_phase_progression BTCUSDT
```

### `validate_wyckoff_setup`
Valida setup de trading Wyckoff con evaluación de riesgo.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal. Default: '60'
- `tradingDirection` (opcional): Dirección de trading ('long', 'short')

**Ejemplo:**
```
validate_wyckoff_setup BTCUSDT tradingDirection=long
```

---

## 🎯 Herramientas de Detección de Trampas

### `detect_bull_trap`
Detecta trampas alcistas (falsas rupturas sobre resistencia).

**Parámetros:**
- `symbol` (requerido): Par de trading
- `sensitivity` (opcional): Sensibilidad de detección ('low', 'medium', 'high'). Default: 'medium'

**Ejemplo:**
```
detect_bull_trap BTCUSDT sensitivity=high
```

**Respuesta incluye:**
- Probabilidad de trampa alcista
- Triggers detectados (volumen bajo, orderbook débil, etc.)
- Niveles de precio objetivo
- Recomendaciones específicas
- Ventana de tiempo esperada

### `detect_bear_trap`
Detecta trampas bajistas (falsas rupturas bajo soporte).

**Parámetros:**
- `symbol` (requerido): Par de trading
- `sensitivity` (opcional): Sensibilidad de detección ('low', 'medium', 'high'). Default: 'medium'

**Ejemplo:**
```
detect_bear_trap ETHUSDT sensitivity=medium
```

### `get_trap_history`
Obtiene historial de trampas detectadas para backtesting.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `days` (opcional): Número de días hacia atrás. Default: 30
- `trapType` (opcional): Tipo de trampas ('bull', 'bear', 'both'). Default: 'both'

**Ejemplo:**
```
get_trap_history BTCUSDT days=7 trapType=bull
```

### `get_trap_statistics`
Obtiene estadísticas de rendimiento de detección de trampas.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `period` (opcional): Período de estadísticas ('7d', '30d', '90d', '1y'). Default: '30d'

**Ejemplo:**
```
get_trap_statistics BTCUSDT period=90d
```

### `configure_trap_detection`
Configura parámetros de detección de trampas.

**Parámetros:**
- `sensitivity` (opcional): Sensibilidad general ('low', 'medium', 'high')
- `volumeThreshold` (opcional): Multiplicador de umbral de volumen
- `orderbookDepthRatio` (opcional): Ratio mínimo de profundidad del orderbook
- `timeWindowMinutes` (opcional): Ventana de tiempo de análisis en minutos
- `minimumBreakout` (opcional): Porcentaje mínimo de ruptura para analizar
- `confidenceThreshold` (opcional): Umbral mínimo de confianza para alertas

**Ejemplo:**
```
configure_trap_detection sensitivity=high volumeThreshold=0.8
```

### `validate_breakout`
Valida si actualmente hay una situación de ruptura.

**Parámetros:**
- `symbol` (requerido): Par de trading

**Ejemplo:**
```
validate_breakout BTCUSDT
```

### `get_trap_performance`
Obtiene métricas de rendimiento del servicio de detección de trampas.

**Ejemplo:**
```
get_trap_performance
```

---

## 📐 Herramientas de Grid Trading

### `suggest_grid_levels`
Genera sugerencias inteligentes de grid trading.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `investment` (requerido): Monto a invertir en USD
- `gridCount` (opcional): Número de niveles de grid. Default: 10
- `riskTolerance` (opcional): Nivel de tolerancia al riesgo ('low', 'medium', 'high'). Default: 'medium'
- `optimize` (opcional): Usar optimización avanzada. Default: false

**Ejemplo:**
```
suggest_grid_levels BTCUSDT investment=5000 gridCount=15 riskTolerance=low
```

---

## 📜 Herramientas de Análisis Histórico

### `get_historical_klines`
Obtiene datos históricos OHLCV con metadata completa.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `interval` (opcional): Intervalo de tiempo ('D', 'W', 'M'). Default: 'D'
- `startTime` (opcional): Timestamp de inicio
- `endTime` (opcional): Timestamp de fin
- `useCache` (opcional): Usar datos en caché si están disponibles. Default: true

**Ejemplo:**
```
get_historical_klines BTCUSDT interval=W
```

### `analyze_historical_sr`
Analiza niveles históricos de soporte y resistencia con scoring avanzado.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal ('D', 'W', 'M'). Default: 'D'
- `minTouches` (opcional): Toques mínimos para validación. Default: 3
- `tolerance` (opcional): Tolerancia de precio en %. Default: 0.5
- `volumeWeight` (opcional): Ponderar niveles por volumen. Default: true
- `recencyBias` (opcional): Sesgo hacia niveles recientes (0-1). Default: 0.1

**Ejemplo:**
```
analyze_historical_sr BTCUSDT minTouches=5 tolerance=0.3
```

### `identify_volume_anomalies`
Identifica anomalías de volumen y eventos significativos.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal ('D', 'W'). Default: 'D'
- `threshold` (opcional): Multiplicador de umbral de anomalía. Default: 2.5

**Ejemplo:**
```
identify_volume_anomalies ETHUSDT threshold=3.0
```

### `get_price_distribution`
Analiza distribución de precios y áreas de valor.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal ('D', 'W'). Default: 'D'

**Ejemplo:**
```
get_price_distribution BTCUSDT timeframe=W
```

### `identify_market_cycles`
Identifica ciclos de mercado y tendencias.

**Parámetros:**
- `symbol` (requerido): Par de trading

**Ejemplo:**
```
identify_market_cycles BTCUSDT
```

### `get_historical_summary`
Obtiene resumen completo de análisis histórico.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal ('D', 'W', 'M'). Default: 'D'

**Ejemplo:**
```
get_historical_summary BTCUSDT timeframe=M
```

---

## 🗄️ Herramientas de Repositorio de Análisis

### `get_analysis_by_id`
Obtiene un análisis específico por su ID.

**Parámetros:**
- `id` (requerido): ID del análisis (UUID)

**Ejemplo:**
```
get_analysis_by_id 123e4567-e89b-12d3-a456-426614174000
```

### `get_latest_analysis`
Obtiene el análisis más reciente para un símbolo y tipo.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `type` (requerido): Tipo de análisis

**Ejemplo:**
```
get_latest_analysis BTCUSDT type=technical_analysis
```

### `search_analyses`
Busca análisis con consulta compleja.

**Parámetros:**
- `symbol` (opcional): Par de trading
- `type` (opcional): Tipo de análisis
- `dateFrom` (opcional): Fecha de inicio (formato ISO)
- `dateTo` (opcional): Fecha de fin (formato ISO)
- `limit` (opcional): Máximo de resultados. Default: 100
- `orderBy` (opcional): Campo de ordenamiento. Default: 'timestamp'
- `orderDirection` (opcional): Dirección de orden. Default: 'desc'

**Ejemplo:**
```
search_analyses symbol=BTCUSDT limit=10
```

### `get_analysis_summary`
Obtiene resumen de análisis para un símbolo en un período.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `period` (opcional): Período del resumen ('1h', '4h', '1d', '1w', '1m'). Default: '1d'

**Ejemplo:**
```
get_analysis_summary ETHUSDT period=1w
```

### `get_repository_stats`
Obtiene estadísticas del repositorio y uso de almacenamiento.

**Ejemplo:**
```
get_repository_stats
```

---

## 📊 Herramientas de Generación de Reportes

### `generate_report`
Genera un reporte completo basado en datos de análisis.

**Parámetros:**
- `type` (requerido): Tipo de reporte ('daily', 'weekly', 'symbol', 'performance', 'patterns', 'custom')
- `format` (opcional): Formato de salida ('markdown', 'json', 'html'). Default: 'markdown'
- `symbol` (opcional): Par de trading (para reportes de símbolo)
- `dateFrom` (opcional): Fecha de inicio
- `dateTo` (opcional): Fecha de fin

**Ejemplo:**
```
generate_report type=daily format=markdown
```

### `generate_daily_report`
Genera reporte de análisis diario del mercado.

**Parámetros:**
- `date` (opcional): Fecha del reporte (formato ISO). Default: hoy

**Ejemplo:**
```
generate_daily_report
```

### `generate_symbol_report`
Genera reporte detallado para un símbolo específico.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `period` (opcional): Período de análisis. Default: '1d'

**Ejemplo:**
```
generate_symbol_report BTCUSDT period=1w
```

---

## ⚙️ Herramientas de Sistema

### `get_system_health`
Obtiene estado de salud del sistema y métricas de rendimiento.

**Ejemplo:**
```
get_system_health
```

### `get_debug_logs`
Obtiene logs de depuración para troubleshooting.

**Parámetros:**
- `logType` (opcional): Tipo de logs ('all', 'errors', 'json_errors', 'requests'). Default: 'all'
- `limit` (opcional): Número de entradas. Default: 50

**Ejemplo:**
```
get_debug_logs logType=errors limit=100
```

### `get_analysis_history`
Obtiene historial de análisis guardados para un símbolo.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `limit` (opcional): Número de análisis históricos. Default: 10
- `analysisType` (opcional): Filtrar por tipo

**Ejemplo:**
```
get_analysis_history BTCUSDT limit=20
```

---

## 🗂️ Herramientas de Configuración

### `get_user_config`
Obtiene configuración actual del usuario incluyendo timezone.

**Ejemplo:**
```
get_user_config
```

### `set_user_timezone`
Establece preferencia de zona horaria del usuario.

**Parámetros:**
- `timezone` (requerido): Identificador de zona horaria (ej: America/New_York)
- `autoDetect` (opcional): Habilitar detección automática. Default: false

**Ejemplo:**
```
set_user_timezone timezone=Europe/London
```

### `detect_timezone`
Auto-detecta zona horaria del sistema usando múltiples métodos.

**Ejemplo:**
```
detect_timezone
```

### `get_system_config`
Obtiene configuración completa del sistema desde variables de entorno.

**Ejemplo:**
```
get_system_config
```

### `validate_env_config`
Valida configuración de entorno y obtiene recomendaciones.

**Ejemplo:**
```
validate_env_config
```

---

## 💾 Herramientas de Caché

### `get_cache_stats`
Obtiene estadísticas de rendimiento del caché.

**Ejemplo:**
```
get_cache_stats
```

### `clear_cache`
Limpia todos los datos en caché del mercado.

**Parámetros:**
- `confirm` (requerido): Confirmar operación de limpieza

**Ejemplo:**
```
clear_cache confirm=true
```

### `invalidate_cache`
Invalida entradas de caché para un símbolo específico.

**Parámetros:**
- `symbol` (requerido): Par de trading
- `category` (opcional): Categoría del mercado

**Ejemplo:**
```
invalidate_cache BTCUSDT
```

---

## 🔍 Consejos de Uso

### Para Trading
1. Usa `get_complete_analysis` para obtener una visión general rápida
2. **NUEVO:** Comienza con `analyze_wyckoff_phase` para entender la estructura de mercado
3. Combina `detect_bull_trap` y `detect_bear_trap` para evitar falsas señales
4. **NUEVO:** Usa `find_wyckoff_events` para identificar springs y upthrusts como puntos de entrada
5. Utiliza `analyze_volume_delta` para confirmar movimientos de precio
6. **NUEVO:** Valida setups con `validate_wyckoff_setup` antes de entrar en posición
7. Revisa `identify_support_resistance` antes de establecer niveles de grid

### Para Análisis
1. Comienza con `perform_technical_analysis` para análisis completo
2. **NUEVO:** Complementa con `analyze_wyckoff_phase` para estructura de mercado
3. Usa `get_historical_summary` para contexto de largo plazo
4. **NUEVO:** Combina `detect_trading_range` con `analyze_wyckoff_volume` para confirmar fases
5. Identifica patrones con `identify_volume_anomalies`
6. **NUEVO:** Usa `get_wyckoff_interpretation` para entender implicaciones de la fase actual
7. Valida breakouts con `validate_breakout` antes de tomar decisiones

### Para Monitoreo
1. Revisa `get_system_health` periódicamente
2. **NUEVO:** Usa `track_phase_progression` para seguir el desarrollo de fases Wyckoff
3. Usa `get_trap_statistics` para evaluar efectividad
4. Genera reportes diarios con `generate_daily_report`
5. Mantén el rendimiento con `get_cache_stats`

---

## 📝 Notas Importantes

- Todas las herramientas funcionan sin API keys
- Los datos son públicos de Bybit v5
- Los tiempos están en UTC por defecto (configurable con timezone)
- El sistema guarda automáticamente los análisis para referencia futura
- La detección de trampas usa múltiples señales para mayor precisión
- **NUEVO:** El análisis Wyckoff identifica 15 fases diferentes con eventos clave
- **NUEVO:** Los springs y upthrusts se detectan automáticamente con scoring de significancia
- **NUEVO:** El sistema de validación Wyckoff evalúa setups con puntuación 0-100

---

## 🆘 Soporte

Si encuentras problemas:
1. Usa `get_debug_logs` para obtener información de depuración
2. Revisa `get_system_health` para verificar el estado del sistema
3. Consulta la documentación técnica en `/claude/docs/`
4. Reporta issues en el repositorio del proyecto

---

*Versión: 1.8.3 - Actualizado: 18/06/2025*
*Última actualización: TASK-030 FASE 3 - Arquitectura Modular Wyckoff Completada*
*Sistema: 106+ herramientas MCP con arquitectura modular profesional*
