# TASK-064: Dashboard MVP - Fases Detalladas

## 🎯 Objetivo General
Crear Dashboard MVP con Vite + React + Mantine que consuma la API operacional en api.waickoff.com y proporcione acceso visual a las 133 herramientas MCP.

## 📊 Estado del Proyecto Base
- ✅ **API**: api.waickoff.com completamente operacional
- ✅ **MCP Server**: 133 herramientas funcionando
- ✅ **Auth System**: API Keys y sesiones operacionales
- ✅ **Business Model**: $1/sesión definido
- ✅ **4 Exchanges**: Bybit, Binance, Coinbase, Kraken operacionales

## 🏗️ Arquitectura Establecida
```
DESARROLLO LOCAL (Actual):
Frontend (localhost:3000) → API (localhost:8000) → MCP Server + 4 Exchanges

PRODUCCIÓN (Futuro VPS):
Frontend (app.waickoff.com) → API (api.waickoff.com) → MCP Server + 4 Exchanges
```

## 🔧 Configuración Actual
- **Docker Local**: API en localhost:8000 operacional ✅
- **MCP Integration**: 133 herramientas funcionando ✅
- **Environment**: app.env (primary) + .env (clone para compatibilidad)
- **Opcional**: Dominios locales api.waickoff.local, app.waickoff.local (via hosts)

---

## 📋 FASE 1: Setup + Infraestructura Base (Día 1)

### 🎯 Objetivo
Configurar proyecto base y layout principal funcionando

### ✅ Tareas Específicas
- [ ] **Proyecto Base**
  - Crear proyecto: `npm create vite@latest wadm-dashboard -- --template react-ts`
  - Configurar package.json con dependencias exactas
  - Setup de TypeScript estricto
  
- [ ] **Dependencias Core**
  ```bash
  npm install @mantine/core @mantine/hooks @mantine/notifications
  npm install @mantine/dates @mantine/spotlight
  npm install zustand axios react-router-dom
  npm install lightweight-charts @types/lightweight-charts
  npm install -D @types/node
  ```

- [ ] **Estructura de Carpetas**
  ```
  src/
  ├── components/
  │   ├── Layout/
  │   ├── Auth/
  │   ├── Charts/
  │   └── MCP/
  ├── hooks/
  ├── services/
  ├── store/
  ├── types/
  └── utils/
  ```

- [ ] **Configuración Base**
  - Vite config para proxy a localhost:8000 (API Docker)
  - Variables de entorno (app.env primary + .env clone)
  - Configurar Mantine provider con dark theme
  - Setup de router principal
  - Opcional: hosts locales para dominios amigables

- [ ] **Layout Principal**
  - AppShell con Navbar y Header
  - Sidebar responsive
  - Top bar con selector de símbolos
  - Footer con estado de conexión

### 📦 Entregable
Aplicación base funcionando con layout responsivo y navegación

---

## 📋 FASE 2: Autenticación Completa + 2FA (Día 2)

### 🎯 Objetivo
Sistema completo de autenticación con Sign Up, Login, 2FA y onboarding

### ✅ Tareas Específicas
- [ ] **Sistema de Registro**
  - Sign Up: Email, Password, Full Name, Company (opcional)
  - Validación de email en tiempo real
  - Validación de contraseña fuerte (8+ chars, mayús, minús, números)
  - Términos y condiciones checkbox
  - Envío de código de verificación por email (MOCK)

- [ ] **Sistema de Login**
  - Login: Email + Password
  - "Remember me" checkbox
  - "Forgot password" flow
  - Rate limiting por IP (5 intentos/10min)
  - Redirección inteligente post-login

- [ ] **Sistema 2FA por Email**
  - Código de 6 dígitos enviado por email
  - Válido por 10 minutos
  - Reenvío de código (max 3 veces)
  - Interfaz de verificación elegante
  - Bypass 2FA para desarrollo (toggle)

- [ ] **Onboarding de 3 Pasos**
  - Paso 1: Bienvenida + Explicación del modelo $1/sesión
  - Paso 2: Setup de pago (MOCK - Stripe UI fake)
  - Paso 3: Tour del dashboard + primer análisis gratuito
  - Progreso visual con stepper

- [ ] **Perfil de Usuario**
  - Gestión de datos personales
  - Cambio de contraseña
  - Configuración de 2FA (on/off)
  - Historial de sesiones y facturación
  - Logout seguro

