# Manual: Conversión de USDC a USDT en Bybit

Este documento describe paso a paso cómo convertir USDC a USDT en Bybit de forma manual mediante el par spot `USDC/USDT`.

---

## 📌 Consideraciones Previas

- El par `USDC/USDT` en Bybit **solo permite vender USDC para obtener USDT**.
- Si necesitas hacer la operación inversa (USDT → USDC), tendrás que usar la función "Convert" o un bot personalizado (con menor liquidez).
- Asegúrate de tener los fondos en la **Cuenta Unificada (UTA)** para poder operar en Spot.

---

## 🔁 Paso a Paso: Conversión de USDC a USDT

### 1. Acceder al panel de trading Spot

- Inicia sesión en Bybit (web o app).
- En el menú superior, selecciona:  
  `Trading` → `Spot Trading`.

---

### 2. Buscar el par `USDC/USDT`

- En el buscador de pares (esquina superior izquierda), introduce:  
  `USDC/USDT`.

- Asegúrate de seleccionar el par correcto (no confundir con derivados ni contratos perpetuos).

---

### 3. Realizar la operación de venta

#### ✔️ Método recomendado: **Orden Limit**

- En el panel inferior:
  - Tipo de orden: `Limit`.
  - Precio: Introduce el precio de venta deseado (ej. `0.9998`).
  - Cantidad: Introduce cuántos USDC deseas vender.
  - Verifica el total estimado en USDT.

- Pulsa **“Vender USDC”** para colocar la orden.

#### ⚡ Alternativa: **Orden Market**

- Si necesitas convertir rápido:
  - Cambia el tipo de orden a `Market`.
  - Introduce la cantidad de USDC a vender.
  - El sistema tomará el mejor precio disponible.

- Pulsa **“Vender USDC”**.

---

### 4. Confirmar la operación

- Puedes seguir el estado de la orden en la sección `Órdenes abiertas` o `Historial de órdenes`.
- Una vez ejecutada, tus USDT estarán disponibles en la UTA.

---

## 🧠 Recomendaciones

- Utiliza órdenes **Limit** si no tienes prisa y quieres minimizar el slippage.
- Antes de operar, comprueba el **volumen y profundidad** del par `USDC/USDT` para asegurarte de que hay liquidez suficiente.
- Revisa la sección "Activos" después de cada operación para confirmar el nuevo balance de USDT.

---

## 🛠️ Alternativa: Convert

- Si no te importa un precio menos competitivo y quieres más comodidad:
  - Ve a `Trading` → `Convert`.
  - Selecciona: De `USDC` → a `USDT`.
  - Introduce la cantidad y confirma la conversión.

**Nota**: Esta opción suele tener un tipo de cambio menos favorable.

---

## ✅ Resultado esperado

> USDC convertido a USDT con control sobre precio y cantidad, directamente desde el mercado spot, minimizando comisiones y slippage.

---
