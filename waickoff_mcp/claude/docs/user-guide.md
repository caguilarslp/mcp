# 📊 Guía de Uso wAIckoff MCP v1.5.1 - Trading Analysis + Historical Data

## 🎯 Para qué sirve este MCP

El **wAIckoff MCP v1.5.1** es tu herramienta de análisis técnico profesional integrada en Claude Desktop que te proporciona:

- **Análisis técnico completo** en segundos con auto-guardado
- **🆕 Análisis histórico avanzado** - 3+ años de datos con patrones identificados
- **Sugerencias de grid trading** basadas en volatilidad y S/R
- **Detección de divergencias** precio/volumen
- **Niveles de soporte/resistencia dinámicos** con scoring avanzado
- **Volume Delta** para presión compradora/vendedora
- **Datos de mercado en tiempo real** de Bybit con cache inteligente
- **Sistema de almacenamiento avanzado** con búsqueda histórica
- **Repositorio de análisis** con consultas complejas
- **Generación de reportes** automáticos diarios/semanales
- **Cache inteligente** con invalidación granular
- **🆕 Historical Support/Resistance** con scoring por toques históricos
- **🆕 Volume Anomaly Detection** - Eventos significativos históricos
- **🆕 Market Cycle Analysis** - Patrones cíclicos y estacionales

## 🚀 Setup Rápido

### **1. Verificar que Claude Desktop esté configurado**
El MCP ya está configurado en tu Claude Desktop. Para verificar:

1. Abre Claude Desktop
2. Deberías ver herramientas MCP disponibles automáticamente
3. Si no aparecen, el MCP se recarga automáticamente

### **2. Comandos Básicos para Trading**

## 📋 Herramientas Disponibles v1.5.1

### **🆕 Análisis Histórico (NUEVO TASK-017)**

#### `get_historical_klines` - **Datos Históricos Base**
```
Uso: get_historical_klines BTCUSDT D
```
**Lo que obtienes:**
- 800+ días de datos OHLCV históricos
- Metadata completa (fechas, puntos de datos)
- Intervalos: Diario (D), Semanal (W), Mensual (M)
- Cache optimizado (24h TTL)
- Datos desde 2021 hasta presente

**Cuándo usarla:** Base para análisis profundo, investigación histórica

#### `analyze_historical_sr` - **S/R Histórico Avanzado**
```
Uso: analyze_historical_sr BTCUSDT D
```
**Lo que obtienes:**
- Niveles S/R con scoring histórico
- Número de toques y éxito por nivel
- Significancia basada en volumen histórico
- Distancia actual a niveles clave
- Niveles "major" vs "minor" clasificados
- Estadísticas de fortaleza histórica

**Cuándo usarla:** Identificar niveles macro críticos, validar S/R actuales con historial

#### `identify_volume_anomalies` - **Eventos de Volumen Históricos**
```
Uso: identify_volume_anomalies ETHUSDT D 2.5
```
**Lo que obtienes:**
- Eventos de volumen excepcional (2.5x+ promedio)
- Correlación con movimientos de precio
- Identificación de manipulación histórica
- Patrones de acumulación/distribución
- Contexto temporal de eventos

**Cuándo usarla:** Investigar manipulación, identificar zonas de interés institucional

#### `get_price_distribution` - **Value Areas Históricas**
```
Uso: get_price_distribution XRPUSDT W
```
**Lo que obtienes:**
- Distribución estadística de precios históricos
- "Value areas" de mayor actividad
- Zones de equilibrio de largo plazo
- Análisis de concentración por rango de precios
- Datos para estrategias de mean reversion

**Cuándo usarla:** Identificar zonas de "fair value", configurar targets de largo plazo

#### `identify_market_cycles` - **Ciclos de Mercado**
```
Uso: identify_market_cycles BTCUSDT
```
**Lo que obtienes:**
- Patrones cíclicos identificados
- Duración promedio de tendencias
- Amplitud típica de movimientos
- Timing estacional si existe
- Predicciones basadas en ciclos históricos

**Cuándo usarla:** Timing de entries/exits, prepararse para reversiones cíclicas

#### `get_historical_summary` - **Análisis Histórico Completo**
```
Uso: get_historical_summary BTCUSDT W
```
**Lo que obtienes:**
- Resumen consolidado de TODOS los análisis históricos
- S/R + Volume Events + Price Distribution + Market Cycles
- Insights y recomendaciones agregadas
- Contexto histórico comprehensivo
- **✨ TU HERRAMIENTA DE RESEARCH PRINCIPAL**

**Cuándo usarla:** Due diligence completa, tesis de trading de largo plazo

