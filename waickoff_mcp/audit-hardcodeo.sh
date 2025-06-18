#!/bin/bash
echo "🔍 AUDITORÍA ANTI-HARDCODEO WAICKOFF MCP"
echo "========================================="
echo "Fecha: $(date)"
echo "Objetivo: Verificar 0% hardcodeo post TASK-036"
echo ""

cd "D:\projects\mcp\waickoff_mcp"

echo "1. 🚨 Checking for BTC price hardcoding..."
echo "   Searching for prices 44000-46000, 50000-70000..."
RESULT1=$(grep -rn "4[4-6][0-9]{3}\|[5-7][0-9]{4}" src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v node_modules | head -10)
if [ -z "$RESULT1" ]; then
    echo "   ✅ No BTC-range prices found"
else
    echo "   ⚠️ Found potential hardcoded prices:"
    echo "$RESULT1"
fi
echo ""

echo "2. 🔍 Checking for symbol hardcoding..."
echo "   Searching for BTCUSDT, \"BTC\", 'BTC'..."
RESULT2=$(grep -rn "BTCUSDT\|\"BTC\"\|'BTC'" src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v node_modules | grep -v "// " | head -10)
if [ -z "$RESULT2" ]; then
    echo "   ✅ No symbol hardcoding found"
else
    echo "   ⚠️ Found potential symbol hardcoding:"
    echo "$RESULT2"
fi
echo ""

echo "3. 🔄 Checking for fixed arbitrage paths..."
echo "   Searching for BTC->ETH->USDT patterns..."
RESULT3=$(grep -rn "BTC.*ETH.*USDT\|\[.*BTC.*ETH.*\]" src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v node_modules | head -10)
if [ -z "$RESULT3" ]; then
    echo "   ✅ No fixed arbitrage paths found"
else
    echo "   ⚠️ Found potential fixed paths:"
    echo "$RESULT3"
fi
echo ""

echo "4. 📊 Checking for fixed correlations..."
echo "   Searching for BTC-ETH patterns..."
RESULT4=$(grep -rn "BTC-ETH\|ETH-BTC" src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v node_modules | head -10)
if [ -z "$RESULT4" ]; then
    echo "   ✅ No fixed correlations found"
else
    echo "   ⚠️ Found potential fixed correlations:"
    echo "$RESULT4"
fi
echo ""

echo "5. 💰 Checking for fixed capital amounts..."
echo "   Searching for large fixed numbers (capital/volume)..."
RESULT5=$(grep -rn "requiredCapital.*[0-9]{4,}\|minimumVolume.*[0-9]{4,}" src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v node_modules | head -10)
if [ -z "$RESULT5" ]; then
    echo "   ✅ No fixed capital amounts found"
else
    echo "   ⚠️ Found potential fixed capital:"
    echo "$RESULT5"
fi
echo ""

echo "6. 🎯 Checking for fixed price levels..."
echo "   Searching for stopLoss, entryZone with large numbers..."
RESULT6=$(grep -rn "stopLoss.*[0-9]{4,}\|entryZone.*[0-9]{4,}" src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v node_modules | head -10)
if [ -z "$RESULT6" ]; then
    echo "   ✅ No fixed price levels found"
else
    echo "   ⚠️ Found potential fixed levels:"
    echo "$RESULT6"
fi
echo ""

echo "========================================="
echo "🎯 SUMMARY:"
echo "1. BTC Prices: $([ -z "$RESULT1" ] && echo "✅ CLEAN" || echo "⚠️ ISSUES")"
echo "2. Symbol Hardcoding: $([ -z "$RESULT2" ] && echo "✅ CLEAN" || echo "⚠️ ISSUES")"
echo "3. Fixed Paths: $([ -z "$RESULT3" ] && echo "✅ CLEAN" || echo "⚠️ ISSUES")"
echo "4. Fixed Correlations: $([ -z "$RESULT4" ] && echo "✅ CLEAN" || echo "⚠️ ISSUES")"
echo "5. Fixed Capital: $([ -z "$RESULT5" ] && echo "✅ CLEAN" || echo "⚠️ ISSUES")"
echo "6. Fixed Levels: $([ -z "$RESULT6" ] && echo "✅ CLEAN" || echo "⚠️ ISSUES")"
echo ""

# Count total issues
TOTAL_ISSUES=0
[ ! -z "$RESULT1" ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ ! -z "$RESULT2" ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ ! -z "$RESULT3" ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ ! -z "$RESULT4" ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ ! -z "$RESULT5" ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ ! -z "$RESULT6" ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo "🎉 AUDIT RESULT: ✅ CLEAN - No hardcodeo detected!"
    echo "Status: READY FOR PRODUCTION"
else
    echo "🚨 AUDIT RESULT: ⚠️ ISSUES FOUND ($TOTAL_ISSUES categories)"
    echo "Status: NEEDS INVESTIGATION"
fi
echo "========================================="
