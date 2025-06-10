# 📊 Guía de Uso wAIckoff MCP - Trading Analysis

## 🎯 Para qué sirve este MCP

El **wAIckoff MCP** es tu herramienta de análisis técnico integrada en Claude Desktop que te proporciona:

- **Análisis técnico completo** en segundos
- **Sugerencias de grid trading** basadas en volatilidad
- **Detección de divergencias** precio/volumen
- **Niveles de soporte/resistencia dinámicos**
- **Volume Delta** para presión compradora/vendedora
- **Datos de mercado en tiempo real** de Bybit
- **Sistema de almacenamiento avanzado** con búsqueda histórica

## 🚀 Setup Rápido

### **1. Verificar que Claude Desktop esté configurado**
El MCP ya está configurado en tu Claude Desktop. Para verificar:

1. Abre Claude Desktop
2. Deberías ver herramientas MCP disponibles automáticamente
3. Si no aparecen, el MCP se recarga automáticamente

### **2. Comandos Básicos para Trading**

## 📋 Herramientas Disponibles

### **🔍 Análisis Rápido de Mercado**

#### `get_complete_analysis` - **TU HERRAMIENTA PRINCIPAL**
```
Uso: get_complete_analysis XRPUSDT
```
**Lo que obtienes:**
- Precio actual y cambio 24h
- Niveles de soporte/resistencia críticos
- Análisis de volumen y VWAP
- Volume Delta (presión compradora/vendedora)
- Sugerencias de grid trading automáticas
- Recomendación general (bullish/bearish/neutral)

**Cuándo usarla:** Antes de cualquier decisión de trading, análisis diario

#### `get_market_data` - **Datos Básicos**
```
Uso: get_market_data HBARUSDT
```
**Lo que obtienes:**
- Precio, volumen, cambios 24h
- Orderbook (bids/asks principales)
- Últimas velas (OHLCV)

**Cuándo usarla:** Check rápido de precio y momentum

### **📊 Análisis Técnico Especializado**

#### `identify_support_resistance` - **Niveles Clave**
```
Uso: identify_support_resistance ONDOUSDT
```
**Lo que obtienes:**
- Niveles de soporte/resistencia más fuertes
- Scoring de cada nivel (fuerza 1-10)
- Distancia al precio actual
- Nivel crítico más relevante

**Cuándo usarla:** Para identificar entries/exits precisos, colocar stop losses

#### `analyze_volume_delta` - **Presión Institucional**
```
Uso: analyze_volume_delta XRPUSDT
```
**Lo que obtienes:**
- Presión compradora vs vendedora
- Divergencias con el precio
- Tendencia del Volume Delta
- Señales de reversión temprana

**Cuándo usarla:** Confirmar direccionalidad, detectar reversiones

#### `suggest_grid_levels` - **Grid Trading**
```
Uso: suggest_grid_levels XRPUSDT 500
```
**Lo que obtienes:**
- 10 niveles de grid optimizados
- Cantidad por nivel
- Rango de trading recomendado
- ROI estimado

**Cuándo usarla:** Configurar bots de grid trading, trading de rango

### **⚡ Análisis de Volatilidad y Timing**

#### `analyze_volatility` - **Timing de Entry**
```
Uso: analyze_volatility ALGOUSDT
```
**Lo que obtienes:**
- Volatilidad actual vs histórica
- Mejor momento para grid trading
- Expansión/contracción de volatilidad
- Recomendación de strategy

**Cuándo usarla:** Decidir si es momento de grid o swing trading

### **🔍 Herramientas de Análisis Histórico**

#### `get_analysis_history` - **Tu Historial de Trading**
```
Uso: get_analysis_history XRPUSDT 20
```
**Lo que obtienes:**
- Últimos análisis guardados del símbolo
- Filtrar por tipo (technical_analysis vs complete_analysis)
- Ver evolución de indicadores en el tiempo

**Cuándo usarla:** Revisar decisiones pasadas, ver tendencias históricas

#### `get_latest_analysis` - **Último Análisis Guardado**
```
Uso: get_latest_analysis XRPUSDT technical_analysis
```
**Lo que obtienes:**
- Análisis más reciente de un tipo específico
- Datos completos del último estudio
- Sin necesidad de recalcular

**Cuándo usarla:** Recuperar tu último análisis sin repetir cálculos

#### `search_analyses` - **Búsqueda Avanzada**
```
Uso: search_analyses con parámetros de fecha/tipo
```
**Lo que obtienes:**
- Búsqueda por rangos de fecha
- Filtros por tipo de análisis
- Ordenamiento personalizado

**Cuándo usarla:** Investigación profunda, backtest de estrategias