### **🔍 Análisis Principal de Mercado**

#### `get_complete_analysis` - **TU HERRAMIENTA PRINCIPAL**
```
Uso: get_complete_analysis XRPUSDT 1000
```
**Lo que obtienes:**
- Precio actual y cambio 24h
- Niveles de soporte/resistencia críticos con scoring
- Análisis de volumen y VWAP
- Volume Delta (presión compradora/vendedora)
- Sugerencias de grid trading automáticas
- Recomendación general (BUY/SELL/HOLD)
- **🆕 Auto-guardado** en repositorio para consulta histórica

**Cuándo usarla:** Antes de cualquier decisión de trading, análisis diario

#### `perform_technical_analysis` - **Análisis Técnico Modular**
```
Uso: perform_technical_analysis HBARUSDT
Parámetros opcionales: includeVolatility, includeVolume, includeVolumeDelta, includeSupportResistance
```
**Lo que obtienes:**
- Análisis modular personalizable
- Solo los indicadores que necesitas
- **🆕 Auto-guardado** automático
- Optimizado para velocidad

**Cuándo usarla:** Análisis específico de indicadores individuales

#### `get_market_data` - **Datos Básicos con Cache**
```
Uso: get_market_data HBARUSDT
```
**Lo que obtienes:**
- Precio, volumen, cambios 24h
- Orderbook (bids/asks principales)
- Últimas velas (OHLCV)
- **🆕 Cache automático** para mejor performance

**Cuándo usarla:** Check rápido de precio y momentum

### **📊 Análisis Técnico Especializado**

#### `identify_support_resistance` - **Niveles Clave Avanzados**
```
Uso: identify_support_resistance ONDOUSDT 60 100 2
```
**Lo que obtienes:**
- Niveles de soporte/resistencia con scoring 1-10
- Configuración de grid optimizada
- Nivel crítico más relevante
- **🆕 Algoritmo mejorado** multi-factor
- Estadísticas de detección de pivots

**Cuándo usarla:** Para identificar entries/exits precisos, colocar stop losses

#### `analyze_volume_delta` - **Presión Institucional**
```
Uso: analyze_volume_delta XRPUSDT 5 60
```
**Lo que obtienes:**
- Presión compradora vs vendedora
- Divergencias con el precio
- Tendencia del Volume Delta
- Señales de reversión temprana
- **🆕 Market pressure analysis** detallado

**Cuándo usarla:** Confirmar direccionalidad, detectar reversiones

#### `suggest_grid_levels` - **Grid Trading Inteligente**
```
Uso: suggest_grid_levels XRPUSDT 500 10 medium false
```
**Lo que obtienes:**
- Niveles de grid optimizados
- Cantidad por nivel calculada
- Rango de trading recomendado
- ROI estimado y riesgo
- **🆕 Integración con S/R** para niveles más precisos

**Cuándo usarla:** Configurar bots de grid trading, trading de rango

### **🆕 Sistema de Repositorio Histórico**

#### `get_analysis_history` - **Tu Historial de Trading**
```
Uso: get_analysis_history XRPUSDT 20 technical_analysis
```
**Lo que obtienes:**
- Últimos análisis guardados del símbolo
- Filtrado por tipo de análisis
- Metadata completa (versión, confianza, tags)
- Evolución temporal de indicadores

**Cuándo usarla:** Revisar decisiones pasadas, ver tendencias históricas

#### `get_latest_analysis` - **Último Análisis Guardado**
```
Uso: get_latest_analysis XRPUSDT complete_analysis
```
**Lo que obtienes:**
- Análisis más reciente guardado
- Datos completos del último estudio
- Evita recálculos innecesarios
- **🆕 Formato UUID** mejorado

**Cuándo usarla:** Recuperar tu último análisis sin repetir cálculos

#### `search_analyses` - **Búsqueda Avanzada Compleja**
```
Uso: search_analyses con filtros avanzados
Parámetros: symbol, type, dateFrom, dateTo, limit, orderBy, orderDirection
```
**Lo que obtienes:**
- Búsqueda por rangos de fecha específicos
- Filtros por tipo de análisis
- Ordenamiento personalizado
- **🆕 Query engine** potente

**Cuándo usarla:** Investigación profunda, backtest de estrategias

#### `get_analysis_by_id` - **Recuperar Análisis Específico**
```
Uso: get_analysis_by_id [UUID-del-análisis]
```
**Lo que obtienes:**
- Análisis específico por ID único
- Datos completos preservados
- **🆕 Sistema UUID** robusto

