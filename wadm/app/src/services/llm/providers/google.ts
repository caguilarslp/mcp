import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseLLMProvider } from './base';
import type { 
  LLMProviderType, 
  ChatMessage, 
  LLMResponse, 
  LLMConfig 
} from '../../../types/llm';

export class GoogleProvider extends BaseLLMProvider {
  private client: GoogleGenerativeAI;
  private generativeModel: any;
  
  readonly name: LLMProviderType = 'google';
  readonly model: string;
  readonly contextWindow: number = 32768; // Gemini Pro context window
  readonly costPerToken = {
    input: 0.001,  // $0.001 per 1K input tokens (very cost-effective)
    output: 0.002  // $0.002 per 1K output tokens
  };
  readonly supportsFunctionCalling = true;
  readonly supportsStreaming = true;

  constructor(config: LLMConfig) {
    super(config);
    
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-pro';
    
    // Initialize the model
    this.initializeModel();
  }

  private initializeModel() {
    this.generativeModel = this.client.getGenerativeModel({ 
      model: this.model,
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 4000,
      }
    });
  }

  async createChatCompletion(messages: ChatMessage[], _options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<LLMResponse> {
    try {
      // Gemini uses a different message format
      const formattedMessages = this.formatMessagesForGemini(messages);
      
      const result = await this.generativeModel.generateContent(formattedMessages);
      const response = await result.response;
      const content = response.text();

      // Gemini doesn't provide detailed usage stats, so we estimate
      const estimatedInputTokens = Math.ceil(formattedMessages.length * 50); // Rough estimate
      const estimatedOutputTokens = Math.ceil(content.length / 4); // Rough estimate
      
      const usage = this.createUsage(estimatedInputTokens, estimatedOutputTokens);

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

  async *createChatStream(messages: ChatMessage[], /* options?: {
    maxTokens?: number;
    temperature?: number;
  } */): AsyncIterable<string> {
    try {
      const formattedMessages = this.formatMessagesForGemini(messages);
      
      const result = await this.generativeModel.generateContentStream(formattedMessages);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      this.handleError(error, 'createChatStream');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.generativeModel.generateContent('Hi');
      const response = await result.response;
      return response.text().length > 0;
    } catch (error) {
      console.warn('Google AI health check failed:', error);
      return false;
    }
  }

  // Format messages for Gemini's expected format
  private formatMessagesForGemini(messages: ChatMessage[]): string {
    // Gemini Pro works better with a single prompt that includes context
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    let prompt = '';
    
    // Add system context
    if (systemMessages.length > 0) {
      prompt += systemMessages.map(m => m.content).join('\n\n') + '\n\n';
    }
    
    // Add conversation
    conversationMessages.forEach(msg => {
      const role = msg.role === 'assistant' ? 'Assistant' : 'User';
      prompt += `${role}: ${msg.content}\n\n`;
    });
    
    return prompt;
  }

  // Override tool planning for Gemini's experimental approach
  async planAnalysis(query: string, context?: any): Promise<any> {
    const planningPrompt = `You are Gemini Pro, Google's advanced AI model. You excel at experimental analysis and cost-effective solutions. Plan which MCP tools to use for innovative trading analysis.

Your strengths:
- Experimental approaches
- Cost-effective analysis
- Creative pattern recognition
- Multi-modal capabilities
- Rapid iteration

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
  "strategy": "innovative analysis approach",
  "expectedOutput": "experimental insights to discover"
}

Context: ${context ? JSON.stringify(context) : 'None'}

User Query: ${query}

Response:`;

    const response = await this.createChatCompletion([
      { role: 'user', content: planningPrompt, timestamp: new Date() }
    ], {
      maxTokens: 1000,
      temperature: 0.4
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      // Gemini-specific fallback with experimental focus
      return {
        tools: [
          {
            name: 'get_aggregated_ticker',
            params: { symbol: 'BTCUSDT' },
            priority: 1,
            reasoning: 'Multi-exchange data provides broader market perspective'
          },
          {
            name: 'find_similar_patterns',
            params: { symbol: 'BTCUSDT', lookback_days: 30 },
            priority: 2,
            reasoning: 'Pattern matching can reveal hidden opportunities'
          }
        ],
        strategy: 'Experimental multi-exchange pattern analysis',
        expectedOutput: 'Unique market insights through pattern recognition and cross-exchange analysis'
      };
    }
  }

  // Override synthesis for Gemini's creative approach
  async synthesizeResults(results: any, originalQuery: string): Promise<string> {
    const synthesisPrompt = `You are Gemini Pro, providing innovative trading analysis with creative insights. Your response should be experimental, forward-thinking, and cost-effective.

Your analysis style:
- Creative and experimental approaches
- Cost-effective trading strategies
- Unique perspective on market patterns
- Multi-exchange insights
- Innovation-focused recommendations

Focus on:
1. Innovative Market Insights
2. Cross-Exchange Opportunities
3. Experimental Strategies
4. Cost-Effective Approaches
5. Future Market Trends

Original query: ${originalQuery}

Analysis results:
${JSON.stringify(results, null, 2)}

Please provide an innovative analysis structured as:
1. Experimental Insights
2. Multi-Exchange Patterns
3. Creative Trading Ideas
4. Cost-Effective Strategies
5. Future Considerations

Response:`;

    const response = await this.createChatCompletion([
      { role: 'user', content: synthesisPrompt, timestamp: new Date() }
    ], {
      maxTokens: 2000,
      temperature: 0.8 // Higher temperature for more creativity
    });

    return response.content;
  }
} 