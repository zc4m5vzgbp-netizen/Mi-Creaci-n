import { state } from '../state.js';
import { fmtPrice } from '../utils/format.js';

function ladderRow(label, price, cls) {
  return `<div class="ladder-row"><span class="dim mono" style="font-size:10.5px;">${label}</span><span class="mono ${cls}" style="font-size:12px;">$${fmtPrice(price)}</span></div>`;
}

export function renderLevelsLadder() {
  const card = document.getElementById('levelsLadderCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="toggle-label" style="margin-bottom:8px;">Niveles Clave</div><div class="dim" style="font-size:11px;">Analiza primero.</div>`;
    return;
  }
  if (data.error || !data.pivotPoints) { card.innerHTML = ''; return; }
  const pp = data.pivotPoints;
  const price = data.lastClose;

  card.innerHTML = `
    <div class="toggle-label" style="margin-bottom:6px;">Niveles Clave</div>
    ${ladderRow('R3', pp.r3, 'tag-bad')}
    ${ladderRow('R2', pp.r2, 'tag-bad')}
    ${ladderRow('R1', pp.r1, 'tag-bad')}
    <div class="ladder-row ladder-current"><span class="mono" style="font-size:10.5px; font-weight:700;">AHORA</span><span class="mono" style="font-size:13px; font-weight:700;">$${fmtPrice(price)}</span></div>
    ${ladderRow('S1', pp.s1, 'tag-good')}
    ${ladderRow('S2', pp.s2, 'tag-good')}
    ${ladderRow('S3', pp.s3, 'tag-good')}
    <div class="dim" style="font-size:9px; margin-top:8px; line-height:1.3; font-style:italic;">Puntos Pivote clásicos, sobre el cierre de ayer.</div>
  `;
}
