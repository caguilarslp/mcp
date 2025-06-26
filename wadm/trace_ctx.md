IMPORTANTÍSIMO LEER PRIMERO:
###########################################
 NUEVO SISTEMA TRAZABILIDAD (2025-06-25):
 - trace_ctx.md (antes .claude_context)
 - trdocs/ (antes claude/)
 
 DEL USUARIO, LEER Y NO ELIMINAR:
 - NO SOBREINGENIARIA, NUNCA!!
 - SIEMPRE PRODUCTION-READY. NO MOCKS, NO PLACEHOLDERS
 - KISS, MODULARIDAD, PROFESIONALIDAD, SEGURIDAD, ESCALABILIDAD, ESTABILIDAD 
 - NO ACTUALIZARÁS TRAZABILIDAD HASTA EL VISTO BUENO DEL USUARIO
 - HARÁS PAUSAS DE VEZ EN CUANDO PARA VERIFICAR QUE TODO ESTÁ CORRECTO
 - NO HAZ QUE FUNCIONE PRIMERO Y DESPUÉS OPTIMIZA, ESE NO ES EL CAMINO A SEGUIR.
 - NO CREARÁS SCRIPTS DE PRUEBAS, NI PARA INICIOS DE DOCKER, NI NADA. EL USUARIO TE AYUDARÁ CON LAS PRUEBAS.
 - NO CREAR ARCHIVOS .BAT O .PY EN LA RAÍZ A MENOS QUE EL USUARIO LO PIDA EXPLÍCITAMENTE
 - EL USUARIO SE ENCARGA DE LEVANTAR Y DETENER DOCKER - NO CREAR SCRIPTS PARA ESTO
 - NO CREES UN ARCHIVO TEST, Y OTRO SI FALLA, Y OTRO, ..., USA EL MISMO Y MODIFICALO
###########################################

# WADM - wAIckoff Data Manager v0.2.0
## 📋 Sistema de Trazabilidad: trace_ctx.md + trdocs/

## ✅ ESTADO ACTUALIZADO (2025-06-25)

### FASE 0 COMPLETADA: **SISTEMA TIMEFRAMES COMPLETO**
✅ **19 timeframes profesionales** (1s, 5s, 15s, 30s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)
✅ **10 indicadores configurados** con prioridades
✅ **Sistema dinámico** por tiempo fijo (no N trades)
✅ **Resource management** (máximo 10 concurrent)
✅ **Funcionando en producción** (confirmado en logs)

### ARQUITECTURA NUEVA (2 componentes):
1. **Backend API** (`:8000`) - FastAPI + Collectors + 133 herramientas migradas
2. **Frontend** (`:3000`) - React Dashboard (en desarrollo)

### ARQUITECTURA ELIMINADA:
❌ **MCP Server** (`:8001`) - Problema persistente MongoDB, arquitectura duplicada

### ✅ FASE 1 COMPLETADA: **DECISIÓN ARQUITECTÓNICA**
- ❌ **MCP Server eliminado** - problema persistente de conexión MongoDB
- ✅ **Migración completa al Backend API** - arquitectura unificada
- ✅ **133 herramientas MCP → Python** - un solo servicio
- ✅ **Un solo MongoDB, un solo endpoint** - simplicidad total

### ✅ CONFIRMADO: **5 INDICADORES YA IMPLEMENTADOS**
- ✅ **Volume Profile** - POC, VAH/VAL, distribución por precio
- ✅ **Order Flow** - Delta, CVD, momentum, imbalance detection  
- ✅ **Footprint Charts** - Bid/Ask por nivel, delta heatmap, absorción
- ✅ **Market Profile** - TPO letters, Initial Balance, Value Area
- ✅ **VWAP** - Con bandas desviación estándar, múltiples anchors

### 🚀 PRÓXIMO: FASE 1.5 - **INDICADORES NATIVOS WYCKOFF + SMC**
Ver `/trdocs/tasks/TASK-103-WYCKOFF-SMC-NATIVE-INDICATORS.md` para plan completo

## 📊 INDICADORES

### Actualmente en Backend (Python):
1. **Volume Profile** - POC, VAH, VAL
2. **Order Flow** - Delta, momentum, absorption

### Actualmente en MCP (TypeScript):
- 133 herramientas incluyendo Wyckoff, SMC, Elliott, Fibonacci, etc.

### FALTAN en Backend:
1. **Footprint Charts** - Bid/Ask por nivel de precio
2. **Market Profile** - TPO letters
3. **Liquidation Levels** - Por leverage
4. **Dark Pool Detection** - Trades institucionales
5. **VWAP** - Con bandas
6. **Bollinger Bands**
7. **RSI**
8. **MACD**

### ✅ RESUELTO: Indicadores por tiempo fijo
- **Anterior**: Cada 50 trades (inconsistente)
- **ACTUAL**: Por tiempo fijo configurable (19 timeframes disponibles)
- **Sistema de prioridades**: CRITICAL > HIGH > MEDIUM > LOW