### 📦 Entregable
Sistema de autenticación completo con onboarding y 2FA funcional

---

## 📋 FASE 3: Multi-LLM Chat Intelligence + Análisis Profesional (Día 3)

### 🎯 Objetivo
Chat revolucionario con **Multi-LLM Architecture** (Anthropic, OpenAI, Google) + FastMCP 2.8.0 que genere sesiones productivas de $2 con mega reportes profesionales

### 🏗️ **Arquitectura Técnica**
```
Frontend Chat → Multi-LLM Gateway → FastMCP 2.8.0 → 133 Tools → Analysis
```

### ✅ Tareas Específicas

#### **3A: Multi-LLM Service Layer (2-3 días)** 
- [ ] **LLM Providers Setup**
  - Anthropic SDK (@anthropic-ai/sdk) - Claude Sonnet 4
  - OpenAI SDK (openai) - GPT-4, GPT-4-turbo
  - Google SDK (@google/generative-ai) - Gemini Pro
  - Provider abstraction interface común

- [ ] **Provider Management**
  - Factory pattern para switching providers
  - Configuration management por provider
  - Cost tracking y token usage per provider
  - Fallback strategies (provider downtime)

- [ ] **Chat Interface Base**
  - Streaming responses con provider selection
  - Real-time typing indicators per provider
  - Provider-specific feature toggles
  - Token usage display y cost tracking

#### **3B: Smart Tool Orchestration (2-3 días)**
- [ ] **LLM-Driven Tool Selection**
  - Prompt engineering para tool planning
  - Context-aware tool recommendation
  - Multi-step workflow orchestration
  - Tool result synthesis by LLM

- [ ] **FastMCP Integration** ✅ (Ya operacional)
  - HTTP wrapper ya funcionando
  - 133 tools disponibles
  - Real-time tool execution
  - Results formatting y error handling

#### **3C: Advanced Chat Features (2-3 días)**
- [ ] **Smart Symbol Detection Engine**
  - NLP processing para detectar símbolos en chat natural
  - Context-aware suggestions basadas en perfil usuario
  - Eliminación completa del dropdown tradicional
  - Auto-detection: "Bitcoin" → BTCUSDT automáticamente
  - Multi-symbol analysis: "Compara ETH vs SOL"

- [ ] **Mega Report Generator**
  - **Multi-Provider Synthesis**: Diferentes LLMs para diferentes análisis
  - **Comprehensive Analysis**: Multi-timeframe Wyckoff + SMC analysis
  - **Cross-Exchange Validation**: Arbitrage opportunities detection
  - **Risk Management**: Específicas strategies con probabilidades
  - **Entry/Exit Points**: Con confidence scoring

- [ ] **Professional Consultation Flow**
  - **Session-based conversations**: 24h/$2 value proposition
  - **Strategy clarification**: Follow-up questions inteligentes
  - **Personalized trading plans**: Basado en user profile
  - **Educational explanations**: Why, not just what
  - **Provider optimization**: Best LLM for each query type

### 🎯 **Multi-LLM Strategy**

#### **Provider Specialization**
- **Anthropic Claude**: Deep analysis, educational explanations
- **OpenAI GPT-4**: Conversational, quick responses, general chat
- **Google Gemini**: Experimental features, multimodal analysis

#### **Cost Optimization**
- **Cheap queries**: Gemini Pro ($0.001/1K tokens)
- **Standard analysis**: GPT-4 ($0.03/1K tokens)  
- **Deep analysis**: Claude Sonnet ($0.015/1K tokens)
- **User choice**: Premium users select preferred provider

### 📦 Entregable
**Multi-LLM Chat Intelligence Platform** que genere sesiones de consultoría de $2 con valor real:
- 3 LLM providers con switching inteligente
- FastMCP 2.8.0 integration con 133 tools
- Smart symbol detection y tool orchestration
- Mega reports con multi-provider synthesis
- Professional consultation flow optimizado

---

## 📋 FASE 4: Visualización Avanzada + Export Profesional (Día 4)

### 🎯 Objetivo
Visualizaciones que complementen el chat con reportes exportables y charts anotados por IA

### ✅ Tareas Específicas
- [ ] **Charts con IA Annotations**
  - TradingView Lightweight Charts integrado con chat
  - AI-generated annotations en timeframes múltiples
  - Wyckoff phases overlay con explicaciones
  - SMC levels con reasoning automático
  - Entry/exit zones con probability scoring

