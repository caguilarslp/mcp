import websocket
import json
from collections import defaultdict

symbol = "BTCUSDT"
ws_url = "wss://stream.bybit.com/v5/public/linear"

volume_profile = defaultdict(float)
delta = 0  # Order Flow Delta (Compra - Venta)

def on_message(ws, message):
    global delta
    data = json.loads(message)
    
    if "topic" in data and "publicTrade" in data["topic"]:
        for trade in data["data"]:
            price = float(trade["p"])
            volume = float(trade["v"])
            side = trade["S"]  # "Buy" o "Sell"
            
            # Volume Profile
            volume_profile[price] += volume
            
            # Order Flow Delta
            delta += volume if side == "Buy" else -volume
            
            print(f"Trade: {side} {volume} BTC @ {price} | Delta: {delta:.4f}")

def on_open(ws):
    ws.send(json.dumps({
        "op": "subscribe",
        "args": [f"publicTrade.{symbol}"]
    }))

ws = websocket.WebSocketApp(
    ws_url,
    on_open=on_open,
    on_message=on_message
)

print("Conectando para obtener trades públicos...")
ws.run_forever()

este resultado:

Trade: Buy 0.001 BTC @ 104966.3 | Delta: 19.0500
Trade: Buy 0.001 BTC @ 104967.0 | Delta: 19.0510
Trade: Buy 0.001 BTC @ 104967.3 | Delta: 19.0520
Trade: Buy 0.002 BTC @ 104967.3 | Delta: 19.0540
Trade: Buy 0.001 BTC @ 104970.0 | Delta: 19.0550
Trade: Buy 0.001 BTC @ 104970.2 | Delta: 19.0560
Trade: Buy 0.001 BTC @ 104970.7 | Delta: 19.0570
Trade: Buy 0.001 BTC @ 104971.3 | Delta: 19.0580
Trade: Buy 0.001 BTC @ 104972.7 | Delta: 19.0590
Trade: Sell 0.002 BTC @ 104972.7 | Delta: 19.0570
Trade: Sell 0.007 BTC @ 104972.7 | Delta: 19.0500
Trade: Buy 0.002 BTC @ 104972.8 | Delta: 19.0520
Trade: Buy 0.016 BTC @ 104972.8 | Delta: 19.0680
Trade: Sell 0.001 BTC @ 104972.7 | Delta: 19.0670
Trade: Sell 0.002 BTC @ 104972.7 | Delta: 19.0650
Trade: Buy 0.017 BTC @ 104972.8 | Delta: 19.0820
Trade: Buy 0.004 BTC @ 104972.8 | Delta: 19.0860
Trade: Buy 0.082 BTC @ 104972.8 | Delta: 19.1680
Trade: Buy 0.304 BTC @ 104972.8 | Delta: 19.4720
Trade: Buy 0.37 BTC @ 104972.8 | Delta: 19.8420



import websocket
import json
import time
from collections import defaultdict

# Configuración
symbol = "BTCUSDT"
ws_url = "wss://stream.bybit.com/v5/public/linear"

# Almacenes de datos
volume_profile = defaultdict(float)
buy_volume = 0
sell_volume = 0

def on_message(ws, message):
    global buy_volume, sell_volume
    data = json.loads(message)
    
    # 1. Trades públicos (Volume Profile / Order Flow)
    if "topic" in data and "publicTrade" in data["topic"]:
        for trade in data["data"]:
            price = float(trade["p"])
            volume = float(trade["v"])
            side = trade["S"]  # "Buy" o "Sell"
            
            # Volume Profile
            volume_profile[price] += volume
            
            # Order Flow Delta
            if side == "Buy":
                buy_volume += volume
            else:
                sell_volume += volume
            
            print(f"Trade: {side} {volume:.4f} BTC @ {price} | Delta: {buy_volume - sell_volume:.4f}")

    # 2. Order Book (solo para referencia)
    elif "topic" in data and "orderbook" in data["topic"]:
        print(f"Order Book Update (Seq: {data['data']['seq']})")

def on_error(ws, error):
    print("Error:", error)

def on_close(ws, close_status_code, close_msg):
    print("Conexión cerrada")
    # Mostrar POC al cerrar
    if volume_profile:
        poc_price = max(volume_profile, key=volume_profile.get)
        print(f"\n--- Volume Profile ---\nPOC: {poc_price} | Volumen: {volume_profile[poc_price]:.4f} BTC")

def on_open(ws):
    print("Conexión abierta. Suscribiendo a datos...")
    ws.send(json.dumps({
        "op": "subscribe",
        "args": [
            f"publicTrade.{symbol}",
            f"orderbook.50.{symbol}"
        ]
    }))

# Configurar WebSocket
ws = websocket.WebSocketApp(
    ws_url,
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)

# Manejar Ctrl+C
try:
    print(f"Conectando a {ws_url}... (Presiona Ctrl+C para detener)")
    ws.run_forever(ping_interval=20)
except KeyboardInterrupt:
    print("\nDeteniendo manualmente...")
    ws.close()



este resultado:
Order Book Update (Seq: 417054540808)
Order Book Update (Seq: 417054540833)
Order Book Update (Seq: 417054540885)
Trade: Buy 0.0040 BTC @ 105079.4 | Delta: 0.2110
Order Book Update (Seq: 417054540936)
Order Book Update (Seq: 417054540964)
Order Book Update (Seq: 417054540995)
Order Book Update (Seq: 417054541019)
Order Book Update (Seq: 417054541044)
Order Book Update (Seq: 417054541087)
Order Book Update (Seq: 417054541129)
Order Book Update (Seq: 417054541157)
Order Book Update (Seq: 417054541174)
Order Book Update (Seq: 417054541188)
Order Book Update (Seq: 417054541223)
Order Book Update (Seq: 417054541254)
Order Book Update (Seq: 417054541297)