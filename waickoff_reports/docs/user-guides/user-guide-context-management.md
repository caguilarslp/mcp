# 📝 Context Management User Guide v1.0

## 🎯 Introducción

El sistema de **Context Management** es una nueva característica diseñada para optimizar el uso del contexto en conversaciones largas con AI. Comprime automáticamente el historial de análisis manteniendo solo la información más relevante.

## ✨ Características Principales

### 1. **Compresión Inteligente**
- Ratio de compresión típico: **50:1**
- De análisis de 100KB a resúmenes de 2KB
- Mantiene métricas clave, patrones y niveles importantes

### 2. **Actualización Automática**
- Se actualiza con cada análisis realizado
- No requiere intervención manual
- Compatible con todos los tipos de análisis

### 3. **Vista Multi-Timeframe**
- Alineación temporal automática
- Detección de confluencias entre timeframes
- Tracking de tendencias históricas

## 🛠️ Herramientas Disponibles

### `get_analysis_context`
Obtiene contexto histórico comprimido para un símbolo.

**Parámetros:**
- `symbol` (requerido): Par de trading (ej: BTCUSDT)
- `format` (opcional): Formato de salida
  - `compressed` (default): Ultra-comprimido
  - `detailed`: Detallado por timeframe
  - `summary`: Resumen con estadísticas

**Ejemplo:**
```bash
get_analysis_context BTCUSDT compressed
```

**Salida comprimida:**
```
=== BTCUSDT Context Summary ===

[5] BULLISH (75%)
  S: 95234.50, 94567.00, 93890.25
  R: 97890.00, 98567.50, 99234.75
  Patterns: OB:3, FVG:2, BOS:1

[15] BULLISH (80%)
  S: 95100.00, 94200.00
  R: 98000.00, 99000.00
  Patterns: OB:5, FVG:3
```

### `get_timeframe_context`
Obtiene contexto para un timeframe específico.

**Parámetros:**
- `symbol`: Par de trading
- `timeframe`: Timeframe (5, 15, 60, 240, D)

**Ejemplo:**
```bash
get_timeframe_context BTCUSDT 60
```

### `get_multi_timeframe_context`
Vista integral multi-temporal con alineación.

**Parámetros:**
- `symbol`: Par de trading
- `timeframes` (opcional): Lista de timeframes

**Ejemplo:**
```bash
get_multi_timeframe_context BTCUSDT ["15","60","240"]
```

**Salida incluye:**
- Contexto por timeframe
- Score de alineación (0-100%)
- Interpretación de confluencias

### `add_analysis_context`
Agrega manualmente un análisis al contexto.

**Parámetros:**
- `symbol`: Par de trading
- `timeframe`: Timeframe
- `analysis`: Datos del análisis
- `type`: Tipo (technical, smc, wyckoff, complete)

### `update_context_config`
Configura el sistema de contexto.

**Parámetros opcionales:**
- `max_entries_per_symbol`: Máximo entradas por símbolo (default: 100)
- `summary_update_threshold`: Umbral para actualizar resumen (default: 10)
- `compression_level`: Nivel de compresión (low, medium, high)
- `retention_days`: Días de retención (default: 30)
- `auto_summarize`: Resumir automáticamente (default: true)

### `cleanup_context`
Limpia datos antiguos según política de retención.

**Parámetros:**
- `force` (opcional): Forzar limpieza

### `get_context_stats`
Obtiene estadísticas del sistema.

**Salida incluye:**
- Total de entradas y resúmenes
- Símbolos y timeframes únicos
- Tamaño total y ratio de compresión
- Distribución por símbolo

## 💡 Casos de Uso

### 1. **Antes de Analizar**
Siempre revisa el contexto histórico primero:
```bash
get_analysis_context BTCUSDT compressed
```

### 2. **Análisis Multi-Timeframe**
Para trading con confirmación múltiple:
```bash
get_multi_timeframe_context BTCUSDT
```

### 3. **Investigación de Patrones**
Contexto detallado para un timeframe:
```bash
get_timeframe_context BTCUSDT 60
```

### 4. **Mantenimiento**
Revisar estadísticas y limpiar si necesario:
```bash
get_context_stats
cleanup_context
```

## 🔧 Configuración Avanzada

### Ajustar Compresión
Para análisis más detallados:
```bash
update_context_config {
  "compression_level": "low",
  "max_entries_per_symbol": 200
}
```

### Retención Extendida
Para historial más largo:
```bash
update_context_config {
  "retention_days": 60,
  "summary_update_threshold": 5
}
```

## 📊 Interpretación de Datos

### Formato Comprimido
```
[TIMEFRAME] DIRECCION (CONFIANZA%)
  S: niveles de soporte
  R: niveles de resistencia
  Patterns: patrones detectados con frecuencia
```

### Alineación Multi-Timeframe
- **>80%**: Alineación fuerte - Alta probabilidad
- **50-80%**: Alineación moderada - Confirmar con otros indicadores
- **<50%**: Alineación débil - Precaución

### Patrones Frecuentes
- **OB**: Order Blocks
- **FVG**: Fair Value Gaps
- **BOS**: Break of Structure
- **CHoCH**: Change of Character
- **Spring/Upthrust**: Eventos Wyckoff

## 🎯 Mejores Prácticas

1. **Revisar contexto antes de cada sesión**
   - Proporciona perspectiva histórica
   - Identifica niveles clave recurrentes

2. **Usar multi-timeframe para confirmación**
   - Mayor alineación = mayor probabilidad
   - Confluencias históricas son más fuertes

3. **Mantener el sistema limpio**
   - Ejecutar `cleanup_context` mensualmente
   - Revisar `get_context_stats` regularmente

4. **Integrar con análisis actual**
   - Comparar niveles actuales con históricos
   - Buscar patrones recurrentes

## ⚡ Rendimiento

- **Velocidad**: <100ms para contexto comprimido
- **Memoria**: ~2KB por resumen vs 100KB por análisis
- **Escalabilidad**: Soporta miles de análisis
- **Persistencia**: Compatible con MongoDB y FileSystem

## 🚀 Ejemplo de Flujo Completo

```bash
# 1. Obtener contexto histórico
get_analysis_context BTCUSDT compressed

# 2. Revisar alineación multi-timeframe
get_multi_timeframe_context BTCUSDT

# 3. Realizar nuevo análisis
get_smc_dashboard BTCUSDT 60

# 4. El contexto se actualiza automáticamente

# 5. Verificar actualización
get_timeframe_context BTCUSDT 60
```

## 📌 Notas Importantes

- El contexto se actualiza **automáticamente** con cada análisis
- Los datos más antiguos que `retention_days` se eliminan automáticamente
- La compresión **no pierde información crítica** para trading
- Compatible con todas las herramientas de análisis existentes

---

*Context Management User Guide v1.0 - Sistema de gestión de contexto histórico optimizado*
