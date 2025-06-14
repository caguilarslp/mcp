# 📚 Sistema de Trazabilidad - Cloud MarketData

## 🎯 Propósito
Este documento establece el sistema de trazabilidad para el proyecto Cloud MarketData, asegurando que todos los cambios, decisiones y problemas sean registrados de manera consistente.

## 📁 Estructura de Documentación

### 1. Master Log (`claude/master-log.md`)
- Registro cronológico de todas las sesiones de desarrollo
- Formato: Fecha → Acciones → Decisiones → Próximos pasos
- Se actualiza al inicio y fin de cada sesión

### 2. Task Tracker (`claude/tasks/task-tracker.md`)
- Lista priorizada de tareas pendientes y completadas
- Estados: 🔴 PENDIENTE | 🟡 EN PROGRESO | ✅ COMPLETADA | ⏸️ PAUSADA
- Incluye estimaciones, dependencias y entregables

### 3. ADRs (`claude/adr/`)
- Architecture Decision Records numerados (ADR-XXX)
- Formato: Contexto → Decisión → Consecuencias
- Inmutables una vez aceptados

### 4. Documentación Técnica (`claude/docs/`)
- Guías de implementación
- Diagramas de arquitectura
- APIs y protocolos
- Troubleshooting

### 5. Contexto Rápido (`.claude_context`)
- Estado actual resumido para inicio rápido
- Máximo 100 líneas
- Se actualiza con cambios significativos

## 🔄 Flujo de Trabajo

### Inicio de Sesión
1. Leer `.claude_context`
2. Revisar últimas entradas en `master-log.md`
3. Verificar tareas activas en `task-tracker.md`

### Durante Desarrollo
1. Actualizar task tracker al cambiar estado
2. Documentar decisiones importantes en ADRs
3. Mantener código autodocumentado

### Fin de Sesión
1. Actualizar `master-log.md` con resumen
2. Actualizar `.claude_context` si hay cambios mayores
3. Commit con mensaje descriptivo

## 📊 Métricas de Trazabilidad
- **Cobertura de documentación**: 100% de decisiones arquitectónicas
- **Granularidad de logs**: Por sesión de trabajo
- **Retención**: Indefinida (archivos en `claude/archive/` si necesario)

## 🏷️ Etiquetas y Convenciones

### Commits
```
[TASK-XXX] Descripción breve
[DOC] Actualización de documentación
[FIX] Corrección de bugs
[FEAT] Nueva funcionalidad
[REFACTOR] Refactorización
```

### Prioridades
- **CRÍTICA**: Bloquea todo desarrollo
- **ALTA**: Necesaria para MVP
- **MEDIA**: Mejora significativa
- **BAJA**: Nice to have

### Estados de Componentes
- **STABLE**: Listo para producción
- **BETA**: Funcional pero puede cambiar
- **ALPHA**: En desarrollo activo
- **DEPRECATED**: Marcado para eliminación

## 🔍 Búsqueda y Navegación
- Usar grep para buscar en logs: `grep -r "TASK-001" claude/`
- Los ADRs están numerados secuencialmente
- Task IDs son únicos y permanentes

## 🚨 Gestión de Problemas
- Bugs críticos se documentan en `claude/docs/known-issues.md`
- Post-mortems en `claude/docs/post-mortems/`
- Soluciones temporales marcadas con `TODO` o `FIXME`

## 📈 Evolución del Sistema
Este sistema de trazabilidad evolucionará con el proyecto. Los cambios al sistema mismo se documentan como ADRs.

---

*Versión: 1.0.0 | Fecha: 2025-06-13*
