# 🔧 Bybit MCP Server - Troubleshooting Guide

## 🚨 Common Issues & Solutions

### **🔌 Connection Issues**

#### ❌ Problem: "MCP Server not responding"
**Symptoms:**
- Tools not appearing in Claude
- Connection timeouts
- No response from MCP calls

**Solutions:**
1. **Check Claude Desktop configuration:**
   ```json
   {
     "mcpServers": {
       "bybit-mcp": {
         "command": "node",
         "args": ["D:\\projects\\mcp\\bybit-mcp\\build\\index.js"],
         "env": {}
       }
     }
   }
   ```

2. **Verify build exists:**
   ```bash
   cd D:\projects\mcp\bybit-mcp
   npm run build
   ```

3. **Test manual execution:**
   ```bash
   node build/index.js
   # Should show: "Bybit MCP Server funcionando..."
   ```

4. **Restart Claude Desktop completely**

---

#### ❌ Problem: "Build directory not found"
**Error:** `Cannot find module 'D:\projects\mcp\bybit-mcp\build\index.js'`

**Solutions:**
1. **Compile TypeScript:**
   ```bash
   cd D:\projects\mcp\bybit-mcp
   npm run build
   ```

2. **Check package.json scripts:**
   ```json
   {
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch"
     }
   }
   ```

3. **Verify TypeScript installation:**
   ```bash
   npm install typescript -D
   ```

---

### **📡 API Issues**

#### ❌ Problem: "Bybit API error: retCode 10001"
**Error:** Invalid symbol or market data not available

**Solutions:**
1. **Verify symbol format:**
   - ✅ Correct: "BTCUSDT", "XRPUSDT", "HBARUSDT"
   - ❌ Wrong: "BTC/USDT", "xrp-usdt", "btcusdt"

2. **Check symbol exists on Bybit:**
   - Visit: https://www.bybit.com/trade/spot/
   - Verify symbol is listed and active

3. **Use correct category:**
   ```javascript
   // For most crypto pairs
   await get_ticker({symbol: "BTCUSDT", category: "spot"});
   
   // For perpetual futures
   await get_ticker({symbol: "BTCUSDT", category: "linear"});
   ```

---

#### ❌ Problem: "HTTP error! status: 429"
**Error:** Rate limiting by Bybit API

**Solutions:**
1. **Reduce request frequency** - Wait between calls
2. **Increase timeout intervals** in your application
3. **Implement backoff strategy** if making multiple calls

---

### **⚠️ Data Quality Issues**

#### ❌ Problem: "Support/Resistance levels seem wrong"
**Symptoms:**
- Resistance levels below current price
- Support levels above current price
- Nonsensical level classification

**Solutions:**
1. **Verify current version is v1.2.1+:**
   ```bash
   node build/index.js | grep version
   ```

2. **Check if BUG-001 fix is applied:**
   - Read: `claude/bugs/bug-001-sr-classification.md`
   - Verify classification logic is correct

3. **Test with known symbols:**
   ```javascript
   await identify_support_resistance({
     symbol: "BTCUSDT",
     periods: 50,
     sensitivity: 2
   });
   ```

4. **Validate logic manually:**
   - Resistance = level > current price
   - Support = level < current price

---

#### ❌ Problem: "Volume Delta shows unrealistic values"
**Understanding:** Volume Delta is **approximated** without tick data

**What's Normal:**
- Values between -50% to +50% of total volume
- Gradual changes, not extreme swings
- Correlation with price direction

**What's Abnormal:**
- Delta > 100% of volume
- Constant extreme values
- No correlation with obvious price moves

**Solutions:**
1. **Use larger timeframes** for more stable data
2. **Compare with price action** for validation
3. **Focus on trends**, not absolute values

---

### **🎯 Grid Trading Issues**

#### ❌ Problem: "Grid suggestions seem too wide/narrow"
**Symptoms:**
- Suggested range doesn't match recent price action
- Grid levels too far apart or too close
- Unrealistic profit estimates

**Solutions:**
1. **Check volatility analysis first:**
   ```javascript
   await analyze_volatility({symbol: "XRPUSDT", period: "1d"});
   ```

