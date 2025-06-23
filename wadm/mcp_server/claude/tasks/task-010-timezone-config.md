# 📋 TASK-010: Sistema de Configuración de Zona Horaria

## 📋 Información General
- **ID:** TASK-010
- **Título:** Implementar Sistema de Configuración Persistente de Zona Horaria
- **Prioridad:** ALTA (Crítico para análisis temporales precisos)
- **Estimado:** 3-4 horas
- **Dependencias:** TimezoneManager ya implementado
- **Fecha Creación:** 10/06/2025

## 🎯 Objetivo
Crear un sistema de configuración persistente que permita a los usuarios establecer su zona horaria una sola vez, eliminando la necesidad de especificar la hora en cada request temporal.

## 🔍 Problema Actual
- Usuario debe especificar hora actual en cada análisis temporal
- Zona horaria hardcodeada a México (CST/CDT)
- No hay persistencia de preferencias del usuario
- Potencial para errores si usuario olvida especificar hora

## 🏗️ Arquitectura Propuesta

### 1. Archivo de Configuración de Usuario
```json
// ~/.waickoff/config.json
{
  "timezone": {
    "default": "America/Mexico_City",
    "autoDetect": true,
    "lastUpdated": "2025-06-10T20:00:00.000Z"
  },
  "preferences": {
    "dateFormat": "DD/MM/YYYY",
    "use24Hour": true,
    "locale": "es-MX"
  },
  "version": "1.0.0"
}
```

### 2. ConfigurationManager
```typescript
interface IConfigurationManager {
  // Cargar configuración
  loadConfig(): Promise<UserConfig>;
  
  // Guardar configuración
  saveConfig(config: Partial<UserConfig>): Promise<void>;
  
  // Auto-detectar timezone
  detectSystemTimezone(): string;
  
  // Validar timezone
  isValidTimezone(tz: string): boolean;
  
  // Obtener timezone actual
  getCurrentTimezone(): string;
}
```

### 3. Enhanced TimezoneManager
```typescript
class EnhancedTimezoneManager extends TimezoneManager {
  private configManager: IConfigurationManager;
  
  constructor() {
    const config = await this.configManager.loadConfig();
    const timezone = config?.timezone?.default || this.detectTimezone();
    super(timezone);
  }
  
  // Auto-detección inteligente
  private detectTimezone(): string {
    // 1. Config file
    // 2. Variable de entorno TZ
    // 3. Sistema operativo
    // 4. Intl API
    // 5. Default México
  }
}
```

## 🔧 Implementación por Fases

### FASE 1: Configuration Manager (1.5h)
- [ ] Crear `ConfigurationManager` class
- [ ] Implementar load/save de archivos JSON
- [ ] Validación de configuración
- [ ] Manejo de errores y defaults

### FASE 2: Auto-Detection (1h)
- [ ] Detectar timezone del sistema operativo
- [ ] Implementar fallbacks múltiples
- [ ] Validación contra lista IANA
- [ ] Testing cross-platform

### FASE 3: Integration (1h)
- [ ] Actualizar `TimezoneManager` para usar config
- [ ] Modificar Core Engine para config automática
- [ ] Backward compatibility con requests explícitos
- [ ] Actualizar herramientas MCP

### FASE 4: CLI Tool (0.5h)
- [ ] Script `waickoff-config` para setup inicial
- [ ] Comandos para get/set timezone
- [ ] Auto-detección con confirmación
- [ ] Validación y feedback

## 🛠️ Herramientas MCP Nuevas

### 1. `get_user_config`
```typescript
{
  // Sin parámetros, retorna config completa
}
// Respuesta:
{
  timezone: {
    default: "America/Mexico_City",
    autoDetect: true,
    valid: true
  },
  preferences: { ... }
}
```

### 2. `set_user_timezone`
```typescript
{
  timezone: string;      // "America/New_York"
  autoDetect?: boolean;  // Activar auto-detección
}
```

### 3. `detect_timezone`
```typescript
{
  // Sin parámetros, retorna timezone detectado
}
// Respuesta:
{
  detected: "America/Mexico_City",
  method: "system" | "env" | "intl" | "default",
  confidence: "high" | "medium" | "low"
}
```

