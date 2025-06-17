#!/bin/bash
# Ejecutar tests unitarios de Order Flow

echo "🧪 Ejecutando tests unitarios de Order Flow..."
echo "================================================="

cd /d/projects/mcp/wadm

# Ejecutar tests específicos de Order Flow
echo "📊 Testing OrderFlowCalculator..."
python -m pytest tests/application/services/test_order_flow_calculator.py -v

echo ""
echo "📈 Testing integración..."
python -m pytest tests/ -k "order_flow" -v

echo ""
echo "✅ Tests completados!"
