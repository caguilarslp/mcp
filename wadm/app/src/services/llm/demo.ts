/**
 * @fileoverview Multi-LLM Architecture Demo
 * @description Demonstration of how to use the new Multi-LLM system
 * 
 * This file shows how to:
 * 1. Initialize chat service with multiple providers
 * 2. Execute trading analysis with tool orchestration
 * 3. Switch between providers dynamically
 * 4. Stream responses for better UX
 */

import { createChatService } from './chatService';
import { llmProviderFactory } from './providers';
import type { ChatServiceConfig, LLMProviderType } from './index';

// Example configuration
const demoConfig: ChatServiceConfig = {
  defaultProvider: 'anthropic',
  apiKeys: {
    anthropic: process.env.VITE_ANTHROPIC_API_KEY || 'demo-key',
    openai: process.env.VITE_OPENAI_API_KEY || 'demo-key', 
    google: process.env.VITE_GOOGLE_API_KEY || 'demo-key'
  },
  userContext: {
    userProfile: {
      tradingExperience: 'intermediate',
      tradingStyle: 'swing-trading',
      capitalRange: '10k-50k',
      riskTolerance: 'moderate',
      preferredInstruments: ['crypto'],
      learningFocus: ['wyckoff', 'smc']
    },
    preferences: {
      provider: 'anthropic',
      analysisDepth: 'intermediate',
      riskTolerance: 'moderate'
    }
  }
};

/**
 * Demo 1: Basic Multi-LLM Chat Service Usage
 */
async function demoBasicUsage() {
  console.log('🚀 Demo 1: Basic Multi-LLM Usage');
  
  // Create chat service
  const chatService = createChatService(demoConfig);
  
  // Start session with Anthropic (Claude)
  const session = await chatService.startSession('anthropic');
  console.log(`✅ Started session: ${session.id} with ${session.provider}`);
  
  // Send analysis query with tool orchestration
  const response = await chatService.sendMessage(
    "Analyze BTCUSDT and provide Wyckoff phase analysis with entry signals",
    {
      useTools: true,
      symbol: 'BTCUSDT'
    }
  );
  
  console.log('📊 Analysis Results:');
  console.log(`- Provider: ${response.toolsUsed ? 'With Tools' : 'Direct LLM'}`);
  console.log(`- Tools Used: ${response.toolsUsed?.join(', ') || 'None'}`);
  console.log(`- Cost: $${response.cost.toFixed(4)}`);
  console.log(`- Execution Time: ${response.executionTime}ms`);
  console.log(`- Response Preview: ${response.response.substring(0, 200)}...`);
  
  chatService.endSession();
}

/**
 * Demo 2: Provider Comparison
 */
