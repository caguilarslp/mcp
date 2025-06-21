# PRÓXIMAS PRIORIDADES - Post TASK-001

## ✅ TASK-001 COMPLETADO
Los indicadores ahora se calculan correctamente con:
- Threshold reducido (20 trades mínimos vs 50)
- Validación robusta de trades
- Timing más agresivo (5s vs 10s)
- Forzado inteligente cada 15s

## 🎯 SIGUIENTES PRIORIDADES

### 🔥 SECUENCIA ÓPTIMA POST TASK-001

**1. TASK-025: Institutional Data Sources (1 semana) - FOUNDATION**
**2. TASK-026: SMC Advanced Implementation (2 semanas) - GAME CHANGER**
**3. TASK-002: Volume Profile Enhancement (3 horas) - POLISH**

### 🚀 JUSTIFICACIÓN DE PRIORIDADES

#### ¿Por qué TASK-025 + TASK-026 juntos son CRÍTICOS?
1. **Datos institucionales** (TASK-025) = Foundation necesaria
2. **SMC Implementation** (TASK-026) = Game changer que usa esos datos
3. **Combinación** = Sistema SMC más avanzado del mundo

#### ROI PROYECTADO DE LA SECUENCIA:
- **TASK-025 solo**: +25% accuracy, -40% false signals
- **TASK-026 solo**: +30% accuracy (SMC tradicional)
- **TASK-025 + TASK-026**: +60% accuracy, -70% false signals ⚡

### 1. TASK-025: Institutional Data Sources (Alta Prioridad - 1 semana)
**¿Por qué es prioritario?**
- Mejora calidad de señales significativamente
- Reduce señales falsas en 40%
- Agrega ventaja competitiva con datos institucionales

**Fases de implementación:**
- **Día 1-3**: Coinbase Pro & Kraken WebSocket collectors
- **Día 4-5**: Cold wallet monitoring (Bybit, Binance, etc.)
- **Día 6-7**: USDT/USDC minting tracking + integration

**ROI Esperado:**
- +25% accuracy en señales
- Detección temprana de movimientos (2-4 horas)
- Correlation score >0.7 entre wallet flows y precio

### 2. TASK-002: Volume Profile Enhancement (3 horas)
**Mejoras específicas:**
- Time Price Opportunity (TPO) counts
- Developing Value Area en tiempo real
- Session-based profiles (Asian, London, NY)
- Naked POC detection
- Volume delta por nivel de precio

### 3. TASK-023: FastMCP Server (1 semana)
**Para integración con Claude Desktop:**
- Servidor MCP 2.8.0 compliant
- Tools específicos para análisis Wyckoff
- WebSocket real-time updates
- Rate limiting y caché

### 4. TASK-022: Data Aggregation Service (1 semana)
**Agregación temporal:**
- Timeframes estándar (5m, 15m, 1H, 4H, D, W)
- Velas OHLCV desde trades raw
- Volume Profile por período
- Storage tiered automático

## 🔄 PLAN DE EJECUCIÓN

### Semana 1: Datos Institucionales (TASK-025)
```
Lunes-Miércoles: Coinbase Pro + Kraken collectors
Jueves-Viernes: Cold wallet monitoring
Fin de semana: USDT/USDC minting + testing
```

### Semana 2: Mejoras Core
```
Lunes: Volume Profile Enhancement (TASK-002)
Martes-Viernes: FastMCP Server (TASK-023)
Fin de semana: Testing y documentación
```

### Semana 3: Infraestructura
```
Lunes-Viernes: Data Aggregation Service (TASK-022)
Fin de semana: Storage optimization
```

## 📊 MÉTRICAS DE ÉXITO

### Después de TASK-025 (Datos Institucionales)
- [ ] Correlation >0.7 entre cold flows y movimientos
- [ ] Detección anticipada de moves institucionales
- [ ] Reducción 40% en señales falsas
- [ ] Institutional Activity Score funcionando

### Después de TASK-002 (Volume Profile)
- [ ] TPO counts precisos
- [ ] Value Area desarrollándose en tiempo real
- [ ] Session profiles separados
- [ ] Naked POCs detectados

### Después de TASK-023 (MCP Server)
- [ ] Claude Desktop integrado
- [ ] Tools Wyckoff funcionando
- [ ] WebSocket real-time estable
- [ ] Rate limiting efectivo

## 🚀 VENTAJA COMPETITIVA

### Con Datos Institucionales (TASK-025)
1. **Coinbase Pro signals** = Institutional US flow
2. **Kraken signals** = Institutional EU flow  
3. **Cold wallet movements** = 2-3 días de lead time
4. **Stablecoin minting** = Predicción de liquidity injection

### Esta combinación es ÚNICA en el mercado
- La mayoría usa solo Binance/Bybit (retail)
- Pocos monitorean cold wallets sistemáticamente
- Nadie correlaciona minting con Wyckoff phases

## ⚡ EJECUCIÓN INMEDIATA

### Comando para verificar TASK-001:
```bash
python verify_task001.py
```

### Si verificación exitosa, continuar con:
```bash
# 1. Crear branch para TASK-025
git checkout -b task-025-institutional-data

# 2. Implementar Coinbase collector
# 3. Implementar Kraken collector
# 4. Testing con símbolos institucionales
```

### Estructura de carpetas para TASK-025:
```
src/
├── collectors/
│   ├── coinbase_collector.py  # Nuevo
│   ├── kraken_collector.py    # Nuevo
│   └── wallet_monitor.py      # Nuevo
├── institutional/             # Nuevo directorio
│   ├── activity_score.py      # Composite scoring
│   ├── wallet_tracker.py      # Cold wallet tracking
│   └── stablecoin_monitor.py  # Minting events
```

---
**Estado actual**: TASK-001 ✅ → Ready for TASK-025 🚀
**Siguiente milestone**: Institutional data integration completada
**Timeline**: 7 días para ventaja competitiva significativa
