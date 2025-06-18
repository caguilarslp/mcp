📊 RESUMEN: CÓMO LAS HERRAMIENTAS USAN EL CONTEXTO
🔄 FLUJO DE CONTEXTO EN EL SISTEMA
mermaidgraph TD
    A[Usuario solicita análisis] --> B[Handler recibe request]
    B --> C[contextAwareWrapper.wrapWithContext]
    C --> D[Carga contexto histórico 90 días]
    D --> E[Ejecuta análisis con contexto]
    E --> F[Guarda resultado en MongoDB/Files]
    F --> G[Retorna resultado enriquecido]
📋 HERRAMIENTAS Y SU USO DE CONTEXTO
HerramientaCómo usa el contextoBeneficioTechnical AnalysisCompara bias actual vs históricoDetecta cambios de tendenciaVolume AnalysisIdentifica patrones de volumen recurrentesFiltra falsos breakoutsSupport/ResistanceValida niveles históricosMayor precisión en nivelesSMC AnalysisCruza Order Blocks históricosReduce falsas señalesWyckoffRastrea fases previasMejor identificación de ciclosMulti-ExchangeCompara divergencias históricasDetecta manipulación recurrenteGrid TradingUsa volatilidad históricaOptimiza rangos de grid