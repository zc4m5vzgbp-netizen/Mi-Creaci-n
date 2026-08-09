import { state } from '../state.js';
import { HISTORY_DAYS } from '../constants.js';
import { fmtPrice } from '../utils/format.js';
import { computeZoneContext } from '../analysis/priceAction.js';

function contextLinesHTML(context) {
  const lines = [];
  if (context.fibonacci) {
    if (context.fibonacci.inside.length) lines.push(`Fibonacci ${context.fibonacci.inside.join('%, ')}% dentro de la zona`);
    else if (context.fibonacci.nearest) lines.push(`Fibonacci ${context.fibonacci.nearest.name}%: ${fmtPrice(context.fibonacci.nearest.dist)} ${context.fibonacci.nearest.above ? 'arriba' : 'abajo'} de la zona`);
  }
  if (context.pivot) {
    if (context.pivot.inside.length) lines.push(`Pivot ${context.pivot.inside.join(', ')} dentro de la zona`);
    else if (context.pivot.nearest) lines.push(`Pivot ${context.pivot.nearest.name}: ${fmtPrice(context.pivot.nearest.dist)} ${context.pivot.nearest.above ? 'arriba' : 'abajo'} de la zona`);
  }
  if (context.atrDistance != null) lines.push(`Distancia: ${context.atrDistance.toFixed(1)} ATR`);
  if (context.volumeAbnormal) lines.push(`Volumen ${context.volumeAbnormal} reciente`);
  if (context.structureCompatible) lines.push(`Estructura de mercado: ${context.structureCompatible}`);
  if (!lines.length) return '';
  return `<div class="dim" style="font-size:10.5px; margin-top:6px; line-height:1.5;">${lines.join(' · ')}</div>`;
}

export function bounceBarHTML(stats) {
  if (!stats || stats.approaches === 0) {
    return `<div class="dim" style="font-size:11px; margin-top:6px;">Sin suficientes acercamientos históricos para calcular una frecuencia.</div>`;
  }
  const pct = Math.round(stats.bounceRate * 100);
  const color = pct >= 60 ? 'var(--gain)' : (pct <= 40 ? 'var(--loss)' : 'var(--amber)');
  const smallSample = stats.approaches < 3 ? ' — muestra pequeña, tómalo con cautela' : '';
  const wilsonText = stats.wilson ? ` · IC 95%: ${Math.round(stats.wilson.lower * 100)}%–${Math.round(stats.wilson.upper * 100)}%` : '';
  return `
    <div style="margin-top:8px;">
      <div style="display:flex; justify-content:space-between; font-size:11.5px;">
        <span class="dim">Frecuencia histórica de rebote</span>
        <span class="mono" style="color:${color}; font-weight:700;">${pct}%</span>
      </div>
      <div class="prob-bar-track"><div class="prob-bar-fill" style="width:${pct}%; background:${color};"></div></div>
      <div class="dim" style="font-size:10.5px; margin-top:4px;">Rebotó ${stats.bounces} de ${stats.approaches} veces que el precio se acercó, en los últimos ~${HISTORY_DAYS} días${wilsonText}${smallSample}</div>
    </div>
  `;
}

export function renderPriceAction() {
  const card = document.getElementById('priceActionCard');
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Zonas de oferta y demanda</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error || !data.priceAction) {
    card.innerHTML = `<div class="card-title">Zonas de oferta y demanda</div><div class="dim" style="font-size:13px; margin-top:10px;">No hay suficientes datos todavía para este símbolo.</div>`;
    return;
  }
  const pa = data.priceAction;
  const price = data.lastClose;
  let proximityNote = '';
  if (pa.nearestSupport) {
    const distPct = ((price - pa.nearestSupport.price) / price) * 100;
    if (distPct <= 2) proximityNote += `<div class="tag-good" style="font-size:12px; margin-top:8px;">Estás muy cerca de una zona de demanda fuerte — vigilada por muchos traders.</div>`;
  }
  if (pa.nearestResistance) {
    const distPct = ((pa.nearestResistance.price - price) / price) * 100;
    if (distPct <= 2) proximityNote += `<div class="tag-bad" style="font-size:12px; margin-top:4px;">Estás muy cerca de una zona de oferta — el precio podría rebotar hacia abajo aquí.</div>`;
  }
  let rrRow = '';
  if (pa.nearestSupport && pa.nearestResistance) {
    const risk = price - pa.nearestSupport.price;
    const reward = pa.nearestResistance.price - price;
    if (risk > 0 && reward > 0) {
      const ratio = reward / risk;
      const rrClass = ratio >= 2 ? 'tag-good' : (ratio >= 1 ? 'tag-neutral' : 'tag-bad');
      rrRow = `<div class="indicator-row"><div><div class="indicator-label">Riesgo / Recompensa</div><div class="indicator-caption">Distancia a la zona de oferta (posible objetivo) vs. distancia a la zona de demanda (posible límite de pérdida).</div></div><div style="text-align:right;"><div class="mono ${rrClass}">1 : ${ratio.toFixed(1)}</div></div></div>`;
    }
  }
  const supportContext = pa.nearestSupport ? computeZoneContext(pa.nearestSupport, 'support', price, data) : null;
  const resistanceContext = pa.nearestResistance ? computeZoneContext(pa.nearestResistance, 'resistance', price, data) : null;

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:4px;">Zonas de oferta y demanda</div>
    <div class="dim" style="font-size:11px; margin-bottom:10px;">Analizado sobre ~${HISTORY_DAYS} días de historial (~${(HISTORY_DAYS / 252).toFixed(1)} años)</div>
    <div class="indicator-row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div><div class="indicator-label">Zona de oferta (resistencia) más cercana</div><div class="indicator-caption">${pa.nearestResistance ? pa.nearestResistance.touches + ' toques históricos como pivote' : 'No se encontró una clara arriba del precio actual'}</div></div>
        <div style="text-align:right;"><div class="mono tag-bad">${pa.nearestResistance ? '$' + fmtPrice(pa.nearestResistance.min) + '–' + fmtPrice(pa.nearestResistance.max) : '—'}</div></div>
      </div>
      ${pa.nearestResistance ? bounceBarHTML(pa.nearestResistance.bounceStats) : ''}
      ${resistanceContext ? contextLinesHTML(resistanceContext) : ''}
    </div>
    <div class="indicator-row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div><div class="indicator-label">Zona de demanda (soporte) más cercana</div><div class="indicator-caption">${pa.nearestSupport ? pa.nearestSupport.touches + ' toques históricos como pivote' : 'No se encontró una clara abajo del precio actual'}</div></div>
        <div style="text-align:right;"><div class="mono tag-good">${pa.nearestSupport ? '$' + fmtPrice(pa.nearestSupport.min) + '–' + fmtPrice(pa.nearestSupport.max) : '—'}</div></div>
      </div>
      ${pa.nearestSupport ? bounceBarHTML(pa.nearestSupport.bounceStats) : ''}
      ${supportContext ? contextLinesHTML(supportContext) : ''}
    </div>
    ${rrRow}
    ${proximityNote}
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">La frecuencia histórica condicional es una estadística calculada matemáticamente sobre el historial real de esta acción (no una opinión de la IA, y no una predicción). Es historia, no garantía del futuro.</div>
  `;
}
