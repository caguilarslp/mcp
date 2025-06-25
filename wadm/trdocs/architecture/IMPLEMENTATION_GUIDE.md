# WADM Architecture Unification - Implementation Guide

## 🚨 PROBLEMA ACTUAL

Tenemos **dos sistemas paralelos** que causan:
- **Datos fragmentados**: Colecciones en diferentes MongoDB/storage
- **Complejidad innecesaria**: Frontend → API → MCP (3 hops)
- **Mantenimiento difícil**: 2 codebases, 2 logs, 2 deployments

## 🎯 SOLUCIÓN INMEDIATA (Hoy)

### Step 1: Unificar MongoDB (30 minutos)

```bash
# 1. Ejecutar script de unificación
chmod +x scripts/unify_storage.sh
./scripts/unify_storage.sh

# 2. Verificar que TODAS las colecciones estén visibles
docker exec -it wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024
> use wadm
> show collections
# Deberías ver: trades, orderbooks, klines, indicators, bollinger_bands, etc.
```

### Step 2: Verificar Datos Fluyendo (10 minutos)

```bash
# 1. Check collectors
docker-compose logs -f collectors
# Deberías ver: "Stored X trades", "Stored orderbook"

# 2. Check MCP calculations
docker-compose logs -f mcp-server | grep -i "indicator"
# Deberías ver: "Calculated indicator", "Stored analysis"

# 3. Verify in MongoDB
docker exec -it wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024
> use wadm
> db.volume_profile.find().limit(1).pretty()
> db.bollinger_bands.find().limit(1).pretty()
```

## 🏗️ SOLUCIÓN DEFINITIVA (Esta Semana)

### Phase 1: Merge Codebases (Day 1-2)

```bash
# 1. Copy MCP engine into main project
cp -r mcp_server/src/core src/analysis/
cp -r mcp_server/src/adapters/tools src/analysis/tools/
cp -r mcp_server/src/services src/analysis/services/

# 2. Update imports
# Change: from './core/engine.js'
# To: from 'src/analysis/engine'
```

### Phase 2: Direct Integration (Day 3)

```python
# src/api/routers/analysis.py
from src.analysis.engine import MarketAnalysisEngine
from src.analysis.tools import WyckoffTools, SMCTools

router = APIRouter(prefix="/api/v1/analysis")

# Direct access to analysis engine
engine = MarketAnalysisEngine(storage=get_mongo())

@router.post("/wyckoff/{symbol}")
async def analyze_wyckoff(symbol: str):
    # No more HTTP proxy!
    result = await engine.analyze_wyckoff_phase(symbol)
    return result

@router.post("/indicators/{symbol}")
async def calculate_indicators(symbol: str):
    # Direct calculation
    indicators = await engine.calculate_all_indicators(symbol)
    return indicators
```

### Phase 3: Single Docker Service (Day 4)

```dockerfile
# Dockerfile.unified
FROM python:3.11-slim

# Install both Python and Node (for MCP tools)
RUN apt-get update && apt-get install -y nodejs npm

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install -r requirements.txt

# Node deps for analysis tools
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy everything
COPY . .

# Single entrypoint
CMD ["python", "unified_server.py"]
```

```python
# unified_server.py
import asyncio
from src.api import create_app
from src.analysis import AnalysisEngine
from src.collectors import start_collectors

async def main():
    # One MongoDB for everything
    storage = MongoManager()
    
    # Start collectors
    collector_task = asyncio.create_task(
        start_collectors(storage)
    )
    
    # Start unified API with embedded analysis
    app = create_app(storage=storage)
    
    # Run FastAPI
    import uvicorn
    await uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    asyncio.run(main())
```

### Phase 4: Update Frontend (Day 5)

```typescript
// Before: Multiple endpoints
const apiUrl = 'http://localhost:8000'
const mcpUrl = 'http://localhost:8001'

// After: Single endpoint
const apiUrl = 'http://localhost:8000'

// All requests go to one place
const analysis = await fetch(`${apiUrl}/api/v1/analysis/wyckoff/${symbol}`)
const indicators = await fetch(`${apiUrl}/api/v1/indicators/${symbol}`)
```

## 📊 Arquitectura Final

```
┌─────────────────────────────────────────────┐
│            WADM Unified Backend             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │         FastAPI Router              │  │
│  │  /api/v1/market    → Market Data    │  │
│  │  /api/v1/analysis  → Direct Engine  │  │
│  │  /api/v1/indicators → Calculations  │  │
│  │  /api/v1/auth      → Auth/Sessions  │  │
│  └──────────────┬──────────────────────┘  │
│                 │                          │
│  ┌──────────────┴──────────────────────┐  │
│  │      Embedded Analysis Engine       │  │
│  │  - 133 Analysis Tools               │  │
│  │  - Wyckoff, SMC, Technical         │  │
│  │  - Direct MongoDB Access            │  │
│  └──────────────┬──────────────────────┘  │
│                 │                          │
│  ┌──────────────┴──────────────────────┐  │
│  │        WebSocket Collectors         │  │
│  │  - Bybit, Binance, Coinbase, Kraken│  │
│  │  - Real-time data ingestion         │  │
│  └──────────────┬──────────────────────┘  │
│                 │                          │
│         ┌───────┴────────┐                │
│         │   MongoDB       │                │
│         │  (All Data)     │                │
│         └────────────────┘                │
└─────────────────────────────────────────────┘
```

