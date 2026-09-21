// Bolsillo · API de precios
// GET /api/price?symbol=BTC&type=crypto&currency=eur
// Header requerido: x-api-key: <BOLSILLO_API_KEY>  (o ?key=... como query param)
//
// type=crypto  -> precio vía CoinGecko (público, sin clave)
// type=stock   -> cotización vía Yahoo Finance (público, sin clave; símbolo tal cual
//                 lo usa Yahoo, p.ej. AAPL, VWCE.DE, SAN.MC — cotizaciones con algo
//                 de retraso, no válidas para trading en vivo)

const CRYPTO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
  ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', MATIC: 'matic-network', LTC: 'litecoin',
  AVAX: 'avalanche-2', LINK: 'chainlink', USDT: 'tether', USDC: 'usd-coin', TRX: 'tron',
  SHIB: 'shiba-inu', ATOM: 'cosmos', UNI: 'uniswap', XLM: 'stellar', ETC: 'ethereum-classic'
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json,text/plain,*/*'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ ok: false, error: 'Método no permitido' }); return; }

  const expected = process.env.BOLSILLO_API_KEY;
  if (!expected) {
    res.status(500).json({ ok: false, error: 'Falta configurar la variable de entorno BOLSILLO_API_KEY en Vercel' });
    return;
  }
  const key = req.headers['x-api-key'] || req.query.key;
  if (key !== expected) {
    res.status(401).json({ ok: false, error: 'Clave incorrecta' });
    return;
  }

  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  const type = String(req.query.type || 'crypto').trim().toLowerCase();
  const currency = String(req.query.currency || 'eur').trim().toLowerCase();
  if (!symbol) { res.status(400).json({ ok: false, error: 'Falta el parámetro symbol' }); return; }

  try {
    if (type === 'crypto') {
      const id = CRYPTO_IDS[symbol] || symbol.toLowerCase();
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${encodeURIComponent(currency)}`;
      const r = await fetch(url);
      if (!r.ok) { res.status(502).json({ ok: false, error: 'CoinGecko respondió ' + r.status }); return; }
      const data = await r.json();
      const price = data && data[id] && data[id][currency];
      if (price == null) { res.status(404).json({ ok: false, error: 'No se encontró el precio para ' + symbol }); return; }
      res.status(200).json({ ok: true, symbol, type, currency, price, asOf: new Date().toISOString(), source: 'coingecko' });
      return;
    }

    if (type === 'stock') {
      // Yahoo no usa el sufijo ".US" para acciones estadounidenses (a diferencia de otras
      // fuentes); si alguien lo escribe por costumbre, lo quitamos.
      const ySymbol = symbol.endsWith('.US') ? symbol.slice(0, -3) : symbol;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}`;
      let r;
      try {
        r = await fetch(url, { headers: BROWSER_HEADERS });
      } catch (fetchErr) {
        res.status(502).json({ ok: false, error: 'No se pudo conectar con Yahoo Finance (red bloqueada o símbolo incorrecto)' });
        return;
      }
      if (!r.ok) {
        res.status(502).json({ ok: false, error: 'Yahoo Finance respondió ' + r.status });
        return;
      }
      let data = null;
      try { data = await r.json(); } catch (parseErr) { data = null; }
      const result = data && data.chart && Array.isArray(data.chart.result) ? data.chart.result[0] : null;
      const meta = result && result.meta;
      const price = meta && meta.regularMarketPrice;
      if (!(price > 0)) {
        res.status(404).json({ ok: false, error: 'No se encontró cotización para ' + symbol + ' (¿símbolo correcto? p.ej. AAPL, VWCE.DE, SAN.MC)' });
        return;
      }
      const stockCurrency = (meta.currency || 'native').toLowerCase();
      const name = meta.longName || meta.shortName || null;

      // Historial de dividendos (opcional, ?div=1): para acciones/ETFs de reparto,
      // usado para calcular un pago recurrente estimado. Si falla, no rompe el precio.
      let dividends = null;
      if (req.query.div === '1') {
        try {
          const divUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?range=2y&interval=1d&events=div`;
          const dr = await fetch(divUrl, { headers: BROWSER_HEADERS });
          if (dr.ok) {
            const ddata = await dr.json();
            const dresult = ddata && ddata.chart && Array.isArray(ddata.chart.result) ? ddata.chart.result[0] : null;
            const divMap = dresult && dresult.events && dresult.events.dividends;
            if (divMap && typeof divMap === 'object') {
              dividends = Object.values(divMap)
                .filter(d => d && d.amount > 0 && d.date)
                .map(d => ({ date: new Date(d.date * 1000).toISOString().slice(0, 10), amount: d.amount }))
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .slice(0, 8);
            }
          }
        } catch (divErr) { /* dividends queda null; el precio ya se respondió igual */ }
      }

      res.status(200).json({ ok: true, symbol, type, currency: stockCurrency, price, name, dividends, asOf: new Date().toISOString(), source: 'yahoo' });
      return;
    }

    res.status(400).json({ ok: false, error: 'type debe ser "crypto" o "stock"' });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Error consultando la fuente de precios' });
  }
}
