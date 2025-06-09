# 📘 Manual de Instalación - Bybit MCP Server v1.3.4

## 🎯 Guía Completa para Windows 11 + Claude Desktop

Este manual te permitirá instalar y configurar el **Bybit MCP Server** en cualquier máquina Windows 11 con Claude Desktop desde cero.

---

## 📋 Requisitos Previos

### Software Requerido
- ✅ **Windows 11** (cualquier edición)
- ✅ **Claude Desktop** (versión más reciente)
- ✅ **Node.js** v16.0.0 o superior
- ✅ **Git** (para clonar el repositorio)
- ✅ **Visual Studio Code** (opcional, recomendado)

---

## 🔧 Paso 1: Instalación de Dependencias

### 1.1 Instalar Node.js
1. Ir a [nodejs.org](https://nodejs.org/)
2. Descargar **LTS version** (recomendado para estabilidad)
3. Ejecutar el instalador con configuración por defecto
4. Verificar instalación:
   ```cmd
   node --version
   npm --version
   ```

### 1.2 Instalar Git
1. Ir a [git-scm.com](https://git-scm.com/download/win)
2. Descargar Git para Windows
3. Instalar con configuración por defecto
4. Verificar instalación:
   ```cmd
   git --version
   ```

### 1.3 Instalar Claude Desktop
1. Ir a [claude.ai](https://claude.ai/)
2. Descargar Claude Desktop para Windows
3. Instalar y configurar con tu cuenta

---

## 📁 Paso 2: Obtener el Código del MCP

### Opción A: Clonar desde Git (Recomendado)
```cmd
# Crear directorio de proyectos
mkdir D:\projects
cd D:\projects

# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO] mcp\waickoff_mcp
cd mcp\waickoff_mcp
```

### Opción B: Transferir desde USB/Red
1. Copiar la carpeta completa del proyecto a `D:\projects\mcp\waickoff_mcp`
2. Mantener la estructura de carpetas exacta

---

## ⚙️ Paso 3: Instalación del MCP

### 3.1 Instalar Dependencias
```cmd
# Navegar al directorio del proyecto
cd D:\projects\mcp\waickoff_mcp

# Instalar dependencias de Node.js
npm install

# Verificar que se instalaron correctamente
npm list --depth=0
```

### 3.2 Compilar TypeScript
```cmd
# Compilar el proyecto
npm run build

# Verificar que la compilación fue exitosa
# Debe crear la carpeta 'build' sin errores
```

### 3.3 Verificar Estructura
Tu proyecto debe tener esta estructura:
```
D:\projects\mcp\waickoff_mcp\
├── build/                  # Código compilado
├── src/                    # Código fuente TypeScript
├── claude/                 # Documentación y logs
├── logs/                   # Logs del sistema
├── node_modules/           # Dependencias
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔗 Paso 4: Configurar Claude Desktop

### 4.1 Localizar Archivo de Configuración
El archivo de configuración de Claude Desktop está en:
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Ruta completa típica:**
```
C:\Users\[TU_USUARIO]\AppData\Roaming\Claude\claude_desktop_config.json
```

### 4.2 Editar Configuración
1. **Cerrar Claude Desktop completamente**
2. Abrir el archivo de configuración con un editor de texto
3. Si el archivo no existe, crearlo con este contenido:

```json
{
  "mcpServers": {
    "waickoff_mcp": {
      "command": "node",
      "args": ["D:\\projects\\mcp\\waickoff_mcp\\build\\index.js"],
      "env": {}
    }
  }
}
```

### 4.3 Si Ya Tienes Otros MCPs
Si ya tienes otros servidores MCP configurados, añade la sección del waickoff_mcp:

```json
{
  "mcpServers": {
    "servidor-existente": {
      "command": "...",
      "args": ["..."]
    },
    "waickoff_mcp": {
      "command": "node",
      "args": ["D:\\projects\\mcp\\waickoff_mcp\\build\\index.js"],
      "env": {}
    }
  }
}
```

---

## 🚀 Paso 5: Verificación y Pruebas

### 5.1 Reiniciar Claude Desktop
1. Cerrar Claude Desktop completamente
2. Abrir nuevamente Claude Desktop
3. Esperar a que se conecte (puede tomar 10-30 segundos)

### 5.2 Probar Herramientas MCP
En Claude Desktop, probar una herramienta básica:

```
Prueba estas herramientas del MCP Bybit:

1. get_system_health
2. get_ticker con symbol: "XRPUSDT"
3. get_debug_logs con logType: "all"
```

### 5.3 Verificación Exitosa
✅ **El MCP está funcionando si**:
- Claude Desktop no muestra errores al iniciar
- Las herramientas MCP aparecen disponibles
- `get_system_health` devuelve status "HEALTHY"
- `get_ticker` devuelve datos de precios

---

## 🛠️ Resolución de Problemas

### Problema: Claude Desktop no inicia
**Solución:**
1. Verificar que el archivo `claude_desktop_config.json` tenga sintaxis JSON válida
2. Usar un validador JSON online para verificar el formato
3. Verificar que la ruta al archivo sea correcta

### Problema: Error "Cannot find module"
**Solución:**
```cmd
cd D:\projects\mcp\waickoff_mcp
npm install
npm run build
```

### Problema: Error "node: command not found"
**Solución:**
1. Reinstalar Node.js con configuración por defecto
2. Reiniciar la terminal/Command Prompt
3. Verificar PATH de sistema

### Problema: Errores JSON en Claude Desktop
**Solución:**
1. Usar la herramienta `get_debug_logs` para diagnóstico
2. Verificar logs en la carpeta `logs/`
3. Revisar documentación en `claude/docs/troubleshooting/`

---

## 🔧 Comandos Útiles para Mantenimiento

### Actualizar Dependencias
```cmd
cd D:\projects\mcp\waickoff_mcp
npm update
npm run build
```

### Limpiar y Reconstruir
```cmd
cd D:\projects\mcp\waickoff_mcp
npm run clean
npm run build
```

### Ver Logs del Sistema
```cmd
# En Claude Desktop, usar:
get_debug_logs({
  logType: "all",
  limit: 50
})
```

---

## 📊 Herramientas Disponibles

Una vez instalado, tendrás acceso a **12 herramientas** de análisis de mercado:

### **📈 Análisis de Mercado**
- `get_ticker` - Precios y estadísticas 24h
- `get_orderbook` - Profundidad del mercado
- `get_market_data` - Datos completos del mercado
- `analyze_volatility` - Análisis de volatilidad
- `analyze_volume` - Patrones de volumen + VWAP
- `analyze_volume_delta` - Presión compradora/vendedora

### **🎯 Análisis Técnico**
- `identify_support_resistance` - Niveles S/R dinámicos
- `perform_technical_analysis` - Análisis técnico completo
- `get_complete_analysis` - Análisis integral con recomendaciones

### **💼 Trading**
- `suggest_grid_levels` - Sugerencias de grid trading

### **🔧 Sistema**
- `get_system_health` - Estado del sistema
- `get_debug_logs` - **NUEVO v1.3.4** - Debugging avanzado

---

## 📁 Estructura de Archivos Importantes

### Configuraciones
- `claude_desktop_config.json` - Configuración de Claude Desktop
- `package.json` - Dependencias del proyecto
- `tsconfig.json` - Configuración TypeScript

### Documentación
- `claude/docs/` - Documentación técnica completa
- `claude/docs/api/tools-reference.md` - Referencia de todas las herramientas
- `claude/docs/troubleshooting/` - Guías de resolución de problemas

### Logs y Debugging
- `logs/` - Logs automáticos del sistema
- `claude/logs/` - Logs de desarrollo
- `claude/bugs/` - Documentación de bugs y soluciones

---

## 🎯 Casos de Uso Recomendados

### **Para Trading Diario**
```javascript
// 1. Verificar estado del sistema
get_system_health()

// 2. Análisis rápido de XRP
get_complete_analysis({
  symbol: "XRPUSDT",
  investment: 2000
})

// 3. Verificar niveles S/R
identify_support_resistance({
  symbol: "XRPUSDT",
  periods: 100
})
```

### **Para Debugging de Problemas**
```javascript
// Ver errores JSON específicos
get_debug_logs({
  logType: "json_errors",
  limit: 10
})

// Monitorear performance
get_debug_logs({
  logType: "requests",
  limit: 25
})
```

---

## 📞 Soporte y Contacto

### Documentación Completa
- **API Reference**: `claude/docs/api/tools-reference.md`
- **Troubleshooting**: `claude/docs/troubleshooting/`
- **Arquitectura**: `claude/docs/architecture/`

### Sistema de Trazabilidad
- **Estado actual**: `claude/master-log.md`
- **Tareas**: `claude/tasks/task-tracker.md`
- **Bugs conocidos**: `claude/bugs/`

---

## ✅ Checklist de Instalación Completada

- [ ] Node.js instalado y funcionando
- [ ] Git instalado (si se requiere clonar)
- [ ] Proyecto descargado en `D:\projects\mcp\waickoff_mcp`
- [ ] Dependencias instaladas (`npm install`)
- [ ] Proyecto compilado (`npm run build`)
- [ ] Claude Desktop configurado con el MCP
- [ ] Claude Desktop reiniciado
- [ ] Herramientas MCP funcionando (prueba con `get_system_health`)
- [ ] Documentación revisada

---

## 🎆 ¡Instalación Completada!

Tu **Bybit MCP Server v1.3.4** está listo para usar. Ahora tienes acceso a análisis técnico avanzado, sistema de debugging profesional, y herramientas de grid trading directamente desde Claude Desktop.

**¡Disfruta del trading inteligente!** 🚀

---

*Manual de Instalación v1.3.4 | Creado: 08/06/2025 | Compatible con Windows 11 + Claude Desktop*