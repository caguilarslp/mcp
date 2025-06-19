# 🧠 Sistema de Contexto Jerárquico - TASK-040

## 📋 Resumen Ejecutivo

### Problema Actual
El sistema de contexto v1.9.0 funciona pero es ineficiente:
- Busca en TODOS los archivos para encontrar análisis de un símbolo
- No hay una vista consolidada rápida por símbolo
- Difícil obtener contexto instantáneo para decisiones rápidas

### Solución Propuesta
Sistema jerárquico organizado por símbolo con:
- **Contexto Maestro** consolidado por símbolo
- **Acceso instantáneo** (<100ms) a información clave
- **Estructura escalable** para múltiples símbolos
- **Actualizaciones inteligentes** solo cuando hay cambios significativos

## 🏗️ Arquitectura Propuesta

```
/data/context/
├── BTCUSDT/
│   ├── master_context.json        # Vista consolidada actual
│   ├── daily_snapshots/           # Histórico diario comprimido
│   │   ├── 2025-06-18.json.gz
│   │   └── 2025-06-19.json.gz
│   ├── key_levels.json            # Niveles S/R validados
│   ├── patterns_library.json      # Patrones exitosos/fallidos
│   └── performance_metrics.json   # Métricas de trading
├── ETHUSDT/
│   └── [misma estructura]
└── [SYMBOL]/
    └── [misma estructura]
```

## 📊 Estructura del Master Context

```json
{
  "symbol": "BTCUSDT",
  "lastUpdated": "2025-06-19T00:35:00Z",
  "priceHistory": {
    "current": 105045.80,
    "1d_ago": 105000.00,
    "7d_ago": 109943.20,
    "30d_ago": 98500.00
  },
  "keyLevels": {
    "major_resistance": [
      {
        "price": 110665.80,
        "touches": 5,
        "lastTest": "2025-06-09",
        "strength": 95,
        "validated": true
      }
    ],
    "major_support": [
      {
        "price": 105335.10,
        "touches": 4,
        "lastTest": "2025-06-18",
        "strength": 90,
        "validated": true
      }
    ]
  },
  "patterns": {
    "active": [
      {
        "type": "corrective_abc",
        "start": "2025-06-05",
        "completion": 85,
        "target": 108500
      }
    ],
    "historicalSuccessRate": {
      "bullish_fvg_fill": 78,
      "bearish_orderblock_respect": 82,
      "fibonacci_bounce_rate": 71
    }
  },
  "institutionalZones": {
    "accumulation": [
      {"range": "98000-102000", "volumeProfile": "high"}
    ],
    "distribution": [
      {"range": "108000-110000", "volumeProfile": "extreme"}
    ],
    "currentPhase": "accumulation"
  },
  "alerts": {
    "active": [
      {
        "type": "approaching_resistance",
        "level": 105800,
        "distance": 754.20,
        "priority": "medium"
      }
    ]
  }
}
```

## 🚀 Implementación por Fases

### FASE 1: Estructura Base (1-2 días)
- Crear estructura de carpetas
- Definir tipos TypeScript
- Implementar funciones CRUD básicas
- Crear herramientas MCP de acceso

### FASE 2: Integración (2-3 días)
- Modificar análisis para usar contexto
- Sistema de actualización automática
- Enriquecer reportes con contexto
- Validación de cambios significativos

### FASE 3: Multi-Symbol (1-2 días)
- Sistema de gestión de símbolos
- Templates por defecto
- Importación de históricos
- Dashboard unificado

### FASE 4: Analytics (Futuro)
- Sistema de scoring predictivo
- Machine learning básico
- Alertas inteligentes
- Backtesting mejorado

## 💡 Beneficios Esperados

### Rendimiento
- **Antes:** Buscar en 96+ archivos (~500ms)
- **Después:** Acceso directo (~50ms)
- **Mejora:** 10x más rápido

### Usabilidad
- Vista instantánea del estado actual
- Histórico organizado y accesible
- Decisiones basadas en datos validados
- Continuidad entre sesiones

### Escalabilidad
- Fácil agregar nuevos símbolos
- Estructura consistente
- Mantenimiento automático
- Sin límite de símbolos

## 🔧 Decisiones Técnicas

### Almacenamiento: JSON Local
- **Razón:** MongoDB tiene issues, JSON ya funciona
- **Ventaja:** Implementación rápida, debugging fácil
- **Futuro:** Migrable a MongoDB/SQLite cuando esté listo

### Compresión: Daily Snapshots
- **Formato:** .json.gz para históricos
- **Retención:** 90 días (configurable)
- **Tamaño:** ~80% reducción vs JSON plano

### Actualización: Smart Updates
- **Trigger:** Solo en cambios significativos
- **Validación:** Comparar con umbrales
- **Frecuencia:** Post-análisis automático

## 📋 Checklist de Implementación

### Fase 1 Checklist:
- [ ] Crear estructura de carpetas en /data/context/
- [ ] Definir interfaces en contextTypes.ts
- [ ] Implementar ContextStorageManager
- [ ] Crear 4 herramientas MCP básicas
- [ ] Tests unitarios básicos

### Fase 2 Checklist:
- [ ] Wrapper para análisis con contexto
- [ ] Sistema de detección de cambios
- [ ] Actualización de reportes
- [ ] Integración con herramientas existentes
- [ ] Tests de integración

### Fase 3 Checklist:
- [ ] Comando add_symbol
- [ ] Sistema de templates
- [ ] Migración de datos existentes
- [ ] UI para gestión de símbolos
- [ ] Documentación de usuario

## 🎯 Métricas de Éxito

1. **Tiempo de acceso a contexto < 100ms**
2. **Cero pérdida de datos entre sesiones**
3. **Reducción 50% en tiempo de análisis**
4. **100% símbolos con contexto maestro**
5. **Actualización automática funcionando**

## 📚 Referencias

- **Task:** TASK-040 en task-tracker.md
- **Propuesta original:** docs_carlos_no_tocar/contexto/
- **Sistema actual:** v1.9.0 con MongoDB + Files
- **Objetivo:** Optimización y eficiencia

---

**Última actualización:** 19/06/2025
**Estado:** En planificación
**Prioridad:** ALTA - Mejora crítica de UX