#### `get_repository_stats` - **Estadísticas del Sistema**
```
Uso: get_repository_stats
```
**Lo que obtienes:**
- Total de análisis guardados
- Distribución por tipo y símbolo
- Uso de almacenamiento

**Cuándo usarla:** Mantenimiento, ver qué datos tienes disponibles

## 🎯 Workflows de Trading

### **📈 Workflow de Análisis Diario**
```
1. get_complete_analysis XRPUSDT
2. get_complete_analysis HBARUSDT  
3. get_complete_analysis ONDOUSDT
4. Comparar setups y priorizar
```

### **🎯 Workflow de Entry/Exit**
```
1. get_complete_analysis [TOKEN]
2. identify_support_resistance [TOKEN] (para niveles precisos)
3. analyze_volume_delta [TOKEN] (confirmar dirección)
4. Ejecutar trade con levels identificados
```

### **🤖 Workflow de Grid Trading**
```
1. analyze_volatility [TOKEN] (verificar que sea bueno para grid)
2. suggest_grid_levels [TOKEN] [CAPITAL]
3. Configurar grid con niveles sugeridos
4. Monitor con get_market_data periódicamente
```

### **🔄 Workflow de Swing Trading**
```
1. get_complete_analysis [TOKEN] (setup general)
2. analyze_volume_delta [TOKEN] (timing de entry)
3. identify_support_resistance [TOKEN] (stop loss y target)
4. Ejecutar posición con apalancamiento 2x-4x
```

### **📈 Workflow de Análisis Histórico**
```
1. get_analysis_history [TOKEN] 50 (revisar últimos 50 análisis)
2. Identificar patrones recurrentes en los datos
3. get_latest_analysis [TOKEN] technical_analysis (comparar con actual)
4. Ajustar estrategia basado en tendencias históricas
```

## 💡 Tips de Uso Efectivo

### **🎯 Para tu Portfolio (XRP, HBAR, ONDO)**
- **Análisis diario:** Usa `get_complete_analysis` cada mañana
- **Decisions críticas:** Combina siempre Volume Delta + S/R
- **Grid setup:** Volatilidad baja = ideal para grid trading

### **💰 Para $2,000 USDC de Trading**
- **Capital por trade:** Máximo $600-700 por posición
- **Grid suggestions:** Usa siempre tu capital real en la herramienta
- **Risk management:** S/R levels son tus stop losses

### **🔍 Interpretación de Señales**

#### **Bullish Setup:**
- Volume Delta positivo + precio rompiendo resistencia
- VWAP como soporte + volumen creciente
- Grid suggestion con bias alcista

#### **Bearish Setup:**
- Volume Delta negativo + precio perdiendo soporte
- VWAP como resistencia + volumen bajista
- Divergencia negativa precio/volumen

#### **Neutral/Grid Setup:**
- Volatilidad baja + precio en rango
- S/R levels claros y respetados
- Volume Delta sin tendencia clara

### **⚠️ Limitaciones a Considerar**
- **Sin API keys:** Volume Delta es aproximado (pero efectivo)
- **Datos públicos:** Información disponible para todos
- **No trading automatizado:** Solo análisis y sugerencias
- **Rate limits:** No hacer calls excesivos (máximo 1 por minuto)

## 🚨 Troubleshooting

### **Si el MCP no responde:**
1. Reinicia Claude Desktop
2. Espera 30 segundos y vuelve a intentar
3. Verifica que tengas internet

### **Si hay errores de datos:**
1. Verifica que el símbolo sea correcto (XRPUSDT, no XRP/USDT)
2. Usa símbolos de Bybit válidos
3. Algunos tokens pueden no estar disponibles

### **Para debugging:**
```
Uso: get_debug_logs
```
Ve los últimos errores y status del sistema

## 🎯 Próximas Features

- **Detección de trampas alcistas/bajistas** (Bull/Bear traps) - TASK-012
- **Datos on-chain** - Flujos de stablecoins y ballenas - TASK-013
- **Detección de patrones Wyckoff** - Acumulación/Distribución
- **Reportes automáticos** diarios/semanales - TASK-009 FASE 4
- **Configuración de timezone** persistente - TASK-010
- **Integración completa con wAIckoff AI** (futuro próximo)

---

## 📞 Recordatorio de tu Setup

**Portfolio HODL:** 6,250 XRP, 7,500 HBAR, 500 ONDO  
**Capital Trading:** $2,000 USDC  
**Estrategias:** Grid (spot/futuros) + Swing (2x-4x leverage)  
**Risk:** 2-3% stop loss, máximo 3 posiciones simultáneas  

**¡El MCP está listo para potenciar tu trading con análisis profesional!** 🚀