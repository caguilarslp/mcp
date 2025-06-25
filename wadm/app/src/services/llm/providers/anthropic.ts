import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base';
import type { 
  LLMProviderType, 
  ChatMessage, 
  LLMResponse, 
  LLMConfig 
} from '../../../types/llm';

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic;
  
  readonly name: LLMProviderType = 'anthropic';
  readonly model: string;
  readonly contextWindow: number = 200000; // Claude Sonnet 4 context window
  readonly costPerToken = {
    input: 0.015,  // $0.015 per 1K input tokens
    output: 0.075  // $0.075 per 1K output tokens
  };
  readonly supportsFunctionCalling = true;
  readonly supportsStreaming = true;

  constructor(config: LLMConfig) {
    super(config);
    
    this.client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true // Enable client-side usage
    });
    
    this.model = config.model || 'claude-3-5-sonnet-20241022';
  }

  async createChatCompletion(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<LLMResponse> {
    try {
      const formattedMessages = this.formatMessages(messages);
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature || 0.7,
        messages: formattedMessages,
        stream: false
      });

      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      const usage = this.createUsage(
        response.usage.input_tokens,
        response.usage.output_tokens
      );

      return {
        content,
        usage,
        model: this.model,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      this.handleError(error, 'createChatCompletion');
    }
  }

  async *createChatStream(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string> {
    try {
      const formattedMessages = this.formatMessages(messages);
      
      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature || 0.7,
        messages: formattedMessages,
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && 
            chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      this.handleError(error, 'createChatStream');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      return response.content?.length > 0;
    } catch (error) {
      console.warn('Anthropic health check failed:', error);
      return false;
    }
  }

  // Override tool planning for Claude's strengths
  async planAnalysis(query: string, context?: any): Promise<any> {
    const planningMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are Claude, an expert trading analyst with deep knowledge of Wyckoff methodology and Smart Money Concepts. Plan which MCP tools to use for comprehensive analysis.

Your strengths:
- Deep educational explanations
- Wyckoff phase analysis
- Risk management strategies
- Multi-timeframe perspective
- Institutional behavior analysis

Available MCP tools:
- Market Data: get_ticker, get_orderbook, get_market_data, get_aggregated_ticker
- Wyckoff: analyze_wyckoff_phase, find_wyckoff_events, analyze_composite_man, track_institutional_flow
- Smart Money: detect_order_blocks, find_fair_value_gaps, detect_break_of_structure, analyze_smart_money_confluence
- Technical: perform_technical_analysis, calculate_fibonacci_levels, analyze_bollinger_bands, detect_elliott_waves
- Volume: analyze_volume, analyze_volume_delta, identify_volume_anomalies, analyze_wyckoff_volume
- Context: get_3_month_context, find_similar_patterns, get_historical_performance

Respond with JSON:
{
  "tools": [{"name": "tool_name", "params": {...}, "priority": 1-5, "reasoning": "why this tool"}],
  "strategy": "comprehensive analysis approach",
  "expectedOutput": "what user will learn"
}

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
      maxTokens: 1200,
      temperature: 0.2  // Lower temperature for more consistent JSON
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      // Claude-specific fallback with educational focus
      return {
        tools: [
          {
            name: 'analyze_wyckoff_phase',
            params: { symbol: 'BTCUSDT', timeframe: '240' },
            priority: 1,
            reasoning: 'Wyckoff phase analysis provides fundamental market context'
          },
          {
            name: 'detect_order_blocks',
            params: { symbol: 'BTCUSDT', timeframe: '60' },
            priority: 2,
            reasoning: 'Smart Money Concepts reveal institutional activity'
          }
        ],
        strategy: 'Educational analysis focusing on market structure and institutional behavior',
        expectedOutput: 'Comprehensive understanding of current market phase and smart money activity'
      };
    }
  }

  // Override synthesis for Claude's educational approach
  async synthesizeResults(results: any, originalQuery: string): Promise<string> {
    const synthesisMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are Claude, providing professional trading analysis with educational depth. Your response should be comprehensive, educational, and actionable.

Your analysis style:
- Explain the "why" behind every observation
- Provide educational context for patterns
- Include risk management recommendations
- Use clear, professional language
- Structure findings logically
- Highlight learning opportunities

Focus on:
1. Market Structure Analysis
2. Institutional Activity (Smart Money)
3. Risk/Reward Assessment
4. Educational Insights
5. Actionable Recommendations

Original query: ${originalQuery}`,
        timestamp: new Date()
      },
      {
        role: 'user',
        content: `Please provide a comprehensive educational analysis of these results:

${JSON.stringify(results, null, 2)}

Structure your response with:
1. Executive Summary
2. Market Structure Analysis
3. Smart Money Activity
4. Risk Assessment
5. Trading Recommendations
6. Key Learning Points`,
        timestamp: new Date()
      }
    ];

    const response = await this.createChatCompletion(synthesisMessages, {
      maxTokens: 3000,
      temperature: 0.7
    });

    return response.content;
  }
} 