# 🔍 Troubleshooting Guide - Debug Logging System

## 🎯 Propósito del Sistema de Logging

El sistema de logging avanzado implementado en **TASK-005** está diseñado para identificar y resolver errores JSON que anteriormente eran invisibles, especialmente aquellos que aparecían en Claude Desktop sin trazabilidad.

---

## 🚀 Cómo Usar el Sistema de Debug

### 1. **Herramienta `get_debug_logs`**

La herramienta principal para troubleshooting es `get_debug_logs`, que está integrada en el MCP y disponible desde Claude Desktop.

#### Filtros Disponibles:
- **`all`**: Todos los logs recientes (aplicación + requests)
- **`errors`**: Solo errores HTTP y JSON
- **`json_errors`**: Solo errores de parsing JSON específicamente
- **`requests`**: Solo logs de requests/responses a la API

#### Parámetros:
- `logType`: Tipo de logs a obtener
- `limit`: Número de entradas a mostrar (default: 50)

### 2. **Ejemplos de Uso**

```javascript
// Ver todos los logs recientes
get_debug_logs({
  logType: "all",
  limit: 30
})

// Solo errores JSON para troubleshooting específico
get_debug_logs({
  logType: "json_errors",
  limit: 10
})

// Ver rendimiento de requests
get_debug_logs({
  logType: "requests",
  limit: 25
})
```

---

## 🔍 Interpretando los Logs

### **Estructura de Response**

#### 1. **Summary Section**
```json
{
  "summary": {
    "logType": "json_errors",
    "timestamp": "2025-06-08T20:45:00.000Z",
    "totalEntries": 3,
    "description": "JSON parsing error logs"
  }
}
```
- **Información básica**: tipo de logs, timestamp, cantidad total

#### 2. **API Requests Section**
```json
{
  "api_requests": [
    {
      "requestId": "REQ-1717876515000-0002",
      "timestamp": "2025-06-08T20:45:15.000Z",
      "method": "GET",
      "url": "/v5/market/time",
      "status": 200,
      "duration": "89ms",
      "jsonErrors": 1,
      "jsonErrorDetails": [...]
    }
  ]
}
```

**Campos importantes:**
- **`requestId`**: Identificador único del request
- **`duration`**: Tiempo de respuesta (para performance)
- **`jsonErrors`**: Número de errores JSON en este request
- **`jsonErrorDetails`**: Análisis detallado de errores

#### 3. **JSON Error Details**
```json
{
  "jsonErrorDetails": [
    {
      "attempt": 1,
      "error": "Expected ',' or ']' after array element in JSON at position 5",
      "errorPosition": 5,
      "context": "Direct parse failed",
      "dataPreview": "[{\"ti"
    }
  ]
}
```

**Campos clave:**
- **`attempt`**: Número de intento de parsing
- **`error`**: Mensaje exacto del error
- **`errorPosition`**: Posición exacta del error en el string JSON
- **`dataPreview`**: Primeros caracteres de la respuesta malformada

---

## 🚨 Errores Comunes y Soluciones

### 1. **Error: "Expected ',' or ']' after array element in JSON at position 5"**

**Causa:** Error conocido del MCP SDK durante el startup
**Impacto:** Ninguno - no afecta funcionalidad
**Acción:** 
- ✅ Este error está automáticamente suprimido en el logger
- ✅ Aparece solo durante el inicio de Claude Desktop
- ✅ Es normal y no requiere acción

**Verificación:**
```javascript
get_debug_logs({
  logType: "json_errors",
  limit: 5
})
// Deberías ver este error suprimido en los logs de debug
```

### 2. **Error: "Unexpected end of JSON input"**

**Causa:** Respuesta truncada de la API de Bybit
**Impacto:** Request fallido, posible retry automático
**Acciones:**
1. Verificar conectividad a `api.bybit.com`
2. Revisar si hay rate limiting
3. Comprobar la duración del request (muy alta = timeout)

**Verificación:**
```javascript
get_debug_logs({
  logType: "requests",
  limit: 20
})
// Buscar requests con duration muy alta o status != 200
```

### 3. **Error: "Unexpected token in JSON"**

**Causa:** Respuesta malformada de la API
**Impacto:** Parsing fallido, datos no disponibles
**Acciones:**
1. Verificar el `dataPreview` en `jsonErrorDetails`
2. Revisar si el endpoint está correcto
3. Comprobar si hay problemas con la API de Bybit

