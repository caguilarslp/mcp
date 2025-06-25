import type { 
  LLMProvider, 
  LLMProviderType, 
  LLMConfig, 
  QueryType,
  LLMProviderFactory as ILLMProviderFactory 
} from '../../../types/llm';

import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GoogleProvider } from './google';

export class LLMProviderFactory implements ILLMProviderFactory {
  private static instance: LLMProviderFactory;
  private providerCache = new Map<string, LLMProvider>();

  private constructor() {}

  static getInstance(): LLMProviderFactory {
    if (!LLMProviderFactory.instance) {
      LLMProviderFactory.instance = new LLMProviderFactory();
    }
    return LLMProviderFactory.instance;
  }

  create(provider: LLMProviderType, config: LLMConfig): LLMProvider {
    const cacheKey = `${provider}-${config.model || 'default'}`;
    
    if (this.providerCache.has(cacheKey)) {
      return this.providerCache.get(cacheKey)!;
    }

    let providerInstance: LLMProvider;

    switch (provider) {
      case 'anthropic':
        providerInstance = new AnthropicProvider(config);
        break;
      case 'openai':
        providerInstance = new OpenAIProvider(config);
        break;
      case 'google':
        providerInstance = new GoogleProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    this.providerCache.set(cacheKey, providerInstance);
    return providerInstance;
  }

  getOptimalProvider(queryType: QueryType): LLMProviderType {
    // Smart provider selection based on query type and provider strengths
    switch (queryType) {
      case 'quick':
        return 'google'; // Fastest and cheapest for quick responses
      
      case 'analysis':
        return 'anthropic'; // Best for deep analysis and educational content
      
      case 'educational':
        return 'anthropic'; // Claude excels at educational explanations
      
      case 'experimental':
        return 'google'; // Gemini for experimental and creative approaches
      
      default:
        return 'openai'; // GPT-4 as balanced default
    }
  }

  getAllProviders(): LLMProviderType[] {
    return ['anthropic', 'openai', 'google'];
  }

  // Advanced provider selection based on multiple factors
  selectProviderByContext(context: {
    queryType?: QueryType;
    userBudget?: 'low' | 'medium' | 'high';
    responseSpeed?: 'fast' | 'balanced' | 'thorough';
    analysisDepth?: 'basic' | 'intermediate' | 'advanced';
    userExperience?: 'beginner' | 'intermediate' | 'advanced';
  }): LLMProviderType {
    const {
      queryType = 'analysis',
      userBudget = 'medium',
      responseSpeed = 'balanced',
      analysisDepth = 'intermediate',
      userExperience = 'intermediate'
    } = context;

    // Cost-conscious selection
    if (userBudget === 'low') {
      return 'google'; // Most cost-effective
    }

    // Speed-focused selection
    if (responseSpeed === 'fast') {
      return queryType === 'educational' ? 'openai' : 'google';
    }

    // Depth-focused selection
    if (analysisDepth === 'advanced' || userExperience === 'advanced') {
      return 'anthropic'; // Best for deep, educational analysis
    }

    // Beginner-friendly selection
    if (userExperience === 'beginner') {
      return 'anthropic'; // Best educational explanations
    }

    // Default to optimal provider for query type
    return this.getOptimalProvider(queryType);
  }

  // Get provider recommendations with reasoning
  getProviderRecommendations(context: any): {
    primary: LLMProviderType;
    alternatives: LLMProviderType[];
    reasoning: string;
    costEstimate: {
      [key in LLMProviderType]: number;
    };
  } {
    const primary = this.selectProviderByContext(context);
    const alternatives = this.getAllProviders().filter(p => p !== primary);

    // Cost estimates for 1000 tokens (rough)
    const costEstimate = {
      anthropic: 0.015 + 0.075, // Input + output
      openai: 0.030 + 0.060,
      google: 0.001 + 0.002
    };

    let reasoning = '';
    switch (primary) {
      case 'anthropic':
        reasoning = 'Selected for deep educational analysis and comprehensive explanations';
        break;
      case 'openai':
        reasoning = 'Selected for balanced performance and conversational responses';
        break;
      case 'google':
        reasoning = 'Selected for cost-effectiveness and experimental approaches';
        break;
    }

    return {
      primary,
      alternatives,
      reasoning,
      costEstimate
    };
  }

  // Health check all providers
  async healthCheckAll(): Promise<{
    [key in LLMProviderType]: boolean;
  }> {
    const results: { [key in LLMProviderType]: boolean } = {
      anthropic: false,
      openai: false,
      google: false
    };

    const providers = this.getAllProviders();
    const healthChecks = providers.map(async (providerType) => {
      try {
        // Create a dummy config for health check
        const dummyConfig: LLMConfig = {
          apiKey: 'dummy', // Will fail gracefully
          model: 'default'
        };
        
        const provider = this.create(providerType, dummyConfig);
        const isHealthy = await provider.isHealthy();
        results[providerType] = isHealthy;
      } catch (error) {
        console.warn(`Health check failed for ${providerType}:`, error);
        results[providerType] = false;
      }
    });

    await Promise.all(healthChecks);
    return results;
  }

  // Clear cache (useful for config changes)
  clearCache(): void {
    this.providerCache.clear();
  }

  // Get cached providers count
  getCacheSize(): number {
    return this.providerCache.size;
  }
}

// Export singleton instance
export const llmProviderFactory = LLMProviderFactory.getInstance(); 