# WADM - wAIckoff Data Manager

Simple and functional market data collector with indicator calculations.

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start MongoDB:
```bash
# Using Docker
docker run -d -p 27017:27017 --name wadm-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=wadm \
  -e MONGO_INITDB_ROOT_PASSWORD=wadm_secure_pass \
  mongo:latest

# Or use existing MongoDB and update .env
```

3. Run the collector:
```bash
python main.py
```

4. Check status:
```bash
python check_status.py
```

## Features

- **Real-time trade collection** from Bybit and Binance
- **Volume Profile** - POC, VAH, VAL calculation
- **Order Flow** - Delta, cumulative delta, absorption detection
- **Automatic cleanup** - 1h trades, 24h indicators
- **Simple and modular** - Easy to extend

## Configuration

Edit `.env` file to configure:
- MongoDB connection
- Symbols to collect
- Data retention periods
- WebSocket settings

## Project Structure

```
wadm/
├── src/
│   ├── collectors/     # Exchange WebSocket collectors
│   ├── indicators/     # Volume Profile, Order Flow
│   ├── models/        # Data models
│   ├── storage/       # MongoDB manager
│   └── manager.py     # Main coordinator
├── docs/tracking/     # Development logs and tasks
├── logs/             # Application logs
└── main.py          # Entry point
```

## Adding New Features

1. Create new indicator in `src/indicators/`
2. Add calculation to `manager.py`
3. Update storage if needed
4. Test and document

## Current Status

- v0.1.0 - Basic functionality
- Collecting trades and calculating indicators
- No API yet, just data collection
- No Docker yet, keeping it simple

## Next Steps

See `docs/tracking/tasks.md` for planned features.