**Debugging:**
```javascript
get_debug_logs({
  logType: "json_errors",
  limit: 10
})
// Revisar dataPreview para ver contenido malformado
```

---

## 📊 Análisis de Performance

### **Métricas Clave**

#### 1. **Duración de Requests**
- **Normal**: 50-200ms
- **Lento**: 200-500ms
- **Problemático**: >500ms

#### 2. **Status Codes**
- **200**: Exitoso
- **4xx**: Error del cliente (parámetros incorrectos)
- **5xx**: Error del servidor (problemas API Bybit)

#### 3. **Success Rate**
- **>95%**: Excelente
- **90-95%**: Bueno
- **<90%**: Investigar problemas

### **Ejemplo de Análisis**
```javascript
get_debug_logs({
  logType: "requests",
  limit: 50
})
```

**Buscar patrones:**
- Requests repetitivos con errores
- Endpoints específicos con problemas
- Horarios con más errores (rate limiting)

---

## 🛠️ Debugging Workflow

### **Paso 1: Identificar el Problema**
```javascript
// Obtener overview general
get_debug_logs({
  logType: "all",
  limit: 30
})
```

### **Paso 2: Focalizar en Errores**
```javascript
// Solo errores para análisis específico
get_debug_logs({
  logType: "errors",
  limit: 20
})
```

### **Paso 3: Analizar JSON Issues**
```javascript
// Errores JSON específicos
get_debug_logs({
  logType: "json_errors",
  limit: 10
})
```

### **Paso 4: Verificar Performance**
```javascript
// Requests para métricas de performance
get_debug_logs({
  logType: "requests",
  limit: 25
})
```

---

## 📁 Archivos de Log en Disco

### **Ubicación**
Los logs se guardan automáticamente en:
```
D:\projects\mcp\waickoff_mcp\logs\mcp-requests-YYYY-MM-DD.json
```

### **Formato**
Archivos JSON con estructura detallada de cada request:
```json
[
  {
    "timestamp": "2025-06-08T20:45:00.000Z",
    "requestId": "REQ-1717876500000-0001",
    "method": "GET",
    "url": "/v5/market/tickers?category=spot&symbol=XRPUSDT",
    "responseStatus": 200,
    "duration": 145,
    "jsonParseAttempts": [...]
  }
]
```

### **Rotación**
- Un archivo por día
- Automático, no requiere mantenimiento
- Preserva histórico para análisis

---

## ⚡ Performance del Sistema de Logging

### **Overhead**
- **Mínimo**: <5ms por request
- **No bloquea**: Logging asíncrono
- **Eficiente**: Solo almacena datos esenciales

### **Configuración**
El sistema está optimizado para:
- Capturar todos los errores JSON
- Minimizar impacto en performance
- Proporcionar información detallada para debugging

---

## 🎯 Casos de Uso Específicos

### **Caso 1: Claude Desktop muestra errores JSON**
```javascript
get_debug_logs({
  logType: "json_errors",
  limit: 15
})
// Revisar si son errores conocidos del MCP SDK o nuevos problemas
```

### **Caso 2: Requests lentos o fallidos**
```javascript
get_debug_logs({
  logType: "requests",
  limit: 30
})
// Buscar patterns de duration alta o status codes problemáticos
```

### **Caso 3: Herramienta MCP no responde**
```javascript
get_debug_logs({
  logType: "all",
  limit: 50
})
// Análisis completo de aplicación + requests
```

### **Caso 4: Performance monitoring**
```javascript
get_debug_logs({
  logType: "requests",
  limit: 100
})
// Análisis de tendencias de performance
```

---

## 🏆 Conclusión

El sistema de logging implementado en **TASK-005** proporciona:

1. **Visibilidad completa** de todos los errores JSON
2. **Troubleshooting en tiempo real** desde Claude Desktop
3. **Análisis de performance** automatizado
4. **Guías integradas** para resolución de problemas

**Para usar efectivamente:**
1. Usar `get_debug_logs` como primera herramienta de debugging
2. Revisar `troubleshooting_info` para guías específicas
3. Analizar patterns en lugar de errores individuales
4. Consultar logs de disco para análisis histórico

---

*Troubleshooting Guide v1.3.4 | Última actualización: 08/06/2025*