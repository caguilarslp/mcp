# 📊 wAIckoff MCP - Guía de Indicadores Técnicos

## 🎯 Herramientas de Análisis Técnico Avanzado

Este documento describe las herramientas de análisis técnico avanzado que están en desarrollo para el servidor wAIckoff MCP v1.6.5.

---

## ⚠️ **ESTADO ACTUAL: PREPARADAS PARA IMPLEMENTACIÓN**

Las siguientes herramientas tienen la infraestructura técnica preparada (servicios, handlers, tipos) pero requieren implementación completa de la lógica de análisis. Actualmente retornan "Handler not yet implemented".

---

## 📈 Herramientas de Fibonacci

### `calculate_fibonacci_levels`
Calcula niveles de retroceso y extensión de Fibonacci con auto-detección de swings.

**Estado:** 🔧 **PREPARADO** - Handler placeholder implementado
**Implementación:** Pendiente en TASK-019 (Herramientas Técnicas)

**Parámetros (Planificados):**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal ('15', '30', '60', '240', 'D'). Default: '60'
- `lookback` (opcional): Períodos para detectar swings. Default: 50
- `includeExtensions` (opcional): Incluir extensiones además de retracements. Default: true
- `minSwingSize` (opcional): Tamaño mínimo del swing en %. Default: 3.0

**Funcionalidades Planificadas:**
- **Auto-detección de swings**: Identifica automáticamente high/low significativos
- **Niveles clásicos**: 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
- **Extensiones**: 127.2%, 161.8%, 261.8%
- **Confluencia con S/R**: Validación con niveles existentes
- **Scoring por toques**: Puntuación basada en toques históricos
- **Proyección de targets**: Objetivos de precio basados en extensiones

**Ejemplo de Uso (Futuro):**
```
calculate_fibonacci_levels BTCUSDT timeframe=240 includeExtensions=true
```

**Respuesta Planificada:**
```json
{
  "status": "success",
  "data": {
    "symbol": "BTCUSDT",
    "swingHigh": 45000,
    "swingLow": 38000,
    "swingSize": 18.42,
    "retracements": {
      "23.6%": 43348,
      "38.2%": 41326,
      "50.0%": 41500,
      "61.8%": 39674,
      "78.6%": 38498
    },
    "extensions": {
      "127.2%": 46904,
      "161.8%": 49326,
      "261.8%": 56326
    },
    "confluence": [
      {
        "level": 41500,
        "fibonacci": "50.0%",
        "supportResistance": "strong_support",
        "score": 85
      }
    ]
  }
}
```

---

## 📊 Herramientas de Bollinger Bands

### `analyze_bollinger_bands`
Análisis completo de Bollinger Bands con detección de squeeze y divergencias.

**Estado:** 🔧 **PREPARADO** - Handler placeholder implementado
**Implementación:** Pendiente en TASK-019 (Herramientas Técnicas)

**Parámetros (Planificados):**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal ('15', '30', '60', '240', 'D'). Default: '60'
- `period` (opcional): Período para SMA. Default: 20
- `stdDev` (opcional): Multiplicador desviación estándar. Default: 2.0
- `periods` (opcional): Número de períodos a analizar. Default: 100

**Funcionalidades Planificadas:**
- **Bandas adaptativas**: Período y desviación configurables
- **Detección de squeeze**: Baja volatilidad (bandas estrechas)
- **Walking the bands**: Tendencia fuerte cuando precio camina por una banda
- **Divergencias con precio**: Señales de reversión
- **%B indicator**: Posición del precio dentro de las bandas
- **Bandwidth**: Medida de la amplitud de las bandas
- **Señales de trading**: Bounces, breakouts, squeeze releases

**Ejemplo de Uso (Futuro):**
```
analyze_bollinger_bands ETHUSDT period=20 stdDev=2.0
```

**Respuesta Planificada:**
```json
{
  "status": "success",
  "data": {
    "symbol": "ETHUSDT",
    "currentPrice": 2340,
    "bands": {
      "upper": 2450,
      "middle": 2350,
      "lower": 2250
    },
    "indicators": {
      "percentB": 0.45,
      "bandwidth": 8.5,
      "squeeze": false
    },
    "signals": [
      {
        "type": "bounce_off_lower_band",
        "confidence": 75,
        "target": 2350,
        "timestamp": "2025-06-11T10:30:00Z"
      }
    ],
    "analysis": {
      "trend": "ranging",
      "volatility": "normal",
      "recommendation": "wait_for_breakout"
    }
  }
}
```

