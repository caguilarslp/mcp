# TASK-036: Fix Symbol Mapping en Multi-Exchange Tools

## 🚨 CRÍTICA - BLOQUEA PRODUCCIÓN

### 📋 Descripción
**Issue:** 3/5 herramientas multi-exchange devuelven datos incorrectos para símbolos no-BTC
- **Liquidation Cascade:** Precios $45K para XRPUSDT (~$2)
- **Advanced Divergences:** Entry zones BTC scale para altcoins  
- **Enhanced Arbitrage:** Currency paths "BTC->ETH->USDT" para XRP

### 🎯 Objetivo
Corregir symbol mapping para que todas las herramientas funcionen correctamente con cualquier símbolo.

### 🔧 Tareas Específicas
1. **Investigar:** Localizar dónde ocurre el hardcoding BTC
2. **Identificar:** Functions que no adaptan a symbol específico
3. **Corregir:** Symbol mapping en 3 herramientas afectadas
4. **Validar:** Testing con BTCUSDT, XRPUSDT, HBARUSDT

### 📁 Archivos Probables
- `src/services/multi-exchange/`
- `src/adapters/handlers/multi-exchange-handler.ts`
- Functions específicas de liquidation, divergences, arbitrage

### ⏱️ Estimación
**1.5-2 horas** (investigación + fixes + testing)

### 🚫 Herramientas BLOQUEADAS hasta fix:
- `predict_liquidation_cascade`
- `detect_advanced_divergences` 
- `analyze_enhanced_arbitrage`

### ✅ Criterios de Éxito
- [ ] XRPUSDT analysis muestra precios ~$2.17, no $45K
- [ ] Entry zones escaladas correctamente por símbolo
- [ ] Currency paths adaptados al símbolo analizado
- [ ] Testing exitoso con 3+ símbolos diferentes

---
**Prioridad:** 🔴 CRÍTICA - Sin esto, 60% del módulo multi-exchange es inutilizable
**Status:** PENDIENTE
**Creado:** 2025-06-18
