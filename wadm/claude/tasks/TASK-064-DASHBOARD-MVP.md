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

## 📋 FASE 3: Interfaz de 133 Herramientas MCP (Día 3)

### 🎯 Objetivo
Panel completo para usar todas las herramientas MCP disponibles

### ✅ Tareas Específicas
- [ ] **Catálogo de Herramientas**
  - Lista de 133 herramientas categorizadas
  - Categorías: Wyckoff, SMC, Technical, Volume, Multi-Exchange
  - Cards con descripción y parámetros
  - Buscador con filtros avanzados

- [ ] **Ejecutor de Herramientas**
  - Formularios dinámicos para parámetros
  - Validación de inputs en tiempo real
  - Preview de request antes de ejecutar
  - Loading states y progress indicators

- [ ] **Resultados y Visualización**
  - Display de resultados JSON formateado
  - Visualizaciones específicas por tipo de herramienta
  - Tablas responsivas para datos tabulares
  - Gráficos inline para datos numéricos

- [ ] **Gestión de Historial**
  - Historial de herramientas ejecutadas
  - Favoritos y herramientas más usadas
  - Export de resultados (JSON, CSV)
  - Reutilizar configuraciones guardadas

### 📦 Entregable
Interfaz completa para usar las 133 herramientas MCP

---

## 📋 FASE 4: Visualización + Charts (Día 4)

### 🎯 Objetivo
Dashboard MVP completo con visualizaciones avanzadas

### ✅ Tareas Específicas
- [ ] **TradingView Integration**
  - Configurar Lightweight Charts
  - Selector de símbolos con autocomplete
  - Timeframes (1m, 5m, 15m, 1h, 4h, 1d)
  - Candlestick charts con volume

- [ ] **Overlays de Análisis**
  - Visualización de fases Wyckoff
  - Niveles SMC (support/resistance)
  - Order blocks y fair value gaps
  - Volume profile overlay

- [ ] **Panels de Datos**
  - Panel de resumen de análisis actual
  - Métricas en tiempo real
  - Alertas visuales para eventos importantes
  - Multi-exchange comparison

- [ ] **Performance y UX**
  - Lazy loading para charts
  - Caching de datos frecuentes
  - Error boundaries y fallbacks
  - Loading skeletons
  - Export de charts (PNG/PDF)

### 📦 Entregable
Dashboard MVP completo con todas las visualizaciones

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
- [ ] Usuario puede autenticarse con API key
- [ ] Gestión completa de sesiones ($1/sesión)
- [ ] Acceso a las 133 herramientas MCP
- [ ] Visualizaciones de charts funcionando
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