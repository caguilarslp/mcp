# [TASK-001] Setup Docker + FastAPI + MongoDB

## 📋 Información General
- **Estado:** 📅 Planificada
- **Prioridad:** 🔴 Alta
- **Estimación:** 3h
- **Tiempo Real:** -
- **Asignado a:** -
- **Fecha Inicio:** -
- **Fecha Fin:** -

## 📝 Descripción
Configuración inicial del entorno de desarrollo con Docker, incluyendo FastAPI como framework web, MongoDB como base de datos principal, y Redis como cache. Establecer la estructura base del proyecto siguiendo Clean Architecture.

## 🎯 Objetivos
- [ ] Ambiente Docker funcional con hot-reload
- [ ] FastAPI corriendo con estructura modular
- [ ] MongoDB conectado y accesible
- [ ] Redis configurado para cache
- [ ] Variables de entorno configuradas
- [ ] Health checks implementados

## 📋 Subtareas
- [ ] Crear Dockerfile para Python 3.12-slim
- [ ] Configurar docker-compose.yml con todos los servicios
- [ ] Implementar estructura Clean Architecture en src/
- [ ] Setup FastAPI con configuración modular
- [ ] Implementar conexión a MongoDB con motor async
- [ ] Configurar Redis para cache
- [ ] Crear endpoints de health check
- [ ] Configurar logging estructurado JSON
- [ ] Implementar manejo de errores global
- [ ] Escribir tests de integración básicos

## 🔗 Dependencias
- **Bloquea a:** Todas las demás tareas
- **Bloqueada por:** Ninguna
- **Relacionada con:** -

## 💻 Implementación

### Estructura de Directorios
```
wadm/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── src/
│   ├── core/              # Dominio
│   │   ├── entities/
│   │   └── interfaces/
│   ├── infrastructure/    # Adaptadores
│   │   ├── database/
│   │   └── cache/
│   ├── application/       # Casos de uso
│   │   └── services/
│   ├── presentation/      # API
│   │   ├── api/
│   │   └── mcp/
│   └── main.py
├── tests/
├── .env.example
└── requirements.txt
```

### Stack de Tecnologías
- Python 3.12-slim
- FastAPI 0.115.0+
- Pydantic v2
- Motor (MongoDB async)
- Redis-py[hiredis]
- Uvicorn
- FastMCP

## 🧪 Testing
- [ ] Docker build exitoso
- [ ] docker-compose up sin errores
- [ ] Health checks respondiendo
- [ ] MongoDB conexión establecida
- [ ] Redis ping exitoso
- [ ] Hot reload funcionando

## 📝 Notas de Implementación
- Usar multi-stage build para optimizar imagen
- Configurar volúmenes para desarrollo local
- Implementar graceful shutdown
- Considerar límites de recursos en compose

## 📚 Documentación
- [ ] README con instrucciones de setup
- [ ] Documentar variables de entorno
- [ ] Diagrama de arquitectura

## 🔄 Review Checklist
- [ ] Dockerfile optimizado
- [ ] docker-compose production-ready
- [ ] Estructura de código clara
- [ ] Configuración externalizada
- [ ] Logs estructurados

## 📊 Métricas Objetivo
- **Tiempo de build:** < 2 min
- **Tamaño imagen:** < 200MB
- **Tiempo startup:** < 5s
- **Memory footprint:** < 100MB idle
