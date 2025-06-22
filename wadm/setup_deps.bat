@echo off
echo 📦 WADM Quick Setup - Installing Dependencies
echo ================================================

REM Change to project directory
cd /d D:\projects\mcp\wadm

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate

REM Upgrade pip
echo 🔄 Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo 🔄 Installing latest stable dependencies...
pip install -r requirements.txt --upgrade

echo.
echo ✅ Setup completed! Dependencies installed.
echo.
echo Next steps:
echo 1. python api_server.py
echo 2. python test_task_030.py
echo 3. Open http://localhost:8000/api/docs
echo.
pause
