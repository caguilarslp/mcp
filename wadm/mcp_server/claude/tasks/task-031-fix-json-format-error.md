# TASK-031: Fix Error de Formato JSON en Respuestas MCP

**Creado:** 18/06/2025  
**Prioridad:** 🔴 CRÍTICA - Afecta 21+ herramientas  
**Estimación:** 2-3 horas  
**Estado:** PENDIENTE

## 🐛 Problema

Error sistemático en múltiples módulos:
```
ClaudeAiToolResultRequest.content.0.text.text: Field required
```

### Módulos Afectados (21+ herramientas)
1. **Context Management** - 7 herramientas (0% funcional)
2. **Trap Detection** - 7 herramientas (0% funcional)  
3. **Sistema/Config** - 3+ herramientas afectadas

## 🔍 Análisis

El problema parece estar en el formato de respuesta JSON que el MCP server está retornando. Claude Desktop espera una estructura específica con un campo `text`.

### Estructura Actual (probable)
```javascript
return {
  data: { ... }
}
```

### Estructura Esperada por Claude
```javascript
return {
  text: JSON.stringify({
    data: { ... }
  })
}
```

## 📋 Plan de Implementación

### FASE 1: Diagnóstico (30 min)
1. Revisar estructura de respuesta en un handler funcional
2. Comparar con handlers que fallan
3. Identificar patrón exacto esperado por Claude Desktop

### FASE 2: Fix Handlers Afectados (1.5h)
1. **Context Management Handlers**
   - `src/adapters/mcp/handlers/contextHandlers.ts`
   - Actualizar los 7 métodos para retornar formato correcto

2. **Trap Detection Handlers**
   - `src/adapters/mcp/handlers/trapHandlers.ts`
   - Actualizar los 7 métodos

3. **System/Config Handlers**
   - `src/adapters/mcp/handlers/systemHandlers.ts`
   - `src/adapters/mcp/handlers/configHandlers.ts`
   - Actualizar métodos afectados

### FASE 3: Testing y Validación (1h)
1. Probar cada herramienta corregida
2. Verificar que el formato funciona correctamente
3. Documentar el patrón correcto para futuros handlers

## 🎯 Resultado Esperado
- 21+ herramientas funcionando correctamente
- Patrón de respuesta documentado
- Sistema robusto contra futuros errores de formato

## 📝 Notas
- Este error afecta ~20% de las herramientas del sistema
- Es crítico resolverlo antes de continuar con nuevas features
- Posible causa: Cambio en API de Claude Desktop o error en implementación inicial
