# WADM Development Guidelines

## Reglas Fundamentales

### 1. NO DUPLICAR ARCHIVOS
- **NUNCA** crear archivos _fix, _v2, _new, etc.
- Si hay que modificar algo, se modifica el archivo original
- Los backups son responsabilidad del control de versiones (git)
- Mantener el proyecto limpio y profesional

### 2. KISS Principle
- Keep It Simple, Stupid
- Código simple y directo
- No sobre-ingeniería
- Soluciones pragmáticas

### 3. Modificación de Código
- Editar archivos existentes directamente
- No crear versiones alternativas
- Usar `edit_file` en lugar de crear nuevos archivos
- Mantener la estructura del proyecto limpia

### 4. Documentación
- NO actualizar documentación hasta el visto bueno del usuario
- Incluye: master-log.md, task-tracker.md, ADRs, etc.
- El código es lo primero, la documentación después

### 5. Profesionalismo
- Estructura de proyecto coherente
- Nombres de archivo consistentes
- Sin archivos temporales o de prueba abandonados
- Código production-ready desde el inicio

## Ejemplos de lo que NO hacer:
- ❌ `manager_fix.py`, `manager_v2.py`, `manager_new.py`
- ❌ `volume_profile_old.py`, `volume_profile_backup.py`
- ❌ Dejar scripts de debug sin propósito claro
- ❌ Actualizar logs antes de confirmación del usuario

## Ejemplos de lo que SÍ hacer:
- ✅ Modificar `manager.py` directamente
- ✅ Usar git para control de versiones
- ✅ Scripts de utilidad con nombres descriptivos (`debug_indicators.py`, `test_indicators.py`)
- ✅ Esperar confirmación antes de actualizar trazabilidad
