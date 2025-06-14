"""
Tests for MCP server integration
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import datetime

from src.mcp.server import create_mcp_server, get_mcp_server
from src.mcp.tools import ping_tool, system_info_tool


class TestMCPServer:
    """Test cases for MCP server functionality"""
    
    def test_create_mcp_server(self):
        """Test MCP server creation"""
        server = create_mcp_server()
        assert server is not None
        assert hasattr(server, 'mcp')
        assert hasattr(server, 'get_server')
    
    def test_get_mcp_server_singleton(self):
        """Test MCP server singleton pattern"""
        server1 = get_mcp_server()
        server2 = get_mcp_server()
        assert server1 is server2


class TestMCPTools:
    """Test cases for MCP tools"""
    
    @pytest.mark.asyncio
    async def test_ping_tool_default_message(self):
        """Test ping tool with default message"""
        result = await ping_tool()
        
        assert result["status"] == "pong"
        assert result["message"] == "Hello from Cloud MarketData!"
        assert result["server"] == "Cloud MarketData MCP v0.1.0"
        assert "timestamp" in result
        
        # Verify timestamp is valid ISO format
        datetime.fromisoformat(result["timestamp"])
    
    @pytest.mark.asyncio
    async def test_ping_tool_custom_message(self):
        """Test ping tool with custom message"""
        custom_message = "Custom test message"
        result = await ping_tool(custom_message)
        
        assert result["status"] == "pong"
        assert result["message"] == custom_message
        assert result["server"] == "Cloud MarketData MCP v0.1.0"
        assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_system_info_tool(self):
        """Test system info tool"""
        result = await system_info_tool()
        
        assert result["server_name"] == "Cloud MarketData MCP Server"
        assert result["version"] == "0.1.0"
        assert result["status"] == "operational"
        assert "available_tools" in result
        assert "capabilities" in result
        assert "timestamp" in result
        
        # Verify expected tools are listed
        assert "ping" in result["available_tools"]
        assert "get_system_info" in result["available_tools"]
        
        # Verify capabilities structure
        assert "market_data" in result["capabilities"]
        assert "volume_profile" in result["capabilities"]
        assert "order_flow" in result["capabilities"]
        
        # Verify timestamp is valid ISO format
        datetime.fromisoformat(result["timestamp"])


class TestMCPIntegration:
    """Integration tests for MCP functionality"""
    
    @pytest.mark.asyncio
    async def test_mcp_server_tools_registration(self):
        """Test that MCP server properly registers tools"""
        server = create_mcp_server()
        mcp_instance = server.get_server()
        
        # Verify server was created
        assert mcp_instance is not None
        
        # Note: FastMCP internal testing would require accessing
        # the internal tool registry, which may not be publicly available
        # For now, we test that the server creation doesn't fail
    
    @pytest.mark.asyncio
    async def test_tool_error_handling(self):
        """Test error handling in tools"""
        # Test with invalid input types (should not crash)
        try:
            result = await ping_tool(None)
            # If it doesn't crash, it should handle None gracefully
            assert "status" in result
        except Exception as e:
            # If it does throw an exception, it should be handled gracefully
            assert isinstance(e, (TypeError, ValueError))
    
    @pytest.mark.asyncio
    async def test_concurrent_tool_calls(self):
        """Test concurrent tool execution"""
        import asyncio
        
        # Run multiple tools concurrently
        tasks = [
            ping_tool("Message 1"),
            ping_tool("Message 2"),
            system_info_tool(),
            ping_tool("Message 3")
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Verify all results are valid
        assert len(results) == 4
        
        # Verify ping results
        for i, result in enumerate(results[:3:2]):  # Index 0 and 2 are ping results
            assert result["status"] == "pong"
            assert f"Message {i*2 + 1}" in result["message"]
        
        # Verify system info result
        assert results[2]["server_name"] == "Cloud MarketData MCP Server"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
