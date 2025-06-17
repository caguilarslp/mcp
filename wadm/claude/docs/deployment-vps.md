# Guía de Deployment en VPS

## 🎯 Objetivo

Esta guía te permitirá deployar WADM en cualquier VPS de forma rápida y segura, sin complicaciones.

## 🔧 Requisitos del VPS

### Mínimos
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **CPU**: 1 core
- **RAM**: 2 GB
- **Storage**: 20 GB
- **Bandwidth**: 100 GB/mes

### Recomendados
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 50 GB
- **Bandwidth**: Ilimitado

## 📦 Instalación Paso a Paso

### 1. Preparar el VPS
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias básicas
sudo apt install -y curl wget git nano ufw

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar sesión para aplicar cambios de grupo
exit
# Reconectar SSH
```

### 2. Clonar y Configurar WADM
```bash
# Clonar repositorio
git clone https://github.com/waickoff/wadm.git
cd wadm

# Configurar variables de entorno
cp .env.example .env
nano .env  # Editar variables según necesidades
```

### 3. Configurar Firewall
```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8920/tcp  # Puerto API WADM
sudo ufw --force enable
```

### 4. Configurar Variables de Entorno
```bash
# Editar .env
nano .env
```

**Variables esenciales a configurar:**
```bash
# Cambiar la clave API por una segura
API_KEY=tu_clave_muy_segura_aqui

# Si tienes claves de exchanges (opcional)
BYBIT_API_KEY=tu_clave_bybit
BYBIT_API_SECRET=tu_secreto_bybit

BINANCE_API_KEY=tu_clave_binance
BINANCE_API_SECRET=tu_secreto_binance
```

### 5. Lanzar Servicios
```bash
# Construir y lanzar
docker-compose up -d

# Verificar estado
docker-compose ps
docker-compose logs -f
```

### 6. Verificar Instalación
```bash
# Test de salud
curl http://localhost:8920/health

# Debería devolver algo como:
# {"status":"healthy","version":"0.1.0","environment":"production"}
```

## 🔒 Configuración de Seguridad

### SSL/HTTPS (Opcional pero Recomendado)
```bash
# Instalar Nginx
sudo apt install -y nginx

# Configurar Nginx como proxy
sudo nano /etc/nginx/sites-available/wadm
```

**Configuración Nginx:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:8920;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activar configuración
sudo ln -s /etc/nginx/sites-available/wadm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Instalar Certbot para SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### Cambios de Contraseñas MongoDB
```bash
# Editar docker-compose.yml
nano docker-compose.yml

# Cambiar:
# MONGO_INITDB_ROOT_PASSWORD=wadm_secure_pass
# Por una contraseña fuerte

# Actualizar también MONGODB_URL en .env
```

## 📊 Monitoreo y Mantenimiento

### Comandos Útiles
```bash
# Ver estado de servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f wadm-api

# Reiniciar servicios
docker-compose restart

# Actualizar WADM
git pull
docker-compose down
docker-compose up -d --build

# Backup de MongoDB
docker exec wadm-mongodb mongodump --out /data/backup/$(date +%Y%m%d)

# Ver estadísticas de recursos
docker stats

# Limpiar logs antiguos
docker system prune -f
```

### Automatizar Backups
```bash
# Crear script de backup
nano /home/$USER/backup_wadm.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/$USER/wadm_backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
docker exec wadm-mongodb mongodump --out $BACKUP_DIR/mongo_$DATE

# Mantener solo últimos 7 backups
find $BACKUP_DIR -type d -name "mongo_*" -mtime +7 -exec rm -rf {} +
```

```bash
# Hacer ejecutable
chmod +x /home/$USER/backup_wadm.sh

# Agregar a crontab (backup diario a las 2 AM)
crontab -e
# Agregar línea:
# 0 2 * * * /home/$USER/backup_wadm.sh
```

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Docker no inicia
```bash
# Verificar Docker daemon
sudo systemctl status docker
sudo systemctl start docker
```

#### 2. Puertos en uso
```bash
# Verificar qué usa el puerto
sudo netstat -tulpn | grep :8920
sudo lsof -i :8920

# Matar proceso si es necesario
sudo kill -9 <PID>
```

#### 3. MongoDB no conecta
```bash
# Verificar logs de MongoDB
docker-compose logs wadm-mongodb

# Reiniciar solo MongoDB
docker-compose restart wadm-mongodb
```

#### 4. API no responde
```bash
# Verificar logs de API
docker-compose logs wadm-api

# Verificar salud interna
docker exec wadm-api curl http://localhost:8920/health
```

#### 5. Espacio en disco lleno
```bash
# Limpiar Docker
docker system prune -a

# Limpiar logs
sudo journalctl --vacuum-time=7d

# Verificar espacio
df -h
```

### Logs Importantes
```bash
# Logs del sistema
sudo journalctl -u docker

# Logs de aplicación
docker-compose logs

# Logs de Nginx (si usas)
sudo tail -f /var/log/nginx/error.log
```

## 📈 Escalamiento

### Para Mayor Tráfico
1. **Aumentar workers**: Editar `CMD` en Dockerfile
2. **Load Balancer**: Nginx upstream con múltiples instancias
3. **Redis Cluster**: Para cache distribuido
4. **MongoDB Replica Set**: Para alta disponibilidad

### Para Múltiples Symbols
- Ajustar `MAX_TRADES_BUFFER` en .env
- Aumentar recursos VPS
- Considerar particionamiento de datos

---

**Con esta guía, WADM estará funcionando en tu VPS en menos de 30 minutos** ⚡
