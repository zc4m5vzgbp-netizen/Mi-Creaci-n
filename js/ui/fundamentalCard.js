import { state } from '../state.js';

function row(label, caption, valueHtml, signalClass) {
  return `<div class="indicator-row"><div><div class="indicator-label">${label}</div><div class="indicator-caption">${caption}</div></div><div style="text-align:right;"><div class="mono ${signalClass}" style="font-size:13px;">${valueHtml}</div></div></div>`;
}

function computeYoY(observations, periodsBack) {
  if (!observations || observations.length <= periodsBack) return null;
  const latest = parseFloat(observations[0].value);
  const prior = parseFloat(observations[periodsBack].value);
  if (isNaN(latest) || isNaN(prior) || prior === 0) return null;
  return { latest, yoyPct: ((latest - prior) / prior) * 100 };
}

function renderEarningsSection(symbol) {
  const s = state.cache[symbol];
  const earnings = s && s.earnings;
  if (!earnings || earnings.length === 0) {
    return `<div class="dim" style="font-size:13px; margin-bottom:6px;">Sin datos de resultados trimestrales disponibles para ${symbol}.</div>`;
  }
  const recent = earnings.slice(0, 4);
  return recent.map((e) => {
    const surprise = e.surprisePercent;
    const beat = surprise != null && surprise > 0;
    const miss = surprise != null && surprise < 0;
    const cls = beat ? 'tag-good' : (miss ? 'tag-bad' : 'tag-neutral');
    const label = beat ? 'superó expectativas' : (miss ? 'no alcanzó expectativas' : 'en línea');
    return row(e.period || 'Trimestre', `EPS real ${e.actual != null ? e.actual : '—'} vs. estimado ${e.estimate != null ? e.estimate : '—'} — ${label}`, surprise != null ? (surprise > 0 ? '+' : '') + surprise.toFixed(1) + '%' : '—', cls);
  }).join('');
}

function renderMacroSection() {
  if (!state.aiProxyUrl || !state.aiProxyPassword) {
    return `<div class="dim" style="font-size:12px; line-height:1.4;">Los datos macro (CPI, PPI, PIB, tasas) necesitan tu intermediario de IA conectado en ⚙ — el mismo que ya usas para el análisis con IA.</div>`;
  }
  const mc = state.macroCache;
  if (!mc || mc.loading) {
    return `<div class="dim loading-pulse" style="font-size:13px;">Cargando datos macro…</div>`;
  }
  if (mc.error) {
    return `<div style="color:var(--loss); font-size:13px;">${mc.error}</div>`;
  }
  const d = mc.data;
  const rows = [];
  const cpi = computeYoY(d.cpi, 12);
  if (cpi) rows.push(row('CPI — inflación al consumidor', 'Variación interanual. Meta de la Fed: ~2%.', cpi.yoyPct.toFixed(1) + '%', cpi.yoyPct > 3 ? 'tag-bad' : 'tag-neutral'));
  const ppi = computeYoY(d.ppi, 12);
  if (ppi) rows.push(row('PPI — inflación al productor', 'Suele anticipar movimientos futuros del CPI.', ppi.yoyPct.toFixed(1) + '%', ppi.yoyPct > 3 ? 'tag-bad' : 'tag-neutral'));
  const gdp = computeYoY(d.gdp, 4);
  if (gdp) rows.push(row('PIB — crecimiento económico', 'Variación interanual, dato trimestral.', gdp.yoyPct.toFixed(1) + '%', gdp.yoyPct < 0 ? 'tag-bad' : 'tag-good'));
  if (d.fedRate && d.fedRate[0]) {
    const rate = parseFloat(d.fedRate[0].value);
    if (!isNaN(rate)) rows.push(row('Tasa de la Reserva Federal', 'Tasas altas presionan valoraciones, sobre todo en tecnología.', rate.toFixed(2) + '%', 'tag-neutral'));
  }
  return rows.length ? rows.join('') : '<div class="dim" style="font-size:13px;">No se pudieron calcular los indicadores macro todavía.</div>';
}

export function renderFundamentalCard() {
  const card = document.getElementById('fundamentalCard');
  if (!card) return;
  card.innerHTML = `
    <div class="card-title" style="margin-bottom:10px;">Motor Fundamental</div>
    <div class="toggle-label" style="margin-bottom:6px;">Earnings — ${state.selected}</div>
    ${renderEarningsSection(state.selected)}
    <div class="toggle-label" style="margin:14px 0 6px;">Economía general (igual para cualquier acción)</div>
    ${renderMacroSection()}
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Earnings: datos reales de Finnhub. Datos macro: datos reales de FRED (Reserva Federal), actualizados una vez al día. El contexto sobre cómo afecta al mercado es general — no una predicción sobre esta acción en particular.</div>
  `;
}
