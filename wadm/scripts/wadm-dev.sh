#!/bin/bash
# WADM Docker Development Helper Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[WADM]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[WADM]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WADM]${NC} $1"
}

print_error() {
    echo -e "${RED}[WADM]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_error "docker-compose is not installed. Please install Docker Compose."
        exit 1
    fi
}

# Function to create .env file if it doesn't exist
setup_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.template .env
        print_success ".env file created. Please review and customize if needed."
    fi
}

# Main command handling
case "${1:-help}" in
    "start"|"up")
        print_status "Starting WADM development environment..."
        check_docker
        check_docker_compose
        setup_env_file
        
        print_status "Building and starting services..."
        docker-compose up -d
        
        print_status "Waiting for services to be ready..."
        sleep 10
        
        print_success "WADM is starting up!"
        print_success "API Server: http://localhost:8000"
        print_success "API Docs: http://localhost:8000/api/docs"
        print_success "MongoDB: localhost:27017"
        print_success "Redis: localhost:6379"
        echo ""
        print_status "Use 'docker-compose logs -f wadm-api' to see application logs"
        ;;
        
    "stop"|"down")
        print_status "Stopping WADM development environment..."
        docker-compose down
        print_success "WADM stopped successfully!"
        ;;
        
    "restart")
        print_status "Restarting WADM development environment..."
        docker-compose restart
        print_success "WADM restarted successfully!"
        ;;
        
    "rebuild")
        print_status "Rebuilding WADM development environment..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        print_success "WADM rebuilt and started successfully!"
        ;;
        
    "logs")
        service="${2:-wadm-api}"
        print_status "Showing logs for $service..."
        docker-compose logs -f "$service"
        ;;
        
    "shell")
        service="${2:-wadm-api}"
        print_status "Opening shell in $service..."
        docker-compose exec "$service" bash
        ;;
        
    "status")
        print_status "WADM Services Status:"
        docker-compose ps
        echo ""
        print_status "Service Health:"
        curl -s http://localhost:8000/api/v1/system/health | python -m json.tool 2>/dev/null || print_warning "API not responding"
        ;;
        
    "clean")
        print_warning "This will remove all WADM containers, volumes, and data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Cleaning up WADM environment..."
            docker-compose down -v --remove-orphans
            docker system prune -f
            print_success "WADM environment cleaned successfully!"
        else
            print_status "Cleanup cancelled."
        fi
        ;;
        
    "backup")
        print_status "Creating MongoDB backup..."
        backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        docker-compose exec mongodb mongodump --out /backups/mongo_backup
        docker cp $(docker-compose ps -q mongodb):/backups/mongo_backup "$backup_dir/"
        print_success "Backup created in $backup_dir"
        ;;
        
    "test")
        print_status "Running WADM API tests..."
        if docker-compose exec wadm-api python test_api.py; then
            print_success "All tests passed!"
        else
            print_error "Some tests failed!"
        fi
        ;;
        
    "help"|*)
        echo -e "${BLUE}WADM Docker Development Helper${NC}"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start, up      Start WADM development environment"
        echo "  stop, down     Stop WADM development environment"
        echo "  restart        Restart all services"
        echo "  rebuild        Rebuild and restart all services"
        echo "  logs [service] Show logs (default: wadm-api)"
        echo "  shell [service] Open shell in service (default: wadm-api)"
        echo "  status         Show service status and health"
        echo "  clean          Remove all containers and volumes"
        echo "  backup         Create MongoDB backup"
        echo "  test           Run API tests"
        echo "  help           Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start              # Start all services"
        echo "  $0 logs               # Show API logs"
        echo "  $0 logs mongodb       # Show MongoDB logs"
        echo "  $0 shell              # Open shell in API container"
        echo "  $0 status             # Check service status"
        ;;
esac
