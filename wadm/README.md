# WADM - wAIckoff Data Manager

Sistema de recolección y distribución de indicadores de mercado (Volume Profile y Order Flow) para el ecosistema wAIckoff.

## 🚀 Quick Start

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/wadm.git
cd wadm

# 2. Configurar environment
cp .env.example .env
# Editar .env con tus configuraciones

# 3. Iniciar con Docker
docker-compose up -d

# 4. Verificar salud
curl https://tu-vps.com/health
```

## 📊 Características

- ✅ Recolección 24/7 de Binance y Bybit
- ✅ Volume Profile con POC, VAH, VAL
- ✅ Order Flow con Delta e Imbalance
- ✅ API segura con autenticación
- ✅ Cache local para optimización
- ✅ Integración nativa con wAIckoff MCP

## 📁 Estructura

```
wadm/
├── docs/               # Documentación completa
├── docker/            # Configuración Docker
├── src/               # Código fuente
│   ├── collectors/    # WebSocket collectors
│   ├── processors/    # Cálculo de indicadores
│   ├── mcp-server/   # API server
│   └── mcp-client/   # Cliente para PCs
└── tests/            # Tests unitarios
```

## 🔧 Documentación

- [Arquitectura](docs/arquitectura/arquitectura-general.md)
- [Database Design](docs/arquitectura/database-design.md)
- [Plan de Tareas](docs/trazabilidad/tareas.md)
- [Decisiones](docs/trazabilidad/decisiones.md)

## 📈 Estado del Proyecto

Ver [progreso.md](docs/trazabilidad/progreso.md) para el estado actual.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

*Parte del ecosistema wAIckoff*
