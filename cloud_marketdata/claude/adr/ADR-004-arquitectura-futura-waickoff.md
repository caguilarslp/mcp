# 🏛️ ADR-004: Arquitectura Futura - wAIckoff Platform

## Estado
Propuesto (Futuro)

## Contexto
Cloud MarketData comenzará como un microservicio simple MCP, pero está diseñado para evolucionar hacia una plataforma completa wAIckoff con IA integrada y dashboard. Necesitamos preparar la arquitectura para esta evolución sin añadir complejidad prematura.

## Decisión
Diseñaremos con una arquitectura de microservicios que permita escalar a:

### Arquitectura Target (Futuro)
```
┌─────────────────────────────────────────────┐
│            wAIckoff Platform                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   APP   │  │   API   │  │   AI    │    │
│  │(Next.js)│  │(FastAPI)│  │ (LLM)   │    │
│  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │             │          │
│  ┌────┴────────────┴─────────────┴────┐    │
│  │         Message Bus (Redis)        │    │
│  └────┬────────────┬─────────────┬────┘    │
│       │            │             │          │
│  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐    │
│  │ Market  │  │Analytics│  │ Trading │    │
│  │  Data   │  │ Engine  │  │ Engine  │    │
│  └─────────┘  └─────────┘  └─────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Fases de Evolución

#### Fase 1: MCP Service (Actual)
```
cloud_marketdata/
└── Single container con FastMCP
```

#### Fase 2: Multi-Service
```
waickoff/
├── marketdata/     # Cloud MarketData actual
├── api/           # REST/GraphQL API
└── docker-compose.yml
```

#### Fase 3: Full Platform
```
waickoff/
├── app/           # Dashboard React/Next.js
├── api/           # API Gateway
├── ai/            # IA Service con LLM
├── marketdata/    # Datos de mercado
├── analytics/     # Motor de análisis
├── trading/       # Motor de trading
└── k8s/          # Kubernetes configs
```

## Preparación Sin Complejidad

### 1. Nombres y Namespaces
- Usar `waickoff.marketdata` como namespace
- Prefijos consistentes en configuración
- URLs preparadas: `marketdata.waickoff.com`

### 2. Comunicación
- Todo via Message Bus (Redis) desde el inicio
- Eventos bien definidos y versionados
- No acoplar servicios directamente

### 3. Configuración
```yaml
# config/waickoff.yaml (futuro)
services:
  marketdata:
    url: ${MARKETDATA_URL:-http://localhost:8001}
  api:
    url: ${API_URL:-http://localhost:8002}
  app:
    url: ${APP_URL:-http://localhost:3000}
  ai:
    url: ${AI_URL:-http://localhost:8003}
```

### 4. Deployment Multi-VPS Ready
```nginx
# Nginx config (futuro)
upstream marketdata {
    server vps1.waickoff.com:8001;
    server vps2.waickoff.com:8001;
}

server {
    server_name marketdata.waickoff.com;
    location / {
        proxy_pass http://marketdata;
    }
}
```

## Decisiones de Diseño para Preparar el Futuro

### 1. Event-Driven desde el Inicio
```python
# Publicar eventos, no solo guardar datos
async def process_trade(trade: Trade):
    await save_to_db(trade)
    await publish_event("trade.processed", trade)  # Para futura IA
```

### 2. APIs Versionadas
```python
# Rutas con versión desde el inicio
@router.get("/v1/volume-profile")
@router.get("/v1/order-flow")
```

### 3. Esquemas Extensibles
```python
class Trade(BaseModel):
    # Campos actuales
    price: Decimal
    volume: Decimal
    
    # Preparados para futuro
    metadata: Dict[str, Any] = {}  # Para IA tags
    version: int = 1
```

### 4. Configuración por Entorno
```python
class Settings(BaseSettings):
    # Actual
    service_name: str = "marketdata"
    
    # Preparado para futuro
    platform_mode: str = "standalone"  # o "integrated"
    ai_enabled: bool = False
    dashboard_url: Optional[str] = None
```

## Consecuencias

### Positivas
- Evolución natural sin reescribir
- Cada servicio puede escalar independiente
- Multi-VPS desde el diseño
- IA puede consumir eventos históricos

### Negativas
- Slight overhead en mensajería
- Más configuración inicial
- Necesita pensar en eventos

### Mitigaciones
- Documentar eventos claramente
- Automation para deployment
- Mantener simplicidad en Fase 1

## Componentes Futuros

### Dashboard (app.waickoff.com)
- Next.js 14+ con App Router
- Tailwind CSS + shadcn/ui
- WebSocket para real-time
- PWA para mobile

### AI Service (ai.waickoff.com)
- LLM integration (GPT-4/Claude)
- Vector DB para memoria
- RAG sobre datos históricos
- Agentes especializados trading

### API Gateway (api.waickoff.com)
- FastAPI con GraphQL
- Auth centralizado (JWT/OAuth)
- Rate limiting por tier
- Webhooks para alertas

## Infraestructura Target
```yaml
# k8s/waickoff-platform.yaml (futuro)
apiVersion: v1
kind: Namespace
metadata:
  name: waickoff
---
services:
  - marketdata (2-3 replicas)
  - api (2 replicas)
  - app (2 replicas) 
  - ai (1 replica GPU)
  - redis (cluster mode)
  - mongodb (replica set)
```

## Fecha
2025-06-13

## Notas
Este ADR es una visión futura. No implementar hasta completar Fase 1 (MCP básico).