- [ ] **Market Intelligence Dashboard (NUEVO)**
  - Proactive symbol suggestions basadas en momentum
  - Portfolio context integration
  - Morning briefings automáticos
  - Event-driven alerts (FOMC, earnings, etc.)
  - Cross-asset correlation warnings

- [ ] **Report Export System**
  - PDF generation de sesiones completas
  - Mega reportes con executive summary
  - Chart screenshots con AI insights
  - Trading plan exportable con risk management
  - Session transcripts con key insights highlighted

- [ ] **Advanced Analytics Dashboard**
  - Performance tracking de strategies sugeridas
  - Multi-exchange correlation matrix
  - Portfolio impact analysis
  - Risk assessment visualization
  - Backtesting results integration

- [ ] **Professional Presentation Mode**
  - Clean layouts para client presentations
  - White-label export options
  - Custom branding para pro users
  - Social sharing de insights (anonimizado)
  - Collaboration features para teams

- [ ] **Session Value Optimization**
  - Session summary con value delivered
  - User satisfaction tracking
  - Learning path recommendations
  - Advanced features unlock progression
  - Premium session upgrades ($5-10 for complex analysis)

### 📦 Entregable
Ecosystem completo que justifique $2/sesión con valor tangible y exportable

---

## 🚀 TASKS ESPECÍFICAS: Implementación Chat-First

### 📋 TASK A: Multi-LLM Service Layer (Priority 1)
**Tiempo**: 2-3 días
**Complejidad**: ⭐⭐⭐ Media

#### Sub-tareas:
1. **LLM Provider Abstraction**
   ```typescript
   // app/src/services/llm/providers/
   interface LLMProvider {
     name: 'anthropic' | 'openai' | 'google';
     model: string;
     createChatStream(messages: ChatMessage[]): AsyncIterable<string>;
     supportsFunctionCalling: boolean;
     contextWindow: number;
     costPerToken: number;
   }
   ```

2. **Provider Implementation**
   ```typescript
   // Anthropic SDK implementation
   class AnthropicProvider implements LLMProvider {
     constructor(apiKey: string) {}
     async createChatStream(messages: ChatMessage[]) {}
   }
   
   // OpenAI SDK implementation  
   class OpenAIProvider implements LLMProvider {}
   
   // Google SDK implementation
   class GoogleProvider implements LLMProvider {}
   ```

3. **Provider Factory**
   ```typescript
   class LLMProviderFactory {
     static create(provider: string, config: any): LLMProvider
     static getOptimalProvider(queryType: string): LLMProvider
   }
   ```

### 📋 TASK B: Smart Tool Orchestration (Priority 2)
**Tiempo**: 2-3 días
**Complejidad**: ⭐⭐⭐⭐ Alta

#### Sub-tareas:
1. **Tool Orchestrator**
   ```typescript
   class ToolOrchestrator {
     constructor(
       private llmProvider: LLMProvider,
       private mcpClient: MCPClient // Ya funciona ✅
     ) {}
     
     async planAnalysis(query: string): Promise<ToolPlan>
     async executeTools(toolPlan: ToolPlan): Promise<ToolResults>
     async synthesizeResults(results: ToolResults): Promise<string>
   }
   ```

2. **FastMCP Integration** ✅
   - HTTP wrapper ya operacional
   - 133 tools disponibles
   - Real-time communication
   - Error handling y retry logic

3. **LLM-Driven Planning**
   - Prompt engineering para tool selection
   - Context-aware tool recommendations
   - Multi-step workflow orchestration

### 📋 TASK C: Smart Symbol Detection (Priority 3)
**Tiempo**: 2-3 días
**Complejidad**: ⭐⭐⭐ Media

#### Sub-tareas:
1. **NLP Symbol Detection**
   ```typescript
   class SymbolDetectionService {
     constructor(private llmProvider: LLMProvider) {}
     
     async detectFromText(input: string): Promise<Symbol[]>
     async extractTimeframes(input: string): Promise<Timeframe[]>
     async suggestFromProfile(profile: UserProfile): Promise<Symbol[]>
   }
   ```

2. **Symbol Mapping Database**
   ```typescript
   const SYMBOL_ALIASES = {
     'bitcoin': 'BTCUSDT',
     'ethereum': 'ETHUSDT', 
     'solana': 'SOLUSDT',
     'eur/usd': 'EURUSD'
   }
   ```

