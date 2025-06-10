# 📋 TASK-014: Eliminar Auto-save Legacy y Usar Solo AnalysisRepository

## 📋 Información General
- **ID:** TASK-014
- **Título:** Eliminar duplicación de guardado - Usar solo AnalysisRepository
- **Prioridad:** ALTA (Limpieza técnica crítica)
- **Estimado:** 1 hora
- **Dependencias:** TASK-009 FASE 3 completada
- **Fecha Creación:** 10/06/2025
- **Estado:** ✅ COMPLETADO (10/06/2025)

## 🎯 Objetivo
Eliminar la duplicación de archivos causada por tener dos sistemas de guardado paralelos:
- Remover el auto-save legacy que crea archivos con formato timestamp
- Mantener solo el AnalysisRepository que crea archivos con formato UUID
- Limpiar el código y reducir complejidad

## 🔍 Problema Actual
Actualmente cada análisis se guarda DOS veces:
1. `technical_analysis_2025-06-10T22-01-37-723Z.json` (auto-save legacy)
2. `technical_analysis_1749592897618_1af913bd-6d46-4eaf-938c-db3fc475ebec.json` (AnalysisRepository)

Esto causa:
- Duplicación innecesaria de datos
- Confusión sobre qué formato usar
- Desperdicio de espacio en disco
- Complejidad adicional en el código

## 📐 Cambios Requeridos

### 1. En `src/core/engine.ts`

#### Eliminar el método `autoSaveAnalysis()`
```typescript
// ELIMINAR COMPLETAMENTE:
private async autoSaveAnalysis(
  symbol: string,
  analysisType: string,
  data: any
): Promise<void> {
  // TODO ESTE MÉTODO
}
```

#### En `performTechnicalAnalysis()`
```typescript
// ELIMINAR estas líneas:
// AUTO-SAVE: Legacy simple implementation (for backward compatibility)
await this.autoSaveAnalysis(symbol, 'technical_analysis', analysis);
```

#### En `getCompleteAnalysis()`
```typescript
// ELIMINAR estas líneas:
// AUTO-SAVE: Legacy simple implementation (for backward compatibility)
await this.autoSaveAnalysis(symbol, 'complete_analysis', completeAnalysis);
```

### 2. En `src/core/engine.ts` - Actualizar imports
```typescript
// REMOVER si ya no se usa:
import * as path from 'path';
```

### 3. Verificar y actualizar `getAnalysisHistory()`
El método ya usa AnalysisRepository, solo verificar que funcione correctamente:
```typescript
async getAnalysisHistory(
  symbol: string,
  limit: number = 10,
  analysisType?: string
): Promise<ApiResponse<SavedAnalysis[]>> {
  // Este método YA usa AnalysisRepository - verificar funcionamiento
}
```

## 🧪 Testing Post-Implementación

### Test 1: Verificar guardado único
1. Ejecutar `perform_technical_analysis` para un símbolo nuevo
2. Verificar que solo se crea UN archivo con formato UUID
3. Confirmar que NO se crea archivo con formato timestamp

### Test 2: Verificar lectura
1. Usar `get_latest_analysis` - debe encontrar el análisis
2. Usar `get_repository_stats` - debe contar correctamente
3. Usar `get_analysis_history` - debe retornar resultados

### Test 3: Limpiar datos antiguos
1. Identificar archivos con formato timestamp antiguo
2. Decidir si eliminarlos o crear migración
3. Documentar decisión

## ✅ Criterios de Aceptación

1. **Solo UN archivo por análisis** - Formato UUID únicamente
2. **Código más limpio** - Sin duplicación de lógica de guardado
3. **Sin pérdida de funcionalidad** - Todas las herramientas siguen funcionando
4. **Tests pasando** - Verificar que todo funciona post-cambio
5. **Documentación actualizada** - Si hay cambios en comportamiento

## 🚀 Beneficios Esperados

1. **50% menos archivos** - Un archivo por análisis en vez de dos
2. **Código más simple** - Una sola responsabilidad para guardado
3. **Menos confusión** - Un solo formato de archivo
4. **Mejor performance** - Menos I/O de disco
5. **Mantenimiento más fácil** - Un solo sistema para mantener

## ⚠️ Consideraciones

1. **Compatibilidad hacia atrás**: Los archivos legacy existentes seguirán siendo leídos por el AnalysisRepository (ya tiene soporte)
2. **No breaking changes**: Las APIs MCP no cambian
3. **Migración opcional**: Podemos crear script para convertir archivos antiguos si es necesario

## 📝 Notas de Implementación

- El AnalysisRepository ya maneja ambos formatos al leer
- La eliminación del auto-save no afecta la funcionalidad
- Es una limpieza técnica sin impacto en usuarios

---

*Tarea creada para eliminar deuda técnica y simplificar el sistema*
