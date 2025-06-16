# ⚡ Quick Reference - wAIckoff MCP Server

Comandos esenciales y ejemplos rápidos para uso diario.

## 🎯 Comandos Más Utilizados

### Market Data
```bash
# Ticker básico
get_ticker symbol="BTCUSDT"

# Datos completos de mercado
get_market_data symbol="ETHUSDT"

# Libro de órdenes
get_orderbook symbol="BTCUSDT" limit=25
```

### Análisis Técnico
```bash
# Análisis completo
perform_technical_analysis symbol="BTCUSDT"

# Solo volatilidad
analyze_volatility symbol="BTCUSDT"

# Soporte y resistencia
identify_support_resistance symbol="BTCUSDT" periods=100
```

### Smart Money Concepts
```bash
# Dashboard SMC completo
get_smc_dashboard symbol="BTCUSDT"

# Order Blocks
detect_order_blocks symbol="BTCUSDT" timeframe="60"

# Fair Value Gaps
find_fair_value_gaps symbol="BTCUSDT"

# Break of Structure
detect_break_of_structure symbol="BTCUSDT"
```

### Wyckoff Analysis
```bash
# Fase actual
analyze_wyckoff_phase symbol="BTCUSDT"

# Eventos Wyckoff
find_wyckoff_events symbol="BTCUSDT"

# Composite Man
analyze_composite_man symbol="BTCUSDT"
```

### Grid Trading
```bash
# Sugerencias básicas
suggest_grid_levels symbol="BTCUSDT" investment=1000

# Grid optimizado
suggest_grid_levels symbol="BTCUSDT" investment=5000 optimize=true
```

## 📊 Análisis por Timeframe

### Scalping (5-15 min)
```bash
# SMC para scalping
get_smc_dashboard symbol="BTCUSDT" timeframe="5"

# Order Blocks de corto plazo
detect_order_blocks symbol="BTCUSDT" timeframe="15" lookback=50

# Wyckoff intraday
analyze_wyckoff_phase symbol="BTCUSDT" timeframe="15"
```

### Day Trading (1-4 horas)
```bash
# Análisis estándar
get_smc_dashboard symbol="BTCUSDT" timeframe="60"

# Fibonacci para day trading
calculate_fibonacci_levels symbol="BTCUSDT" timeframe="60"

# Confluencias técnicas
find_technical_confluences symbol="BTCUSDT" timeframe="60"
```

### Swing Trading (Diario)
```bash
# Análisis a largo plazo
get_smc_dashboard symbol="BTCUSDT" timeframe="240"

# Wyckoff daily
analyze_wyckoff_phase symbol="BTCUSDT" timeframe="D"

# Elliott Wave
detect_elliott_waves symbol="BTCUSDT" timeframe="240"
```

## 🎨 Símbolos Populares

### Crypto Majors
```bash
# Bitcoin
get_complete_analysis symbol="BTCUSDT" investment=1000

# Ethereum
get_complete_analysis symbol="ETHUSDT" investment=1000

# Binance Coin
get_complete_analysis symbol="BNBUSDT" investment=500
```

### Altcoins
```bash
# Solana
get_smc_dashboard symbol="SOLUSDT"

# Cardano
get_smc_dashboard symbol="ADAUSDT"

# Polygon
get_smc_dashboard symbol="MATICUSDT"
```

## 🔧 Configuración Rápida

### Zona Horaria
```bash
# Auto-detectar
detect_timezone

# México
set_user_timezone timezone="America/Mexico_City"

# España
set_user_timezone timezone="Europe/Madrid"

# Estados Unidos (Este)
set_user_timezone timezone="America/New_York"
```

### Sistema
```bash
# Estado del sistema
get_system_health

# Configuración actual
get_user_config

# Limpiar cache
clear_cache
```

## 🚨 Troubleshooting Rápido

### Diagnóstico
```bash
# Logs de errores
get_debug_logs logType="errors" limit=10

# Estado de conexiones
get_system_health

# Validar configuración
validate_config
```

### Reset
```bash
# Limpiar cache
clear_cache

# Reset configuración
reset_config

# Validar después del reset
validate_config
```

## 📈 Flujos de Trabajo Comunes

### Análisis Matutino
```bash
1. get_system_health
2. get_smc_dashboard symbol="BTCUSDT"
3. get_smc_dashboard symbol="ETHUSDT"
4. analyze_wyckoff_phase symbol="BTCUSDT" timeframe="D"
5. detect_exchange_divergences symbol="BTCUSDT"
```

