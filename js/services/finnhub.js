import { API_BASE } from '../constants.js';
import { state } from '../state.js';
import { fetchWithRetry } from '../utils/dom.js';
import { renderQuote } from '../ui/quoteCard.js';
import { renderWatchlist, renderTicker } from '../ui/watchlist.js';

export async function fetchSymbol(symbol) {
  const existing = state.cache[symbol];
  const hasProfile = !!(existing && existing.name);
  state.cache[symbol] = Object.assign({}, existing, { loading: true, error: null });
  renderQuote(); renderWatchlist(); renderTicker();
  try {
    const qRes = await fetchWithRetry(`${API_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${state.apiKey}`);
    const q = await qRes.json();
    if (!qRes.ok || q.error) throw new Error(q.error || 'No se pudo obtener el precio');
    if (q.c === 0 && q.pc === 0) throw new Error('Símbolo no encontrado');

    let name = (existing && existing.name) || symbol;
    let exchange = (existing && existing.exchange) || null;
    let industry = (existing && existing.industry) || null;
    let marketCap = existing && existing.marketCap;
    let peTTM = existing && existing.peTTM;

    if (!hasProfile) {
      try {
        const pRes = await fetchWithRetry(`${API_BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${state.apiKey}`);
        if (pRes.ok) {
          const p = await pRes.json();
          if (p) {
            if (p.name) name = p.name;
            if (p.exchange) exchange = p.exchange;
            if (p.finnhubIndustry) industry = p.finnhubIndustry;
          }
        }
      } catch (e) {}
      try {
        const mRes = await fetchWithRetry(`${API_BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${state.apiKey}`);
        if (mRes.ok) {
          const m = await mRes.json();
          if (m && m.metric) {
            marketCap = m.metric.marketCapitalization ?? null;
            peTTM = m.metric.peTTM ?? null;
          }
        }
      } catch (e) {}
    }

    state.cache[symbol] = {
      loading: false, error: null, name, exchange, industry, marketCap, peTTM,
      price: q.c, changeAbs: q.d ?? 0, changePct: q.dp ?? 0,
      open: q.o, high: q.h, low: q.l, prevClose: q.pc,
    };
  } catch (e) {
    state.cache[symbol] = Object.assign({}, state.cache[symbol], { loading: false, error: e.message || 'Error de conexión' });
  }
  renderQuote(); renderWatchlist(); renderTicker();
}
