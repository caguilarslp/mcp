# 📚 Sistema de Documentación WADM

## 🎯 Propósito
Este directorio contiene toda la documentación de desarrollo, trazabilidad y gestión del proyecto WADM (Wyckoff Alchemy Data Manager).

## 📁 Estructura

```
claude/
├── master-log.md          # Log cronológico principal del proyecto
├── tasks/                 # Gestión de tareas y desarrollo
│   └── task-tracker.md   # Tracker principal de tareas
├── adr/                  # Architecture Decision Records
│   ├── README.md        # Índice de decisiones
│   └── ADR-XXX-*.md     # Decisiones individuales
├── logs/                 # Logs diarios de desarrollo
│   └── YYYY-MM-DD.md    # Log de cada día
├── bugs/                 # Tracking de bugs y fixes
│   └── README.md        # Gestión de bugs
├── lessons-learned/      # Conocimiento y aprendizajes
│   └── README.md        # Índice de lecciones
├── docs/                 # Documentación técnica general
├── context/              # Contexto técnico y de negocio
├── progress/             # Reportes de progreso detallados
└── archive/              # Documentos históricos

```

## 🔄 Flujo de Trabajo

### 1. Inicio de Sesión
```bash
# Leer estado actual
cat .claude_context
cat claude/master-log.md | tail -20
cat claude/tasks/task-tracker.md
```

### 2. Durante el Desarrollo
- Actualizar task-tracker con progreso
- Documentar decisiones en ADRs
- Registrar bugs encontrados
- Capturar lecciones aprendidas

### 3. Fin de Sesión
- Actualizar master-log.md
- Crear/actualizar log diario
- Actualizar .claude_context si es necesario
- Commit con formato: `[TASK-XXX] Descripción`

## 📝 Convenciones

### Formato de Commits
```
[TASK-XXX] Descripción corta

- Detalle 1
- Detalle 2
```

### Estados de Tareas
- 📅 **Planificada** - En backlog
- ⏳ **En Progreso** - Activamente trabajando
- 🔄 **En Revisión** - Código listo, revisando
- ✅ **Completada** - Finalizada y merged
- ❌ **Bloqueada** - Esperando dependencias
- 🐛 **Bug** - Problema identificado

### Prioridades
- 🔴 **Alta** - Crítico para el proyecto
- 🟡 **Media** - Importante pero no urgente
- 🟢 **Baja** - Nice to have

## 🎯 Accesos Rápidos

| Archivo | Propósito |
|---------|-----------|
| [master-log.md](master-log.md) | Historial completo del proyecto |
| [task-tracker.md](tasks/task-tracker.md) | Estado actual de todas las tareas |
| [ADR Index](adr/README.md) | Decisiones arquitectónicas |
| [Bugs](bugs/README.md) | Problemas activos |
| [Lessons](lessons-learned/README.md) | Conocimiento acumulado |

## 📊 Métricas del Proyecto

- **Inicio:** 2025-06-17
- **Versión:** 0.1.0
- **Tareas Totales:** 8
- **Completadas:** 0
- **En Progreso:** 0

## 🔍 Búsqueda y Navegación

### Por Tipo
- `find claude -name "TASK-*"` - Buscar tareas
- `find claude -name "ADR-*"` - Buscar decisiones
- `find claude -name "BUG-*"` - Buscar bugs
- `grep -r "TODO" claude/` - Buscar pendientes

### Por Fecha
- `ls claude/logs/` - Ver logs por día
- `grep -r "2025-06-17" claude/` - Buscar por fecha

## 💡 Tips
1. Mantén el master-log actualizado diariamente
2. Documenta decisiones importantes en ADRs
3. Captura bugs inmediatamente al encontrarlos
4. Las lecciones aprendidas son oro puro
5. Un commit por tarea facilita el tracking

## 🚀 Quick Start para Nuevos Desarrolladores
1. Lee `.claude_context` para contexto
2. Revisa `master-log.md` últimas entradas
3. Consulta `task-tracker.md` para tareas disponibles
4. Sigue las convenciones establecidas
5. Actualiza documentación al finalizar

---
*Sistema de documentación basado en las mejores prácticas de waickoff_mcp*
