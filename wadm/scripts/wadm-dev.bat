@echo off
REM WADM Docker Development Helper Script for Windows
setlocal enabledelayedexpansion

REM Colors (limited in Windows CMD)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

REM Function to print status
:print_status
echo %BLUE%[WADM]%NC% %~1
goto :eof

:print_success
echo %GREEN%[WADM]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WADM]%NC% %~1
goto :eof

:print_error
echo %RED%[WADM]%NC% %~1
goto :eof

REM Check if Docker is running
:check_docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not running. Please start Docker and try again."
    exit /b 1
)
goto :eof

REM Check if .env file exists and create it if not
:setup_env_file
if not exist .env (
    call :print_warning ".env file not found. Creating from template..."
    copy .env.template .env >nul
    call :print_success ".env file created. Please review and customize if needed."
)
goto :eof

REM Main command handling
set "command=%~1"
if "%command%"=="" set "command=help"

if "%command%"=="start" goto :start
if "%command%"=="up" goto :start
if "%command%"=="stop" goto :stop
if "%command%"=="down" goto :stop
if "%command%"=="restart" goto :restart
if "%command%"=="rebuild" goto :rebuild
if "%command%"=="logs" goto :logs
if "%command%"=="status" goto :status
if "%command%"=="clean" goto :clean
if "%command%"=="test" goto :test
if "%command%"=="help" goto :help
goto :help

:start
call :print_status "Starting WADM development environment..."
call :check_docker
call :setup_env_file

call :print_status "Building and starting services..."
docker-compose up -d

call :print_status "Waiting for services to be ready..."
timeout /t 10 /nobreak >nul

call :print_success "WADM is starting up!"
call :print_success "API Server: http://localhost:8000"
call :print_success "API Docs: http://localhost:8000/api/docs"
call :print_success "MongoDB: localhost:27017"
call :print_success "Redis: localhost:6379"
echo.
call :print_status "Use 'docker-compose logs -f wadm-api' to see application logs"
goto :eof

:stop
call :print_status "Stopping WADM development environment..."
docker-compose down
call :print_success "WADM stopped successfully!"
goto :eof

:restart
call :print_status "Restarting WADM development environment..."
docker-compose restart
call :print_success "WADM restarted successfully!"
goto :eof

:rebuild
call :print_status "Rebuilding WADM development environment..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d
call :print_success "WADM rebuilt and started successfully!"
goto :eof

:logs
set "service=%~2"
if "%service%"=="" set "service=wadm-api"
call :print_status "Showing logs for %service%..."
docker-compose logs -f %service%
goto :eof

:status
call :print_status "WADM Services Status:"
docker-compose ps
echo.
call :print_status "Service Health:"
curl -s http://localhost:8000/api/v1/system/health 2>nul || call :print_warning "API not responding"
goto :eof

:clean
call :print_warning "This will remove all WADM containers, volumes, and data!"
set /p "confirm=Are you sure? (y/N): "
if /i "%confirm%"=="y" (
    call :print_status "Cleaning up WADM environment..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    call :print_success "WADM environment cleaned successfully!"
) else (
    call :print_status "Cleanup cancelled."
)
goto :eof

:test
call :print_status "Running WADM API tests..."
docker-compose exec wadm-api python test_api.py
if %errorlevel%==0 (
    call :print_success "All tests passed!"
) else (
    call :print_error "Some tests failed!"
)
goto :eof

:help
echo %BLUE%WADM Docker Development Helper%NC%
echo.
echo Usage: %~nx0 [command]
echo.
echo Commands:
echo   start, up      Start WADM development environment
echo   stop, down     Stop WADM development environment
echo   restart        Restart all services
echo   rebuild        Rebuild and restart all services
echo   logs [service] Show logs (default: wadm-api)
echo   status         Show service status and health
echo   clean          Remove all containers and volumes
echo   test           Run API tests
echo   help           Show this help message
echo.
echo Examples:
echo   %~nx0 start              # Start all services
echo   %~nx0 logs               # Show API logs
echo   %~nx0 logs mongodb       # Show MongoDB logs
echo   %~nx0 status             # Check service status
goto :eof
