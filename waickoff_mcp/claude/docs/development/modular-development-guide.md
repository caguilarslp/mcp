# Modular Development Guide - MCP System v1.6.3

## 🎯 Overview
This guide provides step-by-step instructions for developing with the new modular MCP architecture. After TASK-018, the system is designed for rapid, safe development without corruption risks.

## 🚀 Quick Start

### **Adding a New Tool (2-minute process)**

#### **Step 1: Choose Category**
Identify the appropriate category for your tool:

| Category | Use For |
|----------|---------|
| `marketDataTools.ts` | Market data access (ticker, orderbook, klines) |
| `analysisTools.ts` | Technical analysis (indicators, patterns) |
| `trapDetectionTools.ts` | Market manipulation detection |
| `historicalTools.ts` | Historical data analysis |
| `repositoryTools.ts` | Data storage and retrieval |
| `reportTools.ts` | Report generation |
| `configTools.ts` | User configuration |
| `envConfigTools.ts` | System configuration |
| `systemTools.ts` | System health and debugging |
| `cacheTools.ts` | Cache management |
| `gridTradingTools.ts` | Trading strategies |
| `hybridStorageTools.ts` | Storage evaluation |

#### **Step 2: Add Tool Definition**
Add your tool to the appropriate file:

```typescript
// Example: Adding to analysisTools.ts
export const analysisTools: ToolDefinition[] = [
  // ... existing tools
  {
    name: 'analyze_momentum',
    description: 'Analyze price momentum using multiple indicators',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
        },
        period: {
          type: 'string',
          description: 'Analysis period',
          enum: ['1h', '4h', '1d'],
          default: '1d',
        },
        includeRSI: {
          type: 'boolean',
          description: 'Include RSI in analysis',
          default: true,
        },
      },
      required: ['symbol'],
    },
  },
];
```

#### **Step 3: Implement Handler**
Add the handler method to `MCPHandlers`:

```typescript
// In src/adapters/mcp-handlers.ts
export class MCPHandlers {
  // ... existing methods
  
  async handleAnalyzeMomentum(args: any): Promise<MCPServerResponse> {
    try {
      const { symbol, period = '1d', includeRSI = true } = args;
      
      // Validate inputs
      if (!symbol) {
        throw new Error('Symbol is required');
      }
      
      // Call engine method
      const result = await this.engine.analyzeMomentum(symbol, period, includeRSI);
      
      return this.formatSuccessResponse(result);
    } catch (error) {
      return this.formatErrorResponse('analyze_momentum', error as Error);
    }
  }
}
```

#### **Step 4: Register Handler**
Add the mapping in `HandlerRegistry`:

```typescript
// In src/adapters/router/handlerRegistry.ts
private registerAllHandlers(): void {
  // ... existing registrations
  
  // Analysis Tools
  this.register('analyze_momentum', (args) => this.mcpHandlers.handleAnalyzeMomentum(args));
}
```

#### **Step 5: Implement Engine Method**
Add the business logic to the engine:

```typescript
// In src/core/engine.ts
export class MarketAnalysisEngine {
  // ... existing methods
  
  async analyzeMomentum(symbol: string, period: string, includeRSI: boolean) {
    // Implementation logic here
    const marketData = await this.marketDataService.getKlines(symbol, period, 50);
    
    // Calculate momentum indicators
    const momentum = this.calculateMomentum(marketData);
    const rsi = includeRSI ? this.calculateRSI(marketData) : null;
    
    return {
      symbol,
      period,
      momentum,
      rsi,
      timestamp: new Date().toISOString(),
      analysis: this.interpretMomentum(momentum, rsi)
    };
  }
}
```

#### **Step 6: Test**
The system automatically validates:
- ✅ Tool is registered in registry
- ✅ Handler is mapped correctly
- ✅ No duplicate tool names
- ✅ TypeScript validation passes

## 📁 Creating New Tool Categories

### **When to Create New Category**
Create a new category when:
- You have 3+ related tools
- The functionality is distinct from existing categories
- The tools share common patterns or schemas

### **Step-by-Step Process**

