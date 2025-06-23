# 📖 Guía de Usuario - Context Management & Trap Detection

**Fecha:** 18/06/2025  
**Versión:** v1.8.3  
**Estado:** ✅ COMPLETAMENTE OPERATIVAS (post TASK-031)

## 🎯 Resumen Ejecutivo

Después de la resolución del TASK-031, las herramientas de **Context Management** y **Trap Detection** están **100% operativas**. Este documento describe cómo usar estas herramientas críticas del sistema wAIckoff MCP.

### ✅ Estado Actual
- **Context Management**: 7 herramientas ✅ 100% funcional
- **Trap Detection**: 7 herramientas ✅ 100% funcional
- **Error JSON Format**: ✅ RESUELTO completamente
- **Disponibilidad**: 24/7 sin interrupciones

---

## 📊 Context Management - 7 Herramientas

### 1. `get_analysis_context` - Contexto Histórico Comprimido

**Descripción**: Obtiene el contexto histórico comprimido para un símbolo específico con múltiples formatos.

**Parámetros**:
```json
{
  "symbol": "BTCUSDT",
  "format": "compressed" | "detailed" | "summary"
}
```

**Formatos disponibles**:
- **compressed**: Contexto ultra-comprimido para análisis rápido
- **detailed**: Información detallada por timeframe
- **summary**: Resumen ejecutivo con tendencias dominantes

**Ejemplo de uso**:
```bash
# Contexto comprimido
get_analysis_context {"symbol": "BTCUSDT", "format": "compressed"}

# Resumen ejecutivo
get_analysis_context {"symbol": "ETHUSDT", "format": "summary"}
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "timestamp": "2025-06-18T...",
  "data": {
    "symbol": "BTCUSDT",
    "format": "compressed",
    "context": {
      "trend_summary": "bullish_momentum_strong",
      "key_levels": [65000, 67500, 70000],
      "confidence": 85
    }
  }
}
```

### 2. `get_timeframe_context` - Contexto por Timeframe

**Descripción**: Obtiene el contexto específico para un timeframe particular.

**Parámetros**:
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "60"
}
```

**Timeframes soportados**: `"5"`, `"15"`, `"30"`, `"60"`, `"240"`, `"D"`

**Ejemplo de uso**:
```bash
get_timeframe_context {"symbol": "BTCUSDT", "timeframe": "60"}
```

### 3. `add_analysis_context` - Agregar Análisis al Contexto

**Descripción**: Agrega un nuevo análisis al contexto histórico del sistema.

**Parámetros**:
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "60",
  "analysis": {
    "trend": "bullish",
    "strength": 75,
    "signals": ["breakout_confirmed"]
  },
  "type": "technical"
}
```

**Tipos de análisis**: `"technical"`, `"smc"`, `"wyckoff"`, `"complete"`

### 4. `get_multi_timeframe_context` - Análisis Multi-Timeframe

**Descripción**: Obtiene contexto de múltiples timeframes con análisis de alineación.

**Parámetros**:
```json
{
  "symbol": "BTCUSDT",
  "timeframes": ["5", "15", "60", "240", "D"]
}
```

**Características especiales**:
- **Alignment Score**: Calcula alineación entre timeframes
- **Trend Distribution**: Distribución de tendencias por timeframe
- **Interpretación automática**: Strong/Moderate/Weak alignment

### 5. `update_context_config` - Configuración de Contexto

**Descripción**: Actualiza la configuración del sistema de contexto.

**Parámetros configurables**:
```json
{
  "retention_days": 30,
  "compression_level": "medium",
  "auto_summarize": true,
  "max_entries_per_symbol": 1000
}
```

### 6. `cleanup_context` - Limpieza de Datos Antiguos

**Descripción**: Limpia datos de contexto antiguos según la política de retención.

**Parámetros**:
```json
{
  "force": false
}
```

### 7. `get_context_stats` - Estadísticas de Uso

**Descripción**: Obtiene estadísticas completas del sistema de contexto.

**Información proporcionada**:
- Número total de entradas y resúmenes
- Símbolos únicos analizados
- Timeframes utilizados
- Tamaño total de datos
- Ratio de compresión promedio

---

## 🎯 Trap Detection - 7 Herramientas

### 1. `detect_bull_trap` - Detección de Bull Traps

**Descripción**: Detecta trampas alcistas (false breakouts hacia arriba) con análisis avanzado.

**Parámetros**:
```json
{
  "symbol": "BTCUSDT",
  "sensitivity": "medium"
}
```

**Niveles de sensibilidad**:
- **low**: Detecta solo traps muy obvios (alta precisión)
- **medium**: Balance entre precisión y detección (recomendado)
- **high**: Detecta más traps potenciales (más alertas)

**Ejemplo de uso**:
```bash
detect_bull_trap {"symbol": "BTCUSDT", "sensitivity": "high"}
```

