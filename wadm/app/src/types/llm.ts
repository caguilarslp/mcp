export type LLMProviderType = 'anthropic' | 'openai' | 'google';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface LLMConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  model: string;
  provider: LLMProviderType;
  timestamp: Date;
  streamId?: string;
}

export interface ToolPlan {
  tools: {
    name: string;
    params: any;
    priority: number;
    reasoning: string;
  }[];
  strategy: string;
  expectedOutput: string;
}

export interface ToolResults {
  results: {
    toolName: string;
    output: any;
    success: boolean;
    executionTime: number;
  }[];
  summary: string;
  totalTime: number;
}

export interface LLMProvider {
  readonly name: LLMProviderType;
  readonly model: string;
  readonly contextWindow: number;
  readonly costPerToken: {
    input: number;
    output: number;
  };
  readonly supportsFunctionCalling: boolean;
  readonly supportsStreaming: boolean;

  // Core methods
  createChatCompletion(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<LLMResponse>;

  createChatStream(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string>;

  // Tool orchestration
  planAnalysis(query: string, context?: any): Promise<ToolPlan>;
  synthesizeResults(results: ToolResults, originalQuery: string): Promise<string>;

  // Utility methods
  estimateCost(inputTokens: number, outputTokens: number): number;
  isHealthy(): Promise<boolean>;
}

export interface LLMProviderFactory {
  create(provider: LLMProviderType, config: LLMConfig): LLMProvider;
  getOptimalProvider(queryType: 'quick' | 'analysis' | 'educational' | 'experimental'): LLMProviderType;
  getAllProviders(): LLMProviderType[];
}

// Query types for optimal provider selection
export type QueryType = 'quick' | 'analysis' | 'educational' | 'experimental';

export interface ProviderPerformance {
  provider: LLMProviderType;
  avgResponseTime: number;
  successRate: number;
  avgCost: number;
  userSatisfaction: number;
} 