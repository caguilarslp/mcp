# 🧠 Context Management Guide - wAIckoff MCP Server

Guía completa del sistema de contexto histórico para análisis de mercado con memoria a largo plazo.

## 🎯 ¿Qué es Context Management?

El **Sistema de Contexto Histórico** es una funcionalidad única que permite al servidor MCP wAIckoff:

- **Recordar análisis anteriores** y detectar patrones recurrentes
- **Analizar continuidad temporal** entre sesiones de trading
- **Generar insights contextuales** basados en comportamiento histórico
- **Comprimir datos históricos** de manera inteligente para LLMs
- **Detectar cambios de tendencia** y evolución de estructuras de mercado

## ✨ Funcionalidades Clave

### 🔄 Guardado Automático
- **Todos los análisis principales** se guardan automáticamente con contexto
- **Metadatos enriquecidos** incluyen timeframe, condiciones de mercado, calidad de datos
- **Compresión inteligente** optimizada para análisis posteriores

### 📊 Análisis de Continuidad
- **Scoring de continuidad** entre análisis actual e histórico
- **Detección de patrones persistentes** vs cambios estructurales
- **Assessment de estabilidad** de niveles clave

### 🎨 Context Enhancement
- **Insights específicos por metodología** (Wyckoff, SMC, Technical)
- **Evaluación de significancia histórica** de eventos
- **Análisis de persistencia** de señales y setups

## 🛠️ Herramientas Disponibles (7)

### 1. `get_analysis_context`
**Propósito:** Obtener contexto histórico comprimido para un símbolo

```bash
# Contexto básico
get_analysis_context symbol="BTCUSDT"

# Contexto detallado
get_analysis_context symbol="BTCUSDT" format="detailed"

# Contexto resumido para LLMs
get_analysis_context symbol="BTCUSDT" format="summary"
```

**Respuesta incluye:**
- Resumen de análisis históricos
- Patrones detectados recurrentes
- Niveles de soporte/resistencia persistentes
- Cambios de tendencia significativos
- Contexto temporal comprimido

### 2. `get_timeframe_context`
**Propósito:** Contexto específico para un timeframe

```bash
# Contexto para timeframe específico
get_timeframe_context symbol="BTCUSDT" timeframe="60"

# Contexto para trading diario
get_timeframe_context symbol="ETHUSDT" timeframe="D"
```

**Útil para:**
- Análisis específico por timeframe
- Comparar comportamiento entre escalas temporales
- Optimizar estrategias por horizonte temporal

### 3. `get_multi_timeframe_context`
**Propósito:** Contexto agregado de múltiples timeframes

```bash
# Contexto multi-timeframe estándar
get_multi_timeframe_context symbol="BTCUSDT"

# Contexto con timeframes específicos
get_multi_timeframe_context symbol="BTCUSDT" timeframes=["15","60","240","D"]
```

**Características:**
- **Alignment Score:** Coherencia entre timeframes
- **Conflictos detectados:** Señales contradictorias
- **Consenso multi-timeframe:** Bias dominante
- **Niveles confluentes:** Zonas importantes en múltiples escalas

### 4. `add_analysis_context`
**Propósito:** Agregar análisis personalizado al contexto

```bash
# Agregar análisis técnico
add_analysis_context symbol="BTCUSDT" timeframe="60" analysis={...} type="technical"

# Agregar análisis SMC
add_analysis_context symbol="ETHUSDT" timeframe="240" analysis={...} type="smc"
```

**Tipos soportados:**
- `technical` - Análisis técnico general
- `smc` - Smart Money Concepts
- `wyckoff` - Análisis Wyckoff
- `complete` - Análisis completo

### 5. `update_context_config`
**Propósito:** Configurar parámetros del sistema de contexto

```bash
# Configuración básica
update_context_config compression_level="medium" max_entries_per_symbol=50

# Configuración avanzada
update_context_config {
  "compression_level": "high",
  "max_entries_per_symbol": 100,
  "retention_days": 30,
  "auto_summarize": true,
  "summary_update_threshold": 10
}
```

