# WADM Troubleshooting Guide

## Common Issues and Solutions

### 1. MongoDB Connection Error

**Problem**: API server fails to start with MongoDB connection error

**Solutions**:

#### Option A: Start MongoDB with Docker (Recommended)
```bash
# Start MongoDB without authentication
docker run -d -p 27017:27017 --name wadm-mongo mongo:latest

# Or with authentication (as in README)
docker run -d -p 27017:27017 --name wadm-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=wadm \
  -e MONGO_INITDB_ROOT_PASSWORD=wadm_secure_pass \
  mongo:latest
```

#### Option B: Use existing MongoDB
Update `.env` file with your MongoDB connection string:
```
MONGODB_URL=mongodb://localhost:27017/wadm
```

#### Option C: Test API without MongoDB
```bash
# Activate venv
venv\Scripts\activate

# Run simple test server
python test_api_simple.py
```

### 2. Import Errors

**Problem**: `ModuleNotFoundError` when starting API

**Solution**: Make sure virtual environment is activated:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### 3. Port Already in Use

**Problem**: `[Errno 10048] Only one usage of each socket address`

**Solution**:
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <process_id> /F

# Or use a different port
python api_server.py --port 8001
```

### 4. Virtual Environment Issues

**Problem**: `pip` not found or wrong Python version

**Solution**:
```bash
# Delete old venv
rmdir /s venv

# Create new venv with specific Python
python -m venv venv

# Or
py -3.11 -m venv venv
```

## Quick Diagnostic Commands

### Check MongoDB Status
```bash
python test_mongo.py
```

### Test API Without Dependencies
```bash
python test_api_simple.py
```

### Verify Installation
```bash
# Activate venv first!
pip list
python --version
```

## Development Tips

1. **Always activate venv** before working
2. **Check MongoDB** is running before starting API
3. **Use scripts** for consistent startup:
   - `start_api_with_check.bat` - Checks MongoDB first
   - `test_api_simple.py` - Test without MongoDB

## Still Having Issues?

1. Check the logs in `logs/` directory
2. Verify all dependencies with `pip install -r requirements.txt`
3. Make sure you're in the project root directory
4. Try the simple test server first: `python test_api_simple.py`