3. **Chat Integration**
   - Multi-symbol queries: "Compara BTC vs ETH"
   - Visual feedback: "Detectando BTCUSDT..."
   - Context-aware suggestions

---

## 🎯 Success Metrics Actualizados

### Chat-First UX
- **Symbol Selection Time**: 0 clicks (vs 5 clicks tradicional)
- **Query Success Rate**: 95%+ symbol detection accuracy
- **Discovery Rate**: 80%+ más símbolos explorados por sesión

### AI Intelligence
- **Suggestion Relevance**: 85%+ user acceptance
- **Proactive Value**: 70%+ suggestions resultan profitable
- **Learning Speed**: 50% improvement en 10 sesiones

### Business Impact
- **Session Value**: $2 → $3 (más análisis por sesión)
- **User Retention**: 90% vs 60% industry standard
- **Viral Factor**: 40% users share insights externally

---

**Resultado**: Transformamos WAIckoff de un dashboard tradicional a una **AI trading companion** que entiende lenguaje natural y proactivamente sugiere oportunidades. 🎯

---

## 🛠️ Especificaciones Técnicas

### Tech Stack Final
```typescript
// Frontend Stack
Vite 5.x           // Build tool
React 18.x         // UI Framework  
TypeScript 5.x     // Type safety
Mantine 7.x        // Component library
Zustand 4.x        // State management
React Router 6.x   // Routing
Axios 1.x          // HTTP client
Lightweight Charts // TradingView charts
```

### Estructura de Estado (Zustand)
```typescript
interface AppState {
  // Auth
  apiKey: string | null;
  isAuthenticated: boolean;
  
  // Session
  currentSession: Session | null;
  sessionHistory: Session[];
  
  // MCP Tools
  availableTools: MCPTool[];
  toolHistory: ToolExecution[];
  favorites: string[];
  
  // Charts
  selectedSymbol: string;
  timeframe: string;
  chartData: ChartData | null;
  
  // UI
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
}
```

### Configuración de Desarrollo
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // API Docker local
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

### Variables de Entorno
```bash
# app.env (primary config)
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=WAIckoff Dashboard
VITE_VERSION=1.0.0

# .env (clone - mantener sincronizado)
# El usuario mantendrá .env como clon de app.env
```

### Configuración Hosts Local (Opcional)
```bash
# C:\Windows\System32\drivers\etc\hosts (Windows)
# /etc/hosts (Linux/Mac)
# OPCIONAL: Para dominios amigables en desarrollo
127.0.0.1 api.waickoff.local
127.0.0.1 app.waickoff.local

# Si se usan, cambiar VITE_API_BASE_URL a http://api.waickoff.local:8000
```

---

## 🚀 Criterios de Éxito

### Funcionales
- [ ] Chat revolucionario con Claude Sonnet 4
- [ ] Sesiones de consultoría profesional ($2/sesión)
- [ ] Mega reportes con análisis multi-dimensional
- [ ] Educación contextual (why, not just what)
- [ ] Export profesional de reportes y trading plans
- [ ] Responsive design (móvil + desktop)

### Técnicos
- [ ] Build time < 5 segundos
- [ ] First load < 2 segundos
- [ ] TypeScript sin errores
- [ ] Error handling robusto
- [ ] Offline capabilities básicas

### UX/UI
- [ ] Dark theme para trading
- [ ] Navegación intuitiva
- [ ] Loading states claros
- [ ] Error messages útiles
- [ ] Accesibilidad básica (WCAG)

---

## 📝 Notas de Implementación

### Prioridades por Fase
1. **FASE 1**: Infraestructura sólida (no apurar)
2. **FASE 2**: Auth y sesiones (crítico para business)
3. **FASE 3**: MCP tools interface (diferenciador)
4. **FASE 4**: Charts y visualización (wow factor)

### Consideraciones Especiales
- **No sobreingeniería**: KISS principle
- **Production ready**: Sin mocks ni placeholders
- **Modular**: Componentes reutilizables
- **Escalable**: Preparado para crecimiento
- **Seguro**: Manejo seguro de API keys

### Ready to Start ✅
Todo el backend y API están operacionales. El dashboard puede empezar inmediatamente consumiendo datos reales desde el día 1. 