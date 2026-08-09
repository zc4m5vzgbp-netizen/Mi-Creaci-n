import { state } from '../state.js';
import { HISTORY_DAYS } from '../constants.js';
import { fmtPrice } from '../utils/format.js';

function row(label, caption, valueHtml, signalClass, signalLabel) {
  return `<div class="indicator-row"><div><div class="indicator-label">${label}</div><div class="indicator-caption">${caption}</div></div><div style="text-align:right;"><div class="mono">${valueHtml}</div><div class="${signalClass}" style="font-size:12px;">${signalLabel}</div></div></div>`;
}

export function renderMathEngine() {
  const card = document.getElementById('mathEngineCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Motor Matemático</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error || (!data.linearRegression && !data.volatility)) { card.innerHTML = ''; return; }

  const rows = [];

  if (data.linearRegression) {
    const lr = data.linearRegression;
    const cls = lr.direction === 'alcista' ? 'tag-good' : (lr.direction === 'bajista' ? 'tag-bad' : 'tag-neutral');
    rows.push(row('Regresión lineal (20d)', `Ajuste del modelo (R²): ${(lr.rSquared * 100).toFixed(0)}% — más alto = tendencia más limpia.`, lr.slopePct.toFixed(2) + '%/día', cls, `tendencia ${lr.direction}`));
  }

  if (data.volatility) {
    rows.push(row('Volatilidad histórica', 'Basada en retornos diarios reales, anualizada.', data.volatility.annualizedPct.toFixed(1) + '% anual', 'tag-neutral', data.volatility.dailyPct.toFixed(2) + '% diaria'));
  }

  if (data.wma20 != null) {
    const price = data.lastClose;
    const cls = price > data.wma20 ? 'tag-good' : 'tag-bad';
    rows.push(row('Media ponderada (20d)', 'Como SMA, pero los días recientes pesan más.', '$' + fmtPrice(data.wma20), cls, price > data.wma20 ? 'precio arriba' : 'precio abajo'));
  }

  if (data.pricePercentile != null) {
    let cls = 'tag-neutral', lbl = 'zona media';
    if (data.pricePercentile >= 80) { cls = 'tag-bad'; lbl = 'cerca del máximo de su rango'; }
    else if (data.pricePercentile <= 20) { cls = 'tag-good'; lbl = 'cerca del mínimo de su rango'; }
    rows.push(row('Percentil del precio', `Dónde está hoy dentro de todo su historial de ~${HISTORY_DAYS} días.`, 'percentil ' + data.pricePercentile.toFixed(0), cls, lbl));
  }

  let targetHtml = '';
  if (data.targetZones) {
    const tz = data.targetZones;
    targetHtml = row('Zonas objetivo (múltiplos de ATR)', 'Proyección matemática, no una predicción — al alza y a la baja.', `↑ $${fmtPrice(tz.upside.t1)} / $${fmtPrice(tz.upside.t2)} · ↓ $${fmtPrice(tz.downside.t1)} / $${fmtPrice(tz.downside.t2)}`, 'tag-neutral', '1x y 2x ATR desde el precio actual');
  }

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:10px;">Motor Matemático</div>
    ${rows.join('')}
    ${targetHtml}
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Cálculos matemáticos estándar (regresión, volatilidad, percentiles) sobre tu historial real. No son predicciones ni recomendaciones de inversión.</div>
  `;
}
