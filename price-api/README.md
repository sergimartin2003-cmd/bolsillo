# Bolsillo · API de precios

API mínima (una función serverless) para que Bolsillo consulte precios de cripto y
acciones/ETFs, protegida con una clave para que nadie más pueda usarla.

No lleva dependencias: usa el `fetch` global de Node 18+ que ya trae Vercel.

**Ya está desplegada** en tu cuenta de Vercel:

- URL: `https://bolsillo-price-api.vercel.app`
- Clave: la que te di en el chat (variable `BOLSILLO_API_KEY` en Vercel)

Solo tienes que pegar esos dos datos en Bolsillo → Ajustes → API de precios. Todo lo
de abajo (pasos 1 y 2) es por si algún día quieres redesplegarla tú mismo o mover el
proyecto a otra cuenta — no hace falta que lo hagas ahora.

## 1. Desplegar en Vercel (opcional, ya está hecho)

```bash
npm i -g vercel      # si no lo tienes
cd bolsillo-price-api
vercel                # sigue las instrucciones, crea un proyecto nuevo
```

## 2. Configurar la clave

En el dashboard de Vercel del proyecto: **Settings → Environment Variables**
→ añade `BOLSILLO_API_KEY` con una contraseña que te inventes (cuanto más larga
y aleatoria, mejor). Guárdala, la necesitarás en Bolsillo.

Vuelve a desplegar para que la variable surta efecto:

```bash
vercel --prod
```

Copia la URL que te da Vercel (algo como `https://bolsillo-price-api.vercel.app`).

## 3. Probarla

```bash
curl "https://TU-PROYECTO.vercel.app/api/price?symbol=BTC&type=crypto&currency=eur" \
  -H "x-api-key: TU_CLAVE"
```

Respuesta esperada:

```json
{"ok":true,"symbol":"BTC","type":"crypto","currency":"eur","price":60000.12,"asOf":"...","source":"coingecko"}
```

Para acciones/ETFs:

```bash
curl "https://TU-PROYECTO.vercel.app/api/price?symbol=AAPL&type=stock" \
  -H "x-api-key: TU_CLAVE"
```

```json
{"ok":true,"symbol":"AAPL","type":"stock","currency":"usd","price":336.13,"asOf":"...","source":"yahoo"}
```

## 4. Configurar en Bolsillo

En Bolsillo: **Ajustes → API de precios** → pega la URL y la clave → "Probar conexión"
→ "Guardar".

Luego, en cada cuenta de tipo Inversión (Editar cuenta), rellena:

- **Símbolo**: `BTC`, `ETH`... para cripto, o `AAPL`, `VWCE.DE`, `SAN.MC`... para
  acciones/ETFs (símbolo tal cual lo usa Yahoo Finance: sin sufijo para EE.UU.,
  con sufijo de mercado para el resto — `.DE` Alemania, `.MC` España, `.L` Londres, etc.).
- **Tipo de activo**: Cripto o Acción/ETF.
- **Unidades que tienes**: cuántas monedas/participaciones/acciones tienes.

Desde "Actualizar valor" en esa cuenta aparecerá un botón "Consultar precio" que
trae el precio actual, lo multiplica por tus unidades y te lo deja escrito en el
campo de valor — tú confirmas y guardas. Nunca se actualiza solo sin que lo
confirmes: es una medida de seguridad para no corromper tus cuentas con un dato
mal traído.

## Símbolos soportados de serie (cripto)

BTC, ETH, SOL, BNB, XRP, ADA, DOGE, DOT, MATIC, LTC, AVAX, LINK, USDT, USDC, TRX,
SHIB, ATOM, UNI, XLM, ETC. Cualquier otro símbolo se prueba tal cual en minúsculas
como id de CoinGecko (p. ej. si tu cripto no está en la lista, usa directamente su
id de CoinGecko, como `chainlink` o `near`).

## Notas importantes

- **No hay ninguna clave de terceros que pagar**: cripto usa la API pública de
  CoinGecko, acciones/ETFs usa la API pública de Yahoo Finance. Ambas gratuitas y
  sin registro.
- Los precios llevan algo de retraso (no son para trading en vivo).
- La clave `BOLSILLO_API_KEY` no es cifrado ni una autenticación robusta: es
  simplemente para que la URL de tu API no la pueda usar cualquiera que la
  encuentre. Trátala como una contraseña cualquiera.
- La protección "Vercel Authentication" del proyecto está desactivada a propósito,
  para que la API sea alcanzable públicamente (protegida solo por la clave). Si
  algún día la reactivas desde el dashboard de Vercel, Bolsillo dejará de poder
  usarla.
