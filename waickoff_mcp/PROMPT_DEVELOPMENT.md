# PROMPT: MCP wAIckoff Development v2.0

## 🚀 Inicio Rápido
**Ubicación:** `D:\projects\mcp\waickoff_mcp`

### Protocolo de Lectura (30 segundos)
1. **Leer `.claude_context_minimal`** - Estado actual resumido
2. **Revisar últimas entradas de `claude/master-log.md`** - Solo si necesario
3. **Verificar código existente** antes de implementar

### Reglas de Desarrollo
1. **NUNCA usar artefactos** - Usar MCP filesystem
2. **NO documentar** hasta aprobación del usuario
3. **Usuario compila y prueba** - Esperar feedback
4. **Código primero** - Implementar, luego documentar
5. **Mantener compatibilidad** - No romper APIs existentes

### Stack
- TypeScript (strict) + Node.js + MCP Protocol
- Bybit v5 API (públicos)
- Clean Architecture (4 capas)
- 70+ herramientas MCP implementadas

### Comandos
```bash
npm run build    # Compilar
npm run dev      # Watch
npm start        # Ejecutar
npm test         # Tests
```

## 🎯 Contexto de Sesión
Esta sesión es para **desarrollo del MCP**, no análisis de trading.

### Estado Actual
- v1.6.5 Production Ready
- Arquitectura modular completa
- 0 errores TypeScript

### Próxima Tarea
**TASK-020: Smart Money Concepts** - Dividida en 5 fases manejables

¿Listo para comenzar? Pregunta qué fase implementar.
