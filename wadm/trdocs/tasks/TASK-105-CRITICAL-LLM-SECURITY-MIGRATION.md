# TASK-105: CRITICAL - LLM Security Migration to Backend

**Date**: 2025-06-25  
**Priority**: CRITICAL 🚨  
**Status**: IN PROGRESS (Fase 1-2 COMPLETED)  
**Category**: Security  
**Duration**: 4 días (5 fases)

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

## 🏗️ **FASES DE IMPLEMENTACIÓN**

### **📦 FASE 1: Backend LLM Foundation** (Día 1 - 6 horas)
**Objetivo**: Crear la estructura base del servicio LLM en el backend

#### **Entregables**:
- [ ] Estructura de directorios `src/api/services/llm/`
- [ ] Clase base `LLMService`
- [ ] Configuración de variables de entorno seguras
- [ ] Logging y monitoring básico

#### **Implementación**:
```python
src/api/services/llm/
├── __init__.py
├── llm_service.py              # Core service
├── config.py                   # Environment variables
├── security.py                 # Rate limiting base
└── models.py                   # Request/Response models
```

#### **Checklist Día 1**:
- [x] Crear estructura de archivos ✅ COMPLETED
- [x] Implementar `LLMService` clase base ✅ COMPLETED
- [x] Configurar environment variables ✅ COMPLETED
- [x] Setup logging básico ✅ COMPLETED
- [x] Tests unitarios básicos ✅ COMPLETED

---

### **🔌 FASE 2: LLM Providers Integration** (Día 1-2 - 8 horas)
**Objetivo**: Implementar providers server-side seguros

#### **Entregables**:
- [ ] Anthropic provider server-side
- [ ] OpenAI provider server-side  
- [ ] Google provider server-side
- [ ] Provider abstraction layer
- [ ] Error handling robusto

#### **Implementación**:
```python
src/api/services/llm/providers/
├── __init__.py
├── base_provider.py            # Abstract base
├── anthropic_provider.py       # Server-side Anthropic
├── openai_provider.py          # Server-side OpenAI
└── google_provider.py          # Server-side Google
```

#### **Checklist Día 1-2**:
- [x] Implementar `BaseProvider` abstraction ✅ COMPLETED
- [x] Crear `AnthropicProvider` server-side ✅ COMPLETED
- [x] Crear `OpenAIProvider` server-side ✅ COMPLETED
- [x] Crear `GoogleProvider` server-side ✅ COMPLETED
- [x] Provider selection logic ✅ COMPLETED
- [x] Connection pooling ✅ COMPLETED
- [x] Error handling y retry logic ✅ COMPLETED

---

### **🔐 FASE 3: Security & Rate Limiting** (Día 2 - 4 horas)
**Objetivo**: Implementar seguridad y control de costos

#### **Entregables**:
- [ ] Rate limiting por usuario
- [ ] Cost tracking y limits
- [ ] Data sanitization
- [ ] Audit logging
- [ ] Security headers

#### **Implementación**:
```python
# Rate limiting system
LIMITS = {
    'requests_per_hour': 50,
    'requests_per_day': 200,
    'cost_per_day_usd': 10.00,
    'tokens_per_request': 4000
}
```

#### **Checklist Día 2**:
- [ ] Implementar `RateLimiter` class
- [ ] Cost tracking por usuario
- [ ] Data sanitization funciones
- [ ] Audit logging system
- [ ] Security middleware
- [ ] Usage analytics básico

---

### **🌐 FASE 4: Secure API Endpoints** (Día 2-3 - 6 horas)
**Objetivo**: Crear endpoints seguros para el frontend

#### **Entregables**:
- [ ] `/api/v1/chat/analyze` endpoint
- [ ] `/api/v1/chat/stream` endpoint
- [ ] Request/Response validation
- [ ] SSE streaming implementation
- [ ] API documentation

