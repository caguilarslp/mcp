# 📦 TASK-009: Sistema de Almacenamiento Local

## 📋 Información General
- **ID:** TASK-009
- **Título:** Implementar Sistema de Almacenamiento Local para Análisis
- **Prioridad:** ALTA (Fundacional para Waickoff AI)
- **Estimado:** 8-10 horas (dividido en sub-tareas)
- **Dependencias:** Arquitectura modular v1.3.x
- **Fecha Creación:** 09/06/2025

## 🎯 Objetivo
Crear un sistema de almacenamiento persistente local que permita:
- Guardar análisis históricos en formato estructurado
- Acceso rápido a contexto pasado sin re-análisis
- Base de conocimiento creciente para decisiones futuras
- Compatibilidad total con Waickoff AI

## 🏗️ Arquitectura del Sistema

### Estructura de Directorios
```
storage/
├── config/                    # Configuración del storage
│   └── storage.config.json
├── market-data/              # Datos crudos (cache temporal)
│   └── {SYMBOL}/
│       └── {YYYY-MM-DD}/
│           ├── ticker/
│           ├── orderbook/
│           └── klines/
├── analysis/                 # Análisis procesados
│   └── {SYMBOL}/
│       ├── support-resistance/
│       ├── volume-analysis/
│       ├── grid-suggestions/
│       └── technical-indicators/
├── patterns/                 # Patrones detectados
│   ├── wyckoff/
│   ├── divergences/
│   └── volume-anomalies/
├── decisions/               # Decisiones documentadas
│   └── {YYYY-MM-DD}/
└── reports/                 # Reportes consolidados
    ├── daily/
    ├── weekly/
    └── performance/
```

## 📐 Diseño Técnico

### 1. Storage Service (Core)
```typescript
interface IStorageService {
  // Operaciones básicas
  save(path: string, data: any): Promise<void>;
  load<T>(path: string): Promise<T | null>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  
  // Operaciones avanzadas
  query(pattern: string): Promise<string[]>;
  getMetadata(path: string): Promise<FileMetadata>;
  vacuum(): Promise<void>; // Limpieza de archivos antiguos
}
```

### 2. Cache Manager
```typescript
interface ICacheManager {
  set(key: string, value: any, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  invalidate(pattern: string): Promise<void>;
  getStats(): CacheStats;
}
```

### 3. Analysis Repository
```typescript
interface IAnalysisRepository {
  // Guardar análisis
  saveAnalysis(symbol: string, type: AnalysisType, data: any): Promise<void>;
  
  // Recuperar análisis
  getLatestAnalysis(symbol: string, type: AnalysisType): Promise<any>;
  getAnalysisHistory(symbol: string, type: AnalysisType, days: number): Promise<any[]>;
  
  // Búsquedas
  findPatterns(criteria: PatternCriteria): Promise<Pattern[]>;
  getAnalysisSummary(symbol: string): Promise<AnalysisSummary>;
}
```

### 4. Report Generator
```typescript
interface IReportGenerator {
  generateDailyReport(date: Date): Promise<string>;
  generateWeeklyReport(weekStart: Date): Promise<string>;
  generatePerformanceReport(period: Period): Promise<string>;
  generateCustomReport(criteria: ReportCriteria): Promise<string>;
}
```

## 🔧 Implementación por Fases

### FASE 1: Infraestructura Base (2h)
- [ ] Crear estructura de directorios
- [ ] Implementar `StorageService` básico
- [ ] Configurar paths y permisos
- [ ] Tests unitarios para operaciones CRUD

### FASE 2: Cache Manager (2h)
- [ ] Implementar sistema de cache con TTL
- [ ] Gestión automática de memoria
- [ ] Políticas de invalidación
- [ ] Métricas de cache hit/miss

### FASE 3: Analysis Repository (3h)
- [ ] Implementar guardado de análisis
- [ ] Sistema de versionado
- [ ] Queries por fecha/tipo/símbolo
- [ ] Agregaciones y resúmenes

### FASE 4: Report Generator (2h)
- [ ] Templates de reportes en Markdown
- [ ] Generación automática diaria/semanal
- [ ] Estadísticas y métricas
- [ ] Exportación a diferentes formatos

