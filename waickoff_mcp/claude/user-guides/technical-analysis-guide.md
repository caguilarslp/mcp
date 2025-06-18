# 📈 Guía de Análisis Técnico Avanzado - wAIckoff MCP

## 🎯 Herramientas de Análisis Técnico Profesional

Este documento detalla las herramientas de análisis técnico avanzado disponibles en wAIckoff MCP v1.7.1: **Fibonacci**, **Elliott Wave**, **Bollinger Bands** y **Confluencias Técnicas**.

---

## 🔢 Fibonacci - Detección Automática de Swings

### `calculate_fibonacci_levels`

**La herramienta más avanzada de Fibonacci con detección automática de swings significativos.**

#### 🎯 Características Principales

- ✅ **Detección Automática de Swings** - No necesitas especificar high/low manualmente
- ✅ **Validación Robusta** - Garantiza que High > Low siempre
- ✅ **Sistema Multicapa** - Múltiples fallbacks para casos extremos
- ✅ **Análisis de Confluencias** - Detecta confluencias con S/R existentes
- ✅ **Scoring de Fuerza** - Cada nivel tiene un score basado en confluencias

#### 📊 Cómo Funciona

1. **Detección de Swings**:
   - Analiza automáticamente los últimos 100 períodos
   - Identifica swings significativos basados en estructura
   - Valida con volumen y fuerza del movimiento
   - Fallback a extremos absolutos si no hay swings claros

2. **Validación**:
   - Siempre verifica High > Low antes de calcular
   - Si encuentra datos invertidos, los corrige automáticamente
   - Múltiples capas de validación para datos edge-case

3. **Cálculo de Niveles**:
   - Retrocesos: 23.6%, 38.2%, 50%, 61.8%, 78.6%
   - Extensiones: 100%, 127.2%, 141.4%, 161.8%, 200%, 261.8%
   - Confluencias con S/R existentes aumentan el score

#### 💡 Ejemplos de Uso

```bash
# Análisis básico - detecta swings automáticamente
calculate_fibonacci_levels BTCUSDT

# Con sensibilidad personalizada para swings más pequeños
calculate_fibonacci_levels ETHUSDT minSwingSize=1.0

# Timeframe específico
calculate_fibonacci_levels XRPUSDT timeframe=240

# Niveles personalizados
calculate_fibonacci_levels BTCUSDT retracementLevels=[0.382,0.5,0.618]
```

#### 📋 Respuesta Típica

```json
{
  "symbol": "BTCUSDT",
  "currentPrice": 44520.50,
  "trend": "uptrend",
  "swingHigh": {
    "price": 45832.10,
    "timestamp": "2025-06-13T10:00:00Z",
    "strength": 85.5
  },
  "swingLow": {
    "price": 42156.30,
    "timestamp": "2025-06-12T14:00:00Z",
    "strength": 82.3
  },
  "keyLevels": [
    {
      "level": 0.618,
      "price": 43879.45,
      "label": "61.8%",
      "type": "retracement",
      "strength": 92,
      "distance": "-1.5%"
    }
  ],
  "currentPosition": {
    "nearestLevel": {
      "level": 0.5,
      "price": 43994.20,
      "distance": "-1.2%"
    },
    "retracement": 35.7,
    "nextTargets": [...]
  },
  "confidence": 87.5,
  "validity": 95.0
}
```

---

## 🌊 Elliott Wave - Detección de Patrones

### `detect_elliott_waves`

**Identifica patrones de ondas de Elliott con validación estricta de reglas.**

#### 🎯 Características Principales

- ✅ **Detección de Secuencias** - Impulsivas (5 ondas) y Correctivas (3 ondas)
- ✅ **Validación de Reglas** - Wave 2, 3, 4 rules enforcement
- ✅ **Proyecciones Fibonacci** - Targets basados en ratios clásicos
- ✅ **Multi-Degree** - Detecta ondas en múltiples grados temporales

#### 📊 Reglas Validadas

1. **Regla de Onda 2**: No puede retroceder más del 100% de Onda 1
2. **Regla de Onda 3**: Nunca es la más corta de las ondas impulsivas
3. **Regla de Onda 4**: No puede solaparse con territorio de Onda 1
4. **Alternancia**: Ondas 2 y 4 tienden a alternar en forma

#### 💡 Ejemplos de Uso

```bash
# Detección básica con reglas estrictas
detect_elliott_waves BTCUSDT

# Sin reglas estrictas (más detecciones, menos precisión)
detect_elliott_waves ETHUSDT strictRules=false

# Con proyecciones de targets
detect_elliott_waves SOLUSDT includeProjections=true

# Ondas más pequeñas
detect_elliott_waves XRPUSDT minWaveLength=0.5
```

#### 📋 Respuesta Típica

