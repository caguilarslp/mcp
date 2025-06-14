#!/usr/bin/env python3
"""
Cloud MarketData MCP Server - Standalone MCP Server

This script provides a standalone MCP server that can be used independently
of the FastAPI application for direct MCP client connections.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.mcp_integration.server import run_stdio_server
from src.core.config import Settings
from src.core.logger import setup_logger

# Setup
settings = Settings()
logger = setup_logger(__name__)


async def run_mcp_server():
    """Run the standalone MCP server"""
    logger.info("🚀 Starting Cloud MarketData MCP Server (standalone mode)...")
    
    try:
        # Create MCP server
        mcp_server = create_mcp_server()
        server = mcp_server.get_server()
        
        logger.info("✅ MCP server created successfully")
        logger.info("📡 Available tools:")
        
        # List available tools (if FastMCP provides this functionality)
        logger.info("  - ping: Test connectivity")
        logger.info("  - get_system_info: Get server information")
        
        logger.info("🔌 MCP server ready for connections...")
        logger.info("💡 Use this server with MCP clients like wAIckoff")
        
        # Run the server (this will block)
        await server.run()
        
    except KeyboardInterrupt:
        logger.info("🛑 Received interrupt signal")
    except Exception as e:
        logger.error(f"❌ MCP server error: {e}")
        raise
    finally:
        logger.info("🔌 MCP server shutdown complete")


def main():
    """Main entry point"""
    try:
        asyncio.run(run_mcp_server())
    except KeyboardInterrupt:
        logger.info("👋 Goodbye!")
    except Exception as e:
        logger.error(f"💥 Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
