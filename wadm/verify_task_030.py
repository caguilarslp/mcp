"""
TASK-030 Completion Script
Verify all market data endpoints are working correctly
"""

import asyncio
import subprocess
import time
import sys
import os

def start_api_server():
    """Start the API server in background"""
    try:
        # Add project root to path
        sys.path.insert(0, r"D:\projects\mcp\wadm")
        
        print("🚀 Starting WADM API Server...")
        
        # Change to project directory
        os.chdir(r"D:\projects\mcp\wadm")
        
        # Start the server
        process = subprocess.Popen([
            sys.executable, "api_server.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Wait a bit for server to start
        time.sleep(5)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ API Server started successfully")
            return process
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Server failed to start:")
            print(f"STDOUT: {stdout}")
            print(f"STDERR: {stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return None

async def run_tests():
    """Run the TASK-030 tests"""
    try:
        # Import and run tests
        sys.path.insert(0, r"D:\projects\mcp\wadm")
        
        # Import the test module
        from test_task_030 import main as test_main
        
        print("🧪 Running TASK-030 tests...")
        await test_main()
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main execution"""
    print("🎯 TASK-030: Market Data API Endpoints - Completion Verification")
    print("=" * 60)
    
    # Start API server
    server_process = start_api_server()
    
    if not server_process:
        print("❌ Cannot continue without API server")
        return
    
    try:
        # Run tests
        asyncio.run(run_tests())
        
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        # Clean up server
        if server_process and server_process.poll() is None:
            print("\n🛑 Stopping API server...")
            server_process.terminate()
            time.sleep(2)
            if server_process.poll() is None:
                server_process.kill()
            print("✅ API server stopped")
    
    print("\n🏁 TASK-030 verification completed!")

if __name__ == "__main__":
    main()
