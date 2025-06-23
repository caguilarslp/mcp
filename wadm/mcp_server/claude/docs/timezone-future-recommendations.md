# 🔮 Manejo Futuro de Zona Horaria - Recomendaciones

## 📋 Resumen

Este documento presenta recomendaciones para el manejo robusto y escalable de zonas horarias en el ecosistema wAIckoff, considerando la integración futura con FastAPI y soporte multi-usuario.

## 🎯 Estado Actual

### Implementado en MCP
- ✅ TimezoneManager con México (CST/CDT) por defecto
- ✅ Conversión transparente User ↔ UTC
- ✅ Detección de sesiones de trading
- ✅ Sincronización con TradingView

### Limitaciones Actuales
- ❌ Zona horaria hardcodeada (México)
- ❌ No hay configuración persistente por usuario
- ❌ Requiere especificar hora en cada request temporal

## 🏗️ Arquitectura Recomendada

### 1. Configuración de Usuario Persistente

#### A. Archivo de Configuración Local
```json
// ~/.waickoff/user.config.json
{
  "timezone": {
    "default": "America/Mexico_City",
    "autoDetect": true,
    "preferredSessions": ["ny_session", "london_ny_overlap"]
  },
  "trading": {
    "defaultTimeframe": "1h",
    "alertTimes": ["09:30", "14:00", "15:30"]
  },
  "display": {
    "dateFormat": "DD/MM/YYYY",
    "use24Hour": true,
    "locale": "es-MX"
  }
}
```

#### B. Script de Configuración Inicial
```bash
#!/bin/bash
# waickoff-init.sh

echo "🚀 wAIckoff Configuration Wizard"
echo "==============================="

# Detectar timezone del sistema
DETECTED_TZ=$(timedatectl | grep "Time zone" | awk '{print $3}')

# Crear directorio de configuración
mkdir -p ~/.waickoff

# Generar configuración
cat > ~/.waickoff/user.config.json <<EOF
{
  "timezone": {
    "default": "$DETECTED_TZ",
    "autoDetect": true
  },
  "version": "1.0"
}
EOF

echo "✅ Configuration created at ~/.waickoff/user.config.json"
```

### 2. Auto-Detección Inteligente

#### MCP Enhancement
```typescript
class SmartTimezoneManager extends TimezoneManager {
  private userConfig: UserConfig;
  
  constructor() {
    // 1. Intentar cargar configuración de usuario
    const config = this.loadUserConfig();
    
    // 2. Si no existe, auto-detectar
    const timezone = config?.timezone?.default || 
                    this.detectSystemTimezone() || 
                    'America/Mexico_City';
    
    super(timezone);
  }
  
  private detectSystemTimezone(): string | null {
    // Opciones de detección:
    // 1. Variable de entorno TZ
    if (process.env.TZ) return process.env.TZ;
    
    // 2. Intl API (si disponible)
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}
    
    // 3. Sistema operativo
    // Linux: /etc/timezone
    // Windows: Registry query
    // macOS: systemsetup -gettimezone
    
    return null;
  }
}
```

### 3. Context Injection Pattern

#### Para Requests Temporales
```typescript
interface TemporalRequest {
  // Opciones explícitas (override)
  timezone?: string;
  localTime?: string;
  
  // Context implícito
  _context?: {
    userId?: string;
    sessionId?: string;
    timezone?: string;
  };
}

class ContextAwareEngine extends MarketAnalysisEngine {
  async performAnalysis(symbol: string, request: TemporalRequest) {
    // Resolver timezone en orden de prioridad:
    // 1. Request explícito
    // 2. Context de sesión
    // 3. Configuración de usuario
    // 4. Default del sistema
    
    const timezone = request.timezone ||
                    request._context?.timezone ||
                    this.userConfig?.timezone ||
                    'America/Mexico_City';
    
    // Procesar con timezone resuelto
    return super.performTemporalAnalysis(symbol, {
      ...request,
      timezone
    });
  }
}
```

## 🔄 Integración con wAIckoff FastAPI

### 1. Middleware de Timezone
```python
# waickoff/middleware/timezone.py
from fastapi import Request
from datetime import datetime
import pytz

class TimezoneMiddleware:
    """Inyecta timezone del usuario en cada request"""
    
    async def __call__(self, request: Request, call_next):
        # Obtener timezone de:
        # 1. Header HTTP
        timezone = request.headers.get('X-User-Timezone')
        
        # 2. Cookie de sesión
        if not timezone and request.cookies.get('session_id'):
            session = await get_session(request.cookies['session_id'])
            timezone = session.get('timezone')
        
        # 3. Configuración de usuario (si está autenticado)
        if not timezone and hasattr(request.state, 'user'):
            timezone = request.state.user.preferences.timezone
        
        # 4. Default
        timezone = timezone or 'UTC'
        
        # Inyectar en request
        request.state.timezone = pytz.timezone(timezone)
        
        response = await call_next(request)
        return response
```

