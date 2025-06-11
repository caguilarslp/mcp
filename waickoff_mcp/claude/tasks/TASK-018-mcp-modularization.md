# TASK-018: Modularización Completa de MCP Adapter

## 📋 Información General
- **ID**: TASK-018
- **Título**: Modularización Completa de MCP Adapter
- **Prioridad**: CRÍTICA
- **Tiempo Estimado**: 4-6 horas
- **Dependencias**: Ninguna (puede ejecutarse inmediatamente)
- **Impacto**: Elimina el problema recurrente de corrupción en mcp.ts

## 🎯 Objetivo
Refactorizar el archivo monolítico `mcp.ts` (~1700 líneas) en una arquitectura modular que sea mantenible, testeable y resistente a corrupción.

## 🚨 Problema Actual
1. **Archivo monolítico** - `mcp.ts` contiene todo: definiciones, routing, inicialización
2. **Corrupción frecuente** - Cada nueva herramienta puede romper el JSON
3. **Difícil mantenimiento** - 62+ herramientas en un solo archivo
4. **Cuello de botella** - Bloquea el desarrollo en cada tarea

## 🏗️ Arquitectura Propuesta

```
src/adapters/
├── mcp.ts                    # Solo inicialización (~100 líneas)
├── tools/                    # Definiciones de herramientas
│   ├── index.ts             # Registry central y exports
│   ├── marketDataTools.ts   # 3 tools: ticker, orderbook, market_data
│   ├── analysisTools.ts     # 7 tools: volatility, volume, etc.
│   ├── trapDetectionTools.ts # 7 tools: bull_trap, bear_trap, etc.
│   ├── gridTradingTools.ts  # 1 tool: suggest_grid_levels
│   ├── historicalTools.ts   # 6 tools: historical analysis
│   ├── cacheTools.ts        # 3 tools: cache management
│   ├── repositoryTools.ts   # 7 tools: analysis repository
│   ├── reportTools.ts       # 8 tools: report generation
│   ├── configTools.ts       # 7 tools: user configuration
│   ├── systemTools.ts       # 4 tools: system health, debug
│   └── envConfigTools.ts    # 9 tools: environment configuration
└── router/
    ├── toolRouter.ts        # Router dinámico
    └── handlerRegistry.ts   # Registro de handlers

```

## 📝 Implementación Detallada

### 1. Tool Definitions (ejemplo: `tools/trapDetectionTools.ts`)

```typescript
import { ToolDefinition } from '../types/mcp.types.js';

export const trapDetectionTools: ToolDefinition[] = [
  {
    name: 'detect_bull_trap',
    description: 'Detect bull trap (false breakout above resistance)',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
        },
        sensitivity: {
          type: 'string',
          description: 'Detection sensitivity',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'detect_bear_trap',
    description: 'Detect bear trap (false breakdown below support)',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair (e.g., BTCUSDT)',
        },
        sensitivity: {
          type: 'string',
          description: 'Detection sensitivity',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
      },
      required: ['symbol'],
    },
  },
  // ... más herramientas
];
```

### 2. Tool Registry (`tools/index.ts`)

```typescript
import { ToolDefinition } from '../types/mcp.types.js';
import { marketDataTools } from './marketDataTools.js';
import { analysisTools } from './analysisTools.js';
import { trapDetectionTools } from './trapDetectionTools.js';
import { gridTradingTools } from './gridTradingTools.js';
import { historicalTools } from './historicalTools.js';
import { cacheTools } from './cacheTools.js';
import { repositoryTools } from './repositoryTools.js';
import { reportTools } from './reportTools.js';
import { configTools } from './configTools.js';
import { systemTools } from './systemTools.js';
import { envConfigTools } from './envConfigTools.js';

// Tool Registry Map for O(1) lookup
export const toolRegistry = new Map<string, ToolDefinition>();

// Register all tools
const allToolCategories = [
  marketDataTools,
  analysisTools,
  trapDetectionTools,
  gridTradingTools,
  historicalTools,
  cacheTools,
  repositoryTools,
  reportTools,
  configTools,
  systemTools,
  envConfigTools,
];

// Populate registry
allToolCategories.forEach(category => {
  category.forEach(tool => {
    if (toolRegistry.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    toolRegistry.set(tool.name, tool);
  });
});

// Export functions
export const getAllTools = (): ToolDefinition[] => 
  Array.from(toolRegistry.values());

export const getTool = (name: string): ToolDefinition | undefined => 
  toolRegistry.get(name);

export const hasT ool = (name: string): boolean => 
  toolRegistry.has(name);
```

