@echo off
echo Creating WADM Virtual Environment...
echo.

REM Create virtual environment
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip
python -m pip install --upgrade pip

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Virtual environment created and activated!
echo.
echo To activate in the future, run: venv\Scripts\activate
echo To deactivate, run: deactivate
echo.

REM Show installed packages
echo Installed packages:
pip list
