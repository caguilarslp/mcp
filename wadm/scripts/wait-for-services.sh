#!/bin/bash
# Wait for services to be ready before starting WADM application

set -e

echo "🚀 WADM Service Dependency Checker"
echo "=================================="

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local host=$2
    local port=$3
    local max_attempts=${4:-30}
    local attempt=1
    
    echo "⏳ Waiting for $service_name at $host:$port..."
    
    while ! nc -z "$host" "$port"; do
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ Timeout waiting for $service_name"
            exit 1
        fi
        echo "   Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        ((attempt++))
    done
    
    echo "✅ $service_name is ready!"
}

# Function to wait for HTTP service
wait_for_http() {
    local service_name=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    echo "⏳ Waiting for $service_name HTTP endpoint..."
    
    while ! curl -s -f "$url" > /dev/null 2>&1; do
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ Timeout waiting for $service_name HTTP"
            exit 1
        fi
        echo "   Attempt $attempt/$max_attempts - waiting for HTTP..."
        sleep 2
        ((attempt++))
    done
    
    echo "✅ $service_name HTTP is ready!"
}

# Check if running in Docker environment
if [ "${DOCKER_ENV:-}" = "true" ]; then
    # Wait for MongoDB
    wait_for_service "MongoDB" "${MONGODB_HOST:-mongodb}" "${MONGODB_PORT:-27017}"
    
    # Wait for Redis
    wait_for_service "Redis" "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}"
    
    # Test MongoDB connection
    echo "🔍 Testing MongoDB connection..."
    if mongosh --host "${MONGODB_HOST:-mongodb}:${MONGODB_PORT:-27017}" --eval "db.adminCommand('ping')" --quiet; then
        echo "✅ MongoDB connection successful!"
    else
        echo "❌ MongoDB connection failed!"
        exit 1
    fi
    
    # Test Redis connection
    echo "🔍 Testing Redis connection..."
    if redis-cli -h "${REDIS_HOST:-redis}" -p "${REDIS_PORT:-6379}" ping | grep -q PONG; then
        echo "✅ Redis connection successful!"
    else
        echo "❌ Redis connection failed!"
        exit 1
    fi
    
else
    # Local development environment
    echo "🏠 Local development mode - checking localhost services..."
    
    # Check MongoDB
    if command -v mongosh >/dev/null 2>&1; then
        wait_for_service "MongoDB" "localhost" "27017" 10
    else
        echo "⚠️  mongosh not found - skipping MongoDB check"
    fi
    
    # Check Redis
    if command -v redis-cli >/dev/null 2>&1; then
        wait_for_service "Redis" "localhost" "6379" 10
    else
        echo "⚠️  redis-cli not found - skipping Redis check"
    fi
fi

echo "🎉 All services are ready!"
echo "=================================="

# If script is being sourced, don't exit
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    echo "🚀 Starting WADM application..."
    exec "$@"
fi
