# Modular System Troubleshooting Guide

## 🎯 Overview
This guide helps diagnose and resolve issues with the modular MCP system implemented in TASK-018. The new architecture is designed to be self-validating and provide clear error messages.

## 🚨 Common Issues & Solutions

### **1. Tool Registration Issues**

#### **"Duplicate tool name" Error**
```
Error: Duplicate tool name: analyze_volatility
```

**Cause**: Two or more tool files define the same tool name.

**Solution**:
1. Search for the duplicate tool name across all tool files:
   ```bash
   grep -r "analyze_volatility" src/adapters/tools/
   ```
2. Rename one of the duplicate tools
3. Update corresponding handler method and registration

#### **"Tool Registry initialization failed" Error**
```
Failed to initialize tool registry: [specific error]
```

**Cause**: Syntax error or import issue in tool files.

**Solution**:
1. Check TypeScript compilation errors:
   ```bash
   npm run build
   ```
2. Verify all imports are correct
3. Check for malformed tool definitions

### **2. Handler Registration Issues**

#### **"No handler registered for tool" Error**
```
No handler registered for tool: new_analysis_tool
```

**Cause**: Tool is defined but handler is not registered in HandlerRegistry.

**Solution**:
1. Add handler method to `MCPHandlers`:
   ```typescript
   async handleNewAnalysisTool(args: any): Promise<MCPServerResponse> {
     // Implementation
   }
   ```
2. Register in `HandlerRegistry`:
   ```typescript
   this.register('new_analysis_tool', (args) => this.mcpHandlers.handleNewAnalysisTool(args));
   ```

#### **"Tool/Handler count mismatch" Warning**
```
⚠️ Tool/Handler count mismatch: 73 tools vs 72 handlers
```

**Cause**: Number of tools doesn't match number of registered handlers.

**Solution**:
1. Run system diagnostics:
   ```typescript
   const stats = mcpAdapter.getSystemStats();
   console.log(stats.routingValidation);
   ```
2. Check for missing handler registrations
3. Verify all tools have corresponding handlers

### **3. TypeScript Compilation Issues**

#### **Import/Export Errors**
```
Cannot find module './newCategoryTools.js'
```

**Solution**:
1. Verify file exists and is properly named
2. Check import path uses `.js` extension for ES modules
3. Ensure file is properly exported:
   ```typescript
   export const newCategoryTools: ToolDefinition[] = [...];
   ```

#### **Type Definition Errors**
```
Type 'X' is not assignable to type 'ToolDefinition'
```

**Solution**:
1. Check tool definition structure matches interface
2. Verify all required properties are present
3. Check property types match expected types

### **4. Runtime Errors**

#### **"Unknown tool" Error**
```
Error executing unknown_tool: Unknown tool: unknown_tool
```

**Cause**: Tool name doesn't exist in registry.

**Solution**:
1. Verify tool is defined in appropriate tool file
2. Check tool name spelling in request
3. Verify tool file is imported in registry

#### **Handler Execution Errors**
```
Tool execution failed for analyze_data: [specific error]
```

**Solution**:
1. Check handler implementation for bugs
2. Verify input validation logic
3. Check engine method implementation
4. Review error logs for specific details

## 🔍 Diagnostic Tools

### **System Health Check**
```typescript
// Get comprehensive system statistics
const stats = mcpAdapter.getSystemStats();
console.log(JSON.stringify(stats, null, 2));

// Expected output structure:
{
  "version": "1.6.3",
  "architecture": "Modular",
  "registryStats": {
    "totalTools": 72,
    "totalCategories": 12,
    "categories": [...]
  },
  "routingValidation": {
    "valid": true,
    "issues": []
  }
}
```

### **Tool Registry Diagnostics**
```typescript
import { getRegistryStats, getAllTools, hasTool } from './src/adapters/tools/index.js';

// Check registry statistics
console.log(getRegistryStats());

// Check if specific tool exists
console.log(hasTool('analyze_volatility')); // true/false

// Get all tools
console.log(getAllTools().map(t => t.name));
```