## 🚀 Beneficios de la Unificación

### Performance
- **-50% latencia**: Elimina HTTP hop entre API y MCP
- **-30% memoria**: Un proceso vs varios
- **+100% velocidad** en análisis (acceso directo)

### Mantenimiento
- **1 log file** para debug
- **1 deployment** para actualizar
- **1 codebase** para mantener

### Desarrollo
- **Debugging directo** sin saltar entre servicios
- **Testing simplificado** sin mocks HTTP
- **IDE integration** mejor (todo en un proyecto)

## 📋 Checklist de Migración

### Día 1: Quick Fix
- [ ] Ejecutar `unify_storage.sh`
- [ ] Verificar todas las colecciones en MongoDB
- [ ] Confirmar indicadores calculándose

### Día 2-3: Code Merge
- [ ] Copiar MCP engine a src/analysis/
- [ ] Actualizar imports y paths
- [ ] Test unitarios pasando

### Día 4: Integration
- [ ] Crear routers directos (sin proxy)
- [ ] Eliminar MCPClient HTTP
- [ ] Verificar todas las herramientas funcionando

### Día 5: Deployment
- [ ] Crear Dockerfile unificado
- [ ] Actualizar docker-compose.yml
- [ ] Test end-to-end completo

### Día 6: Cleanup
- [ ] Remover servicio MCP antiguo
- [ ] Actualizar documentación
- [ ] Celebrar 🎉

## 🔧 Comandos Útiles Durante Migración

```bash
# Monitor unificación
watch -n 2 'docker exec wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --eval "use wadm; db.stats().collections"'

# Verificar que ambos servicios usan mismo MongoDB
docker-compose exec backend env | grep MONGO
docker-compose exec mcp-server env | grep MONGO

# Test rápido de análisis
curl -X POST http://localhost:8000/api/v1/mcp/analyze/complete/BTCUSDT

# Ver logs unificados
docker-compose logs -f --tail=100 backend mcp-server collectors

# Backup antes de cambios
docker exec wadm-mongo-1 mongodump -u wadm -p wadm_secure_2024 --out /tmp/backup
```

## ⚠️ Rollback Plan

Si algo sale mal:

```bash
# 1. Restaurar docker-compose original
git checkout docker-compose.yml
rm docker-compose.override.yml

# 2. Restart servicios
docker-compose down
docker-compose up -d

# 3. Verificar servicios separados funcionando
curl http://localhost:8000/api/v1/system/health
curl http://localhost:8001/health
```

## 📝 Notas Finales

La unificación es la dirección correcta porque:

1. **KISS Principle**: Un sistema simple es mejor que dos complejos
2. **Real-world usage**: El frontend no necesita saber de arquitectura interna
3. **Cost effective**: Menos recursos, menos complejidad
4. **Future proof**: Más fácil agregar features sin coordinación

El MCP como servicio separado tenía sentido para desarrollo modular, pero en producción la simplicidad gana.

---

## ✅ FASE 0 COMPLETADA (2025-06-25)

### IMPLEMENTACIÓN EXITOSA: Sistema Timeframes Dinámico

#### Código Implementado:
- ✅ **`src/manager.py`** - Sistema completo de timeframes
- ✅ **19 timeframes profesionales** - De 1s hasta 1M
- ✅ **10 indicadores configurados** - Con sistema de prioridades
- ✅ **Resource management** - Control de concurrencia inteligente

#### Confirmado en Producción Docker:
```bash
✅ "WADM Manager initialized with complete timeframe system"
✅ "Available timeframes: ['1s', '5s', '15s', '30s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']"
✅ "Configured indicators: ['volume_profile', 'order_flow', 'footprint', 'market_profile', 'vwap', 'bollinger_bands', 'rsi', 'macd', 'wyckoff', 'smc']"
```

#### Arquitectura Mejorada:
- **Cálculo dinámico**: Por tiempo fijo vs N trades (problema resuelto)
- **Sistema de prioridades**: CRITICAL > HIGH > MEDIUM > LOW
- **Resource optimization**: Máximo 10 cálculos concurrentes
- **Professional alignment**: Timeframes estándar de trading

---

**✅ NEXT STEP**: Fase 1 - Ejecutar `./scripts/unify_storage.sh` y verificar que las colecciones faltantes aparezcan.
