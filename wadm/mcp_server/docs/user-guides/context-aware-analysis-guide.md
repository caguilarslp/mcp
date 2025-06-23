# 📖 wAIckoff MCP - Guía de Análisis Contextual v1.10.1

## 🎯 Introducción al Análisis Contextual

El sistema wAIckoff MCP ahora incluye **análisis contextual automático**, que combina el análisis técnico tradicional con contexto histórico para generar insights más precisos y recomendaciones ajustadas por riesgo.

### ✨ Nuevas Funcionalidades
- **Contexto histórico automático** - Análisis de 30+ días de historia
- **Scoring de continuidad** - Medición matemática 0-100%
- **Recomendaciones graduales** - 4 niveles de acción
- **Comparación inteligente** - Patrones actuales vs históricos

---

## 🛠️ Herramientas Disponibles

### 1. analyze_with_historical_context
**Análisis técnico mejorado con contexto histórico**

```json
{
  "name": "analyze_with_historical_context",
  "arguments": {
    "symbol": "BTCUSDT",
    "timeframe": "60",
    "periods": 100,
    "includeHistoricalContext": true,
    "contextLookbackDays": 30,
    "updateContextAfterAnalysis": true
  }
}
```

**Respuesta incluye:**
- `originalAnalysis` - Análisis técnico completo tradicional
- `historicalContext` - Contexto histórico relevante con niveles cercanos
- `contextConfidence` - Score de continuidad histórica (0-100%)
- `recommendations` - Recomendaciones ajustadas por contexto

### 2. complete_analysis_with_context
**Análisis completo mejorado con contexto histórico + grid trading**

```json
{
  "name": "complete_analysis_with_context",
  "arguments": {
    "symbol": "ETHUSDT",
    "investment": 1000,
    "contextLookbackDays": 45
  }
}
```

**Respuesta incluye:**
- Todo lo anterior + análisis de grid trading contextual
- Recomendaciones de grid ajustadas por niveles históricos
- Análisis de riesgo mejorado con contexto temporal

---

## 📊 Interpretando los Resultados

### 🎯 Context Confidence Score (0-100%)

| Rango | Interpretación | Acción Recomendada |
|-------|----------------|-------------------|
| 80-100% | **Alta continuidad** - Señales alineadas con historia | `consider_entry` |
| 60-79% | **Continuidad moderada** - Señales generalmente alineadas | `monitor_closely` |
| 40-59% | **Continuidad mixta** - Señales neutras o conflictivas | `monitor` |
| 20-39% | **Baja continuidad** - Señales divergen de historia | `wait` |
| 0-19% | **Divergencia alta** - Señales contrarias a historia | `reduce_exposure` |

### 🔍 Alineación de Patrones

**Tipos de alineación:**
- **Confirmed** ✅ - Patrones actuales confirman tendencia histórica
- **Divergent** ⚠️ - Patrones actuales divergen de tendencia histórica
- **Neutral** ➖ - Señales mixtas o poco claras

### 📈 Bias de Mercado

**Estados de alineación:**
- **Strengthening** 🔥 - Tendencia histórica se fortalece
- **Aligned** ✅ - Tendencia actual alineada con historia
- **Weakening** ⚠️ - Tendencia histórica se debilita
- **Divergent** ❌ - Tendencia actual opuesta a historia

---

## 💡 Casos de Uso Prácticos

### 🎯 Caso 1: Entry con Alta Confianza
```json
{
  "contextConfidence": 85,
  "recommendations": {
    "action": "consider_entry",
    "reason": "Current signals strengthen historical trend with high confidence. Multiple historical levels nearby suggest important price area",
    "confidence": 85,
    "riskAdjustment": "decrease"
  }
}
```

**Interpretación:** Excelente oportunidad de entrada con riesgo reducido.

### ⚠️ Caso 2: Señales Divergentes
```json
{
  "contextConfidence": 25,
  "recommendations": {
    "action": "wait",
    "reason": "Current signals diverge significantly from historical trend",
    "confidence": 25,
    "riskAdjustment": "increase"
  }
}
```

**Interpretación:** Esperar confirmación adicional antes de actuar.

