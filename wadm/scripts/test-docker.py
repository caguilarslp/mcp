#!/usr/bin/env python3
"""
WADM Docker Test Suite
Quick tests to verify Docker setup is working correctly
"""

import time
import requests
import json
import subprocess
import sys
from typing import Dict, List

# Test configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 30  # seconds

class Colors:
    """Console colors for pretty output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_status(message: str, status: str = "info"):
    """Print colored status message"""
    colors = {
        "info": Colors.BLUE,
        "success": Colors.GREEN,
        "warning": Colors.YELLOW,
        "error": Colors.RED,
        "test": Colors.CYAN
    }
    color = colors.get(status, Colors.BLUE)
    print(f"{color}[WADM-TEST]{Colors.END} {message}")

def run_command(command: str) -> tuple:
    """Run shell command and return output"""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True,
            timeout=30
        )
        return True, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def test_docker_services() -> bool:
    """Test if Docker services are running"""
    print_status("Testing Docker services...", "test")
    
    success, stdout, stderr = run_command("docker-compose ps")
    if not success:
        print_status(f"Docker Compose not available: {stderr}", "error")
        return False
    
    # Check if services are running
    required_services = ["wadm-api", "mongodb", "redis"]
    running_services = []
    
    for line in stdout.split('\n'):
        for service in required_services:
            if service in line and "Up" in line:
                running_services.append(service)
                print_status(f"✅ {service} is running", "success")
    
    missing_services = set(required_services) - set(running_services)
    if missing_services:
        for service in missing_services:
            print_status(f"❌ {service} is not running", "error")
        return False
    
    return True

def test_api_health() -> bool:
    """Test API health endpoint"""
    print_status("Testing API health...", "test")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/system/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print_status(f"✅ API Health: {data.get('status', 'unknown')}", "success")
            return True
        else:
            print_status(f"❌ API Health check failed: {response.status_code}", "error")
            return False
    except requests.RequestException as e:
        print_status(f"❌ API Health check failed: {e}", "error")
        return False

def test_database_connection() -> bool:
    """Test database connection"""
    print_status("Testing database connection...", "test")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/system/database", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'connected':
                print_status(f"✅ Database connected: {data.get('collections', 0)} collections", "success")
                return True
            else:
                print_status(f"❌ Database not connected: {data}", "error")
                return False
        else:
            print_status(f"❌ Database check failed: {response.status_code}", "error")
            return False
    except requests.RequestException as e:
        print_status(f"❌ Database check failed: {e}", "error")
        return False

def test_redis_connection() -> bool:
    """Test Redis connection via API"""
    print_status("Testing Redis connection...", "test")
    
    try:
        # Test cache stats endpoint (which uses Redis)
        response = requests.get(f"{BASE_URL}/api/v1/system/cache/stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print_status(f"✅ Redis connected: {data.get('status', 'unknown')}", "success")
            return True
        else:
            print_status(f"❌ Redis check failed: {response.status_code}", "error")
            return False
    except requests.RequestException as e:
        print_status(f"❌ Redis check failed: {e}", "error")
        return False

def test_api_endpoints() -> bool:
    """Test key API endpoints"""
    print_status("Testing API endpoints...", "test")
    
    endpoints = [
        ("/api/v1/system/metrics", "System metrics"),
        ("/api/v1/market/symbols", "Market symbols"),
        ("/api/v1/auth", "Authentication info")
    ]
    
    success_count = 0
    
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            if response.status_code == 200:
                print_status(f"✅ {description}: OK", "success")
                success_count += 1
            else:
                print_status(f"❌ {description}: {response.status_code}", "error")
        except requests.RequestException as e:
            print_status(f"❌ {description}: {e}", "error")
    
    return success_count == len(endpoints)

def test_api_documentation() -> bool:
    """Test API documentation is accessible"""
    print_status("Testing API documentation...", "test")
    
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=10)
        if response.status_code == 200:
            print_status("✅ API documentation accessible", "success")
            return True
        else:
            print_status(f"❌ API documentation failed: {response.status_code}", "error")
            return False
    except requests.RequestException as e:
        print_status(f"❌ API documentation failed: {e}", "error")
        return False

def wait_for_api(max_wait: int = 60) -> bool:
    """Wait for API to be ready"""
    print_status(f"Waiting for API to be ready (max {max_wait}s)...", "info")
    
    for i in range(max_wait):
        try:
            response = requests.get(f"{BASE_URL}/api/v1/system/health", timeout=5)
            if response.status_code == 200:
                print_status(f"✅ API ready after {i}s", "success")
                return True
        except requests.RequestException:
            pass
        
        if i % 5 == 0 and i > 0:
            print_status(f"Still waiting... ({i}s elapsed)", "info")
        
        time.sleep(1)
    
    print_status(f"❌ API not ready after {max_wait}s", "error")
    return False

def main():
    """Run all tests"""
    print_status("🚀 WADM Docker Test Suite Starting...", "info")
    print("-" * 50)
    
    tests = [
        ("Docker Services", test_docker_services),
        ("API Readiness", lambda: wait_for_api(30)),
        ("API Health", test_api_health),
        ("Database Connection", test_database_connection),
        ("Redis Connection", test_redis_connection),
        ("API Endpoints", test_api_endpoints),
        ("API Documentation", test_api_documentation)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if test_func():
                passed += 1
                print_status(f"✅ {test_name} PASSED", "success")
            else:
                print_status(f"❌ {test_name} FAILED", "error")
        except Exception as e:
            print_status(f"❌ {test_name} ERROR: {e}", "error")
    
    print("\n" + "="*60)
    print_status(f"Test Results: {passed}/{total} tests passed", 
                "success" if passed == total else "warning")
    
    if passed == total:
        print_status("🎉 All tests passed! WADM Docker setup is working perfectly.", "success")
        print_status(f"🌐 Access your WADM API at: {BASE_URL}", "info")
        print_status(f"📚 API Documentation: {BASE_URL}/docs", "info")
        return True
    else:
        print_status(f"⚠️  {total - passed} tests failed. Check logs above.", "warning")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
