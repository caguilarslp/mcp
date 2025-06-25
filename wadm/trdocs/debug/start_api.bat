@echo off
echo Starting WADM API Server...
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
