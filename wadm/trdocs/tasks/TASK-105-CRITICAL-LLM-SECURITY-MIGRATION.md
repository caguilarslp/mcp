# TASK-105: CRITICAL - LLM Security Migration to Backend

**Date**: 2025-06-25  
**Priority**: CRITICAL 🚨  
**Status**: URGENT  
**Category**: Security

## 🚨 **PROBLEMA CRÍTICO IDENTIFICADO**

### **VULNERABILIDADES ACTUALES**:
- ❌ **API Keys expuestas** en frontend bundle
- ❌ **`dangerouslyAllowBrowser: true`** en providers
- ❌ **Variables VITE_** con secrets en cliente
- ❌ **Sin rate limiting** de costos LLM
- ❌ **Sin control de acceso** a providers

### **RIESGO**: 
- **Costos descontrolados** - Usuarios pueden extraer keys
- **Abuse potential** - Keys usadas externamente
- **Security breach** - Acceso no autorizado a LLMs

## 🎯 **OBJETIVO**

Migrar **TODA la lógica LLM al backend** para seguridad máxima:
- ✅ **API Keys solo en servidor**
- ✅ **Rate limiting por usuario** 
- ✅ **Control de costos**
- ✅ **Auditoría completa**
- ✅ **Frontend seguro** (sin secrets)

## 🏗️ **IMPLEMENTACIÓN**

### **Phase 1: Backend LLM Service** (2 días)

#### **Nueva Estructura**:
```python
src/api/services/llm/
├── __init__.py
├── llm_service.py              # Core service
├── providers/
│   ├── __init__.py
│   ├── anthropic_provider.py   # Server-side Anthropic
│   ├── openai_provider.py      # Server-side OpenAI
│   └── google_provider.py      # Server-side Google
├── context_builder.py          # Market context
├── prompt_templates.py         # Prompt management
├── security.py                 # Rate limiting, sanitization
└── streaming.py                # SSE streaming
```

#### **Core LLM Service**:
```python
# src/api/services/llm/llm_service.py
class LLMService:
    def __init__(self):
        # API Keys solo en servidor
        self.providers = {
            'anthropic': AnthropicProvider(os.getenv('ANTHROPIC_API_KEY')),
            'openai': OpenAIProvider(os.getenv('OPENAI_API_KEY')),
            'google': GoogleProvider(os.getenv('GOOGLE_API_KEY'))
        }
        
    async def analyze_market(self, query: str, symbol: str, user_id: str):
        # Rate limiting por usuario
        await self.check_rate_limit(user_id)
        
        # Build context from our indicators
        context = await self.build_market_context(symbol)
        
        # Select optimal provider
        provider = self.select_provider(query, context)
        
        # Execute analysis
        result = await provider.analyze(query, context)
        
        # Log usage for billing/monitoring
        await self.log_usage(user_id, result.tokens_used, result.cost)
        
        return result
```

#### **Security Layer**:
```python
# src/api/services/llm/security.py
class RateLimiter:
    async def check_limit(self, user_id: str, action: str):
        # 50 requests per hour per user
        # $10 max cost per user per day
        # Block if exceeded
        
class DataSanitizer:
    def sanitize_context(self, context: dict) -> dict:
        # Remove sensitive data before sending to LLM
        # No user positions, balances, API keys
```

### **Phase 2: Secure API Endpoints** (1 día)

```python
# src/api/routers/chat.py
@router.post("/chat/analyze")
async def analyze_market(
    request: ChatRequest,
    api_key: APIKeyInfo = Depends(verify_api_key)
):
    result = await llm_service.analyze_market(
        query=request.message,
        symbol=request.symbol,
        user_id=api_key.id
    )
    return result

@router.post("/chat/stream")
async def stream_analysis(
    request: ChatRequest,
    api_key: APIKeyInfo = Depends(verify_api_key)
):
    return StreamingResponse(
        llm_service.stream_analysis(request, api_key.id),
        media_type="text/event-stream"
    )
```

### **Phase 3: Frontend Security Cleanup** (1 día)

