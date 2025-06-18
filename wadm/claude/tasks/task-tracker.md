# WADM Tasks

## Active Tasks

### TASK-001: Test Basic System
**Status:** TODO  
**Priority:** HIGH  
**Time:** 1h  
**Description:** Test the basic collector and indicator system
- [ ] Install dependencies
- [ ] Start MongoDB
- [ ] Run main.py
- [ ] Verify trade collection
- [ ] Check indicator calculations
- [ ] Monitor logs for errors

### TASK-002: Add VWAP Indicator
**Status:** TODO  
**Priority:** MEDIUM  
**Time:** 2h  
**Description:** Add Volume Weighted Average Price indicator
- [ ] Create VWAP calculator
- [ ] Integrate with manager
- [ ] Store in MongoDB

### TASK-003: Create Simple API
**Status:** TODO  
**Priority:** MEDIUM  
**Time:** 3h  
**Description:** FastAPI endpoint to retrieve indicators
- [ ] Setup FastAPI app
- [ ] Create endpoints for indicators
- [ ] Add WebSocket endpoint for real-time data
- [ ] Basic authentication

### TASK-004: Add Footprint Chart Data
**Status:** TODO  
**Priority:** LOW  
**Time:** 4h  
**Description:** Calculate footprint/cluster chart data
- [ ] Group trades by price and time
- [ ] Calculate bid/ask volume per level
- [ ] Store cluster data

### TASK-005: Docker Support
**Status:** TODO  
**Priority:** LOW  
**Time:** 2h  
**Description:** Create Docker setup once system is stable
- [ ] Create Dockerfile
- [ ] Setup docker-compose
- [ ] Include MongoDB and Redis

## Completed Tasks

None yet - just started!

## Task Guidelines
- Keep tasks small and focused (1-4 hours)
- Test each feature before moving to next
- Update this file as tasks progress
- Log important decisions in development-log.md
