# 🌐 WADM - Configuración Nginx para VPS Compartido

## 📋 Contexto

El VPS ya tiene servicios WordPress corriendo en puertos 80/443, por lo que WADM se integrará usando un subdirectorio.

## 🔧 Configuración Nginx

### Opción 1: Subdirectorio (Recomendada)

```nginx
# Archivo: /etc/nginx/sites-available/tu-dominio.com
server {
    server_name tu-dominio.com;
    listen 443 ssl http2;
    
    # Certificados SSL existentes
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # WordPress (configuración existente)
    location / {
        root /var/www/wordpress;
        index index.php;
        try_files $uri $uri/ /index.php?$args;
    }
    
    # PHP para WordPress
    location ~ \.php$ {
        # ... configuración PHP existente
    }
    
    # WADM API - Subdirectorio dedicado
    location /wadm/ {
        # Headers de seguridad
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        
        # Proxy hacia MCP Server en Docker
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        
        # Headers importantes
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /wadm;
        
        # WebSocket support (si lo necesitas en futuro)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer sizes
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # Rate limiting específico para API
        limit_req zone=wadm_api burst=30 nodelay;
        
        # CORS (si necesario)
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'X-API-Key, Content-Type';
            add_header 'Access-Control-Max-Age' 86400;
            return 204;
        }
    }
    
    # Health check endpoint (sin autenticación)
    location = /wadm/health {
        proxy_pass http://localhost:8080/health;
        access_log off;
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=wadm_api:10m rate=60r/m;
```

### Opción 2: Subdominio (Alternativa)

```nginx
# Archivo: /etc/nginx/sites-available/api.tu-dominio.com
server {
    server_name api.tu-dominio.com;
    listen 443 ssl http2;
    
    # SSL
    ssl_certificate /path/to/api-cert.pem;
    ssl_certificate_key /path/to/api-key.pem;
    
    # Root location
    location / {
        proxy_pass http://localhost:8080;
        # ... mismas configuraciones de proxy que arriba
    }
}
```

## 🐳 Configuración Docker

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    build: ./src/mcp-server
    container_name: wadm-mcp-server
    ports:
      - "127.0.0.1:8080:8080"  # Solo localhost
    environment:
      - BASE_PATH=/wadm        # Importante para rutas
      - NODE_ENV=production
    networks:
      - wadm-net
    restart: unless-stopped
    
networks:
  wadm-net:
    internal: true
```

## 🔧 Configuración MCP Server

```typescript
// src/mcp-server/config.ts
export const config = {
  basePath: process.env.BASE_PATH || '/wadm',
  port: process.env.PORT || 8080,
  
  // URLs para clientes
  publicUrl: 'https://tu-dominio.com/wadm',
  
  // Rutas internas
  routes: {
    volumeProfile: '/volume_profile/:symbol',
    orderFlow: '/order_flow/:symbol',
    health: '/health',
    metrics: '/metrics'
  }
};
```

## 📱 Configuración Cliente

```typescript
// En tus PCs locales
const WADM_CONFIG = {
  baseUrl: 'https://tu-dominio.com/wadm',
  apiKey: process.env.WADM_API_KEY,
  
  // Endpoints
  endpoints: {
    volumeProfile: (symbol: string) => `/volume_profile/${symbol}`,
    orderFlow: (symbol: string) => `/order_flow/${symbol}`
  }
};
```

## 🔒 Seguridad Adicional

### Firewall (UFW)
```bash
# No necesitas abrir puertos adicionales
# Solo asegúrate que 80/443 estén abiertos
ufw status
```

### Fail2ban para API
```ini
# /etc/fail2ban/jail.local
[wadm-api]
enabled = true
filter = wadm-api
logpath = /var/log/nginx/access.log
maxretry = 100
findtime = 60
bantime = 3600
```

## 🎯 URLs Finales

Con esta configuración, tus endpoints serán:

- **Volume Profile**: `https://tu-dominio.com/wadm/volume_profile/BTCUSDT`
- **Order Flow**: `https://tu-dominio.com/wadm/order_flow/BTCUSDT`
- **Health Check**: `https://tu-dominio.com/wadm/health`

## 📝 Notas Importantes

1. **Path Rewriting**: El MCP Server recibirá requests sin `/wadm` prefix
2. **HTTPS**: Usa los certificados SSL existentes del dominio
3. **Sin puertos adicionales**: Todo pasa por 443
4. **Aislamiento**: Docker solo expone puerto a localhost

---

*Última actualización: 15/06/2025*
