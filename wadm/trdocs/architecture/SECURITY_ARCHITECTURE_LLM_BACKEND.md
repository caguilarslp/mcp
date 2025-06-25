# CRITICAL: LLM Security Architecture - Backend Only

**Date**: 2025-06-25  
**Priority**: CRITICAL 🚨  
**Status**: SECURITY ISSUE IDENTIFIED  
**Impact**: HIGH SECURITY RISK

## 🚨 **PROBLEMA CRÍTICO IDENTIFICADO**

### **❌ CONFIGURACIÓN ACTUAL (INSEGURA)**:

```typescript
// ❌ PELIGROSO: API Keys de LLM en Frontend
export class AnthropicProvider extends BaseLLMProvider {
  constructor(config: LLMConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,  // ← API KEY EXPUESTA AL CLIENTE
      dangerouslyAllowBrowser: true // ← CONFIGURACIÓN PELIGROSA
    });
  }
}

// ❌ PELIGROSO: Variables de entorno en cliente
const demo = {
  apiKeys: {
    anthropic: process.env.VITE_ANTHROPIC_API_KEY, // ← EXPUESTO EN BUNDLE
    openai: process.env.VITE_OPENAI_API_KEY,       // ← EXPUESTO EN BUNDLE
    google: process.env.VITE_GOOGLE_API_KEY        // ← EXPUESTO EN BUNDLE
  }
};
```

### **🔥 RIESGOS DE SEGURIDAD**:

1. **API Keys expuestas** - Cualquiera puede ver las keys en DevTools
2. **Costos descontrolados** - Usuarios pueden hacer requests ilimitados
3. **Rate limiting bypass** - Sin control de uso
4. **Abuse potential** - Keys pueden ser extraídas y usadas externamente
5. **CORS vulnerabilities** - `dangerouslyAllowBrowser: true`

## ✅ **NUEVA ARQUITECTURA SEGURA**

### **🏗️ BACKEND-ONLY LLM ARCHITECTURE**

```python
# ✅ SEGURO: LLM Service solo en Backend
class LLMService:
    def __init__(self):
        # API Keys solo en servidor, nunca expuestas
        self.providers = {
            'anthropic': AnthropicClient(api_key=os.getenv('ANTHROPIC_API_KEY')),
            'openai': OpenAIClient(api_key=os.getenv('OPENAI_API_KEY')),
            'google': GoogleClient(api_key=os.getenv('GOOGLE_API_KEY'))
        }
        
    async def analyze_market(self, query: str, context: dict, user_id: str):
        # Rate limiting por usuario
        await self.check_rate_limit(user_id)
        
        # Validar permisos
        await self.check_permissions(user_id, 'llm_analysis')
        
        # Sanitizar datos
        safe_context = self.sanitize_context(context)
        
        # Llamar LLM
        result = await self.providers['anthropic'].analyze(query, safe_context)
        
        # Log para auditoría
        await self.log_llm_usage(user_id, query, result.tokens_used)
        
        return result
```

### **🔐 FRONTEND SECURITY**

```typescript
// ✅ SEGURO: Frontend solo hace requests a nuestro API
class ChatService {
  private api: ApiService;
  
  async sendMessage(message: string, options?: ChatOptions): Promise<ChatResponse> {
    // Solo request a nuestro backend
    return await this.api.post('/api/v1/chat/analyze', {
      message,
      options,
      // No API keys, no configuración LLM
    });
  }
  
  async streamMessage(message: string): Promise<ReadableStream> {
    // Stream desde nuestro backend
    return await this.api.stream('/api/v1/chat/stream', {
      message
    });
  }
}
```

## 🏗️ **IMPLEMENTACIÓN BACKEND**

### **Nueva Estructura de Servicios**:

```python
src/api/services/
├── llm/
│   ├── __init__.py
│   ├── llm_service.py           # 🆕 Core LLM service
│   ├── providers/
│   │   ├── anthropic_provider.py # 🆕 Server-side Anthropic
│   │   ├── openai_provider.py    # 🆕 Server-side OpenAI
│   │   └── google_provider.py    # 🆕 Server-side Google
│   ├── context_builder.py       # 🆕 Market context builder
│   ├── prompt_templates.py      # 🆕 Prompt management
│   └── security.py              # 🆕 Rate limiting, sanitization
├── chat/
│   ├── chat_service.py          # 🆕 Chat session management
│   ├── message_handler.py       # 🆕 Message processing
│   └── streaming.py             # 🆕 SSE streaming
```

