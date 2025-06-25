import type { 
  LLMProvider, 
  LLMProviderType, 
  ChatMessage, 
  LLMResponse, 
  LLMConfig,
  ToolPlan,
  ToolResults,
  LLMUsage
} from '../../../types/llm';

export abstract class BaseLLMProvider implements LLMProvider {
  protected config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }

  // Abstract properties - must be implemented by each provider
  abstract readonly name: LLMProviderType;
  abstract readonly model: string;
  abstract readonly contextWindow: number;
  abstract readonly costPerToken: {
    input: number;
    output: number;
  };
  abstract readonly supportsFunctionCalling: boolean;
  abstract readonly supportsStreaming: boolean;

  // Abstract methods - provider-specific implementation
  abstract createChatCompletion(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<LLMResponse>;

  abstract createChatStream(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string>;

  abstract isHealthy(): Promise<boolean>;

  // Common utility methods
  estimateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * this.costPerToken.input / 1000) + 
           (outputTokens * this.costPerToken.output / 1000);
  }

  protected createUsage(inputTokens: number, outputTokens: number): LLMUsage {
    const totalTokens = inputTokens + outputTokens;
    const cost = this.estimateCost(inputTokens, outputTokens);
    
    return {
      inputTokens,
      outputTokens,
      totalTokens,
      cost
    };
  }

  // Tool orchestration methods with common implementation
  async planAnalysis(query: string, context?: any): Promise<ToolPlan> {
    const planningMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a trading analysis expert. Given a user query, plan which MCP tools to use for comprehensive analysis.

Available tool categories:
- Market Data: get_ticker, get_orderbook, get_market_data
- Wyckoff Analysis: analyze_wyckoff_phase, find_wyckoff_events, analyze_composite_man
- Smart Money Concepts: detect_order_blocks, find_fair_value_gaps, detect_break_of_structure
- Technical Analysis: perform_technical_analysis, calculate_fibonacci_levels, analyze_bollinger_bands
- Volume Analysis: analyze_volume, analyze_volume_delta, identify_volume_anomalies

Respond with a JSON object containing:
- tools: array of {name, params, priority, reasoning}
- strategy: overall analysis strategy
- expectedOutput: what the user should expect

Context: ${context ? JSON.stringify(context) : 'None'}`,
        timestamp: new Date()
      },
      {
        role: 'user',
        content: query,
        timestamp: new Date()
      }
    ];

    const response = await this.createChatCompletion(planningMessages, {
      maxTokens: 1000,
      temperature: 0.3
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      // Fallback plan if JSON parsing fails
      return {
        tools: [
          {
            name: 'get_market_data',
            params: { symbol: 'BTCUSDT' }, // Default symbol
            priority: 1,
            reasoning: 'Get basic market data as fallback'
          }
        ],
        strategy: 'Basic analysis due to planning error',
        expectedOutput: 'Basic market data and analysis'
      };
    }
  }

  async synthesizeResults(results: ToolResults, originalQuery: string): Promise<string> {
    const synthesisMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a professional trading analyst. Synthesize the following tool results into a comprehensive, educational response for the user.

Guidelines:
- Provide clear, actionable insights
- Explain the "why" behind patterns and signals
- Include risk management recommendations
- Use professional but accessible language
- Organize findings logically
- Highlight key opportunities and risks

Original query: ${originalQuery}`,
        timestamp: new Date()
      },
      {
        role: 'user',
        content: `Please analyze these results and provide a comprehensive trading analysis:

${JSON.stringify(results, null, 2)}`,
        timestamp: new Date()
      }
    ];

    const response = await this.createChatCompletion(synthesisMessages, {
      maxTokens: 2000,
      temperature: 0.7
    });

    return response.content;
  }

  // Helper method to format messages for each provider
  protected formatMessages(messages: ChatMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  // Error handling helper
  protected handleError(error: any, operation: string): never {
    console.error(`${this.name} provider error in ${operation}:`, error);
    throw new Error(`${this.name} provider failed: ${error.message || 'Unknown error'}`);
  }
} 