### Setup de Trading
```bash
1. get_smc_trading_setup symbol="BTCUSDT"
2. validate_smc_setup symbol="BTCUSDT" setupType="long"
3. calculate_fibonacci_levels symbol="BTCUSDT"
4. suggest_grid_levels symbol="BTCUSDT" investment=1000
```

### Investigación Profunda
```bash
1. get_complete_analysis symbol="BTCUSDT" investment=5000
2. analyze_composite_man symbol="BTCUSDT"
3. analyze_multi_timeframe_wyckoff symbol="BTCUSDT"
4. find_technical_confluences symbol="BTCUSDT"
5. generate_symbol_report symbol="BTCUSDT"
```

## 💡 Tips y Tricks

### Optimización
- Usa `timeframe="60"` para análisis estándar
- `lookback=100` es óptimo para la mayoría de casos
- Combina SMC + Wyckoff para mayor precisión

### Mejores Prácticas
- Siempre verificar `get_system_health` primero
- Usar `investment` en grid para cálculos precisos
- Combinar múltiples timeframes para confluencias

### Shortcuts
```bash
# Análisis rápido multi-símbolo
get_smc_dashboard symbol="BTCUSDT" && get_smc_dashboard symbol="ETHUSDT"

# Setup completo en un comando
get_complete_analysis symbol="BTCUSDT" investment=1000
```

## 🎯 Parámetros Importantes

### Timeframes
- `"5"` - 5 minutos (scalping)
- `"15"` - 15 minutos (scalping/day)
- `"60"` - 1 hora (day trading) ⭐ **Recomendado**
- `"240"` - 4 horas (swing)
- `"D"` - Diario (swing/position)

### Lookback Periods
- `50` - Análisis rápido
- `100` - Estándar ⭐ **Recomendado**
- `200` - Análisis profundo

### Investment Amounts
- `500` - Testing
- `1000` - Estándar ⭐ **Recomendado**
- `5000` - Análisis serio
- `10000+` - Trading profesional

## 🔥 Combinaciones Poderosas

### SMC + Wyckoff
```bash
get_smc_dashboard symbol="BTCUSDT" timeframe="60"
analyze_wyckoff_phase symbol="BTCUSDT" timeframe="60"
analyze_composite_man symbol="BTCUSDT" timeframe="60"
```

### Multi-Exchange Analysis
```bash
get_aggregated_ticker symbol="BTCUSDT"
detect_exchange_divergences symbol="BTCUSDT"
get_exchange_dominance symbol="BTCUSDT"
```

### Technical Confluences
```bash
calculate_fibonacci_levels symbol="BTCUSDT"
analyze_bollinger_bands symbol="BTCUSDT"
find_technical_confluences symbol="BTCUSDT"
```

## 📱 Mobile-Friendly Commands

### Short Commands
```bash
# Ticker rápido
get_ticker symbol="BTC"

# SMC básico
get_smc_dashboard symbol="BTC"

# Estado del sistema
get_system_health
```

## 🎪 Features Exclusivos

### Sistema de Retry Logic
- Automático en todas las conexiones
- 3 reintentos con backoff exponencial
- Fallbacks múltiples garantizan siempre resultados

### Detección Multicapa
- Order Blocks: 4 métodos de detección
- SMC: Sistema de 3 niveles de confluencias
- Fibonacci: Validación estricta High > Low

### Multi-Exchange (Único en el mercado)
```bash
# Features avanzados (próximamente)
predict_liquidation_cascade symbol="BTCUSDT"
detect_advanced_divergences symbol="BTCUSDT"
analyze_enhanced_arbitrage symbol="BTCUSDT"
```

## 🏆 Best Commands for Beginners

### Top 5 Comandos Esenciales
1. `get_system_health` - Verificar estado
2. `get_complete_analysis symbol="BTCUSDT" investment=1000` - Análisis completo
3. `get_smc_dashboard symbol="BTCUSDT"` - Smart Money
4. `analyze_wyckoff_phase symbol="BTCUSDT"` - Wyckoff
5. `suggest_grid_levels symbol="BTCUSDT" investment=1000` - Grid trading

### Top 5 Comandos Avanzados
1. `analyze_composite_man symbol="BTCUSDT"` - Institutional analysis
2. `find_technical_confluences symbol="BTCUSDT"` - Confluencias
3. `get_multi_exchange_analytics symbol="BTCUSDT"` - Multi-exchange
4. `generate_symbol_report symbol="BTCUSDT"` - Reporte completo
5. `analyze_smc_confluence_strength symbol="BTCUSDT"` - Análisis SMC avanzado

---

*Guía de referencia rápida para el servidor MCP más avanzado del mercado.*