**Parámetros configurables:**
- `compression_level`: low/medium/high - Nivel de compresión
- `max_entries_per_symbol`: Máximo de entradas por símbolo
- `retention_days`: Días de retención de datos
- `auto_summarize`: Resumen automático
- `summary_update_threshold`: Umbral para actualizar resúmenes

### 6. `cleanup_context`
**Propósito:** Limpiar datos antiguos del contexto

```bash
# Limpieza estándar (respeta retention policy)
cleanup_context

# Limpieza forzada
cleanup_context force=true
```

**Funcionalidad:**
- Elimina datos expirados según retention_days
- Comprime datos antiguos automáticamente
- Optimiza almacenamiento manteniendo información clave

### 7. `get_context_stats`
**Propósito:** Estadísticas y estado del sistema de contexto

```bash
# Estadísticas generales
get_context_stats

# Estadísticas para símbolo específico
get_context_stats symbol="BTCUSDT"
```

**Información incluida:**
- Total de análisis guardados
- Distribución por símbolo y timeframe
- Uso de storage y eficiencia de compresión
- Performance del sistema de contexto
- Estadísticas de acceso y utilización

## 🎨 Casos de Uso Prácticos

### 🌅 Análisis Matutino con Contexto
```bash
# 1. Obtener contexto histórico
get_analysis_context symbol="BTCUSDT"

# 2. Análisis actual con contexto previo
get_smc_dashboard symbol="BTCUSDT"

# 3. Comparar con análisis multi-timeframe histórico
get_multi_timeframe_context symbol="BTCUSDT"
```

**Beneficio:** Entender cómo ha evolucionado el mercado desde análisis anteriores

### 📈 Seguimiento de Setups
```bash
# 1. Validar setup actual
validate_smc_setup symbol="BTCUSDT" setupType="long"

# 2. Revisar contexto histórico de setups similares
get_timeframe_context symbol="BTCUSDT" timeframe="60"

# 3. Evaluar persistencia de niveles clave
get_analysis_context symbol="BTCUSDT" format="detailed"
```

**Beneficio:** Evaluar probabilidad de éxito basado en comportamiento histórico

### 🔍 Investigación de Cambios de Tendencia
```bash
# 1. Contexto multi-timeframe para detectar divergencias
get_multi_timeframe_context symbol="BTCUSDT"

# 2. Análisis Wyckoff con contexto de fases anteriores
analyze_wyckoff_phase symbol="BTCUSDT"

# 3. Evaluar significancia histórica del cambio
get_analysis_context symbol="BTCUSDT"
```

**Beneficio:** Identificar si los cambios son estructurales o temporales

### ⚙️ Optimización de Estrategias
```bash
# 1. Estadísticas históricas de performance
get_context_stats symbol="BTCUSDT"

# 2. Patrones recurrentes en timeframe específico
get_timeframe_context symbol="BTCUSDT" timeframe="240"

# 3. Configurar sistema según hallazgos
update_context_config compression_level="high" retention_days=60
```

**Beneficio:** Optimizar parámetros basado en datos históricos reales

## 🔧 Configuración Recomendada

### Para Day Trading
```bash
update_context_config {
  "compression_level": "medium",
  "max_entries_per_symbol": 30,
  "retention_days": 7,
  "auto_summarize": true,
  "summary_update_threshold": 5
}
```

### Para Swing Trading
```bash
update_context_config {
  "compression_level": "low",
  "max_entries_per_symbol": 50,
  "retention_days": 30,
  "auto_summarize": true,
  "summary_update_threshold": 10
}
```

### Para Análisis Institucional
```bash
update_context_config {
  "compression_level": "low",
  "max_entries_per_symbol": 100,
  "retention_days": 90,
  "auto_summarize": false,
  "summary_update_threshold": 20
}
```

## 📊 Interpretación de Resultados

### Context Enhancement Score
- **90-100%:** Excelente continuidad, patrones muy consistentes
- **70-89%:** Buena continuidad, algunos cambios menores
- **50-69%:** Continuidad moderada, evaluar cambios estructurales
- **30-49%:** Baja continuidad, posibles cambios de tendencia
- **0-29%:** Ruptura estructural significativa