### 3. Handler Registry (`router/handlerRegistry.ts`)

```typescript
import { MCPHandlers } from '../mcp-handlers.js';
import { MCPServerResponse } from '../../types/index.js';

type ToolHandler = (args: any) => Promise<MCPServerResponse>;

export class HandlerRegistry {
  private handlers = new Map<string, ToolHandler>();

  constructor(private mcpHandlers: MCPHandlers) {
    this.registerAllHandlers();
  }

  private registerAllHandlers(): void {
    // Market Data
    this.register('get_ticker', (args) => this.mcpHandlers.handleGetTicker(args));
    this.register('get_orderbook', (args) => this.mcpHandlers.handleGetOrderbook(args));
    this.register('get_market_data', (args) => this.mcpHandlers.handleGetMarketData(args));

    // Analysis
    this.register('analyze_volatility', (args) => this.mcpHandlers.handleAnalyzeVolatility(args));
    this.register('analyze_volume', (args) => this.mcpHandlers.handleAnalyzeVolume(args));
    this.register('analyze_volume_delta', (args) => this.mcpHandlers.handleAnalyzeVolumeDelta(args));
    this.register('identify_support_resistance', (args) => this.mcpHandlers.handleIdentifySupportResistance(args));
    this.register('suggest_grid_levels', (args) => this.mcpHandlers.handleSuggestGridLevels(args));
    this.register('perform_technical_analysis', (args) => this.mcpHandlers.handlePerformTechnicalAnalysis(args));
    this.register('get_complete_analysis', (args) => this.mcpHandlers.handleGetCompleteAnalysis(args));

    // Trap Detection
    this.register('detect_bull_trap', (args) => this.mcpHandlers.handleDetectBullTrap(args));
    this.register('detect_bear_trap', (args) => this.mcpHandlers.handleDetectBearTrap(args));
    this.register('get_trap_history', (args) => this.mcpHandlers.handleGetTrapHistory(args));
    this.register('get_trap_statistics', (args) => this.mcpHandlers.handleGetTrapStatistics(args));
    this.register('configure_trap_detection', (args) => this.mcpHandlers.handleConfigureTrapDetection(args));
    this.register('validate_breakout', (args) => this.mcpHandlers.handleValidateBreakout(args));
    this.register('get_trap_performance', (args) => this.mcpHandlers.handleGetTrapPerformance(args));

    // ... registro de todos los demás handlers
  }

  private register(name: string, handler: ToolHandler): void {
    if (this.handlers.has(name)) {
      throw new Error(`Handler already registered: ${name}`);
    }
    this.handlers.set(name, handler);
  }

  getHandler(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }
}
```

### 4. Tool Router (`router/toolRouter.ts`)

