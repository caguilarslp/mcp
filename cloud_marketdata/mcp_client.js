#!/usr/bin/env node
/**
 * Cloud MarketData MCP Client - Simple test client
 * 
 * This client tests the MCP server functionality by connecting
 * and calling the available tools.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPServer() {
    console.log('🔌 Testing Cloud MarketData MCP Server...');
    
    try {
        // Create transport (stdio for local testing)
        const transport = new StdioClientTransport({
            command: 'python',
            args: ['mcp_server.py'],
            env: {
                ...process.env,
                PYTHONPATH: '.'
            }
        });
        
        // Create client
        const client = new Client({
            name: 'cloud-marketdata-test-client',
            version: '0.1.0'
        }, {
            capabilities: {
                tools: {}
            }
        });
        
        // Connect
        console.log('📡 Connecting to MCP server...');
        await client.connect(transport);
        console.log('✅ Connected successfully!');
        
        // List available tools
        console.log('🔍 Listing available tools...');
        const tools = await client.listTools();
        console.log('📋 Available tools:', tools.tools.map(t => t.name));
        
        // Test ping tool
        console.log('🏓 Testing ping tool...');
        const pingResult = await client.callTool({
            name: 'ping',
            arguments: { message: 'Hello from MCP client!' }
        });
        console.log('📨 Ping result:', pingResult.content);
        
        // Test system info tool
        console.log('ℹ️ Testing system info tool...');
        const infoResult = await client.callTool({
            name: 'get_system_info',
            arguments: {}
        });
        console.log('📊 System info:', infoResult.content);
        
        console.log('✅ All tests passed!');
        
    } catch (error) {
        console.error('❌ Error testing MCP server:', error);
        process.exit(1);
    } finally {
        console.log('🔌 Disconnecting...');
        process.exit(0);
    }
}

// Run the test
testMCPServer().catch(console.error);