#### **1. Create Tool File**
```typescript
// src/adapters/tools/newCategoryTools.ts
import { ToolDefinition } from '../types/mcp.types.js';

export const newCategoryTools: ToolDefinition[] = [
  {
    name: 'first_tool',
    description: 'Description of first tool',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair',
        },
      },
      required: ['symbol'],
    },
  },
  // ... more tools
];
```

#### **2. Update Tool Registry**
```typescript
// In src/adapters/tools/index.ts
import { newCategoryTools } from './newCategoryTools.js';

const allToolCategories = [
  // ... existing categories
  { name: 'New Category', tools: newCategoryTools },
];
```

#### **3. Create Handler Methods**
```typescript
// In src/adapters/mcp-handlers.ts
async handleFirstTool(args: any): Promise<MCPServerResponse> {
  // Implementation
}
```

#### **4. Register Handlers**
```typescript
// In src/adapters/router/handlerRegistry.ts
// New Category Tools
this.register('first_tool', (args) => this.mcpHandlers.handleFirstTool(args));
```

## 🛠️ Development Best Practices

### **Tool Definition Guidelines**

#### **Naming Conventions**
- **Tool names**: Use `action_target` format (snake_case)
  - ✅ `analyze_volatility`
  - ✅ `get_market_data`
  - ❌ `analyzeVolatility`
  - ❌ `getMarketData`

- **Handler methods**: Use `handleActionTarget` format (camelCase)
  - ✅ `handleAnalyzeVolatility`
  - ✅ `handleGetMarketData`

#### **Schema Best Practices**
```typescript
{
  name: 'tool_name',
  description: 'Clear, concise description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Required parameters first
      symbol: {
        type: 'string',
        description: 'Trading pair (e.g., BTCUSDT, ETHUSDT)',
      },
      // Optional parameters with defaults
      period: {
        type: 'string',
        description: 'Analysis period',
        enum: ['1h', '4h', '1d', '1w'],
        default: '1d',
      },
      // Boolean flags
      includeVolume: {
        type: 'boolean',
        description: 'Include volume analysis',
        default: true,
      },
    },
    required: ['symbol'], // Always specify required fields
  },
}
```

### **Handler Implementation Guidelines**

#### **Standard Handler Pattern**
```typescript
async handleToolName(args: any): Promise<MCPServerResponse> {
  try {
    // 1. Destructure and validate inputs
    const { symbol, period = '1d', includeVolume = true } = args;
    
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    
    // 2. Call appropriate engine method
    const result = await this.engine.methodName(symbol, period, includeVolume);
    
    // 3. Return formatted success response
    return this.formatSuccessResponse(result);
  } catch (error) {
    // 4. Return formatted error response
    return this.formatErrorResponse('tool_name', error as Error);
  }
}
```

#### **Error Handling Best Practices**
```typescript
// Specific error messages
if (!symbol) {
  throw new Error('Symbol parameter is required');
}

if (!['1h', '4h', '1d', '1w'].includes(period)) {
  throw new Error(`Invalid period: ${period}. Must be one of: 1h, 4h, 1d, 1w`);
}

// Validate symbol format
if (!/^[A-Z]{2,10}USDT?$/.test(symbol)) {
  throw new Error(`Invalid symbol format: ${symbol}. Expected format: BTCUSDT`);
}
```

### **Performance Considerations**

#### **Efficient Tool Organization**
- Keep related tools in the same category
- Avoid deeply nested parameter structures
- Use enums for limited option sets
- Provide sensible defaults

#### **Handler Performance**
```typescript
// ✅ Good: Efficient parameter destructuring
const { symbol, period = '1d', limit = 100 } = args;

// ❌ Avoid: Multiple property access
const symbol = args.symbol;
const period = args.period || '1d';
const limit = args.limit || 100;

// ✅ Good: Early validation
if (!symbol) {
  throw new Error('Symbol is required');
}

// ✅ Good: Single engine call
const result = await this.engine.comprehensiveAnalysis(symbol, { period, limit });

// ❌ Avoid: Multiple engine calls
const ticker = await this.engine.getTicker(symbol);
const volume = await this.engine.getVolume(symbol);
const analysis = await this.engine.analyze(ticker, volume);
```

## 🧪 Testing Your Changes

### **Automatic Validation**
The system automatically validates:

