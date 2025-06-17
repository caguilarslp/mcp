# ADR-001: Adopción de FastMCP para interfaz de herramientas

## Estado
**Aceptada** - 2025-06-17

## Contexto
Necesitamos exponer las capacidades de análisis de mercado del sistema WADM a través de una interfaz estandarizada que permita integración con asistentes de IA y otras herramientas.

## Decisión
Adoptamos FastMCP (Model Context Protocol) como framework para exponer herramientas del sistema.

## Consecuencias

### Positivas
- Interfaz estandarizada MCP
- Integración directa con Claude y otros asistentes
- Generación automática de documentación
- Type safety con Pydantic
- Async by default

### Negativas
- Dependencia adicional del ecosistema
- Curva de aprendizaje del protocolo MCP
- Posibles limitaciones en casos de uso específicos

## Alternativas Consideradas
1. **REST API pura** - Más universal pero sin estándar MCP
2. **GraphQL** - Más flexible pero más complejo
3. **gRPC** - Más eficiente pero menos compatible

## Referencias
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [MCP Specification](https://modelcontextprotocol.io)
