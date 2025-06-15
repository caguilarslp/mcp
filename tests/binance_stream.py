import websocket
import json

# Lista de pares a monitorear
symbols = ["btcusdt", "ethusdt", "solusdt"]

# Generar URL concatenando streams
streams = []
for symbol in symbols:
    streams.append(f"{symbol}@trade")
    streams.append(f"{symbol}@depth@100ms")
ws_url = f"wss://stream.binance.com:9443/ws/{'/'.join(streams)}"

def on_message(ws, message):
    data = json.loads(message)
    
    # Procesar trades
    if data.get("e") == "trade":
        symbol = data["s"].lower()  # "BTCUSDT" -> "btcusdt"
        price = float(data["p"])
        volume = float(data["q"])
        side = "Sell" if data["m"] else "Buy"
        print(f"[{symbol}] Trade: {side} {volume} @ {price}")
    
    # Procesar order book
    elif data.get("e") == "depthUpdate":
        symbol = data["s"].lower()
        bids = data.get("b", [])
        asks = data.get("a", [])
        print(f"[{symbol}] Order Book - Bids: {len(bids)} | Asks: {len(asks)}")

ws = websocket.WebSocketApp(ws_url, on_message=on_message)
ws.run_forever(ping_interval=30)

# resultado
# [solusdt] Order Book - Bids: 11 | Asks: 10
# [solusdt] Trade: Sell 2.004 @ 151.41
# [btcusdt] Order Book - Bids: 10 | Asks: 13
# [ethusdt] Order Book - Bids: 7 | Asks: 8
# [ethusdt] Trade: Sell 0.0392 @ 2553.58
# [solusdt] Trade: Sell 0.184 @ 151.41
# [solusdt] Trade: Sell 1.455 @ 151.41
# [solusdt] Order Book - Bids: 9 | Asks: 14
# [btcusdt] Order Book - Bids: 1 | Asks: 15
# [ethusdt] Order Book - Bids: 5 | Asks: 6
# [btcusdt] Trade: Sell 0.0024 @ 105505.37
# [solusdt] Trade: Buy 0.034 @ 151.42
# [solusdt] Trade: Buy 0.036 @ 151.42
# [solusdt] Trade: Buy 0.036 @ 151.42
# [solusdt] Trade: Buy 0.036 @ 151.42
# [solusdt] Trade: Buy 0.036 @ 151.42
# [solusdt] Trade: Buy 0.036 @ 151.42
# [solusdt] Trade: Buy 0.036 @ 151.42
# [solusdt] Trade: Buy 0.036 @ 151.42
# [solusdt] Trade: Buy 0.036 @ 151.42
# [solusdt] Trade: Buy 0.458 @ 151.42
# [solusdt] Order Book - Bids: 8 | Asks: 13
# [btcusdt] Order Book - Bids: 10 | Asks: 11
# [ethusdt] Trade: Sell 0.003 @ 2553.58
# [ethusdt] Order Book - Bids: 2 | Asks: 8
# [solusdt] Order Book - Bids: 10 | Asks: 14
# [btcusdt] Order Book - Bids: 2 | Asks: 8
# [ethusdt] Order Book - Bids: 4 | Asks: 12
# [solusdt] Order Book - Bids: 10 | Asks: 5
# [btcusdt] Order Book - Bids: 5 | Asks: 5
# [ethusdt] Order Book - Bids: 8 | Asks: 5
# [btcusdt] Trade: Buy 8e-05 @ 105505.38

