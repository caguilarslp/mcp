# Updated User Prompt - New Traceability System

## 🔄 **NUEVO PROMPT (Sistema Actualizado)**

### **Prompt Final (cuando todos los proyectos estén migrados)**:
```
Lee primero trace_ctx.md / trace_ctx , luego revisa trdocs/README.md (igual en algunos proyectos no está en esa ubicación, trace_ctx te indicará que hacer) para estado actual
```

### **Prompt Temporal (hasta migrar todos los proyectos)**:
```
Lee primero trace_ctx.md / trace_ctx , luego revisa claude/README.md (igual en algunos proyectos no está en esa ubicación, trace_ctx te indicará que hacer) para estado actual
```

## 📝 **DIFERENCIAS CON PROMPT ANTERIOR**

### **ANTES**:
```
Lee primero .claude_context.md / .claude_context , luego revisa claude/README.md (igual en algunos proyectos no está en esa ubicación, claude_context te indicará que hacer) para estado actual
```

### **AHORA (temporal)**:
```
Lee primero trace_ctx.md / trace_ctx , luego revisa claude/README.md (igual en algunos proyectos no está en esa ubicación, trace_ctx te indicará que hacer) para estado actual
```

### **FUTURO (cuando todos migrados)**:
```
Lee primero trace_ctx.md / trace_ctx , luego revisa trdocs/README.md (igual en algunos proyectos no está en esa ubicación, trace_ctx te indicará que hacer) para estado actual
```

## 🎯 **RAZÓN DEL CAMBIO GRADUAL**

### **Por qué mantener "claude" temporalmente**:
1. **Múltiples proyectos** usan el sistema actual
2. **Migración gradual** evita inconsistencias
3. **Compatibility** durante período de transición
4. **Control de cambios** proyecto por proyecto

### **Cuándo usar cada prompt**:
- **Proyectos migrados** → `trace_ctx.md` + `trdocs/`
- **Proyectos no migrados** → `trace_ctx.md` + `claude/`
- **Nuevos proyectos** → Sistema nuevo desde inicio

---

**Estado**: ✅ **DEFINIDO**  
**Aplicación**: Proyecto por proyecto  
**Objetivo**: Consistencia total en todos los proyectos 