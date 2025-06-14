# Cloud MarketData MCP Integration Guide

## 🔌 MCP Server Connection

El Cloud MarketData MCP Server proporciona herramientas para acceder a datos de mercado en tiempo real a través del protocolo MCP (Model Context Protocol).

## 🚀 Inicio Rápido

### 1. Servidor MCP Integrado con FastAPI

El servidor MCP se inicializa automáticamente cuando ejecutas la aplicación FastAPI:

```bash
# Iniciar servidor con MCP integrado
docker-compose --profile dev up -d

# Verificar que MCP está funcionando
curl http://localhost:8000/health
curl http://localhost:8000/mcp/ping?message="Test"
curl http://localhost:8000/mcp/info
```

### 2. Servidor MCP Standalone

Para usar únicamente el servidor MCP sin FastAPI:

```bash
# Ejecutar servidor MCP standalone
python mcp_server.py

# O usando npm scripts
npm run mcp-server
```

### 3. Cliente MCP de Prueba

Para probar la conectividad MCP:

```bash
# Instalar dependencias Node.js
npm install

# Ejecutar cliente de prueba
npm run mcp-client
```

## 🛠️ Herramientas MCP Disponibles

### `ping`
Herramienta básica de conectividad.

**Parámetros:**
- `message` (string, opcional): Mensaje personalizado (default: "Hello from Cloud MarketData!")

**Respuesta:**
```json
{
    "status": "pong",
    "message": "Hello from Cloud MarketData!",
    "timestamp": "2025-06-14T10:30:00.000Z",
    "server": "Cloud MarketData MCP v0.1.0"
}
```

**Ejemplo de uso:**
```python
# Via cliente MCP
result = await client.call_tool("ping", {"message": "Test connection"})

# Via HTTP (para testing)
curl "http://localhost:8000/mcp/ping?message=Test"
```

### `get_system_info`
Información del sistema y capacidades del servidor.

**Parámetros:** Ninguno

**Respuesta:**
```json
{
    "server_name": "Cloud MarketData MCP Server",
    "version": "0.1.0",
    "status": "operational",
    "available_tools": ["ping", "get_system_info"],
    "capabilities": {
        "market_data": "ready",
        "volume_profile": "coming_soon",
        "order_flow": "coming_soon"
    },
    "timestamp": "2025-06-14T10:30:00.000Z"
}
```

**Ejemplo de uso:**
```python
# Via cliente MCP
info = await client.call_tool("get_system_info", {})

# Via HTTP (para testing)
curl "http://localhost:8000/mcp/info"
```

## 🔧 Configuración del Cliente MCP

### Configuración en package.json

El `package.json` incluye configuración MCP estándar:

```json
{
    "mcp": {
        "server": {
            "command": "python",
            "args": ["mcp_server.py"],
            "env": {
                "PYTHONPATH": "."
            }
        },
        "tools": [
            {
                "name": "ping",
                "description": "Test MCP connectivity with ping/pong"
            },
            {
                "name": "get_system_info", 
                "description": "Get Cloud MarketData server information"
            }
        ]
    }
}
```

### Conexión desde wAIckoff

Para conectar desde el sistema wAIckoff existente:

```json
// En configuración MCP de wAIckoff
{
    "servers": {
        "cloud-marketdata": {
            "command": "python",
            "args": ["D:/projects/mcp/cloud_marketdata/mcp_server.py"],
            "env": {
                "PYTHONPATH": "D:/projects/mcp/cloud_marketdata"
            }
        }
    }
}
```

### Cliente MCP Programático

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Crear transporte
const transport = new StdioClientTransport({
    command: 'python',
    args: ['mcp_server.py'],
    env: { PYTHONPATH: '.' }
});

// Crear cliente
const client = new Client({
    name: 'my-mcp-client',
    version: '1.0.0'
}, {
    capabilities: { tools: {} }
});

// Conectar y usar
await client.connect(transport);
const result = await client.callTool({
    name: 'ping',
    arguments: { message: 'Hello!' }
});
```

## 🔍 Testing y Debugging

### Tests Automatizados

```bash
# Ejecutar tests MCP
python -m pytest tests/mcp/test_mcp.py -v

# O usando npm
npm run test-mcp
```

### HTTP Endpoints para Testing

Durante desarrollo, puedes usar endpoints HTTP para probar las herramientas MCP:

- `GET /mcp/ping?message=<msg>` - Ping tool
- `GET /mcp/info` - System info tool  
- `GET /health` - Health check (incluye status MCP)

### Logs y Monitoring

Los logs del servidor MCP aparecen en:

```bash
# Logs de contenedor Docker
docker-compose logs -f app

# Logs específicos del servidor MCP standalone
python mcp_server.py  # Logs van a stdout
```

## 🚧 Próximas Herramientas MCP

Las siguientes herramientas serán implementadas en futuras versiones:

### Volume Profile (TASK-007A)
- `get_volume_profile` - Obtener Volume Profile para símbolo/timeframe
- `get_volume_profile_levels` - Obtener niveles significativos (POC, VAH, VAL)

### Order Flow (TASK-007B)
- `get_order_flow` - Análisis de Order Flow y delta
- `get_order_flow_stream` - Stream en tiempo real de Order Flow
- `get_market_depth` - Profundidad de mercado actual

## ⚠️ Troubleshooting

### Problemas Comunes

1. **"MCP server not initialized"**
   - Verificar que el servidor FastAPI esté corriendo
   - Revisar logs de startup para errores de inicialización

2. **Error de conexión MCP**
   - Verificar que Python y dependencias estén instaladas
   - Verificar que el PYTHONPATH esté configurado correctamente

3. **Herramientas no disponibles**
   - Verificar que el cliente MCP esté conectado correctamente
   - Usar `listTools()` para ver herramientas disponibles

### Verificación de Estado

```bash
# Verificar que el servidor está funcionando
curl http://localhost:8000/health

# Verificar herramientas MCP via HTTP
curl http://localhost:8000/mcp/ping
curl http://localhost:8000/mcp/info

# Verificar logs
docker-compose logs -f app | grep "MCP"
```

## 📚 Referencias

- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Cloud MarketData API Documentation](http://localhost:8000/docs) (en desarrollo)

---

**Versión:** 0.1.0  
**Última actualización:** 14/06/2025  
**Estado:** Funcional - Herramientas básicas implementadas
