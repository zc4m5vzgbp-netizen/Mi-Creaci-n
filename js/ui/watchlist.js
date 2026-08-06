import { state } from '../state.js';
import { INDEX_SYMBOLS } from '../constants.js';
import { fmtPrice, changeTagHTML, escapeHTML } from '../utils/format.js';
import { computeEntryScore } from '../analysis/entryScore.js';

export function renderTicker() {
  const symbols = Array.from(new Set(INDEX_SYMBOLS.concat([state.selected], state.watchlist)));
  const items = symbols.map(s => Object.assign({ symbol: s }, state.cache[s])).filter(c => c && c.price != null);
  const track = document.getElementById('tickerTrack');
  if (items.length === 0) { track.innerHTML = '<span class="ticker-item dim loading-pulse">conectando con el mercado…</span>'; return; }
  const doubled = items.concat(items);
  track.innerHTML = doubled.map(s => `<span class="ticker-item" style="color:${s.changePct >= 0 ? 'var(--gain)' : 'var(--loss)'}"><span class="dim">${s.symbol}</span> ${fmtPrice(s.price)} ${s.changePct >= 0 ? '▲' : '▼'} ${(s.changePct ?? 0).toFixed(2)}%</span>`).join('');
}

export function renderWatchlist() {
  const box = document.getElementById('watchlistBox');
  if (state.watchlist.length === 0) {
    box.innerHTML = '<div style="border:1px dashed var(--hairline); border-radius:8px; padding:16px; color:var(--paper-dim); font-size:13px;">Toca la estrella de un valor para añadirlo aquí.</div>';
    return;
  }
  box.innerHTML = '<div style="border:1px solid var(--hairline); border-radius:14px; overflow:hidden; box-shadow: 0 6px 22px rgba(0,0,0,0.22);">' + state.watchlist.map(sym => {
    const s = state.cache[sym];
    const ind = state.indicatorsCache[sym];
    const active = sym === state.selected;
    let priceBlock = '';
    if (s && !s.loading && !s.error) {
      priceBlock = `<div class="mono" style="font-size:13px;">${fmtPrice(s.price)}</div>${changeTagHTML(s.changePct, s.changeAbs)}`;
    }
    let scoreBlock = '';
    if (ind && !ind.loading && !ind.error) {
      const sc = computeEntryScore(ind);
      scoreBlock = `<div class="mono ${sc.verdictClass}" style="font-size:11px; margin-top:3px;">${sc.score}/${sc.maxTotal}</div>`;
    }
    const nameLabel = s && s.name ? escapeHTML(s.name) : (s && s.loading ? 'Cargando…' : (s && s.error ? 'Error' : ''));
    return `<button class="watchlist-row ${active ? 'active' : ''}" onclick="selectSymbol('${sym}')"><span style="display:flex; align-items:center;"><span style="color:var(--amber); margin-right:10px;">★</span><span><span class="mono" style="font-weight:600; margin-right:8px;">${sym}</span><span class="dim" style="font-size:12.5px;">${nameLabel}</span></span></span><span style="text-align:right;">${priceBlock}${scoreBlock}</span></button>`;
  }).join('') + '</div>';
}
