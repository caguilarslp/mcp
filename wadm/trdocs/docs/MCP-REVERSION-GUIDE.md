# Guía de Reversión: MCP Server Local a Imagen Docker Oficial

## Estado Actual
Actualmente tenemos un MCP Server local con HTTP wrapper en un contenedor custom. Esta guía explica cómo revertir a usar una imagen Docker oficial del MCP Server.

## Archivos a Revertir/Modificar

### 1. docker-compose.yml
**Cambiar de:**
```yaml
mcp-server:
  build:
    context: .
    dockerfile: Dockerfile.mcp
  container_name: wadm-mcp-server
  environment:
    NODE_ENV: production
    MONGODB_URI: mongodb://mongodb:27017/wadm
```

**A:**
```yaml
mcp-server:
  image: waickoff/mcp-server:1.10.1  # O el nombre oficial de la imagen
  container_name: wadm-mcp-server
  environment:
    MONGODB_URI: mongodb://mongodb:27017/wadm
    # Agregar variables según documentación de la imagen
  networks:
    - wadm-network
  depends_on:
    mongodb:
      condition: service_healthy
```

### 2. Archivos a Eliminar
```bash
# Eliminar archivos del MCP Server local
rm -rf mcp_server/

# Eliminar Dockerfile del MCP
rm Dockerfile.mcp

# Eliminar scripts de build
rm scripts/build-mcp.bat
rm scripts/build-mcp.sh
rm scripts/build-mcp-docker.bat
```

### 3. HTTP Wrapper - Dos Opciones

#### Opción A: Si la imagen incluye HTTP wrapper
Eliminar completamente el wrapper y actualizar el cliente:

**src/api/services/mcp/client.py**
```python
# Cambiar MCP_SERVER_URL para apuntar al puerto expuesto por la imagen
self.base_url = os.getenv("MCP_SERVER_URL", "http://mcp-server:8080")  # O el puerto que use
```

#### Opción B: Si la imagen solo expone stdio
Crear un wrapper minimalista sin filtrado de logs:

**docker/mcp-wrapper/http_wrapper.py**
```python
"""Minimal MCP HTTP Wrapper for official Docker image."""

import asyncio
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="MCP HTTP Wrapper")

class MCPRequest(BaseModel):
    method: str
    params: dict = {}

@app.post("/mcp/call")
async def call_mcp(request: MCPRequest):
    """Direct pass-through to MCP Server."""
    # Asume que la imagen oficial no envía logs a stdout
    process = await asyncio.create_subprocess_exec(
        "docker", "exec", "wadm-mcp-server", "mcp-cli",
        "--method", request.method,
        "--params", json.dumps(request.params),
        stdout=asyncio.subprocess.PIPE
    )
    stdout, _ = await process.communicate()
    return json.loads(stdout)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
```

### 4. Actualizar .dockerignore
```bash
# Remover referencias a mcp_server
# Eliminar estas líneas:
mcp_server/node_modules/
mcp_server/build/
mcp_server/.npm/
mcp_server/*.tsbuildinfo
```

### 5. Actualizar Requirements (si es necesario)
Si eliminamos FastMCP porque no lo necesitamos:
```bash
# requirements.txt
# Remover: fastmcp>=2.0.0
```

### 6. Variables de Entorno
**Actualizar .env:**
```bash
# Cambiar según documentación de la imagen oficial
MCP_SERVER_URL=http://mcp-server:8080  # O el puerto correcto
# Eliminar variables no necesarias
```

## Pasos de Migración

### 1. Detener Servicios
```bash
docker-compose down
docker-compose rm -f mcp-server
```

### 2. Limpiar Imágenes Locales
```bash
# Eliminar imagen construida localmente
docker rmi wadm-mcp-server
docker rmi $(docker images -f "dangling=true" -q)
```

### 3. Pull de Imagen Oficial
```bash
# Obtener la imagen oficial
docker pull waickoff/mcp-server:1.10.1
```

### 4. Actualizar Configuración
- Modificar docker-compose.yml
- Actualizar variables de entorno
- Ajustar cliente si es necesario

### 5. Iniciar con Nueva Imagen
```bash
docker-compose up -d mcp-server
docker-compose logs -f mcp-server
```

### 6. Verificar Funcionamiento
```bash
# Health check
curl http://localhost:8000/api/v1/mcp/health

# Listar herramientas
curl -H "X-API-Key: wadm_dev_master_key_2025" \
  http://localhost:8000/api/v1/mcp/tools

# Probar análisis
curl -X POST http://localhost:8000/api/v1/mcp/call \
  -H "X-API-Key: wadm_dev_master_key_2025" \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_ticker", "params": {"symbol": "BTCUSDT"}}'
```

## Actualización de Documentación

### 1. .claude_context
```
## MCP Integration Status
- **Architecture**: ✅ Using official MCP Docker image
- **HTTP Wrapper**: ✅ Minimal wrapper (if needed)
- **Client**: ✅ Standard httpx communication
- **Build**: ✅ No local build required
- **Image**: waickoff/mcp-server:1.10.1
```

### 2. claude/bugs/BUG-002-mcp-mock-implementation.md
Agregar nota final:
```markdown
## Final Resolution
- Migrated to official MCP Docker image
- Removed local build complexity
- Simplified HTTP wrapper
- Date: [fecha]
```

### 3. README.md
Actualizar sección de MCP:
```markdown
## MCP Integration
Using official Docker image: `waickoff/mcp-server:1.10.1`
No local build required.
```

## Rollback Plan

Si necesitas volver a la versión local:

1. **Restaurar archivos:**
   - Copiar `mcp_server/` desde backup
   - Restaurar `Dockerfile.mcp`
   - Restaurar wrapper original

2. **Revertir docker-compose.yml**
   - Cambiar image por build
   - Restaurar configuración anterior

3. **Rebuild:**
   ```bash
   docker-compose build mcp-server
   docker-compose up -d
   ```

## Beneficios de la Imagen Oficial

1. **Mantenimiento**: Actualizaciones del equipo MCP
2. **Estabilidad**: Probada y optimizada
3. **Simplicidad**: No build local
4. **Documentación**: Soporte oficial
5. **Versionado**: Tags semánticos

## Notas Importantes

- **Backup primero**: Guardar `mcp_server/` antes de eliminar
- **Documentar versión**: Anotar exacta versión de imagen usada
- **Variables de entorno**: Pueden cambiar según imagen oficial
- **Puerto**: Verificar puerto expuesto por la imagen
- **Logs**: Verificar dónde van los logs en la imagen oficial

## Checklist de Reversión

- [ ] Backup de archivos actuales
- [ ] Obtener imagen Docker oficial
- [ ] Actualizar docker-compose.yml
- [ ] Eliminar archivos locales MCP
- [ ] Actualizar cliente/wrapper si necesario
- [ ] Probar todas las funcionalidades
- [ ] Actualizar documentación
- [ ] Commit de cambios
- [ ] Tag de versión

## Comandos Útiles

```bash
# Ver qué está usando espacio
docker system df

# Limpiar todo lo no usado
docker system prune -a

# Ver logs específicos
docker-compose logs --tail=100 mcp-server

# Ejecutar comandos en contenedor
docker exec -it wadm-mcp-server sh

# Inspeccionar imagen
docker inspect waickoff/mcp-server:1.10.1
```

---

**IMPORTANTE**: Esta guía asume que la imagen oficial del MCP Server está correctamente configurada para no enviar logs a stdout y comunicarse correctamente via JSON-RPC. Verificar la documentación oficial de la imagen antes de proceder.
