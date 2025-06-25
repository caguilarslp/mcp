"""Simple MCP test wrapper to debug startup issues."""

import asyncio
import json
import subprocess
import os
from pathlib import Path

async def test_mcp_direct():
    """Test MCP Server directly without wrapper complexity."""
    
    print("=== MCP Direct Test ===")
    print(f"Current directory: {os.getcwd()}")
    print(f"Files in directory: {os.listdir('.')}")
    
    # Check if build exists
    build_path = Path("build/index.js")
    if not build_path.exists():
        print(f"ERROR: {build_path} not found!")
        print(f"Contents of current dir: {list(Path('.').iterdir())}")
        return
    
    print(f"Found MCP build at: {build_path}")
    
    # Try to run MCP directly
    print("\nTesting MCP with simple echo...")
    
    try:
        # Run with subprocess (simpler for debugging)
        process = subprocess.Popen(
            ["node", str(build_path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**os.environ, "NODE_ENV": "production"}
        )
        
        # Send a simple request
        request = json.dumps({
            "jsonrpc": "2.0",
            "method": "tools/list",
            "id": 1
        }) + "\n"
        
        print(f"Sending: {request.strip()}")
        
        # Send and get response
        stdout, stderr = process.communicate(input=request, timeout=10)
        
        print(f"Exit code: {process.returncode}")
        print(f"Stdout: {stdout[:500]}")
        print(f"Stderr: {stderr[:500]}")
        
        if stdout:
            try:
                response = json.loads(stdout.strip().split('\n')[0])
                print(f"Parsed response: {json.dumps(response, indent=2)[:500]}")
            except:
                print("Could not parse response as JSON")
        
    except subprocess.TimeoutExpired:
        print("ERROR: Process timed out")
        process.kill()
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
    
    print("\n=== End Test ===")

if __name__ == "__main__":
    asyncio.run(test_mcp_direct())
