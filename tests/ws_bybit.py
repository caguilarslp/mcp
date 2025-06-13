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


# import websocket
# import json
# import time
# from collections import defaultdict

# # Configuración
# symbol = "BTCUSDT"
# ws_url = "wss://stream.bybit.com/v5/public/linear"

# # Almacenes de datos
# volume_profile = defaultdict(float)
# buy_volume = 0
# sell_volume = 0

# def on_message(ws, message):
#     global buy_volume, sell_volume
#     data = json.loads(message)
    
#     # 1. Trades públicos (Volume Profile / Order Flow)
#     if "topic" in data and "publicTrade" in data["topic"]:
#         for trade in data["data"]:
#             price = float(trade["p"])
#             volume = float(trade["v"])
#             side = trade["S"]  # "Buy" o "Sell"
            
#             # Volume Profile
#             volume_profile[price] += volume
            
#             # Order Flow Delta
#             if side == "Buy":
#                 buy_volume += volume
#             else:
#                 sell_volume += volume
            
#             print(f"Trade: {side} {volume:.4f} BTC @ {price} | Delta: {buy_volume - sell_volume:.4f}")

#     # 2. Order Book (solo para referencia)
#     elif "topic" in data and "orderbook" in data["topic"]:
#         print(f"Order Book Update (Seq: {data['data']['seq']})")

# def on_error(ws, error):
#     print("Error:", error)

# def on_close(ws, close_status_code, close_msg):
#     print("Conexión cerrada")
#     # Mostrar POC al cerrar
#     if volume_profile:
#         poc_price = max(volume_profile, key=volume_profile.get)
#         print(f"\n--- Volume Profile ---\nPOC: {poc_price} | Volumen: {volume_profile[poc_price]:.4f} BTC")

# def on_open(ws):
#     print("Conexión abierta. Suscribiendo a datos...")
#     ws.send(json.dumps({
#         "op": "subscribe",
#         "args": [
#             f"publicTrade.{symbol}",
#             f"orderbook.50.{symbol}"
#         ]
#     }))

# # Configurar WebSocket
# ws = websocket.WebSocketApp(
#     ws_url,
#     on_open=on_open,
#     on_message=on_message,
#     on_error=on_error,
#     on_close=on_close
# )

# # Manejar Ctrl+C
# try:
#     print(f"Conectando a {ws_url}... (Presiona Ctrl+C para detener)")
#     ws.run_forever(ping_interval=20)
# except KeyboardInterrupt:
#     print("\nDeteniendo manualmente...")
#     ws.close()


# import websocket
# import json
# from datetime import datetime

# # Configuración
# symbol = "BTCUSDT"
# ws_url = "wss://stream.bybit.com/v5/public/linear"  # Para futuros lineales (USDT)

# # Almacén de datos
# volume_profile = {}

# def on_message(ws, message):
#     data = json.loads(message)
#     print("Mensaje recibido:", data)  # Debug: ver raw data

#     # 1. Trades públicos (Volume Profile / Order Flow)
#     if "topic" in data and "publicTrade" in data["topic"]:
#         trades = data["data"]
#         for trade in trades:
#             price = float(trade["p"])
#             volume = float(trade["v"])
#             side = trade["S"]  # Buy/Sell (Order Flow)
            
#             # Acumular volumen por precio
#             if price in volume_profile:
#                 volume_profile[price] += volume
#             else:
#                 volume_profile[price] = volume
            
#             print(f"Trade: {side} {volume} BTC a {price} | Volumen acumulado: {volume_profile[price]}")

#     # 2. Order Book L2 (Order Flow)
#     elif "topic" in data and "orderbook" in data["topic"]:
#         print("Order Book Update:", data["data"])

# def on_error(ws, error):
#     print("Error:", error)

# def on_close(ws, close_status_code, close_msg):
#     print("Conexión cerrada")

# def on_open(ws):
#     print("Conexión abierta. Suscribiendo a datos...")
#     # Suscribirse a trades públicos y orderbook
#     ws.send(json.dumps({
#         "op": "subscribe",
#         "args": [
#             f"publicTrade.{symbol}",
#             f"orderbook.50.{symbol}"  # 50 niveles de profundidad
#         ]
#     }))

# # Iniciar conexión
# ws = websocket.WebSocketApp(
#     ws_url,
#     on_open=on_open,
#     on_message=on_message,
#     on_error=on_error,
#     on_close=on_close
# )

# print(f"Conectando a {ws_url}...")
# ws.run_forever()


# import websocket
# import json
# from datetime import datetime

# # Configuración
# symbol = "BTCUSDT"
# ws_url = "wss://ws2.bybit.com/realtime_w"

# # Almacén de datos para Volume Profile
# volume_profile = {}

# def on_message(ws, message):
#     data = json.loads(message)
    
#     # 1. Si es un trade (Volume Profile / Order Flow)
#     if "topic" in data and "trade" in data["topic"]:
#         trades = data["data"]
#         for trade in trades:
#             price = float(trade["price"])
#             volume = float(trade["size"])
#             side = trade["side"]  # Buy/Sell (Order Flow)
            
#             # Acumular volumen por precio (Volume Profile)
#             if price in volume_profile:
#                 volume_profile[price] += volume
#             else:
#                 volume_profile[price] = volume
            
#             print(f"Trade: {side} {volume} BTC a {price} | Volumen acumulado: {volume_profile[price]}")

#     # 2. Si es Order Book (Order Flow)
#     elif "topic" in data and "orderBookL2_25" in data["topic"]:
#         print("Order Book Update:", data["data"])

# def on_error(ws, error):
#     print("Error:", error)

# def on_close(ws, close_status_code, close_msg):
#     print("Conexión cerrada")

# def on_open(ws):
#     print("Conexión abierta")
#     # Suscribirse a trades y order book
#     ws.send(json.dumps({
#         "op": "subscribe",
#         "args": [f"trade.{symbol}", f"orderBookL2_25.{symbol}"]
#     }))

# # Iniciar conexión
# ws = websocket.WebSocketApp(
#     ws_url,
#     on_open=on_open,
#     on_message=on_message,
#     on_error=on_error,
#     on_close=on_close
# )

# ws.run_forever()