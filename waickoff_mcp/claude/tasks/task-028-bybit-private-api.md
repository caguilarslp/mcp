# TASK-028: API Privada Bybit (Solo Lectura)

**Estado:** PENDIENTE
**Prioridad:** ALTA
**Tiempo estimado:** 7.5h total (3 fases)
**Creado:** 18/06/2025

## Objetivo
Implementar acceso de solo lectura a la API privada de Bybit para obtener información del portfolio personal (balance, posiciones, órdenes, PnL) y usarla como contexto en los análisis.

## Contexto del Usuario
- Portfolio: ~2000 USD
- Posiciones actuales: 3xx XRP, 8xxx HBAR
- Necesidad: Análisis contextualizado con posiciones reales

## Entregables

### FASE 1: Configuración y Autenticación Básica (2h)
1. **Configuración segura de API keys**
   ```typescript
   // .env
   BYBIT_API_KEY=xxx
   BYBIT_API_SECRET=xxx
   BYBIT_TESTNET=false
   ```

2. **BybitPrivateAdapter base**
   - Extender BaseExchangeAdapter
   - Implementar firma HMAC-SHA256
   - Headers de autenticación
   - Test de conexión exitosa

3. **Verificación de permisos**
   - Confirmar que API key es read-only
   - Test con endpoint /v5/user/query-api para verificar permisos

**Entregable:** Conexión autenticada funcionando con permisos verificados

### FASE 2: Wallet Balance y Herramienta Básica (2.5h)
1. **getWalletBalance()**
   ```typescript
   interface WalletBalance {
     coin: string;
     walletBalance: number;
     availableBalance: number;
     unrealisedPnl: number;
   }
   ```

2. **getTotalEquity()**
   - Balance total en USD
   - Lista de assets con valores

3. **Herramienta MCP: get_my_portfolio**
   - Balance completo
   - Distribución por asset
   - Formato optimizado para análisis

**Entregable:** Herramienta funcionando mostrando tu balance real (2000 USD, XRP, HBAR)

### FASE 3: Posiciones y Análisis Contextual (3.5h)
1. **getPositions()**
   ```typescript
   interface Position {
     symbol: string;
     side: 'Buy' | 'Sell';
     size: number;
     avgPrice: number;
     markPrice: number;
     unrealisedPnl: number;
   }
   ```

2. **Herramienta MCP: get_position_analysis**
   - Análisis técnico de XRP y HBAR
   - Incluir contexto de tus posiciones actuales
   - Niveles de gestión de riesgo personalizados

3. **Herramienta MCP: get_portfolio_alerts**
   - Alertas específicas para tus posiciones
   - Basadas en análisis SMC/Wyckoff
   - Priorizadas por impacto en tu portfolio

**Entregable:** 2 herramientas MCP analizando tus posiciones reales con contexto

## Seguridad y Mejores Prácticas
1. **API Keys**
   - NUNCA en código
   - Solo permisos de lectura
   - Rotación periódica

2. **Rate Limiting**
   - Respetar límites Bybit
   - Cache agresivo para data privada
   - Retry logic conservador

3. **Error Handling**
   - Manejo específico de errores de auth
   - Fallback a modo público si falla

## Beneficios Esperados
- Análisis personalizados según portfolio
- Alertas relevantes para posiciones actuales
- Gestión de riesgo contextualizada
- Mejor toma de decisiones con contexto real

## Dependencias
- TASK-027 (Context System) - Beneficioso pero no bloqueante
- Bybit API v5 documentation
- Sistema de cache existente

## Riesgos
- Seguridad de API keys (mitigar con read-only)
- Rate limits más estrictos (mitigar con cache)
- Dependencia de API externa (mitigar con fallbacks)

## Métricas de Éxito
- 100% endpoints read-only funcionando
- <500ms latencia para portfolio completo
- 0 errores de seguridad
- Análisis enriquecidos con contexto de portfolio