2. **Adjust grid count** based on volatility:
   ```javascript
   // High volatility (>10%)
   await suggest_grid_levels({symbol: "BTCUSDT", investment: 1000, gridCount: 12});
   
   // Low volatility (<5%)
   await suggest_grid_levels({symbol: "STABLECOIN", investment: 1000, gridCount: 6});
   ```

3. **Use Support/Resistance for bounds:**
   ```javascript
   const sr = await identify_support_resistance({symbol: "XRPUSDT"});
   // Use sr.configuracion_grid for better bounds
   ```

---

## 🔍 Debugging Tools

### **Enable Debug Mode**
```bash
# Set environment variable for detailed logging
DEBUG=true node build/index.js
```

### **Manual API Testing**
```bash
# Test direct API call
curl "https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT"
```

### **TypeScript Compilation Check**
```bash
# Check for compilation errors
npx tsc --noEmit
```

### **Validate Tool Schemas**
```javascript
// Test tool registration
const tools = await listTools();
console.log(tools.tools.map(t => t.name));
```

---

## 📊 Performance Issues

### **🐌 Problem: "Slow response times"
**Causes & Solutions:**

1. **Large dataset requests:**
   ```javascript
   // ❌ Too much data
   await get_klines({symbol: "BTCUSDT", limit: 1000});
   
   // ✅ Reasonable amount
   await get_klines({symbol: "BTCUSDT", limit: 100});
   ```

2. **High-frequency calls:**
   ```javascript
   // ❌ Rapid fire requests
   for (const symbol of symbols) {
     await get_ticker({symbol});
   }
   
   // ✅ Add delays
   for (const symbol of symbols) {
     await get_ticker({symbol});
     await new Promise(resolve => setTimeout(resolve, 200));
   }
   ```

3. **Complex analysis on small timeframes:**
   ```javascript
   // ❌ Heavy analysis on 1-minute data
   await identify_support_resistance({
     symbol: "BTCUSDT",
     interval: "1",
     periods: 500
   });
   
   // ✅ Use appropriate timeframe
   await identify_support_resistance({
     symbol: "BTCUSDT",
     interval: "60",
     periods: 100
   });
   ```

---

## 🔧 Environment Issues

### **Node.js Version Compatibility**
**Requirements:**
- Node.js >= 16.0.0
- NPM >= 8.0.0

**Check versions:**
```bash
node --version
npm --version
```

### **Windows Path Issues**
**Problem:** Path separators in Claude Desktop config

**Solution:**
```json
{
  "mcpServers": {
    "bybit-mcp": {
      "command": "node",
      "args": ["D:\\projects\\mcp\\bybit-mcp\\build\\index.js"],
      // Note: Use double backslashes on Windows
    }
  }
}
```

### **Missing Dependencies**
```bash
# Reinstall all dependencies
npm install

# Check for vulnerabilities
npm audit

# Fix if needed
npm audit fix
```

---

## 🚨 Emergency Procedures

### **Complete Reset**
```bash
# 1. Stop Claude Desktop
# 2. Clean build
rm -rf build/
npm run clean

# 3. Reinstall dependencies
rm -rf node_modules/
npm install

# 4. Rebuild
npm run build

# 5. Test manually
node build/index.js

# 6. Restart Claude Desktop
```

### **Backup Strategy**
```bash
# Before major changes, backup working version
cp -r build/ build-backup-$(date +%Y%m%d)/
```

### **Version Rollback**
If new version has issues:
1. Check `claude/logs/` for previous working version
2. Restore from backup: `cp -r build-backup-YYYYMMDD/ build/`
3. Update version in `src/index.ts` if needed
4. Restart Claude Desktop

---

## 📝 Reporting Issues

### **Information to Include**
1. **Error message** (exact text)
2. **Tool being used** and parameters
3. **System info** (OS, Node version)
4. **MCP version** (check `src/index.ts`)
5. **Steps to reproduce**

### **Create Bug Report**
```bash
# Use template in claude/bugs/
cp claude/bugs/bug-001-sr-classification.md claude/bugs/bug-XXX-new-issue.md
# Edit with your issue details
```

### **Check Known Issues**
1. Review `claude/bugs/` directory
2. Check `claude/master-log.md` recent changes
3. Look in `claude/logs/` for similar problems

---

*Troubleshooting guide maintained as part of the project documentation*
*Last updated: 08/06/2025 | Version: v1.2.1*