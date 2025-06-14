#!/usr/bin/env python3
"""
Script para verificar versiones instaladas y generar requirements.txt con versiones actuales
"""

import pkg_resources
import subprocess
import sys
from pathlib import Path

def get_installed_versions():
    """Obtener versiones instaladas de los paquetes críticos"""
    critical_packages = [
        'fastapi', 'uvicorn', 'pydantic', 'pydantic-settings',
        'fastmcp', 'mcp', 'aiohttp', 'httpx', 'websockets',
        'pymongo', 'motor', 'redis', 'aioredis',
        'celery', 'python-dotenv', 'loguru', 'prometheus-client',
        'pytest', 'pytest-asyncio', 'pytest-cov', 'mypy'
    ]
    
    installed = {}
    missing = []
    
    for package in critical_packages:
        try:
            version = pkg_resources.get_distribution(package).version
            installed[package] = version
            print(f"✅ {package}: {version}")
        except pkg_resources.DistributionNotFound:
            missing.append(package)
            print(f"❌ {package}: NOT INSTALLED")
    
    return installed, missing

def generate_requirements_with_versions(installed_versions):
    """Generar requirements.txt con versiones actuales"""
    requirements_path = Path("requirements-locked.txt")
    
    with open(requirements_path, 'w') as f:
        f.write("# Generated requirements with current versions\n")
        f.write(f"# Generated on: {__import__('datetime').datetime.now()}\n\n")
        
        # Core Framework
        f.write("# Core Framework\n")
        for pkg in ['fastapi', 'uvicorn', 'pydantic', 'pydantic-settings']:
            if pkg in installed_versions:
                f.write(f"{pkg}=={installed_versions[pkg]}\n")
        
        # MCP Server
        f.write("\n# MCP Server\n")
        for pkg in ['fastmcp', 'mcp']:
            if pkg in installed_versions:
                f.write(f"{pkg}=={installed_versions[pkg]}\n")
        
        # Continue with other categories...
        
    print(f"📝 Generated {requirements_path} with locked versions")

if __name__ == "__main__":
    print("🔍 Checking installed package versions...")
    installed, missing = get_installed_versions()
    
    if missing:
        print(f"\n⚠️ Missing packages: {', '.join(missing)}")
        print("Run: pip install -r requirements.txt")
    else:
        print("\n✅ All packages installed!")
        generate_requirements_with_versions(installed)