**Cuándo usarla:** Referenciar análisis específicos en decisiones

#### `get_analysis_summary` - **Resumen Agregado por Período**
```
Uso: get_analysis_summary XRPUSDT 1d
```
**Lo que obtienes:**
- Resumen estadístico del período
- Promedio de indicadores
- Tendencias identificadas
- **🆕 Insights agregados** automáticos

**Cuándo usarla:** Vista panorámica de períodos, análisis de tendencias

#### `get_aggregated_metrics` - **Métricas Estadísticas**
```
Uso: get_aggregated_metrics XRPUSDT volatility.volatilityPercent 1d
```
**Lo que obtienes:**
- Estadísticas de métricas específicas
- Agregaciones por período
- **🆕 Analytics avanzado** de indicadores

**Cuándo usarla:** Análisis cuantitativo profundo

#### `find_patterns` - **Búsqueda de Patrones**
```
Uso: find_patterns con criterios específicos
```
**Lo que obtienes:**
- Patrones detectados automáticamente
- Criterios de confianza
- **🆕 Pattern recognition** inteligente

**Cuándo usarla:** Identificar setups recurrentes, patrones Wyckoff

#### `get_repository_stats` - **Estadísticas del Sistema**
```
Uso: get_repository_stats
```
**Lo que obtienes:**
- Total de análisis guardados
- Distribución por tipo y símbolo
- Uso de almacenamiento
- **🆕 Métricas de uso** detalladas

**Cuándo usarla:** Mantenimiento, ver qué datos tienes disponibles

### **🆕 Sistema de Reportes Automáticos**

#### `generate_daily_report` - **Reporte Diario Automático**
```
Uso: generate_daily_report 2024-06-10 ["XRPUSDT", "HBARUSDT"]
```
**Lo que obtienes:**
- Reporte comprehensivo del día
- Análisis de mercado consolidado
- Top movers y patrones
- Recomendaciones agregadas

**Cuándo usarla:** Revisión diaria, planificación de trading

#### `generate_weekly_report` - **Reporte Semanal**
```
Uso: generate_weekly_report 2024-06-10 ["XRPUSDT", "HBARUSDT", "ONDOUSDT"]
```
**Lo que obtienes:**
- Resumen semanal del mercado
- Tendencias identificadas
- Performance de estrategias
- Insights históricos

**Cuándo usarla:** Análisis semanal, ajuste de estrategias

#### `generate_symbol_report` - **Reporte por Símbolo**
```
Uso: generate_symbol_report XRPUSDT 7d
```
**Lo que obtienes:**
- Análisis completo de un símbolo
- Historial de patrones
- Recomendaciones específicas
- **🆕 Deep dive** por token

**Cuándo usarla:** Investigación profunda de un activo específico

#### `generate_performance_report` - **Análisis de Rendimiento**
```
Uso: generate_performance_report 7d
```
**Lo que obtienes:**
- Performance del sistema de análisis
- Métricas de precisión
- Estadísticas de uso
- **🆕 System analytics** completo

**Cuándo usarla:** Evaluar efectividad del sistema, optimización

#### `list_reports` - **Listar Reportes Disponibles**
```
Uso: list_reports
```
**Lo que obtienes:**
- Lista de reportes generados
- Metadata de cada reporte
- **🆕 Gestión de reportes** centralizada

**Cuándo usarla:** Navegación de reportes históricos

### **🆕 Gestión de Cache Inteligente**

#### `get_cache_stats` - **Estadísticas de Cache**
```
Uso: get_cache_stats
```
**Lo que obtienes:**
- Hit rate del cache
- Uso de memoria
- Recomendaciones de optimización
- **🆕 Performance insights** automáticos

**Cuándo usarla:** Optimización de performance, troubleshooting

#### `clear_cache` - **Limpiar Cache**
```
Uso: clear_cache true
```
**Lo que obtienes:**
- Limpieza completa del cache
- Liberación de memoria
- **⚠️ Requiere confirmación**

**Cuándo usarla:** Resolver problemas de datos obsoletos

#### `invalidate_cache` - **Invalidar Cache Específico**
```
Uso: invalidate_cache XRPUSDT spot
```
**Lo que obtienes:**
- Invalidación granular por símbolo
- **🆕 Cache inteligente** por categoría

**Cuándo usarla:** Forzar actualización de datos específicos

### **⚡ Herramientas de Análisis Avanzado**

#### `analyze_volatility` - **Timing de Entry Optimizado**
```
Uso: analyze_volatility ALGOUSDT 1d
```
**Lo que obtienes:**
- Volatilidad actual vs histórica
- Mejor momento para diferentes estrategias
- Expansión/contracción de volatilidad
- **🆕 Grid suitability** mejorado

