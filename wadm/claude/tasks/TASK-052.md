# TASK-052: Celery & Background Task Processing

**Status:** TODO  
**Priority:** MEDIUM 🔄  
**Time:** 12h  
**Description:** Implementar Celery + RabbitMQ para tareas en background

## When Celery Makes Sense

### ✅ Use Cases for Celery in WADM
1. **Heavy Computations**: Backtesting, historical analysis
2. **Scheduled Tasks**: Daily reports, data cleanup
3. **Multi-user Operations**: Concurrent analysis requests
4. **Resource-Intensive Tasks**: ML model inference
5. **Email/Notifications**: Alert sending
6. **Data Export**: Large CSV/Excel generation

### ❌ Not Suitable for Celery
1. **Real-time SMC Analysis**: Needs immediate results
2. **WebSocket Streaming**: Direct connection required
3. **API Responses**: User expects immediate response
4. **Live Market Data**: Real-time processing needed

## Celery Implementation Plan

### Phase 1: Infrastructure Setup (4h)
- [ ] RabbitMQ container in Docker Compose
- [ ] Celery worker configuration
- [ ] Celery beat scheduler for periodic tasks
- [ ] Redis as result backend
- [ ] Flower monitoring dashboard
- [ ] Worker auto-scaling configuration

### Phase 2: Task Implementation (4h)
- [ ] Historical data analysis tasks
- [ ] Backtesting framework tasks
- [ ] Report generation tasks
- [ ] Data cleanup and maintenance tasks
- [ ] Email notification tasks
- [ ] Export generation tasks

### Phase 3: Monitoring & Management (2h)
- [ ] Task monitoring and logging
- [ ] Failed task retry strategies
- [ ] Task result storage and retrieval
- [ ] Performance metrics collection
- [ ] Worker health monitoring
- [ ] Queue management and priorities

### Phase 4: API Integration (2h)
- [ ] Task submission endpoints
- [ ] Task status checking endpoints
- [ ] Result retrieval endpoints
- [ ] Task cancellation endpoints
- [ ] Bulk task operations
- [ ] WebSocket task notifications

## Docker Services Addition

### RabbitMQ Service
```yaml
rabbitmq:
  image: rabbitmq:3-management
  container_name: wadm-rabbitmq
  environment:
    RABBITMQ_DEFAULT_USER: wadm
    RABBITMQ_DEFAULT_PASS: wadm_rabbit_pass
  ports:
    - "5672:5672"     # AMQP port
    - "15672:15672"   # Management UI
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
```

### Celery Worker Service
```yaml
celery-worker:
  build: .
  container_name: wadm-celery-worker
  command: celery -A src.celery worker --loglevel=info
  environment:
    - CELERY_BROKER_URL=amqp://wadm:wadm_rabbit_pass@rabbitmq:5672//
    - CELERY_RESULT_BACKEND=redis://redis:6379/1
  depends_on:
    - rabbitmq
    - redis
    - mongodb
```

### Celery Beat Scheduler
```yaml
celery-beat:
  build: .
  container_name: wadm-celery-beat
  command: celery -A src.celery beat --loglevel=info
  environment:
    - CELERY_BROKER_URL=amqp://wadm:wadm_rabbit_pass@rabbitmq:5672//
    - CELERY_RESULT_BACKEND=redis://redis:6379/1
  depends_on:
    - rabbitmq
    - redis
```

## Task Examples

### Backtesting Task
```python
@celery.task(bind=True)
def run_backtest(self, strategy_config: dict, symbol: str, timeframe: str):
    """Run backtesting analysis in background"""
    try:
        # Long-running backtesting logic
        results = perform_backtest(strategy_config, symbol, timeframe)
        return {"status": "completed", "results": results}
    except Exception as exc:
        self.retry(countdown=60, max_retries=3, exc=exc)
```

### Report Generation Task
```python
@celery.task
def generate_daily_report(date: str, symbols: List[str]):
    """Generate comprehensive daily market report"""
    report_data = analyze_daily_data(date, symbols)
    pdf_path = create_pdf_report(report_data)
    send_report_email(pdf_path)
    return {"report_path": pdf_path, "status": "sent"}
```

### Scheduled Tasks
```python
# Celery Beat Schedule
beat_schedule = {
    'daily-report': {
        'task': 'src.tasks.generate_daily_report',
        'schedule': crontab(hour=8, minute=0),  # 8 AM daily
    },
    'cleanup-old-data': {
        'task': 'src.tasks.cleanup_expired_data',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
    'exchange-health-check': {
        'task': 'src.tasks.check_exchange_connectivity',
        'schedule': 30.0,  # Every 30 seconds
    }
}
```

## API Integration

### Task Management Endpoints
```python
POST /api/v1/tasks/backtest          # Submit backtesting task
POST /api/v1/tasks/report            # Generate report task
GET  /api/v1/tasks/{task_id}         # Get task status
DELETE /api/v1/tasks/{task_id}       # Cancel task
GET  /api/v1/tasks/                  # List user tasks
GET  /api/v1/tasks/{task_id}/result  # Get task result
```

### WebSocket Task Updates
```python
# Real-time task status updates
ws://localhost:8000/ws/tasks/{user_id}

# Message format
{
    "task_id": "uuid",
    "status": "PENDING|STARTED|SUCCESS|FAILURE",
    "progress": 0.75,
    "result": {...},
    "error": "error message"
}
```

## When to Implement

### 🎯 Implementation Priority
**Priority**: MEDIUM (after core features)

**Triggers for Implementation**:
1. **User Demand**: Multiple users requesting heavy analysis
2. **Performance Issues**: API blocking on long operations
3. **Feature Requirements**: Backtesting, reports, exports
4. **Scale Needs**: Background processing becomes bottleneck

### 📅 Suggested Timeline
- **Now**: Focus on TASK-031 (Indicators API) - core functionality
- **Week 2**: After frontend dashboard is working
- **Month 1**: When we have users requesting heavy computations
- **Month 2**: When we need scheduled reports and maintenance

## Value Proposition
- **User Experience**: Non-blocking heavy operations
- **Scalability**: Horizontal worker scaling
- **Reliability**: Task retry and failure handling
- **Scheduling**: Automated maintenance and reports
- **Resource Management**: Separate compute for heavy tasks

## Current Recommendation
**Wait on Celery until we have**:
1. ✅ Core API endpoints working (TASK-031)
2. ✅ Frontend dashboard functional (TASK-032/033)
3. ✅ User authentication system (TASK-049)
4. 📋 Actual user demand for heavy computations
5. 📋 Performance bottlenecks in current system

**Focus next on**: TASK-031 Indicators API → Frontend → Security → Then Celery when needed.