#### **Implementación**:
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
```

#### **Checklist Día 2-3**:
- [ ] Crear router `/api/v1/chat/`
- [ ] Implementar `/analyze` endpoint
- [ ] Implementar `/stream` endpoint
- [ ] Pydantic models para validation
- [ ] SSE streaming setup
- [ ] API key authentication
- [ ] OpenAPI documentation

---

### **🧹 FASE 5: Frontend Security Cleanup** (Día 3-4 - 6 horas)
**Objetivo**: Eliminar vulnerabilidades del frontend

#### **Entregables**:
- [ ] Remover API keys expuestas
- [ ] Eliminar providers inseguros
- [ ] Refactorizar ChatService
- [ ] Actualizar componentes
- [ ] Cleanup environment variables

#### **Archivos a ELIMINAR**:
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

#### **Nuevo ChatService Seguro**:
```typescript
class ChatService {
  async sendMessage(message: string, symbol: string): Promise<ChatResponse> {
    return await this.api.post('/api/v1/chat/analyze', {
      message,
      symbol
    });
  }
  
  async streamMessage(message: string, symbol: string): Promise<EventSource> {
    return new EventSource(`/api/v1/chat/stream?message=${message}&symbol=${symbol}`);
  }
}
```

#### **Checklist Día 3-4**:
- [ ] Eliminar archivos con API keys
- [ ] Remover variables VITE_ inseguras
- [ ] Refactorizar `ChatService`
- [ ] Actualizar componentes React
- [ ] Remover `dangerouslyAllowBrowser`
- [ ] Testing frontend-backend integration

---

### **🧪 FASE 6: Testing & Monitoring** (Día 4 - 4 horas)
**Objetivo**: Verificar seguridad y performance

#### **Entregables**:
- [ ] End-to-end testing
- [ ] Security scanning
- [ ] Performance testing
- [ ] Monitoring dashboard
- [ ] Documentation final

#### **Tests Críticos**:
- [ ] No API keys en bundle frontend
- [ ] Rate limiting funciona (429 errors)
- [ ] Cost tracking preciso
- [ ] Audit logs completos
- [ ] Response time < 2s
- [ ] Security headers correctos

#### **Checklist Día 4**:
- [ ] E2E tests frontend → backend → LLM
- [ ] Security scan (no secrets exposed)
- [ ] Performance benchmarks
- [ ] Monitoring alerts setup
- [ ] Usage analytics dashboard
- [ ] Documentation actualizada

## 📊 **TIMELINE DETALLADO**

```
Día 1:  [████████] FASE 1 + FASE 2 (Foundation + Providers) ✅ COMPLETED
Día 2:  [██░░░░░░] FASE 3 + FASE 4 (Security + API Endpoints) 🔄 IN PROGRESS
Día 3:  [░░░░░░░░] FASE 5 (Frontend Cleanup) ⏳ PENDING
Día 4:  [░░░░░░░░] FASE 6 (Testing & Monitoring) ⏳ PENDING
```

## 🎯 **SUCCESS METRICS**

- [ ] **Zero API keys** in frontend bundle
- [ ] **Rate limiting** working (429 errors for abuse)
- [ ] **Cost tracking** per user accurate
- [ ] **Audit logs** for all LLM usage
- [ ] **Performance** <2s response time
- [ ] **Security scan** passes (no exposed secrets)

## 🚨 **IMMEDIATE ACTIONS**

### **ANTES DE EMPEZAR**:
1. **Backup current code** - Git commit
2. **Remove API keys** from frontend (temporary disable)
3. **Document current LLM usage** - Para migration

### **READY TO START**:
- [ ] Environment variables preparadas
- [ ] Backend development environment
- [ ] Testing plan ready

---

**Status**: 🚨 **CRITICAL SECURITY ISSUE**  
**Timeline**: 4 días (6 fases específicas)  
**Dependencies**: None - can start immediately  
**Impact**: **FOUNDATIONAL** - Enables secure LLM features
**Next Action**: **FASE 1 - Backend LLM Foundation** 