#### **Remove Dangerous Code**:
```typescript
// ❌ REMOVE THESE FILES:
// - app/src/services/llm/providers/anthropic.ts
// - app/src/services/llm/providers/openai.ts  
// - app/src/services/llm/providers/google.ts
// - app/src/services/llm/demo.ts (with API keys)

// ❌ REMOVE FROM .env:
// - VITE_ANTHROPIC_API_KEY
// - VITE_OPENAI_API_KEY
// - VITE_GOOGLE_API_KEY
```

#### **New Secure Frontend**:
```typescript
// ✅ NEW: Secure chat service
class ChatService {
  async sendMessage(message: string, symbol: string): Promise<ChatResponse> {
    // Only call our secure backend
    return await this.api.post('/api/v1/chat/analyze', {
      message,
      symbol
    });
  }
  
  async streamMessage(message: string, symbol: string): Promise<EventSource> {
    // Stream from our secure backend
    return new EventSource(`/api/v1/chat/stream?message=${message}&symbol=${symbol}`);
  }
}
```

## 📋 **IMPLEMENTATION CHECKLIST**

### **Day 1: Backend Core**
- [ ] Create `src/api/services/llm/` structure
- [ ] Implement `LLMService` class
- [ ] Create server-side providers (Anthropic, OpenAI, Google)
- [ ] Implement rate limiting and security
- [ ] Basic market context builder

### **Day 2: API Endpoints**
- [ ] Create `/api/v1/chat/analyze` endpoint
- [ ] Create `/api/v1/chat/stream` endpoint  
- [ ] Implement SSE streaming
- [ ] Add request/response models
- [ ] Integration testing

### **Day 3: Frontend Security**
- [ ] Remove all LLM providers from frontend
- [ ] Remove API keys from environment
- [ ] Refactor ChatService to use backend
- [ ] Update components to use new service
- [ ] Remove `dangerouslyAllowBrowser` configurations

### **Day 4: Testing & Monitoring**
- [ ] End-to-end testing
- [ ] Cost monitoring setup
- [ ] Usage logging and analytics
- [ ] Security testing
- [ ] Performance optimization

## 🔐 **SECURITY FEATURES**

### **Rate Limiting**:
```python
# Per user limits
LIMITS = {
    'requests_per_hour': 50,
    'requests_per_day': 200,
    'cost_per_day_usd': 10.00,
    'tokens_per_request': 4000
}
```

### **Data Sanitization**:
```python
def sanitize_context(context):
    # Remove sensitive fields
    safe_context = {
        'symbol': context['symbol'],
        'price': context['current_price'],
        'indicators': context['indicators'],
        # NO user data, positions, balances
    }
    return safe_context
```

### **Audit Logging**:
```python
await log_llm_usage({
    'user_id': user_id,
    'query': query[:100],  # First 100 chars only
    'provider': provider_name,
    'tokens_used': tokens,
    'cost': cost,
    'timestamp': datetime.utcnow(),
    'success': True
})
```

## 📊 **BENEFITS**

### **Security**:
- ✅ **Zero API key exposure**
- ✅ **Cost control per user**
- ✅ **Rate limiting enforcement**
- ✅ **Complete audit trail**
- ✅ **Data sanitization**

### **Performance**:
- ✅ **Server-side caching**
- ✅ **Connection pooling**
- ✅ **Smart provider routing**
- ✅ **Optimized context building**

### **Business**:
- ✅ **Cost predictability**
- ✅ **Usage analytics**
- ✅ **Scalable architecture**
- ✅ **Enterprise ready**

## 🚨 **IMMEDIATE ACTIONS**

### **TODAY**:
1. **Remove API keys** from all frontend files
2. **Disable LLM features** temporarily
3. **Start backend implementation**

### **THIS WEEK**:
1. **Complete backend LLM service**
2. **Secure API endpoints**
3. **Frontend security cleanup**
4. **Testing and monitoring**

## 📈 **SUCCESS METRICS**

- [ ] **Zero API keys** in frontend bundle
- [ ] **Rate limiting** working (429 errors for abuse)
- [ ] **Cost tracking** per user
- [ ] **Audit logs** for all LLM usage
- [ ] **Performance** <2s response time
- [ ] **Security scan** passes (no exposed secrets)

---

**Status**: 🚨 **CRITICAL SECURITY ISSUE**  
**Timeline**: 4 days maximum  
**Dependencies**: None - can start immediately  
**Impact**: **FOUNDATIONAL** - Enables secure LLM features 