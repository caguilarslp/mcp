# TASK-029: Sistema de Análisis Contextual Inteligente

**Estado:** PENDIENTE
**Prioridad:** MEDIA
**Tiempo estimado:** 5h total (3 fases)
**Creado:** 18/06/2025
**Dependencias:** TASK-027, TASK-028

## Objetivo
Crear un sistema que combine el contexto histórico de análisis con la información del portfolio para generar insights personalizados y recomendaciones accionables.

## Entregables

### FASE 1: Servicio Básico de Análisis Contextual (1.5h)
1. **ContextualAnalysisService base**
   ```typescript
   class ContextualAnalysisService {
     // Combina contexto histórico + portfolio
     async getEnhancedAnalysis(symbol: string): Promise<EnhancedAnalysis>
   }
   ```

2. **Integración inicial**
   - Conectar con ContextAwareRepository (TASK-027)
   - Conectar con BybitPrivateAdapter (TASK-028)
   - Método básico que combine ambos contextos

3. **Test con tus posiciones**
   - Probar con XRPUSDT (tienes posición)
   - Verificar que incluye contexto relevante

**Entregable:** Servicio combinando contexto funcionando

### FASE 2: Motor de Insights Personalizado (2h)
1. **Position-Aware Analysis**
   - Si analizas XRP, incluir que tienes 3xx XRP
   - Ajustar recomendaciones según tu exposición
   - Alertas de riesgo personalizadas

2. **Historical Pattern Matching**
   - Buscar patrones similares en histórico
   - Identificar setups que funcionaron antes
   - Probabilidades basadas en tu historial

3. **Herramienta MCP: analyze_with_context**
   - Análisis completo incluyendo portfolio
   - Formato optimizado para toma de decisiones

**Entregable:** Herramienta dando análisis personalizado para tus posiciones

### FASE 3: Sistema de Alertas Inteligentes (1.5h)
1. **Smart Alert Engine**
   - Filtrar alertas irrelevantes
   - Priorizar por impacto en tu portfolio
   - Considerar tu capital disponible (~2000 USD)

2. **Herramienta MCP: get_personalized_alerts**
   - Top 5 alertas más relevantes
   - Explicación de por qué son importantes para ti
   - Acciones sugeridas específicas

3. **Testing con casos reales**
   - Verificar relevancia de alertas
   - Ajustar umbrales según feedback

**Entregable:** Sistema de alertas personalizado funcionando

## Beneficios Esperados
- Análisis 10x más relevantes
- Reducción de ruido en alertas
- Mejora en timing de entradas/salidas
- Aprendizaje continuo del sistema

## Arquitectura
```
ContextualAnalysisService
├── PortfolioContextProvider (TASK-028)
├── HistoricalContextProvider (TASK-027)
├── MarketContextProvider (existing)
├── InsightEngine
│   ├── PatternMatcher
│   ├── RiskAnalyzer
│   └── OpportunityRanker
└── OutputFormatter
    ├── LLMOptimizedFormat
    └── HumanReadableFormat
```

## Métricas de Éxito
- 95% de análisis incluyen contexto relevante
- 80% reducción en alertas irrelevantes
- Mejora medible en decisiones de trading
- Satisfacción del usuario con insights
