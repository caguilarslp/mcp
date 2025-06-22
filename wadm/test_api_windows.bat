@echo off
echo Testing WADM API...
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Wait a moment for server to be ready
echo Make sure the API server is running (start_api.bat)
echo.
pause

REM Run the test
python test_api.py