```typescript
import { MCPServerResponse } from '../../types/index.js';
import { HandlerRegistry } from './handlerRegistry.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class ToolRouter {
  private logger: FileLogger;

  constructor(private handlerRegistry: HandlerRegistry) {
    this.logger = new FileLogger('ToolRouter');
  }

  async route(toolName: string, args: any): Promise<MCPServerResponse> {
    this.logger.info(`Routing tool: ${toolName}`);

    const handler = this.handlerRegistry.getHandler(toolName);
    
    if (!handler) {
      this.logger.error(`Unknown tool: ${toolName}`);
      return this.createErrorResponse(toolName, new Error(`Unknown tool: ${toolName}`));
    }

    try {
      return await handler(args);
    } catch (error) {
      this.logger.error(`Tool execution failed for ${toolName}:`, error);
      return this.createErrorResponse(toolName, error as Error);
    }
  }

  private createErrorResponse(toolName: string, error: Error): MCPServerResponse {
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error.message}`
      }]
    };
  }
}
```

### 5. Nuevo MCP Adapter (`mcp.ts` - simplificado)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { MarketAnalysisEngine } from '../core/engine.js';
import { MCPHandlers } from './mcp-handlers.js';
import { FileLogger } from '../utils/fileLogger.js';
import { getAllTools } from './tools/index.js';
import { HandlerRegistry } from './router/handlerRegistry.js';
import { ToolRouter } from './router/toolRouter.js';

export class MCPAdapter {
  private server: Server;
  private engine: MarketAnalysisEngine;
  private logger: FileLogger;
  private handlers: MCPHandlers;
  private router: ToolRouter;

  constructor(engine: MarketAnalysisEngine) {
    this.engine = engine;
    this.logger = new FileLogger('MCPAdapter');
    
    // Initialize handlers and router
    this.handlers = new MCPHandlers(engine);
    const handlerRegistry = new HandlerRegistry(this.handlers);
    this.router = new ToolRouter(handlerRegistry);
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'waickoff_mcp',
        version: '1.6.3',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info('MCP Adapter initialized with modular architecture v1.6.3');
  }

  private setupHandlers() {
    // List available tools - now dynamic!
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: getAllTools()
      };
    });

    // Handle tool execution - now uses router!
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.router.route(name, args);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('MCP Adapter running with modular architecture v1.6.3');
  }
}
```

### 6. Tipos TypeScript (`types/mcp.types.ts`)

```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCategory {
  name: string;
  description: string;
  tools: ToolDefinition[];
}
```

## 🔄 Plan de Migración

### Fase 1: Preparación (30 min)
1. Crear estructura de directorios
2. Crear tipos TypeScript
3. Crear archivos base vacíos

### Fase 2: Extracción de Tools (2h)
1. Copiar definiciones de tools desde `mcp.ts` a archivos individuales
2. Agrupar por categoría lógica
3. Validar formato JSON de cada tool

### Fase 3: Implementación de Registry y Router (1h)
1. Implementar `tools/index.ts` con registry
2. Implementar `HandlerRegistry` con todos los mappings
3. Implementar `ToolRouter` con lógica de routing

### Fase 4: Refactorización de mcp.ts (1h)
1. Eliminar todas las definiciones de tools
2. Eliminar switch gigante
3. Dejar solo lógica de inicialización
4. Integrar con nuevo sistema modular

### Fase 5: Testing y Validación (1h)
1. Compilar y verificar tipos
2. Probar cada categoría de tools
3. Verificar que no hay tools duplicados
4. Validar en Claude Desktop

## ✅ Criterios de Éxito
1. `mcp.ts` reducido a ~100 líneas
2. Cada categoría de tools en su propio archivo
3. Sin switch gigante - routing dinámico
4. Compilación exitosa sin errores
5. Todas las 62+ herramientas funcionando
6. Fácil agregar nuevas herramientas sin tocar `mcp.ts`

## 🎯 Beneficios Esperados
1. **Eliminación de corrupción** - Archivos pequeños y manejables
2. **Desarrollo más rápido** - Agregar tools sin miedo
3. **Mejor para Claude** - Puede trabajar con archivos específicos
4. **Testabilidad** - Cada módulo se puede probar independiente
5. **Mantenibilidad** - Estructura clara y organizada
6. **Type Safety** - Mejor validación de TypeScript

## 📊 Métricas de Éxito
- Reducción de tamaño: 1700 líneas → ~100 líneas en mcp.ts
- Archivos creados: ~15 archivos modulares
- Tiempo de agregar nueva herramienta: 10 min → 2 min
- Errores de compilación por corrupción: Frecuentes → Cero

## 🚨 Riesgos y Mitigación
1. **Riesgo**: Romper funcionalidad existente
   - **Mitigación**: Hacer backup de mcp.ts actual, testing exhaustivo

2. **Riesgo**: Olvidar registrar algún handler
   - **Mitigación**: Validación automática al inicio que compare tools vs handlers

3. **Riesgo**: Imports circulares
   - **Mitigación**: Estructura clara de dependencias, tipos en archivo separado

## 📝 Notas Adicionales
- Mantener 100% backward compatibility
- No cambiar nombres de herramientas
- Preservar todos los schemas exactamente igual
- Documentar proceso para futuras adiciones
