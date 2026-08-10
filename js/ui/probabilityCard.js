import { state } from '../state.js';
import { HISTORY_DAYS } from '../constants.js';
import { tipIcon, tipBody } from './tooltip.js';

function wilsonCaption(wilson) {
  if (!wilson) return '';
  return `IC 95%: ${Math.round(wilson.lower * 100)}%–${Math.round(wilson.upper * 100)}%`;
}

export function renderProbabilityEngine() {
  const card = document.getElementById('probabilityCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Frecuencia Histórica Condicional</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error) { card.innerHTML = ''; return; }
  const prob = data.directionalProbability;
  if (!prob) {
    card.innerHTML = `<div class="card-title">Frecuencia Histórica Condicional</div><div class="dim" style="font-size:13px; margin-top:10px;">No se encontraron suficientes días históricos con una configuración parecida a la de hoy para calcular esto de forma confiable.</div>`;
    return;
  }

  const up = Math.round(prob.upPct);
  const flat = Math.round(prob.flatPct);
  const down = Math.round(prob.downPct);
  const smallSample = prob.sample < 15 ? ' — muestra pequeña, tómalo con cautela' : '';

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:4px;">Frecuencia Histórica Condicional</div>
    <div class="dim" style="font-size:11px; margin-bottom:12px; line-height:1.4;">Configuración de hoy: RSI ${prob.state.rsiZone}, tendencia ${prob.state.trend}, momentum ${prob.state.momentum}. Comparado con ${prob.sample} días históricos (ventanas no solapadas) con esa misma combinación${smallSample}.</div>

    <div style="display:flex; height:32px; border-radius:8px; overflow:hidden; margin-bottom:10px;">
      <div style="width:${up}%; background:var(--gain); display:flex; align-items:center; justify-content:center;">${up >= 12 ? `<span class="mono" style="font-size:11px; font-weight:700; color:#0B0E11;">${up}%</span>` : ''}</div>
      <div style="width:${flat}%; background:var(--paper-dim); display:flex; align-items:center; justify-content:center;">${flat >= 12 ? `<span class="mono" style="font-size:11px; font-weight:700; color:#0B0E11;">${flat}%</span>` : ''}</div>
      <div style="width:${down}%; background:var(--loss); display:flex; align-items:center; justify-content:center;">${down >= 12 ? `<span class="mono" style="font-size:11px; font-weight:700; color:#0B0E11;">${down}%</span>` : ''}</div>
    </div>

    <div class="indicator-row"><div><div class="indicator-label">Frecuencia histórica: subió</div><div class="indicator-caption">${wilsonCaption(prob.wilsonUp)} ${tipIcon('tip-wilson')}</div></div><div class="mono tag-good">${up}%</div></div>
    <div class="indicator-row"><div><div class="indicator-label">Frecuencia histórica: consolidó</div><div class="indicator-caption">${wilsonCaption(prob.wilsonFlat)}</div></div><div class="mono tag-neutral">${flat}%</div></div>
    <div class="indicator-row"><div><div class="indicator-label">Frecuencia histórica: bajó</div><div class="indicator-caption">${wilsonCaption(prob.wilsonDown)}</div></div><div class="mono tag-bad">${down}%</div></div>
    ${tipBody('tip-wilson', '<strong>Qué significa:</strong> rango de incertidumbre alrededor de la frecuencia histórica.<br><br><strong>Cómo interpretarlo:</strong> entre más angosto, más precisa es la estimación; entre más ancho, menos datos hay para confiar en el número.')}

    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Esto es frecuencia histórica condicional, no una probabilidad de predicción: en configuraciones pasadas parecidas a la de hoy, así se distribuyó el resultado ${prob.thresholdPct}% en los próximos ${prob.lookAheadDays} días de cotización, sobre tu historial real de ~${HISTORY_DAYS} días. El intervalo (IC 95%, método de Wilson) muestra la incertidumbre real según el tamaño de la muestra — entre más angosto, más confiable.</div>
  `;
}
