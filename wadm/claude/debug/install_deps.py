"""
Install/Update Dependencies for TASK-030
Quick script to install latest stable versions
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and show progress"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            capture_output=True, 
            text=True,
            cwd=r"D:\projects\mcp\wadm"
        )
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def main():
    """Install dependencies"""
    print("📦 Installing WADM Dependencies (Latest Stable)")
    print("=" * 50)
    
    # Change to project directory
    os.chdir(r"D:\projects\mcp\wadm")
    
    # Ensure virtual environment is activated
    print("🔄 Checking virtual environment...")
    if sys.prefix == sys.base_prefix:
        print("⚠️ Virtual environment not detected")
        print("Please activate with: venv\\Scripts\\activate")
        return
    else:
        print(f"✅ Virtual environment active: {sys.prefix}")
    
    # Upgrade pip first
    run_command("python -m pip install --upgrade pip", "Upgrading pip")
    
    # Install/upgrade all dependencies
    run_command("pip install -r requirements.txt --upgrade", "Installing/upgrading dependencies")
    
    # Test critical imports
    print("\n🧪 Testing critical imports...")
    
    test_imports = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"), 
        ("redis", "Redis"),
        ("aiohttp", "AioHTTP"),
        ("websockets", "WebSockets"),
        ("pymongo", "MongoDB driver")
    ]
    
    for module, name in test_imports:
        try:
            __import__(module)
            print(f"✅ {name} import successful")
        except ImportError as e:
            print(f"❌ {name} import failed: {e}")
    
    print("\n🎉 Dependencies installation completed!")
    print("\nNext steps:")
    print("1. python api_server.py")
    print("2. python test_task_030.py") 
    print("3. Check Swagger UI: http://localhost:8000/api/docs")

if __name__ == "__main__":
    main()
