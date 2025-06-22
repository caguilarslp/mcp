# WADM Quick Start Scripts

## For Windows Users

### 1. First Time Setup
Run this once to create virtual environment and install dependencies:
```
setup_venv_windows.bat
```

### 2. Start API Server
To start the API server:
```
start_api.bat
```
The API will be available at:
- http://localhost:8000
- Swagger Docs: http://localhost:8000/api/docs

### 3. Test API
In a new terminal, run:
```
test_api_windows.bat
```

### 4. Start Data Collection
To start collecting market data:
```
start_collector.bat
```
(Note: This script needs to be created)

## For Linux/Mac Users

### 1. First Time Setup
```bash
chmod +x setup_venv.sh
./setup_venv.sh
```

### 2. Start API Server
```bash
source venv/bin/activate
python api_server.py
```

### 3. Test API
```bash
source venv/bin/activate
python test_api.py
```

## Manual Commands

If you prefer manual control:

### Activate Virtual Environment
**Windows:**
```
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### Run Components
```bash
# API Server
python api_server.py

# Data Collection
python main.py

# Tests
python test_api.py
python test_smc.py
python check_status.py
```

### Deactivate Virtual Environment
```
deactivate
```

## Common Issues

1. **"python not found"**
   - Make sure Python 3.8+ is installed
   - Check PATH environment variable

2. **"pip not found"**
   - Ensure virtual environment is activated
   - You should see `(venv)` in your prompt

3. **Port 8000 already in use**
   - Kill the process using the port
   - Or modify port in api_server.py

4. **MongoDB connection error**
   - Ensure MongoDB is running
   - Check connection string in .env
