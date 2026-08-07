import { state } from '../state.js';

export function renderProbabilityEngine() {
  const card = document.getElementById('probabilityCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Motor de Probabilidades</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error) { card.innerHTML = ''; return; }
  const prob = data.directionalProbability;
  if (!prob) {
    card.innerHTML = `<div class="card-title">Motor de Probabilidades</div><div class="dim" style="font-size:13px; margin-top:10px;">No se encontraron suficientes días históricos con una configuración parecida a la de hoy para calcular esto de forma confiable.</div>`;
    return;
  }

  const up = Math.round(prob.upPct);
  const flat = Math.round(prob.flatPct);
  const down = Math.round(prob.downPct);
  const smallSample = prob.sample < 15 ? ' — muestra pequeña, tómalo con cautela' : '';

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:4px;">Motor de Probabilidades</div>
    <div class="dim" style="font-size:11px; margin-bottom:12px; line-height:1.4;">Configuración de hoy: RSI ${prob.state.rsiZone}, tendencia ${prob.state.trend}, momentum ${prob.state.momentum}. Comparado con ${prob.sample} días históricos con esa misma combinación${smallSample}.</div>

    <div style="display:flex; height:32px; border-radius:8px; overflow:hidden; margin-bottom:10px;">
      <div style="width:${up}%; background:var(--gain); display:flex; align-items:center; justify-content:center;">${up >= 12 ? `<span class="mono" style="font-size:11px; font-weight:700; color:#0B0E11;">${up}%</span>` : ''}</div>
      <div style="width:${flat}%; background:var(--paper-dim); display:flex; align-items:center; justify-content:center;">${flat >= 12 ? `<span class="mono" style="font-size:11px; font-weight:700; color:#0B0E11;">${flat}%</span>` : ''}</div>
      <div style="width:${down}%; background:var(--loss); display:flex; align-items:center; justify-content:center;">${down >= 12 ? `<span class="mono" style="font-size:11px; font-weight:700; color:#0B0E11;">${down}%</span>` : ''}</div>
    </div>

    <div class="indicator-row"><div class="indicator-label">Probabilidad de subir</div><div class="mono tag-good">${up}%</div></div>
    <div class="indicator-row"><div class="indicator-label">Probabilidad de consolidar</div><div class="mono tag-neutral">${flat}%</div></div>
    <div class="indicator-row"><div class="indicator-label">Probabilidad de caer</div><div class="mono tag-bad">${down}%</div></div>

    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">"Subir" y "caer" significan un movimiento de más de ${prob.thresholdPct}% en los próximos ${prob.lookAheadDays} días de cotización, medido sobre tu historial real de ~400 días. Es frecuencia histórica, no una garantía de lo que va a pasar.</div>
  `;
}
