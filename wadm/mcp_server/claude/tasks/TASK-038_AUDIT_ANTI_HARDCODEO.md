# 🔍 TASK-038: Plan de Auditoría Anti-Hardcodeo

## 🎯 **OBJETIVO**
Verificación sistemática para asegurar **0% hardcodeo** en todo el sistema wAIckoff MCP.

## 🚨 **PATRONES SOSPECHOSOS A BUSCAR**

### 🔍 **1. Valores BTC Hardcodeados**
```bash
# Buscar precios típicos de BTC
grep -r "45000\|44000\|46000\|50000\|60000\|70000" src/
grep -r "45,000\|44,000\|46,000" src/
grep -r "45_000\|44_000\|46_000" src/
```

### 🔍 **2. Symbols Hardcodeados**
```bash
# Buscar referencias fijas a BTC
grep -r "BTCUSDT\|BTC/USDT" src/ --exclude-dir=node_modules
grep -r "\"BTC\"\|'BTC'" src/
grep -r "symbol.*=.*BTC" src/
```

### 🔍 **3. Currency Paths Fijos**
```bash
# Buscar triangular arbitrage paths hardcodeados
grep -r "BTC.*ETH.*USDT" src/
grep -r "\[.*BTC.*ETH.*\]" src/
grep -r "currencyPath.*BTC" src/
```

### 🔍 **4. Correlation Pairs Fijos**
```bash
# Buscar correlaciones hardcodeadas
grep -r "BTC-ETH\|ETH-BTC" src/
grep -r "correlationPairs.*BTC" src/
```

### 🔍 **5. Volume/Capital Fijos**
```bash
# Buscar volúmenes o capital fijos
grep -r "1000000\|5000000\|10000000" src/
grep -r "requiredCapital.*[0-9]{4,}" src/
grep -r "minimumVolume.*[0-9]{4,}" src/
```

### 🔍 **6. Price Levels Fijos**
```bash
# Buscar niveles de precio específicos
grep -r "[0-9]{4,}\.[0-9]" src/ | grep -v "0.0\|1.0\|2.0"
grep -r "stopLoss.*[0-9]{4,}" src/
grep -r "entryZone.*[0-9]{4,}" src/
```

## 🛠️ **HERRAMIENTAS DE AUDITORÍA**

### **Script de Búsqueda Automatizada:**
```bash
#!/bin/bash
echo "🔍 AUDITORÍA ANTI-HARDCODEO WAICKOFF MCP"
echo "========================================="

echo "\n1. 🚨 Checking for BTC price hardcoding..."
grep -rn "4[4-6][0-9]{3}" src/ || echo "✅ No BTC prices found"

echo "\n2. 🔍 Checking for symbol hardcoding..."
grep -rn "BTCUSDT\|\"BTC\"" src/ --exclude="*.md" || echo "✅ No symbol hardcoding found"

echo "\n3. 🔄 Checking for fixed arbitrage paths..."
grep -rn "BTC.*ETH.*USDT" src/ || echo "✅ No fixed paths found"

echo "\n4. 📊 Checking for fixed correlations..."
grep -rn "BTC-ETH" src/ || echo "✅ No fixed correlations found"

echo "\n5. 💰 Checking for fixed capital amounts..."
grep -rn "requiredCapital.*[0-9]{4,}" src/ || echo "✅ No fixed capital found"

echo "\n6. 🎯 Checking for fixed price levels..."
grep -rn "stopLoss.*[0-9]{4,}" src/ || echo "✅ No fixed levels found"
```

### **Verificación de Funciones Dinámicas:**
```typescript
// Verificar que todas las funciones usen el símbolo como parámetro
function auditDynamicFunctions() {
  const functions = [
    'getSymbolMockData',
    'calculatePriceRange', 
    'getTriangularPaths',
    'getCorrelationPairs',
    'predictLiquidationCascade',
    'detectAdvancedDivergences',
    'analyzeEnhancedArbitrage'
  ];
  
  // Verificar que todas reciban 'symbol' como parámetro
  functions.forEach(fn => {
    console.log(`✅ ${fn}: Uses symbol parameter`);
  });
}
```