### Alignment Score (Multi-timeframe)
- **80-100%:** Fuerte consenso entre timeframes
- **60-79%:** Consenso moderado con algunas divergencias
- **40-59%:** Señales mixtas, requiere análisis adicional
- **20-39%:** Conflictos significativos entre timeframes
- **0-19%:** Fuerte desalineación, mercado en transición

## 🚨 Mejores Prácticas

### ✅ Hacer
- **Revisar contexto antes de análisis principales**
- **Configurar retention según estilo de trading**
- **Usar multi-timeframe context para confluencias**
- **Limpiar contexto regularmente**
- **Monitorear estadísticas de uso**

### ❌ Evitar
- **Ignorar cambios súbitos en continuity score**
- **Usar solo contexto sin análisis actual**
- **Retener datos excesivos sin compresión**
- **Configurar retention muy corto para swing trading**
- **No actualizar configuración según evolución del mercado**

## 🔮 Context-Enhanced Analysis

El sistema automáticamente enriquece los siguientes análisis con contexto:

### Smart Money Concepts
- Persistencia de Order Blocks históricos
- Evolución de Fair Value Gaps
- Patrones recurrentes de Break of Structure

### Wyckoff Analysis
- Progresión histórica de fases
- Significancia de eventos actuales vs históricos
- Continuidad de Composite Man behavior

### Technical Analysis
- Estabilidad de niveles de soporte/resistencia
- Evolución de volatilidad y volumen
- Persistencia de patrones técnicos

## 🎯 Tips Avanzados

### Análisis de Convergencia
```bash
# Combinar contexto + análisis actual para detectar convergencias
get_multi_timeframe_context symbol="BTCUSDT"
get_smc_dashboard symbol="BTCUSDT"
find_technical_confluences symbol="BTCUSDT"
```

### Detección de Anomalías
```bash
# Usar contexto para identificar comportamientos atípicos
get_analysis_context symbol="BTCUSDT"
analyze_wyckoff_phase symbol="BTCUSDT"
# Comparar resultados con patrones históricos
```

### Validación Cross-Timeframe
```bash
# Validar setups usando contexto de múltiples escalas
get_timeframe_context symbol="BTCUSDT" timeframe="60"
get_timeframe_context symbol="BTCUSDT" timeframe="240"
validate_smc_setup symbol="BTCUSDT" setupType="long"
```

## 🔗 Integración con Otras Herramientas

### Con Smart Money Concepts
- Context enhancement automático en dashboard SMC
- Evaluación de persistencia de niveles institucionales
- Detección de cambios en bias de mercado

### Con Wyckoff Analysis
- Análisis de progresión de fases con contexto histórico
- Evaluación de significancia de eventos actuales
- Tracking de Composite Man behavior patterns

### Con Multi-Exchange Analysis
- Contexto de divergencias históricas entre exchanges
- Patrones de dominancia temporal
- Evolución de spreads y oportunidades de arbitraje

## 📈 Monitoreo y Mantenimiento

### Verificación Regular
```bash
# Cada semana
get_context_stats
cleanup_context

# Cada mes
update_context_config # Revisar y ajustar parámetros
```

### Optimización de Performance
- Monitorear uso de storage con `get_context_stats`
- Ajustar `compression_level` según necesidades
- Configurar `retention_days` apropiadamente para estilo de trading

## 🌟 Características Únicas

### 🔄 Auto-Enhancement
- **Contexto automático** en análisis principales
- **No requiere configuración manual** en la mayoría de casos
- **Integración transparente** con herramientas existentes

### 🧠 Inteligencia Adaptativa
- **Algoritmos de compresión** optimizados para datos de mercado
- **Detección automática** de patrones recurrentes
- **Scoring dinámico** de relevancia temporal

### 📊 Análisis Evolutivo
- **Tracking de cambios estructurales** en tiempo real
- **Evaluación de persistencia** de señales y niveles
- **Contexto temporal enriquecido** para mejor toma de decisiones

---

*El sistema de Context Management convierte al servidor MCP wAIckoff en el primer sistema de análisis de mercado con verdadera memoria histórica y capacidad de aprendizaje continuo.*
