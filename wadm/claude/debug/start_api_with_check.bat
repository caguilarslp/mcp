@echo off
echo Starting WADM API Server...
echo.

REM Check if MongoDB is running
echo Checking MongoDB connection...
python test_mongo.py
if errorlevel 1 (
    echo.
    echo ERROR: MongoDB is not running!
    echo Please start MongoDB first:
    echo   docker run -d -p 27017:27017 --name wadm-mongo mongo:latest
    echo.
    pause
    exit /b 1
)

echo.
REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start the API server
echo Starting API server on http://localhost:8000
echo Swagger docs will be available at http://localhost:8000/api/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python api_server.py