### **Handler Registry Diagnostics**
```typescript
// In development, add diagnostic method to HandlerRegistry
getHandlerDiagnostics() {
  return {
    totalHandlers: this.handlers.size,
    handlerNames: Array.from(this.handlers.keys()).sort(),
    missingHandlers: this.findMissingHandlers()
  };
}
```

## 🐛 Debugging Workflow

### **Step 1: Verify Compilation**
```bash
# Clean build
npm run clean
npm run build

# Look for compilation errors
# No errors = system structure is valid
```

### **Step 2: Check System Initialization**
```bash
# Start system and check logs
npm start

# Look for initialization messages:
# ✅ Tool Registry initialized: X tools across Y categories
# ✅ Handler Registry validated: X handlers registered
# ✅ All tools have corresponding handlers
```

### **Step 3: Test Specific Tools**
```bash
# Use Claude Desktop to test specific tools
# Example: "Use the get_ticker tool for BTCUSDT"
# Check for proper execution or error messages
```

### **Step 4: Enable Debug Logging**
```typescript
// Temporarily enable debug logging
const logger = new FileLogger('Debug');
logger.setLevel('debug');

// Check logs for detailed execution flow
```

## 🛠️ Fix Implementation Patterns

### **Adding Missing Handler**
```typescript
// 1. Add method to MCPHandlers
async handleNewTool(args: any): Promise<MCPServerResponse> {
  try {
    const { symbol, ...options } = args;
    
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    
    const result = await this.engine.newToolMethod(symbol, options);
    return this.formatSuccessResponse(result);
  } catch (error) {
    return this.formatErrorResponse('new_tool', error as Error);
  }
}

// 2. Register in HandlerRegistry
this.register('new_tool', (args) => this.mcpHandlers.handleNewTool(args));
```

### **Fixing Tool Definition**
```typescript
// Ensure proper structure
{
  name: 'valid_tool_name',           // snake_case, unique
  description: 'Clear description',  // Helpful description
  inputSchema: {                     // Proper JSON schema
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Trading pair (e.g., BTCUSDT)',
      },
    },
    required: ['symbol'],            // Specify required fields
  },
}
```

### **Resolving Import Issues**
```typescript
// Ensure proper ES module imports
import { ToolDefinition } from '../types/mcp.types.js'; // Note .js extension
import { marketDataTools } from './marketDataTools.js';

// Ensure proper exports
export const newCategoryTools: ToolDefinition[] = [...];
```

## 📊 Performance Issues

### **Slow Tool Execution**
**Symptoms**: Tools take longer than expected to execute

**Diagnosis**:
```typescript
// Check tool execution times in logs
// [INFO] Tool analyze_volatility executed in 2500ms (slow)
```

**Solutions**:
1. Optimize engine method implementation
2. Add caching for expensive operations
3. Reduce data processing complexity
4. Use async operations efficiently

### **Memory Usage Issues**
**Symptoms**: High memory usage, potential memory leaks

**Diagnosis**:
```typescript
// Monitor memory usage
console.log(process.memoryUsage());
```

**Solutions**:
1. Check for memory leaks in handlers
2. Implement proper cleanup in long-running operations
3. Use streaming for large data sets
4. Optimize caching strategies

## 🔒 Security Considerations

### **Input Validation**
Always validate inputs in handlers:

```typescript
async handleTool(args: any): Promise<MCPServerResponse> {
  // Validate required parameters
  if (!args.symbol) {
    throw new Error('Symbol is required');
  }
  
  // Validate parameter format
  if (!/^[A-Z]+$/.test(args.symbol)) {
    throw new Error('Invalid symbol format');
  }
  
  // Validate parameter ranges
  if (args.limit && (args.limit < 1 || args.limit > 1000)) {
    throw new Error('Limit must be between 1 and 1000');
  }
}
```

### **Error Information Disclosure**
Avoid exposing sensitive information in error messages:

```typescript
// ❌ Bad: Exposes internal details
throw new Error(`Database connection failed: ${dbError.connectionString}`);

// ✅ Good: Generic error message
throw new Error('Data retrieval failed. Please try again.');
```

## 📈 Monitoring & Maintenance

### **Regular Health Checks**
```typescript
// Implement periodic health checks
setInterval(() => {
  const stats = mcpAdapter.getSystemStats();
  if (!stats.routingValidation.valid) {
    console.error('System validation failed:', stats.routingValidation.issues);
  }
}, 300000); // Every 5 minutes
```

### **Performance Monitoring**
```typescript
// Track performance metrics
const performanceMetrics = {
  toolExecutionTimes: new Map(),
  errorRates: new Map(),
  memoryUsage: []
};

// Log performance data
console.log('Performance Summary:', {
  averageExecutionTime: calculateAverage(performanceMetrics.toolExecutionTimes),
  errorRate: calculateErrorRate(performanceMetrics.errorRates),
  memoryTrend: analyzeMemoryTrend(performanceMetrics.memoryUsage)
});
```

## 🆘 Emergency Procedures

### **System Corruption Recovery**
If the system becomes corrupted:

1. **Stop the system**
2. **Restore from backup**:
   ```bash
   cp src/adapters/mcp.ts.backup src/adapters/mcp.ts
   ```
3. **Identify corrupted files**:
   ```bash
   npm run build
   # Check compilation errors
   ```
4. **Fix or restore individual files**
5. **Validate system integrity**:
   ```bash
   npm start
   # Check initialization logs
   ```

### **Rollback Procedure**
If new changes break the system:

1. **Identify problematic changes**
2. **Revert specific files**:
   ```bash
   git checkout HEAD~1 -- src/adapters/tools/problematicTool.ts
   ```
3. **Test system functionality**
4. **Document issues for future prevention**

## 📚 Additional Resources

### **Log Analysis**
- Check `logs/` directory for detailed execution logs
- Use log aggregation tools for pattern analysis
- Monitor error frequency and timing

### **Development Tools**
- Use TypeScript language server for real-time error detection
- Configure ESLint for code quality enforcement
- Use debugger breakpoints for complex handler logic

### **Community Resources**
- Internal documentation: `claude/docs/`
- Architecture decisions: `claude/decisions/adr-log.md`
- Bug reports: `claude/bugs/`
- Lessons learned: `claude/lessons-learned/`

## 🎯 Prevention Best Practices

### **Development Guidelines**
1. **Always compile before committing**
2. **Test new tools in isolation first**
3. **Follow naming conventions consistently**
4. **Validate inputs thoroughly**
5. **Use TypeScript strict mode**

### **Code Review Checklist**
- [ ] Tool name follows snake_case convention
- [ ] Tool description is clear and helpful
- [ ] Input schema is properly defined
- [ ] Handler method exists and is registered
- [ ] Error handling is comprehensive
- [ ] TypeScript compilation passes
- [ ] No duplicate tool names

### **Testing Strategy**
```typescript
// Basic tool testing pattern
const testTool = async (toolName: string, args: any) => {
  try {
    const result = await router.route(toolName, args);
    console.log(`✅ ${toolName} test passed`);
    return result;
  } catch (error) {
    console.error(`❌ ${toolName} test failed:`, error.message);
    throw error;
  }
};

// Test suite for new tools
const runToolTests = async () => {
  await testTool('get_ticker', { symbol: 'BTCUSDT' });
  await testTool('analyze_volatility', { symbol: 'ETHUSDT' });
  // ... more tests
};
```

---

**Quick Reference Commands:**
```bash
# System diagnostics
npm run build                    # Check compilation
npm start                        # Start with validation

# Debug tools
node -e "console.log(require('./build/adapters/tools/index.js').getRegistryStats())"

# Emergency recovery
cp src/adapters/mcp.ts.backup src/adapters/mcp.ts
```

**Remember**: The modular system is designed to be self-healing and provide clear error messages. Most issues can be resolved by following the error messages and using the diagnostic tools provided.