async function demoProviderComparison() {
  console.log('🔄 Demo 2: Provider Comparison');
  
  const providers: LLMProviderType[] = ['anthropic', 'openai', 'google'];
  const query = "What's the current market sentiment for Bitcoin?";
  
  for (const provider of providers) {
    console.log(`\n--- Testing ${provider.toUpperCase()} ---`);
    
    const chatService = createChatService({
      ...demoConfig,
      defaultProvider: provider
    });
    
    try {
      await chatService.startSession(provider);
      
      const response = await chatService.sendMessage(query, {
        useTools: false // Direct comparison without tools
      });
      
      console.log(`✅ ${provider}: ${response.executionTime}ms, $${response.cost.toFixed(4)}`);
      console.log(`Response style: ${response.response.substring(0, 150)}...`);
      
      chatService.endSession();
    } catch (error) {
      console.log(`❌ ${provider}: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }
}

/**
 * Demo 3: Smart Provider Selection
 */
async function demoSmartProviderSelection() {
  console.log('🧠 Demo 3: Smart Provider Selection');
  
  const queryTypes = [
    { type: 'quick' as const, query: "Quick BTC price check" },
    { type: 'educational' as const, query: "Explain Wyckoff accumulation phase" },
    { type: 'analysis' as const, query: "Deep technical analysis of ETHUSDT" },
    { type: 'experimental' as const, query: "Find unusual patterns in SOLUSDT" }
  ];
  
  for (const { type /* , query */ } of queryTypes) {
    const recommendation = llmProviderFactory.getProviderRecommendations({
      queryType: type,
      userBudget: 'medium',
      analysisDepth: 'intermediate'
    });
    
    console.log(`\n📝 Query Type: ${type}`);
    console.log(`🎯 Recommended: ${recommendation.primary}`);
    console.log(`💡 Reasoning: ${recommendation.reasoning}`);
    console.log(`💰 Cost estimate: $${recommendation.costEstimate[recommendation.primary].toFixed(4)}`);
    console.log(`🔄 Alternatives: ${recommendation.alternatives.join(', ')}`);
  }
}

/**
 * Demo 4: Streaming Response
 */
async function demoStreamingResponse() {
  console.log('🌊 Demo 4: Streaming Response');
  
  const chatService = createChatService(demoConfig);
  await chatService.startSession('openai'); // GPT-4 for good streaming
  
  console.log('Starting stream...');
  let streamedContent = '';
  
  for await (const chunk of chatService.streamMessage(
    "Explain the difference between Wyckoff and Smart Money Concepts"
  )) {
    if (chunk.chunk) {
      streamedContent += chunk.chunk;
      process.stdout.write(chunk.chunk); // Real-time output
    }
    
    if (chunk.isComplete) {
      console.log('\n\n✅ Stream complete!');
      if (chunk.metadata) {
        console.log(`Metadata:`, chunk.metadata);
      }
      break;
    }
  }
  
  chatService.endSession();
}

/**
 * Demo 5: Dynamic Provider Switching
 */
async function demoDynamicSwitching() {
  console.log('🔄 Demo 5: Dynamic Provider Switching');
  
  const chatService = createChatService(demoConfig);
  let session = await chatService.startSession('anthropic');
  
  console.log(`Started with: ${session.provider}`);
  
  // Send message with Claude
  const claudeResponse = await chatService.sendMessage(
    "Analyze market structure",
    { useTools: false }
  );
  console.log(`Claude response time: ${claudeResponse.executionTime}ms`);
  
  // Switch to GPT-4
  await chatService.switchProvider('openai');
  session = chatService.getCurrentSession()!;
  console.log(`Switched to: ${session.provider}`);
  
  // Continue conversation with GPT-4
  const gptResponse = await chatService.sendMessage(
    "Now provide entry signals based on that analysis",
    { useTools: false }
  );
  console.log(`GPT-4 response time: ${gptResponse.executionTime}ms`);
  
  // Switch to Gemini for cost-effective follow-up
  await chatService.switchProvider('google');
  session = chatService.getCurrentSession()!;
  console.log(`Switched to: ${session.provider}`);
  
  const geminiResponse = await chatService.sendMessage(
    "Summarize the key points",
    { useTools: false }
  );
  console.log(`Gemini response time: ${geminiResponse.executionTime}ms`);
  
  console.log('\n📊 Session Summary:');
  console.log(`Total cost: $${session.totalCost.toFixed(4)}`);
  console.log(`Total tokens: ${session.totalTokens}`);
  console.log(`Messages: ${session.messages.length}`);
  
  chatService.endSession();
}

/**
 * Demo 6: Tool Orchestration Showcase
 */
async function demoToolOrchestration() {
  console.log('🛠️ Demo 6: Tool Orchestration with FastMCP');
  
  const chatService = createChatService(demoConfig);
  await chatService.startSession('anthropic'); // Claude is best for complex analysis
  
  const analysisQueries = [
    "Complete analysis of BTCUSDT with Wyckoff and SMC",
    "Find order blocks and fair value gaps in ETHUSDT", 
    "Analyze volume patterns and institutional flow in SOLUSDT"
  ];
  
  for (const [index, query] of analysisQueries.entries()) {
    console.log(`\n--- Analysis ${index + 1}: ${query} ---`);
    
    const response = await chatService.sendMessage(query, {
      useTools: true,
      symbol: query.includes('BTC') ? 'BTCUSDT' : 
              query.includes('ETH') ? 'ETHUSDT' : 'SOLUSDT'
    });
    
    console.log(`🔧 Tools executed: ${response.toolsUsed?.length || 0}`);
    console.log(`📋 Tools used: ${response.toolsUsed?.join(', ') || 'None'}`);
    console.log(`💰 Cost: $${response.cost.toFixed(4)}`);
    console.log(`⏱️ Time: ${response.executionTime}ms`);
    console.log(`📊 Response length: ${response.response.length} chars`);
  }
  
  chatService.endSession();
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log('🎭 Running Multi-LLM Architecture Demos\n');
  
  try {
    await demoBasicUsage();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await demoProviderComparison();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await demoSmartProviderSelection();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await demoStreamingResponse();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await demoDynamicSwitching();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await demoToolOrchestration();
    
    console.log('\n🎉 All demos completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Export individual demos for testing
export {
  demoBasicUsage,
  demoProviderComparison, 
  demoSmartProviderSelection,
  demoStreamingResponse,
  demoDynamicSwitching,
  demoToolOrchestration
}; 