### **Core LLM Service**:

```python
# src/api/services/llm/llm_service.py
from typing import Dict, Any, Optional
import os
import asyncio
from datetime import datetime, timedelta

from .providers.anthropic_provider import AnthropicProvider
from .providers.openai_provider import OpenAIProvider
from .providers.google_provider import GoogleProvider
from .context_builder import MarketContextBuilder
from .security import RateLimiter, DataSanitizer

class LLMService:
    """Secure LLM service - Backend only"""
    
    def __init__(self):
        # Initialize providers with server-side API keys
        self.providers = {
            'anthropic': AnthropicProvider(os.getenv('ANTHROPIC_API_KEY')),
            'openai': OpenAIProvider(os.getenv('OPENAI_API_KEY')),
            'google': GoogleProvider(os.getenv('GOOGLE_API_KEY'))
        }
        
        self.context_builder = MarketContextBuilder()
        self.rate_limiter = RateLimiter()
        self.sanitizer = DataSanitizer()
        
    async def analyze_market(
        self, 
        query: str, 
        symbol: str,
        user_id: str,
        analysis_type: str = 'standard'
    ) -> Dict[str, Any]:
        """Analyze market with LLM - secure backend method"""
        
        # 1. Rate limiting
        await self.rate_limiter.check_limit(user_id, 'llm_analysis')
        
        # 2. Build secure context
        context = await self.context_builder.build_context(symbol)
        safe_context = self.sanitizer.sanitize_market_context(context)
        
        # 3. Select optimal provider
        provider = self.select_provider(analysis_type, len(query))
        
        # 4. Execute analysis
        result = await provider.analyze(
            query=query,
            context=safe_context,
            analysis_type=analysis_type
        )
        
        # 5. Log usage
        await self.log_usage(user_id, provider.name, result.tokens_used)
        
        return {
            'analysis': result.content,
            'provider': provider.name,
            'tokens_used': result.tokens_used,
            'cost': result.cost,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def select_provider(self, analysis_type: str, query_length: int) -> Any:
        """Smart provider selection based on analysis type"""
        if analysis_type == 'wyckoff' or analysis_type == 'smc':
            return self.providers['anthropic']  # Best for pattern analysis
        elif analysis_type == 'quick' or query_length < 100:
            return self.providers['google']     # Fast and cheap
        else:
            return self.providers['openai']     # Balanced default
```

### **Security Layer**:

```python
# src/api/services/llm/security.py
from typing import Dict, Any
import json
import re
from datetime import datetime, timedelta

class RateLimiter:
    """Rate limiting for LLM requests"""
    
    def __init__(self):
        self.user_limits = {}
        
    async def check_limit(self, user_id: str, action: str):
        """Check if user is within rate limits"""
        key = f"{user_id}:{action}"
        now = datetime.utcnow()
        
        if key not in self.user_limits:
            self.user_limits[key] = []
        
        # Clean old requests (older than 1 hour)
        self.user_limits[key] = [
            req_time for req_time in self.user_limits[key]
            if now - req_time < timedelta(hours=1)
        ]
        
        # Check limits
        if len(self.user_limits[key]) >= 50:  # 50 requests per hour
            raise HTTPException(429, "Rate limit exceeded")
        
        # Add current request
        self.user_limits[key].append(now)

class DataSanitizer:
    """Sanitize data before sending to LLM"""
    
    def sanitize_market_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive information from market context"""
        safe_context = context.copy()
        
        # Remove user-specific data
        safe_context.pop('user_positions', None)
        safe_context.pop('user_balance', None)
        safe_context.pop('api_keys', None)
        
        # Limit historical data
        if 'historical_data' in safe_context:
            safe_context['historical_data'] = safe_context['historical_data'][-100:]
        
        return safe_context
```

## 📈 **API ENDPOINTS SEGUROS**

### **Chat & Analysis Endpoints**:

```python
# src/api/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from src.api.dependencies import verify_api_key
from src.api.services.llm.llm_service import LLMService

router = APIRouter()
llm_service = LLMService()

@router.post("/chat/analyze")
async def analyze_market(
    request: ChatAnalysisRequest,
    api_key: APIKeyInfo = Depends(verify_api_key)
):
    """Secure market analysis with LLM"""
    try:
        result = await llm_service.analyze_market(
            query=request.message,
            symbol=request.symbol,
            user_id=api_key.id,
            analysis_type=request.analysis_type
        )
        return result
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")

@router.post("/chat/stream")
async def stream_analysis(
    request: ChatStreamRequest,
    api_key: APIKeyInfo = Depends(verify_api_key)
):
    """Secure streaming analysis"""
    
    async def generate_stream():
        async for chunk in llm_service.stream_analysis(
            query=request.message,
            symbol=request.symbol,
            user_id=api_key.id
        ):
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream"
    )
```

