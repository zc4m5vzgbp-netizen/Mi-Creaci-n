import { API_BASE } from '../constants.js';
import { state } from '../state.js';
import { fetchWithRetry } from '../utils/dom.js';
import { renderExtraNews } from '../ui/newsCards.js';

async function fetchExtraNews(symbol) {
  state.newsCache[symbol] = { loading: true };
  renderExtraNews();
  try {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const fromDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const res = await fetchWithRetry(`${API_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${state.apiKey}`);
    const data = await res.json();
    if (!res.ok) throw new Error('No se pudieron cargar las noticias.');
    const items = (Array.isArray(data) ? data : []).slice(0, 8);
    state.newsCache[symbol] = { loading: false, error: null, items, fetchedDate: toStr };
  } catch (e) {
    state.newsCache[symbol] = { loading: false, error: e.message || 'No se pudieron cargar las noticias.' };
  }
  renderExtraNews();
}

export function maybeFetchExtraNews(symbol) {
  const today = new Date().toISOString().slice(0, 10);
  const cached = state.newsCache[symbol];
  if (cached && cached.fetchedDate === today && !cached.error) { renderExtraNews(); return; }
  fetchExtraNews(symbol);
}