```json
{
  "currentSequence": {
    "type": "impulsive",
    "waves": [
      {
        "number": 1,
        "start": 42000,
        "end": 44500,
        "length": 5.95,
        "fibonacci": 1.0
      },
      {
        "number": 2,
        "start": 44500,
        "end": 43200,
        "length": -2.92,
        "retracement": 0.52
      }
    ],
    "isComplete": false,
    "degree": "minor",
    "validity": 92.5
  },
  "currentWave": {
    "position": "Wave 3 in progress",
    "nextExpected": "Wave 3 completion around 47500"
  },
  "projections": [
    {
      "targetWave": "3",
      "targets": {
        "conservative": 46800,
        "normal": 47500,
        "extended": 48900
      },
      "probability": 75,
      "fibonacciRatios": [1.618, 2.618]
    }
  ],
  "signals": {
    "signal": "bullish_continuation",
    "strength": 85,
    "waveContext": "Early Wave 3 - strongest part of trend",
    "riskLevel": "low"
  }
}
```

---

## 📊 Bollinger Bands - Análisis de Volatilidad

### `analyze_bollinger_bands`

**Análisis completo de Bandas de Bollinger con detección de squeeze y patrones.**

#### 🎯 Características Principales

- ✅ **Detección de Squeeze** - Identifica compresión de volatilidad
- ✅ **Probabilidad de Ruptura** - Calcula dirección probable post-squeeze
- ✅ **Patrones Clásicos** - W-bottoms, M-tops, walking the bands
- ✅ **Análisis de Volatilidad** - Percentiles históricos y extremos

#### 📊 Componentes Analizados

1. **Squeeze Detection**:
   - Mide ancho de banda vs histórico
   - Identifica duración del squeeze
   - Calcula intensidad (0-100)
   - Predice dirección de ruptura

2. **Patrones**:
   - Double bottoms/tops en bandas
   - Walking the bands (tendencia fuerte)
   - Reversiones desde extremos
   - Divergencias con precio

#### 💡 Ejemplos de Uso

```bash
# Análisis estándar
analyze_bollinger_bands BTCUSDT

# Período personalizado para más sensibilidad
analyze_bollinger_bands ETHUSDT period=14

# Bandas más anchas
analyze_bollinger_bands XRPUSDT standardDeviation=2.5

# Sin señales de trading
analyze_bollinger_bands SOLUSDT includeSignals=false
```

#### 📋 Respuesta Típica

```json
{
  "currentBands": {
    "upper": 45200.50,
    "middle": 44000.00,
    "lower": 42799.50,
    "bandwidth": "5.46%",
    "position": "73.2%"  // Posición dentro de las bandas
  },
  "squeeze": {
    "isActive": true,
    "duration": 8,  // períodos
    "intensity": 85.5,
    "breakoutProbability": "72%",
    "expectedDirection": "bullish"
  },
  "volatility": {
    "current": "15th percentile",  // Muy baja
    "trend": "decreasing",
    "extremes": {
      "isAtLow": true,
      "isAtHigh": false
    }
  },
  "pattern": {
    "type": "squeeze_formation",
    "confidence": 88.5,
    "actionable": true,
    "description": "Bollinger Squeeze detectado - preparar para expansión de volatilidad"
  },
  "signals": {
    "signal": "prepare_for_breakout",
    "strength": 75,
    "reasoning": [
      "Squeeze activo por 8 períodos",
      "Volatilidad en percentil 15 histórico",
      "Momentum alcista acumulándose"
    ]
  }
}
```

---

## 🔄 Confluencias Técnicas - Multi-Indicador

### `find_technical_confluences`

**Encuentra zonas donde múltiples indicadores técnicos coinciden para setups de alta probabilidad.**

#### 🎯 Características Principales

- ✅ **Integración Multi-Indicador** - Fibonacci + Elliott + Bollinger
- ✅ **Scoring Automático** - Fuerza de confluencia 0-100
- ✅ **Señales Temporales** - Inmediato, corto y medio plazo
- ✅ **Risk Assessment** - Evaluación integrada de riesgo

#### 📊 Proceso de Análisis

1. **Recolección de Niveles**:
   - Fibonacci: Retrocesos y extensiones clave
   - Elliott: Targets de ondas y soportes
   - Bollinger: Bandas y niveles de reversión

2. **Detección de Confluencias**:
   - Agrupa niveles cercanos (tolerancia configurable)
   - Calcula fuerza basada en cantidad y calidad
   - Identifica zonas "hot" con múltiples confluencias

3. **Generación de Señales**:
   - Evalúa posición actual vs confluencias
   - Genera señales para diferentes horizontes
   - Incluye reasoning detallado

#### 💡 Ejemplos de Uso