### FASE 5: Integración MCP (1h)
- [ ] Nuevas herramientas MCP para storage
- [ ] Auto-guardado de análisis
- [ ] Comandos de consulta histórica
- [ ] Limpieza y mantenimiento

## 🛠️ Herramientas MCP Nuevas

### 1. `save_analysis`
```typescript
{
  symbol: string;
  type: 'technical' | 'pattern' | 'decision';
  data: any;
  tags?: string[];
}
```

### 2. `get_historical_analysis`
```typescript
{
  symbol: string;
  type?: AnalysisType;
  days?: number;
  limit?: number;
}
```

### 3. `search_patterns`
```typescript
{
  pattern?: string;
  symbol?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}
```

### 4. `generate_report`
```typescript
{
  type: 'daily' | 'weekly' | 'performance' | 'custom';
  date?: string;
  criteria?: ReportCriteria;
}
```

## 📊 Casos de Uso

### 1. Auto-guardado de Análisis
```typescript
// Después de cada análisis técnico
await storageService.save(
  `analysis/BTCUSDT/technical/${timestamp}.json`,
  {
    timestamp,
    price: currentPrice,
    supportResistance: levels,
    volumeAnalysis: volumeData,
    gridSuggestion: gridConfig
  }
);
```

### 2. Consulta de Contexto Histórico
```typescript
// "¿Cómo reaccionó BTC la última vez en este soporte?"
const history = await analysisRepo.getAnalysisHistory('BTCUSDT', 'support-resistance', 30);
const similarLevels = history.filter(a => 
  Math.abs(a.criticalLevel - currentLevel) / currentLevel < 0.01
);
```

### 3. Detección de Patrones Recurrentes
```typescript
// "Muestra todas las divergencias detectadas este mes"
const divergences = await analysisRepo.findPatterns({
  type: 'divergence',
  dateFrom: startOfMonth,
  dateTo: now
});
```

## 🔄 Integración con Waickoff AI

### Shared Storage Protocol
```typescript
interface IWaickoffStorageProtocol {
  // Waickoff puede leer todo el storage del MCP
  readMCPAnalysis(path: string): Promise<any>;
  
  // Waickoff puede escribir sus propios análisis
  writeAIAnalysis(path: string, analysis: AIAnalysis): Promise<void>;
  
  // Sincronización bidireccional
  syncAnalysis(direction: 'mcp-to-ai' | 'ai-to-mcp'): Promise<void>;
}
```

### Formato de Intercambio
```typescript
interface UnifiedAnalysis {
  source: 'mcp' | 'waickoff-ai';
  timestamp: number;
  symbol: string;
  price: number;
  analysis: {
    technical?: TechnicalAnalysis;
    patterns?: Pattern[];
    aiInsights?: AIInsight[];
    recommendation?: TradingRecommendation;
  };
  metadata: {
    confidence: number;
    tags: string[];
    relatedAnalysis: string[];
  };
}
```

## ✅ Criterios de Aceptación

1. **Funcionalidad**
   - [ ] Storage service operativo con todas las operaciones CRUD
   - [ ] Cache manager con gestión automática de TTL
   - [ ] Auto-guardado de todos los análisis realizados
   - [ ] Queries históricas funcionando correctamente

2. **Performance**
   - [ ] Lectura de análisis < 50ms
   - [ ] Escritura asíncrona sin bloquear MCP
   - [ ] Cache hit rate > 80% para queries frecuentes

3. **Compatibilidad**
   - [ ] Formato compatible con Waickoff AI
   - [ ] APIs backward compatible con MCP actual
   - [ ] Storage paths configurables

4. **Calidad**
   - [ ] Tests unitarios > 80% cobertura
   - [ ] Documentación completa de APIs
   - [ ] Ejemplos de uso en cada función

## 📚 Referencias
- ADR-007: Arquitectura modular con dependency injection
- `src/core/engine.ts`: Core engine para integración
- `src/types/index.ts`: Tipos a extender
- Waickoff AI Storage Spec (pendiente)

## 🚀 Próximos Pasos
1. Revisar y aprobar diseño
2. Crear branch `feature/storage-system`
3. Implementar Fase 1: Infraestructura Base
4. Iterar con feedback

---

*Creado: 09/06/2025 | Estado: PENDIENTE | Asignado a: Por definir*
