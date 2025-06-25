# New Traceability System

## 🔄 **CAMBIO DE SISTEMA DE TRAZABILIDAD**

**Fecha**: 2025-06-25  
**Cambio**: Sistema de nomenclatura actualizado

## 📝 **CAMBIOS REALIZADOS**

### **Archivos Renombrados**:
```
.claude_context     → trace_ctx.md
.claude_context.md  → trace_ctx.md
claude/             → trdocs/
```

### **Nuevo Prompt para Reglas de Usuario**:
```
Lee primero trace_ctx.md / trace_ctx , luego revisa trdocs/README.md (igual en algunos proyectos no está en esa ubicación, trace_ctx te indicará que hacer) para estado actual
```

### **Prompt Temporal (hasta migrar todos los proyectos)**:
```
Lee primero trace_ctx.md / trace_ctx , luego revisa claude/README.md (igual en algunos proyectos no está en esa ubicación, trace_ctx te indicará que hacer) para estado actual
```

## 🎯 **RAZÓN DEL CAMBIO**

### **Problemas del Sistema Anterior**:
1. **Nombre confuso**: `.claude_context` sugiere vinculación con Claude AI
2. **Directorio genérico**: `claude/` no descriptivo del propósito
3. **Inconsistencia**: Diferentes proyectos con diferentes estructuras

### **Ventajas del Nuevo Sistema**:
1. **Nombre descriptivo**: `trace_ctx.md` = "trace context" 
2. **Directorio específico**: `trdocs/` = "traceability documents"
3. **Consistencia**: Mismo sistema en todos los proyectos
4. **Claridad**: Propósito evidente desde el nombre

## 📁 **NUEVA ESTRUCTURA**

```
proyecto/
├── trace_ctx.md          # Contexto principal del proyecto
└── trdocs/              # Documentos de trazabilidad
    ├── README.md        # Estado actual
    ├── master-log.md    # Historial de desarrollo
    ├── architecture/    # Decisiones arquitectónicas
    ├── tasks/          # Seguimiento de tareas
    ├── sessions/       # Documentación de sesiones
    ├── daily/          # Logs diarios
    ├── adr/           # Architecture Decision Records
    ├── bugs/          # Seguimiento de bugs
    └── docs/          # Documentación del proyecto
```

## 🔄 **MIGRACIÓN REALIZADA**

### **Referencias Actualizadas**:
- ✅ `trace_ctx.md` - Todas las referencias a `/claude/` → `/trdocs/`
- ✅ `README.md` - Enlaces actualizados
- ✅ `.gitignore` - Rutas actualizadas
- ✅ `.dockerignore` - Rutas actualizadas
- ✅ `trdocs/daily/2025-06-25.md` - Referencias actualizadas
- ✅ `trdocs/master-log.md` - Referencias actualizadas
- ✅ `trdocs/NEXT_CHAT_SUMMARY.md` - Referencias actualizadas

### **Archivos Pendientes de Migración Global**:
- `trdocs/docs/` - Múltiples archivos con referencias
- `trdocs/sessions/` - Documentos de sesiones
- `trdocs/scripts/` - Scripts de automatización

## 📋 **PRÓXIMOS PASOS**

### **En Este Proyecto**:
1. ✅ Renombrado completo realizado
2. ✅ Referencias principales actualizadas
3. 🔄 Actualizar referencias restantes según necesidad

### **En Otros Proyectos**:
1. Aplicar mismo patrón de renombrado
2. Actualizar prompts de sistema
3. Mantener consistencia

## 💡 **CONVENCIONES**

### **Nombres de Archivos**:
- `trace_ctx.md` - Contexto principal (sin extensión también válido)
- `trdocs/README.md` - Estado actual del proyecto
- `trdocs/master-log.md` - Historial cronológico

### **Estructura de Directorios**:
- `trdocs/` - Raíz de documentación de trazabilidad
- Subdirectorios específicos por tipo de documento
- Nombres descriptivos y consistentes

---

**Estado**: ✅ **COMPLETADO en este proyecto**  
**Próximo**: Aplicar en otros proyectos según sea necesario 