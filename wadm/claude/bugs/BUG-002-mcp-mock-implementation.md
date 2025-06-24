# BUG-002: MCP Integration Mock Implementation

## Bug Description
La implementación de TASK-080 (HTTP Wrapper for MCP) viola el principio fundamental del proyecto: NO MOCKS.

## Severity
**CRITICAL** - Viola principio arquitectónico fundamental

## Current Status
**OPEN** 🔴 - API funcionando pero con datos falsos

## Components Affected
- `src/api/services/mcp/client_http.py` - Implementación con mocks
- `src/api/services/mcp/__init__.py` - Importa el cliente mock
- `src/api/routers/mcp.py` - Usa respuestas falsas

## What's Working
✅ Todos los endpoints MCP están creados y accesibles
✅ Integración con sesiones funcionando
✅ Rate limiting aplicado
✅ Swagger documentation disponible
✅ API arranca sin errores

## What's NOT Working
❌ No hay comunicación real con MCP Server
❌ Todas las respuestas son datos hardcodeados
❌ No se ejecutan las 117+ herramientas reales del MCP

## Root Cause
Se priorizó tener algo "funcionando" rápidamente en lugar de implementar la comunicación real con el MCP Server.

## Current Behavior
- Todos los endpoints MCP devuelven datos simulados/hardcodeados
- No hay comunicación real con el MCP Server
- Las respuestas son estáticas y no reflejan análisis real

## Expected Behavior
- Comunicación real con MCP Server via protocolo stdio
- Respuestas dinámicas basadas en datos reales del mercado
- Ejecución real de las 117+ herramientas del MCP

## Solution
### Opción 1: Python Subprocess (Recomendada)
```python
# Protocolo correcto MCP
message = {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
        "name": tool_name,
        "arguments": params
    },
    "id": 1
}

# Ejecutar y comunicar
process = await asyncio.create_subprocess_exec(
    "node", "mcp_server/build/index.js",
    stdin=PIPE, stdout=PIPE, stderr=PIPE
)
stdout, stderr = await process.communicate(json.dumps(message).encode())
result = json.loads(stdout.decode())
```

### Opción 2: HTTP Wrapper Real (TypeScript)
Implementar un servidor Express.js que exponga el MCP via HTTP.

## Steps to Reproduce
1. Llamar cualquier endpoint MCP: `POST /api/v1/mcp/call`
2. Observar que siempre devuelve los mismos datos
3. Verificar que no hay proceso node ejecutándose

## Impact
- **Development**: Falsa sensación de progreso
- **Testing**: Imposible probar funcionalidad real
- **Production**: Sistema no funcionaría en absoluto
- **Trust**: Viola confianza en principios del proyecto

## Priority
**P0 - MUST FIX IMMEDIATELY**

## Time Estimate
4 horas para implementación correcta + testing

## Notes
Esta es una lección importante sobre por qué el principio NO MOCKS existe. Los atajos siempre cuestan más a largo plazo.

## Status
**OPEN** - Requiere corrección inmediata
