# Bolsillo

Backup de código de Bolsillo: app de gestión financiera personal (publicada como
Claude Artifact) + la API de precios que la alimenta.

## Estructura

- `app/` — código fuente del artifact de Bolsillo, en 3 partes que se concatenan
  para formar el HTML final:
  - `00-head.html` — `<head>`, estilos y el arranque del `<body>`.
  - `99-app.js` — toda la lógica de la aplicación.
  - `zz-foot.html` — cierre del documento.

  Para montar el HTML final:

  ```bash
  cd app
  cat 00-head.html 99-app.js zz-foot.html > bolsillo.html
  ```

  La app publicada (siempre la última versión) está en:
  https://claude.ai/artifact/Fa9KHwS7yxNugHRW4CyB8J

- `price-api/` — API serverless en Vercel que sirve precios de cripto (CoinGecko)
  y acciones/ETFs (Yahoo Finance), protegida con una clave. Desplegada en:
  https://bolsillo-price-api.vercel.app

## Datos

Bolsillo guarda los datos del usuario en el navegador (localStorage) y,
opcionalmente, en una base de datos en Supabase (proyecto `bolsillo`) cuando el
usuario activa "Copia en la nube" desde Ajustes → Datos. Este repositorio solo
contiene código, nunca datos ni claves.

## Historial

Este repo se sube automáticamente por Claude cada vez que se hace un cambio en
Bolsillo, como copia de seguridad del código.
