# Prompt para Análisis de MCP Server User Guides

## Contexto
Tenemos un MCP Server (Model Context Protocol) llamado `waickoff_mcp` que funciona perfectamente en Claude Desktop con 119+ herramientas de análisis de trading. Este servidor está siendo integrado en WADM (wAIckoff Data Manager) mediante una arquitectura Docker con HTTP wrapper.

## Ubicaciones Clave
- **MCP Original**: `D:\projects\mcp\waickoff_mcp\`
- **User Guides**: `D:\projects\mcp\waickoff_mcp\claude\user-guides\`
- **MCP en WADM**: `D:\projects\mcp\wadm\mcp_server\`
- **Documentación WADM**: `D:\projects\mcp\wadm\claude\docs\`

## Objetivo del Análisis
Necesito que analices exhaustivamente las user guides del MCP Server y:

1. **Mapeo de Funcionalidades**
   - Identificar TODAS las 119+ herramientas disponibles
   - Categorizar por tipo (Wyckoff, SMC, Technical, Volume, etc.)
   - Documentar parámetros de entrada y salida de cada herramienta
   - Identificar dependencias entre herramientas

2. **Casos de Uso en WADM**
   - Cómo usar cada herramienta desde la API REST de WADM
   - Ejemplos de llamadas HTTP con curl
   - Workflows comunes (análisis completo, trading setups, etc.)
   - Integración con sesiones y tracking de tokens

3. **Guías de Implementación**
   - Mejores prácticas para cada categoría de herramientas
   - Manejo de errores y timeouts
   - Estrategias de caché para optimización
   - Patrones de uso avanzado (tool chaining, análisis multi-timeframe)

4. **Tareas de Desarrollo**
   - Crear tareas específicas para aprovechar cada grupo de herramientas
   - Priorizar según valor de negocio para WAIckoff
   - Estimar complejidad y tiempo de implementación
   - Identificar quick wins vs. features complejas

## Archivos a Analizar
Por favor, lee y analiza TODOS los archivos en:
- `D:\projects\mcp\waickoff_mcp\claude\user-guides\`
- `D:\projects\mcp\waickoff_mcp\claude\docs\`
- `D:\projects\mcp\waickoff_mcp\.claude_context`
- `D:\projects\mcp\waickoff_mcp\README.md`

## Arquitectura Actual en WADM

### Comunicación
```
Cliente -> WADM API -> MCP HTTP Wrapper -> MCP Server (stdio)
   HTTP      :8000         :3000            JSON-RPC
```

### Endpoints WADM
```
POST /api/v1/mcp/call        # Llamar cualquier herramienta
GET  /api/v1/mcp/tools       # Listar herramientas
GET  /api/v1/mcp/health      # Estado del servidor

# Endpoints de conveniencia
POST /api/v1/mcp/analyze/wyckoff/{symbol}
POST /api/v1/mcp/analyze/smc/{symbol}
POST /api/v1/mcp/analyze/complete/{symbol}
```

### Ejemplo de Llamada
```bash
curl -X POST http://localhost:8000/api/v1/mcp/call \
  -H "X-API-Key: wadm_dev_master_key_2025" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "analyze_wyckoff_phase",
    "params": {
      "symbol": "BTCUSDT",
      "timeframe": "60"
    }
  }'
```

## Entregables Esperados

### 1. Catálogo Completo de Herramientas
Crear `WADM-MCP-TOOLS-CATALOG.md` con:
- Lista completa de las 119+ herramientas
- Descripción detallada de cada una
- Parámetros y respuestas esperadas
- Ejemplos de uso en WADM

### 2. Guías de Usuario WADM
Crear múltiples guías específicas:
- `WADM-WYCKOFF-GUIDE.md` - Cómo usar herramientas Wyckoff
- `WADM-SMC-GUIDE.md` - Smart Money Concepts en WADM
- `WADM-TECHNICAL-GUIDE.md` - Indicadores técnicos
- `WADM-TRADING-GUIDE.md` - Setups y estrategias
- `WADM-CONTEXT-GUIDE.md` - Sistema de contexto histórico

### 3. Workflows y Recetas
Crear `WADM-MCP-WORKFLOWS.md` con:
- Análisis completo paso a paso
- Detección de oportunidades de trading
- Monitoreo multi-exchange
- Gestión de riesgo con liquidaciones

### 4. Plan de Tareas
Crear `WADM-MCP-TASKS.md` con:
- TASK-XXX para cada grupo de features
- Priorización basada en valor
- Dependencias entre tareas
- Estimaciones de tiempo

### 5. Guía de Integración Avanzada
Crear `WADM-MCP-ADVANCED.md` con:
- Optimización de performance
- Estrategias de caché
- Manejo de errores robusto
- Monitoreo y métricas

## Consideraciones Importantes

1. **NO MOCKS** - Todo debe ser implementación real
2. **Production Ready** - Código listo para producción
3. **KISS** - Mantener simplicidad donde sea posible
4. **Documentación Clara** - Ejemplos ejecutables
5. **Orientado a Negocio** - Enfoque en valor para traders

## Información Adicional

### Estado Actual
- MCP Server v1.10.1 con 119+ herramientas
- Arquitectura Docker con contenedores separados
- HTTP wrapper para comunicación entre servicios
- Sistema de sesiones y autenticación implementado

### Tecnologías
- **MCP Server**: Node.js, TypeScript, @modelcontextprotocol/sdk
- **HTTP Wrapper**: Python, FastAPI
- **WADM API**: Python, FastAPI, httpx
- **Storage**: MongoDB para contexto histórico

### Modelo de Negocio WAIckoff
- Cobro por sesión ($1/sesión o 100k tokens)
- Integración futura con Claude Sonnet 4
- Dashboard para visualización (próximamente)
- Target: Traders profesionales e institucionales

## Preguntas a Responder

1. ¿Cuáles son las 10 herramientas más valiosas para monetizar primero?
2. ¿Qué workflows generarían más valor para traders?
3. ¿Cómo optimizar el uso de tokens en análisis complejos?
4. ¿Qué métricas deberíamos trackear por herramienta?
5. ¿Cuáles herramientas se beneficiarían más de caché?

## Formato de Entrega

Todos los documentos deben:
- Estar en formato Markdown
- Incluir ejemplos ejecutables
- Tener tabla de contenidos
- Seguir la estructura de documentación de WADM
- Guardarse en `D:\projects\mcp\wadm\claude\docs\`

---

**IMPORTANTE**: Lee TODOS los archivos de user guides primero antes de empezar a crear la documentación. El MCP Server es extremadamente rico en funcionalidades y queremos aprovechar cada una de ellas en WADM.
