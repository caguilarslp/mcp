@echo off
REM Simple test runner for WADM (Windows)

echo Running WADM tests...

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found. Please install Python.
    pause
    exit /b 1
)

REM Run tests
python -m pytest -v
if errorlevel 1 (
    echo Tests failed!
    pause
    exit /b 1
) else (
    echo All tests passed!
    pause
    exit /b 0
)
