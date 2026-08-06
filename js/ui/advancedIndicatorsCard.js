import { state } from '../state.js';
import { fmtPrice, escapeHTML } from '../utils/format.js';

function row(label, caption, valueHtml, signalClass, signalLabel) {
  return `<div class="indicator-row"><div><div class="indicator-label">${label}</div><div class="indicator-caption">${caption}</div></div><div style="text-align:right;"><div class="mono">${valueHtml}</div><div class="${signalClass}" style="font-size:12px;">${signalLabel}</div></div></div>`;
}

export function renderAdvancedIndicators() {
  const card = document.getElementById('advancedIndicatorsCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Motor Técnico Avanzado</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error || data.atr14 == null) { card.innerHTML = ''; return; }

  const price = data.lastClose;
  const rows = [];

  if (data.atr14 != null) {
    const atrPct = (data.atr14 / price) * 100;
    rows.push(row('ATR (14)', 'Rango real promedio — volatilidad en dólares.', '$' + fmtPrice(data.atr14), 'tag-neutral', atrPct.toFixed(1) + '% del precio'));
  }

  if (data.adx) {
    let cls = 'tag-neutral', lbl = 'sin tendencia clara';
    if (data.adx.adx >= 25) { lbl = data.adx.plusDI > data.adx.minusDI ? 'tendencia alcista fuerte' : 'tendencia bajista fuerte'; cls = data.adx.plusDI > data.adx.minusDI ? 'tag-good' : 'tag-bad'; }
    else if (data.adx.adx >= 20) { lbl = 'tendencia moderada'; }
    rows.push(row('ADX (14)', 'Fuerza de la tendencia, no su dirección.', data.adx.adx.toFixed(1), cls, lbl));
  }

  if (data.bollinger) {
    let cls = 'tag-neutral', lbl = 'dentro de las bandas';
    if (price >= data.bollinger.upper) { cls = 'tag-bad'; lbl = 'tocando banda superior — posible sobrecompra'; }
    else if (price <= data.bollinger.lower) { cls = 'tag-good'; lbl = 'tocando banda inferior — posible sobreventa'; }
    rows.push(row('Bandas de Bollinger', `Ancho: ${data.bollinger.bandwidthPct.toFixed(1)}% (más angosto = posible movimiento fuerte próximo).`, '$' + fmtPrice(data.bollinger.lower) + ' – $' + fmtPrice(data.bollinger.upper), cls, lbl));
  }

  if (data.stochastic) {
    let cls = 'tag-neutral', lbl = 'neutral';
    if (data.stochastic.k >= 80) { cls = 'tag-bad'; lbl = 'sobrecompra'; }
    else if (data.stochastic.k <= 20) { cls = 'tag-good'; lbl = 'sobreventa'; }
    rows.push(row('Estocástico (14,3)', '%K por encima de %D = impulso alcista de corto plazo.', `%K ${data.stochastic.k.toFixed(0)} / %D ${data.stochastic.d.toFixed(0)}`, cls, lbl));
  }

  if (data.donchian) {
    let cls = 'tag-neutral', lbl = 'dentro del canal';
    const distTop = Math.abs(price - data.donchian.upper) / price;
    const distBot = Math.abs(price - data.donchian.lower) / price;
    if (distTop <= 0.01) { cls = 'tag-good'; lbl = 'en el máximo del canal (20d)'; }
    else if (distBot <= 0.01) { cls = 'tag-bad'; lbl = 'en el mínimo del canal (20d)'; }
    rows.push(row('Canal de Donchian (20)', 'Máximo y mínimo de los últimos 20 días.', '$' + fmtPrice(data.donchian.lower) + ' – $' + fmtPrice(data.donchian.upper), cls, lbl));
  }

  if (data.superTrend) {
    const cls = data.superTrend.direction === 'alcista' ? 'tag-good' : 'tag-bad';
    rows.push(row('SuperTrend', 'Nivel donde cambiaría de dirección.', '$' + fmtPrice(data.superTrend.stopLevel), cls, data.superTrend.direction));
  }

  if (data.ichimoku) {
    const cls = data.ichimoku.position === 'arriba' ? 'tag-good' : (data.ichimoku.position === 'abajo' ? 'tag-bad' : 'tag-neutral');
    const lbl = data.ichimoku.position === 'arriba' ? 'precio arriba de la nube — alcista' : (data.ichimoku.position === 'abajo' ? 'precio abajo de la nube — bajista' : 'precio dentro de la nube — indeciso');
    rows.push(row('Ichimoku Cloud', `Tenkan $${fmtPrice(data.ichimoku.tenkan)} · Kijun $${fmtPrice(data.ichimoku.kijun)}`, data.ichimoku.position, cls, lbl));
  }

  let pivotHtml = '';
  if (data.pivotPoints) {
    const pp = data.pivotPoints;
    const cls = price > pp.pivot ? 'tag-good' : 'tag-bad';
    const lbl = price > pp.pivot ? 'arriba del pivote — sesgo alcista' : 'abajo del pivote — sesgo bajista';
    pivotHtml = row('Puntos Pivote', `R1 $${fmtPrice(pp.r1)} · S1 $${fmtPrice(pp.s1)} · R2 $${fmtPrice(pp.r2)} · S2 $${fmtPrice(pp.s2)}`, '$' + fmtPrice(pp.pivot), cls, lbl);
  }

  let fibHtml = '';
  if (data.fibonacci) {
    const fib = data.fibonacci;
    const entries = Object.entries(fib.levels);
    let closest = entries[0];
    entries.forEach(([k, v]) => { if (Math.abs(v - price) < Math.abs(closest[1] - price)) closest = [k, v]; });
    fibHtml = row('Fibonacci — Retrocesos', `Rango: $${fmtPrice(fib.low)} – $${fmtPrice(fib.high)} (últimos ~90 días, ${fib.uptrend ? 'tendencia alcista' : 'tendencia bajista'})`, `${closest[0]}%: $${fmtPrice(closest[1])}`, 'tag-neutral', 'nivel más cercano al precio actual');
    const extEntries = Object.entries(fib.extensions);
    fibHtml += row('Fibonacci — Extensiones', 'Posibles zonas objetivo si el precio rompe el rango.', extEntries.map(([k, v]) => `${k}%: $${fmtPrice(v)}`).join(' · '), 'tag-neutral', 'objetivos de proyección');
  }

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:10px;">Motor Técnico Avanzado</div>
    ${rows.join('')}
    ${pivotHtml}
    ${fibHtml}
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Fórmulas estándar de análisis técnico sobre tu historial real de ~400 días. Ninguna de estas lecturas es una recomendación de inversión.</div>
  `;
}