### **Request Models**:

```python
# src/api/models/chat.py
from pydantic import BaseModel, Field
from typing import Optional, Literal

class ChatAnalysisRequest(BaseModel):
    message: str = Field(..., max_length=1000)
    symbol: str = Field(..., regex=r'^[A-Z]{3,10}USDT$')
    analysis_type: Literal['quick', 'standard', 'wyckoff', 'smc'] = 'standard'
    include_context: bool = True

class ChatStreamRequest(BaseModel):
    message: str = Field(..., max_length=1000)
    symbol: str = Field(..., regex=r'^[A-Z]{3,10}USDT$')
    stream_type: Literal['analysis', 'explanation'] = 'analysis'
```

## 🔄 **MIGRACIÓN PLAN**

### **Phase 1: Backend Implementation** (3 días)
- [ ] Implementar LLM service en backend
- [ ] Crear providers server-side
- [ ] Implementar rate limiting y security
- [ ] Crear endpoints seguros

### **Phase 2: Frontend Refactor** (2 días)
- [ ] Remover todas las API keys del frontend
- [ ] Refactorizar ChatService para usar backend
- [ ] Implementar streaming desde backend
- [ ] Remover providers del frontend

### **Phase 3: Security Hardening** (1 día)
- [ ] Implementar logging y auditoría
- [ ] Configurar monitoring de costos
- [ ] Testing de seguridad
- [ ] Documentación de endpoints

## 🔐 **CONFIGURACIÓN SEGURA**

### **Environment Variables (Backend only)**:
```bash
# .env (server only, never in frontend)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIza...

# Rate limiting
LLM_RATE_LIMIT_PER_HOUR=50
LLM_RATE_LIMIT_PER_DAY=200

# Cost controls
LLM_MAX_COST_PER_USER_DAY=10.00
LLM_MAX_TOKENS_PER_REQUEST=4000
```

### **Frontend Configuration (No secrets)**:
```typescript
// ✅ SEGURO: Solo configuración de UI
export const chatConfig = {
  maxMessageLength: 1000,
  streamingEnabled: true,
  analysisTypes: ['quick', 'standard', 'wyckoff', 'smc'],
  // No API keys, no secrets
};
```

## 📊 **BENEFITS**

### **Security**:
- ✅ **Zero API key exposure** - Keys never leave server
- ✅ **Rate limiting** - Control usage per user
- ✅ **Cost control** - Monitor and limit expenses
- ✅ **Audit trail** - Log all LLM usage
- ✅ **Data sanitization** - No sensitive data to LLM

### **Performance**:
- ✅ **Server-side caching** - Cache LLM responses
- ✅ **Smart routing** - Optimal provider selection
- ✅ **Connection pooling** - Efficient API usage
- ✅ **Streaming** - Real-time responses

### **Scalability**:
- ✅ **Centralized control** - All LLM logic in one place
- ✅ **Easy monitoring** - Server-side metrics
- ✅ **Provider switching** - Change providers without frontend updates
- ✅ **A/B testing** - Test different providers/prompts

## 🚨 **IMMEDIATE ACTION REQUIRED**

### **CRITICAL FIXES**:
1. **Remove all LLM API keys from frontend** - ASAP
2. **Disable `dangerouslyAllowBrowser`** - Security risk
3. **Remove environment variables from VITE** - Exposed in bundle
4. **Implement backend LLM service** - Secure architecture

### **Priority Order**:
1. 🔥 **Security fixes** (remove keys from frontend)
2. 🚀 **Backend LLM service** (implement secure service)
3. ⚡ **Frontend refactor** (use backend endpoints)
4. 📊 **Monitoring & logging** (track usage and costs)

---

**Status**: 🚨 **CRITICAL SECURITY ISSUE**  
**Action**: **IMMEDIATE** - Remove API keys from frontend  
**Timeline**: 3-5 days for complete secure implementation  
**Impact**: **FOUNDATIONAL** - Enables secure LLM integration 