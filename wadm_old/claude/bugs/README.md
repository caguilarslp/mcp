# 🐛 Bug Tracking

## 📋 Formato de Reporte

```markdown
# BUG-XXX: [Título descriptivo del bug]

## 🔴 Severidad
[Crítica | Alta | Media | Baja]

## 📅 Información
- **Fecha de Detección:** YYYY-MM-DD HH:MM
- **Reportado por:** [Nombre/Sistema]
- **Estado:** [Abierto | En Progreso | Resuelto | No Reproducible]
- **Asignado a:** [Nombre]

## 🐛 Descripción
[Descripción detallada del problema]

## 🔄 Pasos para Reproducir
1. Paso 1
2. Paso 2
3. Paso 3

## 🎯 Comportamiento Esperado
[Qué debería suceder]

## ❌ Comportamiento Actual
[Qué está sucediendo]

## 📸 Evidencia
```
[Logs, screenshots, código]
```

## 🌍 Entorno
- **OS:** [Windows/Linux/Mac]
- **Python:** 3.12.x
- **Docker:** x.x.x
- **Otros:** Información relevante

## 🔧 Solución
[Descripción de la solución implementada]

## 📝 Notas
[Información adicional, workarounds, etc.]
```

## 📊 Bugs Actuales

| ID | Título | Severidad | Estado | Asignado |
|----|--------|-----------|--------|----------|
| - | No hay bugs reportados | - | - | - |

## 📈 Estadísticas
- **Total Reportados:** 0
- **Resueltos:** 0
- **En Progreso:** 0
- **Abiertos:** 0

## 🏷️ Etiquetas de Severidad
- 🔴 **Crítica**: Sistema no funciona, pérdida de datos
- 🟠 **Alta**: Funcionalidad importante afectada
- 🟡 **Media**: Problema molesto pero con workaround
- 🟢 **Baja**: Problema cosmético o menor

## 🔍 Proceso de Gestión
1. Detectar y documentar el bug
2. Asignar severidad y prioridad
3. Crear branch `bugfix/BUG-XXX-descripcion`
4. Implementar solución con tests
5. Actualizar documentación del bug
6. Merge y cerrar
