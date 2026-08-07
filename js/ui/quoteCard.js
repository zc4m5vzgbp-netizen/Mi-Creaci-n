import { state } from '../state.js';
import { applySection, sectionState } from '../state.js';
import { fmtPrice, fmtMarketCap, changeTagHTML, escapeHTML } from '../utils/format.js';

export function shareSymbol(symbol) {
  const s = state.cache[symbol];
  const text = s && s.price != null ? `${symbol}: $${fmtPrice(s.price)} (${(s.changePct ?? 0) >= 0 ? '+' : ''}${(s.changePct ?? 0).toFixed(2)}%)` : symbol;
  if (navigator.share) { navigator.share({ title: 'Mi Terminal', text: text }).catch(() => {}); }
}

export function renderQuote() {
  const s = state.cache[state.selected];
  const card = document.getElementById('quoteCard');
  const inWatch = state.watchlist.includes(state.selected);
  const shareBtn = (typeof navigator !== 'undefined' && navigator.share) ? `<button class="btn-ghost" onclick="shareSymbol('${state.selected}')" aria-label="Compartir">⤴</button>` : '';
  let body;
  if (!s || s.loading) {
    body = '<div class="dim loading-pulse" style="font-size:13px; padding:20px 0;">Cargando cotización…</div>';
  } else if (s.error) {
    body = `<div style="padding:12px 0;"><div style="color:var(--loss); font-size:13px; margin-bottom:8px;">${escapeHTML(s.error)}</div><button class="btn-ghost" style="background:var(--surface-alt); border:1px solid var(--hairline); border-radius:6px; padding:6px 12px;" onclick="fetchSymbol('${state.selected}')">Reintentar</button></div>`;
  } else {
    const id = 'quickStats';
    if (sectionState[id] === undefined) sectionState[id] = true;
    const tags = [s.exchange ? `<span class="pill">${escapeHTML(s.exchange)}</span>` : '', s.industry ? `<span class="pill">${escapeHTML(s.industry)}</span>` : ''].filter(Boolean).join(' ');
    body = `
      ${tags ? `<div style="margin:2px 0 10px;">${tags}</div>` : ''}
      <div class="quote-price">$${fmtPrice(s.price)}</div>
      <div style="margin-top:4px;">${changeTagHTML(s.changePct, s.changeAbs, true)}</div>
      <div style="margin-top:14px; border-top:1px solid var(--hairline); padding-top:12px;">
        <button class="toggle-row" onclick="toggleSection('${id}')">
          <span class="toggle-label">Resumen rápido</span>
          <span id="${id}-chevron" class="dim chevron open">▾</span>
        </button>
        <div id="${id}-body" class="toggle-body">
          <div class="stat-grid">
            <div class="stat-box"><div class="dim">Apertura</div><div class="mono">${fmtPrice(s.open)}</div></div>
            <div class="stat-box"><div class="dim">Cierre anterior</div><div class="mono">${fmtPrice(s.prevClose)}</div></div>
            <div class="stat-box"><div class="dim">Máximo del día</div><div class="mono">${fmtPrice(s.high)}</div></div>
            <div class="stat-box"><div class="dim">Mínimo del día</div><div class="mono">${fmtPrice(s.low)}</div></div>
            <div class="stat-box"><div class="dim">Capitalización</div><div class="mono">${fmtMarketCap(s.marketCap)}</div></div>
            <div class="stat-box"><div class="dim">PER (TTM)</div><div class="mono">${s.peTTM != null ? Number(s.peTTM).toFixed(2) : '—'}</div></div>
          </div>
        </div>
      </div>
    `;
  }
  card.innerHTML = `<div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:6px;"><div><div class="mono" style="font-weight:700; font-size:22px;">${state.selected}</div><div class="dim" style="font-size:13px;">${s && s.name ? escapeHTML(s.name) : (s && s.loading ? 'Cargando…' : '')}</div></div><div style="display:flex; align-items:center; gap:6px;">${shareBtn}<button class="btn-ghost" onclick="fetchSymbol('${state.selected}')" aria-label="Actualizar">🔄</button><button class="btn-ghost" style="font-size:18px; color:${inWatch ? 'var(--amber)' : 'var(--paper-dim)'}" onclick="toggleWatch('${state.selected}')" aria-label="Favorito">★</button></div></div>${body}`;
  applySection('quickStats');
}
