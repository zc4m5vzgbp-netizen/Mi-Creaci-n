import { state } from '../state.js';
import { applySection, sectionState } from '../state.js';
import { HISTORY_DAYS } from '../constants.js';
import { gaugeSVG } from './gauge.js';
import { computeEntryScore } from '../analysis/entryScore.js';
import { fmtPrice, escapeHTML } from '../utils/format.js';
import { renderPriceAction } from './priceActionCard.js';
import { renderPriceChart } from './priceChart.js';
import { renderAdvancedIndicators } from './advancedIndicatorsCard.js';
import { renderMathEngine } from './mathEngineCard.js';
import { renderProbabilityEngine } from './probabilityCard.js';
import { renderSmartMoney } from './smartMoneyCard.js';

export function renderIndicators() {
  const card = document.getElementById('indicatorsCard');
  if (!state.avKey) {
    card.innerHTML = `<div class="card-title">Indicadores y puntaje de entrada</div><div class="dim" style="font-size:13px; margin-top:10px;">Agrega tu clave gratuita de Alpha Vantage en ⚙ para desbloquear esto (opcional).</div>`;
    renderPriceAction();
    renderPriceChart();
    renderAdvancedIndicators();
    renderMathEngine();
    renderProbabilityEngine();
    renderSmartMoney();
    return;
  }
  const data = state.indicatorsCache[state.selected];
  if (!data) {
    card.innerHTML = `<div class="card-title">Indicadores y puntaje de entrada</div><button class="btn-primary" style="margin-top:12px;" onclick="fetchIndicators('${state.selected}')">Analizar ${state.selected}</button><div class="dim" style="font-size:11px; margin-top:8px;">Usa 1 de tus 25 consultas gratis del día. Se guarda hasta mañana.</div>`;
    renderPriceAction();
    renderPriceChart();
    renderAdvancedIndicators();
    renderMathEngine();
    renderProbabilityEngine();
    renderSmartMoney();
    return;
  }
  if (data.loading) {
    card.innerHTML = `<div class="card-title">Indicadores y puntaje de entrada</div><div class="dim loading-pulse" style="font-size:13px; margin-top:10px;">Calculando sobre ~${HISTORY_DAYS} días…</div>`;
    renderPriceAction();
    renderPriceChart();
    renderAdvancedIndicators();
    renderMathEngine();
    renderProbabilityEngine();
    renderSmartMoney();
    return;
  }
  if (data.error) {
    card.innerHTML = `<div class="card-title">Indicadores y puntaje de entrada</div><div style="color:var(--loss); font-size:13px; margin:10px 0 8px;">${escapeHTML(data.error)}</div><button class="btn-ghost" style="background:var(--surface-alt); border:1px solid var(--hairline); border-radius:6px; padding:6px 12px;" onclick="fetchIndicators('${state.selected}', true)">Reintentar</button>`;
    renderPriceAction();
    renderPriceChart();
    renderAdvancedIndicators();
    renderMathEngine();
    renderProbabilityEngine();
    renderSmartMoney();
    return;
  }
  const score = computeEntryScore(data);
  const price = data.lastClose;
  const smaClass = (sma) => sma == null ? 'tag-neutral' : (price > sma ? 'tag-good' : 'tag-bad');
  const smaLabel = (sma) => sma == null ? '—' : (price > sma ? 'precio arriba ▲' : 'precio abajo ▼');
  let rsiClass = 'tag-neutral', rsiLabel = '—';
  if (data.rsi14 != null) {
    if (data.rsi14 >= 70) { rsiClass = 'tag-bad'; rsiLabel = 'sobrecompra'; }
    else if (data.rsi14 <= 30) { rsiClass = 'tag-good'; rsiLabel = 'sobreventa'; }
    else { rsiLabel = 'neutral'; }
  }
  let macdClass = 'tag-neutral', macdLabel = '—';
  if (data.macd && data.macd.signal != null) {
    macdClass = data.macd.line > data.macd.signal ? 'tag-good' : 'tag-bad';
    macdLabel = data.macd.line > data.macd.signal ? 'alcista' : 'bajista';
  }
  let volLabel = '—', volClass = 'tag-neutral';
  if (data.avgVolume20 && data.todayVolume) {
    const ratio = data.todayVolume / data.avgVolume20;
    if (ratio >= 1.3) { volLabel = ratio.toFixed(1) + 'x — alto'; volClass = 'tag-good'; }
    else if (ratio <= 0.7) { volLabel = ratio.toFixed(1) + 'x — bajo'; volClass = 'tag-bad'; }
    else { volLabel = ratio.toFixed(1) + 'x — normal'; }
  }
  const id = 'scoreDetail';
  if (sectionState[id] === undefined) sectionState[id] = false;
  card.innerHTML = `
    <div style="text-align:center; padding-bottom:6px;">
      ${gaugeSVG(score.score, score.maxTotal, score.verdictClass)}
      <div class="mono" style="font-size:28px; font-weight:700; margin-top:2px;">${score.score}<span style="font-size:14px; color:var(--paper-dim);">/${score.maxTotal}</span></div>
      <div class="${score.verdictClass} mono" style="font-size:13px; font-weight:600; margin-top:2px;">${score.verdict}</div>
    </div>
    <button class="toggle-row" style="border-top:1px solid var(--hairline); padding-top:12px; margin-top:8px;" onclick="toggleSection('${id}')">
      <span class="toggle-label">Ver desglose completo</span>
      <span id="${id}-chevron" class="dim chevron">▾</span>
    </button>
    <div id="${id}-body" class="toggle-body">
      ${score.breakdown.map(b => `<div style="display:flex; justify-content:space-between; font-size:11px; color:var(--paper-dim); margin-top:3px;"><span>${b.label}</span><span class="mono">${b.points}/${b.max}</span></div>`).join('')}
      <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Esto es un resumen de reglas técnicas — no es una recomendación de inversión ni predice el futuro.</div>
      <div class="dim" style="font-size:11px; margin:12px 0 2px;">Detalle · cierre del ${data.fetchedDate} · historial de ${data.historyDays || HISTORY_DAYS} días</div>
      <div class="indicator-row"><div><div class="indicator-label">SMA20</div><div class="indicator-caption">Precio promedio de 20 días.</div></div><div style="text-align:right;"><div class="mono">${data.sma20 != null ? fmtPrice(data.sma20) : '—'}</div><div class="${smaClass(data.sma20)}" style="font-size:12px;">${smaLabel(data.sma20)}</div></div></div>
      <div class="indicator-row"><div><div class="indicator-label">SMA50</div><div class="indicator-caption">Tendencia de mediano plazo.</div></div><div style="text-align:right;"><div class="mono">${data.sma50 != null ? fmtPrice(data.sma50) : '—'}</div><div class="${smaClass(data.sma50)}" style="font-size:12px;">${smaLabel(data.sma50)}</div></div></div>
      <div class="indicator-row"><div><div class="indicator-label">EMA200</div><div class="indicator-caption">Filtro clásico de tendencia de largo plazo.</div></div><div style="text-align:right;"><div class="mono">${data.ema200 != null ? fmtPrice(data.ema200) : '—'}</div><div class="${smaClass(data.ema200)}" style="font-size:12px;">${smaLabel(data.ema200)}</div></div></div>
      <div class="indicator-row"><div><div class="indicator-label">RSI (14)</div><div class="indicator-caption">&gt;70 sobrecompra, &lt;30 sobreventa.</div></div><div style="text-align:right;"><div class="mono">${data.rsi14 != null ? data.rsi14.toFixed(1) : '—'}</div><div class="${rsiClass}" style="font-size:12px;">${rsiLabel}</div></div></div>
      <div class="indicator-row"><div><div class="indicator-label">MACD (12,26,9)</div><div class="indicator-caption">Más preciso ahora, con más historial para calentar.</div></div><div style="text-align:right;"><div class="mono">${data.macd && data.macd.line != null ? data.macd.line.toFixed(2) : '—'}</div><div class="${macdClass}" style="font-size:12px;">${macdLabel}</div></div></div>
      <div class="indicator-row"><div><div class="indicator-label">Volumen vs promedio 20d</div><div class="indicator-caption">Volumen alto = más "convicción" detrás del movimiento.</div></div><div style="text-align:right;"><div class="mono ${volClass}">${volLabel}</div></div></div>
      <button class="btn-ghost" style="margin-top:6px;" onclick="fetchIndicators('${state.selected}', true)">Actualizar (usa 1 consulta)</button>
    </div>
  `;
  applySection(id);
  renderPriceAction();
  renderPriceChart();
  renderAdvancedIndicators();
  renderMathEngine();
  renderProbabilityEngine();
  renderSmartMoney();
}