**Cuándo usarla:** Decidir timing y tipo de estrategia

## 🎯 Workflows de Trading v1.4.0

### **📊 Workflow de Investigación Histórica (NUEVO)**
```
1. get_historical_summary [TOKEN] W (contexto histórico completo)
2. analyze_historical_sr [TOKEN] D (niveles clave históricos)
3. identify_volume_anomalies [TOKEN] D (eventos significativos)
4. get_price_distribution [TOKEN] W (value areas de largo plazo)
5. identify_market_cycles [TOKEN] (patrones cíclicos)
6. Desarrollar tesis basada en análisis histórico profundo
```

### **📈 Workflow de Análisis Diario Optimizado**
```
1. generate_daily_report [fecha] [tus-símbolos]
2. get_complete_analysis para símbolos interesantes
3. get_latest_analysis para comparar con análisis previos
4. Tomar decisiones basadas en reportes + análisis fresh
```

### **🎯 Workflow de Entry/Exit Avanzado**
```
1. get_complete_analysis [TOKEN] [CAPITAL]
2. get_latest_analysis [TOKEN] technical_analysis (comparar cambios)
3. identify_support_resistance [TOKEN] (niveles precisos)
4. analyze_volume_delta [TOKEN] (confirmar timing)
5. Ejecutar trade con niveles identificados
6. Los análisis se guardan automáticamente para seguimiento
```

### **🤖 Workflow de Grid Trading Inteligente**
```
1. analyze_volatility [TOKEN] (verificar suitability)
2. suggest_grid_levels [TOKEN] [CAPITAL] [grids] [risk] [optimize]
3. identify_support_resistance [TOKEN] (confirmar rango)
4. Configurar grid con niveles sugeridos
5. Monitor con reportes diarios automáticos
```

### **🔄 Workflow de Swing Trading con Historial**
```
1. get_analysis_summary [TOKEN] 7d (contexto histórico)
2. get_complete_analysis [TOKEN] [CAPITAL] (setup actual)
3. search_analyses para patterns similares históricos
4. analyze_volume_delta [TOKEN] (timing preciso)
5. Ejecutar con apalancamiento basado en confianza histórica
```

### **📊 Workflow de Investigación y Backtesting**
```
1. search_analyses con filtros temporales amplios
2. get_aggregated_metrics para indicadores clave
3. find_patterns para identificar setups recurrentes
4. generate_symbol_report para análisis completo
5. Desarrollar estrategias basadas en datos históricos
```

### **🆕 Workflow de Reportes Automáticos**
```
1. generate_daily_report cada mañana (automático)
2. generate_weekly_report cada domingo
3. generate_symbol_report para análisis específicos
4. generate_performance_report para optimización mensual
5. list_reports para revisar tendencias históricas
```

## 💡 Tips de Uso Efectivo v1.5.1

### **🆕 Para Análisis Histórico Profundo**
- **Research completo:** Usa `get_historical_summary` como punto de partida
- **Validación S/R:** Combina `identify_support_resistance` actual + `analyze_historical_sr`
- **Event correlation:** `identify_volume_anomalies` para encontrar manipulación histórica
- **Long-term targets:** `get_price_distribution` para value areas de largo plazo
- **Timing estacional:** `identify_market_cycles` para patterns cíclicos

### **🎯 Para tu Portfolio (XRP, HBAR, ONDO)**
- **Análisis diario:** Usa `generate_daily_report` con tus símbolos
- **Decisions críticas:** Combina `get_complete_analysis` + historial
- **Grid setup:** `suggest_grid_levels` integrado con S/R
- **🆕 Tracking:** Usa `get_analysis_summary` para seguimiento semanal

### **💰 Para $2,000 USDC de Trading**
- **Capital por trade:** Usar capital real en `suggest_grid_levels`
- **Risk management:** S/R levels con scoring alto como stop losses
- **🆕 Performance:** `generate_performance_report` para evaluar ROI

### **🔍 Interpretación de Señales Mejorada**

#### **Bullish Setup Confirmado:**
- Volume Delta positivo + precio rompiendo resistencia (strength >8)
- VWAP como soporte + volumen creciente
- Análisis histórico muestra patterns alcistas recurrentes
- **🆕 Scoring S/R >8.5** en resistencia rota

#### **Bearish Setup Confirmado:**
- Volume Delta negativo + precio perdiendo soporte (strength >8)
- VWAP como resistencia + volumen bajista
- Divergencia negativa confirmada en análisis previos
- **🆕 Pattern recognition** de distribución

