@echo off
echo 🚀 WADM TASK-030 Complete Setup and Test
echo =========================================

REM Change to project directory
cd /d D:\projects\mcp\wadm

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies quickly
echo 📦 Installing missing dependencies...
pip install redis aiohttp --quiet

REM Start API server in background
echo 🚀 Starting API server...
start /B python api_server.py

REM Wait for server to start
echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak > nul

REM Run quick test
echo 🧪 Running quick test...
python quick_test.py

echo.
echo ✅ TASK-030 Quick Demo Completed!
echo.
echo API Server is running at: http://localhost:8000
echo Swagger UI available at: http://localhost:8000/api/docs
echo.
echo To stop the server, close this window or press Ctrl+C
echo.
pause
