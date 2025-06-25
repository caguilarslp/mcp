# WADM Documentation Structure

## 📁 Estructura Organizada

### `/claude/`
Sistema de trazabilidad y documentación del proyecto

#### `/claude/docs/`
- `NEXT-PRIORITIES.md` - Próximas tareas prioritarias
- `SMC-INSTITUTIONAL-GAME-CHANGER.md` - Análisis SMC + datos institucionales  
- `PROMPT.md` - Prompt de desarrollo principal
- `COMMIT_SUMMARY.md` - Resumen de commits
- `indicator-specifications.md` - Especificaciones técnicas de indicadores
- `fastmcp-architecture.md` - Arquitectura FastMCP
- `tracking/` - Documentos de seguimiento

#### `/claude/tasks/`
- `task-tracker.md` - Lista completa de tareas
- `TASK-XXX-*.md` - Tareas específicas detalladas

#### `/claude/adr/`
- `ADR-XXX.md` - Architectural Decision Records

#### `/claude/bugs/`
- `BUG-XXX.md` - Tracking de bugs

#### `/claude/debug/`
- Scripts de debug y testing históricos
- Archivos temporales

#### `/claude/logs/`
- Logs de desarrollo específicos

### Raíz del Proyecto (Limpia)
```
wadm/
├── main.py              # Entry point principal
├── check_status.py      # Status checker
├── README.md           # Documentación principal
├── requirements.txt    # Dependencias
├── .env               # Variables de entorno
├── src/               # Código fuente
├── logs/              # Logs de aplicación
└── claude/            # Sistema de trazabilidad
```

## 🎯 Beneficios de la Reorganización

### ✅ Raíz Limpia
- Solo archivos esenciales del proyecto
- Fácil navegación para desarrolladores
- Estructura estándar de Python

### ✅ Documentación Centralizada  
- Todo en `/claude/docs/`
- Fácil acceso a información del proyecto
- Histórico preservado

### ✅ Debug Organizado
- Scripts de testing en `/claude/debug/`
- No contamina el workspace principal
- Histórico disponible para referencia

### ✅ Trazabilidad Mejorada
- Sistema Claude organizado en subdirectorios
- Fácil navegación por categorías
- Estructura escalable