### 📊 Caso 3: Área de Interés Histórica
```json
{
  "historicalContext": {
    "summary": "3 historical levels nearby, strongest support at 43250.00. 2 patterns confirm historical trend. Market bias is aligned with historical trend. High continuity with historical analysis",
    "keyLevelsNearby": [
      {
        "level": 43250.00,
        "type": "support",
        "strength": 85,
        "touches": 7
      }
    ]
  }
}
```

**Interpretación:** Área con fuerte respaldo histórico, nivel clave a observar.

---

## 🔄 Workflow Recomendado

### 1. 📋 Análisis Inicial
```bash
# Análisis técnico contextual
analyze_with_historical_context BTCUSDT --timeframe 60
```

### 2. 🎯 Evaluación de Contexto
- Revisar `contextConfidence` score
- Analizar `patternAlignments`
- Verificar `keyLevelsNearby`

### 3. 💰 Análisis Completo (si prometedor)
```bash
# Análisis completo con grid trading
complete_analysis_with_context BTCUSDT --investment 1000
```

### 4. 📊 Toma de Decisión
- Seguir `recommendations.action`
- Aplicar `riskAdjustment`
- Monitorear niveles históricos clave

---

## ⚙️ Configuración Avanzada

### 🕐 Ajustar Período de Contexto
```json
{
  "contextLookbackDays": 60  // Más historia = más conservador
}
```

### 📊 Timeframes Recomendados
- **Scalping:** 5-15 minutos + contexto 7 días
- **Day Trading:** 60 minutos + contexto 30 días  
- **Swing Trading:** 240 minutos + contexto 90 días

### 🎯 Umbral de Confianza
```json
{
  "confidenceThreshold": 70  // Solo actuar con 70%+ confianza
}
```

---

## 🚀 Tips de Uso Avanzado

### 💎 Combinación con Otros Análisis
1. **Análisis contextual** para dirección general
2. **SMC analysis** para puntos de entrada precisos
3. **Wyckoff analysis** para confirmar fase de mercado
4. **Multi-exchange** para validar señales

### 📈 Maximizar Precisión
- Usar múltiples timeframes para confirmación
- Combinar con análisis de volumen
- Verificar correlación con Bitcoin (para altcoins)
- Monitorear eventos macro importantes

### ⚠️ Gestión de Riesgo
- **Alta confianza (80%+):** Riesgo normal
- **Confianza media (50-80%):** Reducir posición 50%
- **Baja confianza (<50%):** Evitar entrada o posición mínima

---

## 🔧 Troubleshooting

### ❓ Problemas Comunes

**Q: ¿Por qué contextConfidence es bajo?**
A: Puede indicar:
- Cambio reciente en tendencia de mercado
- Datos históricos limitados para el símbolo
- Señales técnicas mixtas o conflictivas

**Q: ¿Qué significa "No historical levels nearby"?**
A: El precio actual no está cerca de niveles históricos importantes. Puede indicar:
- Movimiento en territorio nuevo
- Oportunidad o riesgo según dirección

**Q: ¿Cuándo ignorar las recomendaciones contextuales?**
A: Considera otros factores si:
- Hay noticias fundamentales importantes
- Eventos macro afectan el mercado
- Cambios regulatorios significativos

---

## 📚 Ejemplos Completos

### Ejemplo 1: BTC Analysis
```json
{
  "name": "complete_analysis_with_context",
  "arguments": {
    "symbol": "BTCUSDT",
    "investment": 5000,
    "contextLookbackDays": 30
  }
}
```

### Ejemplo 2: ETH Scalping
```json
{
  "name": "analyze_with_historical_context", 
  "arguments": {
    "symbol": "ETHUSDT",
    "timeframe": "15",
    "contextLookbackDays": 7,
    "periods": 50
  }
}
```

### Ejemplo 3: Altcoin Swing
```json
{
  "name": "complete_analysis_with_context",
  "arguments": {
    "symbol": "ADAUSDT", 
    "investment": 1000,
    "contextLookbackDays": 60
  }
}
```

---

**📝 Nota:** Esta funcionalidad está en constante evolución. El sistema aprende de cada análisis para mejorar la precisión de futuras predicciones.

**🆕 Versión:** v1.10.1 - Análisis Contextual  
**📅 Última actualización:** 19/06/2025