## 🎯 PLAN ACTUALIZADO

### ✅ COMPLETADO:
1. ✅ Cambiar cálculo de indicadores a tiempo fijo - **HECHO**
2. ✅ **Eliminar MCP Server** (Fase 1) - **COMPLETADO**
3. ✅ **Confirmación indicadores existentes** - **5 FUNCIONALES**
4. ✅ **Arquitectura unificada** - **OBJETIVO ALCANZADO**

### 🚨 CRÍTICO (Fase 1.5): **LLM SECURITY MIGRATION** (4 días) - EN PROGRESO
✅ **FASE 1 COMPLETADA**: Backend LLM Foundation (6 horas)
✅ **FASE 2 COMPLETADA**: LLM Providers Integration (8 horas)
🔄 **FASE 3 EN CURSO**: Security & Rate Limiting (4 horas)
⏳ **FASE 4 PENDIENTE**: Secure API Endpoints (6 horas)
⏳ **FASE 5 PENDIENTE**: Frontend Security Cleanup (6 horas)
⏳ **FASE 6 PENDIENTE**: Testing & Monitoring (4 horas)

### 🔄 DESPUÉS (Fase 1.6): **DATA BOOTSTRAP + SMART CACHING** (6 días)
1. **Historical Bootstrap Service** - One-time fetch desde inception dates
2. **Smart Cache Manager** - Redis (hot) + MongoDB (warm) + Real-time
3. **Real-time Candle Builder** - WebSocket trades → OHLCV aggregation
4. **Gap Detection & Recovery** - Auto-fill missing data periods
5. **Performance Optimization** - 99% cache hit, <50ms response

### ⏳ DESPUÉS (Fase 1.7): **INDICADORES NATIVOS CRÍTICOS**
1. **Market Structure Analyzer** - BoS, ChoCH, HH/LL detection
2. **Liquidity Zones Mapper** - Swing levels, stop clusters  
3. **Order Blocks Detector** - Institutional order zones
4. **Fair Value Gaps** - Imbalance detection
5. **Wyckoff Volume Analyzer** - Climax, absorption, phase detection
6. **Composite Man Tracker** - Institutional manipulation detection
7. **Exchange Dominance** - Multi-exchange analysis

### Resultado final:
- Un solo backend con todo
- Un solo MongoDB
- Un solo endpoint para frontend
- Mejor performance y mantenimiento

## 🛠️ COMANDOS CLAVE

```bash
# Desarrollo actual
docker-compose up -d          # Levanta todo
docker-compose logs -f backend  # Ver logs

# Verificar MongoDB
docker exec -it wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024
> use wadm
> show collections
> db.volume_profile.countDocuments()

# Frontend desarrollo
cd app && npm run dev
```

## 📁 ESTRUCTURA IMPORTANTE

```
wadm/
├── src/
│   ├── api/          # FastAPI routes
│   ├── collectors/   # WebSocket exchanges
│   ├── indicators/   # Solo 2 actualmente
│   ├── storage/      # MongoDB manager
│   └── manager.py    # Coordinador principal
├── mcp_server/       # 133 herramientas (a migrar)
├── app/              # Frontend React
└── trdocs/
    ├── architecture/ # NUEVA ARQUITECTURA
    └── daily/        # Logs diarios
```

## 🔧 CONFIGURACIÓN

- **MongoDB**: `mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin`
- **Symbols**: BTCUSDT, ETHUSDT, SOLUSDT, TRXUSDT, XRPUSDT, XLMUSDT, HBARUSDT, ADAUSDT
- **Exchanges**: Bybit, Binance, Coinbase, Kraken

## ⚠️ NOTAS CRÍTICAS

1. **NO usar artefactos** - Todo directo al filesystem
2. **Python 3.12 strict** - Type hints obligatorios
3. **Async by default** - Todo I/O asíncrono
4. **Dashboard puede esperar** - Primero unificar backend

## 📈 MÉTRICAS ACTUALES

- Trades procesados: 1400+/minuto
- Indicadores calculados: Variable (problema)
- Latencia API→MCP: ~50ms (eliminar)
- Storage: MongoDB 7.0

---

**✅ FASE 0 COMPLETADA**: Sistema timeframes dinámico funcionando en producción
**✅ FASE 1 COMPLETADA**: MCP Server eliminado - Arquitectura unificada  
**✅ CONFIRMADO**: 5 indicadores avanzados YA implementados y funcionales
**🚨 CRÍTICO IDENTIFICADO**: LLM Security Issue - API keys expuestas en frontend
**🔄 SIGUIENTE PASO**: TASK-105 FASE 3 - Security & Rate Limiting (EN PROGRESO)
**📋 TAREAS CREADAS**: TASK-102, TASK-103, TASK-104, TASK-105 (Security Critical)
