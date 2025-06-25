import type { 
  LLMProviderType, 
  LLMConfig, 
  ChatMessage, 
  // LLMResponse 
} from '../../types/llm';
import { ToolOrchestrator, createOrchestrator } from './orchestrator';
import type { OrchestrationContext } from './orchestrator';
import { llmProviderFactory } from './providers';

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  provider: LLMProviderType;
  totalCost: number;
  totalTokens: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface ChatServiceConfig {
  defaultProvider: LLMProviderType;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  userContext?: OrchestrationContext;
}

export class ChatService {
  private config: ChatServiceConfig;
  private currentSession: ChatSession | null = null;
  private orchestrator: ToolOrchestrator | null = null;

  constructor(config: ChatServiceConfig) {
    this.config = config;
  }

  // Start new chat session
  async startSession(provider?: LLMProviderType): Promise<ChatSession> {
    const selectedProvider = provider || this.config.defaultProvider;
    const apiKey = this.getApiKey(selectedProvider);
    
    if (!apiKey) {
      throw new Error(`No API key configured for ${selectedProvider}`);
    }

    // Create new session
    this.currentSession = {
      id: this.generateSessionId(),
      messages: [],
      provider: selectedProvider,
      totalCost: 0,
      totalTokens: 0,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    // Initialize orchestrator
    const llmConfig: LLMConfig = {
      apiKey,
      model: this.getDefaultModel(selectedProvider)
    };

    this.orchestrator = createOrchestrator(
      selectedProvider, 
      llmConfig, 
      this.config.userContext
    );

    console.log(`🚀 Started chat session with ${selectedProvider}`);
    return this.currentSession;
  }

  // Send message and get response
  async sendMessage(message: string, options?: {
    useTools?: boolean;
    symbol?: string;
    analysisType?: 'quick' | 'detailed' | 'comprehensive';
  }): Promise<{
    response: string;
    toolsUsed?: string[];
    cost: number;
    tokens: number;
    executionTime: number;
  }> {
    if (!this.currentSession || !this.orchestrator) {
      throw new Error('No active chat session. Call startSession() first.');
    }

    const startTime = Date.now();
    const useTools = options?.useTools ?? true;

    // Add user message to session
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    this.currentSession.messages.push(userMessage);

    try {
      let response: string;
      let toolsUsed: string[] = [];
      let cost = 0;
      let tokens = 0;

      if (useTools) {
        // Use tool orchestration for comprehensive analysis
        const workflowResult = await this.orchestrator.executeAnalysisWorkflow(
          message, 
          options?.symbol
        );
        
        response = workflowResult.response;
        toolsUsed = workflowResult.toolsUsed;
        cost = workflowResult.totalCost;
        tokens = Math.ceil(cost * 1000); // Rough token estimate
      } else {
        // Direct LLM response without tools
        const provider = llmProviderFactory.create(
          this.currentSession.provider,
          { apiKey: this.getApiKey(this.currentSession.provider)! }
        );

        const llmResponse = await provider.createChatCompletion(
          this.currentSession.messages
        );
        
        response = llmResponse.content;
        cost = llmResponse.usage.cost || 0;
        tokens = llmResponse.usage.totalTokens;
      }

      // Add assistant response to session
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      this.currentSession.messages.push(assistantMessage);

      // Update session stats
      this.currentSession.totalCost += cost;
      this.currentSession.totalTokens += tokens;
      this.currentSession.lastActivity = new Date();

      const executionTime = Date.now() - startTime;

      return {
        response,
        toolsUsed: useTools ? toolsUsed : undefined,
        cost,
        tokens,
        executionTime
      };

    } catch (error) {
      console.error('Chat message error:', error);
      throw new Error(`Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Stream message response
  async *streamMessage(message: string, options?: {
    useTools?: boolean;
    symbol?: string;
  }): AsyncIterable<{
    chunk: string;
    isComplete?: boolean;
    metadata?: any;
  }> {
    if (!this.currentSession || !this.orchestrator) {
      throw new Error('No active chat session. Call startSession() first.');
    }

    const useTools = options?.useTools ?? false; // Streaming typically without tools for now

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    this.currentSession.messages.push(userMessage);

    try {
      if (useTools) {
        // For tool-based responses, we execute first then stream the result
        const workflowResult = await this.orchestrator.executeAnalysisWorkflow(
          message, 
          options?.symbol
        );

        // Stream the response word by word for effect
        const words = workflowResult.response.split(' ');
        for (const word of words) {
          yield { chunk: word + ' ' };
          await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming
        }

        yield { 
          chunk: '', 
          isComplete: true, 
          metadata: {
            toolsUsed: workflowResult.toolsUsed,
            cost: workflowResult.totalCost,
            executionTime: workflowResult.executionTime
          }
        };
      } else {
        // Direct streaming from LLM
        const provider = llmProviderFactory.create(
          this.currentSession.provider,
          { apiKey: this.getApiKey(this.currentSession.provider)! }
        );

        let fullResponse = '';
        for await (const chunk of provider.createChatStream(this.currentSession.messages)) {
          fullResponse += chunk;
          yield { chunk };
        }

        // Add complete response to session
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date()
        };
        this.currentSession.messages.push(assistantMessage);

        yield { chunk: '', isComplete: true };
      }
    } catch (error) {
      console.error('Streaming error:', error);
      yield { 
        chunk: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        isComplete: true 
      };
    }
  }

  // Switch provider mid-session
  async switchProvider(newProvider: LLMProviderType): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const apiKey = this.getApiKey(newProvider);
    if (!apiKey) {
      throw new Error(`No API key configured for ${newProvider}`);
    }

    this.currentSession.provider = newProvider;

    // Recreate orchestrator with new provider
    const llmConfig: LLMConfig = {
      apiKey,
      model: this.getDefaultModel(newProvider)
    };

    this.orchestrator = createOrchestrator(
      newProvider, 
      llmConfig, 
      this.config.userContext
    );

    console.log(`🔄 Switched to ${newProvider} provider`);
  }

  // Get current session
  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  // Get provider recommendations
  getProviderRecommendations(queryType: 'quick' | 'analysis' | 'educational' | 'experimental') {
    return llmProviderFactory.getProviderRecommendations({
      queryType,
      userBudget: 'medium', // Could be dynamic based on user settings
      analysisDepth: 'intermediate'
    });
  }

  // End session
  endSession(): void {
    this.currentSession = null;
    this.orchestrator = null;
    console.log('📝 Chat session ended');
  }

  // Helper methods
  private getApiKey(provider: LLMProviderType): string | undefined {
    return this.config.apiKeys[provider];
  }

  private getDefaultModel(provider: LLMProviderType): string {
    switch (provider) {
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'openai':
        return 'gpt-4-turbo-preview';
      case 'google':
        return 'gemini-pro';
      default:
        return 'default';
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory function for easy service creation
export function createChatService(config: ChatServiceConfig): ChatService {
  return new ChatService(config);
} 