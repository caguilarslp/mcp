# FastMCP Architecture for WADM

## Overview
FastMCP es la capa de integración entre WADM y Claude Desktop usando el protocolo MCP 2.8.0.

## Arquitectura

```
Claude Desktop (Local)
    ↓ MCP Protocol
FastMCP Server (FastAPI)
    ↓ HTTP/WebSocket
WADM Backend
    ↓
MongoDB (Datos)
```

## Implementación FastAPI + MCP

### 1. Estructura del Proyecto
```
wadm/
├── src/
│   ├── mcp/
│   │   ├── __init__.py
│   │   ├── server.py        # FastAPI + MCP server
│   │   ├── tools.py         # MCP tools implementation
│   │   ├── resources.py     # MCP resources
│   │   └── prompts.py       # Wyckoff prompts
│   └── api/
│       ├── __init__.py
│       ├── routes/
│       │   ├── klines.py    # Historical data
│       │   ├── indicators.py # Indicators API
│       │   └── ws.py        # WebSocket
│       └── models.py        # Pydantic models
```

### 2. MCP Tools para Wyckoff

```python
# Tools disponibles en Claude Desktop
tools = [
    {
        "name": "get_market_structure",
        "description": "Analyze market structure and trend",
        "parameters": {
            "symbol": "string",
            "timeframe": "string",
            "periods": "integer"
        }
    },
    {
        "name": "analyze_wyckoff_phase",
        "description": "Detect current Wyckoff phase",
        "parameters": {
            "symbol": "string",
            "timeframe": "string",
            "lookback_days": "integer"
        }
    },
    {
        "name": "get_volume_profile",
        "description": "Get volume profile for period",
        "parameters": {
            "symbol": "string",
            "timeframe": "string",
            "start": "datetime",
            "end": "datetime"
        }
    },
    {
        "name": "detect_spring_pattern",
        "description": "Find potential springs/upthrusts",
        "parameters": {
            "symbol": "string",
            "sensitivity": "float"
        }
    },
    {
        "name": "get_order_flow_analysis",
        "description": "Analyze order flow and delta",
        "parameters": {
            "symbol": "string",
            "timeframe": "string",
            "periods": "integer"
        }
    }
]
```

### 3. Configuración MCP en Claude Desktop

```json
// claude_desktop_config.json
{
    "mcp": {
        "servers": {
            "wadm": {
                "command": "python",
                "args": ["-m", "uvicorn", "src.mcp.server:app"],
                "url": "http://localhost:8000/mcp/v1",
                "api_key": "your_api_key_here"
            }
        }
    }
}
```

### 4. Ejemplo de Implementación

```python
# src/mcp/server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mcp

app = FastAPI(title="WADM MCP Server")

# CORS para Claude Desktop
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# MCP endpoints
@app.get("/mcp/v1/tools")
async def get_tools():
    """Lista herramientas disponibles"""
    return {
        "tools": [
            {
                "name": "get_market_structure",
                "description": "Analyze Wyckoff market structure",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string"},
                        "timeframe": {"type": "string"},
                        "periods": {"type": "integer", "default": 100}
                    },
                    "required": ["symbol", "timeframe"]
                }
            },
            # ... más tools
        ]
    }

@app.post("/mcp/v1/tools/{tool_name}")
async def execute_tool(tool_name: str, params: dict):
    """Ejecuta una herramienta MCP"""
    if tool_name == "get_market_structure":
        return await analyze_market_structure(params)
    elif tool_name == "analyze_wyckoff_phase":
        return await detect_wyckoff_phase(params)
    # ... más herramientas
```

### 5. Flujo de Uso

1. **Usuario en Claude Desktop**: "Analiza la estructura de mercado de BTCUSDT en 4H"

2. **Claude MCP**: Llama a `get_market_structure` tool

3. **FastMCP Server**: 
   - Recibe request
   - Consulta MongoDB agregados
   - Calcula estructura
   - Retorna análisis

4. **Claude**: Interpreta y explica los resultados en lenguaje natural

### 6. Desarrollo Local vs VPS

**Local (Fase 1)**:
- FastMCP corre en localhost:8000
- MongoDB local
- Claude Desktop accede directo

**VPS (Fase 2)**:
- FastMCP en VPS con HTTPS
- MongoDB Atlas o VPS
- Autenticación API Key
- Claude Desktop accede remoto

### 7. Ventajas de FastAPI para MCP

- **Async nativo**: Perfecto para WebSockets y queries pesadas
- **Pydantic**: Validación automática de schemas MCP
- **Auto-documentación**: Swagger UI para testing
- **Performance**: Uno de los frameworks más rápidos
- **Type hints**: Compatible con MCP types
- **WebSocket**: Actualizaciones en tiempo real

### 8. Próximos Pasos

1. Implementar FastMCP básico con 1-2 tools
2. Probar integración con Claude Desktop local
3. Añadir más tools incrementalmente
4. Optimizar queries y caché
5. Preparar para deployment VPS
