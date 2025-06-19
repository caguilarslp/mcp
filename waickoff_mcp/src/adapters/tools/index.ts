/**
 * @fileoverview Tool Registry - Central Tool Management
 * @description Central registry for all MCP tools with O(1) lookup and validation
 * @version 1.6.3
 */

import { ToolDefinition } from '../types/mcp.types.js';

// Import all tool categories
import { marketDataTools } from './marketDataTools.js';
import { analysisTools } from './analysisTools.js';
import { gridTradingTools } from './gridTradingTools.js';
import { systemTools } from './systemTools.js';
import { cacheTools } from './cacheTools.js';
import { repositoryTools } from './repositoryTools.js';
import { reportTools } from './reportTools.js';
import { configTools } from './configTools.js';
import { envConfigTools } from './envConfigTools.js';
import { historicalTools } from './historicalTools.js';
import { hybridStorageTools } from './hybridStorageTools.js';
import { trapDetectionTools } from './trapDetectionTools.js';
import { wyckoffBasicTools } from './wyckoffBasicTools.js';
import { wyckoffAdvancedTools } from './wyckoffAdvancedTools.js';
import { technicalAnalysisTools } from './technicalAnalysisTools.js';
import { smartMoneyConceptsTools } from './smartMoneyConceptsTools.js';
import { contextTools } from './contextTools.js';
import { hierarchicalContextTools } from './hierarchicalContextTools.js';
import { multiExchangeTools } from './multiExchangeTools.js';
import { advancedMultiExchangeTools } from './advancedMultiExchangeTools.js';

// Tool Registry Map for O(1) lookup
export const toolRegistry = new Map<string, ToolDefinition>();

// All tool categories organized by feature
const allToolCategories = [
  // Core Trading Functionality
  { name: 'Market Data', tools: marketDataTools },
  { name: 'Technical Analysis', tools: analysisTools },
  { name: 'Grid Trading', tools: gridTradingTools },
  
  // Multi-Exchange Features (TASK-026 FASE 2-4)
  { name: 'Multi-Exchange', tools: multiExchangeTools },
  { name: 'Advanced Multi-Exchange', tools: advancedMultiExchangeTools },
  
  // Advanced Analysis Features
  { name: 'Historical Analysis', tools: historicalTools },
  { name: 'Trap Detection', tools: trapDetectionTools },
  { name: 'Smart Money Concepts', tools: smartMoneyConceptsTools },
  { name: 'Wyckoff Basic Analysis', tools: wyckoffBasicTools },
  { name: 'Wyckoff Advanced Analysis', tools: wyckoffAdvancedTools },
  { name: 'Technical Analysis Suite', tools: technicalAnalysisTools },
  { name: 'Context Management', tools: contextTools },
  { name: 'Hierarchical Context Management', tools: hierarchicalContextTools },
  
  // Data Management
  { name: 'Analysis Repository', tools: repositoryTools },
  { name: 'Report Generation', tools: reportTools },
  { name: 'Cache Management', tools: cacheTools },
  { name: 'Hybrid Storage', tools: hybridStorageTools },
  
  // System Configuration
  { name: 'User Configuration', tools: configTools },
  { name: 'Environment Configuration', tools: envConfigTools },
  { name: 'System Tools', tools: systemTools },
];

// Populate registry with validation
let totalTools = 0;
const duplicateTools: string[] = [];

allToolCategories.forEach(category => {
  if (Array.isArray(category.tools)) {
    category.tools.forEach(tool => {
      if (toolRegistry.has(tool.name)) {
        duplicateTools.push(tool.name);
      } else {
        toolRegistry.set(tool.name, tool as ToolDefinition);
        totalTools++;
      }
    });
  }
});

// Validation results
if (duplicateTools.length > 0) {
  throw new Error(`Duplicate tool names detected: ${duplicateTools.join(', ')}`);
}

console.log(`✅ Tool Registry initialized: ${totalTools} tools across ${allToolCategories.length} categories`);

// Export functions for external use
export const getAllTools = (): ToolDefinition[] => 
  Array.from(toolRegistry.values());

export const getTool = (name: string): ToolDefinition | undefined => 
  toolRegistry.get(name);

export const hasTool = (name: string): boolean => 
  toolRegistry.has(name);

export const getToolCount = (): number => toolRegistry.size;

export const getToolsByCategory = (categoryName: string): ToolDefinition[] => {
  const category = allToolCategories.find(cat => cat.name === categoryName);
  return category && Array.isArray(category.tools) ? category.tools as ToolDefinition[] : [];
};

export const getAllCategories = () => allToolCategories.map(cat => ({
  name: cat.name,
  count: cat.tools.length,
  tools: cat.tools.map(tool => tool.name)
}));

// Registry statistics
export const getRegistryStats = () => ({
  totalTools,
  totalCategories: allToolCategories.length,
  categories: getAllCategories(),
  duplicatesFound: duplicateTools.length,
  registrySize: toolRegistry.size
});