```bash
# Start the system - validation happens at startup
npm run build
npm start

# Look for validation messages:
# ✅ Tool Registry initialized: 73 tools across 12 categories
# ✅ Handler Registry validated: 73 handlers registered
# ✅ All tools have corresponding handlers
```

### **Manual Testing**
```bash
# Test specific tool in Claude Desktop
# 1. Add tool using steps above
# 2. Restart Claude Desktop
# 3. Test with: "Use analyze_momentum tool for BTCUSDT"
```

### **Common Issues & Solutions**

#### **"Duplicate tool name" Error**
```
Error: Duplicate tool name: analyze_momentum
```
**Solution**: Check all tool files for duplicate names

#### **"No handler registered" Error**
```
No handler registered for tool: analyze_momentum
```
**Solution**: Add handler mapping in HandlerRegistry

#### **"Tool/Handler count mismatch" Warning**
```
⚠️ Tool/Handler count mismatch: 73 tools vs 72 handlers
```
**Solution**: Ensure every tool has a corresponding handler

## 📊 Monitoring & Debugging

### **Built-in Diagnostics**
```typescript
// Get system statistics
const stats = mcpAdapter.getSystemStats();
console.log(stats);

// Output:
// {
//   version: '1.6.3',
//   architecture: 'Modular',
//   registryStats: {
//     totalTools: 73,
//     totalCategories: 12,
//     categories: [...]
//   },
//   routingValidation: {
//     valid: true,
//     issues: []
//   }
// }
```

### **Performance Monitoring**
The system automatically tracks:
- Tool execution time
- Error rates per tool
- Usage patterns
- Memory usage

### **Debug Logging**
```typescript
// Enable debug logging in development
const logger = new FileLogger('Development');
logger.setLevel('debug');

// Logs show:
// [INFO] Tool analyze_momentum executed in 45ms
// [DEBUG] Handler registry validation: 73/73 tools mapped
// [ERROR] Tool execution failed for invalid_tool: Unknown tool
```

## 🔧 Advanced Development

### **Custom Validation**
```typescript
// Add custom validation to tools
export const customTools: ToolDefinition[] = [
  {
    name: 'advanced_analysis',
    description: 'Advanced analysis with custom validation',
    inputSchema: {
      type: 'object',
      properties: {
        symbols: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 10,
          description: 'List of trading pairs (max 10)',
        },
        risk_level: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Risk level (1-10)',
        },
      },
      required: ['symbols', 'risk_level'],
    },
  },
];
```

### **Complex Parameter Structures**
```typescript
{
  name: 'complex_analysis',
  description: 'Analysis with complex parameters',
  inputSchema: {
    type: 'object',
    properties: {
      config: {
        type: 'object',
        properties: {
          timeframes: {
            type: 'array',
            items: { type: 'string' },
            default: ['1h', '4h', '1d'],
          },
          indicators: {
            type: 'object',
            properties: {
              rsi: { type: 'boolean', default: true },
              macd: { type: 'boolean', default: true },
              bollinger: { type: 'boolean', default: false },
            },
          },
        },
      },
    },
    required: ['config'],
  },
}
```

## 📚 Resources

### **Example Tools**
- Simple: `marketDataTools.ts` - Basic parameter patterns
- Medium: `analysisTools.ts` - Multiple options and defaults  
- Complex: `trapDetectionTools.ts` - Advanced schemas and validation

### **Reference Files**
- **Types**: `src/adapters/types/mcp.types.ts`
- **Registry**: `src/adapters/tools/index.ts`
- **Router**: `src/adapters/router/toolRouter.ts`
- **Handlers**: `src/adapters/mcp-handlers.ts`

### **Documentation**
- **Architecture**: `claude/docs/architecture/modular-mcp-system.md`
- **API Reference**: `claude/docs/api/modular-tools-reference.md`
- **Troubleshooting**: `claude/docs/troubleshooting/modular-system-issues.md`

---

**Remember**: The modular system is designed for safety and speed. You can't break the system by adding tools incorrectly - the validation system will catch issues immediately and provide clear error messages.

**Development Time**: Adding a new tool should take 2-5 minutes once you're familiar with the pattern. The system is optimized for rapid development without corruption risks.
