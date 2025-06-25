# WADM Development Best Practices

## Virtual Environment Setup

### Why Use Virtual Environment?
- **Dependency Isolation**: Keep project dependencies separate from system Python
- **Version Control**: Lock specific package versions for reproducibility
- **Clean Development**: Avoid polluting global Python installation
- **Team Consistency**: Ensure all developers use same package versions

### Setup Instructions

#### Windows
```bash
# Create virtual environment
python -m venv venv

# Activate
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Deactivate when done
deactivate
```

#### Linux/Mac
```bash
# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Deactivate when done
deactivate
```

### Best Practices

1. **Always activate venv before working**
   ```bash
   # You'll see (venv) in your terminal prompt when activated
   (venv) D:\projects\mcp\wadm>
   ```

2. **Update requirements.txt when adding packages**
   ```bash
   pip install new-package
   pip freeze > requirements.txt
   ```

3. **Never commit venv folder**
   - Already in `.gitignore`
   - Each developer creates their own

4. **Use exact versions in requirements.txt**
   - Good: `fastapi==0.109.0`
   - Bad: `fastapi>=0.109.0`

### Common Issues

1. **"pip not found" after activation**
   - Solution: Recreate venv with correct Python version
   
2. **Import errors despite package installed**
   - Check if venv is activated
   - Verify with `which python` (Linux/Mac) or `where python` (Windows)

3. **VS Code not using venv**
   - Select interpreter: Ctrl+Shift+P → "Python: Select Interpreter"
   - Choose the one in `./venv/Scripts/python.exe`

## Development Workflow

### Before Starting Work
1. Pull latest changes
2. Activate virtual environment
3. Update dependencies if requirements.txt changed
   ```bash
   pip install -r requirements.txt
   ```

### During Development
1. Keep venv activated
2. Test changes frequently
3. Update documentation as you code
4. Commit logical units of work

### Before Committing
1. Run tests
2. Update requirements.txt if needed
3. Check no venv files are staged
4. Write clear commit messages

## Project Structure Guidelines

### Code Organization
- **src/**: All source code
- **tests/**: Test files (coming soon)
- **docs/**: User documentation
- **claude/**: Development tracking
- **logs/**: Runtime logs (git ignored)

### Import Best Practices
```python
# Good - Absolute imports from src
from src.models import Trade
from src.storage.mongo_manager import MongoManager

# Bad - Relative imports can break
from ..models import Trade
```

### Async Best Practices
```python
# Good - Proper async context manager
async with aiohttp.ClientSession() as session:
    async with session.get(url) as response:
        data = await response.json()

# Good - Gather for concurrent operations
results = await asyncio.gather(
    fetch_data1(),
    fetch_data2(),
    fetch_data3()
)
```

## MongoDB Best Practices

### Indexing Strategy
- Always index fields used in queries
- Compound indexes for multi-field queries
- TTL indexes for automatic cleanup

### Connection Management
- Use connection pooling
- Single MongoManager instance
- Graceful shutdown handling

## API Development

### Endpoint Design
- RESTful conventions
- Consistent error responses
- Proper status codes
- Comprehensive documentation

### Security
- Always validate input
- Use Pydantic models
- Rate limiting on all endpoints
- API key authentication

## Future Considerations

### Docker Preparation
- Keep dependencies minimal
- Use multi-stage builds
- Environment variables for config
- Health check endpoints

### Scaling Preparation
- Stateless API design
- Database connection pooling
- Caching strategy (Redis ready)
- Horizontal scaling support

## Useful Commands

```bash
# Check installed packages
pip list

# Show package details
pip show package-name

# Upgrade pip itself
python -m pip install --upgrade pip

# Create requirements from current env
pip freeze > requirements.txt

# Install specific requirements file
pip install -r requirements-dev.txt
```

## VS Code Recommended Settings

`.vscode/settings.json`:
```json
{
    "python.defaultInterpreterPath": "${workspaceFolder}/venv/Scripts/python.exe",
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "python.formatting.provider": "black",
    "editor.formatOnSave": true,
    "python.testing.pytestEnabled": true
}
```

---

Remember: **A clean development environment leads to fewer bugs and happier developers!** 🚀