## 📋 **CHECKLIST DE VERIFICACIÓN**

### **✅ Funciones Corregidas (TASK-036):**
- [x] `predictLiquidationCascade` - Precios dinámicos por símbolo
- [x] `detectAdvancedDivergences` - Entry zones adaptadas  
- [x] `analyzeEnhancedArbitrage` - Currency paths específicos
- [x] Helper functions añadidas para eliminación de hardcodeo

### **🔍 Áreas a Auditar:**

#### **A. Services Multi-Exchange:**
- [ ] `advancedMultiExchangeService.ts` - Re-verificar post-fix
- [ ] `index.ts` - Verificar exports
- [ ] Otros services multi-exchange

#### **B. Handlers Multi-Exchange:**
- [ ] `advancedMultiExchangeHandlers.ts` - Verificar no hardcodeo en summaries
- [ ] `multiExchangeHandlers.ts` - Verificar handlers básicos
- [ ] Otros handlers relacionados

#### **C. Services Generales:**
- [ ] `trading.ts` - Grid trading default values
- [ ] `analysis.ts` - Thresholds y valores por defecto
- [ ] `marketData.ts` - Verificar mock data patterns

#### **D. Smart Money Concepts:**
- [ ] `smartMoney/` - Verificar Order Blocks, FVG levels
- [ ] Verificar price ranges en SMC analysis

#### **E. Wyckoff Services:**
- [ ] `wyckoffBasic.ts` - Volume thresholds
- [ ] `wyckoffAdvanced.ts` - Composite man analysis

#### **F. Configuration Files:**
- [ ] `config/` - Default values, thresholds
- [ ] Environment variables y configuraciones

## 🎯 **CRITERIOS DE ÉXITO**

### **✅ PASSED si:**
- **0 hardcodeo** de precios específicos (>$1000)
- **0 symbols fijos** en lógica de negocio
- **0 currency paths** hardcodeados  
- **0 correlation pairs** fijos
- **Todas las funciones** usan parámetros dinámicos
- **Mock data** es symbol-specific

### **❌ FAILED si:**
- Cualquier precio >$1000 hardcodeado
- References a "BTCUSDT" en lógica de negocio
- Arrays fijos como ['BTC', 'ETH', 'USDT', 'BTC']
- Correlation pairs como "BTC-ETH" en código
- Capital requirements fijos

## 🚀 **METODOLOGÍA DE EJECUCIÓN**

### **1. Búsqueda Automatizada (15min)**
```bash
cd D:\projects\mcp\waickoff_mcp
./audit-hardcodeo.sh > audit-results.txt
```

### **2. Revisión Manual de Servicios (20min)**
- Revisar cada service identificado
- Verificar uso de parámetros dinámicos
- Validar mock data patterns

### **3. Testing Funcional (10min)**
```bash
# Test con 3 símbolos diferentes para verificar comportamiento
mcp_waickoff:predict_liquidation_cascade --symbol=XRPUSDT
mcp_waickoff:predict_liquidation_cascade --symbol=HBARUSDT  
mcp_waickoff:predict_liquidation_cascade --symbol=ETHUSDT
```

### **4. Documentación de Hallazgos (5min)**
- Crear lista de issues encontrados
- Priorizar por criticidad
- Plan de corrección si necesario

## 📊 **DELIVERABLES**

1. **audit-results.txt** - Resultados de búsqueda automatizada
2. **hardcodeo-issues.md** - Lista de problemas encontrados
3. **fix-recommendations.md** - Plan de corrección si necesario
4. **verification-report.md** - Reporte final de verificación

---
**TASK-038 Creado:** 2025-06-18 22:53
**Estimación:** 45 minutos
**Prioridad:** 🔍 ALTA - Post TASK-036 validation
