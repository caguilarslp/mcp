# 🏛️ ADR-001: Elección de Stack Tecnológico

## Estado
Aceptado

## Contexto
Necesitamos definir el stack tecnológico para un microservicio que recopile y procese datos de mercado 24/7 con limitaciones de VPS (CPU compartida, storage limitado).

## Decisión
Usaremos:
- **Python 3.12-slim**: Lenguaje principal
- **FastAPI**: Framework web async
- **FastMCP**: Servidor MCP estándar
- **MongoDB**: Base de datos principal
- **Redis**: Cache y streaming
- **Celery**: Procesamiento asíncrono
- **Docker**: Containerización

## Consecuencias

### Positivas
- Python tiene excelente soporte para WebSockets y async
- FastAPI ofrece alto rendimiento con validación automática
- MongoDB maneja bien datos de series temporales
- Redis es perfecto para streaming de datos en tiempo real
- Docker facilita deployment consistente

### Negativas
- Python consume más memoria que Go/Rust
- Requiere gestión cuidadosa de recursos en VPS
- MongoDB necesita configuración específica para optimizar storage

### Mitigaciones
- Usar Python slim y optimizaciones de memoria
- Implementar aggressive data retention policies
- Configurar MongoDB con compresión y TTL indexes

## Fecha
2025-06-13
