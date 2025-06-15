"""
Quick WebSocket Test for Bybit

Tests if we can connect to Bybit WebSocket from Docker
"""

import asyncio
import json
import websockets
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_bybit_websocket():
    """Test connection to Bybit WebSocket"""
    url = "wss://stream.bybit.com/v5/public/spot"
    
    try:
        logger.info(f"Connecting to {url}")
        
        async with websockets.connect(url) as websocket:
            logger.info("Connected successfully!")
            
            # Subscribe to BTCUSDT trades
            subscription = {
                "op": "subscribe",
                "args": ["publicTrade.BTCUSDT"]
            }
            
            logger.info(f"Sending subscription: {subscription}")
            await websocket.send(json.dumps(subscription))
            
            # Receive a few messages
            for i in range(5):
                message = await websocket.recv()
                data = json.loads(message)
                logger.info(f"Received message {i+1}: {data}")
                
                # Break if we get trade data
                if "topic" in data and data["topic"] == "publicTrade.BTCUSDT":
                    logger.info("Successfully received trade data!")
                    break
            
            logger.info("Test completed successfully!")
            
    except Exception as e:
        logger.error(f"Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_bybit_websocket())