---

## 🌊 Herramientas de Elliott Wave

### `detect_elliott_waves`
Detección automática de ondas Elliott con validación de reglas.

**Estado:** 🔧 **PREPARADO** - Handler placeholder implementado
**Implementación:** Pendiente en TASK-019 (Herramientas Técnicas)

**Parámetros (Planificados):**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal ('60', '240', 'D', 'W'). Default: '240'
- `lookback` (opcional): Períodos para análisis. Default: 200
- `minWaveSize` (opcional): Tamaño mínimo de onda en %. Default: 5.0
- `validateRules` (opcional): Aplicar validación estricta de reglas Elliott. Default: true

**Funcionalidades Planificadas:**
- **Detección de ondas impulsivas**: Ondas 1-5 con validación
- **Detección de ondas correctivas**: Ondas A-C
- **Validación de reglas**: Onda 3 no más corta, etc.
- **Multi-timeframe counting**: Conteo en múltiples marcos temporales
- **Proyección de targets**: Objetivos basados en ratios Fibonacci
- **Degree classification**: Grado de las ondas (Primary, Intermediate, etc.)
- **Alternation principle**: Aplicación del principio de alternación

**Ejemplo de Uso (Futuro):**
```
detect_elliott_waves BTCUSDT timeframe=D validateRules=true
```

**Respuesta Planificada:**
```json
{
  "status": "success",
  "data": {
    "symbol": "BTCUSDT",
    "currentWave": "wave_4",
    "waveStructure": {
      "impulse": [
        {"wave": 1, "start": 30000, "end": 42000, "percentage": 40.0},
        {"wave": 2, "start": 42000, "end": 35000, "percentage": -16.7},
        {"wave": 3, "start": 35000, "end": 65000, "percentage": 85.7},
        {"wave": 4, "start": 65000, "end": 50000, "percentage": -23.1},
        {"wave": 5, "start": 50000, "end": null, "percentage": null}
      ]
    },
    "validation": {
      "rulesValid": true,
      "wave3NotShortest": true,
      "alternation": true,
      "confidence": 78
    },
    "projections": {
      "wave5Target": {
        "conservative": 70000,
        "aggressive": 85000,
        "fibonacci": 75000
      }
    }
  }
}
```

---

## 🔄 Herramientas de Confluencias Técnicas

### `find_technical_confluences`
Encuentra confluencias entre múltiples indicadores técnicos para validación cruzada.

**Estado:** 🔧 **PREPARADO** - Handler placeholder implementado
**Implementación:** Pendiente en TASK-019 (Herramientas Técnicas)

**Parámetros (Planificados):**
- `symbol` (requerido): Par de trading
- `timeframe` (opcional): Marco temporal. Default: '60'
- `indicators` (opcional): Indicadores a incluir. Default: ['fibonacci', 'bollinger', 'elliott', 'wyckoff', 'support_resistance']
- `tolerance` (opcional): Tolerancia para confluencias en %. Default: 1.0
- `minConfluence` (opcional): Mínimo número de indicadores para confluencia. Default: 2

**Funcionalidades Planificadas:**
- **Multi-indicator analysis**: Combina Fibonacci, Bollinger, Elliott, Wyckoff, S/R
- **Confluence scoring**: Puntuación basada en número y fuerza de confluencias
- **Price level clustering**: Agrupación de niveles cercanos
- **Timeframe alignment**: Confluencias entre múltiples marcos temporales
- **Signal validation**: Validación cruzada de señales
- **Risk/reward optimization**: Mejores entradas basadas en confluencias

**Ejemplo de Uso (Futuro):**
```
find_technical_confluences BTCUSDT indicators=["fibonacci","wyckoff","support_resistance"]
```

