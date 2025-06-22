# Sistema de Trazabilidad WADM v2.0

## 📋 Estructura Simplificada

### Daily Tasks (Rotativas)
```
claude/daily/
├── YYYY-MM-DD.md     # Tasks del día actual
├── archive/          # Días anteriores (auto-archivado)
└── templates/        # Templates reutilizables
```

### Referencias Rápidas
- **Estado Actual**: `.claude_context` (30 líneas máx)
- **Tasks Activas**: `claude/daily/YYYY-MM-DD.md`
- **Decisiones**: `claude/docs/DECISIONS.md`
- **Bugs Activos**: `claude/docs/BUGS.md`

## 🎯 Flujo de Trabajo

### 1. Inicio del Día
```bash
# Auto-genera archivo del día con tasks pendientes
python claude/scripts/new_day.py
```

### 2. Durante el Desarrollo
- Actualizar solo `.claude_context` con estado actual
- Marcar tasks completadas en daily file
- Nuevos bugs → `BUGS.md` con ID simple (B001, B002...)

### 3. Fin del Día
- Tasks no completadas se mueven automáticamente al día siguiente
- Archivo del día se archiva

## 📝 Formato Daily Task
```markdown
# Tasks 2024-12-30

## 🔥 Prioridad Alta
- [ ] T001: Fix indicator calculations
- [ ] T002: Implement Bollinger Bands

## 🟡 Prioridad Media  
- [ ] T003: Elliott Wave detector
- [ ] T004: Multi-timeframe analysis

## ✅ Completadas
- [x] T005: Update traceability system

## 📝 Notas del Día
- Decisión: Usar modelo de créditos en vez de suscripción
- Bug encontrado: B012 - VWAP calculation overflow
```

## 🔗 Referencias Permanentes

### Decisiones (DECISIONS.md)
```markdown
# D001: 2024-12-30 - Modelo de Negocio
- Créditos por consulta vs suscripción mensual
- Razón: Flexibilidad para usuarios
- Impacto: Necesita sistema de billing

# D002: 2024-12-30 - Símbolos Target
- Focus: ISO20022, RWA, AI
- Evitar: Memecoins
- Core: XRP, LINK, FET + BTC/ETH/SOL como referencia
```

### Bugs (BUGS.md)
```markdown
# B001: [ABIERTO] Indicators not calculating
- Detectado: 2024-12-29
- Módulo: indicators/volume_profile.py
- Status: Investigando query MongoDB

# B002: [CERRADO] WebSocket disconnections
- Resuelto: 2024-12-28
- Solución: Added reconnection logic
```

## 🚀 Comandos Útiles

```python
# claude/scripts/task_manager.py
class TaskManager:
    def add_task(self, priority: str, description: str):
        """Añade task al día actual"""
        
    def complete_task(self, task_id: str):
        """Marca task como completada"""
        
    def carry_forward(self):
        """Mueve tasks pendientes al día siguiente"""
```

## 💡 Ventajas del Sistema v2.0
1. **Liviano**: Un archivo por día, no acumulativo
2. **Enfocado**: Solo información relevante del día
3. **Automático**: Scripts manejan el archivado
4. **Búsqueda fácil**: IDs simples (T001, B001, D001)
5. **Sin duplicación**: Referencias a docs permanentes
