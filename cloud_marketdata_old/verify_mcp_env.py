#!/usr/bin/env python3
"""
Script para verificar versiones instaladas en el contenedor y crear implementación correcta
"""

import subprocess
import sys
import importlib.util

def check_mcp_api():
    """Verificar qué API de MCP está disponible"""
    print("🔍 Verificando API de MCP instalada...")
    
    try:
        import mcp
        print(f"✅ mcp version: {mcp.__version__ if hasattr(mcp, '__version__') else 'unknown'}")
        
        # Verificar qué módulos están disponibles
        try:
            from mcp.server import Server
            print("✅ mcp.server.Server: disponible")
        except ImportError as e:
            print(f"❌ mcp.server.Server: {e}")
            
        try:
            from mcp.server.stdio import stdio_server
            print("✅ mcp.server.stdio.stdio_server: disponible")
        except ImportError as e:
            print(f"❌ mcp.server.stdio.stdio_server: {e}")
            
        try:
            from mcp.types import Tool, TextContent, CallToolResult
            print("✅ mcp.types: disponible")
        except ImportError as e:
            print(f"❌ mcp.types: {e}")
            
    except ImportError as e:
        print(f"❌ mcp no disponible: {e}")
    
    # Verificar fastmcp
    try:
        import fastmcp
        print(f"✅ fastmcp version: {fastmcp.__version__ if hasattr(fastmcp, '__version__') else 'unknown'}")
        
        # Verificar API de fastmcp
        try:
            from fastmcp import FastMCP
            print("✅ fastmcp.FastMCP: disponible")
        except ImportError as e:
            print(f"❌ fastmcp.FastMCP: {e}")
            
    except ImportError as e:
        print(f"❌ fastmcp no disponible: {e}")

def check_other_packages():
    """Verificar otros paquetes importantes"""
    packages = [
        'fastapi', 'uvicorn', 'pydantic', 'pymongo', 'redis'
    ]
    
    print("\n📦 Verificando otros paquetes...")
    for package in packages:
        try:
            module = __import__(package)
            version = getattr(module, '__version__', 'unknown')
            print(f"✅ {package}: {version}")
        except ImportError:
            print(f"❌ {package}: no disponible")

def create_simple_mcp_implementation():
    """Crear implementación MCP simple que funcione"""
    print("\n🛠️ Creando implementación MCP simple...")
    
    simple_server = '''
"""
Implementación MCP simple sin dependencias externas complejas
"""

from typing import Dict, Any
import json
import asyncio
from datetime import datetime

class SimpleMCPServer:
    """Implementación MCP simple para testing"""
    
    def __init__(self):
        self.tools = {
            "ping": self.ping_tool,
            "get_system_info": self.system_info_tool
        }
    
    async def ping_tool(self, message: str = "Hello from Cloud MarketData!") -> Dict[str, Any]:
        """Ping tool"""
        return {
            "status": "pong",
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "server": "Cloud MarketData Simple MCP v0.1.0"
        }
    
    async def system_info_tool(self) -> Dict[str, Any]:
        """System info tool"""
        return {
            "server_name": "Cloud MarketData Simple MCP Server",
            "version": "0.1.0",
            "status": "operational",
            "available_tools": list(self.tools.keys()),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def call_tool(self, name: str, arguments: Dict[str, Any] = None) -> Dict[str, Any]:
        """Call a tool"""
        if name not in self.tools:
            return {"error": f"Tool {name} not found"}
        
        if arguments is None:
            arguments = {}
            
        try:
            if name == "ping":
                return await self.tools[name](arguments.get("message", "Hello from Cloud MarketData!"))
            else:
                return await self.tools[name]()
        except Exception as e:
            return {"error": str(e)}

def create_simple_mcp_server():
    """Factory function"""
    return SimpleMCPServer()

def get_mcp_server():
    """Singleton getter"""
    global _server
    if '_server' not in globals():
        _server = create_simple_mcp_server()
    return _server
'''
    
    with open('/tmp/simple_mcp_server.py', 'w') as f:
        f.write(simple_server)
    
    print("✅ Implementación simple creada en /tmp/simple_mcp_server.py")

if __name__ == "__main__":
    print("🔍 Verificando entorno MCP...")
    check_mcp_api()
    check_other_packages()
    create_simple_mcp_implementation()
    print("\n✅ Verificación completa!")
