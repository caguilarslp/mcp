# WADM Architecture Update - 2025-06-25

## 🏗️ ARQUITECTURA ACTUAL

### Sistema de 3 Componentes:
1. **Backend API** (`:8000`) - FastAPI con collectors y algunos indicadores
2. **MCP Server** (`:8001`) - 133 herramientas de análisis avanzado
3. **Frontend Dashboard** (`:3000`) - React con integración a ambos

### 📊 INDICADORES ACTUALES

#### En Backend API (Python):
1. **Volume Profile** - Calcula POC, VAH, VAL cada N trades
2. **Order Flow** - Delta, cumulative delta, momentum score cada N trades

#### En MCP Server (TypeScript - 133 tools):
- Wyckoff Analysis (phases, events, composite man)
- Smart Money Concepts (order blocks, FVG, liquidity)
- Technical Analysis (Bollinger, RSI, MACD, etc.)
- Elliott Waves, Fibonacci, VWAP
- Multi-timeframe analysis
- Y muchos más...

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Cálculo de Indicadores por N trades**
**Problema**: Los indicadores se calculan cada 50 trades, lo cual es inconsistente:
- En mercados lentos: puede tardar horas
- En mercados rápidos: demasiado frecuente
- No alineado con timeframes estándar

**Solución Propuesta**: Calcular por tiempo fijo:
- **Indicadores rápidos** (Order Flow, Volume Profile): Cada 1 minuto
- **Indicadores medios** (VWAP, Bollinger): Cada 5 minutos  
- **Indicadores lentos** (Wyckoff, Elliott): Cada 15 minutos

### 2. **Arquitectura Duplicada**
**Problema**: 
- Backend calcula algunos indicadores (2)
- MCP Server calcula otros (133)
- Frontend debe consultar ambos sistemas

**Solución**: **ARQUITECTURA UNIFICADA**

## 🎯 NUEVA ARQUITECTURA PROPUESTA

### Opción A: **Backend Unificado** (RECOMENDADA)
```
┌─────────────────────────────────────────────┐
│            WADM Unified Backend             │
├─────────────────────────────────────────────┤
│  FastAPI + Embedded MCP Engine              │
│  - Collectors (WebSocket)                   │
│  - 133+ Analysis Tools                      │
│  - Unified MongoDB                          │
│  - Single API endpoint (:8000)             │
└─────────────────────────────────────────────┘
```

### Beneficios:
1. **Un solo endpoint** para el frontend
2. **Menor latencia** (sin proxy HTTP)
3. **Estado consistente** (un MongoDB)
4. **Debugging simple** (un log)

## 📋 PLAN DE MIGRACIÓN

### Fase 1: Unificar Storage (HOY)
```bash
# Forzar ambos servicios a usar mismo MongoDB
docker-compose down
docker-compose up -d --build
```

### Fase 2: Migrar Indicadores a Tiempo (Mañana)
```python
# Cambiar de:
if len(buffer) >= BATCH_SIZE:  # 50 trades
    await self.calculate_indicators()

# A:
if (now - last_calc).total_seconds() >= 60:  # 1 minuto
    await self.calculate_indicators()
```

### Fase 3: Integrar MCP Engine (2-3 días)
1. Copiar código MCP a `src/analysis/`
2. Exponer tools directamente en API
3. Eliminar servicio MCP separado

## 🔧 INDICADORES FALTANTES EN API

### Debe agregar el Backend:
1. **Footprint Charts** - Bid/Ask imbalances por precio
2. **Market Profile** - TPO letters, value area
3. **Liquidation Levels** - Niveles de liquidación por leverage
4. **Dark Pool Detection** - Trades institucionales ocultos
5. **VWAP** - Con bandas y anclajes
6. **Bollinger Bands** - Media móvil + desviación estándar
7. **RSI** - Relative Strength Index
8. **MACD** - Moving Average Convergence Divergence

### Ya disponibles en MCP:
- Wyckoff (phases, events, spring detection)
- Smart Money (order blocks, FVG, liquidity)
- Elliott Waves (wave counting, targets)
- Fibonacci (retracements, extensions)
- Multi-timeframe analysis
- Y 120+ más...

## 🔌 INTEGRACIÓN DASHBOARD

### Estado Actual:
```typescript
// Dashboard se conecta a ambos servicios
const apiUrl = 'http://localhost:8000'  // Backend API
const mcpUrl = 'http://localhost:8001'  // MCP Server
```

### Después de Unificación:
```typescript
// Un solo endpoint
const apiUrl = 'http://localhost:8000'
// Todas las herramientas en: /api/v1/analysis/*
```

## 📐 ARQUITECTURA DEFINITIVA

```yaml
services:
  # Frontend React
  frontend:
    build: ./app
    ports: ["3000:80"]
    depends_on: [backend]
  
  # Backend Unificado (API + MCP + Collectors)
  backend:
    build: .
    ports: ["8000:8000"]
    environment:
      - MONGODB_URI=mongodb://mongo:27017/wadm
      - INDICATOR_INTERVAL_FAST=60      # 1 min
      - INDICATOR_INTERVAL_MEDIUM=300   # 5 min
      - INDICATOR_INTERVAL_SLOW=900     # 15 min
    depends_on: [mongo, redis]
  
  # Storage
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
  
  redis:
    image: redis:7
    ports: ["6379:6379"]
```

## 🚀 BENEFICIOS DE LA UNIFICACIÓN

1. **Performance**: -50% latencia, +100% velocidad
2. **Simplicidad**: 1 servicio vs 3
3. **Consistencia**: 1 base de datos
4. **Mantenimiento**: 1 codebase
5. **Costo**: Menos recursos

## ⚡ ACCIÓN INMEDIATA

1. **Actualizar cálculo de indicadores a tiempo fijo**
2. **Implementar indicadores faltantes** (Footprint, Market Profile, etc.)
3. **Comenzar migración MCP → Backend**
4. **Simplificar frontend** para usar un solo endpoint

## 📝 NOTAS IMPORTANTES

- **NO empezar de cero** - tenemos mucho código valioso
- **Migración gradual** - sin romper funcionalidad
- **Test cada fase** antes de continuar
- **Dashboard puede esperar** hasta tener backend unificado

---

**RESUMEN**: La arquitectura actual funciona pero es compleja. La unificación simplificará todo y mejorará performance. Primero arreglar indicadores (tiempo vs trades), luego unificar servicios.
