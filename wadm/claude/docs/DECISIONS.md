# Decisiones Arquitectónicas WADM

## D001: 2025-06-21 - Modelo de Negocio por Créditos
- **Decisión**: Sistema de créditos vs suscripción mensual
- **Paquetes**: 50, 200, 1000 consultas a LLMs premium
- **Razón**: Mayor flexibilidad, sin compromiso mensual
- **Impacto**: Requiere sistema de billing y tracking de uso

## D002: 2025-06-21 - Selección de Símbolos
- **Core Focus**: 
  - ISO20022: XRP, XLM, ALGO, HBAR, QNT
  - RWA/Tokenización: LINK, POLYX, ONDO, TRU  
  - IA: FET, OCEAN, AGIX, TAO, VIRTUAL, ICP
  - Referencia: BTC, ETH, SOL
- **Evitar**: Memecoins y tokens sin utilidad real
- **Razón**: Enfoque en tendencias macro con fundamentos sólidos

## D003: 2025-06-21 - UX No-Realtime Analítico
- **Decisión**: Análisis completo generado en 2-3 minutos
- **Flujo**: Selección → Procesamiento → Reporte Visual → Chat
- **Razón**: Permite análisis más profundo y reflexivo
- **Ventaja**: Diferenciación vs herramientas realtime

## D004: 2025-06-21 - Autenticación Simple
- **Decisión**: Form registro básico, OAuth postergado
- **Campos**: Email, nombre, perfil trading, experiencia
- **Razón**: MVP rápido, OAuth añade complejidad innecesaria
- **Futuro**: OAuth cuando tengamos tracción

## D005: 2025-06-21 - Indicadores Adicionales
- **Nuevos**: Bollinger Bands, Elliott Waves, Enhanced Delta
- **Mantener**: Volume Profile, Order Flow, VWAP, Market Structure
- **Total**: 15 indicadores core para Smart Money analysis
- **Prioridad**: Calidad sobre cantidad

## D006: 2025-06-21 - Sistema de Trazabilidad v2.0
- **Cambio**: De archivos acumulativos a daily tasks
- **Estructura**: Un archivo por día + docs permanentes
- **Beneficio**: Más liviano y enfocado
- **Automatización**: Scripts para gestión de tasks
