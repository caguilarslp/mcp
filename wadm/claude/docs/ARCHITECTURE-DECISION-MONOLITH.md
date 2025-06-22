# WADM/WAIckoff Architecture Decision

## 🎯 Decisión: Monolith First (KISS Principle)

### Arquitectura Elegida: TODO en la API

```
app.waickoff.com (Frontend)
    ↓
api.waickoff.com (Backend + AI)
    ├── /api/v1/market/*      # Market data
    ├── /api/v1/indicators/*  # Technical indicators
    ├── /api/v1/wyckoff/*     # Wyckoff analysis
    ├── /api/v1/sessions/*    # Session management
    ├── /api/v1/chat/*        # Chat with Claude
    └── /api/v1/payments/*    # Stripe integration
```

### ✅ Ventajas del Monolito

1. **Simplicidad Total**
   - Un solo deployment
   - Un solo repo
   - Una sola base de código
   - Debug más fácil

2. **Velocidad de Desarrollo**
   - No perder tiempo en comunicación entre servicios
   - No duplicar lógica de autenticación
   - Cambios rápidos sin coordinación

3. **Costo Mínimo**
   - 1 servidor maneja todo (<1000 users)
   - No overhead de red entre servicios
   - Cache compartido eficiente

4. **Claude Integration Simple**
   ```python
   # Dentro de la API principal
   class ChatService:
       async def process_message(self, session_id: str, message: str):
           # Obtener contexto de la DB
           context = await self.build_context(session.symbol)
           # Llamar a Claude
           response = await claude_client.complete(context + message)
           # Guardar en session
           await self.save_to_session(session_id, response)
           return response
   ```

### 🚫 Por qué NO microservicios (aún)

1. **Overhead innecesario**
   - Latencia extra entre servicios
   - Complejidad de deployment
   - Debugging distribuido
   - Service discovery

2. **No lo necesitamos hasta**
   - >10,000 usuarios concurrentes
   - >100 requests/segundo sostenidos
   - Equipos separados trabajando

3. **YAGNI** (You Aren't Gonna Need It)
   - Podemos migrar después SI es necesario
   - Monolito bien estructurado = fácil de dividir
   - Optimización prematura = raíz de todo mal

### 📁 Estructura de Carpetas Sugerida

```
waickoff/
├── api/
│   ├── main.py              # FastAPI app
│   ├── routers/
│   │   ├── market.py        # Market data endpoints
│   │   ├── indicators.py    # Technical indicators
│   │   ├── wyckoff.py       # Wyckoff analysis
│   │   ├── sessions.py      # Session management
│   │   ├── chat.py          # Chat endpoints
│   │   └── payments.py      # Stripe webhooks
│   ├── services/
│   │   ├── claude_service.py    # Claude integration
│   │   ├── mcp_service.py       # MCP tools wrapper
│   │   ├── session_service.py   # Session logic
│   │   └── payment_service.py   # Stripe logic
│   └── models/
│       ├── session.py       # Session models
│       ├── user.py          # User models
│       └── analysis.py      # Analysis results
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   └── package.json
└── docker-compose.yml       # Todo en un stack
```

### 🚀 Deployment Simple

```yaml
# docker-compose.yml
services:
  api:
    build: ./api
    ports:
      - "8000:8000"
    environment:
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=https://api.waickoff.com
  
  nginx:
    image: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### 🔄 Migración Futura (si necesario)

El monolito bien estructurado permite extraer servicios fácilmente:

```python
# Ahora (monolito)
class ChatService:
    def __init__(self, claude_client, db):
        self.claude = claude_client
        self.db = db

# Futuro (si necesitas microservicio)
class ChatService:
    def __init__(self, api_client):
        self.api = api_client  # Llama a ai.waickoff.com
```

### 📊 Métricas para Decidir Cuándo Dividir

Considerar microservicios SOLO cuando:
- Response time >500ms consistentemente
- CPU >80% sostenido
- Memoria >8GB para la API
- >50 requests/segundo promedio
- Equipos separados necesitan autonomía

### 🎯 Conclusión

**Para WAIckoff v1.0**: Un monolito en `api.waickoff.com` que maneje TODO incluyendo Claude/AI es la decisión correcta. Simple, rápido de desarrollar, fácil de mantener, y barato de hostear.

**Subdomains finales**:
- `waickoff.com` - Landing page
- `app.waickoff.com` - Dashboard/Frontend
- `api.waickoff.com` - API + AI + Todo
- `docs.waickoff.com` - Documentación (opcional)

No necesitas `ai.waickoff.com` como servicio separado. La IA es solo una función más de tu API principal.