**Respuesta Planificada:**
```json
{
  "status": "success",
  "data": {
    "symbol": "BTCUSDT",
    "confluences": [
      {
        "priceLevel": 42500,
        "indicators": [
          {"type": "fibonacci", "level": "61.8%", "strength": "strong"},
          {"type": "wyckoff", "level": "spring_target", "strength": "medium"},
          {"type": "support_resistance", "level": "historical_support", "strength": "strong"}
        ],
        "totalScore": 92,
        "recommendation": "strong_buy_zone",
        "riskReward": 3.2
      }
    ],
    "analysis": {
      "totalConfluences": 3,
      "strongLevels": 1,
      "mediumLevels": 2,
      "bestEntry": 42500,
      "stopLoss": 41000,
      "targets": [44000, 46500, 48000]
    }
  }
}
```

---

## 🚀 Roadmap de Implementación

### **TASK-019 - Herramientas de Análisis Técnico (8h estimadas)**

#### **Fase 1: Servicios Core (3h)**
- ✅ **FibonacciService** - Placeholder creado
- ✅ **BollingerBandsService** - Placeholder creado  
- ✅ **ElliottWaveService** - Placeholder creado
- ⏳ **Implementar lógica completa** - Algoritmos de cálculo

#### **Fase 2: Handlers y Tools (2h)**
- ✅ **Handlers placeholders** - Ya implementados
- ⏳ **Lógica real de handlers** - Reemplazar placeholders
- ⏳ **Tool definitions** - Definir tools MCP

#### **Fase 3: Integración y Testing (2h)**
- ⏳ **Core Engine integration** - Métodos públicos
- ⏳ **Testing unitarios** - Validar algoritmos
- ⏳ **Integration testing** - End-to-end validation

#### **Fase 4: Confluencias y Optimización (1h)**
- ⏳ **TechnicalConfluenceService** - Análisis multi-indicador
- ⏳ **Performance optimization** - Caching y optimización
- ⏳ **Documentation** - User guide actualizado

---

## 🔧 Estado Técnico Actual

### **✅ Preparado (TASK-019 Base)**
- **Servicios creados**: fibonacci.ts, bollingerBands.ts, elliottWave.ts
- **Handlers implementados**: Placeholders en TechnicalAnalysisHandlers
- **Tipos definidos**: Interfaces TypeScript preparadas
- **Error handling**: Try/catch structure implementada
- **Integration ready**: Core Engine preparado para nuevos métodos

### **⏳ Pendiente de Implementación**
- **Algoritmos de cálculo**: Lógica matemática de cada indicador
- **Tool definitions**: Definiciones MCP para nuevas herramientas
- **Testing completo**: Validación de algoritmos y respuestas
- **Documentation**: Ejemplos y casos de uso completos

---

## 📝 Notas de Desarrollo

### **Decisiones Arquitectónicas**
1. **Modular design**: Cada indicador en servicio separado
2. **Standardized interfaces**: Mismo patrón para todos los servicios
3. **Dependency injection**: Servicios inyectables en Core Engine
4. **Error handling**: Manejo robusto en todas las capas
5. **Performance monitoring**: Métricas integradas

### **Consideraciones de Implementación**
1. **Algoritmos probados**: Usar fórmulas estándar de la industria
2. **Configurabilidad**: Parámetros ajustables por usuario
3. **Eficiencia**: Cálculos optimizados para tiempo real
4. **Precisión**: Validación matemática rigurosa
5. **Usabilidad**: Respuestas claras y accionables

---

## 🎯 Casos de Uso Planificados

### **Para Trading Algorítmico**
1. **Confluencias automáticas**: Identificar zonas de alta probabilidad
2. **Signal validation**: Validar señales con múltiples indicadores
3. **Risk management**: Mejores stop-loss basados en niveles técnicos
4. **Target optimization**: Objetivos de precio más precisos

### **Para Análisis Manual**
1. **Multi-timeframe analysis**: Coherencia entre marcos temporales
2. **Pattern recognition**: Identificar patrones clásicos automáticamente
3. **Educational tools**: Aprender sobre indicadores técnicos
4. **Market structure**: Entender estructura subyacente del mercado

---

## 📊 Métricas de Éxito Planificadas

- **Precisión de señales**: >75% accuracy en backtesting
- **Performance**: <500ms response time por herramienta
- **Usabilidad**: Respuestas claras y accionables
- **Integración**: Seamless con herramientas existentes
- **Adoption**: Alta utilización por parte de usuarios

---

*Versión: 1.6.5 - Actualizado: 11/06/2025*  
*Estado: Preparado para Implementación - TASK-019 Pendiente*  
*Prioridad: Alta - Herramientas fundamentales para análisis técnico completo*