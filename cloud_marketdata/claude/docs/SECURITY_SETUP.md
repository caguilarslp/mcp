# 🔐 Seguridad Temporal para Desarrollo

## Resumen

Para el acceso temporal desde múltiples computadoras sin IP fija, hemos implementado un sistema de **API Keys** simple pero efectivo.

## Características de Seguridad

1. **API Keys con hash SHA-256**
   - Las keys se almacenan hasheadas, nunca en texto plano
   - Formato: `cmkd_[32_caracteres_aleatorios]`

2. **Control de Expiración**
   - Por defecto: 7 días
   - Configurable al crear la key

3. **Permisos Granulares**
   - `read`: Solo lectura (por defecto)
   - `write`: Lectura y escritura
   - `admin`: Acceso total

4. **Monitoreo de Uso**
   - Tracking de IPs concurrentes
   - Contador de uso
   - Última vez usada

5. **Rate Limiting** (por implementar)
   - Límite de requests por minuto
   - Por API key, no por IP

## Uso de API Keys

### 1. Crear una API Key

```bash
# Crear key de solo lectura (7 días)
curl -X POST "http://localhost:8000/auth/api-keys?name=laptop-dev&expires_in_days=7&permissions=read"

# Crear key con permisos de escritura (30 días)
curl -X POST "http://localhost:8000/auth/api-keys?name=desktop-main&expires_in_days=30&permissions=read,write"
```

**Respuesta:**
```json
{
  "api_key": "cmkd_xKj3n4B8vQ2m5Lp9wR7tY6u...",
  "name": "laptop-dev",
  "expires_in_days": 7,
  "permissions": ["read"],
  "warning": "Save this key securely. It cannot be retrieved again."
}
```

### 2. Usar la API Key

Incluye el header `X-API-Key` en todas las requests:

```bash
# Ejemplo: Obtener símbolos
curl -H "X-API-Key: cmkd_xKj3n4B8vQ2m5Lp9wR7tY6u..." \
     http://localhost:8000/collectors/symbols

# Ejemplo: Añadir símbolo (requiere permiso write)
curl -X POST -H "X-API-Key: cmkd_xKj3n4B8vQ2m5Lp9wR7tY6u..." \
     "http://localhost:8000/collectors/symbols?symbol=SOLUSDT"
```

### 3. Listar API Keys

```bash
curl http://localhost:8000/auth/api-keys
```

### 4. Revocar API Key

```bash
# Usa los primeros 8-12 caracteres del hash
curl -X DELETE http://localhost:8000/auth/api-keys/a1b2c3d4e5f6
```

## Configuración para MCP Clients

En cada computadora que use wAIckoff MCP:

1. **Crear una API key específica** para esa máquina:
   ```bash
   curl -X POST "http://vps-ip:8000/auth/api-keys?name=pc-oficina&expires_in_days=30"
   ```

2. **Configurar el cliente MCP** con la API key:
   ```python
   # En el cliente MCP
   headers = {
       "X-API-Key": "cmkd_your_api_key_here..."
   }
   ```

3. **Conectar via HTTP** con la key:
   ```
   http://vps-ip:8000/sse
   ```

## Mejoras para Producción

Cuando migres al VPS final:

1. **Usar Redis** para almacenar keys (no memoria)
2. **Implementar OAuth2/JWT** para autenticación más robusta
3. **HTTPS obligatorio** con certificados SSL
4. **Firewall** con reglas estrictas
5. **VPN** para acceso administrativo
6. **Rate limiting** más agresivo
7. **IP whitelisting** para endpoints críticos
8. **Audit logs** de todos los accesos

## Ejemplo de Docker Compose con Seguridad

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"  # En producción, usar reverse proxy
    environment:
      - REQUIRE_API_KEY=true
      - API_KEY_HEADER=X-API-Key
      - RATE_LIMIT_PER_MINUTE=100
    networks:
      - internal

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app

networks:
  internal:
    driver: bridge
```

## Comandos Útiles

```bash
# Generar API key desde el servidor
docker exec -it cloud_marketdata python -c "
from src.auth import create_api_key
key = create_api_key('automation', expires_in_days=365, permissions={'read', 'write'})
print(f'API Key: {key}')
"

# Test de conexión con API key
curl -H "X-API-Key: YOUR_KEY" http://localhost:8000/health

# Ver logs de acceso
docker logs cloud_marketdata | grep "API key"
```

## Protección de Endpoints Actuales

Para proteger endpoints existentes, simplemente añade la dependencia:

```python
from fastapi import Security
from src.auth import require_read, require_write

# Endpoint protegido de solo lectura
@app.get("/collectors/trades")
async def get_trades(
    auth: Dict = Security(require_read),
    symbol: str = None
):
    # ... código existente ...

# Endpoint protegido de escritura
@app.post("/collectors/symbols")
async def add_symbol(
    auth: Dict = Security(require_write),
    symbol: str
):
    # ... código existente ...
```

## Monitoreo de Seguridad

```bash
# Ver uso de API keys
curl http://localhost:8000/auth/api-keys

# Verificar IPs activas (por implementar)
curl http://localhost:8000/auth/active-sessions

# Limpiar keys expiradas (automatizar con cron)
curl -X POST http://localhost:8000/auth/cleanup
```