```bash
# Análisis completo con todos los indicadores
find_technical_confluences BTCUSDT

# Solo Fibonacci y Elliott
find_technical_confluences ETHUSDT indicators=["fibonacci","elliott"]

# Confluencias fuertes solamente
find_technical_confluences XRPUSDT minConfluenceStrength=80

# Mayor tolerancia para agrupar niveles
find_technical_confluences SOLUSDT distanceTolerance=1.0
```

#### 📋 Respuesta Típica

```json
{
  "confluences": [
    {
      "level": 43850.00,
      "type": "support",
      "indicators": ["fibonacci_618", "elliott_wave4_support", "bollinger_lower"],
      "strength": 92.5,
      "distance": "-1.5%",
      "actionable": true,
      "description": "Confluencia triple fuerte - soporte clave"
    },
    {
      "level": 46200.00,
      "type": "resistance",
      "indicators": ["fibonacci_extension_1618", "elliott_wave3_target"],
      "strength": 78.0,
      "distance": "+3.8%",
      "actionable": true
    }
  ],
  "marketStructure": {
    "trend": "bullish",
    "phase": "correction",
    "volatility": "low",
    "momentum": "weakening"
  },
  "signals": {
    "immediate": {
      "signal": "wait_for_support_test",
      "strength": 65,
      "confidence": 72,
      "targetZone": [43800, 43900]
    },
    "shortTerm": {
      "signal": "bullish_reversal_likely",
      "strength": 80,
      "confidence": 85,
      "reasoning": "Aproximándose a confluencia triple en 43850"
    }
  },
  "riskAssessment": {
    "overall": "medium",
    "factors": [
      "Fuerte confluencia de soporte cercana",
      "Squeeze de Bollinger activo",
      "Wave 2/4 probable según Elliott"
    ],
    "warnings": ["Volumen decreciente - confirmar con volumen en rebote"]
  }
}
```

---

## 🎓 Mejores Prácticas

### 1. **Fibonacci**
- Deja que el sistema detecte swings automáticamente
- Usa `minSwingSize` más bajo en mercados laterales
- Verifica confluencias con S/R para mayor confiabilidad
- Los niveles con strength > 80 son los más confiables

### 2. **Elliott Wave**
- Usa `strictRules=true` para señales más confiables
- Combina con Fibonacci para validar targets
- Las Wave 3 son las más confiables para trading
- Considera múltiples timeframes para contexto

### 3. **Bollinger Bands**
- Los squeezes son oportunidades de alta probabilidad
- Combina con volumen para confirmar rupturas
- Walking the bands indica tendencia fuerte
- Extremos de volatilidad suelen revertir

### 4. **Confluencias**
- Zonas con 3+ indicadores son las más fuertes
- Strength > 80 indica alta probabilidad
- Usa tolerancia apropiada al timeframe
- Confirma con acción del precio

---

## 📊 Casos de Uso Combinados

### Setup de Alta Probabilidad
```bash
# 1. Identificar confluencias fuertes
find_technical_confluences BTCUSDT minConfluenceStrength=80

# 2. Si hay squeeze de Bollinger cerca de confluencia
analyze_bollinger_bands BTCUSDT

# 3. Verificar contexto de Elliott Wave
detect_elliott_waves BTCUSDT

# 4. Confirmar niveles de Fibonacci
calculate_fibonacci_levels BTCUSDT
```

### Análisis de Reversión
```bash
# 1. Detectar extremos con Bollinger
analyze_bollinger_bands ETHUSDT

# 2. Buscar niveles de Fibonacci clave
calculate_fibonacci_levels ETHUSDT

# 3. Verificar si es final de onda Elliott
detect_elliott_waves ETHUSDT
```

---

## 🔧 Troubleshooting

### "No se detectan swings en Fibonacci"
- El mercado puede estar muy lateral
- Reduce `minSwingSize` a 0.5 o menos
- El sistema usará extremos absolutos como fallback

### "Elliott Wave no encuentra patrones"
- Puede no haber una estructura clara
- Prueba con `strictRules=false` para más detecciones
- Verifica en timeframes mayores

### "Bollinger Squeeze no se detecta"
- La volatilidad puede no ser suficientemente baja
- Ajusta el período para mayor sensibilidad
- Revisa percentiles históricos de volatilidad

---

## 📝 Notas Técnicas

1. **Todos los cálculos son determinísticos** - mismos inputs = mismos outputs
2. **Validación de datos en cada paso** - manejo robusto de edge cases
3. **Performance optimizado** - típicamente < 500ms por análisis
4. **Sin dependencias externas** - todos los cálculos son propios

---

*Guía de Análisis Técnico Avanzado v1.0 - wAIckoff MCP v1.7.1*  
*Última actualización: 13/06/2025*
