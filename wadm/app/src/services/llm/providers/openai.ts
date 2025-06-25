import OpenAI from 'openai';
import { BaseLLMProvider } from './base';
import type { 
  LLMProviderType, 
  ChatMessage, 
  LLMResponse, 
  LLMConfig 
} from '../../../types/llm';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;
  
  readonly name: LLMProviderType = 'openai';
  readonly model: string;
  readonly contextWindow: number = 128000; // GPT-4 context window
  readonly costPerToken = {
    input: 0.030,  // $0.030 per 1K input tokens
    output: 0.060  // $0.060 per 1K output tokens
  };
  readonly supportsFunctionCalling = true;
  readonly supportsStreaming = true;

  constructor(config: LLMConfig) {
    super(config);
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true // Enable client-side usage
    });
    
    this.model = config.model || 'gpt-4-turbo-preview';
  }

  async createChatCompletion(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<LLMResponse> {
    try {
      const formattedMessages = this.formatMessages(messages);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: formattedMessages,
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature || 0.7,
        stream: false
      });

      const content = response.choices[0]?.message?.content || '';
      const usage = this.createUsage(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
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
      
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: formattedMessages,
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature || 0.7,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.handleError(error, 'createChatStream');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      });
      
      return response.choices?.length > 0;
    } catch (error) {
      console.warn('OpenAI health check failed:', error);
      return false;
    }
  }

  // Override tool planning for GPT-4's strengths
  async planAnalysis(query: string, context?: any): Promise<any> {
    const planningMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are GPT-4, an advanced AI assistant specializing in trading analysis. Plan which MCP tools to use for fast, accurate analysis.

Your strengths:
- Quick conversational responses
- Pattern recognition
- Multi-step reasoning
- Balanced technical analysis
- Clear communication

Available MCP tools:
- Market Data: get_ticker, get_orderbook, get_market_data, get_aggregated_ticker
- Wyckoff: analyze_wyckoff_phase, find_wyckoff_events, analyze_composite_man
- Smart Money: detect_order_blocks, find_fair_value_gaps, detect_break_of_structure
- Technical: perform_technical_analysis, calculate_fibonacci_levels, analyze_bollinger_bands
- Volume: analyze_volume, analyze_volume_delta, identify_volume_anomalies
- Context: get_3_month_context, find_similar_patterns

Respond with JSON:
{
  "tools": [{"name": "tool_name", "params": {...}, "priority": 1-5, "reasoning": "why this tool"}],
  "strategy": "efficient analysis approach",
  "expectedOutput": "what insights to expect"
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
      maxTokens: 1000,
      temperature: 0.3
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      // GPT-4 specific fallback with balanced approach
      return {
        tools: [
          {
            name: 'get_market_data',
            params: { symbol: 'BTCUSDT' },
            priority: 1,
            reasoning: 'Get current market snapshot for context'
          },
          {
            name: 'perform_technical_analysis',
            params: { symbol: 'BTCUSDT', timeframe: '240' },
            priority: 2,
            reasoning: 'Technical analysis provides clear trading signals'
          }
        ],
        strategy: 'Balanced technical analysis with clear actionable insights',
        expectedOutput: 'Current market state with technical indicators and trading signals'
      };
    }
  }

  // Override synthesis for GPT-4's conversational style
  async synthesizeResults(results: any, originalQuery: string): Promise<string> {
    const synthesisMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are GPT-4, providing clear, actionable trading analysis. Your response should be well-structured, concise, and practical.

Your analysis style:
- Clear, direct communication
- Actionable insights and recommendations
- Balanced perspective on risks and opportunities
- Logical flow of information
- Professional but accessible tone

Focus on:
1. Key Market Insights
2. Technical Analysis Summary
3. Trading Opportunities
4. Risk Management
5. Next Steps

Original query: ${originalQuery}`,
        timestamp: new Date()
      },
      {
        role: 'user',
        content: `Please provide a clear, actionable analysis of these results:

${JSON.stringify(results, null, 2)}

Structure your response with:
1. Market Overview
2. Technical Analysis
3. Trading Opportunities
4. Risk Considerations
5. Recommended Actions`,
        timestamp: new Date()
      }
    ];

    const response = await this.createChatCompletion(synthesisMessages, {
      maxTokens: 2500,
      temperature: 0.7
    });

    return response.content;
  }
} 