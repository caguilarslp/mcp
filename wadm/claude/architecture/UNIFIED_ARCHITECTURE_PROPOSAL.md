# WADM Unified Architecture Proposal

## 🎯 Objetivo
Eliminar duplicidades arquitecturales entre MCP Server y API Backend, unificando en un solo sistema coherente.

## 📊 Estado Actual (Problemático)

### Duplicidades Identificadas:
1. **Dos sistemas MongoDB separados**
   - MCP: Storage híbrido con sus propias colecciones
   - API: MongoDB para trades/orderbooks básicos
   - **Resultado**: Datos fragmentados, colecciones faltantes

2. **Responsabilidades superpuestas**
   - MCP: 133 herramientas de análisis + storage
   - API: Proxy hacia MCP + collectors + auth
   - **Resultado**: Complejidad innecesaria

3. **Múltiples puntos de entrada**
   - Frontend → API (`:8000`) → MCP (`:8001`)
   - **Resultado**: Latencia adicional, más puntos de fallo

## 🏗️ Arquitectura Propuesta: UNIFICACIÓN

### Opción A: **Consolidación Completa** (RECOMENDADA)

#### Estructura:
```
wadm/
├── src/
│   ├── api/
│   │   ├── routers/        # FastAPI routes
│   │   ├── middleware/     # Auth, rate limit
│   │   └── websocket/      # WS handlers
│   ├── analysis/           # MCP Engine (133 tools)
│   │   ├── engine/         # Core analysis
│   │   ├── tools/          # Analysis tools
│   │   └── services/       # Market data
│   ├── collectors/         # Exchange collectors
│   ├── storage/           # Unified MongoDB
│   └── shared/            # Common types/utils
└── main.py               # Single entry point
```

#### Beneficios:
1. **Un solo MongoDB** con todas las colecciones
2. **Acceso directo** a herramientas MCP (sin proxy)
3. **Menor latencia** (elimina hop extra)
4. **Mantenimiento simplificado**
5. **Estado consistente** entre componentes

#### Implementación:

```python
# main.py - Unified Server
from fastapi import FastAPI
from src.api import create_api_app
from src.analysis.engine import MarketAnalysisEngine
from src.collectors import CollectorManager

class UnifiedWADMServer:
    def __init__(self):
        # Single MongoDB instance
        self.storage = MongoManager()
        
        # Analysis engine with direct storage access
        self.engine = MarketAnalysisEngine(storage=self.storage)
        
        # Collectors writing to same DB
        self.collectors = CollectorManager(storage=self.storage)
        
        # FastAPI with embedded MCP tools
        self.app = create_api_app(
            engine=self.engine,
            storage=self.storage
        )
    
    async def start(self):
        # Start collectors
        await self.collectors.start_all()
        
        # API handles everything
        # No separate MCP server needed
```

### Opción B: **Separación Clara con Shared Storage**

#### Estructura:
```
┌──────────────┐     ┌──────────────┐
│  API Server  │     │  MCP Server  │
│   (FastAPI)  │     │ (Analysis)   │
└──────┬───────┘     └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │
          ┌───────┴────────┐
          │ Shared MongoDB │
          └────────────────┘
```

#### Configuración MongoDB compartida:
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - DATABASE_URL=mongodb://wadm:pass@mongo:27017/wadm
  
  mcp-server:
    environment:
      - MONGODB_URI=mongodb://wadm:pass@mongo:27017/wadm
```

## 📋 Plan de Migración

### Fase 1: Unificar Storage (1 día)
1. Configurar ambos servicios para usar **mismo MongoDB**
2. Migrar colecciones del MCP storage al MongoDB principal
3. Verificar que todos los datos estén accesibles

### Fase 2: Integrar MCP Engine (2-3 días)
1. Mover código del MCP engine a `src/analysis/`
2. Exponer herramientas directamente en API routes
3. Eliminar proxy HTTP entre servicios

### Fase 3: Consolidar Collectors (1 día)
1. Asegurar collectors escriben a MongoDB unificado
2. Verificar indicadores calculándose correctamente
3. Limpiar configuraciones duplicadas

### Fase 4: Simplificar Docker (1 día)
1. Un solo servicio backend con todo incluido
2. Eliminar servicio MCP separado
3. Actualizar frontend para usar solo `:8000`

## 🎯 Resultado Final

### Un solo servicio con:
- **FastAPI** manejando HTTP/WebSocket
- **133 herramientas MCP** embebidas
- **Collectors** integrados
- **MongoDB único** con todos los datos
- **Sin duplicidades** ni proxies innecesarios

### Comandos simplificados:
```bash
# Solo necesitas:
docker-compose up backend mongo redis

# En lugar de:
docker-compose up backend mcp-server collectors mongo redis
```

## 🚀 Beneficios Inmediatos

1. **Recuperar datos faltantes**: Un solo MongoDB = todas las colecciones visibles
2. **Mejor performance**: Elimina latencia del proxy HTTP
3. **Debugging simple**: Un solo log, un solo proceso
4. **Mantenimiento fácil**: Una base de código unificada
5. **Escalabilidad**: Más fácil escalar un servicio que coordinar varios

## ⚠️ Consideraciones

- **Memoria**: Un proceso más grande (pero más eficiente que varios pequeños)
- **Modularidad**: Menos separación de concerns (pero más pragmático)
- **Testing**: Necesitará refactoring de tests

## 📊 Métricas de Éxito

- [ ] Todas las colecciones MongoDB accesibles
- [ ] Latencia API reducida en 30-50%
- [ ] Un solo proceso Docker para backend
- [ ] Cero duplicación de código
- [ ] Frontend funcionando sin cambios

## 🔧 Siguiente Paso Inmediato

**HOY**: Configurar ambos servicios para usar el mismo MongoDB:

```bash
# 1. Actualizar docker-compose.yml con misma connection string
# 2. Restart servicios
docker-compose down
docker-compose up -d

# 3. Verificar colecciones
docker exec -it wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024
> use wadm
> show collections
```

Esto debería mostrar TODAS las colecciones, incluyendo las "faltantes".