## 📐 Casos de Uso

### 1. Primera Configuración
```bash
# Usuario ejecuta por primera vez
$ waickoff-config --init

🕐 wAIckoff Timezone Configuration
==================================
Detected timezone: America/Mexico_City
Use this timezone? (y/n): y
✅ Configuration saved to ~/.waickoff/config.json
```

### 2. Análisis Sin Especificar Hora
```typescript
// Antes (requería hora)
"Análisis de BTC hace 5 días a las 14:00"

// Después (usa config)
"Análisis de BTC hace 5 días"  // Usa hora actual en zona configurada
```

### 3. Override Temporal
```typescript
// Config dice México, pero usuario quiere NY por una vez
"Análisis de ETH con timezone America/New_York"
```

## 🔄 Integración con Sistema Existente

### TimezoneManager Updates
```typescript
class ConfigAwareTimezoneManager {
  private static instance: ConfigAwareTimezoneManager;
  private config: UserConfig;
  
  static async getInstance(): Promise<ConfigAwareTimezoneManager> {
    if (!this.instance) {
      this.instance = new ConfigAwareTimezoneManager();
      await this.instance.initialize();
    }
    return this.instance;
  }
  
  private async initialize() {
    this.config = await ConfigurationManager.loadConfig();
  }
}
```

### Core Engine Integration
```typescript
// En MarketAnalysisEngine
async performTemporalAnalysis(symbol: string, options: TemporalOptions) {
  // Si no especifica timezone, usar de config
  const timezone = options.timezone || 
                  this.config?.timezone?.default || 
                  'America/Mexico_City';
  
  // Si no especifica hora, usar actual
  const localTime = options.localTime || 
                   new Date().toLocaleTimeString('es-MX');
}
```

## 📊 Beneficios Esperados

### Para el Usuario
- **Zero friction**: Configurar una vez, usar siempre
- **Menos errores**: No olvidar especificar hora/zona
- **Flexibilidad**: Override cuando necesario
- **Portabilidad**: Config se mueve con el usuario

### Para el Sistema
- **Consistencia**: Una fuente de verdad para timezone
- **Escalabilidad**: Base para multi-usuario futuro
- **Mantenibilidad**: Configuración centralizada
- **Testing**: Fácil mockear diferentes zonas

## 🧪 Plan de Testing

### Unit Tests
```typescript
describe('ConfigurationManager', () => {
  it('should create default config if not exists');
  it('should load existing config correctly');
  it('should validate timezone against IANA list');
  it('should handle corrupted config files');
});

describe('Timezone Auto-Detection', () => {
  it('should detect from environment variable');
  it('should detect from system');
  it('should fallback to default');
});
```

### Integration Tests
- Config + TimezoneManager
- Config + Core Engine
- Config + MCP Tools

### Manual Testing
- Different OS (Windows, Linux, macOS)
- Different timezones
- Config migration scenarios

## ✅ Criterios de Aceptación

1. **Funcionalidad**
   - [ ] Config file se crea automáticamente
   - [ ] Timezone se detecta correctamente
   - [ ] Análisis usa config sin especificar hora
   - [ ] Override manual funciona

2. **Usabilidad**
   - [ ] Setup inicial intuitivo
   - [ ] Mensajes claros de confirmación
   - [ ] Documentación de uso

3. **Robustez**
   - [ ] Manejo de config corrupta
   - [ ] Validación de timezones
   - [ ] Fallbacks funcionando

4. **Performance**
   - [ ] Config se carga una sola vez
   - [ ] No impacto en tiempo de respuesta
   - [ ] Cache de configuración

## 🚀 Evolución Futura

### Corto Plazo
- Integración con FastAPI (wAIckoff)
- Sync de config entre dispositivos
- UI web para configuración

### Largo Plazo
- Multi-usuario con diferentes configs
- Preferencias por símbolo/exchange
- Machine learning de patrones temporales

## 📚 Referencias
- `claude/docs/timezone-system.md` - Sistema actual
- `claude/docs/timezone-future-recommendations.md` - Recomendaciones completas
- IANA Timezone Database
- Node.js os.timezone() proposals

---

*Creado: 10/06/2025 | Estado: PENDIENTE | Prioridad: ALTA*