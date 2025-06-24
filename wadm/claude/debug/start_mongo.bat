@echo off
echo Starting MongoDB for WADM...
echo.

REM Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if container already exists
docker ps -a | findstr wadm-mongo >nul 2>&1
if %errorlevel% == 0 (
    echo MongoDB container already exists. Starting it...
    docker start wadm-mongo
) else (
    echo Creating new MongoDB container...
    docker run -d -p 27017:27017 --name wadm-mongo mongo:latest
)

echo.
echo MongoDB is starting on port 27017...
echo.

REM Wait a moment for MongoDB to be ready
timeout /t 3 >nul

REM Test connection
echo Testing MongoDB connection...
docker exec wadm-mongo mongosh --eval "db.version()" >nul 2>&1
if errorlevel 1 (
    echo MongoDB is still starting, please wait a moment...
) else (
    echo MongoDB is ready!
)

echo.
echo You can now start the API server with: start_api.bat
pause
