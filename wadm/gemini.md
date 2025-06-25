# Resumen del Proyecto WADM (wAIckoff Data Manager)

## 1. Visión General y Objetivo

WADM es un sistema de análisis de datos de mercado financiero en tiempo real. Su misión es:
1.  **Recolectar** datos de alta frecuencia (trades, order books) de múltiples exchanges de criptomonedas.
2.  **Calcular** un extenso set de indicadores técnicos avanzados, enfocados en la metodología Wyckoff, Smart Money Concepts (SMC) y Order Flow.
3.  **Exponer** estos datos a través de una API unificada y de alto rendimiento.
4.  **Servir** a un dashboard de visualización (React) que permita a los traders tomar decisiones informadas.

## 2. Arquitectura y Estado Actual

El proyecto está en una fase crítica de **refactorización** para resolver una arquitectura duplicada e ineficiente.

### Arquitectura Actual (Fragmentada)

-   **Backend API (Python/FastAPI)**: Gestiona la recolección de datos vía WebSocket y calcula 2 indicadores básicos (Volume Profile, Order Flow).
-   **MCP Server (TypeScript)**: Un servicio independiente que contiene 133 herramientas de análisis técnico más sofisticadas.
-   **Dos Bases de Datos (MongoDB)**: Cada servicio utiliza su propia instancia de MongoDB, causando fragmentación, duplicidad de datos y pérdida de información.
-   **Frontend (React)**: En desarrollo, actualmente forzado a interactuar con dos endpoints distintos, aumentando la complejidad y latencia.

**Problema Central**: Esta arquitectura dual es lenta, difícil de mantener, propensa a errores y no es escalable.

## 3. Solución: Hacia una Arquitectura Unificada

La estrategia adoptada es una **consolidación completa** en un único backend de Python.

### Arquitectura Propuesta (Monolito Coherente)

-   **Un solo Backend (Python/FastAPI)**: Integrará la lógica de los colectores de datos, el motor de análisis (las 133 herramientas de MCP) y la API.
-   **Una sola Base de Datos (MongoDB)**: Todos los componentes compartirán una única instancia de MongoDB, asegurando la consistencia y disponibilidad de los datos.
-   **Una sola API**: El frontend consumirá datos de un único endpoint, simplificando la lógica y mejorando el rendimiento.

### Plan de Migración (Híbrido y Pragmático)

La migración se está realizando de forma gradual para minimizar riesgos y acelerar la entrega de valor:

1.  **Fase 1 (Inmediata - En progreso)**:
    *   **Dockerizar el MCP Server (TypeScript)** tal como está y desplegarlo junto al backend de Python.
    *   Hacer que ambos servicios apunten a la **misma base de datos MongoDB** para unificar el almacenamiento.
    *   Establecer comunicación interna vía HTTP entre el backend y el MCP Server.
    *   **Objetivo**: Tener un sistema funcional y unificado a nivel de datos en cuestión de días.

2.  **Fase 2 (Medio Plazo)**:
    *   **Migración Gradual de Herramientas**: Reescribir las herramientas más críticas o utilizadas del MCP Server de TypeScript a Python.
    *   Las herramientas migradas se integrarán directamente en el backend de Python.
    *   El backend actuará como un **proxy** para las herramientas aún no migradas, llamando al servicio de TypeScript.
    *   **Objetivo**: Reducir progresivamente la dependencia del servicio en TypeScript sin detener el desarrollo.

3.  **Fase 3 (Final)**:
    *   Completar la migración de todas las herramientas a Python.
    *   Retirar definitivamente el MCP Server en TypeScript.
    *   **Objetivo**: Alcanzar la arquitectura final unificada.

## 4. Decisiones Clave de Diseño (ADRs)

### ADR-001: Estrategia de Almacenamiento (Tiered Storage)

Para manejar el alto volumen de datos de mercado de forma eficiente, se ha propuesto una estrategia de almacenamiento por niveles:

-   **Tier 1 (Hot Data - 5 min)**: Trades en crudo en MongoDB para cálculos en tiempo real.
-   **Tier 2 (Warm Data - 1 hora)**: Datos agregados por segundo (OHLCV) en MongoDB.
-   **Tier 3 (Cold Data - 7 días)**: Datos agregados por minuto en MongoDB (comprimidos).
-   **Tier 4 (Archive - 7+ días)**: Datos agregados por hora en ficheros Parquet/CSV.

**Impacto**: Reducción drástica de los requisitos de almacenamiento (97% de ahorro estimado) y mejora del rendimiento de las consultas, a costa de perder granularidad a nivel de tick después de 5 minutos.

## 5. Especificaciones de los Indicadores

El core de WADM es su capacidad de análisis. Los indicadores se dividen en prioridades y se centran en detectar la actividad institucional:

-   **Prioridad Crítica**:
    1.  **Volume Profile**: Identificar zonas de alta concentración de volumen (POC, Value Area).
    2.  **Order Flow**: Detectar desequilibrios de oferta/demanda en tiempo real.

-   **Prioridad Alta**:
    3.  **VWAP (Volume Weighted Average Price)**: Identificar el valor justo institucional.
    4.  **Análisis de Estructura de Mercado**: Identificar fases de Wyckoff (acumulación, distribución).

-   **Prioridad Media y Baja**:
    5.  **Liquidity Map**: Mapear pools de liquidez y order blocks.
    6.  **Smart Money Footprint**: Rastrear patrones de dinero inteligente (icebergs, absorción).
    7.  **Footprint Charts y Market Profile**: Análisis microscópico del flujo de órdenes.

Un problema clave a resolver es cambiar el **cálculo de indicadores** de un disparador basado en "cada N trades" a uno **basado en tiempo fijo** (1m, 5m, etc.) para mayor consistencia. Esta tarea se centra en el fichero `src/manager.py`.

## 6. Siguiente Paso Inmediato

La prioridad actual es avanzar en la **Fase 1 del plan de migración**:
1.  Asegurar que ambos servicios (Python y TypeScript) coexisten y comparten la misma base de datos MongoDB.
2.  Refactorizar `src/manager.py` para implementar el cálculo de indicadores basado en tiempo.