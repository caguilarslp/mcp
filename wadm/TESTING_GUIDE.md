"""
Manual Testing Guide - Order Flow Analyzer
==========================================

Sigue estos pasos para probar manualmente el Order Flow Analyzer:

## OPCIÓN 1: Prueba Rápida (Solo Algoritmos) - 2 minutos

1. Ejecutar el ejemplo standalone:
   ```bash
   cd D:\projects\mcp\wadm
   python quick_test_order_flow.py
   ```
   
   Esto debe mostrar:
   - ✅ Cálculo de Order Flow completo
   - ✅ Clasificación buy/sell
   - ✅ Detección de absorción e imbalances
   - ✅ Métricas de eficiencia de mercado
   - ✅ Señales de trading

## OPCIÓN 2: Prueba con API (Completa) - 10 minutos

### Paso 1: Iniciar el servidor
```bash
cd D:\projects\mcp\wadm
python src/presentation/api/main.py
```

Debes ver:
```
INFO: Uvicorn running on http://0.0.0.0:8920
INFO: MongoDB connected successfully
INFO: Redis connected successfully
```

### Paso 2: Probar endpoints en otra terminal
```bash
python test_api_order_flow.py
```

### Paso 3: Probar manualmente con curl/browser

Abrir navegador en: http://localhost:8920/docs

Probar endpoints:
- GET /api/v1/order-flow/current/BTCUSDT
- GET /api/v1/order-flow/historical/BTCUSDT  
- GET /api/v1/order-flow/absorption-events/BTCUSDT

## OPCIÓN 3: Prueba con Docker - 15 minutos

### Paso 1: Construir imagen
```bash
cd D:\projects\mcp\wadm
docker-compose build
```

### Paso 2: Iniciar servicios
```bash
docker-compose up -d
```

### Paso 3: Verificar logs
```bash
docker-compose logs -f wadm
```

### Paso 4: Probar API
```bash
curl http://localhost:8920/api/v1/order-flow/current/BTCUSDT?exchange=bybit
```

## OPCIÓN 4: Tests Unitarios - 3 minutos

```bash
# Windows
test_order_flow.bat

# Linux/Mac  
bash test_order_flow.sh
```

Debes ver:
```
✅ test_trade_classification_with_orderbook PASSED
✅ test_calculate_order_flow_basic PASSED  
✅ test_absorption_detection PASSED
✅ test_delta_calculation PASSED
... 25+ tests PASSED
```

## 🔍 ¿Qué Verificar?

### Salida Exitosa del Quick Test:
```
🔄 ORDER FLOW CALCULATOR DEMONSTRATION
=====================================
📊 Calculating order flow profile...

📈 ORDER FLOW ANALYSIS RESULTS
Symbol: BTCUSDT
Exchange: bybit
Total Volume: 245.50
Net Delta: +12.30 (Bullish)
Market Efficiency: 78.5%
```

### Salida Exitosa de API:
```json
{
  "order_flow": {
    "net_delta": 12.30,
    "buy_percentage": 55.2,
    "market_efficiency": 78.5
  },
  "market_condition": "balanced_market",
  "signals": ["bullish_delta"]
}
```

### Salida Exitosa de Tests:
```
tests/application/services/test_order_flow_calculator.py::TestOrderFlowCalculator::test_calculate_order_flow_basic PASSED
[25 tests passed in 2.45s]
```

## 🚨 Troubleshooting

Si algo falla:

1. **ImportError**: Verificar PYTHONPATH o usar `python -m` syntax
2. **Connection Error**: Verificar que MongoDB/Redis estén corriendo
3. **Port 8920 busy**: Cambiar puerto en main.py o matar proceso
4. **Module not found**: Verificar estructura de directorios

## 📊 Interpretación de Resultados

### Métricas Clave:
- **Net Delta > 0**: Presión compradora dominante
- **Market Efficiency > 70%**: Mercado balanceado
- **Absorption Events**: Actividad institucional detectada
- **Imbalance Events**: Flujo direccional fuerte

### Señales de Trading:
- **bullish_delta**: Momentum comprador
- **strong_absorption_buy**: Absorción en soporte
- **strong_imbalance_sell**: Flujo vendedor dominante

¡El sistema está listo para uso en producción! 🚀
"""
