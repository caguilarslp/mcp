# ADR-002: Visualization Strategy for WADM

**Date**: 2025-06-17  
**Status**: Proposed  
**Context**: WADM Project - Future visualization capabilities

## Context

WADM genera indicadores complejos que necesitan visualización profesional para análisis efectivo. Necesitamos un panel que muestre:
- Gráficos de velas con indicadores superpuestos
- Volume Profile (histograma lateral)
- Footprint charts (celdas bid/ask)
- Order Flow (delta, CVD)
- Mapas de calor de liquidez
- Múltiples timeframes simultáneos

## Opciones de Stack Tecnológico

### Opción 1: Lightweight Web (Recomendada) 
**Stack**: FastAPI + Plotly.js/Lightweight Charts + WebSockets

**Pros**:
- TradingView Lightweight Charts es gratis y profesional
- Plotly.js excelente para Volume Profile y heatmaps
- WebSockets ya implementados para datos real-time
- Mínima carga en servidor (renderizado cliente)
- Fácil de dockerizar junto con backend

**Cons**:
- Necesitas construir UI desde cero
- Más trabajo inicial

**Implementación**:
```
wadm/
├── backend/          # FastAPI actual
├── frontend/         # HTML/JS simple
│   ├── index.html
│   ├── js/
│   │   ├── charts.js      # TradingView Lightweight
│   │   ├── indicators.js   # Plotly para indicadores
│   │   └── websocket.js   # Conexión real-time
│   └── css/
└── docker-compose.yml
```

### Opción 2: React Dashboard
**Stack**: FastAPI + React + Recharts/Victory + Material-UI

**Pros**:
- Componentes reutilizables
- Estado manejado profesionalmente
- UI moderna con Material-UI
- Muchas librerías de gráficos

**Cons**:
- Mayor complejidad
- Build process necesario
- Más pesado

### Opción 3: Python Native
**Stack**: FastAPI + Dash/Streamlit + Plotly

**Pros**:
- Todo en Python
- Dash es muy potente para trading
- Plotly integrado nativamente
- Rápido desarrollo

**Cons**:
- Streamlit limitado para trading profesional
- Dash puede ser pesado
- Menos control sobre UX

### Opción 4: Grafana Integration
**Stack**: FastAPI + InfluxDB/Prometheus + Grafana

**Pros**:
- Grafana es excelente para time-series
- Dashboards configurables
- Alertas incluidas
- Muchos plugins

**Cons**:
- Necesita base de datos adicional
- Limitado para gráficos especializados (footprint)
- Overkill para proyecto pequeño

## Componentes de Visualización Necesarios

### 1. Gráfico Principal
- Candlestick con zoom/pan
- Overlays: VWAP, estructura de mercado
- Indicadores inferior: Order Flow, Delta

### 2. Volume Profile
- Histograma lateral
- POC, VAH, VAL destacados
- TPO letters opcional

### 3. Footprint Chart
- Grid de celdas tiempo/precio
- Bid/Ask por celda
- Código de colores por imbalance

### 4. Order Flow
- Delta histogram
- CVD line chart
- Absorption highlights

### 5. Liquidity Map
- Heatmap de liquidez
- Order blocks rectangulares
- Niveles magnéticos

### 6. Multi-Timeframe
- 4 gráficos sincronizados
- Diferentes timeframes
- Crosshair compartido

## Recomendación

**Para WADM: Opción 1 (Lightweight Web)**

Razones:
1. **Simplicidad**: HTML/JS puro, sin build process
2. **Performance**: Renderizado en cliente
3. **Profesional**: TradingView charts es el estándar
4. **Flexible**: Plotly cubre necesidades especiales
5. **Real-time**: WebSockets ya implementados
6. **Dockerizable**: Un solo contenedor con nginx

## Implementación Propuesta

### Fase 1: MVP (1 semana)
- Gráfico de velas básico
- Volume Profile simple
- Order Flow histogram
- WebSocket para actualizaciones

### Fase 2: Indicadores (1 semana)
- VWAP con bandas
- Market Structure overlay
- Delta/CVD
- Liquidity levels

### Fase 3: Avanzado (2 semanas)
- Footprint chart
- Multi-timeframe sync
- Liquidity heatmap
- Session profiles

## Librerías Específicas

### Para Gráficos Trading
1. **TradingView Lightweight Charts** (principal)
   - Candlesticks profesionales
   - Zoom/pan fluido
   - Indicadores overlay
   - Gratis y open source

2. **Plotly.js** (indicadores especiales)
   - Volume Profile (histograma lateral)
   - Heatmaps para liquidez
   - Scatter para order flow
   - Subplots sincronizados

3. **D3.js** (personalización extrema)
   - Footprint charts custom
   - Visualizaciones únicas
   - Control total

### Ejemplo de Arquitectura

```python
# FastAPI endpoints
GET /api/candles/{symbol}/{timeframe}
GET /api/indicators/{symbol}/{indicator}
WS /ws/realtime/{symbol}

# Frontend structure
/dashboard
  - main-chart.js (TradingView)
  - volume-profile.js (Plotly)
  - order-flow.js (Plotly)
  - footprint.js (D3)
  - websocket-manager.js
```

## Decisión

Implementar visualización web lightweight con:
- TradingView Lightweight Charts como base
- Plotly.js para indicadores especializados
- WebSockets para real-time
- HTML/JS vanilla para simplicidad

Esto permite crear un panel profesional sin complejidad excesiva, manteniendo el principio KISS del proyecto.

## Referencias
- [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts)
- [Plotly.js Financial Charts](https://plotly.com/javascript/candlestick-charts/)
- [D3.js Force Directed Graph](https://d3js.org/) (para visualizaciones custom)
