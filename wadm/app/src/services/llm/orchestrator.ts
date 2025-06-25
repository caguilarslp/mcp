import type { 
  LLMProvider, 
  LLMProviderType, 
  ToolPlan, 
  ToolResults,
  ChatMessage
} from '../../types/llm';
import { apiService } from '../api';
import { llmProviderFactory } from './providers';

export interface OrchestrationContext {
  userProfile?: any;
  sessionHistory?: ChatMessage[];
  preferences?: {
    provider?: LLMProviderType;
    analysisDepth?: 'basic' | 'intermediate' | 'advanced';
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  };
}

export class ToolOrchestrator {
  private provider: LLMProvider;
  private context: OrchestrationContext;

  constructor(provider: LLMProvider, context: OrchestrationContext = {}) {
    this.provider = provider;
    this.context = context;
  }

  // Main orchestration method
  async executeAnalysisWorkflow(query: string, symbol?: string): Promise<{
    response: string;
    toolsUsed: string[];
    totalCost: number;
    executionTime: number;
    provider: LLMProviderType;
  }> {
    const startTime = Date.now();
    
    try {
      // Step 1: Plan analysis using LLM
      console.log(`🤖 Planning analysis with ${this.provider.name}...`);
      const plan = await this.planAnalysis(query, symbol);
      
      // Step 2: Execute tools via FastMCP
      console.log(`🔧 Executing ${plan.tools.length} tools...`);
      const results = await this.executeTools(plan);
      
      // Step 3: Synthesize results using LLM
      console.log(`✨ Synthesizing results with ${this.provider.name}...`);
      const finalResponse = await this.synthesizeResults(results, query);
      
      const executionTime = Date.now() - startTime;
      const totalCost = this.calculateTotalCost(results);
      
      return {
        response: finalResponse,
        toolsUsed: results.results.map(r => r.toolName),
        totalCost,
        executionTime,
        provider: this.provider.name
      };
      
    } catch (error) {
      console.error('Orchestration error:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Step 1: Plan analysis using LLM
  private async planAnalysis(query: string, symbol?: string): Promise<ToolPlan> {
    const context = {
      symbol: symbol || this.extractSymbolFromQuery(query),
      userProfile: this.context.userProfile,
      preferences: this.context.preferences,
      recentQueries: this.context.sessionHistory?.slice(-3)
    };

    try {
      return await this.provider.planAnalysis(query, context);
    } catch (error) {
      console.warn('Planning failed, using fallback plan:', error);
      return this.getFallbackPlan(query, symbol);
    }
  }

  // Step 2: Execute tools via FastMCP
  private async executeTools(plan: ToolPlan): Promise<ToolResults> {
    const results: ToolResults = {
      results: [],
      summary: plan.strategy,
      totalTime: 0
    };

    const startTime = Date.now();

    // Sort tools by priority and execute
    const sortedTools = plan.tools.sort((a, b) => a.priority - b.priority);

    for (const tool of sortedTools) {
      const toolStartTime = Date.now();
      
      try {
        console.log(`🔧 Executing: ${tool.name}`);
        
        // Call FastMCP via existing API service
        const response = await apiService.executeMCPTool(tool.name, tool.params);
        
        if (response.success) {
          results.results.push({
            toolName: tool.name,
            output: response.data,
            success: true,
            executionTime: Date.now() - toolStartTime
          });
        } else {
          console.warn(`Tool ${tool.name} failed:`, response.error);
          results.results.push({
            toolName: tool.name,
            output: { error: response.error },
            success: false,
            executionTime: Date.now() - toolStartTime
          });
        }
             } catch (error) {
         console.error(`Error executing ${tool.name}:`, error);
         results.results.push({
           toolName: tool.name,
           output: { error: error instanceof Error ? error.message : 'Unknown error' },
           success: false,
           executionTime: Date.now() - toolStartTime
         });
      }
    }

    results.totalTime = Date.now() - startTime;
    return results;
  }

  // Step 3: Synthesize results using LLM
  private async synthesizeResults(results: ToolResults, originalQuery: string): Promise<string> {
    try {
      return await this.provider.synthesizeResults(results, originalQuery);
    } catch (error) {
      console.warn('Synthesis failed, providing basic summary:', error);
      return this.createBasicSummary(results, originalQuery);
    }
  }

  // Helper methods
  private extractSymbolFromQuery(query: string): string {
    // Simple symbol extraction - could be enhanced with NLP
    const symbolPatterns = [
      /\b(BTC|BITCOIN)\b/i,
      /\b(ETH|ETHEREUM)\b/i,
      /\b(SOL|SOLANA)\b/i,
      /\b([A-Z]{3,10}USDT?)\b/g
    ];

    for (const pattern of symbolPatterns) {
      const match = query.match(pattern);
      if (match) {
        const symbol = match[0].toUpperCase();
        return symbol.includes('USDT') ? symbol : `${symbol}USDT`;
      }
    }

    return 'BTCUSDT'; // Default symbol
  }

  private getFallbackPlan(query: string, symbol?: string): ToolPlan {
    const targetSymbol = symbol || this.extractSymbolFromQuery(query);
    
    return {
      tools: [
        {
          name: 'get_market_data',
          params: { symbol: targetSymbol },
          priority: 1,
          reasoning: 'Get basic market data as fallback'
        },
        {
          name: 'perform_technical_analysis',
          params: { symbol: targetSymbol, timeframe: '240' },
          priority: 2,
          reasoning: 'Provide technical analysis overview'
        }
      ],
      strategy: 'Basic market analysis with fallback tools',
      expectedOutput: 'Market overview and technical indicators'
    };
  }

  private createBasicSummary(results: ToolResults, query: string): string {
    const successfulResults = results.results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return `I apologize, but I encountered issues executing the analysis tools for your query: "${query}". Please try again or contact support if the issue persists.`;
    }

    let summary = `## Analysis Results\n\n`;
    summary += `Based on your query: "${query}"\n\n`;
    
    successfulResults.forEach((result, index) => {
      summary += `### ${index + 1}. ${result.toolName}\n`;
      summary += `${JSON.stringify(result.output, null, 2)}\n\n`;
    });

    summary += `Analysis completed using ${results.results.length} tools in ${results.totalTime}ms.`;
    return summary;
  }

  private calculateTotalCost(results: ToolResults): number {
    // Estimate cost based on provider and token usage
    // This is a rough estimate - real implementation would track actual tokens
    const baseTokens = 1000; // Estimated tokens for orchestration
    const toolComplexity = results.results.length * 500; // Estimated tokens per tool
    const totalTokens = baseTokens + toolComplexity;
    
    return this.provider.estimateCost(totalTokens * 0.7, totalTokens * 0.3);
  }

  // Provider switching
  async switchProvider(newProviderType: LLMProviderType, config: any): Promise<void> {
    this.provider = llmProviderFactory.create(newProviderType, config);
  }

  // Get current provider info
  getProviderInfo(): {
    name: LLMProviderType;
    model: string;
    contextWindow: number;
    costPerToken: any;
  } {
    return {
      name: this.provider.name,
      model: this.provider.model,
      contextWindow: this.provider.contextWindow,
      costPerToken: this.provider.costPerToken
    };
  }
}

// Factory function for easy orchestrator creation
export function createOrchestrator(
  providerType: LLMProviderType, 
  config: any, 
  context: OrchestrationContext = {}
): ToolOrchestrator {
  const provider = llmProviderFactory.create(providerType, config);
  return new ToolOrchestrator(provider, context);
} 