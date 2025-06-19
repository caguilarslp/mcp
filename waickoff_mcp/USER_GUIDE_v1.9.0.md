# 📚 wAIckoff MCP User Guide v1.9.0
*Guía completa del sistema de análisis con memoria persistente*

## 🚀 Inicio Rápido

### Instalación
```bash
git clone [repo] waickoff_mcp && cd waickoff_mcp
npm install && npm run build
```

### Configuración Claude Desktop
`%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "waickoff-mcp": {
      "command": "node",
      "args": ["D:\\projects\\mcp\\waickoff_mcp\\build\\index.js"]
    }
  }
}
```

### Primera Ejecución
```bash
npm start
# Verás: waickoff MCP Server v1.9.0 operational
# Luego: ✅ MongoDB connected successfully
```

---

## 🧠 Sistema de Contexto Persistente (NUEVO)

### ¿Qué es?
**Memoria de 3 meses** que hace cada análisis más inteligente:
- Carga automática de 90 días de historia
- MongoDB + archivos comprimidos
- Resuelve conflictos usando patrones históricos

### Configuración (.env)
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=waickoff_mcp
CONTEXT_RETENTION_DAYS=90
```

### Construir Contexto
```bash
# Ejecuta para cada símbolo principal:
"Analiza BTCUSDT completo"
"Analiza XRPUSDT en todos los timeframes"
"Genera reporte diario de ETHUSDT"
```

---

## 📊 Herramientas Principales (117+)

### 1. Market Data (3)
- `get_ticker` - "Precio de BTCUSDT"
- `get_orderbook` - "Orderbook de XRPUSDT con 50 niveles"
- `get_market_data` - "Datos completos de ETHUSDT"

### 2. Análisis Técnico (8)
- `analyze_volatility` - "Volatilidad de BTCUSDT para grid"
- `analyze_volume` - "Analiza volumen de XRPUSDT"
- `analyze_volume_delta` - "Delta de volumen ETHUSDT"
- `identify_support_resistance` - "S/R de BTCUSDT"
- `perform_technical_analysis` - "Análisis técnico completo XRPUSDT" ⭐
- `get_complete_analysis` - "Análisis completo BTCUSDT con $5000"

### 3. Smart Money Concepts (14)
- `detect_order_blocks` - "Order blocks en BTCUSDT"
- `find_fair_value_gaps` - "FVG de XRPUSDT"
- `detect_break_of_structure` - "BOS en ETHUSDT"
- `get_smc_dashboard` - "Dashboard SMC de BTCUSDT" ⭐
- `get_smc_trading_setup` - "Mejor setup SMC para XRPUSDT"
- `analyze_smart_money_confluence` - "Confluencias SMC en ETHUSDT"

### 4. Wyckoff Analysis (14)
#### Básico (7)
- `analyze_wyckoff_phase` - "Fase Wyckoff de BTCUSDT"
- `find_wyckoff_events` - "Busca springs en XRPUSDT"
- `get_wyckoff_interpretation` - "Interpretación Wyckoff ETHUSDT" ⭐

#### Avanzado (7)
- `analyze_composite_man` - "Composite Man en BTCUSDT"
- `analyze_multi_timeframe_wyckoff` - "Wyckoff MTF XRPUSDT"
- `calculate_cause_effect_targets` - "Targets Wyckoff ETHUSDT"

### 5. Multi-Exchange (11)
- `get_aggregated_ticker` - "Precio agregado BTCUSDT"
- `detect_exchange_divergences` - "Divergencias en XRPUSDT"
- `identify_arbitrage_opportunities` - "Arbitraje en ETHUSDT"
- `predict_liquidation_cascade` - "Predicción liquidaciones BTCUSDT" ⭐

### 6. Indicadores Técnicos (4)
- `calculate_fibonacci_levels` - "Fibonacci para BTCUSDT"
- `analyze_bollinger_bands` - "Bollinger Bands XRPUSDT"
- `detect_elliott_waves` - "Ondas Elliott en ETHUSDT"
- `find_technical_confluences` - "Confluencias técnicas BTCUSDT" ⭐

### 7. Grid Trading (2)
- `suggest_grid_levels` - "Grid para BTCUSDT con $5000"
- Incluye backtesting con contexto histórico

### 8. Detección de Trampas (7)
- `detect_bull_trap` - "Bull trap en BTCUSDT?"
- `detect_bear_trap` - "Bear trap en XRPUSDT?"
- `get_trap_history` - "Historial trampas ETHUSDT"

### 9. Análisis Histórico (6)
- `analyze_historical_sr` - "S/R histórico BTCUSDT"
- `identify_volume_anomalies` - "Anomalías volumen XRPUSDT"
- `identify_market_cycles` - "Ciclos de mercado ETHUSDT"

### 10. Sistema de Contexto (7)
- `get_analysis_context` - "Contexto de BTCUSDT"
- `get_context_stats` - "Estadísticas de contexto"
- Gestión automática del contexto histórico

### 11. Repositorio y Reportes (15)
- `get_latest_analysis` - "Último análisis de BTCUSDT"
- `generate_daily_report` - "Reporte diario"
- `generate_symbol_report` - "Reporte completo XRPUSDT"
- `get_repository_stats` - "Estadísticas del repositorio"

### 12. Configuración (16)
- `get_user_config` - "Mi configuración"
- `set_user_timezone` - "Timezone America/Mexico_City"
- `get_system_health` - "Estado del sistema"

### 13. Cache (3)
- `get_cache_stats` - "Estadísticas cache"
- `clear_cache` - "Limpia cache"
- `invalidate_cache` - "Invalida cache BTCUSDT"

---

## 🎯 Casos de Uso con Contexto

### Análisis Enriquecido
```bash
"Analiza BTCUSDT"
# Carga 500+ análisis previos
# Identifica patrones históricos
# Responde: "Soporte en 45k tocado 23 veces (92% efectivo)"
```

### Resolución de Conflictos
```bash
# Cuando hay señales contradictorias:
SMC: "SHORT"
Wyckoff: "Accumulation"
Histórico: "85% bullish desde este nivel"