#### **🆕 Historical Research Setup:**
- Análisis histórico profundo con 3+ años de datos
- S/R levels validados históricamente con scoring por toques
- Volume events y anomalías identificadas automáticamente
- Value areas de largo plazo para mean reversion
- **🆕 Scoring S/R histórico >80** en niveles críticos validados

### **⚠️ Nuevas Consideraciones v1.5.1**
- **Auto-save:** Todos los análisis se guardan automáticamente
- **Cache inteligente:** Primer request más lento, subsecuentes muy rápidos
- **Reportes:** Generación puede tomar 30-60 segundos
- **Storage:** Sistema almacena análisis indefinidamente
- **Performance:** `get_cache_stats` si notas lentitud
- **🆕 Historical cache:** Datos históricos se cachean hasta 24h
- **🆕 API limits:** Análisis histórico respeta rate limits de Bybit
- **🆕 Data freshness:** Datos históricos siempre desde fuente, análisis procesados se cachean

## 🚨 Troubleshooting v1.4.0

### **Si el MCP no responde:**
1. `get_cache_stats` para verificar estado del sistema
2. `clear_cache true` si hay problemas de memoria
3. Reinicia Claude Desktop como último recurso

### **Si hay datos inconsistentes:**
1. `invalidate_cache [SYMBOL]` para el símbolo específico
2. Verifica con `get_latest_analysis` si hay análisis recientes
3. `get_repository_stats` para verificar integridad del sistema

### **Si los reportes fallan:**
1. Verifica que tengas análisis suficientes con `get_analysis_history`
2. Usa `generate_symbol_report` individual en vez de múltiples símbolos
3. Reduce el período de tiempo del reporte

### **Para debugging avanzado:**
```
get_debug_logs         # Sistema general
get_cache_stats        # Performance y memoria
get_repository_stats   # Estado del almacenamiento
```

## 🎯 Nuevas Features v1.5.1

### **✅ Implementadas**
- **🆕 Repositorio de análisis** completo con 7 herramientas
- **🆕 Sistema de reportes** con 8 herramientas diferentes
- **🆕 Cache inteligente** con gestión automática
- **🆕 Auto-save** de todos los análisis
- **🆕 Búsquedas complejas** con filtros avanzados
- **🆕 Métricas agregadas** y analytics
- **🆕 Pattern detection** automático
- **🆕 Sistema de configuración** de timezone persistente
- **🆕 Análisis histórico** - 6 herramientas nuevas (TASK-017):
  - `get_historical_klines` - 800+ días de datos OHLCV
  - `analyze_historical_sr` - S/R histórico con scoring avanzado
  - `identify_volume_anomalies` - Eventos de volumen significativos
  - `get_price_distribution` - Value areas históricas
  - `identify_market_cycles` - Patrones cíclicos de mercado
  - `get_historical_summary` - Resumen histórico comprehensivo

### **🔜 Próximas Features**
- **Detección de trampas alcistas/bajistas** (Bull/Bear traps) - TASK-012
- **Datos on-chain** - Flujos de stablecoins y ballenas - TASK-013
- **Configuración de timezone** persistente - TASK-010
- **Detección de patrones Wyckoff** avanzados
- **Alertas automáticas** basadas en patrones
- **Integración completa con wAIckoff AI**

## 📊 Nuevas Capacidades del Sistema

### **Performance y Escalabilidad**
- **Cache hit rate:** 85%+ en uso típico
- **Análisis guardados:** Ilimitados con búsqueda rápida
- **Reportes:** Generación automática optimizada
- **Memory management:** Auto-cleanup y optimización

### **Analytics y Business Intelligence**
- **Historical tracking:** Tendencias de indicadores en el tiempo
- **Pattern recognition:** Detección automática de setups
- **Performance analytics:** ROI y precisión del sistema
- **Custom queries:** Búsquedas específicas por cualquier criterio

---

## 📞 Recordatorio de tu Setup

**Portfolio HODL:** 6,250 XRP, 7,500 HBAR, 500 ONDO  
**Capital Trading:** $2,000 USDC  
**Estrategias:** Grid (spot/futuros) + Swing (2x-4x leverage)  
**Risk:** 2-3% stop loss, máximo 3 posiciones simultáneas  
**🆕 Herramientas:** 46+ herramientas MCP con análisis histórico, auto-save y reportes

**¡El MCP v1.5.1 está listo para llevar tu trading al siguiente nivel con análisis profesional, almacenamiento inteligente, reportes automáticos y 3+ años de datos históricos!** 🚀
