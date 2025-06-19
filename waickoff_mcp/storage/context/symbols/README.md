# Hierarchical Context System - TASK-040.1

## 🏗️ Estructura Jerárquica por Símbolo

Esta nueva arquitectura organiza el contexto por símbolo individual para optimizar el acceso y escalabilidad.

### 📁 Estructura de Directorios

```
storage/context/
├── symbols/                    # Contexto jerárquico por símbolo
│   ├── BTCUSDT/               # Contexto específico BTC
│   │   ├── config.json        # Configuración del símbolo
│   │   ├── master.json        # Contexto maestro (será .gz)
│   │   ├── daily.json         # Snapshots diarios (será .gz)
│   │   ├── weekly.json        # Snapshots semanales (será .gz)
│   │   └── monthly.json       # Snapshots mensuales (será .gz)
│   ├── ETHUSDT/               # Contexto específico ETH
│   │   └── [mismos archivos]
│   └── XRPUSDT/               # Contexto específico XRP
│       └── [mismos archivos]
├── archive/                   # Archivos archivados
├── backups/                   # Respaldos automáticos
├── entries/                   # Sistema anterior (deprecado)
└── summaries/                 # Sistema anterior (deprecado)
```

### 🔧 Componentes Implementados

#### 1. **Interfaces TypeScript** (`src/types/hierarchicalContext.ts`)
- `MasterContext`: Contexto principal por símbolo
- `MasterContextLevel`: Niveles S/R históricos
- `MasterContextPattern`: Patrones detectados históricos
- `SymbolContextConfig`: Configuración por símbolo
- `IHierarchicalContextManager`: Interface del servicio

#### 2. **Archivos de Configuración**
Cada símbolo tiene su `config.json`:
```json
{
  "symbol": "BTCUSDT",
  "enabled": true,
  "autoUpdate": true,
  "priority": "high",
  "timeframes": ["5", "15", "60", "240", "D"],
  "thresholds": {
    "minVolumeForLevel": 1000000,
    "minConfidenceForPattern": 70,
    "levelMergeDistance": 0.5
  }
}
```

#### 3. **Archivos Maestros**
Estructura completa de contexto con:
- Niveles S/R históricos con fuerza y toques
- Patrones detectados con éxito/fracaso histórico
- Métricas agregadas del símbolo
- Snapshots comprimidos por periodo
- Configuración de compresión y retención

### ⚡ Beneficios del Sistema Jerárquico

1. **Acceso O(1)**: Lectura directa por símbolo sin búsquedas
2. **Escalabilidad**: Fácil agregar nuevos símbolos
3. **Aislamiento**: Contexto independiente por par
4. **Compresión**: Archivos .gz para eficiencia
5. **Configuración**: Settings específicos por símbolo

### 🔄 Estado Actual - FASE 1

✅ **COMPLETADO:**
- Estructura de carpetas creada
- Interfaces TypeScript definidas  
- Archivos de configuración por símbolo
- Templates de contexto maestro inicializados
- Archivos de snapshots preparados
- Exportaciones en `types/index.ts`

🟡 **PENDIENTE (FASE 1):**
- Context Storage Manager (TASK-040.2)
- Herramientas MCP base (TASK-040.3)

### 🎯 Próximos Pasos

**TASK-040.2:** Context Storage Manager
- Funciones CRUD para contexto maestro
- Sistema de compresión automática
- Snapshots diarios automáticos

**TASK-040.3:** Herramientas MCP Base
- `get_master_context` - Obtener contexto por símbolo
- `update_context_levels` - Actualizar niveles
- `initialize_symbol_context` - Setup inicial

### 📊 Métricas Estimadas

- **Símbolos iniciales:** 3 (BTC, ETH, XRP)
- **Tiempo de acceso:** <100ms vs actual ~500ms
- **Memoria optimizada:** ~70% reducción
- **Escalabilidad:** +100 símbolos sin degradación

---

**Versión:** 1.0.0  
**Fecha:** 18/06/2025  
**Task:** TASK-040.1 - Estructura Base Jerárquica