Sistema: "WAIT - Conflicto con sesgo histórico bullish"
```

### Validación de Setups
```bash
"Valida setup long XRPUSDT a 0.52"
# Revisa setups similares en 90 días
# Responde: "78% success rate histórico, 9/12 exitosos"
```

---

## ⚙️ Configuración Avanzada

### Variables Clave (.env)
```env
# Contexto
CONTEXT_RETENTION_DAYS=90    # 3 meses (180 para swing)
MAX_CONTEXT_ENTRIES=10000

# Trading
DEFAULT_RISK_PERCENT=2
DEFAULT_GRID_COUNT=10

# Performance
CACHE_DURATION_MINUTES=5     # 1 para scalping, 15 para swing
ENABLE_MULTI_EXCHANGE=true

# Storage
STORAGE_STRATEGY=mongo_first
ENABLE_STORAGE_FALLBACK=true
```

### Por Estilo de Trading

**Day Trading (default):** 90 días contexto, cache 5 min
**Swing Trading:** 180 días contexto, cache 15 min  
**Scalping:** 30 días contexto, cache 1 min
**Largo Plazo:** 365 días contexto, cache 60 min

---

## 🛠️ Troubleshooting

### MongoDB no conecta
```bash
node verify-mongodb.mjs  # Verificar conexión
# Sistema funciona sin MongoDB usando archivos
```

### Análisis lento
```bash
"get_cache_stats"        # Ver performance
"clear_cache true"       # Si necesario
```

### Sin contexto histórico
```bash
"get_repository_stats"   # Ver datos acumulados
# Ejecutar más análisis para construir contexto
```

---

## 💡 Mejores Prácticas

1. **Construcción de Contexto Inicial**
   - Analiza cada símbolo principal en múltiples timeframes
   - Ejecuta análisis completos, no parciales
   - Genera reportes diarios para contexto rico

2. **Uso Eficiente**
   - Usa `perform_technical_analysis` para análisis completo
   - Revisa `get_smc_dashboard` para vista integral
   - Valida setups contra contexto histórico

3. **Mantenimiento**
   - Semanal: `get_repository_stats`
   - Mensual: `clear_cache true`
   - Contexto se mantiene automáticamente

---

## 📈 Comandos Rápidos

### Esenciales
```bash
"Analiza BTCUSDT"                    # Análisis técnico completo
"Dashboard SMC de XRPUSDT"           # Smart Money completo
"Interpretación Wyckoff ETHUSDT"     # Wyckoff completo
"Divergencias en BTCUSDT"            # Multi-exchange
"Grid para XRPUSDT con $5000"        # Grid trading
```

### Sistema
```bash
"get_system_health"                  # Estado general
"get_repository_stats"               # Contexto acumulado
"get_cache_stats"                    # Performance
```

---

## 📊 Resumen v1.9.0

- **117+ herramientas** con contexto histórico
- **3 meses** de memoria persistente
- **MongoDB + Files** almacenamiento dual
- **<3 segundos** por análisis completo
- **Resolución automática** de conflictos
- **0 pérdida** de información entre sesiones

---

*wAIckoff MCP v1.9.0 - Cada análisis es más inteligente que el anterior*