### 2. API Endpoints Timezone-Aware
```python
# waickoff/api/analysis.py
from fastapi import APIRouter, Request, Query
from datetime import datetime

router = APIRouter()

@router.get("/analysis/{symbol}/temporal")
async def temporal_analysis(
    symbol: str,
    request: Request,
    days_ago: int = Query(..., description="Days ago from now"),
    time: str = Query(None, description="Local time HH:MM")
):
    """Análisis temporal con timezone automático"""
    
    # Timezone ya inyectado por middleware
    user_tz = request.state.timezone
    
    # Si no especifica hora, usar hora actual
    if not time:
        local_now = datetime.now(user_tz)
        time = local_now.strftime("%H:%M")
    
    # Llamar MCP con context
    result = await mcp_client.perform_temporal_analysis(
        symbol=symbol,
        days_ago=days_ago,
        local_time=time,
        timezone=str(user_tz)
    )
    
    return result
```

### 3. WebSocket con Context
```python
# waickoff/websocket/trading.py
class TradingWebSocket:
    """WebSocket con timezone context persistente"""
    
    async def connect(self, websocket: WebSocket, user_id: str):
        # Cargar preferencias de usuario
        user = await get_user(user_id)
        timezone = user.preferences.timezone
        
        # Almacenar en conexión
        self.connections[websocket] = {
            'user_id': user_id,
            'timezone': timezone,
            'connected_at': datetime.now(pytz.timezone(timezone))
        }
    
    async def send_analysis(self, websocket: WebSocket, analysis: dict):
        # Convertir timestamps al timezone del usuario
        conn_info = self.connections[websocket]
        user_tz = pytz.timezone(conn_info['timezone'])
        
        # Formatear tiempos para el usuario
        analysis = self.format_times_for_timezone(analysis, user_tz)
        
        await websocket.send_json(analysis)
```

## 🛠️ Herramientas de Configuración

### 1. CLI Tool
```bash
# waickoff-config
#!/usr/bin/env python3

import click
import json
from pathlib import Path

@click.command()
@click.option('--timezone', help='Set default timezone')
@click.option('--detect', is_flag=True, help='Auto-detect timezone')
def configure(timezone, detect):
    """Configure wAIckoff user preferences"""
    
    config_path = Path.home() / '.waickoff' / 'user.config.json'
    
    if detect:
        import tzlocal
        timezone = str(tzlocal.get_localzone())
        click.echo(f"Detected timezone: {timezone}")
    
    if timezone:
        # Cargar o crear config
        config = {}
        if config_path.exists():
            config = json.loads(config_path.read_text())
        
        # Actualizar timezone
        config.setdefault('timezone', {})['default'] = timezone
        
        # Guardar
        config_path.parent.mkdir(exist_ok=True)
        config_path.write_text(json.dumps(config, indent=2))
        
        click.echo(f"✅ Timezone set to: {timezone}")

if __name__ == '__main__':
    configure()
```

### 2. Web UI Settings
```typescript
// Frontend component para configuración
interface UserSettings {
  timezone: {
    current: string;
    autoDetect: boolean;
    options: string[];
  };
}

const TimezoneSettings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>();
  
  const handleTimezoneChange = async (newTimezone: string) => {
    // Actualizar en backend
    await api.updateUserSettings({
      timezone: { default: newTimezone }
    });
    
    // Actualizar local
    setSettings({
      ...settings,
      timezone: { ...settings.timezone, current: newTimezone }
    });
    
    // Notificar al usuario
    toast.success(`Timezone updated to ${newTimezone}`);
  };
  
  return (
    <SettingsSection title="Time Zone">
      <Select 
        value={settings?.timezone.current}
        onChange={handleTimezoneChange}
        options={settings?.timezone.options}
      />
      <Checkbox
        label="Auto-detect timezone"
        checked={settings?.timezone.autoDetect}
        onChange={handleAutoDetectChange}
      />
    </SettingsSection>
  );
};
```

## 📊 Migración Gradual

### Fase 1: Config File (Inmediata)
1. Implementar carga de `~/.waickoff/user.config.json`
2. Mantener México como fallback
3. Documentar para early adopters

### Fase 2: Auto-Detection (Corto plazo)
1. Agregar detección de sistema
2. Prompt inicial en primer uso
3. Guardar preferencia

### Fase 3: FastAPI Integration (Medio plazo)
1. Middleware de timezone
2. Session management
3. API timezone-aware

### Fase 4: Full Multi-User (Largo plazo)
1. Timezone por usuario en DB
2. UI de configuración
3. Sync across devices

## 🎯 Beneficios Esperados

### Para Usuarios
- **Zero-config**: Funciona out-of-the-box
- **Flexible**: Fácil cambiar timezone
- **Consistente**: Misma hora en todos lados
- **Intuitivo**: No pensar en conversiones

### Para el Sistema
- **Escalable**: Multi-usuario ready
- **Mantenible**: Un lugar para timezone logic
- **Testeable**: Fácil mockear timezones
- **Extensible**: Nuevas features temporales

## ✅ Recomendaciones Finales

1. **Implementar config file** como primera mejora
2. **Agregar auto-detection** para mejor UX
3. **Preparar APIs** para recibir timezone context
4. **Documentar claramente** el comportamiento
5. **Testear exhaustivamente** con DST transitions

### Prioridad de Implementación
1. 🔴 **Alta**: Config file + auto-detection
2. 🟡 **Media**: FastAPI middleware
3. 🟢 **Baja**: UI settings + multi-user

---

*Documento creado: 10/06/2025*
*Recomendaciones para evolución del sistema de timezone*