# 🛠️ Scripts de Desarrollo - wAIckoff MCP

Esta carpeta contiene scripts de desarrollo, testing y debugging para el proyecto wAIckoff MCP.

## 📂 **Organización de Scripts**

### **🔨 Build & Compilation**
- **`build-script.js`** - Script de compilación personalizado
- **`compile.js`** - Compilador principal del proyecto
- **`quick-compile.js`** - Compilación rápida para testing
- **`compile-fix-auto-save.js`** - Fix específico para auto-save functionality

### **✅ Testing & Verification**
- **`test-compilation.js`** - Verifica que la compilación sea exitosa
- **`test-compile.js`** - Test de compilación alternativo
- **`test-json.js`** - Verifica parsing de JSON y APIs
- **`test_sr.js`** - Test específico para Support/Resistance
- **`test-imports.ts`** - Verifica imports de TypeScript

### **🔍 Debugging & Troubleshooting**
- **`debug-json-errors.js`** - Debug específico para errores JSON del MCP SDK
- **`check-compile.js`** - Verifica estado de compilación
- **`verify-compile.js`** - Verificación de compilación completa

### **⚡ Quick Fixes**
- **`quick-fix-compile.js`** - Fixes rápidos de compilación
- **`quick-fix-logs.js`** - Fixes rápidos del sistema de logging

### **📝 Documentation**
- **`task_auto_save.txt`** - Notas sobre implementación de auto-save

## 🚀 **Uso de Scripts**

### **Compilación**
```bash
# Compilación completa
node scripts/compile.js

# Compilación rápida
node scripts/quick-compile.js

# Verificar compilación
node scripts/check-compile.js
```

### **Testing**
```bash
# Test de compilación
node scripts/test-compilation.js

# Test de APIs JSON
node scripts/test-json.js

# Test de Support/Resistance
node scripts/test_sr.js
```

### **Debugging**
```bash
# Debug errores JSON del MCP SDK
node scripts/debug-json-errors.js

# Verificación completa
node scripts/verify-compile.js
```

## ⚠️ **Notas Importantes**

- **Uso interno**: Estos scripts son para desarrollo, no para producción
- **Dependencias**: Requieren que `npm install` haya sido ejecutado
- **TypeScript**: Algunos scripts requieren compilación previa
- **Logs**: Los scripts pueden generar logs en `/logs/`

## 🔄 **Scripts Deprecados**

Algunos scripts pueden estar obsoletos tras refactorizaciones. Revisar fecha de modificación y código antes de usar.

## 📚 **Referencia**

Para más información sobre el desarrollo del proyecto:
- **[Master Log](../claude/master-log.md)** - Estado actual del proyecto
- **[Task Tracker](../claude/tasks/task-tracker.md)** - Tareas en progreso
- **[Architecture Overview](../claude/docs/architecture/system-overview.md)** - Arquitectura del sistema

---

*Carpeta organizada: 10/06/2025 | Scripts movidos desde raíz del proyecto*