**Respuesta con bull trap detectado**:
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "hasBullTrap": true,
    "analysis": {
      "trapType": "bull_trap",
      "probability": 85,
      "keyLevel": 67500,
      "priceTargets": [65000, 62500],
      "timeWindow": "2-6 hours",
      "riskLevel": "HIGH"
    },
    "summary": "HIGH bull trap detected! 85% probability of false upward breakout...",
    "recommendations": [
      "🔴 Avoid long positions above $67,500",
      "🎯 Watch for price return to $65,000",
      "🚨 HIGH CONFIDENCE: Consider short position with tight stop"
    ]
  }
}
```

### 2. `detect_bear_trap` - Detección de Bear Traps

**Descripción**: Detecta trampas bajistas (false breakdowns hacia abajo).

**Parámetros**: Idénticos a `detect_bull_trap`

**Funcionalidad**: Similar a bull trap pero para breakdowns falsos.

### 3. `get_trap_history` - Historial de Traps

**Descripción**: Obtiene el historial de traps detectados para análisis estadístico.

**Parámetros**:
```json
{
  "symbol": "BTCUSDT",
  "days": 30,
  "trapType": "both"
}
```

**Tipos de trap**: `"bull"`, `"bear"`, `"both"`

**Información proporcionada**:
- Total de traps detectados
- Distribución bull/bear
- Historial detallado con formato human-readable
- Resumen de performance

### 4. `get_trap_statistics` - Estadísticas de Performance

**Descripción**: Obtiene estadísticas de precisión y performance del sistema de detección.

**Parámetros**:
```json
{
  "symbol": "BTCUSDT",
  "period": "30d"
}
```

**Períodos disponibles**: `"7d"`, `"30d"`, `"90d"`, `"1y"`

**Métricas incluidas**:
- Precisión del sistema (accuracy %)
- Falsos positivos
- Tiempo promedio de detección
- Recomendaciones de optimización

### 5. `configure_trap_detection` - Configuración Avanzada

**Descripción**: Configura parámetros avanzados del sistema de detección.

**Parámetros configurables**:
```json
{
  "sensitivity": "medium",
  "volumeThreshold": 1.5,
  "orderbookDepthRatio": 0.7,
  "timeWindowMinutes": 30,
  "minimumBreakout": 1.0,
  "confidenceThreshold": 70
}
```

### 6. `validate_breakout` - Validación de Breakouts

**Descripción**: Valida si hay un breakout activo y analiza su legitimidad.

**Parámetros**:
```json
{
  "symbol": "BTCUSDT"
}
```

**Análisis proporcionado**:
- Detección de breakout activo
- Dirección del breakout
- Análisis de volumen
- Recomendaciones específicas

### 7. `get_trap_performance` - Métricas del Sistema

**Descripción**: Obtiene métricas de performance técnica del sistema de detección.

**Sin parámetros requeridos**

**Información técnica**:
- Tiempo promedio de ejecución
- Tasa de éxito de operaciones
- Total de operaciones realizadas

---

## 🚀 Casos de Uso Prácticos

### Caso 1: Análisis Completo de Contexto
```bash
# 1. Obtener contexto general
get_analysis_context {"symbol": "BTCUSDT", "format": "summary"}

# 2. Análizar timeframe específico
get_timeframe_context {"symbol": "BTCUSDT", "timeframe": "60"}

# 3. Verificar alineación multi-timeframe
get_multi_timeframe_context {"symbol": "BTCUSDT"}
```

### Caso 2: Detección de Trampas Pre-Trading
```bash
# 1. Detectar bull traps
detect_bull_trap {"symbol": "BTCUSDT", "sensitivity": "medium"}

# 2. Detectar bear traps  
detect_bear_trap {"symbol": "BTCUSDT", "sensitivity": "medium"}

# 3. Validar breakout actual
validate_breakout {"symbol": "BTCUSDT"}
```

### Caso 3: Análisis Histórico de Performance
```bash
# 1. Obtener historial de traps
get_trap_history {"symbol": "BTCUSDT", "days": 30, "trapType": "both"}

# 2. Revisar estadísticas
get_trap_statistics {"symbol": "BTCUSDT", "period": "30d"}

# 3. Verificar estadísticas de contexto
get_context_stats {}
```

---

## ⚠️ Consideraciones Importantes

### Context Management
1. **Retención de datos**: Por defecto 30 días, configurable
2. **Compresión automática**: Reduce el tamaño de datos históricos
3. **Multi-timeframe**: Siempre analizar múltiples timeframes para confluencia
4. **Limpieza periódica**: Ejecutar cleanup_context semanalmente

### Trap Detection  
1. **Sensibilidad**: Usar "medium" como default, ajustar según experiencia
2. **Volumen**: Los traps requieren confirmación de volumen
3. **Timing**: Los traps son eventos temporales (2-6 horas típicamente)
4. **Risk Management**: NUNCA ignorar alertas de traps de alta confianza

### Error Handling
- Todas las herramientas manejan errores gracefully
- Respuestas siempre incluyen timestamp y status
- Logs detallados disponibles para debugging

---

## 🔧 Troubleshooting

### Problemas Comunes

**❌ Problema**: No se obtiene contexto para un símbolo
**✅ Solución**: Verificar que el símbolo tenga datos históricos, usar `add_analysis_context` si es necesario

**❌ Problema**: Trap detection retorna falsos positivos
**✅ Solución**: Reducir sensibilidad a "low" o ajustar `configure_trap_detection`

**❌ Problema**: Context stats muestra datos vacíos
**✅ Solución**: El sistema necesita tiempo para acumular datos, usar por al menos 24h

### Optimización de Performance

1. **Context Management**: Usar formato "compressed" para análisis rápido
2. **Trap Detection**: Configurar parámetros según el estilo de trading
3. **Cleanup regular**: Mantener datos limpios mejora performance

---

## 📋 Checklist de Verificación

### ✅ Context Management
- [ ] Contexto comprimido disponible para símbolos principales
- [ ] Multi-timeframe alignment configurado
- [ ] Cleanup automático activado
- [ ] Estadísticas de uso revisadas

### ✅ Trap Detection
- [ ] Sensibilidad calibrada para cada símbolo
- [ ] Historial de traps analizado
- [ ] Performance statistics dentro de rangos aceptables
- [ ] Configuración optimizada para estilo de trading

---

*Guía actualizada post TASK-031 - Sistema 100% operativo*  
*Para soporte técnico, consultar trazabilidad-errores.md*
